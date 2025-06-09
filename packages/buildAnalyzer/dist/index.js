"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = main;
const path_1 = __importDefault(require("path"));
const fs_1 = require("fs");
const analyzer_1 = require("./core/analyzer");
const console_1 = require("./reporters/console");
const diffAnalyzer_1 = require("./services/diffAnalyzer");
const zipBuilder_1 = require("./services/zipBuilder");
const errors_1 = require("./errors");
const utils_1 = require("@toolsjs-cli/utils");
const minimatch_1 = __importDefault(require("minimatch"));
const defaultConfig = {
    buildDir: 'build',
    reportDir: 'buildReport',
    exclude: (filepath) => /buildReport|\.gz$/.test(filepath),
    maxCount: '20%',
    minCount: 10,
    overSizeThreshold: '300kb',
    reportMode: 'console',
    filesizeSpec: 'si',
    noDiff: false
};
const defaultCfgPath = "buildAnalyzer.config.json";
async function loadConfig(configPath) {
    const cfgPath = configPath || path_1.default.join(process.cwd(), defaultCfgPath);
    try {
        const content = await fs_1.promises.readFile(cfgPath, 'utf-8');
        return JSON.parse(content);
    }
    catch (error) {
        console.warn(`未找到配置文件: ${defaultCfgPath},将使用默认配置项`);
        return {};
    }
}
async function main(options) {
    try {
        const loadedCfg = await loadConfig();
        const buildDir = options.buildDir || loadedCfg.buildDir || defaultConfig.buildDir;
        const reportDir = options.reportDir || loadedCfg.buildDir || defaultConfig.reportDir;
        const config = {
            ...defaultConfig,
            ...loadedCfg,
            ...options,
            root: path_1.default.resolve(process.cwd(), buildDir),
            dirBuildInfo: path_1.default.resolve(process.cwd(), reportDir)
        };
        // 确保目录存在
        if (!config.root) {
            throw new errors_1.ConfigurationError('构建目录未定义');
        }
        if (!config.dirBuildInfo) {
            throw new errors_1.ConfigurationError('报告目录未定义');
        }
        // console.log(config, 'config')
        // 确保目录存在
        await fs_1.promises.mkdir(config.dirBuildInfo, { recursive: true });
        // 初始化分析器
        const diffAnalyzer = new diffAnalyzer_1.DiffAnalyzer();
        const analyzer = new analyzer_1.BuildAnalyzer(config, diffAnalyzer);
        const zipBuilder = new zipBuilder_1.ZipBuilder(config);
        // 加载历史构建信息
        await analyzer.loadLastBuildInfo();
        const cwd = process.cwd();
        await (0, utils_1.traverse)(config.root, async (filepath, stat) => {
            if (typeof config.exclude === 'function' && !config.exclude(filepath)) {
                await analyzer.analyzeFile(filepath, stat);
            }
            else if (typeof config.exclude === 'string') {
                if (!new RegExp(config.exclude).test(filepath)) {
                    await analyzer.analyzeFile(filepath, stat);
                }
            }
            else if (Array.isArray(config.exclude)) {
                const relativePath = (0, utils_1.unixy)(path_1.default.relative(cwd, filepath));
                if (!(config.exclude.some(pattern => {
                    return (0, minimatch_1.default)(relativePath, pattern) || relativePath.includes(pattern);
                }))) {
                    await analyzer.analyzeFile(filepath, stat);
                }
            }
            else {
                await analyzer.analyzeFile(filepath, stat);
            }
        });
        // 生成分析报告
        const report = await analyzer.generateReport();
        // 保存报告
        await analyzer.saveReport(report);
        // 构建差异包
        // console.log('正在构建差异包...');
        await zipBuilder.build(report);
        // console.log('差异包构建完成');
        // 输出报告
        let reporter;
        switch (config.reportMode) {
            case 'console':
                reporter = new console_1.ConsoleReporter(report, config);
                break;
            default:
                throw new errors_1.ConfigurationError(`不支持的报告模式: ${config.reportMode}`);
        }
        await reporter.report();
        console.log('分析完成！');
    }
    catch (error) {
        console.error('构建分析失败:', error instanceof Error ? error.message : String(error));
        process.exit(1);
    }
}
// main({
//     buildDir: './dist',
//     reportDir: './distReport'
// })
