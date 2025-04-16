const { renderTemplate } = require('./render-template.cjs');
const ReporterBase = require('../reporterBase.cjs');
const filesize = require('file-size');
const path = require('path');
const fs_1 = require('fs/promises');
const _ = require('lodash');

class ReporterHtml extends ReporterBase {
  constructor(analyzeResult, opts, suggestions) {
    super(analyzeResult, opts, suggestions);
    this.htmls = [];
    this.scripts = [];
  }
  async end() {
    const html = await renderTemplate({
      title: '打包文件分析以及建议',
      data: {
        htmls: this.htmls,
        scripts: this.scripts,
      },
    });
    fs_1.writeFile(path.join(this.opts.dirBuildInfo, 'report.html'), html);
    // if (this.opts.openBrowser) {

    const { default: open } = await import('open');
    open(path.join(this.opts.dirBuildInfo, 'report.html'));
    // }
  }
  displaySummary(calcResult) {
    const opts = this.opts;
    const { totalSize, deployCount, fileInfoList } = calcResult;
    const totalSizeStr = filesize(totalSize).human(opts.filesizeSpec);
    const html = `<h1 id="summary">总览：发布次数：{{deployCount}}, 文件总数量：{{fileCount}}，总大小：{{totalSizeStr}}</h1>`;
    const dataJson = JSON.stringify({
      deployCount,
      totalSizeStr,
      fileCount: fileInfoList.length,
    });
    const script = `<script>
            (()=> {
                const { createApp, ref } = Vue;
                createApp({
                    setup() {
                    const data = JSON.parse('${dataJson}')
                    return ref( data ).value;
                    }
                }).mount('#summary')
            })()
    </script>`;
    this.htmls.push(html);
    this.scripts.push(script);
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
        缓存权重: _.round(f.weightCache, 2),
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
      run: (suggestion) => {
        let p1 = `<p >
          新增：${add[0]}个、${filesize(add[1]).human(opts.filesizeSpec)}, 修改：${update[0]}个、${filesize(update[1]).human(opts.filesizeSpec)}，删除：${remove.length}个，总大小${diffSize > 0 ? '增加' : '减少'} ${filesize(Math.abs(diffSize)).human(opts.filesizeSpec)}
        </p>`;
        let p2 = '';
        if (shouldDiffDeploy) {
          p2 = `<p>本次打包文件差异较小，小于${opts.diffOversizeThreshold}, 建议增量发布</p>`;
        } else {
          p2 = `<p></p>本次打包文件差异较大，超过了${opts.diffOversizeThreshold}, 建议全量发布</p>`;
        }
        const html = `<div><h2>${suggestion.pre}</h2>${p1}${p2}</div>`;
        this.htmls.push(html);
      },
      post: '',
    };
    return [s1, s2, s3];
  }
  displaySuggestion(suggestion, i) {
    const { pre, run, post, tableData } = suggestion;
    let html = '';
    let script = '';
    if (tableData) {
      html = `<div id="suggest-${i + 1}" class="suggest-card"><h2>${pre}</h2><a-table :columns="columns" :data="data" :pagination="pagination"></a-table></div>`;
      const dataJson = JSON.stringify(tableData);
      script = `<script>
            (()=> {
                const { createApp, ref } = Vue;
                const app = createApp({
                    setup() {
                    const data = JSON.parse('${dataJson}')
                    const columns = data[0] ? Object.keys(data[0]).map(n => ({title: n, dataIndex: n, sortable: {sortDirections: ['ascend', 'descend'] }})) : []
                    return {
                        columns: ref(columns).value,
                        data: ref(data).value,
                        pagination: {
                            total: data.length,
                            pageSizeOptions: [10, 30, 60, 100],
                            defaultPageSize: 10,
                            showTotal: true,
                            showPageSize: true,
                            showJumper: true
                        }
                    };
                    }
                })
                app.use(ArcoVue)
                app.component('a-table', ArcoVue.Table)
                app.mount('${`#suggest-${i + 1}`}')
            })()
        </script>`;
    }
    if (run) {
      run(suggestion);
    }
    this.htmls.push(html);
    this.scripts.push(script);
  }
}

module.exports = ReporterHtml;
