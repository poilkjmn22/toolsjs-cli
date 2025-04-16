const ReporterConsole = require('./reporterConsole.cjs');
const ReporterHtml = require('./reporterHtml/index.cjs');
function useReporter(res, opts) {
  let r = null;
  switch (opts.reportMode) {
    case 'console':
      r = new ReporterConsole(res, opts);
      break;
    case 'html':
      r = new ReporterHtml(res, opts);
      break;

    default:
      throw new Error('尚未支持的报告模式');
      break;
  }
  return r;
}

module.exports = useReporter;
