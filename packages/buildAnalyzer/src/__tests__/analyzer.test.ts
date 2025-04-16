import { BuildAnalyzer } from '../core/analyzer';
import { DiffAnalyzer } from '../services/diffAnalyzer';
import { BuildAnalyzerConfig, FileInfo } from '../types';
import { promises as fs } from 'fs';
import path from 'path';
import { Stats } from 'fs';

jest.mock('fs', () => ({
    promises: {
        readFile: jest.fn(),
        writeFile: jest.fn(),
        stat: jest.fn(),
    }
}));

describe('BuildAnalyzer', () => {
    let analyzer: BuildAnalyzer;
    let mockConfig: BuildAnalyzerConfig;
    let mockDiffAnalyzer: DiffAnalyzer;

    beforeEach(() => {
        mockConfig = {
            buildDir: 'dist',
            reportDir: 'report',
            root: '/test/dist',
            dirBuildInfo: '/test/report',
            exclude: () => false,
            maxCount: '20%',
            minCount: 10,
            overSizeThreshold: "300kb",
            reportMode: 'console',
            filesizeSpec: 'si',
            noDiff: false
        };

        mockDiffAnalyzer = new DiffAnalyzer();
        analyzer = new BuildAnalyzer(mockConfig, mockDiffAnalyzer);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('analyzeFile', () => {
        it('应该正确分析文件并返回文件信息', async () => {
            const mockStat = {
                size: 1000,
                mtimeMs: Date.now()
            } as Stats;

            const mockContent = Buffer.from('test content');
            (fs.readFile as jest.Mock).mockResolvedValue(mockContent);

            const result = await analyzer.analyzeFile('/test/dist/test.js', mockStat);

            expect(result).toMatchObject({
                filepath: 'test.js',
                size: 1000,
                modifyCount: 1
            });
            expect(result.hash).toBeDefined();
        });
    });

    describe('generateReport', () => {
        it('应该生成正确的报告', async () => {
            const mockFiles: FileInfo[] = [
                {
                    filepath: 'test1.js',
                    hash: 'hash1',
                    size: 1000,
                    mtimeMs: Date.now(),
                    modifyCount: 1
                },
                {
                    filepath: 'test2.js',
                    hash: 'hash2',
                    size: 2000,
                    mtimeMs: Date.now(),
                    modifyCount: 1
                }
            ];

            // 模拟文件分析
            for (const file of mockFiles) {
                const mockStat = {
                    size: file.size,
                    mtimeMs: file.mtimeMs
                } as Stats;
                (fs.readFile as jest.Mock).mockResolvedValueOnce(Buffer.from(file.filepath));
                await analyzer.analyzeFile(path.join(mockConfig.root!, file.filepath), mockStat);
            }

            const report = await analyzer.generateReport();

            expect(report).toMatchObject({
                statistic: {
                    deployCount: 1,
                    totalSize: 3000
                },
                shouldDiffDeploy: true
            });
            expect(report.fileInfoList).toHaveLength(2);
        });
    });

    describe('loadLastBuildInfo', () => {
        it('应该正确加载上次构建信息', async () => {
            const mockLastBuildInfo = [
                {
                    filepath: 'test.js',
                    hash: 'hash1',
                    size: 1000,
                    mtimeMs: Date.now(),
                    modifyCount: 1
                }
            ];

            (fs.readFile as jest.Mock).mockResolvedValue(
                Buffer.from(JSON.stringify(mockLastBuildInfo))
            );

            await analyzer.loadLastBuildInfo();

            const report = await analyzer.generateReport();
            expect(report.statistic.deployCount).toBe(1);
        });

        it('首次构建时应该正常处理', async () => {
            const error = new Error('ENOENT');
            (error as NodeJS.ErrnoException).code = 'ENOENT';
            (fs.readFile as jest.Mock).mockRejectedValue(error);

            await expect(analyzer.loadLastBuildInfo()).resolves.not.toThrow();
        });
    });

    describe('saveReport', () => {
        it('应该正确保存报告', async () => {
            const mockReport = {
                statistic: {
                    deployCount: 1,
                    totalSize: 1000,
                    diffSize: 0
                },
                hash: 'testhash',
                shouldDiffDeploy: true,
                fileInfoList: [],
                add: [0, 0] as [number, number],
                update: [0, 0] as [number, number],
                remove: []
            };

            await analyzer.saveReport(mockReport);

            expect(fs.writeFile).toHaveBeenCalledTimes(2);
            expect(fs.writeFile).toHaveBeenCalledWith(
                path.join(mockConfig.dirBuildInfo!, 'report.json'),
                expect.any(String)
            );
            expect(fs.writeFile).toHaveBeenCalledWith(
                path.join(mockConfig.dirBuildInfo!, 'buildInfo.json'),
                expect.any(String)
            );
        });
    });
});