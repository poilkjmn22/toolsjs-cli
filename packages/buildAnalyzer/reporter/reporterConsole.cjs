const ReporterBase = require('./reporterBase.cjs');
const chalk = require('chalk');
const filesize = require('file-size');

class ReporterConsole extends ReporterBase {
  constructor(analyzeResult, opts, suggestions) {
    super(analyzeResult, opts, suggestions);
  }
  displaySummary(calcResult) {
    const opts = this.opts;
    const { totalSize, deployCount, fileInfoList } = calcResult;
    console.log(chalk.green('打包文件分析结果以及建议：'));
    console.log(
      chalk`{white ==================总览：发布次数：{red ${deployCount}}, 文件总数量：{red ${fileInfoList.length}}，总大小：{red ${filesize(totalSize).human(opts.filesizeSpec)}}=====================}`,
    );
  }
  fillSuggestions(calcResult) {
    const {
      maxCount,
      minCount,
      fileInfoList,
      diffSize,
      add,
      update,
      remove,
      shouldDiffDeploy,
    } = calcResult;
    const opts = this.opts;
    const s1 = {
      pre: `1.大小较大、修改频率较低的文件（取排名前${opts.maxCount},[${minCount}, ${maxCount}]），建议使用ngnix缓存、CDN等手段优化网站性能：`,
      tableData: fileInfoList.slice(0, maxCount).map((f) => ({
        文件名: f.filepath,
        文件大小: filesize(f.size).human(opts.filesizeSpec),
        修改次数: f.modifyCount,
      })),
      post: '',
    };
    const s2 = {
      pre: `2.文件大小超过了 ${filesize(opts.overSizeThreshold).human(opts.filesizeSpec)}, 建议进行切片处理或者预加载等等优化手段`,
      tableData: fileInfoList
        .sort((a, b) => b.size - a.size)
        .reduce((memo, f) => {
          if (f.size >= opts.overSizeThreshold) {
            memo.push({
              文件名: f.filepath,
              文件大小: filesize(f.size).human(opts.filesizeSpec),
            });
          }
          return memo;
        }, []),
      post: '',
    };
    const s3 = {
      pre: '3.与上次打包文件的差异对比情况：',
      run: () => {
        console.log(
          chalk`{white ==================新增：{green ${add[0]}个、${filesize(add[1]).human(opts.filesizeSpec)}}, 修改：{yellow ${update[0]}个、${filesize(update[1]).human(opts.filesizeSpec)}}，删除：{red ${remove.length}}个，总大小${diffSize > 0 ? '增加' : '减少'} {red ${filesize(Math.abs(diffSize)).human(opts.filesizeSpec)}}=====================}`,
        );
        if (shouldDiffDeploy) {
          console.log(
            chalk`{white ==================本次打包文件差异较小，小于${opts.diffOversizeThreshold}, 建议增量发布 ==================}`,
          );
        } else {
          console.log(
            chalk`{white ==================本次打包文件差异较大，超过了${opts.diffOversizeThreshold}, 建议全量发布 ==================}`,
          );
        }
      },
      post: '',
    };
    return [s1, s2, s3];
  }
  displaySuggestion(suggestion) {
    const { pre, run, post, tableData } = suggestion;
    console.log(chalk.red(`=========${pre}===========`));
    if (tableData) {
      if (tableData.length > 0) {
        console.table(tableData);
      } else {
        console.log('暂无数据');
      }
    }
    if (run) {
      run();
    }
    console.log(chalk.red(`=============${post}===============`));
  }
}

module.exports = ReporterConsole;
