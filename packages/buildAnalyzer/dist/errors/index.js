"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportGenerationError = exports.ConfigurationError = exports.FileOperationError = exports.BuildAnalyzerError = void 0;
class BuildAnalyzerError extends Error {
    constructor(message) {
        super(message);
        this.name = 'BuildAnalyzerError';
    }
}
exports.BuildAnalyzerError = BuildAnalyzerError;
class FileOperationError extends BuildAnalyzerError {
    constructor(operation, filepath, error) {
        super(`${operation} failed for ${filepath}: ${error.message}`);
        this.name = 'FileOperationError';
    }
}
exports.FileOperationError = FileOperationError;
class ConfigurationError extends BuildAnalyzerError {
    constructor(message) {
        super(`Configuration error: ${message}`);
        this.name = 'ConfigurationError';
    }
}
exports.ConfigurationError = ConfigurationError;
class ReportGenerationError extends BuildAnalyzerError {
    constructor(message) {
        super(`Report generation failed: ${message}`);
        this.name = 'ReportGenerationError';
    }
}
exports.ReportGenerationError = ReportGenerationError;
