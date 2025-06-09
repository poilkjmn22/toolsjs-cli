import { Reporter, BuildReport, BuildAnalyzerConfig } from '../types';
export declare class ConsoleReporter implements Reporter {
    private buildReport;
    private buildAnalyzerConfig;
    constructor(buildReport: BuildReport, buildAnalyzerConfig: BuildAnalyzerConfig);
    report(): Promise<void>;
}
