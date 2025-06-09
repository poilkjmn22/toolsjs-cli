import { Stats } from 'fs';
export interface BuildAnalyzerConfig {
    buildDir: string;
    reportDir: string;
    exclude: string | string[] | ((filepath: string) => boolean);
    maxCount: string;
    minCount: number;
    overSizeThreshold: string;
    reportMode: 'console' | 'html';
    filesizeSpec: 'si' | 'iec';
    noDiff: boolean;
    root?: string;
    dirBuildInfo?: string;
}
export interface FileInfo {
    filepath: string;
    hash: string;
    size: number;
    modifyCount: number;
}
export interface BuildStatistic {
    deployCount: number;
    totalSize: number;
    diffSize?: number;
    fileCount: number;
}
export interface BuildReport {
    statistic?: BuildStatistic;
    hash?: string;
    shouldDiffDeploy?: boolean;
    add?: FileInfo[];
    update?: FileInfo[];
    remove?: FileInfo[];
    fileInfoList?: FileInfo[];
    sameBuild: boolean;
}
export interface Reporter {
    report(): Promise<void>;
}
export interface FileProcessor {
    processFile(filepath: string, stat: Stats): Promise<FileInfo>;
}
export interface DiffAnalyzer {
    analyze(current: FileInfo[], last: FileInfo[]): {
        add: FileInfo[];
        update: FileInfo[];
        remove: FileInfo[];
    };
}
export interface ZipBuilder {
    build(files: FileInfo[], shouldDiffDeploy: boolean): Promise<void>;
}
