import { Stats } from 'fs';
import { FileInfo, BuildAnalyzerConfig, BuildReport, DiffAnalyzer } from '../types';
export declare class BuildAnalyzer {
    private config;
    private fileInfoList;
    private lastFileInfoList;
    private lastReport;
    private diffAnalyzer;
    constructor(config: BuildAnalyzerConfig, diffAnalyzer: DiffAnalyzer);
    analyzeFile(filepath: string, stat: Stats): Promise<FileInfo>;
    generateReport(): Promise<BuildReport>;
    loadLastBuildInfo(): Promise<void>;
    saveReport(report: BuildReport): Promise<void>;
}
