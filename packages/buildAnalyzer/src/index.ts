import path, { relative } from 'path';
import { promises as fs, Stats } from 'fs';
import { BuildAnalyzerConfig, Reporter } from './types';
import { BuildAnalyzer } from './core/analyzer';
import { ConsoleReporter } from './reporters/console';
import { DiffAnalyzer } from './services/diffAnalyzer';
import { ZipBuilder } from './services/zipBuilder';
import { ConfigurationError } from './errors';
import { traverse, unixy } from '@toolsjs-cli/utils';
import minimatch from 'minimatch';

const defaultConfig: BuildAnalyzerConfig = {
    buildDir: 'build',
    reportDir: 'buildReport',
    exclude: (filepath: string) => /buildReport|\.gz$/.test(filepath),
    maxCount: '20%',
    minCount: 10,
    overSizeThreshold: '300kb',
    reportMode: 'console',
    filesizeSpec: 'si',
    noDiff: false
};
const defaultCfgPath = "buildAnalyzer.config.json";
async function loadConfig(configPath?: string): Promise<Partial<BuildAnalyzerConfig>> {
    const cfgPath = configPath || path.join(process.cwd(), defaultCfgPath);

    try {
        const content = await fs.readFile(cfgPath, 'utf-8');
        return JSON.parse(content);
    } catch (error) {
        console.warn(`未找到配置文件: ${defaultCfgPath},将使用默认配置项`);
        return {
        }
    }
}

async function main(options: Partial<BuildAnalyzerConfig>) {
    try {
        const loadedCfg = await loadConfig();
        const buildDir = options.buildDir || loadedCfg.buildDir || defaultConfig.buildDir;
        const reportDir = options.reportDir || loadedCfg.buildDir || defaultConfig.reportDir;

        const config: BuildAnalyzerConfig = {
            ...defaultConfig,
            ...loadedCfg,
            ...options,
            root: path.resolve(process.cwd(), buildDir),
            dirBuildInfo: path.resolve(process.cwd(), reportDir)
        };

        // 确保目录存在
        if (!config.root) {
            throw new ConfigurationError('构建目录未定义');
        }
        if (!config.dirBuildInfo) {
            throw new ConfigurationError('报告目录未定义');
        }


        // console.log(config, 'config')
        // 确保目录存在
        await fs.mkdir(config.dirBuildInfo, { recursive: true });

        // 初始化分析器
        const diffAnalyzer = new DiffAnalyzer();
        const analyzer = new BuildAnalyzer(config, diffAnalyzer);
        const zipBuilder = new ZipBuilder(config);

        // 加载历史构建信息
        await analyzer.loadLastBuildInfo();
        const cwd = process.cwd();

        await traverse(config.root, async (filepath: string, stat: Stats) => {
            if (typeof config.exclude === 'function' && !config.exclude(filepath)) {
                await analyzer.analyzeFile(filepath, stat);
            } else if (typeof config.exclude === 'string') {
                if (!new RegExp(config.exclude).test(filepath)) {
                    await analyzer.analyzeFile(filepath, stat);
                }
            } else if (Array.isArray(config.exclude)) {
                const relativePath = unixy(path.relative(cwd, filepath));
                if (!(config.exclude.some(pattern => {
                    return minimatch(relativePath, pattern) || relativePath.includes(pattern)
                }))) {
                    await analyzer.analyzeFile(filepath, stat);
                }
            } else {
                await analyzer.analyzeFile(filepath, stat);
            }
        })

        // 生成分析报告
        const report = await analyzer.generateReport();

        // 保存报告
        await analyzer.saveReport(report);

        // 构建差异包
        // console.log('正在构建差异包...');
        await zipBuilder.build(report);
        // console.log('差异包构建完成');

        // 输出报告
        let reporter: Reporter;
        switch (config.reportMode) {
            case 'console':
                reporter = new ConsoleReporter(report, config);
                break;
            default:
                throw new ConfigurationError(`不支持的报告模式: ${config.reportMode}`);
        }

        await reporter.report();

        console.log('分析完成！');
    } catch (error) {
        console.error('构建分析失败:', error instanceof Error ? error.message : String(error));
        process.exit(1);
    }
}

export { main };

// main({
//     buildDir: './dist',
//     reportDir: './distReport'
// })