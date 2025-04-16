import { Stats } from 'fs';
import * as path from 'path';

export interface MoveRule {
  overwrite?: any;
  extensions?: string[];
  patterns?: (string | RegExp)[];
  excludes?: (string | RegExp)[];
  minSize?: number;
  maxSize?: number;
  olderThan?: Date;
  newerThan?: Date;
  renameRule: (originalName: string) => string;
  dryRun?: boolean;
  customFilter?: (filepath: string, stats: Stats) => boolean;
  onMove?: (from: string, to: string) => void;
}

export class MoveRuleBuilder {
  private filters: Array<(filepath: string, stats: Stats) => boolean> = [];
  
  withExtensions(extensions?: string[]): this {
    if (extensions?.length) {
      this.filters.push((filepath) => {
        const ext = path.extname(filepath).toLowerCase();
        return extensions.includes(ext);
      });
    }
    return this;
  }

  withPatterns(patterns?: (string | RegExp)[]): this {
    if (patterns?.length) {
      this.filters.push((filepath) => {
        return patterns.some(pattern => {
          if (pattern instanceof RegExp) return pattern.test(filepath);
          return filepath.includes(pattern);
        });
      });
    }
    return this;
  }

  withExcludes(excludes?: (string | RegExp)[]): this {
    if (excludes?.length) {
      this.filters.push((filepath) => {
        return !excludes.some(pattern =>
          pattern instanceof RegExp ? pattern.test(filepath) : filepath.includes(pattern)
        );
      });
    }
    return this;
  }

  withSizeLimit(minSize?: number, maxSize?: number): this {
    if (minSize !== undefined || maxSize !== undefined) {
      this.filters.push((_, stats) => {
        if (minSize !== undefined && stats.size < minSize) return false;
        if (maxSize !== undefined && stats.size > maxSize) return false;
        return true;
      });
    }
    return this;
  }

  withDateRange(olderThan?: Date, newerThan?: Date): this {
    if (olderThan || newerThan) {
      this.filters.push((_, stats) => {
        if (olderThan && stats.mtime > olderThan) return false;
        if (newerThan && stats.mtime < newerThan) return false;
        return true;
      });
    }
    return this;
  }

  withCustomFilter(filter?: (filepath: string, stats: Stats) => boolean): this {
    if (filter) {
      this.filters.push(filter);
    }
    return this;
  }

  build(): (filepath: string, stats: Stats) => boolean {
    return (filepath, stats) => 
      this.filters.length === 0 || this.filters.every(filter => filter(filepath, stats));
  }
}