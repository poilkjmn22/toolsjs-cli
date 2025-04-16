import { Stats } from 'fs';
export declare function transformDocument(filepath: string, fileExtension: string): Promise<void>;
declare function transformPdfContent(filepath: string): Promise<void>;
declare function transformExcelContent(filepath: string): Promise<void>;
interface DeleteRule {
    dryRun?: any;
    extensions?: string[];
    patterns?: (string | RegExp)[];
    excludes?: (string | RegExp)[];
    minSize?: number;
    maxSize?: number;
    olderThan?: Date;
    newerThan?: Date;
    customFilter?: (filepath: string, stats: Stats) => boolean;
}
interface DeleteResult {
    deletedFiles: string[];
    errors: Array<{
        file: string;
        error: Error;
    }>;
    skippedFiles: string[];
}
/**
 * 批量删除文件
 * @param dirPath 目录路径
 * @param rules 删除规则
 */
export declare function batchDelete(dirPath: string, rules: DeleteRule): Promise<DeleteResult>;
interface MoveResult {
    movedFiles: {
        from: string;
        to: string;
    }[];
    movedDirs: {
        from: string;
        to: string;
    }[];
    skippedFiles: string[];
    errors: {
        file: string;
        error: Error;
    }[];
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
export declare function batchMove(dirPath: string, rules?: MoveRule): Promise<MoveResult>;
export { transformPdfContent, transformExcelContent };
