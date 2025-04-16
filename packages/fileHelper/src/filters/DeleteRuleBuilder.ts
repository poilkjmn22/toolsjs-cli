import { Stats } from "fs";
import path from "path";

export class DeleteRuleBuilder {
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
        return !excludes.some(pattern => {
          if (pattern instanceof RegExp) return pattern.test(filepath);
          return filepath.includes(pattern);
        });
      });
    }
    return this;
  }

  withSizeLimit(minSize?: number, maxSize?: number): this {
    if (minSize !== undefined || maxSize !== undefined) {
      this.filters.push((_, stats) => {
        const size = stats.size;
        if (minSize !== undefined && size < minSize) return false;
        if (maxSize !== undefined && size > maxSize) return false;
        return true;
      });
    }
    return this;
  }

  withDateRange(olderThan?: Date, newerThan?: Date): this {
    if (olderThan || newerThan) {
      this.filters.push((_, stats) => {
        const mtime = stats.mtime;
        if (olderThan && mtime > olderThan) return false;
        if (newerThan && mtime < newerThan) return false;
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
    if (this.filters.length === 0) {
      return () => true; // 没有规则时匹配所有
    }
    return (filepath, stats) => this.filters.every(filter => filter(filepath, stats));
  }
}