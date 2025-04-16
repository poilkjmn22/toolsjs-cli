import { Stats } from 'fs';
export interface MoveRule {
    overwrite?: any;
    extensions?: string[];
    patterns?: (string | RegExp)[];
    excludes?: (string | RegExp)[];
    minSize?: number;
    maxSize?: number;
    olderThan?: Date;
    newerThan?: Date;
    renameRule: (originalName: string) => string;
    dryRun?: boolean;
    customFilter?: (filepath: string, stats: Stats) => boolean;
    onMove?: (from: string, to: string) => void;
}
export declare class MoveRuleBuilder {
    private filters;
    withExtensions(extensions?: string[]): this;
    withPatterns(patterns?: (string | RegExp)[]): this;
    withExcludes(excludes?: (string | RegExp)[]): this;
    withSizeLimit(minSize?: number, maxSize?: number): this;
    withDateRange(olderThan?: Date, newerThan?: Date): this;
    withCustomFilter(filter?: (filepath: string, stats: Stats) => boolean): this;
    build(): (filepath: string, stats: Stats) => boolean;
}
