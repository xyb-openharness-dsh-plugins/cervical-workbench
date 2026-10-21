/* 读模型（宫颈癌）：把库里的行还原成**前端要的形状**。
 *
 * 契约：`GET /api/bootstrap` 的 profiles 必须与 prototypes/v0.2/demo-data.js 里的同名档案
 * 逐字段一致（test/demo-parity.test.mjs 与 test/store.test.mjs 都是 deepStrictEqual）。
 * 所以这里不做任何"顺手优化"：字段名、数组层级、null 与缺失的语义都跟着 demo-data.js 走。
 *
 * 五条容易踩的：
 * 1. 数值指标点用 v_num，分类/文字用 v_text；读出来统一还原成 `v`（数字就是数字）。
 * 2. 排序：有 ord 的表按 ord；events 没有 ord，按 rowid（＝插入顺序）。复合主键表裸 SELECT
 *    会按索引字母序返回，必须 ORDER BY rowid（metrics / trials 踩过）。
 * 3. kind 列：数值指标写 'numeric'、分类指标写 grade/qual。原型数据里数值指标**没有** kind 键，
 *    所以只在 kind !== 'numeric' 时还原；分类指标也不许补 unit:null。
 * 4. **docs / candidates / events 在 demo-data.js 里是定长数组，不是对象**
 *    （events = [日期, 名称]，docs = [id, 名称, 日期, 类型, 状态]，candidates = [id, 名称, 值, 来源, 状态]）。
 * 5. **本项目的分节标题在 section_titles 表里**（不是 subjects 上的 *_title 列）：
 *    这里一次查出、按 key 分组；某档案没有这一节就没有行 → 返回 null，前端整节不渲染。
 */

import { AGENT_PANE } from '../lib/layout.js';

const jp = (s, fallback = null) => {
  if (s === null || s === undefined) return fallback;
  try { return JSON.parse(s); } catch { return fallback; }
};
/* node:sqlite 返回 null-prototype 行对象，直接 deepStrictEqual 会因原型不同而失败。统一摊平。 */
const rows = (db, sql, ...args) => db.prepare(sql).all(...args).map((r) => ({ ...r }));

/** 所有分节 key：顺序与 demo/build-demo-data.mjs 的 SECTION_KEYS 一致（决定同页内顺序）。 */
export const SECTION_KEYS = [
  'figo', 'pathology', 'pathway', 'surgery', 'rt', 'lateEffects', 'lymphedema',
  'vagina', 'menopause', 'fertility', 'fertSurgery', 'ovary', 'sexual', 'cytology',
  'hpv', 'imaging', 'screening', 'nutrition',
];

/* 私密分节：默认不返回原文（口径 D）。调用方要原文必须显式 includePrivate=true。 */
export const PRIVATE_SECTIONS = new Set(['vagina', 'sexual']);

function readMetrics(db, key) {
  /* 必须 ORDER BY rowid：主键是 (profile_key, key)，裸 SELECT 会按索引字母序返回。 */
  const list = rows(db, 'SELECT * FROM metrics WHERE profile_key = ? ORDER BY rowid', key);
  return list.map((m) => ({
    key: m.key,
    name: m.name,
    ...(m.unit === null ? {} : { unit: m.unit }),
    dec: m.dec ?? null,
    band: m.band_low === null && m.band_high === null ? null : [m.band_low, m.band_high],
    note: m.note ?? null,
    cat: m.cat ?? null,
    color: m.color ?? null,
    ...(m.kind && m.kind !== 'numeric' ? { kind: m.kind } : {}),
    points: rows(db, 'SELECT d, v_num, v_text, src FROM metric_points WHERE profile_key = ? AND metric_key = ? ORDER BY ord, d', key, m.key)
      .map((p) => ({ d: p.d, v: p.v_num === null ? p.v_text : p.v_num, src: p.src ?? null })),
  }));
}

const sectionRows = {
  figo: (db, k) => rows(db, 'SELECT item, value, note FROM stage_rows WHERE profile_key = ? ORDER BY ord', k)
    .map((r) => [r.item, r.value, r.note]),
  pathway: (db, k) => rows(db, 'SELECT phase, name, window, detail, note FROM pathway_rows WHERE profile_key = ? ORDER BY ord', k)
    .map((r) => [r.phase, r.name, r.window, r.detail, r.note]),
  surgery: (db, k) => rows(db, 'SELECT d, procedure, scope, lymph, margins, institution, note FROM surgery_rows WHERE profile_key = ? ORDER BY ord', k)
    .map((r) => [r.d, r.procedure, r.scope, r.lymph, r.margins, r.institution, r.note]),
  rt: (db, k) => rows(db, 'SELECT mode, start, end, dose, fractions, detail, note FROM rt_rows WHERE profile_key = ? ORDER BY ord', k)
    .map((r) => [r.mode, r.start, r.end, r.dose, r.fractions, r.detail, r.note]),
  lateEffects: (db, k) => rows(db, 'SELECT d, system, grade_text, detail FROM late_effect_rows WHERE profile_key = ? ORDER BY ord', k)
    .map((r) => [r.d, r.system, r.grade_text, r.detail]),
  lymphedema: (db, k) => rows(db, 'SELECT d, site, stage_text, measure, note FROM lymphedema_rows WHERE profile_key = ? ORDER BY ord', k)
    .map((r) => [r.d, r.site, r.stage_text, r.measure, r.note]),
  vagina: (db, k) => rows(db, 'SELECT d, item, detail, doctor_text, is_private FROM vagina_rows WHERE profile_key = ? ORDER BY ord', k)
    .map((r) => [r.d, r.item, r.detail, r.doctor_text, r.is_private]),
  menopause: (db, k) => rows(db, 'SELECT d, symptom, severity_text, note FROM menopause_rows WHERE profile_key = ? ORDER BY ord', k)
    .map((r) => [r.d, r.symptom, r.severity_text, r.note]),
  fertility: (db, k) => rows(db, 'SELECT item, value, note FROM fertility_rows WHERE profile_key = ? ORDER BY ord', k)
    .map((r) => [r.item, r.value, r.note]),
  fertSurgery: (db, k) => rows(db, 'SELECT d, procedure, doctor_text, followup_req FROM fert_surgery_rows WHERE profile_key = ? ORDER BY ord', k)
    .map((r) => [r.d, r.procedure, r.doctor_text, r.followup_req]),
  ovary: (db, k) => rows(db, 'SELECT d, item, value, note FROM ovary_rows WHERE profile_key = ? ORDER BY ord', k)
    .map((r) => [r.d, r.item, r.value, r.note]),
  sexual: (db, k) => rows(db, 'SELECT d, item, detail, is_private FROM sexual_rows WHERE profile_key = ? ORDER BY ord', k)
    .map((r) => [r.d, r.item, r.detail, r.is_private]),
  cytology: (db, k) => rows(db, 'SELECT d, method, result_text, note FROM cytology_rows WHERE profile_key = ? ORDER BY ord', k)
    .map((r) => [r.d, r.method, r.result_text, r.note]),
  hpv: (db, k) => rows(db, 'SELECT d, method, result_text, note FROM hpv_rows WHERE profile_key = ? ORDER BY ord', k)
    .map((r) => [r.d, r.method, r.result_text, r.note]),
  imaging: (db, k) => rows(db, 'SELECT d, kind, finding, next, note FROM imaging_rows WHERE profile_key = ? ORDER BY ord', k)
    .map((r) => [r.d, r.kind, r.finding, r.next, r.note]),
  /* 第 4 列 note 在 demo-data 里常常直接省略（本人筛查史多数没有备注），
     所以 note 为 NULL 时**不补 null**：print 出来是 [kind,item,value] 三元素，与原型同形。 */
  screening: (db, k) => rows(db, 'SELECT kind, item, value, note FROM screening_rows WHERE profile_key = ? ORDER BY ord', k)
    .map((r) => (r.note === null ? [r.kind, r.item, r.value] : [r.kind, r.item, r.value, r.note])),
  nutrition: (db, k) => rows(db, 'SELECT d, slot, amount, foods, symptoms, note FROM nutrition_rows WHERE profile_key = ? ORDER BY ord', k)
    .map((r) => [r.d, r.slot, r.amount, r.foods, r.symptoms, r.note]),
};

/**
 * 读一个档案。
 * @param {object} opts
 * @param {boolean} [opts.includePrivate=false] 私密分节是否返回原文（口径 D 默认 false）
 * @param {string|number} [opts.asOf] 只看这个日期之前的记录（导出/草稿用；不传＝全部）
 */
function readProfile(db, key, { includePrivate = false } = {}) {
  const found = db.prepare('SELECT * FROM subjects WHERE profile_key = ?').get(key);
  if (!found) return null;
  const s = { ...found };

  const titles = new Map(
    rows(db, 'SELECT key, title FROM section_titles WHERE profile_key = ? ORDER BY ord', key).map((r) => [r.key, r.title]),
  );

  const profile = {
    name: s.name,
    sex: s.sex,
    age: s.age,
    meta: s.meta,
    headline: s.headline,
    stage: s.stage,
    mindset: s.mindset,
    histology: s.histology,
    hpv_status: s.hpv_status,
    dash_keys: jp(s.dash_keys, []),
    path: jp(s.path, []),
    activity: s.activity ?? null,
    familyTalk: s.family_talk ?? null,
    molecular: rows(db, 'SELECT k, v, src, state, note FROM molecular WHERE profile_key = ? ORDER BY ord', key)
      .map((r) => ({ k: r.k, v: r.v, src: r.src, state: r.state, note: r.note })),
    lines: rows(db, 'SELECT name, detail, done FROM treatment_lines WHERE profile_key = ? ORDER BY ord', key)
      .map((r) => ({ name: r.name, detail: r.detail, done: !!r.done })),
    cycles: rows(db, 'SELECT name, date, drugs, status, done FROM cycles WHERE profile_key = ? ORDER BY ord', key)
      .map((r) => [r.name, r.date, r.drugs, r.status, !!r.done]),
  };

  /* 分节的顺序按 SECTION_KEYS（与生成器一致），标题来自 section_titles。 */
  for (const section of SECTION_KEYS) {
    /* pathology 的形状特殊（多了 status 与 gaps），在下面单独拼；这里跳过。 */
    if (section === 'pathology') continue;
    const title = titles.get(section);
    if (!title) { profile[section] = null; continue; }
    if (PRIVATE_SECTIONS.has(section) && !includePrivate) {
      /* 默认不返回私密原文：整节返回 null，前端显示"本人确认后可见"的闸门，而不是空表。 */
      profile[section] = null;
      continue;
    }
    profile[section] = { title, rows: sectionRows[section](db, key) };
  }

  /* pathology 多一个 status（"已出（日期 活检）"），它不属于 section_titles 也不属于 rows，
     是"一档案一个值"的零散标量 → 在 profile_meta 里（k = 'pathology_status'）。 */
  if (titles.has('pathology')) {
    const meta = new Map(rows(db, 'SELECT k, v FROM profile_meta WHERE profile_key = ?', key).map((r) => [r.k, r.v]));
    profile.pathology = {
      title: titles.get('pathology'),
      status: meta.get('pathology_status') ?? null,
      rows: rows(db, "SELECT a, b FROM pathology_rows WHERE profile_key = ? AND kind = 'row' ORDER BY ord", key).map((r) => [r.a, r.b]),
      gaps: rows(db, "SELECT a, b FROM pathology_rows WHERE profile_key = ? AND kind = 'gap' ORDER BY ord", key).map((r) => [r.a, r.b]),
    };
  }

  /* hormone 是"可能整个没有"的一块（B 未用激素）：空就返回 null，不返回 []，
     否则前端 `p.hormone &&` 这类判断会从"没有"变成"有但是空的"，两处渲染分歧。 */
  const hormoneRows = rows(db, 'SELECT item, order_text, start, end, source FROM hormone_rows WHERE profile_key = ? ORDER BY ord', key)
    .map((r) => [r.item, r.order_text, r.start, r.end, r.source]);
  profile.hormone = hormoneRows.length ? hormoneRows : null;
  profile.supplements = rows(db, 'SELECT item, order_text, start, end, source FROM supplement_rows WHERE profile_key = ? ORDER BY ord', key)
    .map((r) => [r.item, r.order_text, r.start, r.end, r.source]);
  profile.rhythm = rows(db, 'SELECT item, freq, guideline, next FROM rhythm WHERE profile_key = ? ORDER BY ord', key)
    .map((r) => [r.item, r.freq, r.guideline, r.next]);
  profile.events = rows(db, 'SELECT d, label FROM events WHERE profile_key = ? ORDER BY rowid', key).map((r) => [r.d, r.label]);
  profile.viewpoints = rows(db, 'SELECT d, mood, text FROM viewpoints WHERE profile_key = ? ORDER BY ord', key).map((r) => [r.d, r.mood, r.text]);
  profile.docs = rows(db, 'SELECT id, name, date, type, status FROM documents WHERE profile_key = ? ORDER BY ord', key)
    .map((r) => [r.id, r.name, r.date, r.type, r.status]);
  profile.candidates = rows(db, 'SELECT id, name, value, source, status FROM candidate_fields WHERE profile_key = ? ORDER BY ord', key)
    .map((r) => [r.id, r.name, r.value, r.source, r.status]);
  profile.metrics = readMetrics(db, key);

  return profile;
}

export function listSubjects(db) {
  return rows(db, 'SELECT profile_key, name, meta FROM subjects ORDER BY profile_key');
}

export function getProfile(db, key, opts = {}) {
  return readProfile(db, key, opts);
}

/** `/api/bootstrap` 的 payload。version/build 由调用方注入（唯一来源 lib/version.js）。 */
export function bootstrap(db, { version, build } = {}) {
  const profiles = {};
  for (const s of listSubjects(db)) profiles[s.profile_key] = readProfile(db, s.profile_key);
  const trials = rows(db, 'SELECT nct_id AS id, title, phase, status, sponsor, topic, last_verified, url FROM trials ORDER BY rowid');
  const meta = {};
  for (const r of rows(db, 'SELECT k, v FROM demo_meta')) meta[r.k] = r.v;
  return {
    version: version ?? null,
    build: build ?? null,
    profiles,
    trials,
    demo_meta: meta,
    /* 宿主未提供原生会话时这里会是 available:false；开发版自带挂载位演示，所以默认 true。 */
    agent: { available: true, mode: 'dev-mount' },
    layout: { agentPane: AGENT_PANE },
  };
}
