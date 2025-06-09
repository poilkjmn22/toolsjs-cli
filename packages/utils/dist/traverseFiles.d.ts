import { Stats } from 'fs';
export type VisitFunction = (filepath: string, stats: Stats) => Promise<void>;
export interface TraverseOptions {
    include?: string | RegExp;
    exclude?: string | RegExp;
    testPath?: boolean;
}
export declare function traverse(filepath: string, visitFile?: VisitFunction, visitDir?: VisitFunction, options?: TraverseOptions): Promise<void>;
export default traverse;
//# sourceMappingURL=traverseFiles.d.ts.map