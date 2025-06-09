import { FileInfo } from '../types';
export declare class DiffAnalyzer {
    analyze(current: FileInfo[], last: FileInfo[]): {
        add: FileInfo[];
        update: FileInfo[];
        remove: FileInfo[];
    };
}
