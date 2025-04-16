import { Reporter, BuildReport, BuildAnalyzerConfig } from '../types';
import { formatFileSize, convertNumber, convertSizeToBytes } from '@toolsjs-cli/utils';
import chalk from 'chalk';

export class ConsoleReporter implements Reporter {
    constructor(
        private buildReport: BuildReport,
        private buildAnalyzerConfig: BuildAnalyzerConfig
    ) { }

    async report(): Promise<void> {
        const buildReport = this.buildReport;
        console.log(chalk.bold('\n📊 构建分析报告'));
        console.log(chalk.gray('----------------------------------------'));
        const deployCount = this.buildReport.statistic?.deployCount || 1;
        const totalSize = this.buildReport.statistic?.totalSize || 1000000;

        // 基本统计信息
        console.log(chalk.cyan('\n📈 基本统计'));
        console.log(`构建分析次数: ${buildReport.statistic?.deployCount || 0}`);
        console.log(`文件总数量: ${buildReport.fileInfoList?.length || 0}`);
        console.log(`总大小: ${formatFileSize(buildReport.statistic?.totalSize || 0, this.buildAnalyzerConfig.filesizeSpec)}`);

        if (buildReport.statistic?.diffSize !== void 0) {
            const diffSize = buildReport.statistic.diffSize;
            const color = diffSize > 0 ? chalk.red : (diffSize < 0 ? chalk.green : chalk.gray);
            const diffStr = diffSize > 0 ? '+' : (diffSize < 0 ? '-' : '');
            console.log(`大小变化: ${color(diffStr + formatFileSize(diffSize, this.buildAnalyzerConfig.filesizeSpec))}`);
        }

        // 变更统计
        console.log(chalk.cyan('\n🔄 文件变更'));
        console.log(`新增: ${buildReport.add?.length || 0} 个文件`);
        console.log(`更新: ${buildReport.update?.length || 0} 个文件`);
        console.log(`删除: ${buildReport.remove?.length || 0} 个文件`);

        // 大文件警告
        const largeFiles = (buildReport.fileInfoList || [])
            .filter(f => f.size > convertSizeToBytes(this.buildAnalyzerConfig.overSizeThreshold))
            .sort((a, b) => b.size - a.size);

        console.log(chalk.cyan(`\n⚠ 大文件警告，超过了[${this.buildAnalyzerConfig.overSizeThreshold}]`));
        if (largeFiles.length > 0) {
            console.table(largeFiles.map((file: any) => ({ 文件路径: file.filepath, 文件大小: formatFileSize(file.size || 0, this.buildAnalyzerConfig.filesizeSpec) })));

            // 提供优化建议
            console.log(chalk.yellow('\n建议：'));
            console.log('对于较大的文件，建议使用代码拆分/预加载/懒加载/流式传输等方式优化网站性能。');
        } else {
            console.log(chalk.greenBright('🎉 很好！未发现大文件，您的项目保持轻量！'));
        }

        // 缓存优先级计算, 越大越适合做缓存
        const calcCachePriority = (
            weightSize: number,
            weightModify: number,
            config: any = { factSize: 4, factModify: 6 },
        ) => {
            const { factSize, factModify } = config;
            return factSize * weightSize + factModify * weightModify;
        }
        const fileInfoList: any = this.buildReport.fileInfoList || [];
        fileInfoList.forEach((f: any) => {
            f.weightSize = f.size / totalSize;
            f.weightModify = deployCount / f.modifyCount;
            f.weightCache = calcCachePriority(f.weightSize, f.weightModify);
        });
        fileInfoList.sort((a: any, b: any) => b.weightCache - a.weightCache);
        let maxCount = Math.ceil(convertNumber(this.buildAnalyzerConfig.maxCount, fileInfoList.length));
        let minCount = Math.ceil(convertNumber(this.buildAnalyzerConfig.minCount, fileInfoList.length));
        maxCount = Math.max(maxCount, minCount);
        const lowFrequencyFiles = fileInfoList
            .slice(0, maxCount);

        if (lowFrequencyFiles.length > 0) {
            console.log(chalk.cyan('\n🔍 建议使用缓存的文件'));
            console.table(lowFrequencyFiles.map((file: any) => ({ 文件路径: file.filepath, 文件大小: formatFileSize(file.size || 0, this.buildAnalyzerConfig.filesizeSpec), 修改次数: file.modifyCount })))

            // 提供优化建议
            console.log(chalk.yellow('\n建议：'));
            console.log('对于大小较大、修改频率较低的文件，建议使用 Nginx 缓存、CDN 等手段来优化网站性能。');
        }

        // 部署建议
        console.log(chalk.cyan('\n💡 部署建议'));
        if (buildReport.sameBuild) {
            console.log(chalk.gray('本次无任何更新，无需部署'));
        } else {
            if (buildReport.shouldDiffDeploy) {
                console.log(chalk.green('✓ 建议使用增量部署'));
            } else {
                console.log(chalk.yellow('⚠ 建议使用全量部署'));
            }
        }

        console.log(chalk.gray('----------------------------------------'));
    }
}