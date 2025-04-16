import * as path from 'path';
import { stat, readdir } from 'fs/promises';
import { Stats } from 'fs';

export type VisitFunction = (filepath: string, stats: Stats) => Promise<void>;
export interface TraverseOptions {
  include?: string | RegExp;
  exclude?: string | RegExp;
  testPath?: boolean;
}

const visitFileDefault: VisitFunction = async (filepath: string, stats: Stats) => {
  // console.log(`File: ${filepath}, Size: ${stats.size}`);
};

const visitDirDefault: VisitFunction = async (filepath: string, stats: Stats) => {
  // console.log(`Directory: ${filepath}`);
};

function isRegExp(value: unknown): value is RegExp {
  return Object.prototype.toString.call(value) === '[object RegExp]';
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function genFnInc(includeOrExclude?: string | RegExp): ((fp: string) => boolean) | undefined {
  if (!includeOrExclude) {
    return undefined;
  }

  if (isRegExp(includeOrExclude)) {
    return (fp: string) => includeOrExclude.test(fp);
  } 
  
  if (isString(includeOrExclude) && includeOrExclude.length > 0) {
    return (fp: string) => Boolean(fp && fp.includes(includeOrExclude));
  }

  return undefined;
}

export async function traverse(
  filepath: string,
  visitFile: VisitFunction = visitFileDefault,
  visitDir: VisitFunction = visitDirDefault,
  options: TraverseOptions = {}
): Promise<void> {
  try {
    const fp = options.testPath ? filepath : path.basename(filepath);
    const fnEx = genFnInc(options.exclude);
    const fnInc = genFnInc(options.include);
    
    const s = await stat(filepath);
    
    if (s.isDirectory()) {
      const files = await readdir(filepath, { withFileTypes: true });
      
      // 收集所有子路径遍历任务
      const traverseTasks = files.map(dirent => {
        const fullPath = path.join(filepath, dirent.name);
        return traverse(fullPath, visitFile, visitDir, options);
      });
      
      // 等待所有子路径处理完成
      await Promise.all(traverseTasks);
      
      // 最后处理当前目录
      await visitDir(filepath, s);
    } else if (s.isFile()) {
      if (fnEx?.(fp)) return;
      if (fnInc && !fnInc(fp)) return;
      await visitFile(filepath, s);
    }
  } catch (error) {
    console.error(error);
    throw error;
  }
}

export default traverse;

if (require.main === module) {
  traverse(path.resolve(__dirname, '../coverage'))
    .catch(console.error);
}