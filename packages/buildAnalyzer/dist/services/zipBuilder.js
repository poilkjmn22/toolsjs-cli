"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZipBuilder = void 0;
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const archiver_1 = __importDefault(require("archiver"));
class ZipBuilder {
    constructor(config) {
        this.config = config;
    }
    async build(report) {
        if (report.sameBuild) {
            return;
        }
        const rootDir = path_1.default.basename(this.config.root || '');
        const zipPath = path_1.default.join(this.config.dirBuildInfo, `${rootDir}.zip`);
        const output = (0, fs_1.createWriteStream)(zipPath);
        const archive = (0, archiver_1.default)('zip', {
            zlib: { level: 9 } // 最高压缩级别
        });
        return new Promise((resolve, reject) => {
            output.on('close', resolve);
            archive.on('error', reject);
            archive.pipe(output);
            for (const file of (report.add || []).concat(report.update || [])) {
                const filePath = path_1.default.join(this.config.root, file.filepath);
                archive.file(filePath, { name: path_1.default.join(rootDir, file.filepath) });
            }
            archive.finalize();
        });
    }
}
exports.ZipBuilder = ZipBuilder;
