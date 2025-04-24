"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.MoveRuleBuilder = void 0;
const path = __importStar(require("path"));
class MoveRuleBuilder {
    constructor() {
        this.filters = [];
    }
    withExtensions(extensions) {
        if (extensions === null || extensions === void 0 ? void 0 : extensions.length) {
            this.filters.push((filepath) => {
                const ext = path.extname(filepath).toLowerCase();
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
                return !excludes.some(pattern => pattern instanceof RegExp ? pattern.test(filepath) : filepath.includes(pattern));
            });
        }
        return this;
    }
    withSizeLimit(minSize, maxSize) {
        if (minSize !== undefined || maxSize !== undefined) {
            this.filters.push((_, stats) => {
                if (minSize !== undefined && stats.size < minSize)
                    return false;
                if (maxSize !== undefined && stats.size > maxSize)
                    return false;
                return true;
            });
        }
        return this;
    }
    withDateRange(olderThan, newerThan) {
        if (olderThan || newerThan) {
            this.filters.push((_, stats) => {
                if (olderThan && stats.mtime > olderThan)
                    return false;
                if (newerThan && stats.mtime < newerThan)
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
        return (filepath, stats) => this.filters.length === 0 || this.filters.every(filter => filter(filepath, stats));
    }
}
exports.MoveRuleBuilder = MoveRuleBuilder;
//# sourceMappingURL=MoveRuleBuilder.js.map