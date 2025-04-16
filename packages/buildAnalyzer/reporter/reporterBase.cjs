const { convertNumber } = require('../utils/index.cjs');
const { cloneDeep } = require('lodash');
class ReporterBase {
  constructor(analyzeResult, opts, suggestions = []) {
    this.analyzeResult = analyzeResult;
    opts.overSizeThreshold = parseFloat(opts.overSizeThreshold);
    this.opts = opts;
    this.suggestions = suggestions;
  }
  // 模板方法,不同的报告载体（console,pdf,html,etc）均遵循此抽象的模板步骤
  report() {
    const calcResult = this.calc();
    this.displaySummary(calcResult);
    const fs = this.fillSuggestions(calcResult);
    for (let index = 0; index < fs.length; index++) {
      this.displaySuggestion(fs[index], index);
    }
    this.end();
  }
  end() {}
  calc() {
    const analyzeResult = this.analyzeResult;
    const opts = this.opts;
    const { totalSize, diffSize, deployCount } = analyzeResult.statistic;
    const fileInfoList = cloneDeep(analyzeResult.fileInfoList);
    fileInfoList.forEach((f) => {
      f.weightSize = f.size / totalSize;
      f.weightModify = deployCount / f.modifyCount;
      f.weightCache = this.calcWeightCache(f.weightSize, f.weightModify);
    });
    fileInfoList.sort((a, b) => b.weightCache - a.weightCache); // weightCache = func(weightSize , weightModify)越大的文件，越适合做缓存
    let maxCount = Math.ceil(convertNumber(opts.maxCount, fileInfoList.length));
    let minCount = Math.ceil(convertNumber(opts.minCount, fileInfoList.length));
    maxCount = Math.max(maxCount, minCount);

    return {
      ...analyzeResult,
      fileInfoList,
      totalSize,
      diffSize,
      deployCount,
      maxCount,
      minCount,
    };
  }
  calcWeightCache(
    weightSize,
    weightModify,
    config = { factSize: 4, factModify: 6 },
  ) {
    const { factSize, factModify } = config;
    return factSize * weightSize + factModify * weightModify;
  }
  displaySummary(calcResult) {
    console.log(calcResult);
  }
  fillSuggestions(calcResult) {
    return this.suggestions;
  }
  displaySuggestion(suggestion, i) {
    console.log(suggestion, i);
  }
}
module.exports = ReporterBase;
