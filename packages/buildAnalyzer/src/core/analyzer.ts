import { Stats } from 'fs';
import path from 'path';
import { FileInfo, BuildAnalyzerConfig, BuildReport, DiffAnalyzer } from '../types';
import { calculateFileHash, safeReadFile, safeWriteFile, sumBy , FileOperationError } from '@toolsjs-cli/utils';
import { BuildAnalyzerError} from '../errors';

export class BuildAnalyzer {
    private fileInfoList: FileInfo[] = [];
    private lastFileInfoList: FileInfo[] = [];
    private lastReport: BuildReport | undefined = undefined;
    private diffAnalyzer: DiffAnalyzer;

    constructor(
        private config: BuildAnalyzerConfig,
        diffAnalyzer: DiffAnalyzer
    ) {
        this.diffAnalyzer = diffAnalyzer;
    }

    async analyzeFile(filepath: string, stat: Stats): Promise<FileInfo> {
        const content = await safeReadFile(filepath);
        const hash = calculateFileHash(content);
        const relativeFilepath = path.relative(this.config.root!, filepath);

        const fileInfo: FileInfo = {
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

    async generateReport(): Promise<BuildReport> {
        const newSize = sumBy(this.fileInfoList, 'size');
        const { add, update, remove } = this.diffAnalyzer.analyze(
            this.fileInfoList,
            this.lastFileInfoList
        );
        const hash = calculateFileHash(Buffer.from(JSON.stringify(this.fileInfoList)))
        const sameBuild = [add, update, remove].every(_ => _.length <= 0); // 构建跟上次相比完全无变化

        const report: BuildReport = {
            statistic: {
                deployCount: (this.lastReport?.statistic?.deployCount || 0) + (sameBuild ? 0 : 1),
                totalSize: newSize,
                diffSize: newSize - (this.lastReport?.statistic?.totalSize || 0),
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
        report.shouldDiffDeploy = (report.statistic?.diffSize !== void 0 ? report.statistic.diffSize : newSize) <= newSize * 0.5; 

        return report;
    }

    async loadLastBuildInfo(): Promise<void> {
        try {
            const [contentFileList, contentReport] = await Promise.all([safeReadFile(
                path.join(this.config.dirBuildInfo!, 'buildInfo.json')
            ), safeReadFile(
                path.join(this.config.dirBuildInfo!, 'report.json')
            )]);
            this.lastFileInfoList = JSON.parse(contentFileList.toString());
            this.lastReport = JSON.parse(contentReport.toString());
        } catch (error: any) {
            // 如果是首次构建，没有历史记录是正常的
            if (error instanceof FileOperationError) {
                console.log('首次构建，未找到历史构建信息。');
            } else {
                throw new BuildAnalyzerError(`Failed to load last build info: ${error.message}`);
            }
        }
    }

    async saveReport(report: BuildReport): Promise<void> {
        const minReport = { ...report };
        delete minReport.fileInfoList;
        delete minReport.remove;
        delete minReport.add;
        delete minReport.update;
        // minReport.update = report.update?.slice(0, 10)

        await safeWriteFile(
            path.join(this.config.dirBuildInfo!, 'report.json'),
            JSON.stringify(minReport)
        );

        await safeWriteFile(
            path.join(this.config.dirBuildInfo!, 'buildInfo.json'),
            JSON.stringify(report.fileInfoList)
        );
    }
}