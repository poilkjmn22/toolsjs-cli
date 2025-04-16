import { traverse, type TraverseOptions } from '@toolsjs-cli/utils';
import { promises as fs } from 'fs';
import path from 'path';

export {
  traverse,
  type TraverseOptions
};

// 仅保留 fileHelper 特有的工具函数
export async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

export function isFileType(filepath: string, extensions: string[]): boolean {
  const ext = path.extname(filepath).toLowerCase();
  return extensions.includes(ext);
}
