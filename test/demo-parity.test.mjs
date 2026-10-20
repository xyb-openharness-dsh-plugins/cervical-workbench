/**
 * demo 数据同源校验（3.1）
 *
 * 为什么要有这个测试：`demo/demo-data.sqlite` 与 `prototypes/v0.2/demo-data.js`
 * 是**同一份数据的两份产物**，一个给 3.2 的接口用，一个给原型用。
 * 食管癌那轮靠人眼比过两次，第三次就漏了一个标题列——标题对不上，
 * 原型里那一节就整块消失，而且不报错。
 *
 * 这里做的是逐项相等断言：分节标题 / 行数 / 指标元数据 / 数据点 / 试验条数。
 * 另外钉住宫颈癌五条口径里最容易被写错的两条（D 私密默认、E SCC-Ag 归属）。
 *
 * 用法：node --disable-warning=ExperimentalWarning --test test/demo-parity.test.mjs
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const DB = join(ROOT, 'demo/demo-data.sqlite');
const JS = join(ROOT, 'prototypes/v0.2/demo-data.js');

/* demo-data.js 是给浏览器用的（挂 window），这里给个假 window 把它取出来。 */
function loadDemoData() {
  const code = readFileSync(JS, 'utf8');
  const sandbox = { window: {} };
  new Function('window', code)(sandbox.window);
  assert.ok(sandbox.window.DEMO_DATA, 'demo-data.js 没有产出 window.DEMO_DATA');
  return sandbox.window.DEMO_DATA;
}

const data = loadDemoData();
const db = new DatabaseSync(DB);
const keys = Object.keys(data.profiles);

test('两个档案的标量字段与 subjects 表一致', () => {
  const rows = db.prepare('SELECT profile_key, name, stage, histology, hpv_status, dash_keys FROM subjects ORDER BY profile_key').all();
  assert.equal(rows.length, keys.length, 'subjects 行数与 demo-data 档案数不一致');
  for (const row of rows) {
    const p = data.profiles[row.profile_key];
    assert.ok(p, `demo-data 里没有档案 ${row.profile_key}`);
    assert.equal(p.name, row.name);
    assert.equal(p.stage, row.stage, 'FIGO 分期必须是标量文字（曾经被分节对象覆盖成 [object Object]）');
    assert.equal(typeof p.stage, 'string');
    assert.equal(p.histology, row.histology);
    assert.equal(p.hpv_status, row.hpv_status);
    assert.deepEqual(p.dash_keys, JSON.parse(row.dash_keys));
  }
});

test('分节标题逐条一致（section_titles 表 vs demo-data 的分节对象）', () => {
  for (const k of keys) {
    const p = data.profiles[k];
    const jsSections = Object.entries(p)
      .filter(([, v]) => v && Array.isArray(v.rows))
      .map(([key, v]) => ({ key, title: v.title, n: v.rows.length }))
      .sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0)); // 与 SQLite 的 BINARY 排序一致（大小写敏感）
    const dbSections = db.prepare('SELECT key, title FROM section_titles WHERE profile_key = ? ORDER BY key').all(k);
    assert.equal(jsSections.length, dbSections.length, `${k} 分节数不一致：js ${jsSections.length} / db ${dbSections.length}`);
    for (let i = 0; i < jsSections.length; i += 1) {
      assert.equal(jsSections[i].key, dbSections[i].key, `${k} 第 ${i + 1} 节 key 不一致`);
      assert.equal(jsSections[i].title, dbSections[i].title, `${k}.${jsSections[i].key} 标题不一致（标题错了这一节在原型里会整块消失）`);
    }
  }
});

test('指标元数据与 metrics 表一致，且分类指标不带 unit', () => {
  for (const k of keys) {
    const p = data.profiles[k];
    const rows = db.prepare('SELECT key, name, unit, cat, color, dec, kind, band_low, band_high FROM metrics WHERE profile_key = ? ORDER BY key').all(k);
    assert.equal(rows.length, p.metrics.length, `${k} 指标数不一致`);
    const byKey = new Map(p.metrics.map((m) => [m.key, m]));
    for (const row of rows) {
      const m = byKey.get(row.key);
      assert.ok(m, `${k} demo-data 缺指标 ${row.key}`);
      assert.equal(m.name, row.name);
      assert.equal(m.cat, row.cat);
      assert.equal(m.dec, row.dec);
      /* 数值指标的 kind 在 js 侧省略（契约：只有非 numeric 才写 kind） */
      assert.equal(m.kind ?? 'numeric', row.kind);
      assert.equal(m.unit ?? null, row.unit, `${k}.${row.key} 单位不一致`);
      const band = row.band_low === null ? null : [row.band_low, row.band_high];
      assert.deepEqual(m.band ?? null, band, `${k}.${row.key} 参考范围不一致`);
      if (row.dec === null) {
        assert.equal(row.unit, null, `${k}.${row.key} 是分类指标，unit 必须是 NULL 而不是空字符串`);
        assert.notEqual(row.kind, 'numeric');
      } else {
        assert.equal(row.kind, 'numeric');
      }
    }
  }
});

test('数据点数量与类型一致，数值/文字互斥', () => {
  for (const k of keys) {
    for (const m of data.profiles[k].metrics) {
      const rows = db.prepare('SELECT v_num, v_text FROM metric_points WHERE profile_key = ? AND metric_key = ? ORDER BY d, ord').all(k, m.key);
      assert.equal(rows.length, m.points.length, `${k}.${m.key} 点数不一致`);
      for (let i = 0; i < rows.length; i += 1) {
        const js = m.points[i].v;
        if (typeof js === 'number') {
          assert.equal(rows[i].v_text, null, `${k}.${m.key} 第 ${i + 1} 点：数值指标不得写 v_text`);
          assert.equal(rows[i].v_num, js);
        } else {
          assert.equal(rows[i].v_num, null, `${k}.${m.key} 第 ${i + 1} 点：分类指标不得写 v_num`);
          assert.equal(rows[i].v_text, js);
        }
      }
    }
  }
});

test('口径 E：SCC-Ag 只属于鳞癌，鳞癌档案不登记 CEA', () => {
  const hist = Object.fromEntries(keys.map((k) => [k, data.profiles[k].histology]));
  const has = (k, key) => data.profiles[k].metrics.some((m) => m.key === key);
  for (const k of keys) {
    if (hist[k] === '鳞癌') {
      assert.ok(has(k, 'scc'), `${k} 是鳞癌，应有 SCC-Ag`);
      assert.ok(!has(k, 'cea'), `${k} 是鳞癌，CEA 不特异，不应登记（口径 E）`);
    } else {
      assert.ok(!has(k, 'scc'), `${k} 不是鳞癌，不应有 SCC-Ag`);
    }
  }
});

test('口径 D：阴道与性健康记录的 is_private 列默认 1', () => {
  for (const table of ['vagina_rows', 'sexual_rows']) {
    const ddl = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?").get(table);
    assert.ok(ddl, `${table} 不存在`);
    assert.match(ddl.sql, /is_private\s+INTEGER[^,]*DEFAULT\s+1/i, `${table}.is_private 必须是 DEFAULT 1（默认私密，不是默认公开）`);
  }
});

test('试验表：条数与 nct_id 一致，都有 topic 与 last_verified', () => {
  const rows = db.prepare('SELECT nct_id, title, topic, last_verified FROM trials ORDER BY nct_id').all();
  assert.equal(rows.length, data.trials.length, 'trials 条数不一致');
  const jsIds = data.trials.map((t) => t.id).sort();
  assert.deepEqual(rows.map((r) => r.nct_id), jsIds);
  for (const row of rows) {
    assert.match(row.nct_id, /^NCT\d{8}$/);
    assert.ok(row.topic, `${row.nct_id} 缺 topic，筛选标签会空`);
    assert.match(row.last_verified, /^\d{4}-\d{2}-\d{2}$/, `${row.nct_id} 缺核对日期`);
  }
});

test('定长数组契约：events / docs / candidates 是数组而不是对象', () => {
  for (const k of keys) {
    const p = data.profiles[k];
    assert.ok(Array.isArray(p.events), `${k}.events 必须是 [日期, 名称] 定长数组`);
    assert.ok(p.events.every((e) => Array.isArray(e) && e.length === 2));
    assert.ok(Array.isArray(p.docs), `${k}.docs 必须是定长数组`);
    assert.ok(p.docs.every((d) => Array.isArray(d) && d.length === 5), `${k}.docs 每行必须 5 个值 [id, 名称, 日期, 类型, 状态]`);
    assert.ok(Array.isArray(p.candidates));
    assert.ok(p.candidates.every((c) => Array.isArray(c) && c.length === 5), `${k}.candidates 每行必须 5 个值`);
  }
});

test('演示档案的路径与分期来自医生，不是工作台自算', () => {
  for (const k of keys) {
    const p = data.profiles[k];
    assert.ok(p.figo && p.figo.rows.length, `${k} 缺 FIGO 分节`);
    const items = p.figo.rows.map((r) => r[0]);
    assert.ok(items.includes('分期'), `${k} FIGO 分节里必须有「分期」一行`);
    assert.ok(items.includes('分期体系'), `${k} 必须记录用的是哪一版分期（FIGO 2018）`);
    assert.ok(items.some((x) => x.includes('依据')), `${k} 必须记录分期依据`);
  }
});

test('放疗疗程：外照射与后装分列，不出现合成总剂量', () => {
  const cols = db.prepare('PRAGMA table_info(rt_rows)').all().map((c) => c.name);
  assert.ok(cols.includes('mode'), 'rt_rows.mode 承载 EBRT / 后装');
  assert.ok(!cols.some((c) => /total/i.test(c)), 'rt_rows 不得有 total_* 列（口径 B：不合成总剂量）');
  for (const k of keys) {
    const p = data.profiles[k];
    if (!p.rt) continue;
    for (const r of p.rt.rows) {
      assert.ok(['EBRT', '后装'].includes(r[0]) || /后装|外照射/.test(r[0]), `${k} 放疗行 mode 不认识：${r[0]}`);
    }
  }
});

test('细胞学与 HPV 只存原文，没有正常/异常枚举列（口径 C）', () => {
  for (const table of ['cytology_rows', 'hpv_rows']) {
    const cols = db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);
    assert.ok(cols.includes('result_text'), `${table} 必须有 result_text`);
    assert.ok(!cols.some((c) => /is_normal|is_abnormal|flag/i.test(c)), `${table} 不得有正常/异常枚举列`);
  }
});

test('分类指标的档位顺序在原型里显式声明，且覆盖数据里出现的全部取值', () => {
  /* 按出现顺序排会让图说谎（"轻度"排在"0 级"上面）。档位表写在 prototypes/v0.2/app.js，
     这里把它抠出来，逐个分类指标核对：档位必须声明、且包含数据里出现过的每个值。 */
  const src = readFileSync(join(ROOT, 'prototypes/v0.2/app.js'), 'utf8');
  const m = src.match(/const QUAL_LEVELS = \{([\s\S]*?)\n\};/);
  assert.ok(m, 'app.js 里找不到 QUAL_LEVELS');
  const levels = {};
  for (const line of m[1].split('\n')) {
    const hit = line.match(/^\s*(\w+):\s*\[(.*)\],?\s*$/);
    if (!hit) continue;
    levels[hit[1]] = [...hit[2].matchAll(/'([^']*)'/g)].map((x) => x[1]);
  }
  for (const k of keys) {
    for (const mm of data.profiles[k].metrics) {
      if ((mm.kind ?? 'numeric') === 'numeric') continue;  // js 侧数值指标省略 kind
      const lv = levels[mm.key];
      assert.ok(lv, `${k}.${mm.key} 是分类指标，但 QUAL_LEVELS 没有声明档位顺序`);
      for (const p of mm.points) {
        assert.ok(lv.includes(p.v), `${k}.${mm.key} 的值「${p.v}」不在 QUAL_LEVELS 里，节点会掉到 0 档`);
      }
    }
  }
});
