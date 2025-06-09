import { BuildAnalyzerConfig, BuildReport } from '../types';
export declare class ZipBuilder {
    private config;
    constructor(config: BuildAnalyzerConfig);
    build(report: BuildReport): Promise<void>;
}
