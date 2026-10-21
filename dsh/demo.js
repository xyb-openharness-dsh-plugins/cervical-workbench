/* 演示数据播种（宫颈癌）。
 *
 * 唯一数据源是 `demo/build-demo-data.mjs` 的 `buildDemoProfiles()`（两个产物 prototypes/v0.2/demo-data.js
 * 与 demo/demo-data.sqlite 也从它生成）。这里只是把同一份纯数据写进**用户资料目录里那个库**，
 * 不新增、不改写任何数值——演示数据一旦在这里多出一条，原型与开发版就会各说一套
 * （这是 `test/store.test.mjs` 里 deepStrictEqual parity 断言存在的原因）。
 *
 * 幂等：库里已经有 subjects 就整批跳过（开发版启动时可能跑很多次，不能每次都复制一份档案）。
 * 事务：整批在一个事务里，中途失败整体回滚，不留"半个档案"。
 *
 * 与食管癌 seedDemo 的结构差异（别照抄）：
 * - 食管癌把分节标题写成 subjects 上的 *_title 列；**宫颈癌的分节标题在 section_titles 表**里
 *   （18 个分节，key + title + ord）。这是本项目对家族的偏离，理由是"少一节不加列、多一节不改表"。
 * - 病理结论状态（"已出（2026-03-18 活检）"）这种"一档案一个值"的零散标量在 `profile_meta`
 *   （schema/0002），不在 subjects 上。
 * - 多了宫颈癌专属的 stage_rows / rt_rows / late_effect_rows / lymphedema_rows / vagina_rows /
 *   menopause_rows / fertility_rows / fert_surgery_rows / ovary_rows / sexual_rows / cytology_rows / hpv_rows。
 *
 * 两个字段口径（H6 的教训，别图省事）：
 * 1. 所有 INSERT 写显式列名 + 显式问号数，不用位置式 VALUES；
 * 2. events / docs / candidates / cycles / 各分节 rows 在 demo-data 里是**定长数组**，
 *    这里按下标取，不要写 d.id / e.date（那是别的癌种的对象形状）。
 */

import { buildDemoProfiles } from '../demo/build-demo-data.mjs';

const j = (v) => (v === undefined ? null : JSON.stringify(v));
const flag = (v) => (v ? 1 : 0);

/** 分节 key：与 demo/build-demo-data.mjs 的 SECTION_KEYS、dsh/readmodels.js 的同名常量三处一致。 */
const SECTION_KEYS = [
  'figo', 'pathology', 'pathway', 'surgery', 'rt', 'lateEffects', 'lymphedema',
  'vagina', 'menopause', 'fertility', 'fertSurgery', 'ovary', 'sexual', 'cytology',
  'hpv', 'imaging', 'screening', 'nutrition',
];

/** 把 buildDemoProfiles() 的数据写进库。返回写入计数（便于启动日志与测试）。 */
export function seedDemo(db, input) {
  if (!db || typeof db.prepare !== 'function') throw new TypeError('seedDemo 需要一个已打开的数据库');
  const data = input || buildDemoProfiles();

  const already = db.prepare('SELECT COUNT(*) AS n FROM subjects').get().n;
  if (already > 0) return { skipped: true, subjects: 0, metrics: 0, points: 0, trials: 0 };

  const counts = { skipped: false, subjects: 0, metrics: 0, points: 0, trials: 0 };

  db.exec('BEGIN');
  try {
    /* 列名顺序与 schema/0001_initial.sql 一致；按位置写会因为列数不匹配直接报错（这是想要的）。 */
    const insSubject = db.prepare(`INSERT INTO subjects
      (profile_key, name, sex, age, meta, headline, stage, mindset, histology, hpv_status,
       dash_keys, path, activity, family_talk)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
    const insSectionTitle = db.prepare('INSERT INTO section_titles (profile_key, key, title, ord) VALUES (?,?,?,?)');
    const insProfileMeta = db.prepare('INSERT INTO profile_meta (profile_key, k, v) VALUES (?,?,?)');
    const insMetric = db.prepare(`INSERT INTO metrics
      (profile_key, key, name, unit, cat, color, dec, kind, band_low, band_high, note)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)`);
    const insPoint = db.prepare('INSERT INTO metric_points (profile_key, metric_key, d, v_num, v_text, src, ord) VALUES (?,?,?,?,?,?,?)');
    const insMolecular = db.prepare('INSERT INTO molecular (profile_key, k, v, src, state, note, ord) VALUES (?,?,?,?,?,?,?)');
    const insEvent = db.prepare('INSERT INTO events (profile_key, d, label) VALUES (?,?,?)');
    const insRhythm = db.prepare('INSERT INTO rhythm (profile_key, item, freq, guideline, next, ord) VALUES (?,?,?,?,?,?)');
    const insCycle = db.prepare('INSERT INTO cycles (profile_key, name, date, drugs, status, done, ord) VALUES (?,?,?,?,?,?,?)');
    const insLine = db.prepare('INSERT INTO treatment_lines (profile_key, name, detail, done, ord) VALUES (?,?,?,?,?)');
    const insStage = db.prepare('INSERT INTO stage_rows (profile_key, item, value, note, ord) VALUES (?,?,?,?,?)');
    const insPathology = db.prepare('INSERT INTO pathology_rows (profile_key, kind, a, b, ord) VALUES (?,?,?,?,?)');
    const insPathway = db.prepare('INSERT INTO pathway_rows (profile_key, phase, name, window, detail, note, ord) VALUES (?,?,?,?,?,?,?)');
    const insSurgery = db.prepare(`INSERT INTO surgery_rows
      (profile_key, d, procedure, scope, lymph, margins, institution, note, ord) VALUES (?,?,?,?,?,?,?,?,?)`);
    const insRt = db.prepare(`INSERT INTO rt_rows
      (profile_key, mode, start, end, dose, fractions, detail, note, ord) VALUES (?,?,?,?,?,?,?,?,?)`);
    const insLateEffect = db.prepare('INSERT INTO late_effect_rows (profile_key, d, system, grade_text, detail, ord) VALUES (?,?,?,?,?,?)');
    const insLymphedema = db.prepare('INSERT INTO lymphedema_rows (profile_key, d, site, stage_text, measure, note, ord) VALUES (?,?,?,?,?,?,?)');
    const insVagina = db.prepare('INSERT INTO vagina_rows (profile_key, d, item, detail, doctor_text, is_private, ord) VALUES (?,?,?,?,?,?,?)');
    const insMenopause = db.prepare('INSERT INTO menopause_rows (profile_key, d, symptom, severity_text, note, ord) VALUES (?,?,?,?,?,?)');
    const insHormone = db.prepare('INSERT INTO hormone_rows (profile_key, item, order_text, start, end, source, ord) VALUES (?,?,?,?,?,?,?)');
    const insFertility = db.prepare('INSERT INTO fertility_rows (profile_key, item, value, note, ord) VALUES (?,?,?,?,?)');
    const insFertSurgery = db.prepare('INSERT INTO fert_surgery_rows (profile_key, d, procedure, doctor_text, followup_req, ord) VALUES (?,?,?,?,?,?)');
    const insOvary = db.prepare('INSERT INTO ovary_rows (profile_key, d, item, value, note, ord) VALUES (?,?,?,?,?,?)');
    const insSexual = db.prepare('INSERT INTO sexual_rows (profile_key, d, item, detail, is_private, ord) VALUES (?,?,?,?,?,?)');
    const insCytology = db.prepare('INSERT INTO cytology_rows (profile_key, d, method, result_text, note, ord) VALUES (?,?,?,?,?,?)');
    const insHpv = db.prepare('INSERT INTO hpv_rows (profile_key, d, method, result_text, note, ord) VALUES (?,?,?,?,?,?)');
    const insImaging = db.prepare('INSERT INTO imaging_rows (profile_key, d, kind, finding, next, note, ord) VALUES (?,?,?,?,?,?,?)');
    const insScreening = db.prepare('INSERT INTO screening_rows (profile_key, kind, item, value, note, ord) VALUES (?,?,?,?,?,?)');
    const insNutrition = db.prepare('INSERT INTO nutrition_rows (profile_key, d, slot, amount, foods, symptoms, note, ord) VALUES (?,?,?,?,?,?,?,?)');
    const insSupplement = db.prepare('INSERT INTO supplement_rows (profile_key, item, order_text, start, end, source, ord) VALUES (?,?,?,?,?,?,?)');
    const insView = db.prepare('INSERT INTO viewpoints (profile_key, d, mood, text, ord) VALUES (?,?,?,?,?)');
    const insTrial = db.prepare('INSERT OR IGNORE INTO trials (nct_id, title, phase, status, sponsor, url, topic, last_verified) VALUES (?,?,?,?,?,?,?,?)');
    const insDoc = db.prepare('INSERT INTO documents (profile_key, id, name, date, type, status, ord) VALUES (?,?,?,?,?,?,?)');
    const insCand = db.prepare('INSERT INTO candidate_fields (profile_key, id, name, value, source, status, ord) VALUES (?,?,?,?,?,?,?)');
    const insMeta = db.prepare('INSERT OR IGNORE INTO demo_meta (k, v) VALUES (?,?)');

    for (const [key, p] of Object.entries(data.profiles)) {
      insSubject.run(key, p.name, p.sex, p.age, p.meta, p.headline, p.stage, p.mindset,
        p.histology ?? null, p.hpv_status ?? null,
        j(p.dash_keys), j(p.path), p.activity ?? null, p.familyTalk ?? null);
      counts.subjects++;

      /* ord 用 SECTION_KEYS 的下标：决定同一页里分节的先后，必须是稳定值不是插入顺序。 */
      SECTION_KEYS.forEach((k, i) => {
        if (p[k] && p[k].title) insSectionTitle.run(key, k, p[k].title, i);
      });
      /* 病理结论状态：section_titles 里放不下（它是"一档案一个值"），走 profile_meta。 */
      if (p.pathology) insProfileMeta.run(key, 'pathology_status', p.pathology.status ?? null);

      for (const m of p.metrics) {
        insMetric.run(key, m.key, m.name, m.unit ?? null, m.cat ?? null, m.color ?? null,
          m.dec ?? null, m.dec === null ? (m.kind || 'qual') : 'numeric',
          m.band ? m.band[0] : null, m.band ? m.band[1] : null, m.note ?? null);
        counts.metrics++;
        for (const [pi, pt] of (m.points || []).entries()) {
          const num = typeof pt.v === 'number' ? pt.v : null;
          const txt = typeof pt.v === 'number' ? null : (pt.v === undefined ? null : String(pt.v));
          insPoint.run(key, m.key, pt.d, num, txt, pt.src ?? null, pi);
          counts.points++;
        }
      }

      (p.molecular || []).forEach((r, i) => insMolecular.run(key, r.k, r.v, r.src ?? null, r.state ?? null, r.note ?? null, i));
      (p.events || []).forEach((e) => insEvent.run(key, e[0], e[1]));
      (p.rhythm || []).forEach((r, i) => insRhythm.run(key, r[0], r[1], r[2], r[3], i));
      (p.cycles || []).forEach((c, i) => insCycle.run(key, c[0], c[1], c[2], c[3], flag(c[4]), i));
      (p.lines || []).forEach((l, i) => insLine.run(key, l.name, l.detail, flag(l.done), i));
      if (p.figo) p.figo.rows.forEach((r, i) => insStage.run(key, r[0], r[1], r[2] ?? null, i));
      if (p.pathology) {
        (p.pathology.rows || []).forEach((r, i) => insPathology.run(key, 'row', r[0], r[1], i));
        (p.pathology.gaps || []).forEach((r, i) => insPathology.run(key, 'gap', r[0], r[1], i));
      }
      if (p.pathway) p.pathway.rows.forEach((r, i) => insPathway.run(key, r[0], r[1], r[2], r[3], r[4], i));
      if (p.surgery) p.surgery.rows.forEach((r, i) => insSurgery.run(key, r[0], r[1], r[2], r[3], r[4], r[5], r[6], i));
      if (p.rt) p.rt.rows.forEach((r, i) => insRt.run(key, r[0], r[1], r[2], r[3], r[4], r[5], r[6], i));
      if (p.lateEffects) p.lateEffects.rows.forEach((r, i) => insLateEffect.run(key, r[0], r[1], r[2] ?? null, r[3], i));
      if (p.lymphedema) p.lymphedema.rows.forEach((r, i) => insLymphedema.run(key, r[0], r[1], r[2] ?? null, r[3], r[4] ?? null, i));
      /* 私密分节：is_private 默认 1，但数据里显式给了值就按数据（口径 D 的开关只在读模型） */
      if (p.vagina) p.vagina.rows.forEach((r, i) => insVagina.run(key, r[0], r[1], r[2], r[3] ?? null, flag(r[4]), i));
      if (p.menopause) p.menopause.rows.forEach((r, i) => insMenopause.run(key, r[0], r[1], r[2] ?? null, r[3] ?? null, i));
      (p.hormone || []).forEach((r, i) => insHormone.run(key, r[0], r[1], r[2], r[3] ?? null, r[4], i));
      if (p.fertility) p.fertility.rows.forEach((r, i) => insFertility.run(key, r[0], r[1], r[2] ?? null, i));
      if (p.fertSurgery) p.fertSurgery.rows.forEach((r, i) => insFertSurgery.run(key, r[0], r[1], r[2], r[3] ?? null, i));
      if (p.ovary) p.ovary.rows.forEach((r, i) => insOvary.run(key, r[0], r[1], r[2], r[3] ?? null, i));
      if (p.sexual) p.sexual.rows.forEach((r, i) => insSexual.run(key, r[0], r[1], r[2], flag(r[3]), i));
      if (p.cytology) p.cytology.rows.forEach((r, i) => insCytology.run(key, r[0], r[1], r[2], r[3] ?? null, i));
      if (p.hpv) p.hpv.rows.forEach((r, i) => insHpv.run(key, r[0], r[1], r[2], r[3] ?? null, i));
      if (p.imaging) p.imaging.rows.forEach((r, i) => insImaging.run(key, r[0], r[1], r[2], r[3] ?? null, r[4] ?? null, i));
      if (p.screening) p.screening.rows.forEach((r, i) => insScreening.run(key, r[0], r[1], r[2], r[3] ?? null, i));
      if (p.nutrition) p.nutrition.rows.forEach((r, i) => insNutrition.run(key, r[0], r[1], r[2], r[3], r[4] ?? null, r[5] ?? null, i));
      (p.supplements || []).forEach((r, i) => insSupplement.run(key, r[0], r[1], r[2], r[3] ?? null, r[4], i));
      (p.viewpoints || []).forEach((v, i) => insView.run(key, v[0], v[1], v[2], i));
      (p.docs || []).forEach((d, i) => insDoc.run(key, d[0], d[1], d[2], d[3], d[4], i));
      (p.candidates || []).forEach((c, i) => insCand.run(key, c[0], c[1], c[2], c[3], c[4], i));
    }

    for (const t of data.trials || []) {
      const r = insTrial.run(t.id, t.title, t.phase, t.status, t.sponsor, t.url ?? null, t.topic ?? null, t.last_verified ?? null);
      if (r && r.changes) counts.trials++;
    }
    for (const [k, v] of data.meta || []) insMeta.run(k, v);

    db.exec('COMMIT');
  } catch (error) {
    try { db.exec('ROLLBACK'); } catch { /* 回滚失败也要把原始错误抛出去 */ }
    throw new Error(`播种演示数据失败（已回滚）：${error.message}`);
  }
  return counts;
}

/** 库的演示档案是否已播种过。启动流程用它决定要不要 seedDemo。 */
export function hasDemoData(db) {
  try {
    return db.prepare('SELECT COUNT(*) AS n FROM subjects').get().n > 0;
  } catch {
    return false;
  }
}
