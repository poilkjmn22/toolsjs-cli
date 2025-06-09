"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformDocument = transformDocument;
exports.batchDelete = batchDelete;
exports.batchMove = batchMove;
exports.transformPdfContent = transformPdfContent;
exports.transformExcelContent = transformExcelContent;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const utils_1 = require("@toolsjs-cli/utils");
const DeleteRuleBuilder_1 = require("./filters/DeleteRuleBuilder");
const MoveRuleBuilder_1 = require("./filters/MoveRuleBuilder");
async function transformDocument(filepath, fileExtension) {
    try {
        switch (fileExtension.toLowerCase()) {
            case '.pdf':
                await transformPdfContent(filepath);
                break;
            case '.xlsx':
            case '.xls':
                await transformExcelContent(filepath);
                break;
            default:
                throw new Error(`Unsupported file type: ${fileExtension}`);
        }
    }
    catch (error) {
        console.error(`Error transforming document ${filepath}:`, error);
        throw error;
    }
}
async function transformPdfContent(filepath) {
    // const pdfBytes = await fs.readFile(filepath);
    // const pdfDoc = await PDFDocument.load(pdfBytes);
    // const pages = pdfDoc.getPages();
    // // PDF 处理逻辑
    // const modifiedPdfBytes = await pdfDoc.save();
    // await fs.writeFile(filepath, modifiedPdfBytes);
}
async function transformExcelContent(filepath) {
    // const workbook = xlsx.readFile(filepath);
    // workbook.SheetNames.forEach(sheetName => {
    //   const worksheet = workbook.Sheets[sheetName];
    //   const rawData: any[][] = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
    //   // 确保数据是二维数组
    //   const data: any[][] = rawData.map(row => Array.isArray(row) ? row : [row]);
    //   // 处理每行数据
    //   const processedData = data.map(row => 
    //     row.map(cell => typeof cell === 'string' ? cell.trim() : cell)
    //   );
    //   const newWorksheet = xlsx.utils.aoa_to_sheet(processedData);
    //   workbook.Sheets[sheetName] = newWorksheet;
    // });
    // // 保存修改后的工作簿
    // xlsx.writeFile(workbook, filepath);
}
/**
 * 批量删除文件
 * @param dirPath 目录路径
 * @param rules 删除规则
 */
async function batchDelete(dirPath, rules) {
    const result = {
        deletedFiles: [],
        errors: [],
        skippedFiles: []
    };
    const filterChain = new DeleteRuleBuilder_1.DeleteRuleBuilder()
        .withExtensions(rules.extensions)
        .withPatterns(rules.patterns)
        .withExcludes(rules.excludes)
        .withSizeLimit(rules.minSize, rules.maxSize)
        .withDateRange(rules.olderThan, rules.newerThan)
        .withCustomFilter(rules.customFilter)
        .build();
    const visitFile = async (filepath, stats) => {
        try {
            if (filterChain(filepath, stats)) {
                if (!rules.dryRun) {
                    await fs.unlink(filepath);
                    result.deletedFiles.push(filepath);
                }
                else {
                    // 试运行模式下将匹配的文件添加到跳过列表
                    result.skippedFiles.push(filepath);
                }
            }
            else {
                // 不匹配规则的文件添加到跳过列表
                result.skippedFiles.push(filepath);
            }
        }
        catch (error) {
            result.errors.push({ file: filepath, error: error });
        }
    };
    await (0, utils_1.traverse)(dirPath, visitFile);
    return result;
}
async function batchMove(dirPath, rules = {
    renameRule: function (originalName) {
        throw new Error('Function not implemented.');
    }
}) {
    const result = {
        movedFiles: [],
        movedDirs: [],
        errors: [],
        skippedFiles: []
    };
    const filterChain = new MoveRuleBuilder_1.MoveRuleBuilder()
        .withExtensions(rules.extensions)
        .withPatterns(rules.patterns)
        .withExcludes(rules.excludes)
        .withSizeLimit(rules.minSize, rules.maxSize)
        .withDateRange(rules.olderThan, rules.newerThan)
        .build();
    const visitFile = async (filepath, stats) => {
        var _a;
        try {
            if (!filterChain(filepath, stats)) {
                result.skippedFiles.push(filepath);
                return;
            }
            const dir = path.dirname(filepath);
            const basename = path.basename(filepath);
            const newBasename = rules.renameRule(basename);
            const newPath = path.join(dir, newBasename);
            if (newPath === filepath) {
                result.skippedFiles.push(filepath);
                return;
            }
            if (!rules.dryRun) {
                // 确保先创建目录
                const targetDir = path.dirname(newPath);
                await fs.mkdir(targetDir, { recursive: true });
                const exists = await fs.access(newPath).then(() => true, () => false);
                if (exists && !rules.overwrite) {
                    result.errors.push({
                        file: filepath,
                        error: new Error(`目标文件已存在: ${newPath}`)
                    });
                    return;
                }
                await fs.rename(filepath, newPath);
                result.movedFiles.push({ from: filepath, to: newPath });
                (_a = rules.onMove) === null || _a === void 0 ? void 0 : _a.call(rules, filepath, newPath);
            }
            else {
                result.skippedFiles.push(filepath);
            }
        }
        catch (error) {
            result.errors.push({ file: filepath, error: error });
        }
    };
    const visitDir = async (filepath, stats) => {
        try {
            const dir = path.dirname(filepath);
            const basename = path.basename(filepath);
            const newBasename = rules.renameRule(basename);
            const newPath = path.join(dir, newBasename);
            if (newPath === filepath)
                return;
            if (!rules.dryRun) {
                await fs.mkdir(newPath, { recursive: true });
                await fs.rename(filepath, newPath);
                result.movedDirs.push({ from: filepath, to: newPath });
            }
        }
        catch (error) {
            result.errors.push({ file: filepath, error: error });
        }
    };
    await (0, utils_1.traverse)(dirPath, visitFile, rules.dirRenameRule ? visitDir : async () => { });
    return result;
}
//# sourceMappingURL=fileOperations.js.map