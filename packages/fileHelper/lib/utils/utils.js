"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.traverse = void 0;
exports.ensureDir = ensureDir;
exports.isFileType = isFileType;
const utils_1 = require("@toolsjs-cli/utils");
Object.defineProperty(exports, "traverse", { enumerable: true, get: function () { return utils_1.traverse; } });
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
// 仅保留 fileHelper 特有的工具函数
async function ensureDir(dir) {
    await fs_1.promises.mkdir(dir, { recursive: true });
}
function isFileType(filepath, extensions) {
    const ext = path_1.default.extname(filepath).toLowerCase();
    return extensions.includes(ext);
}
//# sourceMappingURL=utils.js.map