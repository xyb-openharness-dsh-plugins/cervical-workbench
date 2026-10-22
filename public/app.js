'use strict';
/* 小莲宝 CerviPal v0.1.1 — 交互原型。患者数据全部为模拟；临床试验列表为真实登记摘录（状态未核实）。
   不读写真实文件、不调用模型或宿主 API。视觉体系沿用家族原型（淋巴瘤 v0.1 → 小畅宝 v0.2 → 小咽宝 v0.1），
   品牌色重映射为小莲宝青绿 #18AFA5（docs/DESIGN-SESSION.md D4：青绿 + 白 + 文字标识）。

   与食管癌原型的结构差异（改前先看，两边不许互相抄）：
   1. 一级页 12 个：SPEC §4 的 11 个 + 脚手架要求的「资料库」（records）；
   2. 两个专属一级页并存：「性与生育」「放疗与长期影响」——**不许合并**，
      SPEC 差异自查就是这么定的（其它癌种各一个专属页，宫颈癌两个）；
   3. 一图秀默认是 SCC-Ag + 体重两条数值线 + 阴道狭窄等级分类节点（只画点不连线）；
   4. 性健康 / 阴道扩张记录默认私密：列表默认折叠，需要本人点开才显示（A4）。 */

const APP_INFO = {
  version: '0.1.1',
  build: '2026-10-21',
  channel: 'prototype',
  channelLabel: '交互原型 · 未接入 DSH'
};
APP_INFO.displayVersion = `v${APP_INFO.version}`;

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let uidSeq = 0;
const uid = (p) => p + (++uidSeq);

/* ---------------- icons & nav ---------------- */
const icons = {
  home: 'M3 10 12 3l9 7M5 9v12h5v-7h4v7h5V9',
  badge: 'M12 3l7 4v10l-7 4-7-4V7ZM9 12l2 2 4-4',
  drip: 'M12 3v6m0 0a5 5 0 1 0 0 10 5 5 0 0 0 0-10ZM7 7h10',
  /* 后装/放疗：一个放射源 + 四周射线 */
  ray: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6 2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1',
  /* 性与生育：花（保留生育的意象，不做人体图示） */
  flower: 'M12 9a2.4 2.4 0 1 1 0 5 2.4 2.4 0 0 1 0-5ZM12 9c0-2 1-3.4 2.4-3.4S17 7 17 8.7c0 1.7-2 2.8-5 2.8M12 14c0 2-1 3.4-2.4 3.4S7 16 7 14.3c0-1.7 2-2.8 5-2.8M9.4 10.4C7.8 9.2 6 8.6 5 9.6s-.2 2.8 1.4 4c1.6 1.2 3.6.6 5.6-.6M14.6 13.6c1.6 1.2 3.4 1.8 4.4.8s.2-2.8-1.4-4c-1.6-1.2-3.6-.6-5.6.6',
  lab: 'M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3M7 15h10',
  chart: 'M4 3v17h17M7 14l4-5 4 3 5-7',
  leaf: 'M20 4c-9.4 0-15 4.1-15 9.6A5.4 5.4 0 0 0 10.4 19C16 19 20 13.4 20 4ZM5.5 18.6C8 13.4 12 10.6 17 9.6',
  heart: 'M12 20.3c-4.6-2.9-7.4-5.6-7.4-9A4.1 4.1 0 0 1 12 8.4a4.1 4.1 0 0 1 7.4 2.9c0 3.4-2.8 6.1-7.4 9Z',
  calendar: 'M4 5h16v16H4ZM8 3v4m8-4v4M4 10h16m-12 4h2m4 0h2m-8 3h2',
  flask: 'M9 3h6v5l5 9a2 2 0 0 1-2 3H6a2 2 0 0 1-2-3l5-9Z',
  folder: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z',
  chat: 'M4 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H10l-6 5V5ZM8 8h8M8 11h5',
  /* 检查与指标：一张报告 + 读数线 */
  report: 'M6 3h9l4 4v14H6ZM14 3v5h5M9 12h6M9 16h4'
};
/* 看板任务卡用的是页面键，图标表里名字不同；别名避免拼错键时静默输出空 path。 */
const ICON_ALIAS = { records: 'folder', review: 'calendar', labs: 'report', timeline: 'chart', mind: 'heart', nutrition: 'leaf', treatment: 'drip', stage: 'badge', trials: 'flask', dashboard: 'home', late: 'ray', fertility: 'flower', prep: 'calendar' };
const icon = (k) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${icons[k] || icons[ICON_ALIAS[k]] || icons.badge}"/></svg>`;

/* 12 个一级页：SPEC §4 的 11 个 + 「资料库」（家族脚手架要求）。
   顺序照 SPEC：看板 → 资料库 → 我的分期 → 治疗历程 → 性与生育 → 放疗与长期影响
   → 检查与指标 → 一图秀 → 营养支持 → 心理支持 → 复诊准备 → 临床研究。 */
const PAGES = [
  ['dashboard', '看板', 'home'], ['records', '病情整理', 'folder'], ['stage', '我的分期', 'badge'],
  ['treatment', '治疗历程', 'drip'], ['fertility', '性与生育', 'flower'], ['late', '放疗与长期影响', 'ray'],
  ['labs', '检查与指标', 'report'], ['timeline', '病情一图秀', 'chart'], ['nutrition', '营养支持', 'leaf'],
  ['mind', '心理支持', 'heart'], ['review', '复诊准备', 'calendar'], ['trials', '临床研究', 'flask']
];
const SUBPAGES = {
  records: ['资料库', '整理草稿 / 核对', '病情档案', '指标检测', '病情汇总'],
  stage: ['分期档案', '病理与分子', '会诊与二次意见'],
  treatment: ['治疗路径', '手术记录', '放疗疗程', '系统治疗'],
  fertility: ['生育档案', '生育保留记录', '卵巢与月经', '性健康（私密）'],
  late: ['放疗后事件', '淋巴水肿', '阴道与扩张', '绝经与骨健康'],
  labs: ['肿瘤标志物', '细胞学与 HPV', '影像随访'],
  timeline: ['数值曲线', '分类与事件', '数据口径'],
  nutrition: ['进食量记录', '补充剂与医嘱'],
  mind: ['当下感受', '身体形象与亲密关系', '母亲身份与家庭沟通'],
  review: ['复诊节奏', '三类随访节点', '筛查与预防', '就诊准备'],
  trials: ['2026 线索', '已收藏', '入组问题']
};
const SUBTITLES = {
  dashboard: '分期、路径、长期影响与随访放在一起，让下一次门诊有据可查。',
  records: '上传 → 解析 → 确认指标 → 入库；原件永远保留，接受之前都只是候选。',
  stage: 'FIGO 2018 分期由医生给出，工作台只记录分期、依据与日期，不替你重算。',
  treatment: '路径三选一（手术 / 根治性放化疗 / 系统治疗）；外照射与后装分列，改过的路径留着不覆盖。',
  fertility: '生育是记录不是承诺：这里存"问了什么、医生答了什么原文"；性健康默认私密。',
  late: '放疗结束后才出现的问题，按时间一条条记下来；不给分级建议，也不推产品。',
  labs: 'SCC-Ag 只对鳞癌有意义；细胞学与 HPV 只存报告原文，界面不做重判读。',
  timeline: 'SCC-Ag、体重与阴道狭窄放回同一段时间里，看见变化发生在哪一步。',
  nutrition: '这一页记"吃了多少"——份量、食物、症状；不给食谱也不给剂量。',
  mind: '害怕、疲惫、对身体和亲密的担心都算正常反应；这里的内容默认只属于你。',
  review: '该带什么、该问什么，提前写下来，诊室里就不用凭记忆。',
  trials: '线索不是推荐；先弄清入组条件，再决定要不要问。'
};

/* ---------------- 数据层（由 demo/build-demo-data.mjs 生成；改数据请改生成器重跑） ---------------- */
/* 数据层（开发版）：先向 /api/bootstrap 要真数据，拿不到才回退 window.DEMO_DATA。
 *
 * 为什么不在文件里写死数据：原型与开发版必须是同一份渲染代码（P-18 的 parity 要求），
 * 所以这里只改"数据从哪来"，不改任何视图函数。回退只为两种情况：纯静态打开、
 * 或 dev-server 还没起——这时页面顶部会显示"离线演示数据"的横幅，避免把演示当成自己的。
 */
const PROFILES = {}, METRICS = {}, EVENTS = {}, DASH_KEYS = {}, DOCS = {}, CANDS = {};
let D = { profiles: {}, trials: [] };
let TRIALS = [];
let DATA_SOURCE = 'pending';   // 'api' | 'demo' | 'empty'

/** 挂载前缀：页面在 `<前缀>/api/cervical/ui/index.html`，接口在 `<前缀>/api/cervical/…`。
 *  所以这里要**把 `/api/cervical` 去掉**，只留挂载前缀（独立启动与 Desktop 都是空串）。
 *  踩过一次：这里返回 `/api/cervical`，调用处再拼 `/api/cervical/xxx` →
 *  `/api/cervical/api/cervical/bootstrap` 404，页面静默回退演示数据，看着"有数据"其实没连上库。 */
function apiBase() {
  const m = location.pathname.match(/^(.*)\/ui(?:\/|$)/);
  const base = m ? m[1] : '';
  return base.replace(/\/api\/cervical$/, '');
}

function applyData(data) {
  D = data || { profiles: {}, trials: [] };
  for (const k of Object.keys(PROFILES)) delete PROFILES[k];
  for (const k of Object.keys(METRICS)) delete METRICS[k];
  for (const k of Object.keys(EVENTS)) delete EVENTS[k];
  for (const k of Object.keys(DASH_KEYS)) delete DASH_KEYS[k];
  for (const k of Object.keys(DOCS)) delete DOCS[k];
  for (const k of Object.keys(CANDS)) delete CANDS[k];

  for (const [k, p] of Object.entries(D.profiles)) {
    /* 字段逐条显式列出：生成器加字段时这里会同步补，不会静默丢字段。
       宫颈癌专属：figo / rt / lateEffects / lymphedema / vagina / menopause / hormone /
       fertility / fertSurgery / ovary / sexual / cytology / hpv / imaging / screening
       （食管癌那套 swallow/access/dilation/monitor/endoscopy 不许抄回来）。 */
    PROFILES[k] = {
      name: p.name, sex: p.sex, age: p.age, meta: p.meta, headline: p.headline, stage: p.stage,
      mindset: p.mindset, histology: p.histology, hpvStatus: p.hpv_status,
      molecular: p.molecular, path: p.path, lines: p.lines, cycles: p.cycles, rhythm: p.rhythm,
      pathway: p.pathway || null, figo: p.figo || null, surgery: p.surgery || null, rt: p.rt || null,
      lateEffects: p.lateEffects || null, lymphedema: p.lymphedema || null, vagina: p.vagina || null,
      menopause: p.menopause || null, hormone: p.hormone || [], fertility: p.fertility || null,
      fertSurgery: p.fertSurgery || null, ovary: p.ovary || null, sexual: p.sexual || null,
      cytology: p.cytology || null, hpv: p.hpv || null, imaging: p.imaging || null,
      screening: p.screening || null, nutrition: p.nutrition || null, supplements: p.supplements || [],
      viewpoints: p.viewpoints, activity: p.activity, familyTalk: p.familyTalk,
      docs: p.docs || [], candidates: p.candidates || [], pathology: p.pathology || null
    };
    METRICS[k] = {};
    for (const m of p.metrics) METRICS[k][m.key] = m;
    /* 事件在 demo-data 里是 [日期, 名称] 定长数组；一图秀按 {d,label} 读，
       不归一化会让 dataBounds() 拿到 undefined → toISOString 抛 RangeError、整页渲染中断。 */
    EVENTS[k] = (p.events || []).map(e => Array.isArray(e) ? { d: e[0], label: e[1] } : e);
    DASH_KEYS[k] = p.dash_keys;
    /* 资料与候选是定长数组，必须显式映射：直接展开只会得到数字键，页面读 d.name 全是 undefined。 */
    DOCS[k] = (p.docs || []).map(d => ({ id: d[0], name: d[1], fileName: d[1], date: d[2], type: d[3], status: d[4] }));
    CANDS[k] = (p.candidates || []).map(c => ({ id: c[0], name: c[1], value: c[2], source: c[3],
      status: c[4] === '已接受' ? 'accepted' : 'candidate' }));
  }
  TRIALS = D.trials || [];
}

/** 拉真数据。返回 {reachable, data}：
 *  reachable=false 才允许回退演示数据；**接口通了但库是空的**必须显示空态，
 *  不能拿演示档案把空工作区填满（那会让用户以为数据被写进来了）。 */
async function loadBootstrap() {
  const url = `${apiBase()}/api/cervical/bootstrap`;
  try {
    const res = await fetch(url, { headers: { accept: 'application/json' } });
    if (!res.ok) return { reachable: false, data: null };
    const data = await res.json();
    return { reachable: true, data: data && data.profiles ? data : null };
  } catch { return { reachable: false, data: null }; }
}

/* ---------------- state ---------------- */
/* 一图秀默认：SCC-Ag + 体重两条数值线 + 阴道狭窄等级（分类节点，不连线）。
   进页面先看"肿瘤标志物降没降、体重掉没掉"，而不是血象。 */
const state = { view: 'dashboard', profile: 'A', agentOpen: false, agentSize: 'std', sel: ['scc', 'wt', 'vagina'],
  range: 'all', zoom: 100, toggles: { treatment: true, keypoints: true }, pin: null, saved: [], sub: {},
  query: '', parsing: false, parseError: false, loaded: {}, parsingName: '', lastUpload: null, uploads: 0,
  privateOpen: false, trialTopic: '全部' };
/* 换档案后的默认选择必须与初始状态同构：鳞癌 = SCC-Ag + 体重；腺癌 = CEA + 体重。
   分类节点按档案实际有的那条挑（A 用阴道狭窄，B 用月经恢复）。 */
const defaultSel = (k) => {
  const mm = METRICS[k] || {};
  const num = (DASH_KEYS[k] || []).filter((c) => mm[c] && mm[c].points.some(p => typeof p.v === 'number')).slice(0, 2);
  const out = num.slice();
  const qual = ['vagina', 'menses', 'lymphedema', 'bowel'].find((c) => mm[c] && mm[c].points.length);
  if (qual) out.push(qual);
  return out.slice(0, 3);
};
const P = () => PROFILES[state.profile];
const M = () => METRICS[state.profile];

/* ---------------- helpers ---------------- */
const fmtDate = (d) => d;
const delta = (m) => {
  if (!m.points || m.points.length < 2) return null;
  const a = m.points[m.points.length - 1], b = m.points[m.points.length - 2];
  if (typeof a.v !== 'number' || typeof b.v !== 'number') return null;
  const d = a.v - b.v;
  return { text: (d > 0 ? '+' : '') + d.toFixed(m.dec ?? 1), up: d > 0, from: b.d };
};
function sparkline(m, w = 200, h = 44) {
  const pts = (m.points || []).filter(p => typeof p.v === 'number');
  if (pts.length < 2) return '';
  const vs = pts.map(p => p.v);
  let lo = Math.min(...vs), hi = Math.max(...vs); if (hi === lo) { hi += 1; lo -= 1; }
  const X = i => 4 + (w - 8) * i / (pts.length - 1);
  const Y = v => h - 5 - (h - 10) * (v - lo) / (hi - lo);
  const path = pts.map((p, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(p.v).toFixed(1)}`).join('');
  const dots = pts.map((p, i) => `<circle class="sp-dot" cx="${X(i).toFixed(1)}" cy="${Y(p.v).toFixed(1)}" r="2.6" fill="${m.color}"/>`).join('');
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" aria-hidden="true"><path class="base" d="M4 ${h - 5}H${w - 4}"/><path class="sp-line" d="${path}" stroke="${m.color}"/>${dots}</svg>`;
}
/* 3D 翻面：点整卡转 180°，再点返回；data-flipped 是唯一视觉开关；
   两面互换 aria-hidden，隐藏面不进读屏顺序。分类记录（data-static）不翻。 */
function flipCard(key) {
  const el = document.querySelector(`[data-mcard="${key}"]`);
  if (!el || el.dataset.static) return;
  const on = el.dataset.flipped !== 'true';
  el.dataset.flipped = String(on);
  el.setAttribute('aria-pressed', String(on));
  const front = el.querySelector('[data-face="front"]');
  const back = el.querySelector('[data-face="back"]');
  if (front) front.setAttribute('aria-hidden', String(on));
  if (back) back.setAttribute('aria-hidden', String(!on));
}
function mcard(key, m) {
  const last = (m.points || []).slice(-1)[0];
  if (!last) return '';
  const numeric = typeof last.v === 'number' && m.dec !== null;
  const d = delta(m);
  const cat = `<span class="cat"><i style="background:${m.color}"></i>${esc(m.cat)}</span>`;
  if (!numeric) {
    return `<div class="mcard" data-mcard="${key}" data-static="1" role="group" aria-roledescription="指标卡"
      aria-label="${esc(m.name)}：${esc(String(last.v))}（分类记录，只按原文记录，不连折线）">
      <span class="mface front" data-face="front">${cat}<span class="name">${esc(m.name)}</span>
      <span class="na">${esc(last.v)}</span>
      <span class="meta"><span>${esc(last.src)}</span><span class="hint">分类记录</span></span></span></div>`;
  }
  const band = m.band ? `<span class="rec">参考 ${m.band[0]}–${m.band[1]} ${esc(m.unit)}</span>` : `<span class="rec">${esc(last.d)} · ${esc(last.src)}</span>`;
  return `<div class="mcard" role="group" tabindex="0" data-mcard="${key}" data-flipped="false" aria-roledescription="指标卡"
    aria-label="${esc(m.name)} 最近 ${last.v.toFixed(m.dec ?? 1)} ${esc(m.unit)}（${esc(last.d)}）；点一下翻面看趋势">
    <span class="mcard-inner">
    <span class="mface front" data-face="front">${cat}<span class="name">${esc(m.name)}</span>
      <span class="val"><span data-countup="${last.v}" data-dec="${m.dec ?? 1}">${last.v.toFixed(m.dec ?? 1)}</span><small>${esc(m.unit)}</small></span>
      ${d ? `<span class="delta">较上次 <em>${d.text}${m.unit ? ' ' + esc(m.unit) : ''}</em>（${esc(d.from)}）</span>` : ''}
      ${band}</span>
    <span class="mface back" data-face="back" aria-hidden="true">${cat}<span class="name">${esc(m.name)}</span>
      ${sparkline(m, 190, 40)}
      <span class="meta"><span>${esc(m.note)}</span><span class="hint">轻点翻回</span></span></span>
    </span></div>`;
}
/* ---------------- 一图秀引擎（统一画布 · 多序列归一化 · 移植家族基因） ---------------- */
const CW = 980, CH = 420, CX0 = 62, CX1 = 954, CY0 = 132, CY1 = 366;
const CAT_ORDER = ['肿瘤标志物', '营养', '放疗影响', '妇科症状', '激素与卵巢', '血象', '生化', '电解质'];
/* 分类序列的档位顺序：**必须显式声明，不许按出现顺序排**。
   阴道狭窄、淋巴水肿、腹泻分级都有客观严重度，顺序错了图就在说谎。
   没在这里声明的分类指标（自述类）按"只画节点、不定位严重度"处理。 */
const QUAL_LEVELS = {
  vagina: ['0 级', '轻度', '中度', '重度'],
  lymphedema: ['0 期', 'Ⅰ期', 'Ⅱ期', 'Ⅲ期'],
  bowel: ['0 级', '1 级', '2 级', '3 级'],
  hotflash: ['无', '偶有', '每天 2–3 次', '每天 4–5 次'],
  menses: ['未恢复', '已恢复（量略少）', '规律'],
  discharge: ['无', '少量淡血性', '明显']
};
const fmtNum = (v, dec) => typeof v === 'number' ? v.toFixed(dec ?? 1) : String(v ?? '');
const shortDate = (d) => d.slice(5).replace('-', '.');
const longDate = (d) => d;
const numPts = (m) => (m.points || []).filter(p => typeof p.v === 'number');
const addDays = (d, n) => new Date(Date.parse(d) + n * 86400000).toISOString().slice(0, 10);

function dataBounds() {
  const ds = [];
  for (const m of Object.values(M())) for (const p of m.points) ds.push(p.d);
  for (const e of (EVENTS[state.profile] || [])) ds.push(e.d);
  ds.sort();
  return [Date.parse(ds[0]), Date.parse(ds[ds.length - 1])];
}
function domain() {
  const [s, e] = dataBounds();
  const months = { '3m': 3, '6m': 6, '12m': 12 }[state.range];
  const start = months ? new Date(new Date(e).setMonth(new Date(e).getMonth() - months)) : new Date(s);
  const span = e - start.getTime();
  const kept = span * state.zoom / 100;
  return [e - kept, e];
}
const inDomain = (d, t0, t1) => { const t = Date.parse(d); return t >= t0 && t <= t1; };
const xOf = (t, t0, t1) => CX0 + (t - t0) / Math.max(1, t1 - t0) * (CX1 - CX0);

/* 单调三次插值（Fritsch-Carlson，同 d3 curveMonotoneX）：
   只平滑折线，且保证曲线段不越过相邻数据点的 y 范围——不会出现"过冲鼓包"式变形 */
function smoothPath(coords) {
  const n = coords.length;
  if (!n) return '';
  if (n === 1) return `M ${coords[0].x.toFixed(1)} ${coords[0].y.toFixed(1)}`;
  const dx = [], slope = [];
  for (let i = 0; i < n - 1; i++) {
    const ddx = coords[i + 1].x - coords[i].x;
    dx.push(ddx);
    slope.push(ddx ? (coords[i + 1].y - coords[i].y) / ddx : 0);
  }
  const tan = [slope[0]];
  for (let i = 1; i < n - 1; i++) {
    if (slope[i - 1] * slope[i] <= 0) tan.push(0);           // 拐点处切线置平，防鼓包
    else {
      const w1 = 2 * dx[i] + dx[i - 1], w2 = dx[i] + 2 * dx[i - 1];
      tan.push((w1 + w2) / (w1 / slope[i - 1] + w2 / slope[i])); // 调和加权，保证单调
    }
  }
  tan.push(slope[n - 2]);
  let d = `M ${coords[0].x.toFixed(1)} ${coords[0].y.toFixed(1)}`;
  for (let i = 0; i < n - 1; i++) {
    const c1x = coords[i].x + dx[i] / 3, c1y = coords[i].y + tan[i] * dx[i] / 3;
    const c2x = coords[i + 1].x - dx[i] / 3, c2y = coords[i + 1].y - tan[i + 1] * dx[i] / 3;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${coords[i + 1].x.toFixed(1)} ${coords[i + 1].y.toFixed(1)}`;
  }
  return d;
}

/* 治疗条：周期带（放化疗周期 / 后装分次）+ 评估标记（确诊/手术/分期），两行独立于数据区 */
function bandsFor(t0, t1) {
  const p = P(), items = [];
  p.cycles.forEach((c, i) => {
    const from = c[1];
    const to = c[4] && p.cycles[i + 1] ? p.cycles[i + 1][1] : addDays(from, 21);
    items.push({ kind: 'cycle', from, to, label: c[0], color: '#0e837c' });
  });
  (EVENTS[state.profile] || []).forEach((e) => {
    if (/确诊|手术|分期/.test(e.label)) items.push({ kind: 'mark', from: e.d, to: e.d, label: e.label, color: e.label.includes('手术') ? '#a03d5c' : '#9a6410' });
  });
  return items.filter((tr) => Date.parse(tr.to) >= t0 && Date.parse(tr.from) <= t1)
    .sort((a, b) => Date.parse(a.from) - Date.parse(b.from))
    .map((tr, lane) => { const s = Math.max(Date.parse(tr.from), t0), e2 = Math.min(Date.parse(tr.to), t1); return { ...tr, x1: xOf(s, t0, t1), x2: xOf(e2, t0, t1), lane }; });
}

function monthTicks(t0, t1) {
  const out = []; const d = new Date(t0); let cur = new Date(d.getFullYear(), d.getMonth(), 1);
  if (cur.getTime() < t0) cur.setMonth(cur.getMonth() + 1);
  while (cur.getTime() <= t1) {
    const x = xOf(cur.getTime(), t0, t1);
    if (x > CX0 + 6 && x < CX1 - 6) out.push({ x, label: `${cur.getMonth() + 1}月` });
    cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
  }
  if (out.length > 7) return out.filter((_, i) => i % 2 === 0);
  return out;
}

function seriesFor(code, t0, t1) {
  const m = M()[code];
  if (!m) return null;
  const nums = numPts(m);
  /* 分类序列（阴道狭窄等级 / 淋巴水肿分期 / 月经恢复）：没有数值轴，只画节点与档位文字，
     绝不连折线——连线会造出"从轻度顺利滑到重度"的假趋势。 */
  if (!nums.length) {
    const lv = QUAL_LEVELS[code] || null;
    const pts = (m.points || []).filter((p) => inDomain(p.d, t0, t1));
    let lo = 0, hi = 1;
    if (lv) { lo = 0; hi = lv.length - 1; }
    return { code, m, lo, hi, span: Math.max(hi - lo, 1), pts, qual: true, levels: lv };
  }
  const all = nums.map((p) => p.v);
  const lo = Math.min(...all), hi = Math.max(...all);
  const span = hi - lo || Math.max(Math.abs(hi) * 0.08, 1);
  const pts = nums.filter((p) => inDomain(p.d, t0, t1));
  return { code, m, lo, hi, span, pts, qual: false };
}

function chartSVG(t0, t1) {
  const bands = state.toggles.treatment ? bandsFor(t0, t1) : [];
  const all = state.sel.filter((c) => M()[c]).map((c) => seriesFor(c, t0, t1)).filter((s) => s && s.pts.length);
  if (!all.length) return `<div class="empty"><h3>这个时间窗里没有所选指标</h3><p>扩大时间范围，或在左侧加选一个指标。</p></div>`;
  const series = all.filter((s) => !s.qual);
  const quals = all.filter((s) => s.qual);
  const yOf = (s, v) => CY1 - (v - s.lo) / s.span * (CY1 - CY0);
  const grid = [0, 1, 2, 3, 4].map((i) => { const y = CY0 + i * (CY1 - CY0) / 4; return `<line class="grid" x1="${CX0}" x2="${CX1}" y1="${y}" y2="${y}"/>`; }).join('');

  /* 周期标签两行错位：21 天一格的条宽只有 ~30px，单行排下来相邻标签会糊成一串。 */
  const labelEnd = [-1e9, -1e9];
  /* 评估标记（确诊 / 手术 / 分期）常常同一天，两个标签会直接叠字：同样做两行错位。 */
  const markEnd = [-1e9, -1e9];
  const strip = bands.map((b) => {
    if (b.kind === 'mark') {
      const x = b.x1.toFixed(1);
      const estW = String(b.label).length * 9.6 + 14;
      let mrow = markEnd[0] + 4 <= +x ? 0 : 1;
      markEnd[mrow] = +x + estW;
      const row = 64 + mrow * 15;
      return `<g><path d="M ${x} ${row - 4} l4 4 -4 4 -4 -4 Z" fill="${b.color}"/>
        <text x="${(+x + 8).toFixed(1)}" y="${row + 3.5}" font-size="9.5" fill="${b.color}" font-weight="600">${esc(b.label)}</text></g>`;
    }
    const w = Math.max(b.x2 - b.x1, 7).toFixed(1);
    const estW = String(b.label).length * 5.4 + 3;
    let row = labelEnd[0] + 4 <= b.x1 ? 0 : 1;
    if (row === 1 && labelEnd[1] + 4 > b.x1) { row = 0; }   // 两行都挤：宁可压一点，也不换第三行
    labelEnd[row] = Math.max(labelEnd[row], b.x1 + estW);
    const ty = 30 - row * 9;
    return `<g><rect x="${b.x1.toFixed(1)}" y="36" width="${w}" height="8" rx="4" fill="${b.color}" opacity=".3"/>
      <text x="${(b.x1 + 1).toFixed(1)}" y="${ty}" font-size="9" fill="${b.color}" font-weight="500">${esc(b.label)}</text></g>`;
  }).join('');

  const markLines = bands.filter((b) => b.kind === 'mark').map((b) =>
    `<line x1="${b.x1.toFixed(1)}" x2="${b.x1.toFixed(1)}" y1="${CY0}" y2="${CY1}" stroke="${b.color}" stroke-width="1.2" stroke-dasharray="3 6" opacity=".45"/>`).join('');

  /* 末点标签：按 y 排序强制最小间距 13px，右端左锚定，防叠字（家族统一规范） */
  const lastPos = series.map((s) => {
    const c = s.pts.map((p) => ({ x: xOf(Date.parse(p.d), t0, t1), y: yOf(s, p.v) }));
    const last = c[c.length - 1];
    return { s, x: last.x, y: last.y, v: s.pts[s.pts.length - 1].v };
  }).sort((a, b) => a.y - b.y);
  let cursor = -Infinity;
  for (const it of lastPos) { it.ly = Math.max(it.y, cursor + 13); cursor = it.ly; }
  const overflow = lastPos.length ? Math.max(0, lastPos[lastPos.length - 1].ly - (CY1 + 2)) : 0;
  if (overflow) for (const it of lastPos) it.ly -= overflow;

  const lines = series.map((s) => {
    const coords = s.pts.map((p) => ({ x: xOf(Date.parse(p.d), t0, t1), y: yOf(s, p.v) }));
    const path = s.pts.length > 1 ? `<path class="line" d="${smoothPath(coords)}" stroke="${s.m.color}" pathLength="1"/>` : '';
    const points = coords.map((c, i) => {
      const p = s.pts[i];
      const isLast = i === s.pts.length - 1;
      const r = isLast ? 5.2 : (i === 0 ? 4.6 : 4);
      const active = state.pin && state.pin.code === s.code && state.pin.date === p.d;
      return `<circle class="pt${active ? ' active' : ''}" cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="${r}" fill="${s.m.color}" data-action="pin" data-code="${s.code}" data-date="${p.d}"/>`;
    }).join('');
    const lp = lastPos.find((x) => x.s === s);
    const nearRight = lp.x > CX1 - 44;
    const lx = nearRight ? lp.x - 8 : lp.x + 8;
    const label = state.toggles.keypoints
      ? `<text class="delta-tag" x="${lx.toFixed(1)}" y="${(lp.ly + 4).toFixed(1)}" text-anchor="${nearRight ? 'end' : 'start'}" fill="${s.m.color}">${fmtNum(lp.v, s.m.dec)}</text>` : '';
    return `<g>${path}${points}${label}</g>`;
  }).join('');

  /* 分类序列：节点画在档位带上，纵向按档位序排；每个节点带小方块 + 档位文字，不连线。
     多条分类序列时横向错开 8px，避免完全重叠。 */
  const qualLayer = quals.map((s, qi) => {
    const lv = s.levels || [];
    const n = Math.max(lv.length - 1, 1);
    return s.pts.map((p) => {
      const x = xOf(Date.parse(p.d), t0, t1) + qi * 8 - 4;
      const idx = Math.max(0, lv.indexOf(p.v));
      const y = CY1 - idx / n * (CY1 - CY0);
      const active = state.pin && state.pin.code === s.code && state.pin.date === p.d;
      return `<g class="qual-pt${active ? ' active' : ''}">
        <rect x="${(x - 4).toFixed(1)}" y="${(y - 4).toFixed(1)}" width="8" height="8" rx="2" fill="${s.m.color}" opacity=".85" data-action="pin" data-code="${s.code}" data-date="${p.d}"/>
        <text x="${(x + 6).toFixed(1)}" y="${(y + 3.2).toFixed(1)}" font-size="8.5" fill="${s.m.color}" font-weight="600">${esc(p.v)}</text></g>`;
    }).join('');
  }).join('');

  const ticks = monthTicks(t0, t1).map((t) => `<line class="axis" x1="${t.x.toFixed(1)}" x2="${t.x.toFixed(1)}" y1="${CY1}" y2="${CY1 + 5}"/><text class="tick" x="${t.x.toFixed(1)}" y="${CY1 + 18}" text-anchor="middle">${t.label}</text>`).join('');
  const rowLabels = state.toggles.treatment
    ? `<text x="6" y="34" font-size="9" fill="#8fa1b5">周期</text><text x="6" y="68" font-size="9" fill="#8fa1b5">评估</text>`
    : '';

  return `<svg class="chart" viewBox="0 0 ${CW} ${CH}" role="img" aria-label="所选指标的时序图，共 ${all.length} 条序列（其中 ${quals.length} 条为分类节点）">
    ${grid}${ticks}${markLines}${strip}${rowLabels}${lines}${qualLayer}
    <text class="tick" x="${CX0}" y="${CY1 + 36}">数值线按各自全部记录的最小值–最大值归一化，不代表数值可比；分类序列只画节点、不连线</text>
  </svg>`;
}

const pageHead = (sub) => `<div class="page-head"><div><h1>${esc(PAGES.find(p => p[0] === state.view)[1])}</h1><p>${esc(SUBTITLES[state.view])}</p></div></div>${sub ? `<div class="subnav" role="tablist">${SUBPAGES[state.view].map((s, i) => `<button role="tab" aria-selected="${(state.sub[state.view] || 0) === i}" data-sub="${i}">${esc(s)}</button>`).join('')}</div>` : ''}`;
const row = (b, p, right = '') => `<div class="row"><div class="row-main"><div><b>${b}</b>${p ? `<p>${p}</p>` : ''}</div></div>${right}</div>`;
const pill = (t, c = '') => `<span class="pill ${c}">${esc(t)}</span>`;
const secTitle = (s, extra = '') => s ? `<div class="section-title"><h2>${esc(s.title)}</h2>${extra}</div>` : '';
const emptyBox = (h, p) => `<div class="empty"><h3>${esc(h)}</h3><p>${esc(p)}</p></div>`;

/* ---------------- views ---------------- */

/* 放疗长期影响状态卡（A 的专属卡）：只陈述"记录了几条、最近一次是什么"，
   不给分级建议、不写"需要处理"。 */
function lateCard(p) {
  if (!p.lateEffects && !p.lymphedema && !p.vagina) {
    return `<div class="card"><div class="card-head"><h2>放疗长期影响</h2>${pill('暂无记录', 'grey')}</div>
      ${emptyBox('还没有放疗后记录', '如果做过盆腔放疗，出现腹泻、腿肿、阴道干涩时，可以在这里一条条记下来。')}</div>`;
  }
  const le = p.lateEffects ? p.lateEffects.rows[0] : null;
  const ly = p.lymphedema ? p.lymphedema.rows[0] : null;
  const vg = p.vagina ? p.vagina.rows[0] : null;
  return `<div class="card"><div class="card-head"><h2>放疗长期影响</h2>${pill('按记录陈述', 'violet')}</div>
    <div class="rows">
      ${le ? row(`最近一次${esc(le[1])}事件`, `${esc(le[0])} · 医生记录 ${esc(le[2] || '未分级')} — ${esc(le[3])}`) : ''}
      ${ly ? row('下肢淋巴水肿', `${esc(ly[0])} · ${esc(ly[1])} · ${esc(ly[3])}${ly[2] && ly[2] !== '—' ? ` · 医生分期 ${esc(ly[2])}` : ''}`) : ''}
      ${vg ? row('阴道扩张训练', `${esc(vg[0])} · ${esc(vg[1])}：${esc(vg[2])}${vg[4] ? ' ' + pill('私密', 'grey') : ''}`) : ''}
    </div>
    <div class="notice">这里只记录"什么时候、医生写了什么"；分级和处理都由医生给，工作台不做判断。</div>
    <div class="actions"><button data-action="go-late">打开放疗与长期影响 →</button></div></div>`;
}

function vDashboard() {
  const p = P(), m = M();
  const cards = (DASH_KEYS[state.profile] || []).filter(k => m[k]).map(k => mcard(k, m[k])).join('');
  const lastV = p.viewpoints[p.viewpoints.length - 1];
  const nextRhythm = p.rhythm[0];
  const isA = state.profile === 'A';
  return `${pageHead(false)}
  <section class="hero">
    <div>
      <span class="eyebrow">演示档案 · ${esc(p.histology)}</span>
      <h1>${esc(p.name)}，这次想先看什么</h1>
      <p>${esc(p.headline)}</p>
      <div class="chips">${p.path.map((x, i) => `<span class="chip${i === 0 ? ' on' : ''}">${esc(x)}</span>`).join('')}</div>
    </div>
    <div class="stat-band">
      <div class="stat-tile"><span>FIGO 2018 分期</span><b>${esc(p.stage)}</b><small>医生给出，不自算</small></div>
      <div class="stat-tile"><span>最近一次门诊</span><b>${esc(p.rhythm[0] ? '已安排' : '未记录')}</b><small>${esc(nextRhythm ? nextRhythm[3] : '')}</small></div>
    </div>
  </section>

  <div class="alert-strip">
    <b>${isA ? '长期影响是这半年最需要留痕的部分' : '生育保留的随访节奏和普通人不一样'}</b>
    <span>${isA
      ? '放疗结束后出现的腹泻、腿肿、阴道干涩，按发生时间记下来，下次门诊直接给医生看。'
      : '医生写的是"前 2 年每 3 个月"，具体项目在这页可以逐条对照；月经情况每次门诊都要说。'}</span>
    <button data-action="${isA ? 'go-late' : 'go-fertility'}">去看看 →</button>
  </div>

  <div class="task-grid">
    <button class="task-entry" data-action="${isA ? 'add-late' : 'add-fertility'}">${icon('ray')}<b>${isA ? '记一条今天的身体反应' : '记一次月经情况'}</b><span>${isA ? '腹泻、腿肿、潮热都可以，按自述记' : '术后月经恢复是要在门诊说的事'}</span></button>
    <button class="task-entry" data-action="go-review">${icon('calendar')}<b>复查要带什么</b><span>${esc(nextRhythm ? nextRhythm[0] + ' · ' + nextRhythm[1] : '按医生安排')}</span></button>
    <button class="task-entry" data-action="go-trials">${icon('flask')}<b>看看 2026 在招什么</b><span>${TRIALS.length} 条登记摘录，不是推荐</span></button>
  </div>

  <div class="dashboard-grid">
    <div>
      <div class="section-title"><h2>最近的变化</h2><span class="muted">轻点卡片翻面看趋势</span></div>
      <div class="metric-grid">${cards}</div>
      ${lateCard(p)}
      <div class="card">
        <div class="card-head"><h2>下一次门诊要说的三件事</h2>${pill(esc(nextRhythm ? nextRhythm[3] : '待定'), 'violet')}</div>
        <div class="rows">
          ${nextRhythm ? row(esc(nextRhythm[0]), `${esc(nextRhythm[1])} · ${esc(nextRhythm[2])}`) : ''}
          ${row('想问的问题', p.mindset)}
          <div class="row"><div class="row-main"><div><b>最近一次感受</b><p>${esc(lastV[0])} · ${esc(lastV[1])}：${esc(lastV[2])}</p></div></div>${pill('不是医生结论', 'grey')}</div>
        </div>
      </div>
    </div>
    <div>
      <div class="card">
        <div class="card-head"><h2>接下来</h2><span class="muted">医生安排</span></div>
        <div class="rows">${p.rhythm.slice(0, 5).map(r => row(esc(r[0]), `${esc(r[1])} · ${esc(r[3])}`)).join('')}</div>
        <div class="actions"><button data-action="go-review">打开复诊准备</button></div>
      </div>
      <div class="card">
        <div class="card-head"><h2>我记下的感受</h2><span class="muted">默认只属于你</span></div>
        <div class="rows">${p.viewpoints.slice(-3).reverse().map(v => row(esc(v[2]), `${esc(v[0])} · ${esc(v[1])}`)).join('')}</div>
        <div class="actions"><button data-action="go-mind">心理支持 →</button></div>
      </div>
      <div class="card">
        <div class="card-head"><h2>今天可以做的事</h2></div>
        <div class="rows">
          ${row('把想问的写下来', '门诊只有几分钟，先说最想问的那一条')}
          ${row('记录一次身体反应', '按自述写，不用判断严重不严重')}
        </div>
      </div>
    </div>
  </div>`;
}

/* ---------------- 病情整理（资料库） ---------------- */
const MARK_STATE = { ok: ['green', '已检测'], warn: ['yellow', '需关注'], pending: ['violet', '待出'], na: ['grey', '未检测'] };
const fmtSize = (n) => (!n ? '' : n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
const todayISO = () => new Date().toISOString().slice(0, 10);
const DOC_TYPES = ['病理报告', '影像报告', '化验单', '治疗记录', '手术记录', '出院记录', '其他'];
const DOC_PILL = { 已解析: 'green', 已入库: 'green', 待核对: 'yellow', 解析失败: 'red' };
const CAND_LABEL = { candidate: '待确认', accepted: '已接受' };

function docsTable() {
  const q = (state.query || '').trim();
  const list = DOCS[state.profile].filter(d => !q || `${d.name} ${d.type}`.includes(q));
  if (!list.length) return `<div class="empty"><h3>没有匹配的资料</h3><p>换个关键词，或先上传一份报告。</p></div>`;
  return `<div class="table-wrap"><table class="cycle-table"><thead><tr><th>文件</th><th>日期</th><th>类型</th><th>状态</th><th></th></tr></thead><tbody>
    ${list.map(d => `<tr><td>${esc(d.name)}${d.size ? ` <small>${fmtSize(d.size)}</small>` : ''}</td><td>${esc(d.date)}</td><td>${esc(d.type)}</td>
      <td>${pill(d.status, DOC_PILL[d.status] || 'grey')}</td><td><button class="text-button" data-action="source" data-doc="${esc(d.id)}">原文出处</button></td></tr>`).join('')}
  </tbody></table></div>`;
}
function vRecords() {
  const sub = state.sub.records || 0;
  const cands = CANDS[state.profile];
  const pending = cands.filter(c => c.status !== 'accepted');
  if (sub === 0) {
    return `${pageHead(true)}<div class="toolbar">
      <input type="search" placeholder="搜索文件名或类型" data-action="records-search" value="${esc(state.query)}" aria-label="搜索资料">
      <button data-action="pick-file">上传报告</button>
      <button data-action="load-report">${state.parsing ? '正在解析…' : '载入一份模拟报告'}</button>
    </div>
    <input type="file" id="file-picker" multiple hidden accept=".pdf,.jpg,.jpeg,.png,.txt,.md">
    ${state.parseError ? `<div class="notice">上一份报告解析失败：<b>没有产生任何候选</b>，原件仍留在资料目录，可以重试。<button class="soft" data-action="retry">重试解析</button></div>` : ''}
    <div class="card"><div class="card-head"><h2>资料库</h2><span class="muted">${DOCS[state.profile].length} 份 · 原件不改动</span></div><div id="docs-table">${docsTable()}</div></div>`;
  }
  if (sub === 1) {
    return `${pageHead(true)}
    <div class="notice">核对 = 逐字检查转录，<b>不等于医学审核</b>；没把握就保留"待确认"，不会丢。</div>
    <div class="card"><div class="card-head"><h2>待核对（${pending.length}）</h2></div>
      <div class="rows">${pending.length ? pending.map(c => row(esc(c.name), `${esc(c.source)} · 值：${esc(c.value)}`,
        `<button data-action="candidate" data-id="${esc(c.id)}">核对这一项</button>`)).join('') : '<div class="empty"><h3>没有待核对内容</h3><p>解析出的字段都核对完了。</p></div>'}</div>
    </div>
    <div class="card"><div class="card-head"><h2>已接受（${cands.length - pending.length}）</h2><span class="muted">保留来源，可回溯</span></div>
      <div class="rows">${cands.filter(c => c.status === 'accepted').map(c => row(esc(c.name), `${esc(c.value)} · ${esc(c.source)}`, pill('已接受', 'green'))).join('') || '<p class="muted" style="padding:12px">还没有已接受的记录。</p>'}</div>
    </div>`;
  }
  if (sub === 2) {
    return `${pageHead(true)}<div class="grid">
      <div class="card"><div class="card-head"><h2>病情档案</h2></div><div class="rows">
        ${row('诊断', `${esc(P().histology)} · FIGO ${esc(P().stage)}`, pill('医生给出', 'grey'))}
        ${row('HPV', P().hpvStatus)}
        ${row('当前路径', P().path[2])}
        ${row('生育计划', P().fertility ? P().fertility.rows[1][1] : '未记录')}
      </div></div>
      <div class="card"><div class="card-head"><h2>时间线</h2></div><div class="rows">
        ${EVENTS[state.profile].slice().reverse().map(e => row(esc(e.d), esc(e.label))).join('')}
      </div></div></div>`;
  }
  if (sub === 3) {
    const metrics = Object.values(M());
    return `${pageHead(true)}<div class="card"><div class="card-head"><h2>指标检测（${metrics.length}）</h2></div>
      <div class="table-wrap"><table class="cycle-table"><thead><tr><th>指标</th><th>最近值</th><th>日期</th><th>来源</th></tr></thead><tbody>
      ${metrics.map(m => { const l = m.points[m.points.length - 1]; return `<tr><td>${esc(m.name)}</td><td>${esc(String(l.v))}${m.unit ? ' ' + esc(m.unit) : ''}</td><td>${esc(l.d)}</td><td>${esc(l.src || '—')}</td></tr>`; }).join('')}
      </tbody></table></div></div>`;
  }
  return `${pageHead(true)}<div class="card"><div class="card-head"><h2>病情汇总（演示）</h2></div><div class="rows">
    ${row('分期', `FIGO ${esc(P().stage)} · ${esc(P().figo ? P().figo.rows[2][1] : '')}`)}
    ${row('已在治疗', P().lines.map(l => l.name).join(' → '))}
    ${row('私密记录', `${(P().sexual || { rows: [] }).rows.length + (P().vagina ? P().vagina.rows.filter(r => r[4]).length : 0)} 条（默认不进导出与摘要）`, pill('不进导出', 'grey'))}
  </div></div>`;
}

/* ---------------- 我的分期 ---------------- */
function vStage() {
  const p = P(), sub = state.sub.stage || 0;
  if (sub === 0) {
    return `${pageHead(true)}
    <div class="notice"><b>FIGO 分期是医生给的。</b>工作台只抄「分期 / 依据 / 日期」，不根据影像或病理重算；r = 影像，p = 病理。</div>
    ${p.figo ? `<div class="card"><div class="card-head"><h2>${esc(p.figo.title)}</h2>${pill('医生给出', 'violet')}</div>
      <div class="table-wrap"><table class="cycle-table"><thead><tr><th>项目</th><th>记录</th><th>说明 / 出处</th></tr></thead><tbody>
      ${p.figo.rows.map(r => `<tr><td>${esc(r[0])}</td><td><b>${esc(r[1])}</b></td><td>${esc(r[2])}</td></tr>`).join('')}
      </tbody></table></div>
      <div class="actions"><button data-action="add-stage">记一次分期变更</button><button class="soft" data-action="source">看影像原文</button></div></div>` : emptyBox('还没有分期记录', '分期由医生给出后，在这里抄下来。')}
    <div class="grid" style="margin-top:14px">
      <div class="card"><div class="card-head"><h2>IIIC1 和 IIIC2 的区别</h2></div>
        <div class="rows">${row('IIIC1', '盆腔淋巴结阳性（r 影像 / p 病理）')}${row('IIIC2', '腹主动脉旁淋巴结阳性')}</div>
        <div class="notice">这段是术语对照，不是对你分期的解释；你的分期看上面那张表。</div></div>
      <div class="card"><div class="card-head"><h2>医生原话</h2></div>
        <div class="rows">${row(esc(p.figo ? p.figo.rows[4][0] : '—'), esc(p.figo ? p.figo.rows[4][1] : ''))}</div>
        <div class="notice">原话照抄，工作台不加解释。</div></div>
    </div>`;
  }
  if (sub === 1) {
    return `${pageHead(true)}
    <div class="card"><div class="card-head"><h2>${esc(p.pathology.title)}</h2>${pill(p.pathology.status, 'green')}</div>
      <div class="rows">${p.pathology.rows.map(r => row(esc(r[0]), esc(r[1]))).join('')}</div></div>
    <div class="card"><div class="card-head"><h2>缺口（还没确认的）</h2><span class="muted">未检测 ≠ 阴性</span></div>
      <div class="rows">${p.pathology.gaps.map(r => row(esc(r[0]), esc(r[1]), pill('待确认', 'yellow'))).join('')}</div></div>
    <div class="card"><div class="card-head"><h2>分子与免疫组化</h2><span class="muted">四态：已检测 / 需关注 / 待出 / 未检测</span></div>
      <div class="rows">${p.molecular.map(x => row(esc(x.k), `${esc(x.v)} · ${esc(x.src || '—')}${x.note && x.note !== '—' ? ' · ' + esc(x.note) : ''}`,
        pill(MARK_STATE[x.state][1], MARK_STATE[x.state][0]))).join('')}</div></div>`;
  }
  return `${pageHead(true)}<div class="grid">
    <div class="card"><div class="card-head"><h2>会诊记录</h2></div><div class="rows">
      ${row('2026 多学科讨论', state.profile === 'A' ? '影像提示盆腔淋巴结阳性，建议根治性放化疗（不是手术）' : '病灶 2.4 cm、无脉管浸润，可走保留子宫的术式')}
      ${row('二次意见', '尚未做；如需要，把病理切片与影像光盘带上')}
    </div><div class="notice">会诊意见是"一条信息"，最终方案由你和主诊医生定。</div></div>
    <div class="card"><div class="card-head"><h2>想再问的问题</h2></div><div class="rows">
      ${row('分期是否可能变', '如果后续影像或病理有新证据，问医生要不要重新分期')}
      ${row('淋巴结怎么确认', '影像阳性是否需要穿刺或病理证实（r 与 p 的差别）')}
    </div><div class="actions"><button data-action="add-question">加入复诊清单</button></div></div>
  </div>`;
}

/* ---------------- 治疗历程 ---------------- */
function vTreatment() {
  const p = P(), sub = state.sub.treatment || 0;
  if (sub === 0) {
    return `${pageHead(true)}<div class="notice">路径改过就<b>新增一条</b>，旧路径留着不覆盖；为什么换写医生原话，工作台不判断该不该换。</div>
    ${p.pathway ? `<div class="card"><div class="card-head"><h2>${esc(p.pathway.title)}</h2></div><div class="rows">
      ${p.pathway.rows.map(r => row(`${pill(r[0], r[0] === '当前' ? 'green' : 'grey')} ${esc(r[1])}`, `${esc(r[2])} · ${esc(r[3])}<br><span class="muted">${esc(r[4])}</span>`)).join('')}
    </div></div>` : emptyBox('还没有路径记录', '路径由医生确定后在这里记一条。')}
    <div class="grid" style="margin-top:14px">
      <div class="card"><div class="card-head"><h2>路径三选一</h2></div><div class="rows">
        ${row('手术', '早期、病灶局限；是否保留生育由医生评估')}
        ${row('根治性放化疗', '局部晚期常用；含外照射 + 后装')}
        ${row('系统治疗', '复发 / 转移时；方案按医生给')}
      </div><div class="notice">这一段是路径说明，不是给你的选择建议。</div></div>
      <div class="card"><div class="card-head"><h2>治疗线</h2></div><div class="rows">
        ${p.lines.map(l => row(esc(l.name), esc(l.detail), l.done ? pill('已完成', 'green') : pill('进行中', 'yellow'))).join('')}
      </div></div>
    </div>`;
  }
  if (sub === 1) {
    if (!p.surgery) {
      return `${pageHead(true)}${emptyBox('没有手术记录', '这个档案走的是根治性放化疗路径，未做手术；如果以后做了手术，在这里记术式、范围、切缘与淋巴清扫。')}
      <div class="card"><div class="card-head"><h2>为什么"没手术"也要说清楚</h2></div>
      <div class="rows">${row('当前路径', esc(p.path[2]))}${row('医生原话', esc(p.pathway ? p.pathway.rows[0][4] : ''))}</div></div>`;
    }
    return `${pageHead(true)}<div class="card"><div class="card-head"><h2>${esc(p.surgery.title)}</h2></div>
      <div class="table-wrap"><table class="cycle-table"><thead><tr><th>日期</th><th>术式</th><th>入路</th><th>淋巴清扫</th><th>切缘</th><th>机构</th></tr></thead><tbody>
      ${p.surgery.rows.map(r => `<tr><td>${esc(r[0])}</td><td><b>${esc(r[1])}</b></td><td>${esc(r[2])}</td><td>${esc(r[3])}</td><td>${esc(r[4])}</td><td>${esc(r[5])}</td></tr>`).join('')}
      </tbody></table></div>
      <div class="rows">${p.surgery.rows.map(r => row('手术备注', esc(r[6]))).join('')}</div>
      <div class="notice">只记做了什么，不评价"做得够不够"；术式选择与切缘判断以手术记录和病理报告为准。</div></div>`;
  }
  if (sub === 2) {
    if (!p.rt) {
      return `${pageHead(true)}${emptyBox('没有放疗记录', '这个档案走的是手术路径，未做放疗。')}`;
    }
    const ebrt = p.rt.rows.filter(r => r[0] === 'EBRT');
    const brachy = p.rt.rows.filter(r => r[0] === '后装');
    return `${pageHead(true)}
    <div class="notice"><b>外照射与后装分两列记，不合成"总剂量"。</b>两者剂量学不能直接相加，合成一个数会误导。</div>
    <div class="grid">
      <div class="card"><div class="card-head"><h2>外照射（EBRT）</h2>${pill('体外照射', 'violet')}</div>
        <div class="rows">${ebrt.map(r => row(`${esc(r[1])} → ${esc(r[2])}`, `${esc(r[3])} · ${esc(r[4])}<br><span class="muted">${esc(r[5])}</span>`)).join('')}</div></div>
      <div class="card"><div class="card-head"><h2>近距离治疗（后装）</h2>${pill('腔内照射', 'violet')}</div>
        <div class="rows">${brachy.map(r => row(`${esc(r[1])} → ${esc(r[2])}`, `${esc(r[3])} · ${esc(r[4])}<br><span class="muted">${esc(r[5])}</span>`)).join('')}</div></div>
    </div>
    <div class="card"><div class="card-head"><h2>疗程备注</h2></div><div class="rows">
      ${p.rt.rows.map(r => row(`${esc(r[0])} · ${esc(r[1])}`, esc(r[6]))).join('')}
    </div></div>
    <div class="card"><div class="card-head"><h2>分次记录（${p.cycles.filter(c => c[0].startsWith('后装')).length} 次后装）</h2></div>
      <div class="table-wrap"><table class="cycle-table"><thead><tr><th>分次</th><th>日期</th><th>说明</th><th>状态</th></tr></thead><tbody>
      ${p.cycles.filter(c => c[0].startsWith('后装')).map(c => `<tr><td>${esc(c[0])}</td><td>${esc(c[1])}</td><td>${esc(c[2])}</td><td>${pill(c[3], 'green')}</td></tr>`).join('')}
      </tbody></table></div></div>`;
  }
  return `${pageHead(true)}<div class="card"><div class="card-head"><h2>系统治疗与周期</h2><span class="muted">${p.cycles.length} 条记录</span></div>
    <div class="table-wrap"><table class="cycle-table"><thead><tr><th>周期</th><th>日期</th><th>方案 / 说明</th><th>状态</th></tr></thead><tbody>
    ${p.cycles.map(c => `<tr><td>${esc(c[0])}</td><td>${esc(c[1])}</td><td>${esc(c[2])}</td><td>${pill(c[3], c[4] ? 'green' : 'yellow')}</td></tr>`).join('')}
    </tbody></table></div>
    <div class="notice">方案与剂量按医嘱原文抄录；调整或停药由医生决定，工作台不提供建议。</div></div>`;
}

/* ---------------- 性与生育 ---------------- */
function privateGate(what) {
  if (state.privateOpen) return '';
  return `<div class="notice"><b>${esc(what)}默认私密。</b>不进导出、不进看板摘要；点下面的按钮才会在本页展开。</div>
    <div class="actions"><button data-action="toggle-private">${state.privateOpen ? '收起私密内容' : '本人确认，展开查看'}</button></div>`;
}
function vFertility() {
  const p = P(), sub = state.sub.fertility || 0;
  if (sub === 0) {
    return `${pageHead(true)}
    <div class="notice"><b>生育是记录，不是承诺。</b>这里只存"你说了什么、医生答了什么原文"，不判断还能不能生。</div>
    ${p.fertility ? `<div class="card"><div class="card-head"><h2>${esc(p.fertility.title)}</h2></div>
      <div class="rows">${p.fertility.rows.map(r => row(esc(r[0]), `${esc(r[1])}<br><span class="muted">${esc(r[2])}</span>`)).join('')}</div></div>`
      : emptyBox('还没有生育档案', '如果生育计划对你有意义，在这里记下医生谈过什么。')}
    <div class="grid" style="margin-top:14px">
      <div class="card"><div class="card-head"><h2>保留生育的几种术式</h2></div><div class="rows">
        ${row('冷刀锥切 / LEEP', '切除部分宫颈，保留子宫体')}
        ${row('根治性宫颈切除', '切除宫颈与宫旁，保留子宫体')}
        ${row('卵巢移位', '放疗前把卵巢移出照射野（是否做由医生定）')}
      </div><div class="notice">这是术式对照，不是"你适合哪种"的建议。</div></div>
      <div class="card"><div class="card-head"><h2>可以问医生</h2></div><div class="rows">
        ${row('怀孕的时间窗', '术后多久可以开始尝试，需要先做哪些评估')}
        ${row('产科怎么配合', '将来怀孕是否按高危妊娠管理、在哪家医院产检')}
      </div><div class="actions"><button data-action="add-question">加入复诊清单</button></div></div>
    </div>`;
  }
  if (sub === 1) {
    if (!p.fertSurgery) {
      return `${pageHead(true)}${emptyBox('没有生育保留手术记录', '这个档案没有做保留生育的术式；如做过锥切或根治性宫颈切除，在这里记术式与医生写的随访要求。')}`;
    }
    return `${pageHead(true)}
    <div class="card"><div class="card-head"><h2>${esc(p.fertSurgery.title)}</h2>${pill('含随访要求原文', 'violet')}</div>
      <div class="rows">${p.fertSurgery.rows.map(r => row(`${esc(r[0])} · ${esc(r[1])}`, `${esc(r[2])}<br><span class="muted">${esc(r[3])}</span>`)).join('')}</div></div>
    <div class="card"><div class="card-head"><h2>随访要求（医生原话，不改写）</h2></div>
      <div class="rows">${p.fertSurgery.rows.map(r => row('原文', esc(r[4]))).join('')}</div>
      <div class="notice">具体日期以门诊预约为准；工作台不把"每 3 个月"换算成提醒时间。</div></div>`;
  }
  if (sub === 2) {
    return `${pageHead(true)}
    ${p.ovary ? `<div class="card"><div class="card-head"><h2>${esc(p.ovary.title)}</h2></div>
      <div class="rows">${p.ovary.rows.map(r => row(`${esc(r[0])} · ${esc(r[1])}`, `${esc(r[2])}${r[3] ? '<br><span class="muted">' + esc(r[3]) + '</span>' : ''}`)).join('')}</div></div>`
      : emptyBox('没有卵巢功能记录', '化疗或放疗前后查过 FSH / AMH 的话，在这里记数值与医生结论。')}
    <div class="card"><div class="card-head"><h2>月经情况</h2><span class="muted">本人记录，不是医生评估</span></div>
      <div class="rows">${(M().menses ? M().menses.points.slice().reverse() : []).map(pt => row(esc(pt.d), esc(pt.v))).join('') || '<p class="muted" style="padding:12px">未记录。</p>'}</div>
      <div class="actions"><button data-action="add-fertility">记一次月经情况</button></div></div>`;
  }
  const rows = p.sexual ? p.sexual.rows : [];
  return `${pageHead(true)}
  ${privateGate('性健康记录')}
  ${state.privateOpen ? `<div class="card private"><div class="card-head"><h2>${esc(p.sexual.title)}</h2>${pill('私密 · 不进导出', 'grey')}</div>
    <div class="rows">${rows.length ? rows.map(r => row(`${esc(r[0])} · ${esc(r[1])}`, esc(r[2]))).join('') : '<p class="muted" style="padding:12px">还没有记录。</p>'}</div>
    <div class="notice">这里的内容不会被复制进"与 Agent 讨论"的上下文草稿，也不会出现在导出里。</div>
    <div class="actions"><button data-action="toggle-private">收起</button></div></div>`
    : `<div class="card"><div class="card-head"><h2>这一页记什么</h2></div><div class="rows">
      ${row('性交痛 / 干涩 / 出血', '按发生时间和自述记，不用判断原因')}
      ${row('顾虑', '比如"是不是以后都这样"，可以只写一句')}
      ${row('问医生的问题', '这类问题门诊常常问不出口，写下来递过去也行')}
    </div><div class="notice">是否记录、是否给医生看，都由你决定；工作台永远允许"完全跳过不填"。</div></div>`}`;
}

/* ---------------- 放疗与长期影响 ---------------- */
function vLate() {
  const p = P(), sub = state.sub.late || 0;
  if (sub === 0) {
    if (!p.lateEffects) return `${pageHead(true)}${emptyBox('没有放疗后事件记录', '这个档案未做放疗。')}`;
    return `${pageHead(true)}
    <div class="notice">分级抄医生记录的原话（如"1 级"）；没有分级就写"未分级"，<b>工作台不自己补分级</b>。</div>
    <div class="card"><div class="card-head"><h2>${esc(p.lateEffects.title)}</h2></div>
      <div class="table-wrap"><table class="cycle-table"><thead><tr><th>日期</th><th>系统</th><th>医生记录的分级</th><th>当时情况</th></tr></thead><tbody>
      ${p.lateEffects.rows.map(r => `<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td><td>${esc(r[2] || '未分级')}</td><td>${esc(r[3])}</td></tr>`).join('')}
      </tbody></table></div>
      <div class="actions"><button data-action="add-late">记一条今天的情况</button></div></div>
    <div class="grid" style="margin-top:14px">
      <div class="card"><div class="card-head"><h2>什么时候该联系门诊</h2></div><div class="rows">
        ${row('腹泻带血或发热', '按医生给的联系方式问，不要等下次门诊')}
        ${row('尿痛伴发热', '同上')}
        ${row('单侧腿突然肿起来', '先联系门诊，不要自行按摩或热敷')}
      </div><div class="notice">这里是"什么情况该找人"，不是自我处理方案。</div></div>
      <div class="card"><div class="card-head"><h2>就诊时怎么展示</h2></div><div class="rows">
        ${row('按时间倒序', '最近一次在最上面，医生一眼看到变化')}
        ${row('带上原始报告', '分级与结论以报告为准')}
      </div><div class="actions"><button data-action="export-review">整理成就诊清单</button></div></div>
    </div>`;
  }
  if (sub === 1) {
    if (!p.lymphedema) return `${pageHead(true)}${emptyBox('没有淋巴水肿记录', '如果出现腿肿，在这里按日期与测量部位记周径差。')}`;
    return `${pageHead(true)}
    <div class="notice">按测量部位记周径差；压力袜的压力值以处方为准，工作台不推荐型号。</div>
    <div class="card"><div class="card-head"><h2>${esc(p.lymphedema.title)}</h2></div>
      <div class="table-wrap"><table class="cycle-table"><thead><tr><th>日期</th><th>部位</th><th>医生分期</th><th>测量</th><th>备注</th></tr></thead><tbody>
      ${p.lymphedema.rows.map(r => `<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td><td>${esc(r[2] || '—')}</td><td>${esc(r[3])}</td><td>${esc(r[4])}</td></tr>`).join('')}
      </tbody></table></div></div>`;
  }
  if (sub === 2) {
    if (!p.vagina) return `${pageHead(true)}${emptyBox('没有阴道扩张记录', '这个档案未做放疗。')}`;
    const pub = p.vagina.rows.filter(r => r[4]);
    const open = p.vagina.rows.filter(r => !r[4]);
    return `${pageHead(true)}
    <div class="card"><div class="card-head"><h2>医嘱与狭窄程度</h2><span class="muted">不含本人自述</span></div>
      <div class="rows">${open.map(r => row(`${esc(r[0])} · ${esc(r[1])}`, `${esc(r[2])}<br><span class="muted">${esc(r[3])}</span>`)).join('')}</div></div>
    ${privateGate('扩张训练记录')}
    ${state.privateOpen ? `<div class="card private"><div class="card-head"><h2>扩张训练记录</h2>${pill('私密 · 不进导出', 'grey')}</div>
      <div class="rows">${pub.map(r => row(`${esc(r[0])} · ${esc(r[1])}`, `${esc(r[2])}<br><span class="muted">${esc(r[3])}</span>`)).join('')}</div>
      <div class="actions"><button data-action="toggle-private">收起</button></div></div>` : ''}`;
  }
  return `${pageHead(true)}
  ${p.menopause ? `<div class="card"><div class="card-head"><h2>${esc(p.menopause.title)}</h2><span class="muted">症状表</span></div>
    <div class="rows">${p.menopause.rows.map(r => row(`${esc(r[0])} · ${esc(r[1])}`, `${esc(r[2])}${r[3] ? ' · ' + esc(r[3]) : ''}`)).join('')}</div></div>` : emptyBox('没有绝经症状记录', '治疗诱导绝经的潮热、盗汗、失眠可以按日期记。')}
  <div class="card"><div class="card-head"><h2>用药与骨健康医嘱</h2><span class="muted">与症状表分开两列，不合并</span></div>
    <div class="rows">${(p.hormone || []).map(r => row(`${esc(r[0])}`, `${esc(r[1])}<br><span class="muted">${esc(r[2])} → ${esc(r[3] || '至今')} · ${esc(r[4])}</span>`)).join('') || '<p class="muted" style="padding:12px">暂无医嘱记录。</p>'}</div>
    <div class="notice">激素替代是否适用、用哪种，由医生结合病情判断；这里只留医嘱原文。</div></div>`;
}

/* ---------------- 检查与指标 ---------------- */
function metricSections(cats) {
  return cats.map((c) => {
    const items = Object.entries(M()).filter(([, m]) => m.cat === c);
    if (!items.length) return '';
    return `<div class="metric-group"><div class="metric-group-head"><h3>${esc(c)}</h3><span>${items.length} 项</span></div>
      <div class="metric-grid">${items.map(([k, m]) => mcard(k, m)).join('')}</div></div>`;
  }).join('');
}
function vLabs() {
  const p = P(), sub = state.sub.labs || 0;
  if (sub === 0) {
    return `${pageHead(true)}
    <div class="notice">${esc(p.histology)}档案：${p.histology === '鳞癌' ? 'SCC-Ag 是主线指标；CEA 对鳞癌不特异，本档案不登记' : '腺癌不看 SCC-Ag，用 CEA / CA125'}；单次波动不等于病情变化。</div>
    ${metricSections(CAT_ORDER)}`;
  }
  if (sub === 1) {
    return `${pageHead(true)}
    <div class="notice"><b>只存报告原文。</b>界面不出现"正常 / 异常"的重判读；缩写（NILM、ASC-US…）照抄。</div>
    ${p.cytology ? `<div class="card"><div class="card-head"><h2>${esc(p.cytology.title)}</h2></div>
      <div class="table-wrap"><table class="cycle-table"><thead><tr><th>日期</th><th>方法</th><th>报告原文</th><th>备注</th></tr></thead><tbody>
      ${p.cytology.rows.map(r => `<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td><td>${esc(r[2])}</td><td>${esc(r[3])}</td></tr>`).join('')}
      </tbody></table></div></div>` : emptyBox('没有细胞学记录', '阴道残端细胞学按报告原文记。')}
    ${p.hpv ? `<div class="card"><div class="card-head"><h2>${esc(p.hpv.title)}</h2></div>
      <div class="rows">${p.hpv.rows.map(r => row(`${esc(r[0])} · ${esc(r[1])}`, `${esc(r[2])}<br><span class="muted">${esc(r[3])}</span>`)).join('')}</div></div>` : ''}
    <div class="card"><div class="card-head"><h2>这两项怎么看</h2></div>
      <div class="rows">${row('细胞学', '看报告上的描述与建议，随访间隔按医生安排')}${row('HPV', '型别与载量以报告为准；阳性不等于复发')}</div>
      <div class="notice">"阳性 / 阴性"的判断以报告结论为准，工作台不替你解读。</div></div>`;
  }
  return `${pageHead(true)}${p.imaging ? `<div class="card"><div class="card-head"><h2>${esc(p.imaging.title)}</h2></div>
    <div class="table-wrap"><table class="cycle-table"><thead><tr><th>日期</th><th>检查</th><th>报告结论（摘录）</th><th>下一次建议</th></tr></thead><tbody>
    ${p.imaging.rows.map(r => `<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td><td>${esc(r[2])}</td><td>${esc(r[3])}</td></tr>`).join('')}
    </tbody></table></div><div class="notice">结论摘录自报告；"下一次建议"是报告或医生写的原话，不是工作台的建议。</div></div>` : emptyBox('没有影像记录', '盆腔 MRI / CT / PET-CT 按日期逐次记。')}`;
}

/* ---------------- 一图秀 ---------------- */
function vTimeline() {
  const sub = state.sub.timeline || 0;
  const [t0, t1] = domain();
  const picks = CAT_ORDER.map((c) => {
    const items = Object.entries(M()).filter(([, m]) => m.cat === c);
    if (!items.length) return '';
    return `<div class="metric-pick"><span class="eyebrow">${esc(c)}</span>${items.map(([k, m]) =>
      `<label class="check-row"><input type="checkbox" data-pick="${k}" ${state.sel.includes(k) ? 'checked' : ''}><span>${esc(m.name)}</span></label>`).join('')}</div>`;
  }).join('');
  if (sub === 2) {
    return `${pageHead(true)}<div class="card"><div class="card-head"><h2>数据口径</h2></div><div class="rows">
      ${row('归一化', '每条数值线按自己的最小值–最大值铺满画布，所以"线的高低"不能跨指标比较')}
      ${row('分类序列', '阴道狭窄、淋巴水肿、腹泻分级只画节点、不连线；档位顺序是固定的严重度顺序')}
      ${row('单点', '只有 1 次记录的指标不连线，只画一个点')}
      ${row('治疗条', '周期带来自系统治疗记录；竖虚线是确诊 / 手术 / 分期这类评估节点')}
      ${row('数据来源', '演示数据由 demo/build-demo-data.mjs 生成，与 demo-data.sqlite 同源')}
    </div></div>`;
  }
  return `${pageHead(true)}
  <div class="chart-panel">
    <div class="chart-top">
      <div class="legend">${state.sel.filter(k => M()[k]).map(k => `<span class="line-chip"><i style="background:${M()[k].color}"></i>${esc(M()[k].name)}</span>`).join('')}</div>
      <div class="actions">
        <button class="soft" data-range="3m" ${state.range === '3m' ? 'aria-pressed="true"' : ''}>3 个月</button>
        <button class="soft" data-range="6m" ${state.range === '6m' ? 'aria-pressed="true"' : ''}>6 个月</button>
        <button class="soft" data-range="all" ${state.range === 'all' ? 'aria-pressed="true"' : ''}>全部</button>
      </div>
    </div>
    <div class="chart-wrap">${chartSVG(t0, t1)}</div>
    <div class="chart-tip">${state.pin ? (() => { const m = M()[state.pin.code]; const pt = m.points.find(p => p.d === state.pin.date); return pt ? `${esc(m.name)} · ${esc(pt.d)}：<b>${esc(String(pt.v))}</b>${m.unit ? ' ' + esc(m.unit) : ''}（${esc(pt.src || '—')}）` : ''; })() : '点图上的任意数据点，这里显示那次的数值与来源。'}</div>
  </div>
  <div class="grid">
    <div class="card"><div class="card-head"><h2>选择指标（最多 4 项）</h2></div>${picks}</div>
    <div class="card"><div class="card-head"><h2>显示选项</h2></div><div class="rows">
      <label class="check-row"><input type="checkbox" data-toggle="treatment" ${state.toggles.treatment ? 'checked' : ''} data-action="toggle" data-key="treatment"><span>显示治疗周期与评估节点</span></label>
      <label class="check-row"><input type="checkbox" data-toggle="keypoints" ${state.toggles.keypoints ? 'checked' : ''} data-action="toggle" data-key="keypoints"><span>显示末点数值</span></label>
    </div><div class="notice">分类序列的档位顺序在代码里写死（0 级 → 重度），不按出现顺序排。</div></div>
  </div>`;
}

/* ---------------- 营养 / 心理 / 复诊 ---------------- */
function vNutrition() {
  const p = P(), sub = state.sub.nutrition || 0;
  if (sub === 0) {
    return `${pageHead(true)}${p.nutrition ? `<div class="card"><div class="card-head"><h2>${esc(p.nutrition.title)}</h2></div>
      <div class="table-wrap"><table class="cycle-table"><thead><tr><th>日期</th><th>餐次</th><th>份量</th><th>吃了什么</th><th>症状</th></tr></thead><tbody>
      ${p.nutrition.rows.map(r => `<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td><td>${esc(r[2])}</td><td>${esc(r[3])}</td><td>${esc(r[4])}</td></tr>`).join('')}
      </tbody></table></div><div class="actions"><button data-action="add-meal">记一笔今天的进食</button></div>
      <div class="notice">份量按自述，不做热量换算；不给食谱。</div></div>` : emptyBox('没有进食记录', '放化疗期间吃得少是常见的事，记下来比凭记忆说更准。')}`;
  }
  return `${pageHead(true)}<div class="card"><div class="card-head"><h2>补充剂与医嘱</h2></div>
    <div class="rows">${(p.supplements || []).map(r => row(esc(r[0]), `${esc(r[1])}<br><span class="muted">${esc(r[2])} → ${esc(r[3] || '至今')} · ${esc(r[4])}</span>`)).join('') || '<p class="muted" style="padding:12px">暂无医嘱记录。</p>'}</div>
    <div class="notice">只留医嘱原文与起止；剂量调整请按医嘱。</div></div>`;
}

function vMind() {
  const p = P(), sub = state.sub.mind || 0;
  if (sub === 0) {
    return `${pageHead(true)}
    <div class="notice">这一页的内容<b>默认只属于你</b>；整理成上下文时会跳过具体感受原文。</div>
    <div class="card"><div class="card-head"><h2>我记下的感受</h2><span class="muted">不是医生结论</span></div>
      <div class="rows">${p.viewpoints.slice().reverse().map(v => row(`${esc(v[0])} · ${esc(v[1])}`, esc(v[2]))).join('')}</div>
      <div class="actions"><button data-action="add-viewpoint">记一条今天的感受</button></div></div>
    <div class="grid" style="margin-top:14px">
      <div class="card"><div class="card-head"><h2>常见的几种反应</h2></div><div class="rows">
        ${row('治疗结束后更累', '很多人都有，但持续加重值得跟医生说')}
        ${row('复查前一周紧张', '可以提前把想问的写下来，减少在诊室的慌乱')}
        ${row('不想解释', '可以只告诉家人"今天不想聊"，不需要理由')}
      </div></div>
      <div class="card"><div class="card-head"><h2>想找人说话时</h2></div><div class="rows">
        ${row('门诊心理支持', '问主诊医生能不能转介')}
        ${row('病友群', '只听不说是可以的')}
      </div><div class="notice">工作台不推荐具体机构或咨询师。</div></div>
    </div>`;
  }
  if (sub === 1) {
    return `${pageHead(true)}
    <div class="notice">身体形象与亲密关系的问题很具体，也很少有人说出口；这里只提供记录位。</div>
    <div class="card"><div class="card-head"><h2>可以记什么</h2></div><div class="rows">
      ${row('对身体的感受', '比如"不想照镜子""觉得不是自己了"')}
      ${row('和伴侣的距离', '回避、争吵、或者反而更亲近，都可以写')}
      ${row('想问但没问的', '写下来，下次门诊递过去也行')}
    </div><div class="actions"><button data-action="add-viewpoint">记一条</button><button class="soft" data-action="go-fertility">性健康（私密）→</button></div></div>`;
  }
  return `${pageHead(true)}
  <div class="card"><div class="card-head"><h2>母亲身份与家庭沟通</h2></div>
    <div class="rows">${row('我和家人的约定', esc(p.familyTalk))}${row('孩子知道多少', '按年龄决定说到哪一步，是很多家庭的实际做法')}${row('不想让孩子知道的', '可以不写；写了也不会进导出')}</div>
    <div class="actions"><button data-action="add-viewpoint">记一条</button></div></div>
  <div class="card"><div class="card-head"><h2>可以这样开口</h2></div><div class="rows">
    ${row('对孩子', '"妈妈在治一个病，会累一点，但不是你的错"')}
    ${row('对伴侣', '"我现在不想谈这个，等我想说的时候会告诉你"')}
    ${row('对父母', '"检查结果我知道后会告诉你们，不用一直问"')}
  </div><div class="notice">这些是句式参考，不是"应该怎么说"的标准答案。</div></div>`;
}

function vReview() {
  const p = P(), sub = state.sub.review || 0;
  /* 导出入口提到页面级：停在哪个子页签都能整理这份清单，
     里面第一段就是"最近几次的变化"，不必回「就诊准备」才找得到。 */
  const exportBar = `<div class="actions" style="margin:0 0 12px"><button data-action="export-review">整理成复诊清单（含最近的变化）</button></div>`;
  if (sub === 0) {
    return `${pageHead(true)}${exportBar}<div class="card"><div class="card-head"><h2>复诊节奏（医生安排）</h2></div>
      <div class="table-wrap"><table class="cycle-table"><thead><tr><th>项目</th><th>频率</th><th>依据</th><th>下一次</th></tr></thead><tbody>
      ${p.rhythm.map(r => `<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td><td>${esc(r[2])}</td><td>${esc(r[3])}</td></tr>`).join('')}
      </tbody></table></div>
      <div class="notice">"下一次"是估算的门诊时间，以实际预约为准。</div></div>
    <div class="card"><div class="card-head"><h2>最近一次就诊带了什么</h2></div><div class="rows">
      ${row('带了', '病理报告、最近一次影像报告、用药清单')}
      ${row('没带但下次要带', '激素与细胞学报告原件')}
    </div></div>`;
  }
  if (sub === 1) {
    const cy = p.cytology ? p.cytology.rows[0] : null;
    const hp = p.hpv ? p.hpv.rows[0] : null;
    const im = p.imaging ? p.imaging.rows[0] : null;
    return `${pageHead(true)}${exportBar}
    <div class="notice">三类随访节点并排看：细胞学、HPV、影像；各自的下一次时间以医生安排为准。</div>
    <div class="grid">
      <div class="card"><div class="card-head"><h2>细胞学</h2></div><div class="rows">${cy ? row(esc(cy[0]), esc(cy[2])) : row('—', '未记录')}</div></div>
      <div class="card"><div class="card-head"><h2>HPV</h2></div><div class="rows">${hp ? row(esc(hp[0]), esc(hp[2])) : row('—', '未记录')}</div></div>
      <div class="card"><div class="card-head"><h2>影像</h2></div><div class="rows">${im ? row(`${esc(im[0])} · ${esc(im[1])}`, `${esc(im[2])}<br><span class="muted">下一次：${esc(im[3])}</span>`) : row('—', '未记录')}</div></div>
    </div>
    <div class="card"><div class="card-head"><h2>时间线</h2></div><div class="rows">
      ${p.rhythm.filter(r => /细胞学|HPV|MRI|CT|影像/.test(r[0])).map(r => row(esc(r[0]), `${esc(r[1])} · 下一次 ${esc(r[3])}`)).join('')}
    </div></div>`;
  }
  if (sub === 2) {
    if (!p.screening) return `${pageHead(true)}${exportBar}${emptyBox('没有筛查档案', '本人筛查史、疫苗记录可以记在这里。')}`;
    const byKind = ['本人筛查史', '疫苗记录', '家属可讨论问题'].map(k => {
      const rows = p.screening.rows.filter(r => r[0] === k);
      return rows.length ? `<div class="card"><div class="card-head"><h2>${esc(k)}</h2></div><div class="rows">${rows.map(r => row(esc(r[1]), `${esc(r[2])}${r[3] ? ' · ' + esc(r[3]) : ''}`)).join('')}</div></div>` : '';
    }).join('');
    return `${pageHead(true)}${exportBar}<div class="notice">这一页只放<b>本人档案与"可以问的问题"</b>；不给疫苗接种建议，也不给家属做筛查建议。</div>${byKind}`;
  }
  const qs = state.questions || [];
  /* 导出入口提到页面级：无论停在哪个子页签都能整理这份清单，
     里面第一段就是"最近几次的变化"，不用回「就诊准备」才找得到。 */
  return `${pageHead(true)}${exportBar}
  <div class="card"><div class="card-head"><h2>就诊准备</h2><span class="muted">打印或手机备忘都行</span></div>
    <div class="rows">
      ${row('最想问的一条', p.mindset)}
      ${row('带什么', '病理报告 · 最近影像 · 用药清单 · 这份清单')}
      ${row('最近的变化', `${p.lateEffects ? p.lateEffects.rows[0][1] + '：' + p.lateEffects.rows[0][3] : '按实际记'}`)}
    </div><div class="actions"><button class="soft" data-action="add-question">加一个问题</button></div></div>
  <div class="card"><div class="card-head"><h2>我的问题清单（${qs.length}）</h2></div>
    <div class="rows">${qs.length ? qs.map(q => row(esc(q), '', `<button class="soft" data-action="toggle-ask">标记已问</button>`)).join('') : '<p class="muted" style="padding:12px">还没有问题；上面点"加一个问题"会放一条示例。</p>'}</div></div>`;
}

/* ---------------- 临床研究 ---------------- */
function vTrials() {
  const sub = state.sub.trials || 0;
  if (sub === 1) {
    const saved = TRIALS.filter(t => state.saved.includes(t.id));
    return `${pageHead(true)}${saved.length ? `<div class="card"><div class="card-head"><h2>已收藏（${saved.length}）</h2></div><div class="rows">
      ${saved.map(t => row(esc(t.title), `${esc(t.id)} · ${esc(t.phase)} · ${esc(t.status)} · ${esc(t.sponsor)}`,
        `<button class="soft" data-action="save-trial" data-id="${esc(t.id)}">取消收藏</button>`)).join('')}</div></div>`
      : emptyBox('还没有收藏', '在「2026 线索」里点"收藏"，会出现在这里。')}`;
  }
  if (sub === 2) {
    const qs = (state.questions || []).filter(q => /NCT/.test(q));
    return `${pageHead(true)}
    <div class="notice">登记状态 ≠ 入组资格；下面这些问题拿去问研究中心，比在网上找答案可靠。</div>
    <div class="card"><div class="card-head"><h2>通用入组问题</h2></div><div class="rows">
      ${row('我的分期和既往治疗符合吗', '带上 FIGO 分期、病理类型、既往方案与结束日期')}
      ${row('需要重新做检查吗', '有些试验要求本院影像或病理复核')}
      ${row('对照臂是什么', '随机对照试验要问清楚"如果分到对照组"用什么')}
      ${row('来回路程与随访频率', '能不能配合，直接决定要不要报名')}
    </div></div>
    <div class="card"><div class="card-head"><h2>已加入清单（${qs.length}）</h2></div>
      <div class="rows">${qs.length ? qs.map(q => row(esc(q), '')).join('') : '<p class="muted" style="padding:12px">还没有具体试验的问题。</p>'}</div></div>`;
  }
  const topics = ['全部', ...Array.from(new Set(TRIALS.map(t => t.topic)))];
  const list = TRIALS.filter(t => state.trialTopic === '全部' || t.topic === state.trialTopic);
  return `${pageHead(true)}
  <div class="notice">线索不是推荐：登记信息可能滞后，<b>状态与入排标准以研究中心为准</b>。数据来源 ClinicalTrials.gov，
    采集窗口 2026-01-01 → 2026-10-21（首次公示），最后核对 2026-10-21。</div>
  <div class="chips" role="group" aria-label="按关注点筛选">
    ${topics.map(t => `<button class="chip${state.trialTopic === t ? ' on' : ''}" data-topic="${esc(t)}">${esc(t)}</button>`).join('')}
  </div>
  <div class="rows">${list.map(t => `<div class="card topic-card">
    <div class="card-head"><h2>${esc(t.title)}</h2><span class="muted">${esc(t.id)}</span></div>
    <div class="chips">${pill(t.phase, 'violet')}${pill(t.status, t.status.includes('招募') ? 'green' : 'grey')}${pill(t.topic, 'grey')}</div>
    <p class="muted" style="margin-top:8px">申办 / 登记单位：${esc(t.sponsor)} · 最后核对 ${esc(t.last_verified)}</p>
    <div class="actions"><button data-action="save-trial" data-id="${esc(t.id)}">${state.saved.includes(t.id) ? '取消收藏' : '收藏'}</button>
      <button class="soft" data-action="ask-trial" data-id="${esc(t.id)}">加进入组问题</button>
      <a class="source-link" href="${esc(t.url)}" target="_blank" rel="noopener">登记页 ↗</a></div>
  </div>`).join('')}</div>`;
}

const VIEWS = { dashboard: vDashboard, records: vRecords, stage: vStage, treatment: vTreatment, fertility: vFertility, late: vLate, labs: vLabs, timeline: vTimeline, nutrition: vNutrition, mind: vMind, review: vReview, trials: vTrials };

/* ---------------- agent dock（dsh 原生会话挂载位） ---------------- */
/* 越界词自检清单：下面是"要被拦住的词表"本身，不是给用户看的文案。 */
const FORBIDDEN = ['建议治疗', '可能复发', '预后良好', '治愈率', '可以停药', '无需就医', '推荐方案', '生存率']; // wording-allow
const PAGE_CONTEXT = {
  dashboard: () => ({ facts: [`${P().name}：${P().headline}`,
    `FIGO 分期：${P().stage}（医生给出）`,
    P().lateEffects ? `最近一次放疗后事件：${P().lateEffects.rows[0][1]} ${P().lateEffects.rows[0][2]}（${P().lateEffects.rows[0][0]}）` : '暂无放疗后事件',
    P().lymphedema ? `最近一次腿围记录：${P().lymphedema.rows[0][3]}（${P().lymphedema.rows[0][0]}）` : '暂无腿围记录'],
    missing: ['下次复查的具体日期', '最近的进食量记录'] }),
  records: () => ({ facts: [`资料库 ${DOCS[state.profile].length} 份；待核对候选 ${CANDS[state.profile].filter(c => c.status !== 'accepted').length} 条`], missing: [] }),
  stage: () => ({ facts: [`FIGO 2018：${P().stage}`, ...(P().figo ? P().figo.rows.map(r => `${r[0]}：${r[1]}`) : []),
    ...P().molecular.map(x => `${x.k}：${x.v}（${x.src}）`)],
    missing: P().molecular.filter(x => x.state === 'na').map(x => `${x.k} 检测状态`) }),
  /* facts 必须是数组字面量：多来源一律用 spread 展开，不能"先 map 再 spread"（曾导致 `Unexpected token ']'`）。 */
  treatment: () => ({ facts: [...(P().pathway ? P().pathway.rows.map(r => `${r[0]}路径：${r[1]}（${r[2]}）`) : []),
    ...(P().rt ? P().rt.rows.map(r => `${r[0]}：${r[3]}（${r[1]} → ${r[2]}）`) : [])], missing: ['下次评估的具体结论'] }),
  /* 私密模块不进上下文草稿：只写"有几条记录被本人设为私密"，不带原文（A4）。 */
  fertility: () => ({ facts: [...(P().fertility ? P().fertility.rows.map(r => `${r[0]}：${r[1]}`) : []),
    ...(P().fertSurgery ? P().fertSurgery.rows.map(r => `生育保留术式：${r[1]}`) : []),
    `性健康记录：${(P().sexual ? P().sexual.rows.length : 0)} 条（默认私密，不进入草稿）`],
    missing: ['卵巢功能与月经的下一次复查安排'] }),
  late: () => ({ facts: [...(P().lateEffects ? P().lateEffects.rows.map(r => `${r[0]} ${r[1]}：${r[2] || '未分级'}，${r[3]}`) : []),
    ...(P().lymphedema ? P().lymphedema.rows.map(r => `${r[0]} 腿围：${r[3]}`) : []),
    `阴道扩张训练记录：${(P().vagina ? P().vagina.rows.filter(r => r[4]).length : 0)} 条（私密，不进入草稿）`],
    missing: ['最近一次门诊对这些情况的原话'] }),
  labs: () => ({ facts: Object.values(M()).filter(m => m.points && m.points.length).map(m => `${m.name} 最近：${String(m.points.slice(-1)[0].v)}（${m.points.slice(-1)[0].d}）`),
    missing: [M().scc ? 'SCC-Ag 与影像的对照结论' : 'CEA 与影像的对照结论'] }),
  timeline: () => ({ facts: ['一图秀当前勾选：' + state.sel.map(k => M()[k].name).join('、')], missing: [] }),
  nutrition: () => ({ facts: [...(P().nutrition ? P().nutrition.rows.slice(0, 3).map(r => `${r[0]} ${r[1]}：${r[2]}，${r[3]}，症状：${r[4]}`) : [])],
    missing: ['营养门诊的下一次安排'] }),
  mind: () => ({ facts: ['本页内容默认私密，提示词不携带具体感受原文'], missing: [] }),
  review: () => ({ facts: P().rhythm.map(r => `${r[0]}：${r[1]}（${r[2]}）`), missing: ['想问清单中 1 条待确认'] }),
  trials: () => ({ facts: ['2026 线索共 ' + TRIALS.length + ' 条（真实登记摘录，状态未核实）'], missing: [] })
};

function buildPrompt() {
  const ctx = PAGE_CONTEXT[state.view]();
  const title = PAGES.find(p => p[0] === state.view)[1];
  return [`【来自小莲宝工作台 · ${title}页】`, `档案：${P().name}（${P().meta}）——演示数据`, '',
    '本页已核对的事实：', ...ctx.facts.map(f => '- ' + f), '',
    '尚未核对 / 待确认：', ...(ctx.missing.length ? ctx.missing.map(f => '- ' + f) : ['- （无）']), '',
    '边界：以上是记录整理，不是医疗建议；请基于原文与医生沟通，不要求工作台外推结论。'].join('\n');
}
function mockReply() {
  return '根据你整理的本页事实：分期与治疗路径都有医生给出的依据，随访节奏也记录在案。你提到的未确认事项（下次影像日期、最近一次门诊原话），适合在下次门诊清单里逐条确认。本回复不构成医疗建议。';
}
function renderAgent() {
  const dock = $('#agent-dock'), grid = $('#work-grid'), btn = $('#agent-toggle');
  dock.hidden = !state.agentOpen;
  grid.classList.toggle('agent-open', state.agentOpen);
  grid.classList.toggle('agent-wide', state.agentOpen && state.agentSize === 'wide');
  btn.setAttribute('aria-expanded', String(state.agentOpen));
  $('#agent-state').textContent = state.agentOpen ? '已打开' : '未进入激活';
  $('#agent-toggle i').classList.toggle('grey', !state.agentOpen);
  $('#agent-toggle i').classList.toggle('on', state.agentOpen);
  $('#agent-dot').classList.toggle('on', state.agentOpen);
  $$('.agent-sizes button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.size === state.agentSize)));
  const body = $('#agent-body');
  if (!body.dataset.built) {
    body.innerHTML = `<div class="agent-note"><b>dsh 原生会话挂载位</b><br>原生会话仅在 DSH Desktop 内可用；当前为浏览器预览，这里保留宿主会话的挂载点（#dsh-conversation-slot），不模拟聊天窗口。</div>
      <div id="dsh-conversation-slot" aria-live="polite"></div>`;
    body.dataset.built = '1';
  }
}
function agentBuild() {
  const slot = $('#dsh-conversation-slot');
  slot.innerHTML = `<div class="agent-card"><h4>提示词预览（发送前可读 · 由你在宿主会话发送）</h4><pre>${esc(buildPrompt())}</pre></div>`;
}
function agentDemo() {
  const slot = $('#dsh-conversation-slot');
  const text = mockReply();
  const hits = FORBIDDEN.filter(w => text.includes(w));
  slot.innerHTML = `<div class="agent-card"><h4>模拟回复 · 红线自检</h4><pre>${esc(text)}</pre>
    <div class="agent-check">${hits.length ? hits.map(h => `<span class="hit">命中禁用词：${esc(h)}</span>`).join('') : '<span class="pass">✓ 未命中禁用词表（' + FORBIDDEN.length + ' 项）</span><span class="pass">✓ 免责语句在否定语境中出现</span>'}</div></div>`;
}

/* ---------------- dialogs / toast ---------------- */
let toastTimer;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('visible'), 2200); }
function openDialog(eyebrow, title, body, foot = '') {
  $('#dialog-eyebrow').textContent = eyebrow; $('#dialog-title').textContent = title;
  $('#dialog-body').innerHTML = body; $('#dialog-foot').innerHTML = foot;
  $('#dialog').showModal();
  if (title === '设置') loadMineruStatus();
}
const closeDialog = () => $('#dialog').close();

function dlgProfiles() {
  openDialog('小莲宝', '切换演示档案', Object.entries(PROFILES).map(([k, p]) => `
    <button class="profile-row ${state.profile === k ? 'on' : ''}" data-pick-profile="${k}">
      <div><b>${esc(p.name)}的资料</b><p>${esc(p.meta)} · ${esc(p.headline)}</p></div><span class="profile-caret">${state.profile === k ? '当前' : '切换'}</span></button>`).join(''),
    '<button data-action="close">取消</button>');
}
/* ---- 文档解析设置：Token 状态与手工保存 ----
   状态只显示掩码与文件路径，原文不回显（服务端也不返回）。
   离线演示（DATA_SOURCE !== 'api'）如实说"不可用"，不假装已保存。 */
function mineruStatusText(s) {
  if (!s) return '读取 Token 状态失败：本机服务没有返回内容。';
  if (s.error) return `读取失败：${s.error}`;
  if (!s.configured) return '尚未配置 Token：扫描件与照片的自动识别会用不了；TXT / MD / CSV 仍在本机解析。';
  const where = s.source === 'file' ? `已保存于 ${s.file}` : '来自环境变量 MINERU_TOKEN（未写入文件）';
  return `当前生效：${s.masked} · ${where}`;
}
function loadMineruStatus() {
  const el = $('#mineru-status');
  if (!el) return;
  /* 原型里没有 DATA_SOURCE（那份是纯离线演示），用 typeof 兜住，两版共用同一段代码 */
  if (typeof DATA_SOURCE === 'undefined' || DATA_SOURCE !== 'api') { el.textContent = '离线演示：未连接工作台，读不到 Token 状态。'; return; }
  fetch(`${apiBase()}/api/cervical/settings/mineru`, { headers: { accept: 'application/json' } })
    .then((r) => r.json().then((j) => { if (!r.ok) throw new Error(j.message || j.error || '读取失败'); return j; }))
    .then((s) => { const n = $('#mineru-status'); if (n) n.textContent = mineruStatusText(s); })
    .catch((e) => { const n = $('#mineru-status'); if (n) n.textContent = `读取 Token 状态失败：${e.message}`; });
}
function mineruPost(payload) {
  const el = $('#mineru-status');
  if (typeof DATA_SOURCE === 'undefined' || DATA_SOURCE !== 'api') { toast('离线演示不能保存 Token'); return; }
  fetch(`${apiBase()}/api/cervical/settings/mineru`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload),
  })
    .then((r) => r.json().then((j) => { if (!r.ok) throw new Error(j.message || j.error || '保存失败'); return j; }))
    .then((s) => {
      if (el) el.textContent = mineruStatusText(s);
      const input = $('#mineru-token'); if (input) input.value = '';
      toast(payload.action === 'clear' ? '已清除本机 Token' : 'Token 已保存到本机密钥文件');
    })
    .catch((e) => {
      if (el) el.textContent = `保存失败：${e.message}`;
      toast('Token 保存失败');
    });
}
function dlgSettings() {
  openDialog('小莲宝', '设置', `<div class="cfg-tabs" role="tablist">
  <button role="tab" aria-selected="true" data-action="cfg-tab" data-tab="ws">资料目录</button><button role="tab" aria-selected="false" data-action="cfg-tab" data-tab="parse">文档解析</button><button role="tab" aria-selected="false" data-action="cfg-tab" data-tab="kb">临床数据库</button></div>
  <div class="cfg-block" style="margin-top:16px" data-tab="ws"><h3>工作区资料目录</h3><div class="path-row"><code>~/Documents/CerviPalWorkspace（演示值）</code><button class="soft">选择…</button></div>
  <p class="small-note">患者数据只存入你明确选择的目录；工作台不把资料上传云端。</p></div>
  <div class="cfg-block" style="margin-top:12px" data-tab="parse" hidden><h3>文档解析（MinerU）</h3>
  <div class="token-row"><input id="mineru-token" type="password" autocomplete="new-password" placeholder="粘贴 MinerU API Token（sk-…）" aria-label="MinerU API Token"><button class="primary" data-action="mineru-save">保存</button><button class="soft" data-action="mineru-clear">清除</button></div>
  <p class="small-note" id="mineru-status" role="status">正在读取本机 Token 状态…</p>
  <p class="small-note">Token 只写进本机密钥文件（权限 600），只用于向 MinerU 发起解析请求，不进患者资料、不进导出、不进提示词。没有 Token 可以到 <a href="https://mineru.net/apiManage/token" target="_blank" rel="noopener">MinerU 申请页 ↗</a> 领取；解析结果永远是候选，核对后才入档。</p></div>
  <div class="cfg-block" style="margin-top:12px" data-tab="kb" hidden><h3>2026 临床数据库</h3><div class="path-row"><code>cervical_cancer_trials_2026.sqlite · 158 条登记（演示摘录 14 条）</code></div>
  <p class="small-note">离线快照来自 CT.gov 在线通道；ChiCTR / 药物临床试验登记平台本轮未采集，覆盖未知。</p></div>`, '<button class="primary" data-action="close">完成</button>');
}
function dlgAbout() {
  openDialog('小莲宝', '关于', `<div class="about"><div class="brand no-mark" style="zoom:2.2"></div><div class="about-meta">
    <div class="about-ver"><b>v${APP_INFO.version}</b>${pill(APP_INFO.channelLabel, 'violet')}</div>
    <dl><div><dt>构建</dt><dd>${APP_INFO.build}</dd></div><div><dt>形态</dt><dd>交互原型（单机多文件）· 全部患者数据为模拟</dd></div>
    <div><dt>数据</dt><dd>2026 临床试验：真实登记摘录（ClinicalTrials.gov），状态未核实</dd></div>
    <div><dt>家族</dt><dd>小 X 宝家族 · CerviPal 小莲宝</dd></div></dl></div></div>`, '<button class="primary" data-action="close">关闭</button>');
}
function dlgHelp() {
  openDialog('小莲宝', '原型操作说明', `<div class="cfg-block">顶栏「AI 对话」按钮打开右侧<b>原生会话挂载位</b>（可 × 隐藏、窄/标准/宽三档）。「整理本页要点」生成发送前可读的提示词；「模拟回复自检」演示文本层红线扫描。</div>
  <div class="cfg-block" style="margin-top:12px">「检查与指标」「看板」里的数值卡<b>轻点翻面</b>看参考区间；分类记录（阴道狭窄、淋巴水肿、月经恢复）不翻面、不连线。「病情一图秀」左侧可勾选指标、按 3 / 6 个月或全部看。</div>
  <div class="cfg-block" style="margin-top:12px">左上角头像可切换<b>两个演示档案</b>：何秀云（宫颈鳞癌 IIIC1r · 根治性放化疗 + 后装 + 免疫维持）、林晓桐（宫颈腺癌 IB2 · 根治性宫颈切除保留子宫 · 术后随访）。</div>
  <div class="cfg-block" style="margin-top:12px"><b>私密内容</b>（性健康、扩张训练）默认折叠，需要本人点「本人确认，展开查看」；这些内容不进导出，也不进「与 Agent 讨论」的草稿。</div>`, '<button class="primary" data-action="close">知道了</button>');
}
function dlgExport() {
  const p = P();
  const md = ['# 复诊准备（演示导出）', '', `档案：${p.name}（${p.meta}）`, '', '## 事实区（已核对）',
    `- FIGO 2018 分期：${p.stage}（医生给出）`,
    ...p.rhythm.map(r => `- ${r[0]}：${r[1]}（${r[2]}）`),
    ...(p.lateEffects ? p.lateEffects.rows.slice(0, 3).map(r => `- ${r[0]} ${r[1]}：${r[2] || '未分级'}，${r[3]}`) : []),
    '', '## 想问的事 / 我的看法（不是医生结论）', '- （按页面勾选结果导出；私密条目默认不含）', '',
    '> 本文件由工作台整理，不构成医疗建议。'].join('\n');
  openDialog('小莲宝', '导出编辑（Markdown）', `
    <textarea id="export-edit" aria-label="导出内容，可直接编辑" style="width:100%;min-height:320px;font:12px/1.7 ui-monospace,SFMono-Regular,monospace;padding:12px;border:1px solid #d8e0ea;border-radius:10px;background:#fff;color:#213139;resize:vertical">${esc(md)}</textarea>
    <p class="small-note">直接在上方编辑；「我的看法」区永远带"不是医生结论"标注。私密记录不会出现在这里。</p>`,
    `<button class="soft" data-action="close">取消</button><button class="soft" data-action="export-download">下载 .md（完整版）</button><button class="primary" data-action="export-save">保存到资料目录</button>`);
  /* 接了库就用服务端那份：它比本地这段草稿完整，且「最近几次的变化」只有服务端算得出。
     演示态（apiBase 不通）保留上面的本地草稿，不假装有数据。 */
  if (DATA_SOURCE === 'api') {
    fetch(`${apiBase()}/api/cervical/export/${encodeURIComponent(state.profile)}.md`, { headers: { accept: 'text/markdown' } })
      .then(r => (r.ok ? r.text() : null))
      .then(text => {
        const ta = $('#export-edit');
        if (ta && text && document.body.contains(ta)) {
          ta.value = text;
          ta.dataset.source = 'server';
          ta.addEventListener('input', () => { ta.dataset.dirty = '1'; });
        }
      })
      .catch(() => {});
  }
}

/* ---------------- render root ---------------- */
function animateCountups(root) {
  if (!root || typeof root.querySelectorAll !== 'function' || typeof requestAnimationFrame !== 'function') return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const DUR = 650;
  root.querySelectorAll('[data-countup]').forEach((el) => {
    const target = parseFloat(el.dataset.countup);
    if (!isFinite(target)) return;
    const dec = el.dataset.dec === undefined ? 1 : +el.dataset.dec;
    const t0 = performance.now();
    const step = (t) => {
      const k = Math.min(1, (t - t0) / DUR);
      const ease = 1 - Math.pow(1 - k, 3);
      el.textContent = (target * ease).toFixed(dec);
      if (k < 1) requestAnimationFrame(step); else el.textContent = target.toFixed(dec);
    };
    el.textContent = (0).toFixed(dec);
    requestAnimationFrame(step);
  });
}

function render() {
  const p = P();
  $('#nav').innerHTML = PAGES.map(([id, label, ic]) => {
    const count = id === 'trials' ? TRIALS.length : null;
    return `<button class="nav-button" data-nav="${id}" ${state.view === id ? 'aria-current="page"' : ''}>${icon(ic)}<span>${esc(label)}</span>${count ? `<span class="nav-count">${count}</span>` : ''}</button>`;
  }).join('');
  $('#breadcrumb').textContent = PAGES.find(x => x[0] === state.view)[1];
  $('#profile-name').textContent = `${p.name}的资料`;
  $('#profile-meta').textContent = p.meta;
  $('#profile-avatar').textContent = p.name[0];
  $('#main').innerHTML = (VIEWS[state.view] || vDashboard)();
  $('#main').classList.remove('page-enter');
  animateCountups($('#main'));
  renderAgent();
  if (state.agentOpen) $('#agent-body').dataset.built = '';
}

/* ---------------- events ---------------- */
document.addEventListener('click', (e) => {
  const nav = e.target.closest('[data-nav]');
  if (nav) { state.view = nav.dataset.nav; state.privateOpen = false; /* 换页即收回私密展开：一次确认只管当页 */ location.hash = state.view; state.pin = null; render(); $('#main').focus({ preventScroll: true }); window.scrollTo(0, 0); return; }
  const sub = e.target.closest('[data-sub]');
  if (sub) { state.sub[state.view] = +sub.dataset.sub; state.privateOpen = false; render(); return; }
  const pick = e.target.closest('[data-pick]');
  if (pick) {
    const k = pick.dataset.pick;
    if (pick.checked) {
      if (state.sel.length >= 4) { pick.checked = false; toast('最多同时看 4 个指标；取消一个再加。'); return; }
      if (!state.sel.includes(k)) state.sel.push(k);
    } else {
      if (state.sel.length === 1) { pick.checked = true; toast('至少留一个指标。'); return; }
      state.sel = state.sel.filter(x => x !== k);
    }
    render(); return;
  }
  const topic = e.target.closest('[data-topic]');
  if (topic) { state.trialTopic = topic.dataset.topic; render(); return; }
  const pp = e.target.closest('[data-pick-profile]');
  if (pp) {
    state.profile = pp.dataset.pickProfile; state.sel = defaultSel(pp.dataset.pickProfile);
    state.pin = null; state.privateOpen = false; closeDialog(); render();
    toast(`已切换到 ${P().name}的资料（演示）`); return;
  }
  const card = e.target.closest('.mcard[data-mcard]');
  if (card && !card.dataset.static) { flipCard(card.dataset.mcard); return; }
  const act = e.target.closest('[data-action]')?.dataset.action;
  if (!act) return;
  const map = {
    profiles: dlgProfiles, settings: dlgSettings, about: dlgAbout, help: dlgHelp,
    close: closeDialog, 'open-store': () => toast('资料目录已激活（演示）'),
    'go-review': () => { state.view = 'review'; state.privateOpen = false; location.hash = 'review'; render(); },
    'go-labs': () => { state.view = 'labs'; state.privateOpen = false; location.hash = 'labs'; render(); },
    'go-timeline': () => { state.view = 'timeline'; state.privateOpen = false; location.hash = 'timeline'; render(); },
    'go-stage': () => { state.view = 'stage'; state.privateOpen = false; location.hash = 'stage'; render(); },
    'go-trials': () => { state.view = 'trials'; state.privateOpen = false; location.hash = 'trials'; render(); },
    'go-records': () => { state.view = 'records'; state.privateOpen = false; location.hash = 'records'; render(); },
    'go-nutrition': () => { state.view = 'nutrition'; state.privateOpen = false; location.hash = 'nutrition'; render(); },
    'go-mind': () => { state.view = 'mind'; state.privateOpen = false; location.hash = 'mind'; render(); },
    'go-late': () => { state.view = 'late'; state.privateOpen = false; location.hash = 'late'; render(); },
    'go-fertility': () => { state.view = 'fertility'; state.privateOpen = false; location.hash = 'fertility'; render(); },
    'toggle-private': () => { state.privateOpen = !state.privateOpen; render(); },
    source: (el) => {
      const d = el.dataset.doc ? DOCS[state.profile].find((x) => x.id === el.dataset.doc) : null;
      const line = d ? `${d.fileName || d.name}${d.size ? ` · ${fmtSize(d.size)}` : ''}（${d.date}）` : el.dataset.source || '原件存放在资料目录 imports/ 下';
      openDialog('小莲宝', '原文出处', `<p style="font-size:12.5px">${esc(line)}</p><p class="small-note">工作区不改动原文，也不替你解释它。</p>`, '<button class="primary" data-action="close">关闭</button>');
    },
    'pick-file': () => { const inp = $('#file-picker'); if (inp && typeof inp.click === 'function') inp.click(); else toast('当前浏览器不支持选择本机文件'); },
    'mineru-save': () => {
      const input = $('#mineru-token');
      const token = input ? input.value.trim() : '';
      if (!token) { toast('先把 Token 粘贴到输入框'); if (input) input.focus(); return; }
      mineruPost({ token });
    },
    'mineru-clear': () => mineruPost({ action: 'clear' }),
    'export-save': () => {
      const ta = $('#export-edit');
      const txt = ta ? ta.value.trim() : '';
      if (!txt) { toast('导出内容是空的；先填一点内容再保存。'); return; }
      if (DATA_SOURCE === 'api') {
        /* 真保存：写到 <资料目录>/exports/，服务端生成（页面上那段文字只是预览）。 */
        fetch(`${apiBase()}/api/cervical/export/${encodeURIComponent(state.profile)}.md/save`, { method: 'POST' })
          .then((r) => r.json())
          .then((j) => {
            if (j.error) throw new Error(j.message || j.error);
            closeDialog();
            toast(`已保存到 ${j.file}（${Math.round(j.bytes / 1024)} KB）`);
          })
          .catch((e) => toast(`保存失败：${e.message}`));
        return;
      }
      DOCS[state.profile].unshift({ id: 'ex' + Date.now().toString(36), name: `复诊准备 · ${P().name} · ${todayISO()}`, fileName: `复诊准备-${todayISO()}.md`, size: new Blob([txt]).size, date: todayISO(), type: '其他', status: '待核对', note: '生成文件 · 由导出创建，可在草稿里核对' });
      closeDialog();
      toast('已保存到资料目录 exports/（演示）；在「病情整理 · 资料库」可见');
    },
    'load-report': () => {
      if (state.parsing) return;
      if (state.loaded[state.profile]) { toast('模拟报告已载入，没有重复新增'); return; }
      state.parsing = true; state.parseError = false; render();
      setTimeout(() => {
        DOCS[state.profile].push({ id: 'dx' + state.profile, name: '复查记录 · 新模拟报告', date: '2026-10-18', type: '其他', status: '待核对' });
        CANDS[state.profile].push({ id: 'cx' + state.profile, name: '下次随访安排', value: '2027-01 前后（示例，以医生安排为准）', source: '复查记录 · 新模拟报告 · 第 1 页', status: 'candidate' });
        state.loaded[state.profile] = true; state.parsing = false;
        if (state.view === 'records') render();
        toast('解析完成：候选已放入「整理草稿 / 核对」');
      }, 900);
    },
    'parse-fail': () => {
      const d = DOCS[state.profile].find((x) => x.id === state.lastUpload);
      if (d) d.status = '解析失败';
      state.parseError = true; render();
      toast(d ? `「${d.name}」解析失败：未产生候选，原件保留，可重试` : '模拟解析失败：未产生候选，原件保留');
    },
    retry: () => { state.parseError = false; toast('模拟重试完成；原件始终保留'); render(); },
    candidate: (el) => {
      const c = CANDS[state.profile].find((x) => x.id === el.dataset.id);
      if (!c) return;
      openDialog('小莲宝', '核对这一项内容',
        `<div class="notice">核对表示"转录已逐字检查过"，不等于医学审核。</div>
        <label style="display:block;margin-top:10px"><span class="form-label">${esc(c.name)}</span><input id="cand-input" style="width:100%" value="${esc(c.value)}" maxlength="160"></label>
        <p class="small-note">来源：${esc(c.source)}。暂时不确定就保留待核对状态，不会丢。</p>`,
        `<button class="soft" data-action="close">现在先不核对</button><button class="primary" data-action="cand-save" data-id="${esc(c.id)}">接受这条记录</button>`);
    },
    'cand-save': (el) => {
      const c = CANDS[state.profile].find((x) => x.id === el.dataset.id);
      const v = $('#cand-input') ? $('#cand-input').value.trim() : '';
      if (c && v) { c.value = v; c.status = 'accepted'; }
      closeDialog(); render();
      if (DATA_SOURCE === 'api' && c) {
        /* 服务端只改候选状态（reviewed_by 留空）：接受 ≠ 医学审核。 */
        fetch(`${apiBase()}/api/cervical/candidate/${encodeURIComponent(state.profile)}/${encodeURIComponent(c.id)}/accept`, { method: 'POST' })
          .then(() => toast('已接受：候选状态写入工作台（核对≠医学审核）'))
          .catch(() => toast('已在本页标记接受；写入工作台失败，稍后重试'));
      } else {
        toast('已接受：写入演示数据库（record + 事实表），候选留版本不覆盖');
      }
    },
    'add-question': () => {
      const q = state.profile === 'A'
        ? '请帮我核实：盆腔淋巴结的分期依据（r 还是 p），以及后装结束后阴道扩张要维持多久。'
        : '请帮我核实：保留子宫后随访要做哪些项目、怀孕前需要先做哪些评估。';
      state.questions = state.questions || [];
      if (!state.questions.includes(q)) state.questions.push(q);
      render(); toast('已加入复诊准备的问题清单');
    },
    'add-stage': () => toast('分期变更需抄医生给出的新分期与依据；旧分期保留'),
    'add-late': () => toast('原型内不落库；真实版在这里记一条身体反应（日期 / 系统 / 医生原话）'),
    'add-fertility': () => toast('月经情况按本人记录写，不换算成量表'),
    'add-meal': () => toast('原型内不落库；真实版在这里记一笔进食（餐次 / 份量 / 症状）'),
    'add-viewpoint': () => toast('感受会记为"一条信息"，标注不是医生结论'),
    'export-nutrition': () => toast('就诊展示：最近 10 条进食记录 + 在用补充剂（演示）'),
    'export-review': dlgExport,
    /* 真导出：服务端按档案生成完整 markdown（私密分节一律不写，见 dsh/export.js 约束 1）。
       用户在预览框里手改过就下改过的那份，不能"看着改了、下下来还是原文"。 */
    'export-download': () => {
      const ta = $('#export-edit');
      if (ta && ta.dataset.source === 'server' && ta.dataset.dirty === '1') {
        const blob = new Blob([ta.value], { type: 'text/markdown;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `复诊准备-${P().name}-${new Date().toISOString().slice(0, 10)}.md`;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        toast('已下载（含你刚才手改的内容）');
        return;
      }
      if (DATA_SOURCE !== 'api') { toast('当前是离线演示数据；接上工作台后可以下载完整导出'); return; }
      window.open(`${apiBase()}/api/cervical/export/${encodeURIComponent(state.profile)}.md`, '_blank', 'noopener');
    },
    'toggle-ask': (el) => { el.textContent = el.textContent.includes('✓') ? '标记已问' : '已问过 ✓'; },
    'save-trial': (el) => { const id = el.dataset.id; if (state.saved.includes(id)) { state.saved = state.saved.filter(x => x !== id); } else state.saved.push(id); render(); },
    'ask-trial': (el) => { const id = el.dataset.id; const t = TRIALS.find(x => x.id === id); state.questions = state.questions || []; const q = `${t.id}：入组条件是否包含我的分期（${P().stage}）与既往治疗？`; if (!state.questions.includes(q)) state.questions.push(q); render(); toast('已加入入组问题清单'); },
    range: (el) => { state.range = el.dataset.range; render(); },
    toggle: (el) => { state.toggles[el.dataset.key] = !state.toggles[el.dataset.key]; render(); },
    pin: (el) => { state.pin = { code: el.dataset.code, date: el.dataset.date }; render(); },
    unpin: () => { state.pin = null; render(); },
    zoom: () => {},
    agent: () => { state.agentOpen = !state.agentOpen; renderAgent(); },
    'agent-open': () => { state.agentOpen = true; renderAgent(); toast('AI 对话面板已打开；× 只是收起，不会结束会话'); },
    'agent-build': agentBuild,
    'agent-demo': agentDemo
  };
  if (act === 'agent-size') { state.agentSize = e.target.closest('[data-action]').dataset.size; renderAgent(); return; }
  if (act === 'cfg-tab') {
    const el = e.target.closest('[data-action]');
    document.querySelectorAll('.cfg-tabs [role=tab]').forEach((b) => b.setAttribute('aria-selected', String(b === el)));
    document.querySelectorAll('.cfg-block[data-tab]').forEach((b) => { b.hidden = b.dataset.tab !== el.dataset.tab; });
    return;
  }
  if (map[act]) map[act](e.target.closest('[data-action]'));
});
document.addEventListener('input', (e) => {
  if (e.target.matches('[data-action="records-search"]')) {
    state.query = e.target.value;
    const wrap = $('#docs-table'); if (wrap) wrap.innerHTML = docsTable();
  }
});
document.addEventListener('change', (e) => {
  if (e.target && e.target.id === 'file-picker') { ingestFiles(e.target.files); e.target.value = ''; return; }
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && $('#dialog').open) { closeDialog(); return; }
  const card = e.target.closest && e.target.closest('.mcard[data-mcard]:not([data-static])');
  if (card && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); flipCard(card.dataset.mcard); }
});
$('#font-toggle').addEventListener('click', () => { const on = document.body.classList.toggle('large'); $('#font-toggle').setAttribute('aria-pressed', String(on)); });
window.addEventListener('hashchange', () => { const v = location.hash.slice(1); if (v && v !== state.view && VIEWS[v]) { state.view = v; state.privateOpen = false; state.pin = null; render(); } });

/* 真实上传：逐份 POST 到 /import，成功后就地刷新候选（只写候选，不写记录）。 */
async function uploadToWorkbench(files) {
  if (state.parsing) { toast('上一份还在解析，等它结束再传'); return; }
  state.parsing = true; state.parseError = false;
  if (state.view === 'records') render();
  let okCount = 0;
  const failures = [];
  for (const f of files) {
    try {
      const res = await fetch(`${apiBase()}/api/cervical/import?name=${encodeURIComponent(f.name)}&profile=${encodeURIComponent(state.profile)}&persist=1`, {
        method: 'POST',
        headers: { 'content-type': 'application/octet-stream' },
        body: await f.arrayBuffer()
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || `HTTP ${res.status}`);
      okCount += 1;
    } catch (error) {
      /* 失败不产候选、原件由用户自己留着重试（A2）。 */
      failures.push(`${f.name}：${error.message}`);
    }
  }
  state.parsing = false;
  try {
    const { reachable, data } = await loadBootstrap();
    if (reachable && data) applyData(data);
  } catch { /* 刷新失败就保留当前页面，用户手动刷新即可 */ }
  if (state.view === 'records') render();
  if (okCount) toast(`解析完成 ${okCount} 份：候选已放入「整理草稿 / 核对」`);
  if (failures.length) toast(`有 ${failures.length} 份没解析成功：${failures[0]}`);
}

/* 上传：原型只做本地"接住"动作，不解析、不上传、不写库 */
function ingestFiles(list) {
  const files = Array.from(list || []);
  if (!files.length) return;
  if (DATA_SOURCE === 'pending') { uploadQueue.push(...files); return; }
  const allowed = ['.pdf', '.jpg', '.jpeg', '.png', '.txt', '.md'];
  const ok = files.filter((f) => allowed.some((x) => f.name.toLowerCase().endsWith(x)));
  if (!ok.length) { toast('这个格式暂不支持；支持 PDF / 图片 / 文本'); return; }

  /* 接上工作台时走真实链路：原始字节 → MinerU → 候选（persist=1 写 documents + candidate_fields）。
     只有在纯演示状态下才走下面的本地假动作。 */
  if (DATA_SOURCE === 'api') { uploadToWorkbench(ok); return; }

  state.uploads += ok.length;
  const now = todayISO();
  ok.forEach((f, i) => {
    const id = 'up' + Date.now().toString(36) + i;
    DOCS[state.profile].unshift({ id, name: f.name, fileName: f.name, size: f.size, date: now, type: '其他', status: '待核对' });
    state.lastUpload = id;
  });
  render();
  toast(`已接住 ${ok.length} 份文件（演示）：原件保留在资料目录，解析结果会先进候选`);
}

/* ---------------- 启动 ---------------- */
/* 必须先取数据再 render：视图函数全是同步的，数据没到就渲染会拿到空对象、
   整页显示 0 条记录，看起来像"数据丢了"。 */
async function init() {
  const { reachable, data } = await loadBootstrap();
  if (reachable) {
    applyData(data || { profiles: {}, trials: [] });
    DATA_SOURCE = data && Object.keys(data.profiles).length ? 'api' : 'empty';
    if (data && data.version) { APP_INFO.version = data.version; APP_INFO.build = data.build || APP_INFO.build; }
    APP_INFO.channel = 'dsh';
    APP_INFO.channelLabel = DATA_SOURCE === 'api' ? '开发版 · 已连接工作台数据' : '工作台已连接，资料库还是空的';
  } else if (window.DEMO_DATA) {
    applyData(window.DEMO_DATA);
    DATA_SOURCE = 'demo';
    APP_INFO.channelLabel = '离线演示数据（未连接工作台）';
  } else {
    applyData({ profiles: {}, trials: [] });
    DATA_SOURCE = 'empty';
    APP_INFO.channelLabel = '没有数据（资料目录未选择或为空）';
  }
  const initialHash = location.hash.slice(1);
  if (VIEWS[initialHash]) state.view = initialHash;
  render();
  flushUploadQueue();
}

/* 上传队列：init 之前就选文件的情况（用户很快）先存着，数据到位后再处理。 */
let uploadQueue = [];
function flushUploadQueue() {
  if (!uploadQueue.length) return;
  const q = uploadQueue; uploadQueue = [];
  ingestFiles(q);
}

init();
