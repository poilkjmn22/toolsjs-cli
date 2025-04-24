export interface SizeFilter {
    minSize?: number;
    maxSize?: number;
}
export declare const parseSizeFilter: (sizeStr?: string) => SizeFilter;
export declare const parseDate: (dateStr?: string) => Date | null;
interface RenameFunction {
    name: string;
    fn: (...args: any[]) => string;
    description: string;
}
export declare class RenameParser {
    private pattern;
    private index;
    private registry;
    constructor(pattern: string);
    private registerDefaultFunctions;
    registerFunction(func: RenameFunction): void;
    parse(originalName: string): string;
}
export {};
