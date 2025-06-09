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
exports.traverse = traverse;
const path = __importStar(require("path"));
const promises_1 = require("fs/promises");
const visitFileDefault = async (filepath, stats) => {
    // console.log(`File: ${filepath}, Size: ${stats.size}`);
};
const visitDirDefault = async (filepath, stats) => {
    // console.log(`Directory: ${filepath}`);
};
function isRegExp(value) {
    return Object.prototype.toString.call(value) === '[object RegExp]';
}
function isString(value) {
    return typeof value === 'string';
}
function genFnInc(includeOrExclude) {
    if (!includeOrExclude) {
        return undefined;
    }
    if (isRegExp(includeOrExclude)) {
        return (fp) => includeOrExclude.test(fp);
    }
    if (isString(includeOrExclude) && includeOrExclude.length > 0) {
        return (fp) => Boolean(fp && fp.includes(includeOrExclude));
    }
    return undefined;
}
async function traverse(filepath, visitFile = visitFileDefault, visitDir = visitDirDefault, options = {}) {
    try {
        const fp = options.testPath ? filepath : path.basename(filepath);
        const fnEx = genFnInc(options.exclude);
        const fnInc = genFnInc(options.include);
        const s = await (0, promises_1.stat)(filepath);
        if (s.isDirectory()) {
            const files = await (0, promises_1.readdir)(filepath, { withFileTypes: true });
            // 收集所有子路径遍历任务
            const traverseTasks = files.map(dirent => {
                const fullPath = path.join(filepath, dirent.name);
                return traverse(fullPath, visitFile, visitDir, options);
            });
            // 等待所有子路径处理完成
            await Promise.all(traverseTasks);
            // 最后处理当前目录
            await visitDir(filepath, s);
        }
        else if (s.isFile()) {
            if (fnEx === null || fnEx === void 0 ? void 0 : fnEx(fp))
                return;
            if (fnInc && !fnInc(fp))
                return;
            await visitFile(filepath, s);
        }
    }
    catch (error) {
        console.error(error);
        throw error;
    }
}
exports.default = traverse;
if (require.main === module) {
    traverse(path.resolve(__dirname, '../coverage'))
        .catch(console.error);
}
//# sourceMappingURL=traverseFiles.js.map