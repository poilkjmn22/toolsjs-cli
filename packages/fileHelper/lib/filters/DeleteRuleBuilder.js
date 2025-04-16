"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeleteRuleBuilder = void 0;
const path_1 = __importDefault(require("path"));
class DeleteRuleBuilder {
    constructor() {
        this.filters = [];
    }
    withExtensions(extensions) {
        if (extensions === null || extensions === void 0 ? void 0 : extensions.length) {
            this.filters.push((filepath) => {
                const ext = path_1.default.extname(filepath).toLowerCase();
                return extensions.includes(ext);
            });
        }
        return this;
    }
    withPatterns(patterns) {
        if (patterns === null || patterns === void 0 ? void 0 : patterns.length) {
            this.filters.push((filepath) => {
                return patterns.some(pattern => {
                    if (pattern instanceof RegExp)
                        return pattern.test(filepath);
                    return filepath.includes(pattern);
                });
            });
        }
        return this;
    }
    withExcludes(excludes) {
        if (excludes === null || excludes === void 0 ? void 0 : excludes.length) {
            this.filters.push((filepath) => {
                return !excludes.some(pattern => {
                    if (pattern instanceof RegExp)
                        return pattern.test(filepath);
                    return filepath.includes(pattern);
                });
            });
        }
        return this;
    }
    withSizeLimit(minSize, maxSize) {
        if (minSize !== undefined || maxSize !== undefined) {
            this.filters.push((_, stats) => {
                const size = stats.size;
                if (minSize !== undefined && size < minSize)
                    return false;
                if (maxSize !== undefined && size > maxSize)
                    return false;
                return true;
            });
        }
        return this;
    }
    withDateRange(olderThan, newerThan) {
        if (olderThan || newerThan) {
            this.filters.push((_, stats) => {
                const mtime = stats.mtime;
                if (olderThan && mtime > olderThan)
                    return false;
                if (newerThan && mtime < newerThan)
                    return false;
                return true;
            });
        }
        return this;
    }
    withCustomFilter(filter) {
        if (filter) {
            this.filters.push(filter);
        }
        return this;
    }
    build() {
        if (this.filters.length === 0) {
            return () => true; // 没有规则时匹配所有
        }
        return (filepath, stats) => this.filters.every(filter => filter(filepath, stats));
    }
}
exports.DeleteRuleBuilder = DeleteRuleBuilder;
//# sourceMappingURL=DeleteRuleBuilder.js.map