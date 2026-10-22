/* 逐视图 parity：public/ 与 prototypes/v0.2/ 必须是「同一份渲染代码，只换数据来源」。
 *
 * 为什么要有这一条：原型签认（G2）签的是那套视图，开发版如果另写一套，
 * 后面每改一个卡片就要改两处，且原型再也不能当"验收基准"。所以这里钉三件事：
 * 1. 原型里的每个函数在开发版里都存在（不许删视图/删交互）；
 * 2. 开发版新增的函数只能是数据层与启动那一组（白名单），不许偷偷加视图；
 * 3. 导航常量（PAGES / SUBPAGES / QUAL_LEVELS）与样式表逐字节一致。
 *
 * 只比"结构与常量"，不比数据：public/demo-data.js 是离线回退，允许与原型不同步？
 * ——不允许。它是生成物，两边必须同一份（由 demo/build-demo-data.mjs 一次写两处）。
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

const ROOT = new URL('..', import.meta.url).pathname;
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

const proto = read('prototypes/v0.2/app.js');
const shipped = read('public/app.js');

/** 从源码里抠出一个 `const X = '...'` 形式的常量块（原型与开发版同形，够用）。 */
function block(src, name) {
  const i = src.indexOf(`const ${name} = `);
  assert.notEqual(i, -1, `找不到常量 ${name}`);
  return src.slice(i, src.indexOf('\n};', i) + 3 || src.length);
}

const fnNames = (src) => [...src.matchAll(/function ([A-Za-z_$][\w$]*)/g)].map((m) => m[1]).sort();

test('① 视图函数：原型里的每个函数开发版都有（一个都不许丢）', () => {
  const shippedSet = new Set(fnNames(shipped));
  const missing = fnNames(proto).filter((n) => !shippedSet.has(n));
  assert.deepEqual(missing, [], `开发版缺少这些函数：${missing.join(', ')}`);
});

test('② 新增函数只能是数据层与启动组（防止偷偷另写一套视图）', () => {
  const ALLOWED = new Set([
    'apiBase', 'applyData', 'loadBootstrap', 'init', 'flushUploadQueue', 'uploadToWorkbench',
  ]);
  const protoSet = new Set(fnNames(proto));
  const extra = fnNames(shipped).filter((n) => !protoSet.has(n) && !ALLOWED.has(n));
  assert.deepEqual(extra, [], `开发版多出未登记的函数：${extra.join(', ')}（要加就先想清楚是不是在另写视图）`);
});

test('③ 12 个一级页与子页签：两边完全一致', () => {
  for (const name of ['PAGES', 'SUBPAGES', 'SUBTITLES']) {
    assert.equal(block(shipped, name), block(proto, name), `${name} 与原型不一致`);
  }
  const pages = [...proto.matchAll(/\['([a-z]+)', '[^']+', '[a-z]+'\]/g)].map((m) => m[1]);
  assert.equal(new Set(pages).size >= 12, true, '一级页至少 12 个（11 个 SPEC 页 + 资料库）');
});

test('④ 分类指标档位表 QUAL_LEVELS 两边一致（分级口径不能只改一边）', () => {
  assert.equal(block(shipped, 'QUAL_LEVELS'), block(proto, 'QUAL_LEVELS'));
});

test('⑤ 样式表与原型逐字节一致（改视觉先改原型，再同步过来）', () => {
  assert.equal(read('public/style.css'), read('prototypes/v0.2/style.css'));
});

test('⑥ index.html 只差 <title> 与版本号：不允许开发版自己造一套骨架', () => {
  /* <title> 在原型里写着"原型"，开发版不能照抄。版本号（title / 交互原型条 / ver-chip /
     页脚）必须随 VERSION 前移，而 prototypes/v0.2 冻结在 0.1.0 不动（D37）——所以两边
     先把 vX.Y.Z 归一化成占位符再比。除此之外逐字节相同：
     骨架、容器 id、favicon、脚本标签都必须一致。 */
  const strip = (html) => html
    .replace(/<title>[\s\S]*?<\/title>/g, '')
    .replace(/v\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?/g, 'vX.Y.Z')
    .trim();
  assert.equal(strip(read('public/index.html')), strip(read('prototypes/v0.2/index.html')),
    'index.html 与原型不一致；若确需改骨架，先同步改原型');
});

test('⑦ 接口基址与 bootstrap 路径写死成前端唯一来源（改前缀要改这里）', () => {
  assert.match(shipped, /\/api\/cervical\/bootstrap/, 'Bootstrap 路径必须显式写出来');
  assert.match(shipped, /function apiBase\(\)/, '必须从 location.pathname 反推基址，dev 与 Desktop 共用一份');
});
