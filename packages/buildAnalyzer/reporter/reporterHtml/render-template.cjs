'use strict';
const fs = require('fs/promises');
const path = require('path');
const { traverse } = require('../../utils/traverseFiles.cjs');

const htmlEscape = (str) =>
  str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
const buildHtmlTemplate = (title, scripts, data, styles) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="ie=edge" />
  <title>${htmlEscape(title)}</title>
    ${styles.map((s) => `<style>${s}</style>`).join('\n')}
</head>
<body>
  <main>
    ${data.htmls.join('\n')}
  </main>
    ${scripts.map((s) => `<script>${s}</script>`).join('\n')}
    ${data.scripts.join('\n')}
</body>
</html>
`;
const renderTemplate = async ({ title, data }) => {
  const scripts = [];
  const styles = [];
  await visitFile(path.join(__dirname, 'lib/vue.global.prod.js'));
  await traverse(path.join(__dirname, 'lib'), visitFile, () => {}, {
    exclude: (f) => f.indexOf('vue.global') >= 0,
  });

  async function visitFile(filepath) {
    const cont = await fs.readFile(filepath, 'utf-8');
    if (/\.js$/.test(filepath)) {
      scripts.push(cont);
    } else if (/\.css$/.test(filepath)) {
      styles.push(cont);
    }
  }
  return buildHtmlTemplate(title, scripts, data, styles);
};
const outputRawData = (strData) => {
  const data = JSON.parse(strData);
  return JSON.stringify(data, null, 2);
};
const outputPlainTextList = (strData) => {
  var _a;
  const data = JSON.parse(strData);
  const bundles = {};
  for (const meta of Object.values(data.nodeMetas)) {
    for (const [bundleId, uid] of Object.entries(meta.moduleParts)) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { metaUid: mainUid, ...lengths } = data.nodeParts[uid];
      bundles[bundleId] =
        (_a = bundles[bundleId]) !== null && _a !== void 0 ? _a : [];
      bundles[bundleId].push([meta.id, lengths]);
    }
  }
  const bundlesEntries = Object.entries(bundles).sort((e1, e2) =>
    e1[0].localeCompare(e2[0]),
  );
  let output = '';
  const IDENT = '  ';
  for (const [bundleId, files] of bundlesEntries) {
    output += bundleId + ':\n';
    files.sort((e1, e2) => e1[0].localeCompare(e2[0]));
    for (const [file, lengths] of files) {
      output += IDENT + file + ':\n';
      output += IDENT + IDENT + `rendered: ${String(lengths.renderedLength)}\n`;
      if (data.options.gzip) {
        output += IDENT + IDENT + `gzip: ${String(lengths.gzipLength)}\n`;
      }
      if (data.options.brotli) {
        output += IDENT + IDENT + `brotli: ${String(lengths.brotliLength)}\n`;
      }
    }
  }
  return output;
};
exports.renderTemplate = renderTemplate;
