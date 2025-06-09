import { Stats } from "fs";
export declare class DeleteRuleBuilder {
    private filters;
    withExtensions(extensions?: string[]): this;
    withPatterns(patterns?: (string | RegExp)[]): this;
    withExcludes(excludes?: (string | RegExp)[]): this;
    withSizeLimit(minSize?: number, maxSize?: number): this;
    withDateRange(olderThan?: Date, newerThan?: Date): this;
    withCustomFilter(filter?: (filepath: string, stats: Stats) => boolean): this;
    build(): (filepath: string, stats: Stats) => boolean;
}
