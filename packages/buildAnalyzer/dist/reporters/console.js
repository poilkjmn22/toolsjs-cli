"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConsoleReporter = void 0;
const utils_1 = require("@toolsjs-cli/utils");
const chalk_1 = __importDefault(require("chalk"));
class ConsoleReporter {
    constructor(buildReport, buildAnalyzerConfig) {
        this.buildReport = buildReport;
        this.buildAnalyzerConfig = buildAnalyzerConfig;
    }
    async report() {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j;
        const buildReport = this.buildReport;
        console.log(chalk_1.default.bold('\n📊 构建分析报告'));
        console.log(chalk_1.default.gray('----------------------------------------'));
        const deployCount = ((_a = this.buildReport.statistic) === null || _a === void 0 ? void 0 : _a.deployCount) || 1;
        const totalSize = ((_b = this.buildReport.statistic) === null || _b === void 0 ? void 0 : _b.totalSize) || 1000000;
        // 基本统计信息
        console.log(chalk_1.default.cyan('\n📈 基本统计'));
        console.log(`构建分析次数: ${((_c = buildReport.statistic) === null || _c === void 0 ? void 0 : _c.deployCount) || 0}`);
        console.log(`文件总数量: ${((_d = buildReport.fileInfoList) === null || _d === void 0 ? void 0 : _d.length) || 0}`);
        console.log(`总大小: ${(0, utils_1.formatFileSize)(((_e = buildReport.statistic) === null || _e === void 0 ? void 0 : _e.totalSize) || 0, this.buildAnalyzerConfig.filesizeSpec)}`);
        if (((_f = buildReport.statistic) === null || _f === void 0 ? void 0 : _f.diffSize) !== void 0) {
            const diffSize = buildReport.statistic.diffSize;
            const color = diffSize > 0 ? chalk_1.default.red : (diffSize < 0 ? chalk_1.default.green : chalk_1.default.gray);
            const diffStr = diffSize > 0 ? '+' : (diffSize < 0 ? '-' : '');
            console.log(`大小变化: ${color(diffStr + (0, utils_1.formatFileSize)(diffSize, this.buildAnalyzerConfig.filesizeSpec))}`);
        }
        // 变更统计
        console.log(chalk_1.default.cyan('\n🔄 文件变更'));
        console.log(`新增: ${((_g = buildReport.add) === null || _g === void 0 ? void 0 : _g.length) || 0} 个文件`);
        console.log(`更新: ${((_h = buildReport.update) === null || _h === void 0 ? void 0 : _h.length) || 0} 个文件`);
        console.log(`删除: ${((_j = buildReport.remove) === null || _j === void 0 ? void 0 : _j.length) || 0} 个文件`);
        // 大文件警告
        const largeFiles = (buildReport.fileInfoList || [])
            .filter(f => f.size > (0, utils_1.convertSizeToBytes)(this.buildAnalyzerConfig.overSizeThreshold))
            .sort((a, b) => b.size - a.size);
        console.log(chalk_1.default.cyan(`\n⚠ 大文件警告，超过了[${this.buildAnalyzerConfig.overSizeThreshold}]`));
        if (largeFiles.length > 0) {
            console.table(largeFiles.map((file) => ({ 文件路径: file.filepath, 文件大小: (0, utils_1.formatFileSize)(file.size || 0, this.buildAnalyzerConfig.filesizeSpec) })));
            // 提供优化建议
            console.log(chalk_1.default.yellow('\n建议：'));
            console.log('对于较大的文件，建议使用代码拆分/预加载/懒加载/流式传输等方式优化网站性能。');
        }
        else {
            console.log(chalk_1.default.greenBright('🎉 很好！未发现大文件，您的项目保持轻量！'));
        }
        // 缓存优先级计算, 越大越适合做缓存
        const calcCachePriority = (weightSize, weightModify, config = { factSize: 4, factModify: 6 }) => {
            const { factSize, factModify } = config;
            return factSize * weightSize + factModify * weightModify;
        };
        const fileInfoList = this.buildReport.fileInfoList || [];
        fileInfoList.forEach((f) => {
            f.weightSize = f.size / totalSize;
            f.weightModify = deployCount / f.modifyCount;
            f.weightCache = calcCachePriority(f.weightSize, f.weightModify);
        });
        fileInfoList.sort((a, b) => b.weightCache - a.weightCache);
        let maxCount = Math.ceil((0, utils_1.convertNumber)(this.buildAnalyzerConfig.maxCount, fileInfoList.length));
        let minCount = Math.ceil((0, utils_1.convertNumber)(this.buildAnalyzerConfig.minCount, fileInfoList.length));
        maxCount = Math.max(maxCount, minCount);
        const lowFrequencyFiles = fileInfoList
            .slice(0, maxCount);
        if (lowFrequencyFiles.length > 0) {
            console.log(chalk_1.default.cyan('\n🔍 建议使用缓存的文件'));
            console.table(lowFrequencyFiles.map((file) => ({ 文件路径: file.filepath, 文件大小: (0, utils_1.formatFileSize)(file.size || 0, this.buildAnalyzerConfig.filesizeSpec), 修改次数: file.modifyCount })));
            // 提供优化建议
            console.log(chalk_1.default.yellow('\n建议：'));
            console.log('对于大小较大、修改频率较低的文件，建议使用 Nginx 缓存、CDN 等手段来优化网站性能。');
        }
        // 部署建议
        console.log(chalk_1.default.cyan('\n💡 部署建议'));
        if (buildReport.sameBuild) {
            console.log(chalk_1.default.gray('本次无任何更新，无需部署'));
        }
        else {
            if (buildReport.shouldDiffDeploy) {
                console.log(chalk_1.default.green('✓ 建议使用增量部署'));
            }
            else {
                console.log(chalk_1.default.yellow('⚠ 建议使用全量部署'));
            }
        }
        console.log(chalk_1.default.gray('----------------------------------------'));
    }
}
exports.ConsoleReporter = ConsoleReporter;
