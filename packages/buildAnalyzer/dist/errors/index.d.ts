export declare class BuildAnalyzerError extends Error {
    constructor(message: string);
}
export declare class FileOperationError extends BuildAnalyzerError {
    constructor(operation: string, filepath: string, error: Error);
}
export declare class ConfigurationError extends BuildAnalyzerError {
    constructor(message: string);
}
export declare class ReportGenerationError extends BuildAnalyzerError {
    constructor(message: string);
}
