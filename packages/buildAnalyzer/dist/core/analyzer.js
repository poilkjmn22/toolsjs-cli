"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BuildAnalyzer = void 0;
const path_1 = __importDefault(require("path"));
const utils_1 = require("@toolsjs-cli/utils");
const errors_1 = require("../errors");
class BuildAnalyzer {
    constructor(config, diffAnalyzer) {
        this.config = config;
        this.fileInfoList = [];
        this.lastFileInfoList = [];
        this.lastReport = undefined;
        this.diffAnalyzer = diffAnalyzer;
    }
    async analyzeFile(filepath, stat) {
        const content = await (0, utils_1.safeReadFile)(filepath);
        const hash = (0, utils_1.calculateFileHash)(content);
        const relativeFilepath = path_1.default.relative(this.config.root, filepath);
        const fileInfo = {
            filepath: relativeFilepath,
            hash,
            size: stat.size,
            modifyCount: 1
        };
        // 检查文件是否在上一次构建中存在
        const lastFileInfo = this.lastFileInfoList.find(f => f.filepath === relativeFilepath);
        if (lastFileInfo) {
            fileInfo.modifyCount = lastFileInfo.modifyCount;
            if (fileInfo.hash !== lastFileInfo.hash) {
                fileInfo.modifyCount++;
            }
        }
        this.fileInfoList.push(fileInfo);
        return fileInfo;
    }
    async generateReport() {
        var _a, _b, _c, _d, _e;
        const newSize = (0, utils_1.sumBy)(this.fileInfoList, 'size');
        const { add, update, remove } = this.diffAnalyzer.analyze(this.fileInfoList, this.lastFileInfoList);
        const hash = (0, utils_1.calculateFileHash)(Buffer.from(JSON.stringify(this.fileInfoList)));
        const sameBuild = [add, update, remove].every(_ => _.length <= 0); // 构建跟上次相比完全无变化
        const report = {
            statistic: {
                deployCount: (((_b = (_a = this.lastReport) === null || _a === void 0 ? void 0 : _a.statistic) === null || _b === void 0 ? void 0 : _b.deployCount) || 0) + (sameBuild ? 0 : 1),
                totalSize: newSize,
                diffSize: newSize - (((_d = (_c = this.lastReport) === null || _c === void 0 ? void 0 : _c.statistic) === null || _d === void 0 ? void 0 : _d.totalSize) || 0),
                fileCount: this.fileInfoList.length
            },
            hash,
            shouldDiffDeploy: false,
            add,
            update,
            sameBuild,
            remove,
            fileInfoList: this.fileInfoList
        };
        // 计算是否应该差异部署
        // console.log(report, newSize)
        report.shouldDiffDeploy = (((_e = report.statistic) === null || _e === void 0 ? void 0 : _e.diffSize) !== void 0 ? report.statistic.diffSize : newSize) <= newSize * 0.5;
        return report;
    }
    async loadLastBuildInfo() {
        try {
            const [contentFileList, contentReport] = await Promise.all([(0, utils_1.safeReadFile)(path_1.default.join(this.config.dirBuildInfo, 'buildInfo.json')), (0, utils_1.safeReadFile)(path_1.default.join(this.config.dirBuildInfo, 'report.json'))]);
            this.lastFileInfoList = JSON.parse(contentFileList.toString());
            this.lastReport = JSON.parse(contentReport.toString());
        }
        catch (error) {
            // 如果是首次构建，没有历史记录是正常的
            if (error instanceof utils_1.FileOperationError) {
                console.log('首次构建，未找到历史构建信息。');
            }
            else {
                throw new errors_1.BuildAnalyzerError(`Failed to load last build info: ${error.message}`);
            }
        }
    }
    async saveReport(report) {
        const minReport = { ...report };
        delete minReport.fileInfoList;
        delete minReport.remove;
        delete minReport.add;
        delete minReport.update;
        // minReport.update = report.update?.slice(0, 10)
        await (0, utils_1.safeWriteFile)(path_1.default.join(this.config.dirBuildInfo, 'report.json'), JSON.stringify(minReport));
        await (0, utils_1.safeWriteFile)(path_1.default.join(this.config.dirBuildInfo, 'buildInfo.json'), JSON.stringify(report.fileInfoList));
    }
}
exports.BuildAnalyzer = BuildAnalyzer;
