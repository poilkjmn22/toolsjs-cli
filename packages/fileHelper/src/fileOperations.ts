import * as fs from 'fs/promises';
import { Stats } from 'fs';
import * as path from 'path';
// import * as xlsx from 'xlsx';
// import { PDFDocument } from 'pdf-lib';
import {  ensureDir } from './utils/utils';
import { traverse } from '@toolsjs-cli/utils';
import { DeleteRuleBuilder } from './filters/DeleteRuleBuilder';
import { MoveRuleBuilder } from './filters/MoveRuleBuilder';

export async function transformDocument(filepath: string, fileExtension: string): Promise<void> {
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
  } catch (error) {
    console.error(`Error transforming document ${filepath}:`, error);
    throw error;
  }
}

async function transformPdfContent(filepath: string): Promise<void> {
  // const pdfBytes = await fs.readFile(filepath);
  // const pdfDoc = await PDFDocument.load(pdfBytes);
  // const pages = pdfDoc.getPages();
  
  // // PDF 处理逻辑
  // const modifiedPdfBytes = await pdfDoc.save();
  // await fs.writeFile(filepath, modifiedPdfBytes);
}

async function transformExcelContent(filepath: string): Promise<void> {
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

interface DeleteRule {
  dryRun?: any;
  extensions?: string[];           // 文件扩展名列表
  patterns?: (string | RegExp)[]; // 路径匹配模式
  excludes?: (string | RegExp)[]; // 排除的路径模式
  minSize?: number;               // 最小文件大小 (bytes)
  maxSize?: number;               // 最大文件大小 (bytes)
  olderThan?: Date;              // 早于指定日期
  newerThan?: Date;              // 晚于指定日期
  customFilter?: (filepath: string, stats: Stats) => boolean; // 自定义过滤器
}

interface DeleteResult {
  deletedFiles: string[];        // 已删除的文件
  errors: Array<{ file: string; error: Error }>; // 删除失败的文件
  skippedFiles: string[];       // 跳过的文件
}

/**
 * 批量删除文件
 * @param dirPath 目录路径
 * @param rules 删除规则
 */
export async function batchDelete(dirPath: string, rules: DeleteRule): Promise<DeleteResult> {
  const result: DeleteResult = {
    deletedFiles: [],
    errors: [],
    skippedFiles: []
  };

  const filterChain = new DeleteRuleBuilder()
    .withExtensions(rules.extensions)
    .withPatterns(rules.patterns)
    .withExcludes(rules.excludes)
    .withSizeLimit(rules.minSize, rules.maxSize)
    .withDateRange(rules.olderThan, rules.newerThan)
    .withCustomFilter(rules.customFilter)
    .build();

  const visitFile = async (filepath: string, stats: Stats): Promise<void> => {
    try {
      if (filterChain(filepath, stats)) {
        if (!rules.dryRun) {
          await fs.unlink(filepath);
          result.deletedFiles.push(filepath);
        } else {
          // 试运行模式下将匹配的文件添加到跳过列表
          result.skippedFiles.push(filepath);
        }
      } else {
        // 不匹配规则的文件添加到跳过列表
        result.skippedFiles.push(filepath);
      }
    } catch (error) {
      result.errors.push({ file: filepath, error: error as Error });
    }
  };

  await traverse(dirPath, visitFile);
  return result;
}

interface MoveResult {
  movedFiles: { from: string; to: string }[];
  movedDirs: { from: string; to: string }[];
  skippedFiles: string[];
  errors: { file: string; error: Error }[];
}

export interface MoveRule {
  extensions?: string[];
  patterns?: (string | RegExp)[];
  excludes?: (string | RegExp)[];
  minSize?: number;
  maxSize?: number;
  olderThan?: Date;
  newerThan?: Date;
  renameRule: (originalName: string) => string;
  dryRun?: boolean;
  overwrite?: boolean;
  onMove?: (from: string, to: string) => void;
  dirRenameRule?: (name: string) => string;
}

export async function batchMove(dirPath: string, rules: MoveRule = {
  renameRule: function (originalName: string): string {
    throw new Error('Function not implemented.');
  }
}): Promise<MoveResult> {
  const result: MoveResult = {
    movedFiles: [],
    movedDirs: [],
    errors: [],
    skippedFiles: []
  };

  const filterChain = new MoveRuleBuilder()
    .withExtensions(rules.extensions)
    .withPatterns(rules.patterns)
    .withExcludes(rules.excludes)
    .withSizeLimit(rules.minSize, rules.maxSize)
    .withDateRange(rules.olderThan, rules.newerThan)
    .build();

  const visitFile = async (filepath: string, stats: Stats): Promise<void> => {
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
        rules.onMove?.(filepath, newPath);
      } else {
        result.skippedFiles.push(filepath);
      }
    } catch (error) {
      result.errors.push({ file: filepath, error: error as Error });
    }
  };

  const visitDir = async (filepath: string, stats: Stats): Promise<void> => {
    try {
      const dir = path.dirname(filepath);
      const basename = path.basename(filepath);
      const newBasename = rules.renameRule(basename);
      const newPath = path.join(dir, newBasename);

      if (newPath === filepath) return;

      if (!rules.dryRun) {
        await fs.mkdir(newPath, { recursive: true });
        await fs.rename(filepath, newPath);
        result.movedDirs.push({ from: filepath, to: newPath });
      }
    } catch (error) {
      result.errors.push({ file: filepath, error: error as Error });
    }
  };

  await traverse(dirPath, visitFile, rules.dirRenameRule ? visitDir : async () => {});
  return result;
}

// 导出所有函数
export {
  transformPdfContent,
  transformExcelContent
};
