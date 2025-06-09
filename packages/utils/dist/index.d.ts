import { traverse, type TraverseOptions } from './traverseFiles';
import { FileOperationError } from './errors';
export declare function unixy(filepath: string): string;
export declare function sumBy<T>(array: T[], key: keyof T): number;
export declare function convertNumber(value: string | number, total?: number): number;
export declare function safeReadFile(filepath: string): Promise<Buffer>;
export declare function safeWriteFile(filepath: string, data: string | Buffer): Promise<void>;
export declare function calculateFileHash(content: Buffer): string;
export declare function formatFileSize(bytes: number, spec?: 'si' | 'iec'): string;
export declare function convertSizeToBytes(size: string, spec?: 'si' | 'iec'): number;
export { traverse, type TraverseOptions, FileOperationError };
declare const _default: {
    convertNumber: typeof convertNumber;
    unixy: typeof unixy;
    sumBy: typeof sumBy;
    traverse: typeof traverse;
    safeReadFile: typeof safeReadFile;
    safeWriteFile: typeof safeWriteFile;
    calculateFileHash: typeof calculateFileHash;
    formatFileSize: typeof formatFileSize;
    convertSizeToBytes: typeof convertSizeToBytes;
};
export default _default;
//# sourceMappingURL=index.d.ts.map