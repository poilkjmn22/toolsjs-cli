#!/usr/bin/env node
const { program } = require('commander');
const { main } = require('../dist/index.js');

program
  .option('-d, --distDir <dir>', '项目打包目录', 'build')
  .option('-rd, --reportDir <dir>', '打包分析结果目录', 'buildReport')
  .option('-maxc, --maxCount <count>', '最大建议数量，支持百分比', '20%')
  .option('-minc, --minCount <count>', '最小建议数量', '10')
  .option('-ost, --overSizeThreshold <size>', '文件大小过大的阈值', '300kb')
  .option('-fs, --filesizeSpec <spec>', '文件大小显示格式(si/iec)', 'si')
  .option('-rm, --reportMode <mode>', '分析结果查看模式(console/html)', 'console')
  .option('-nd, --noDiff', '不覆盖增量发布的打包文件dist.zip为全量', false)
  .action((options) => {
    main(options).catch(error => {
      console.error('构建分析失败:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    });
  })
program.parse(process.argv);