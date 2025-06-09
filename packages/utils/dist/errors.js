"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileOperationError = void 0;
class FileOperationError extends Error {
    constructor(operation, filepath, error) {
        super(`${operation} failed for ${filepath}: ${error.message}`);
        this.name = 'FileOperationError';
    }
}
exports.FileOperationError = FileOperationError;
//# sourceMappingURL=errors.js.map