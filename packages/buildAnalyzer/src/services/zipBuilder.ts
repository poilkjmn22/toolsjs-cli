import { createWriteStream } from 'fs';
import path from 'path';
import archiver from 'archiver';
import { BuildAnalyzerConfig, BuildReport, FileInfo } from '../types';

export class ZipBuilder {
    constructor(private config: BuildAnalyzerConfig) { }

    async build(report: BuildReport): Promise<void> {
        if (report.sameBuild) {
            return;
        }
        const rootDir = path.basename(this.config.root || '');
        const zipPath = path.join(this.config.dirBuildInfo!, `${rootDir}.zip`);

        const output = createWriteStream(zipPath);
        const archive = archiver('zip', {
            zlib: { level: 9 } // 最高压缩级别
        });

        return new Promise((resolve, reject) => {
            output.on('close', resolve);
            archive.on('error', reject);

            archive.pipe(output);

            for (const file of (report.add || []).concat(report.update || [])) {
                const filePath = path.join(this.config.root!, file.filepath);
                archive.file(filePath, { name: path.join(rootDir, file.filepath) });
            }

            archive.finalize();
        });
    }
}