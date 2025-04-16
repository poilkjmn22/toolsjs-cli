export class BuildAnalyzerError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'BuildAnalyzerError';
    }
}

export class FileOperationError extends BuildAnalyzerError {
    constructor(operation: string, filepath: string, error: Error) {
        super(`${operation} failed for ${filepath}: ${error.message}`);
        this.name = 'FileOperationError';
    }
}

export class ConfigurationError extends BuildAnalyzerError {
    constructor(message: string) {
        super(`Configuration error: ${message}`);
        this.name = 'ConfigurationError';
    }
}

export class ReportGenerationError extends BuildAnalyzerError {
    constructor(message: string) {
        super(`Report generation failed: ${message}`);
        this.name = 'ReportGenerationError';
    }
}