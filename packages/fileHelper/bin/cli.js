#!/usr/bin/env node
const { batchDelete, batchMove, transformDocument, deploy } = require('../dist');
const { parseSizeFilter, parseDate, RenameParser } = require('../dist/utils/cliParser');
const { program } = require('commander');
const path = require('path');

// 错误处理函数
const handleError = (error) => {
  console.error('错误:', error.message);
  process.exit(1);
};

// 格式化输出函数
const formatResult = (result, type = 'move') => {
  const action = type === 'move' ? '移动' : '删除';
  const successKey = type === 'move' ? 'movedFiles' : 'deletedFiles';

  console.log(`成功${action}: ${result[successKey].length} 个文件`);
  if (result.movedDirs?.length) {
    console.log(`成功移动目录: ${result.movedDirs.length} 个`);
  }
  if (result.skippedFiles.length) {
    console.log(`跳过: ${result.skippedFiles.length} 个文件`);
  }
  if (result.errors.length) {
    console.log(`错误: ${result.errors.length} 个`);
    result.errors.forEach(err => {
      console.error(`  - ${err.file}: ${err.error.message}`);
    });
  }
};

program
  .version('1.0.0')
  .description('文件处理工具集');

program
  .command('move')
  .description('批量移动/重命名文件')
  .argument('<dir>', '源目录路径')
  .option('-e, --ext <extensions>', '文件扩展名，多个用逗号分隔')
  .option('-p, --pattern <pattern>', '文件名匹配模式')
  .option('-x, --exclude <pattern>', '排除的文件模式')
  .option('-s, --size <size>', '文件大小筛选(例如: >1MB, <500KB)')
  .option('-d, --date <date>', '日期筛选(YYYY-MM-DD)')
  .option('--older-than <date>', '早于指定日期')
  .option('--newer-than <date>', '晚于指定日期')
  .option('-r, --rename <pattern>', `重命名模式:
    基础变量:
      {name} - 原文件名(不含扩展名)
      {ext} - 扩展名
      {date:format} - 日期(支持自定义格式)
      {index:padding} - 序号(可指定补零长度)
    
    内置函数:
      {upper} - 转大写
      {lower} - 转小写
      {replace:search:replace} - 替换文本
      {slice:start:end} - 截取文本
      
    使用示例:
      -r "{date:yyyy-MM-dd}_{name}{ext}"        - 日期前缀
      -r "{replace:[-\\s]:_}"       - 替换空格和横线为下划线
      -r "{slice:0:3}" - 截取前3个字符并转大写`)
  .option('--dry-run', '试运行模式，不实际移动文件')
  .option('--overwrite', '覆盖已存在的文件')
  .option('--dir-rename <pattern>', `目录重命名模式:
    支持与文件重命名相同的模式
    示例: --dir-rename "{date}_{name}"`)
  .action(async (dir, opts) => {
    try {
      const sizeFilter = parseSizeFilter(opts.size);
      const fileParser = new RenameParser(opts.rename || '{name}{ext}');
      const dirParser = opts.dirRename ?
        new RenameParser(opts.dirRename) :
        fileParser;

      const result = await batchMove(dir, {
        extensions: opts.ext?.split(','),
        patterns: opts.pattern ? [new RegExp(opts.pattern)] : undefined,
        excludes: opts.exclude ? [new RegExp(opts.exclude)] : undefined,
        minSize: sizeFilter.minSize,
        maxSize: sizeFilter.maxSize,
        olderThan: opts.olderThan ? parseDate(opts.olderThan) : undefined,
        newerThan: opts.newerThan ? parseDate(opts.newerThan) : undefined,
        renameRule: (name) => fileParser.parse(name),
        dryRun: opts.dryRun,
        overwrite: opts.overwrite,
        dirRenameRule: opts.dirRename ?
          (name) => dirParser.parse(name) : undefined
      });

      formatResult(result, 'move');
    } catch (error) {
      handleError(error);
    }
  });

program
  .command('delete')
  .description('批量删除文件')
  .argument('<dir>', '目标目录路径')
  .option('-e, --ext <extensions>', '文件扩展名，多个用逗号分隔')
  .option('-p, --pattern <pattern>', '文件名匹配模式')
  .option('-x, --exclude <pattern>', '排除的文件模式')
  .option('-s, --size <size>', '文件大小筛选')
  .option('-d, --date <date>', '日期筛选(YYYY-MM-DD)')
  .option('--older-than <date>', '早于指定日期')
  .option('--newer-than <date>', '晚于指定日期')
  .option('--dry-run', '试运行模式，不实际删除文件')
  .action(async (dir, opts) => {
    try {
      const sizeFilter = parseSizeFilter(opts.size);

      const result = await batchDelete(dir, {
        extensions: opts.ext?.split(','),
        patterns: opts.pattern ? [new RegExp(opts.pattern)] : undefined,
        excludes: opts.exclude ? [new RegExp(opts.exclude)] : undefined,
        minSize: sizeFilter.minSize,
        maxSize: sizeFilter.maxSize,
        olderThan: opts.olderThan ? parseDate(opts.olderThan) : undefined,
        newerThan: opts.newerThan ? parseDate(opts.newerThan) : undefined,
        dryRun: opts.dryRun
      });

      formatResult(result, 'delete');
    } catch (error) {
      handleError(error);
    }
  });

program
  .command('transform')
  .description('转换文档内容')
  .argument('<files...>', '要转换的文件路径列表')
  .action(async (files) => {
    try {
      for (const file of files) {
        const ext = path.extname(file);
        await transformDocument(file, ext);
        console.log(chalk.green('已转换:'), file);
      }
    } catch (error) {
      handleError(error);
    }
  });

program
  .command('deploy')
  .description('部署文件到服务器')
  .argument('[localPath]', '本地源目录')
  .argument('[remotePath]', '远程目标目录')
  .option('-h, --host <host>', '服务器地址')
  .option('-p, --port <port>', '服务器端口')
  .option('-u, --username <username>', '用户名')
  .option('-P, --password <password>', '密码')
  .option('-x, --exclude <files>', '排除文件,多个用逗号分隔')
  .option('-c, --config <path>', '配置文件路径')
  .option('--pre-script <script>', '部署之前服务器执行脚本')
  .option('--auto-backup <script>', '远程备份脚本')
  .option('--post-script <script>', '部署之后服务器执行脚本')
  .option('--diff-upload', '是否采用差异部署文件')
  .action(async (localPath, remotePath, opts) => {
    try {
      await deploy({
        ...(localPath && { localPath }),
        ...(remotePath && { remotePath }),
        ...(opts.config && { config: opts.config }),
        ...(opts.host && { host: opts.host }),
        ...(opts.port && { port: Number(opts.port) }),
        ...(opts.username && { username: opts.username }),
        ...(opts.password && { password: opts.password }),
        ...(opts.exclude && { exclude: opts.exclude.split(',') }),
        ...(opts.postScript && { postScript: opts.postScript }),
        ...(opts.autoBackup && { autoBackup: Boolean(opts.autoBackup) }),
        ...(opts.compress && { compress: Boolean(opts.compress) }),
        ...(opts.preScript && { preScript: opts.preScript })
      });
    } catch (error) {
      handleError(error);
    }
  });

program.parse(process.argv);
