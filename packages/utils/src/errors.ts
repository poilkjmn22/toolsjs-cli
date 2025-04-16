export class FileOperationError extends Error {
    constructor(operation: string, filepath: string, error: Error) {
        super(`${operation} failed for ${filepath}: ${error.message}`);
        this.name = 'FileOperationError';
    }
}