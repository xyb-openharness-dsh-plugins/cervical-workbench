/* 导入与导出：只抄不推测 / 候选不入库 / 私密不出门。
 *
 * 这里的 MinerU 客户端是**假的**（注入 extract 或直接调纯函数），所以测试不联网。
 * 真链路的验证在 test/server.test.mjs ⑦（喂伪造 PDF，只验失败要说清原因）。
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { extractLabCandidates, guessReportDate, ImportService } from '../dsh/import.js';
import { renderPrepMarkdown, exportFilename } from '../dsh/export.js';
import { openDatabase, migrate, close } from '../dsh/store.js';
import { seedDemo } from '../dsh/demo.js';
import { getProfile } from '../dsh/readmodels.js';

const MD = `
# 检验报告

| 项目 | 结果 | 单位 | 参考范围 |
| --- | --- | --- | --- |
| SCC-Ag | 1.6 | ng/mL | 0–1.5 |
| 血红蛋白 | 118 | g/L | 115–150 |
| 白细胞 | 3.2 | 10^9/L | 3.5–9.5 |
| 中性粒细胞绝对值 | <0.5 | 10^9/L | 1.8–6.3 |
| CEA | 1.2–3.4 | ng/mL | 0–5 |
| 血钾 | 4.1 | mmol/L | 3.5–5.3 |
| 备注 | 采血时间 08:10 | | |
`;

test('① 抽取：只抄单值，参考范围/两数一格整行放弃', () => {
  const { candidates, skipped } = extractLabCandidates(MD);
  const byName = Object.fromEntries(candidates.map((c) => [c.name, c]));
  assert.equal(byName['SCC-Ag'].value, 1.6);
  assert.equal(byName['SCC-Ag'].key, 'scc');
  assert.equal(byName['血红蛋白'].value, 118);
  assert.equal(byName['白细胞'].value, 3.2);
  assert.equal(byName['血钾'].value, 4.1);
  assert.equal(byName['CEA'], undefined, '两数一格（1.2–3.4）不许当结果值');
  assert.ok(skipped.some((s) => s.name === 'CEA'), '放弃的行要能说清为什么');
});

test('② `<0.5` 留原文：value 是字符串，不四舍五入成 0', () => {
  const { candidates } = extractLabCandidates(MD);
  const anc = candidates.find((c) => c.key === 'anc');
  assert.equal(anc.value, '<0.5');
  assert.equal(typeof anc.value, 'string');
});

test('③ HTML 表格也能读，且 `&lt;0.5` 要还原成 `<0.5`（MinerU 会给实体）', () => {
  const html = `<table><tr><td>项目</td><td>结果</td><td>单位</td></tr>
    <tr><td>中性粒细胞绝对值</td><td>&lt;0.5</td><td>10^9/L</td></tr></table>`;
  const anc = extractLabCandidates(html).candidates.find((c) => c.key === 'anc');
  assert.equal(anc.value, '<0.5', '实体不解码会被当成文字整行丢掉');
});

test('③b HTML 表格也能读（MinerU 两种都给）', () => {
  const html = `<table><tr><th>项目</th><th>结果</th><th>单位</th></tr>
    <tr><td>ALT</td><td>28</td><td>U/L</td></tr></table>`;
  const { candidates } = extractLabCandidates(html);
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].key, 'alt');
  assert.equal(candidates[0].value, 28);
});

test('④ 报告日期：取不到就是 null，不拿今天顶替', () => {
  assert.equal(guessReportDate('血生化报告 2026-10-08.pdf'), '2026-10-08');
  assert.equal(guessReportDate('2026年3月8日 复查'), '2026-03-08');
  assert.equal(guessReportDate('没有日期的文件'), null);
});

test('⑤ 落库：只写 documents + candidate_fields，不碰 metrics / metric_points', () => {
  const db = openDatabase(':memory:');
  migrate(db);
  seedDemo(db);
  const before = {
    metrics: db.prepare('SELECT COUNT(*) AS n FROM metrics').get().n,
    points: db.prepare('SELECT COUNT(*) AS n FROM metric_points').get().n,
  };
  const service = new ImportService(db, { client: null, extract: extractLabCandidates });
  const { candidates } = extractLabCandidates(MD);
  const out = service.record({
    profileKey: 'A',
    document: { name: '血生化报告 2026-10-08.pdf', date: '2026-10-08', type: '检验报告', status: '已解析' },
    candidates,
  });
  assert.ok(out.documentId.startsWith('A-D'), '文档 id 要接着档案编号往下排');
  assert.equal(out.candidates, candidates.length);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM candidate_fields WHERE profile_key = ?').get('A').n, 3 + candidates.length);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM metrics').get().n, before.metrics, '解析不许改动指标表');
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM metric_points').get().n, before.points, '解析不许写数据点');
  const pending = db.prepare("SELECT COUNT(*) AS n FROM candidate_fields WHERE profile_key = 'A' AND status = '待确认'").get().n;
  assert.ok(pending >= candidates.length, '新候选一律是「待确认」，不是「已接受」');
  close(db);
});

test('⑥ 接受候选：只改状态（接受 ≠ 医学审核，无 reviewed_by 可写）', () => {
  const db = openDatabase(':memory:');
  migrate(db);
  seedDemo(db);
  const service = new ImportService(db, { client: null });
  const id = db.prepare("SELECT id FROM candidate_fields WHERE profile_key = 'A' LIMIT 1").get().id;
  const r = service.accept('A', id);
  assert.equal(r.changed, 1);
  assert.equal(db.prepare('SELECT status FROM candidate_fields WHERE profile_key = ? AND id = ?').get('A', id).status, '已接受');
  close(db);
});

test('⑦ 导出：私密分节不进导出，看法区带"不是结论"抬头', () => {
  const db = openDatabase(':memory:');
  migrate(db);
  seedDemo(db);
  const p = getProfile(db, 'A');   // 默认不含私密原文
  const md = renderPrepMarkdown(p, { version: '0.1.0', excludedPrivate: true });
  assert.match(md, /^# 复诊准备 · 何秀云/m);
  assert.match(md, /分期（医生告知）：IIIC1r/);
  assert.match(md, /不是医生结论/);
  assert.equal(/性交痛|干涩/.test(md), false, '私密原文不许出现');
  assert.equal(/建议治疗|可能复发|可以停药|无需就医/.test(md), false, '越界词一个都不许有');
  assert.match(md, /外照射|后装/, '放疗要分列写出来');
  /* 节标题本身写着"不合成总剂量"，所以只禁"总剂量：xx Gy"这种合成值，不禁这六个字。 */
  assert.equal(/总剂量[:：]\s*\d/.test(md), false, '不许合成一个总剂量（口径 B）');
  assert.match(md, /后装/, '后装要单独一行/一列');
  close(db);
});

test('⑧ 导出文件名：去掉路径分隔符，带日期', () => {
  assert.equal(exportFilename({ name: '何秀云' }, new Date('2026-10-21T00:00:00Z')), '复诊准备-何秀云-2026-10-21.md');
  assert.equal(exportFilename({ name: 'a/b:c' }, new Date('2026-10-21T00:00:00Z')), '复诊准备-abc-2026-10-21.md');
});

/* ---- 最近几次的变化：用户要的是"发生了什么"，不是再列一遍数字 ---- */

test('⑨ 变化段：分级改变与趋势要浮到前面，日常小波动不单列', () => {
  const db = openDatabase(':memory:');
  migrate(db);
  seedDemo(db);
  const md = renderPrepMarkdown(getProfile(db, 'A'), { excludedPrivate: true });
  const block = md.slice(md.indexOf('## 最近几次的变化'), md.indexOf('## 最近一次记录'));
  assert.ok(block.length > 0, '导出里必须有「最近几次的变化」一节');
  /* 分级/描述改变：潮热从"偶有"走到"每天 4–5 次"，这是最该被看见的一条。 */
  assert.match(block, /潮热频次：06-25 偶有 → 08-10 每天 2–3 次 → 10-02 每天 4–5 次/);
  assert.match(block, /下肢淋巴水肿：06-18 0 期 → 08-06 Ⅰ期/);
  /* 数值：SCC-Ag 连续下降 + 白蛋白在参考区间外 → 要进"值得先看"。 */
  assert.match(block, /SCC-Ag（ng\/mL） \| 06-18 2\.4 → 08-06 1\.9 → 10-08 1\.6/);
  assert.match(block, /白蛋白（g\/L）[\s\S]*参考区间外/);
  /* 白细胞 +9%、血红蛋白 +4 这类不该单列，只在"其余"里出现。 */
  assert.equal(/^\| 白细胞（/m.test(block), false, '白细胞日常回升不该单列成表行');
  assert.match(block, /其余 \d+ 项（[^）]*白细胞/);
  close(db);
});

test('⑩ 变化段：不写判断词（变差 / 加重 / 提示注意 一律不许出现）', () => {
  const db = openDatabase(':memory:');
  migrate(db);
  seedDemo(db);
  const md = renderPrepMarkdown(getProfile(db, 'A'));
  /* 只查变化段：别的节里有医生原话（"后装期间腹泻加重"），那是照抄，不算我们的判断。 */
  const block = md.slice(md.indexOf('## 最近几次的变化'), md.indexOf('## 最近一次记录'));
  assert.equal(/变差|加重|恶化|提示注意|需要关注|不乐观|偏高|偏低|异常/.test(block), false);
  assert.match(block, /谁需要处理由医生判断/);
  close(db);
});

test('⑪ 变化段：只有 1 条记录的指标明说"无法比较"，不硬比', () => {
  const p = {
    name: '测试', metrics: [
      { name: '血红蛋白', unit: 'g/L', band: [115, 150], points: [{ d: '2026-10-01', v: 118 }] },
    ],
  };
  const md = renderPrepMarkdown(p);
  const block = md.slice(md.indexOf('## 最近几次的变化'), md.indexOf('## 最近一次记录'));
  assert.match(block, /没有命中上述规则的变化/);
  assert.match(block, /只有 1 次记录、无法比较的：血红蛋白/);
});

test('⑫ 变化段：跨出参考区间要标出来，并照抄区间（不自己设范围）', () => {
  const p = {
    name: '测试', metrics: [
      { name: '血红蛋白', unit: 'g/L', band: [115, 150], points: [{ d: '2026-09-01', v: 119 }, { d: '2026-10-01', v: 108 }] },
      { name: '肌酐', unit: 'μmol/L', band: [41, 81], points: [{ d: '2026-09-01', v: 60 }, { d: '2026-10-01', v: 61 }] },
    ],
  };
  const md = renderPrepMarkdown(p);
  const block = md.slice(md.indexOf('## 最近几次的变化'), md.indexOf('## 最近一次记录'));
  assert.match(block, /本次越出参考区间/);
  assert.match(block, /血红蛋白 参考区间 115–150 g\/L/);
  assert.equal(/肌酐/.test(block.split('其余')[0]), false, '没变化的指标不进表');
  assert.match(block, /其余 1 项（肌酐）/);
});
