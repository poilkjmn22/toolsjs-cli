import { traverse, type TraverseOptions } from './traverseFiles';
import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import { FileOperationError } from './errors';

export function unixy(filepath: string): string {
    return filepath.replace(/\\/g, '/');
}

export function sumBy<T>(array: T[], key: keyof T): number {
    return array.reduce((sum, item) => sum + (Number(item[key]) || 0), 0);
}

export function convertNumber(value: string | number, total?: number): number {
    if (typeof value === 'number') return value;
    if (value.endsWith('%') && total !== void 0) {
        return (total * parseInt(value)) / 100;
    }
    return parseInt(value);
}

export async function safeReadFile(filepath: string): Promise<Buffer> {
    try {
        return await fs.readFile(filepath);
    } catch (error) {
        throw new FileOperationError('read', filepath, error as Error);
    }
}

export async function safeWriteFile(filepath: string, data: string | Buffer): Promise<void> {
    try {
        await fs.writeFile(filepath, data);
    } catch (error) {
        throw new FileOperationError('write', filepath, error as Error);
    }
}

export function calculateFileHash(content: Buffer): string {
    return createHash('sha256').update(content).digest('hex');
}

export function formatFileSize(bytes: number, spec: 'si' | 'iec' = 'si'): string {
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
export function convertSizeToBytes(size: string, spec: 'si' | 'iec' = 'si'): number {
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

export {
    traverse,
    type TraverseOptions,
    FileOperationError
};

// 将所有功能作为默认导出
export default {
    convertNumber,
    unixy,
    sumBy,
    traverse,
    safeReadFile,
    safeWriteFile,
    calculateFileHash,
    formatFileSize,
    convertSizeToBytes,
};