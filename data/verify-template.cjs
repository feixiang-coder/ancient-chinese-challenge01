/**
 * 校验生成的 articles.xlsx 是否可以正常被解析。
 * 运行：node data/verify-template.cjs
 */
const path = require('path');
const fs = require('fs');
const XLSX = require(path.resolve(__dirname, '..', 'libs', 'xlsx.full.min.js'));

const buf = fs.readFileSync(path.resolve(__dirname, 'articles.xlsx'));
const wb = XLSX.read(buf, { type: 'buffer' });

console.log('工作表：', wb.SheetNames);

['articles', 'questions'].forEach((name) => {
    const sheet = wb.Sheets[name];
    if (!sheet) {
        console.log('!! 缺少工作表：' + name);
        return;
    }
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });
    console.log('\n[' + name + '] 共 ' + rows.length + ' 行，首行字段：');
    if (rows[0]) console.log(Object.keys(rows[0]).join(' | '));
    rows.slice(0, 2).forEach((r, i) => {
        console.log('-- 第 ' + (i + 1) + ' 行示例 --');
        Object.entries(r).forEach(([k, v]) => {
            const text = String(v).replace(/\s+/g, ' ').slice(0, 50);
            console.log('  ' + k + ': ' + text);
        });
    });
});
