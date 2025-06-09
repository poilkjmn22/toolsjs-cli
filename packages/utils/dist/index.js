"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileOperationError = exports.traverse = void 0;
exports.unixy = unixy;
exports.sumBy = sumBy;
exports.convertNumber = convertNumber;
exports.safeReadFile = safeReadFile;
exports.safeWriteFile = safeWriteFile;
exports.calculateFileHash = calculateFileHash;
exports.formatFileSize = formatFileSize;
exports.convertSizeToBytes = convertSizeToBytes;
const traverseFiles_1 = require("./traverseFiles");
Object.defineProperty(exports, "traverse", { enumerable: true, get: function () { return traverseFiles_1.traverse; } });
const crypto_1 = require("crypto");
const fs_1 = require("fs");
const errors_1 = require("./errors");
Object.defineProperty(exports, "FileOperationError", { enumerable: true, get: function () { return errors_1.FileOperationError; } });
function unixy(filepath) {
    return filepath.replace(/\\/g, '/');
}
function sumBy(array, key) {
    return array.reduce((sum, item) => sum + (Number(item[key]) || 0), 0);
}
function convertNumber(value, total) {
    if (typeof value === 'number')
        return value;
    if (value.endsWith('%') && total !== void 0) {
        return (total * parseInt(value)) / 100;
    }
    return parseInt(value);
}
async function safeReadFile(filepath) {
    try {
        return await fs_1.promises.readFile(filepath);
    }
    catch (error) {
        throw new errors_1.FileOperationError('read', filepath, error);
    }
}
async function safeWriteFile(filepath, data) {
    try {
        await fs_1.promises.writeFile(filepath, data);
    }
    catch (error) {
        throw new errors_1.FileOperationError('write', filepath, error);
    }
}
function calculateFileHash(content) {
    return (0, crypto_1.createHash)('sha256').update(content).digest('hex');
}
function formatFileSize(bytes, spec = 'si') {
    const thresh = spec === 'si' ? 1000 : 1024;
    const units = spec === 'si'
        ? ['B', 'kB', 'MB', 'GB', 'TB']
        : ['B', 'KiB', 'MiB', 'GiB', 'TiB'];
    let u = 0;
    let b = bytes;
    while (Math.abs(b) >= thresh && u < units.length - 1) {
        b /= thresh;
        u++;
    }
    return `${b.toFixed(1)} ${units[u]}`;
}
function convertSizeToBytes(size, spec = 'si') {
    const unit = size.slice(-2).toLowerCase();
    const value = parseFloat(size.slice(0, -2));
    const thresh = spec === 'si' ? 1000 : 1024;
    switch (unit) {
        case 'kb':
            return value * thresh;
        case 'mb':
            return value * thresh * thresh;
        case 'gb':
            return value * thresh * thresh * thresh;
        default:
            return value; // 默认假设为字节
    }
}
// 将所有功能作为默认导出
exports.default = {
    convertNumber,
    unixy,
    sumBy,
    traverse: traverseFiles_1.traverse,
    safeReadFile,
    safeWriteFile,
    calculateFileHash,
    formatFileSize,
    convertSizeToBytes,
};
//# sourceMappingURL=index.js.map