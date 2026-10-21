/* 数据层：迁移幂等 / 播种幂等 / 与 demo-data.js 的 parity / 读模型形状 / 口径 D。
 *
 * parity 是这一层最重要的断言：开发版 `/api/bootstrap` 的 profiles 必须与定稿原型
 * prototypes/v0.2/demo-data.js 逐字段一致。前端是照着原型的形状写的，
 * 差一个字段就是"某个卡片空白"这种很难定位的 bug。
 *
 * 注意 includePrivate: true —— demo-data.js 里私密分节是有原文的（原型靠前端闸门折叠），
 * 而读模型默认给 null。要逐字段比就得显式要原文；默认行为的断言在 ⑥。
 */

import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { openDatabase, migrate, close } from '../dsh/store.js';
import { seedDemo, hasDemoData } from '../dsh/demo.js';
import { bootstrap, listSubjects, getProfile, SECTION_KEYS, PRIVATE_SECTIONS } from '../dsh/readmodels.js';

const ROOT = new URL('..', import.meta.url).pathname;
const demoSrc = readFileSync(join(ROOT, 'prototypes/v0.2/demo-data.js'), 'utf8');
const DEMO = JSON.parse(demoSrc.slice(demoSrc.indexOf('=') + 1).replace(/;\s*$/, ''));

const tmp = mkdtempSync(join(homedir(), '.xyb-cervical-test-'));
after(() => { try { rmSync(tmp, { recursive: true, force: true }); } catch { /* 清理失败不影响结果 */ } });

test('① migrate 幂等：第二次执行不重跑已应用的迁移', () => {
  const db = openDatabase(':memory:');
  const first = migrate(db);
  const second = migrate(db);
  assert.deepEqual(first.executed, ['0001_initial.sql', '0002_profile_meta.sql'], '首次应执行 0001 + 0002');
  assert.deepEqual(second.executed, [], '第二次不应重跑');
  assert.equal(second.applied.length, 2);
  close(db);
});

test('② seedDemo 幂等：调两次只写一份档案', () => {
  const db = openDatabase(':memory:');
  migrate(db);
  const a = seedDemo(db);
  const b = seedDemo(db);
  assert.equal(a.skipped, false);
  assert.equal(a.subjects, 2);
  assert.equal(b.skipped, true, '第二次应整批跳过');
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM subjects').get().n, 2);
  close(db);
});

test('③ parity：库里读出的 profiles 与 demo-data.js 逐字段一致（含私密原文）', () => {
  const db = openDatabase(':memory:');
  migrate(db);
  seedDemo(db);
  for (const key of ['A', 'B']) {
    assert.deepStrictEqual(getProfile(db, key, { includePrivate: true }), DEMO.profiles[key],
      `profiles.${key} 与 demo-data.js 不一致`);
  }
  const payload = bootstrap(db, { version: '0.1.0', build: 'test' });
  assert.equal(payload.trials.length, DEMO.trials.length);
  assert.deepStrictEqual(payload.trials, DEMO.trials);
  assert.equal(payload.version, '0.1.0');
  close(db);
});

test('④ 读模型形状：指标点按 ord 排序、数值是数字、分类值是原文', () => {
  const db = openDatabase(':memory:');
  migrate(db);
  seedDemo(db);
  const p = getProfile(db, 'A');
  const scc = p.metrics.find((m) => m.key === 'scc');
  assert.ok(scc.points.length >= 4);
  assert.equal(typeof scc.points[0].v, 'number', '数值指标读出来必须是数字');
  const dates = scc.points.map((pt) => pt.d);
  assert.deepEqual(dates, [...dates].sort(), '指标点必须按采样日期升序');
  const spanDays = (new Date(dates.at(-1)) - new Date(dates[0])) / 86400000;
  assert.ok(spanDays >= 150, `SCC-Ag 序列应覆盖 >=150 天（7 个月演示窗口），实际 ${Math.round(spanDays)} 天`);
  const grade = p.metrics.find((m) => m.kind === 'grade');
  assert.ok(grade, '至少要有一个分类指标（阴道狭窄/淋巴水肿）');
  assert.equal(typeof grade.points[0].v, 'string', '分类指标读出来是原文本');
  assert.equal('unit' in grade, false, '分类指标不许补 unit:null');
  assert.equal('kind' in scc, false, '数值指标不输出 kind 键（与原型同形）');
  close(db);
});

test('⑤ 文件库：真实落盘 + 重开后资料仍在（播种只发生一次）', () => {
  // sqlite 不会替你建父目录：目录得先存在（真实启动流程里由 Workbench.open 负责）
  mkdirSync(join(tmp, 'nested'), { recursive: true });
  const file = join(tmp, 'nested', 'xyb-cervical.sqlite');
  const db1 = openDatabase(file);
  migrate(db1);
  seedDemo(db1);
  close(db1);
  const db2 = openDatabase(file);
  migrate(db2);
  assert.equal(hasDemoData(db2), true, '重开后档案还在');
  assert.equal(seedDemo(db2).skipped, true, '重开后不应再播种一遍');
  close(db2);
});

test('⑥ 口径 D：私密分节默认整节 null，includePrivate 才给原文', () => {
  const db = openDatabase(':memory:');
  migrate(db);
  seedDemo(db);
  const closed = getProfile(db, 'A');
  for (const key of PRIVATE_SECTIONS) {
    assert.equal(closed[key], null, `${key} 默认必须是 null（不是空 rows）`);
  }
  const opened = getProfile(db, 'A', { includePrivate: true });
  assert.ok(opened.vagina && opened.vagina.rows.length, '显式要原文时才给阴道扩张记录');
  assert.ok(opened.sexual && opened.sexual.rows.length, '显式要原文时才给性健康记录');
  close(db);
});

test('⑦ 分节标题：18 个 key 都有读法，且 section_titles 的 ord 决定顺序', () => {
  const db = openDatabase(':memory:');
  migrate(db);
  seedDemo(db);
  /* 每个 key 要么在 sectionRows 里有读法、要么是 pathology（单独拼）——写错 key 会静默 null */
  const p = getProfile(db, 'A', { includePrivate: true });
  for (const key of SECTION_KEYS) {
    if (key === 'pathology') { assert.ok(p.pathology, 'pathology 必须有专门分支'); continue; }
    if (PRIVATE_SECTIONS.has(key)) continue;
    assert.ok(p[key] === null || (p[key] && Array.isArray(p[key].rows)), `分节 ${key} 读出来的形状不对`);
  }
  const titles = db.prepare('SELECT key, ord FROM section_titles WHERE profile_key = ? ORDER BY ord').all('A').map((r) => r.key);
  assert.deepEqual(titles, SECTION_KEYS.filter((k) => p[k] !== null), 'section_titles 的 ord 顺序必须与 SECTION_KEYS 一致');
  assert.deepEqual(listSubjects(db).map((s) => s.profile_key), ['A', 'B']);
  close(db);
});

test('⑧ profile_meta：病理结论状态来自 0002 表，不是 subjects 列', () => {
  const db = openDatabase(':memory:');
  migrate(db);
  seedDemo(db);
  const p = getProfile(db, 'A');
  assert.match(p.pathology.status, /已出/, '病理结论状态要读 profile_meta.pathology_status');
  const cols = db.prepare('PRAGMA table_info(subjects)').all().map((c) => c.name);
  assert.equal(cols.includes('pathology_status'), false, 'subjects 上不许有 pathology_status 列（0001 已冻结）');
  close(db);
});
