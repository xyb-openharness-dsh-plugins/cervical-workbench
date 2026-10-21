/* 小莲宝 CerviPal · 演示数据生成器（唯一数据源）
   产出：demo/demo-data.sqlite（可 SQL 查询）+ prototypes/v0.2/demo-data.js（原型只读数据层）
   原则：全部患者数据为虚构模拟；trials 表为真实登记摘录（2026-01-01 → 2026-10-21 首次公示，
         状态未核实，以登记页为准）。
   运行：node demo/build-demo-data.mjs  —— 改数据只改这里，两个产物一起重生成。

   两种用法：
   1. 直接跑（CLI）：写上面两个产物；
   2. 被 import：只拿到 `buildDemoProfiles()` 返回的纯数据，一个字节都不碰磁盘
      —— 开发版的 `dsh/demo.js` 靠它把演示档案写进本机 sqlite。

   本轮踩过/继承的坑（改前必读）：
   - **分节标题进 section_titles 表**，不在 subjects 上排 *_title 列：食管癌那轮漏两节标题只能发
     0002 ALTER 补列，生成器/读模型/INSERT 三处跟着改，是本轮最贵的一次返工；
   - **INSERT 一律写显式列名**，禁止 `INSERT INTO t VALUES (?,?,…)`（胃癌那轮连续 6 次列数不匹配）；
   - **分类指标不写 unit**（必须缺键，不是 unit:'' 也不是 unit:null 后再补）；
   - **events / docs / candidates 是定长数组**，不是对象：events=[日期,名称]、
     docs=[id,名称,日期,类型,状态]、candidates=[id,名称,值,来源,状态]；
   - **SCC-Ag 只给鳞癌档案**（A）；腺癌档案（B）给 CEA / CA125，别为了"对称"补上 SCC-Ag。
*/
import { DatabaseSync } from 'node:sqlite';
import { writeFileSync, realpathSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const P2 = join(ROOT, 'prototypes/v0.2');

/* ---------- 基础 ---------- */

const pts = (arr) => arr.map(([d, v, src]) => ({ d, v, src }));

const CAT_COLOR = {
  '肿瘤标志物': '#b4553a', '血象': '#a03d5c', '生化': '#8a6b1f', '电解质': '#2f6f66',
  '营养': '#6a55b8', '放疗影响': '#c2682f', '激素与卵巢': '#8a5a9e', '妇科症状': '#a8577a',
};
const cat = (c) => ({ cat: c, color: CAT_COLOR[c] });

/* 同屏最多 3–4 条线，必须靠色相区分：标志物偏砖红、血象偏玫、生化偏金、电解质偏青、
   营养偏紫、放疗影响偏橙、激素偏紫红、妇科症状偏玫紫。 */
const KEY_COLOR = {
  scc: '#b4553a', cea: '#8f3f28', ca125: '#c96b3f', cyfra: '#d08a4a',
  hgb: '#a03d5c', wbc: '#c2687f', anc: '#8f2d4a', lym: '#d495a6', plt: '#b3556e',
  alt: '#8a6b1f', ast: '#a8862f', cr: '#6d5320', crp: '#a87c0b', glu: '#3e8e7e',
  k: '#2f6f66', na: '#4d9187',
  wt: '#6a55b8', alb: '#9382d4',
  bowel: '#c2682f', bladder: '#d4894f', lymphedema: '#a85724', vagina: '#b8652c', hotflash: '#e09a5c',
  fsh: '#8a5a9e', amh: '#a87ab8', menses: '#a8577a', discharge: '#c07a95',
};

/* ---------- 档案 A：鳞癌 IIIC1r，根治性放化疗 + 后装 + 免疫维持（放疗长期影响主线） ---------- */

const DA = ['2026-03-12', '2026-03-26', '2026-04-09', '2026-04-23', '2026-05-07', '2026-05-21',
  '2026-06-04', '2026-06-18', '2026-07-09', '2026-08-06', '2026-09-03', '2026-10-08'];
const LA = ['确诊时', '放疗第 1 周', '放疗第 3 周', '放疗第 5 周', '后装第 1 次', '后装第 3 次',
  '放疗结束前', '治疗结束', '免疫-1 前', '免疫-3 前', '免疫-5 前', '复诊'];
const zipA = (vals) => pts(DA.map((d, i) => [d, vals[i], LA[i]]));

const commonLabsA = () => [
  { key: 'wbc', name: '白细胞', unit: '10⁹/L', dec: 1, band: [3.5, 9.5], note: '不同医院参考区间不合并', ...cat('血象'),
    points: zipA([6.4, 6.0, 4.8, 3.6, 2.9, 3.4, 4.1, 4.6, 4.3, 4.0, 4.4, 4.8]) },
  { key: 'anc', name: '中性粒细胞', unit: '10⁹/L', dec: 2, band: [1.8, 6.3], note: '同步放化疗期间最低；偏低时治疗可能推迟', ...cat('血象'),
    points: zipA([4.0, 3.7, 2.8, 1.9, 1.5, 1.9, 2.4, 2.8, 2.6, 2.4, 2.7, 3.0]) },
  { key: 'lym', name: '淋巴细胞', unit: '10⁹/L', dec: 2, band: [1.1, 3.2], note: '盆腔放疗期间下降常见', ...cat('血象'),
    points: zipA([1.8, 1.7, 1.4, 1.0, 0.7, 0.8, 0.9, 1.1, 1.0, 1.1, 1.2, 1.3]) },
  { key: 'plt', name: '血小板', unit: '10⁹/L', dec: 0, band: [125, 350], note: '—', ...cat('血象'),
    points: zipA([242, 236, 218, 186, 152, 164, 178, 192, 188, 196, 204, 212]) },
  { key: 'hgb', name: '血红蛋白', unit: 'g/L', dec: 0, band: [115, 150], note: '女性参考区间与男性不同；不同医院不合并', ...cat('血象'),
    points: zipA([126, 122, 116, 108, 102, 104, 107, 110, 112, 114, 116, 118]) },
  { key: 'alt', name: 'ALT', unit: 'U/L', dec: 0, band: [7, 40], note: '—', ...cat('生化'),
    points: zipA([22, 26, 30, 34, 38, 33, 29, 26, 24, 26, 24, 23]) },
  { key: 'ast', name: 'AST', unit: 'U/L', dec: 0, band: [13, 35], note: '—', ...cat('生化'),
    points: zipA([20, 23, 26, 30, 34, 29, 26, 23, 22, 23, 22, 21]) },
  { key: 'cr', name: '肌酐', unit: 'μmol/L', dec: 0, band: [41, 81], note: '含铂方案期间关注', ...cat('生化'),
    points: zipA([58, 60, 62, 64, 68, 66, 63, 61, 60, 61, 59, 58]) },
  { key: 'crp', name: 'C 反应蛋白', unit: 'mg/L', dec: 1, band: [0, 8], note: '放疗期间升高常见，单次升高不等于感染', ...cat('生化'),
    points: zipA([6.2, 5.4, 8.6, 12.4, 16.8, 12.2, 8.4, 5.6, 4.2, 3.6, 3.2, 2.8]) },
  { key: 'k', name: '血钾', unit: 'mmol/L', dec: 2, band: [3.5, 5.3], note: '腹泻或进食少后需复查', ...cat('电解质'),
    points: zipA([4.1, 4.0, 3.8, 3.4, 3.3, 3.5, 3.8, 3.9, 4.0, 3.9, 4.0, 4.1]) },
  { key: 'na', name: '血钠', unit: 'mmol/L', dec: 0, band: [137, 147], note: '—', ...cat('电解质'),
    points: zipA([141, 140, 139, 137, 136, 138, 139, 140, 140, 141, 141, 140]) },
  { key: 'wt', name: '体重', unit: 'kg', dec: 1, band: null, note: '持续下降需在就诊时提出', ...cat('营养'),
    points: zipA([58.6, 58.2, 57.4, 56.2, 55.1, 54.6, 54.8, 55.4, 56.2, 56.8, 57.2, 57.6]) },
  { key: 'alb', name: '白蛋白', unit: 'g/L', dec: 1, band: [40, 55], note: '与体重一起看；不同医院参考区间不合并', ...cat('营养'),
    points: zipA([41.2, 40.6, 39.4, 37.8, 36.2, 35.8, 36.4, 37.2, 38.0, 38.6, 39.0, 39.4]) },
];

const PROFILE_A = {
  name: '何秀云',
  sex: '女',
  age: 47,
  meta: '宫颈鳞癌 · IIIC1r · 社区药房店员',
  headline: '宫颈鳞癌 IIIC1r（影像提示盆腔淋巴结阳性），2026-03 起根治性放化疗 + 后装，8 月起免疫维持',
  stage: 'IIIC1r',
  mindset: '最担心腿肿和夫妻生活，想把扩张训练坚持下来',
  histology: '鳞癌',
  hpv_status: 'HPV16 阳性（2026-03 PCR 分型）',
  dash_keys: ['wt', 'scc', 'hgb', 'crp'],
  path: ['鳞癌', 'IIIC1r', '根治性放化疗', '免疫维持'],
  activity: '每天晚饭后散步 30 分钟；腿肿的那几天改成抬腿休息',
  familyTalk: '和爱人说好：复查结果一起看；扩张训练的事不再一个人扛',

  molecular: [
    { k: 'PD-L1 CPS', v: 'CPS 12', src: '病理科 2026-03-18', state: 'ok', note: '22C3 检测' },
    { k: 'p16', v: '弥漫强阳性（+）', src: '病理科 2026-03-18', state: 'ok', note: '与 HPV 相关性一致' },
    { k: 'MSI / MMR', v: 'pMMR / MSS', src: '病理科 2026-03-18', state: 'ok', note: '—' },
    { k: 'HER2', v: '未检测', src: '—', state: 'na', note: '鳞癌不作为常规检测项；医生未开' },
  ],

  lines: [
    { name: '一线 · 根治性同步放化疗', detail: '盆腔外照射 50.4 Gy/28 次 + 顺铂周疗 40 mg/m²（2026-03-20 → 2026-05-08）', done: true },
    { name: '一线 · 近距离治疗（后装）', detail: '高剂量率后装 6 Gy × 5 次，每周 1 次（2026-05-07 → 2026-06-04）', done: true },
    { name: '免疫维持', detail: 'PD-1 抑制剂单药，每 3 周（2026-07-09 起）', done: false },
  ],

  cycles: [
    ['dCRT-1', '2026-03-20', '顺铂 40 mg/m² 周疗；放疗第 1 周', '已完成', true],
    ['dCRT-2', '2026-03-27', '同上；放疗第 2 周', '已完成', true],
    ['dCRT-3', '2026-04-03', '同上；放疗第 3 周（白细胞开始下降）', '已完成', true],
    ['dCRT-4', '2026-04-10', '同上；放疗第 4 周', '已完成', true],
    ['dCRT-5', '2026-04-17', '同上；放疗第 5 周（中性粒细胞最低）', '已完成', true],
    ['dCRT-6', '2026-04-24', '同上；放疗第 6 周', '已完成', true],
    ['后装-1', '2026-05-07', '高剂量率后装 6 Gy；宫腔管 + 卵圆体施源器', '已完成', true],
    ['后装-2', '2026-05-14', '6 Gy', '已完成', true],
    ['后装-3', '2026-05-21', '6 Gy', '已完成', true],
    ['后装-4', '2026-05-28', '6 Gy', '已完成', true],
    ['后装-5', '2026-06-04', '6 Gy；疗程结束', '已完成', true],
    ['免疫-1', '2026-07-09', 'PD-1 抑制剂 200 mg', '已完成', true],
    ['免疫-2', '2026-07-30', 'PD-1 抑制剂 200 mg', '已完成', true],
    ['免疫-3', '2026-08-20', 'PD-1 抑制剂 200 mg', '已完成', true],
    ['免疫-4', '2026-09-10', 'PD-1 抑制剂 200 mg', '已完成', true],
    ['免疫-5', '2026-10-01', 'PD-1 抑制剂 200 mg', '已完成', true],
  ],

  pathway: {
    title: '治疗路径（当前 / 既往）',
    rows: [
      ['既往', '拟行广泛子宫切除 + 盆腔淋巴清扫', '2026-03-12 → 2026-03-19', '确诊后按「手术」路径做的术前评估',
        '2026-03-19 多学科讨论后改为不手术。医生原话：「影像提示盆腔淋巴结阳性，直接手术切不干净，建议根治性放化疗」'],
      ['当前', '根治性同步放化疗 + 后装 + 免疫维持', '2026-03-20 → 进行中', '外照射 50.4 Gy/28 次 + 顺铂周疗；后装 6 Gy × 5 次；2026-07-09 起 PD-1 抑制剂维持',
        '医生原话：「放疗做根治量，后装补足中心剂量，结束后免疫维持一年，暂不考虑手术」'],
    ],
  },

  /* FIGO 2018：只抄医生给的分期与依据，不自算（口径 A）。
     键名用 figo 而不是 stage：subjects.stage 是"一眼看到"的标量字符串，
     同名会被对象字面量的后一个键覆盖，subjects 里就会写进一个 [object Object]。 */
  figo: {
    title: 'FIGO 2018 分期档案（医生给出，不自算）',
    rows: [
      ['分期', 'IIIC1r', '医生 2026-03-19 门诊告知'],
      ['分期体系', 'FIGO 2018', '含 IIIC 淋巴结分期；r = 影像，p = 病理'],
      ['r / p 标记', 'r（影像）', '盆腔 MRI + PET-CT 提示淋巴结阳性，未做病理证实'],
      ['依据', '盆腔 MRI 2026-03-15：宫颈肿块 4.2 cm，右侧髂内淋巴结短径 1.1 cm；PET-CT 2026-03-16：同部位高代谢', '报告原文摘录，未改写'],
      ['医生原话', '「按影像算 IIIC1，淋巴结在盆腔，没到腹主动脉旁」', '门诊记录 2026-03-19'],
      ['记录日期', '2026-03-19', '分期由医生给出，工作台不重算'],
    ],
  },

  pathology: {
    title: '病理与免疫组化',
    status: '已出（2026-03-18 活检）',
    rows: [
      ['病理类型', '鳞状细胞癌（中分化）'],
      ['取材方式', '宫颈活检（2026-03-12）'],
      ['浸润深度', '活检标本无法评估（未手术）'],
      ['LVSI', '活检标本无法评估'],
      ['免疫组化', 'p16 弥漫强阳性、p40 (+)、CK5/6 (+)'],
      ['PD-L1', 'CPS 12（22C3）'],
      ['MMR', 'pMMR / MSS'],
    ],
    gaps: [
      ['浸润深度 / LVSI', '未手术，无切除标本；以影像与临床分期为准'],
      ['HER2', '鳞癌未检测（医生未开）'],
    ],
  },

  surgery: null,

  rt: {
    title: '放疗疗程（外照射与后装分列，不合成总剂量）',
    rows: [
      ['EBRT', '2026-03-20', '2026-05-08', '50.4 Gy/28 次', '28 次', 'VMAT 盆腔放疗，含宫旁与盆腔淋巴引流区', '同期顺铂周疗'],
      ['后装', '2026-05-07', '2026-06-04', '6 Gy × 5 次', '5 次', '高剂量率（HDR）后装，宫腔管 + 卵圆体施源器，每周 1 次', '第 1 次与外照射末段重叠 2 天（医生安排）'],
    ],
  },

  lateEffects: {
    title: '放疗后事件（腹泻 / 便血 / 尿频 / 尿痛）',
    rows: [
      ['2026-09-28', '肠道', '1 级', '大便次数增多，每天 3–4 次，无便血'],
      ['2026-08-10', '膀胱', '1 级', '白天排尿次数增多，无尿痛'],
      ['2026-06-20', '肠道', '2 级', '腹泻每天 6–7 次，医生开了蒙脱石散'],
      ['2026-05-15', '肠道', '2 级', '后装期间腹泻加重，暂停一次后装后恢复'],
    ],
  },

  lymphedema: {
    title: '下肢淋巴水肿记录（测量值按部位记，不做分诊）',
    rows: [
      ['2026-10-08', '左小腿', 'Ⅰ期', '踝上 10 cm 周径差 +1.6 cm', '医生建议白天穿压力袜，具体压力值以处方为准'],
      ['2026-08-06', '左小腿', 'Ⅰ期', '踝上 10 cm 周径差 +1.2 cm', '放疗结束后出现，抬高患肢后减轻'],
      ['2026-06-18', '左小腿', '—', '踝上 10 cm 周径差 +0.4 cm', '治疗结束时还不明显'],
    ],
  },

  vagina: {
    title: '阴道狭窄与扩张训练（默认私密，本人开放才显示）',
    rows: [
      ['2026-10-05', '扩张训练', '本周 3 次，每次约 10 分钟', '医生原话：「每周至少 2–3 次，坚持半年以上，具体用哪个型号按门诊教的方法」', 1],
      ['2026-09-08', '狭窄程度', '轻度（可容纳两指）', '放疗科复查记录，非本人自评', 0],
      ['2026-09-08', '扩张训练', '近一个月每周 1–2 次', '自述「有点疼就停下来了」', 1],
      ['2026-07-15', '医嘱', '开始阴道扩张训练', '医生原话：「放疗后要规律扩张，避免粘连狭窄；疼得厉害可以先用润滑剂」', 0],
    ],
  },

  menopause: {
    title: '绝经症状（治疗诱导，按自述记录）',
    rows: [
      ['2026-10-02', '潮热', '每天 4–5 次，夜间明显', '影响睡眠'],
      ['2026-09-05', '盗汗', '每周 2–3 次', '—'],
      ['2026-07-20', '失眠', '入睡困难，约 1 小时', '与潮热同时出现'],
      ['2026-06-25', '情绪', '容易烦躁', '自述「一点小事就上火」'],
    ],
  },

  hormone: [
    ['激素替代治疗（HRT）', '医嘱原文：暂不使用，放疗后满 6 个月复查骨密度再评估', '—', null, '放疗科门诊 2026-09-08'],
    ['钙 + 维生素 D', '医嘱原文：每日 1 片，随餐', '2026-06-20', null, '放疗科医嘱 2026-06-20'],
    ['阴道保湿剂', '医嘱原文：每周 2–3 次，可与扩张训练同用', '2026-07-15', null, '放疗科门诊 2026-07-15'],
  ],

  fertility: {
    title: '生育状态档案（患者自述 + 医生原话）',
    rows: [
      ['婚育史', '已婚，育有 1 子（2012 年顺产）', '本人自述'],
      ['生育意愿', '无再生育计划', '本人自述 2026-03-19'],
      ['避孕方式', '已行输卵管结扎（2013 年）', '本人自述'],
      ['医生谈过什么', '「治疗会带来绝经，卵巢功能基本不会恢复；你已无生育计划，这部分影响主要是绝经症状」', '门诊记录 2026-03-19'],
    ],
  },

  fertSurgery: null,

  ovary: {
    title: '卵巢功能记录（数值按报告抄录，结论由医生给）',
    rows: [
      ['2026-09-08', 'FSH', '68.4 mIU/mL', '医生结论：「符合治疗诱导绝经」'],
      ['2026-09-08', 'E2', '< 18 pmol/L', '低于检测下限，报告原文'],
      ['2026-06-20', 'FSH', '52.1 mIU/mL', '治疗结束时已升高'],
      ['2026-03-12', 'FSH', '7.2 mIU/mL', '确诊时基线'],
    ],
  },

  sexual: {
    title: '性健康记录（默认私密，不进导出与看板摘要）',
    rows: [
      ['2026-10-02', '性交痛', '尝试过一次，进入时明显疼痛，之后没再试', 1],
      ['2026-09-08', '干涩', '平时也觉得干，医生说和绝经有关', 1],
      ['2026-08-14', '顾虑', '担心「是不是以后都这样」，没敢问医生', 1],
    ],
  },

  cytology: {
    title: '阴道残端细胞学（只存报告原文）',
    rows: [
      ['2026-10-08', '液基细胞学（TCT）', 'NILM（未见上皮内病变或恶性细胞）', '报告原文抄录；未做 HPV 联合检测'],
      ['2026-07-09', '液基细胞学（TCT）', 'NILM', '治疗结束后首次'],
    ],
  },

  hpv: {
    title: 'HPV 检测记录',
    rows: [
      ['2026-10-08', 'PCR 分型', 'HPV16 阳性（病毒载量较前下降，报告未给具体值）', '报告原文'],
      ['2026-03-12', 'PCR 分型', 'HPV16 阳性', '确诊时'],
    ],
  },

  imaging: {
    title: '影像随访（逐次记录，已发生的检查）',
    rows: [
      ['2026-10-08', '盆腔 MRI', '宫颈原发灶较治疗前明显缩小，盆腔淋巴结短径均 < 8 mm（报告结论摘录）', '3 个月后复查', '放疗后 4 个月'],
      ['2026-07-09', '胸腹盆 CT', '未见远处转移；盆腔结构放疗后改变（报告结论摘录）', '3 个月后复查', '治疗结束评估'],
      ['2026-03-16', 'PET-CT', '宫颈高代谢肿块 4.2 cm；右侧髂内淋巴结高代谢（SUVmax 6.8）（报告结论摘录）', '—', '分期检查'],
    ],
  },

  screening: {
    title: '筛查与预防（本人档案 + 下次可以问什么）',
    rows: [
      ['本人筛查史', '2019 年、2022 年宫颈细胞学均为 NILM，未做过 HPV 联合筛查', '本人回忆，报告未找到'],
      ['本人筛查史', '2026-03 确诊前从未做过 HPV 检测', '确诊时首次检测'],
      ['疫苗记录', '未接种 HPV 疫苗', '本人自述；确诊后医生未再提接种'],
      ['家属可讨论问题', '女儿 14 岁，下次门诊可以问：这个年龄段接种的程序和去哪里接种', '只记录要问的问题，不给接种建议'],
    ],
  },

  nutrition: {
    title: '进食量记录（按自述，不做热量换算）',
    rows: [
      ['2026-10-06', '午餐', '约七分饱', '米饭半碗 + 清蒸鱼 + 青菜', '无', '—'],
      ['2026-09-10', '早餐', '约六分饱', '小米粥 + 鸡蛋', '轻微恶心', '免疫-4 后第 1 天'],
      ['2026-07-20', '晚餐', '约五分饱', '面条 + 豆腐', '腹胀', '治疗结束后食欲差'],
      ['2026-05-18', '午餐', '约四分饱', '粥 + 蒸蛋', '腹泻', '后装期间'],
    ],
  },

  supplements: [
    ['口服营养补充（ONS）', '医嘱原文：整蛋白型营养粉，每日 1–2 次，两餐之间冲服', '2026-05-18', '2026-07-09', '放疗科门诊 2026-05-18'],
    ['钙 + 维生素 D', '医嘱原文：每日 1 片，随餐', '2026-06-20', null, '放疗科医嘱 2026-06-20'],
  ],

  rhythm: [
    ['妇科肿瘤门诊', '前 2 年每 3 个月', '医生安排', '2026-12 上旬'],
    ['盆腔 MRI', '每 3–6 个月', '医生安排', '2026-12 上旬'],
    ['阴道残端细胞学', '每 6 个月', '医生安排', '2027-04 上旬'],
    ['HPV 检测', '每 6–12 个月', '医生安排', '2027-04 上旬'],
    ['血常规 + 肝肾功能', '每次免疫治疗前', '医生安排', '2026-10-22'],
  ],

  events: [
    ['2026-03-12', '确诊（宫颈活检）'],
    ['2026-03-19', '分期告知（IIIC1r）'],
    ['2026-03-20', '开始同步放化疗'],
    ['2026-05-07', '开始后装治疗'],
    ['2026-06-04', '放疗疗程结束'],
    ['2026-07-09', '开始免疫维持'],
    ['2026-09-08', '诊断治疗诱导绝经'],
  ],

  viewpoints: [
    ['2026-06-10', '松了口气', '治疗做完了，但每天跑厕所，出门要先找卫生间'],
    ['2026-08-20', '有点烦', '腿比上个月粗了一点，压力袜穿着热'],
    ['2026-10-02', '还行', '复查结果医生说稳定，先把这个季度过好'],
  ],

  docs: [
    ['A-D1', '宫颈活检病理报告 2026-03-18.pdf', '2026-03-18', '病理报告', '已解析'],
    ['A-D2', '盆腔 MRI 报告 2026-03-15.pdf', '2026-03-15', '影像报告', '已解析'],
    ['A-D3', '放疗计划单 2026-03-20.pdf', '2026-03-20', '治疗记录', '已入库'],
    ['A-D4', '后装治疗记录 2026-06-04.pdf', '2026-06-04', '治疗记录', '已入库'],
    ['A-D5', '血常规 2026-10-08.jpg', '2026-10-08', '化验单', '待核对'],
    ['A-D6', '盆腔 MRI 报告 2026-10-08.pdf', '2026-10-08', '影像报告', '已解析'],
  ],

  candidates: [
    ['A-C1', 'SCC-Ag', '1.6', '血生化报告 2026-10-08', '待确认'],
    ['A-C2', '白蛋白', '39.4', '血生化报告 2026-10-08', '待确认'],
    ['A-C3', '体重', '57.6', '门诊记录 2026-10-08', '已接受'],
  ],

  /* A 是鳞癌：SCC-Ag 是主线指标；分类指标只画节点不连线。
     口径 E 的落地：鳞癌档案**不登记 CEA**——CEA 对鳞癌不特异，同页并列会让人以为是等价指标。 */
  extraMetrics: [
    { key: 'scc', name: 'SCC-Ag', unit: 'ng/mL', dec: 1, band: [0, 2.5], note: '鳞癌相关；单次波动不等于病情变化', ...cat('肿瘤标志物'),
      points: pts([
        ['2026-03-12', 7.8, '确诊时'], ['2026-04-09', 5.4, '放疗第 3 周'], ['2026-05-07', 3.6, '后装第 1 次'],
        ['2026-06-18', 2.4, '治疗结束'], ['2026-08-06', 1.9, '免疫-3 前'], ['2026-10-08', 1.6, '复诊']]) },
    { key: 'vagina', name: '阴道狭窄程度', dec: null, kind: 'grade', band: null, note: '医生记录的分级；扩张训练记录在「放疗与长期影响」页（默认私密）', ...cat('妇科症状'),
      points: pts([
        ['2026-07-15', '0 级', '放疗科记录'], ['2026-09-08', '轻度', '放疗科记录'], ['2026-10-08', '轻度', '放疗科记录']]) },
    { key: 'lymphedema', name: '下肢淋巴水肿', dec: null, kind: 'grade', band: null, note: '医生给的分期；周径差原值在长期影响页', ...cat('放疗影响'),
      points: pts([
        ['2026-06-18', '0 期', '放疗科记录'], ['2026-08-06', 'Ⅰ期', '放疗科记录'], ['2026-10-08', 'Ⅰ期', '放疗科记录']]) },
    { key: 'hotflash', name: '潮热频次', dec: null, kind: 'qual', band: null, note: '自述，不是量表评分', ...cat('激素与卵巢'),
      points: pts([
        ['2026-06-25', '偶有', '自查'], ['2026-08-10', '每天 2–3 次', '自查'], ['2026-10-02', '每天 4–5 次', '自查']]) },
    { key: 'bowel', name: '腹泻 / 排便次数', dec: null, kind: 'grade', band: null, note: '按医生记录的分级抄录，不做判断', ...cat('放疗影响'),
      points: pts([
        ['2026-05-15', '2 级', '放疗科记录'], ['2026-06-20', '2 级', '放疗科记录'],
        ['2026-08-10', '1 级', '放疗科记录'], ['2026-10-08', '1 级', '放疗科记录']]) },
  ],
};

/* ---------- 档案 B：腺癌 IB2，根治性宫颈切除（生育保留） ---------- */

const DB = ['2026-04-02', '2026-04-16', '2026-04-24', '2026-05-08', '2026-06-05', '2026-07-03',
  '2026-08-07', '2026-09-04', '2026-10-09'];
const LB = ['确诊时', '术前评估', '术后第 3 天', '术后 2 周', '术后 6 周', '术后 3 个月',
  '术后 4 个月', '术后 5 个月', '复诊'];
const zipB = (vals) => pts(DB.map((d, i) => [d, vals[i], LB[i]]));

const commonLabsB = () => [
  { key: 'wbc', name: '白细胞', unit: '10⁹/L', dec: 1, band: [3.5, 9.5], note: '不同医院参考区间不合并', ...cat('血象'),
    points: zipB([6.0, 5.8, 10.4, 7.2, 5.4, 5.2, 5.0, 5.1, 5.2]) },
  { key: 'anc', name: '中性粒细胞', unit: '10⁹/L', dec: 2, band: [1.8, 6.3], note: '术后第 1–3 天应激性升高，不按化疗标准解读', ...cat('血象'),
    points: zipB([3.7, 3.5, 8.6, 5.0, 3.2, 3.0, 2.9, 3.0, 3.1]) },
  { key: 'lym', name: '淋巴细胞', unit: '10⁹/L', dec: 2, band: [1.1, 3.2], note: '—', ...cat('血象'),
    points: zipB([1.7, 1.6, 1.2, 1.4, 1.6, 1.7, 1.6, 1.7, 1.8]) },
  { key: 'plt', name: '血小板', unit: '10⁹/L', dec: 0, band: [125, 350], note: '—', ...cat('血象'),
    points: zipB([248, 242, 206, 228, 240, 244, 238, 242, 246]) },
  { key: 'hgb', name: '血红蛋白', unit: 'g/L', dec: 0, band: [115, 150], note: '术后下降，恢复需要时间', ...cat('血象'),
    points: zipB([124, 122, 108, 112, 118, 121, 123, 124, 126]) },
  { key: 'alt', name: 'ALT', unit: 'U/L', dec: 0, band: [7, 40], note: '—', ...cat('生化'),
    points: zipB([18, 20, 24, 22, 19, 18, 17, 18, 17]) },
  { key: 'ast', name: 'AST', unit: 'U/L', dec: 0, band: [13, 35], note: '—', ...cat('生化'),
    points: zipB([17, 18, 22, 20, 18, 17, 16, 17, 16]) },
  { key: 'cr', name: '肌酐', unit: 'μmol/L', dec: 0, band: [41, 81], note: '—', ...cat('生化'),
    points: zipB([54, 55, 58, 56, 55, 54, 54, 55, 54]) },
  { key: 'crp', name: 'C 反应蛋白', unit: 'mg/L', dec: 1, band: [0, 8], note: '术后短期升高属常见，单次高不等于感染', ...cat('生化'),
    points: zipB([2.1, 1.8, 28.4, 6.2, 2.0, 1.6, 1.4, 1.5, 1.3]) },
  { key: 'k', name: '血钾', unit: 'mmol/L', dec: 2, band: [3.5, 5.3], note: '—', ...cat('电解质'),
    points: zipB([4.2, 4.1, 3.9, 4.0, 4.1, 4.2, 4.1, 4.2, 4.1]) },
  { key: 'na', name: '血钠', unit: 'mmol/L', dec: 0, band: [137, 147], note: '—', ...cat('电解质'),
    points: zipB([140, 141, 138, 139, 140, 141, 140, 141, 140]) },
  { key: 'wt', name: '体重', unit: 'kg', dec: 1, band: null, note: '术后下降，1 个月内基本回到术前水平', ...cat('营养'),
    points: zipB([52.8, 52.6, 51.4, 51.8, 52.4, 52.6, 52.8, 52.9, 53.0]) },
  { key: 'alb', name: '白蛋白', unit: 'g/L', dec: 1, band: [40, 55], note: '术后短期下降属常见', ...cat('营养'),
    points: zipB([42.0, 41.8, 37.6, 39.8, 41.2, 41.6, 41.8, 42.0, 42.2]) },
];

const PROFILE_B = {
  name: '林晓桐',
  sex: '女',
  age: 33,
  meta: '宫颈腺癌 · IB2 · 中学教师',
  headline: '宫颈腺癌 IB2，2026-04 行根治性宫颈切除 + 盆腔淋巴清扫（保留子宫），按医生安排随访',
  stage: 'IB2',
  mindset: '还没结婚，最想弄清楚「保留子宫」之后每次复查到底要做什么',
  histology: '腺癌',
  hpv_status: 'HPV18 阳性（2026-04 PCR 分型）',
  dash_keys: ['wt', 'cea', 'hgb', 'amh'],
  path: ['腺癌', 'IB2', '根治性宫颈切除', '生育保留随访'],
  activity: '术后 6 周恢复上班；每周两次快走，避免久站',
  familyTalk: '还没和父母细说「保留子宫」意味着什么，想等复查稳定后再谈',

  molecular: [
    { k: 'PD-L1 CPS', v: 'CPS < 1', src: '病理科 2026-04-10', state: 'ok', note: '22C3 检测' },
    { k: 'p16', v: '斑片状阳性（+）', src: '病理科 2026-04-10', state: 'ok', note: '与 HPV18 相关' },
    { k: 'MSI / MMR', v: 'pMMR / MSS', src: '病理科 2026-04-10', state: 'ok', note: '—' },
    { k: 'HER2', v: 'IHC 1+', src: '病理科 2026-04-10', state: 'ok', note: '无扩增，不作为用药依据' },
  ],

  lines: [
    { name: '手术 · 根治性宫颈切除 + 盆腔淋巴清扫', detail: '经腹腔镜，保留子宫体；2026-04-21 手术', done: true },
    { name: '术后随访（无辅助治疗）', detail: '医生意见：无高危因素，不做辅助放化疗，按 3 个月复查', done: false },
  ],

  cycles: [
    ['术后-1', '2026-04-21', '根治性宫颈切除（腹腔镜）+ 盆腔淋巴清扫', '已完成', true],
  ],

  pathway: {
    title: '治疗路径（当前 / 既往）',
    rows: [
      ['当前', '手术路径 · 根治性宫颈切除（生育保留）', '2026-04-21 → 随访中', '经腹腔镜根治性宫颈切除 + 盆腔淋巴清扫，保留子宫体；术后未做辅助治疗',
        '医生原话：「病灶 2.4 cm，没有脉管浸润，可以走保留子宫的术式；但随访要比别人密，前两年每 3 个月」'],
    ],
  },

  figo: {
    title: 'FIGO 2018 分期档案（医生给出，不自算）',
    rows: [
      ['分期', 'IB2', '医生 2026-04-16 门诊告知'],
      ['分期体系', 'FIGO 2018', 'IB2 = 临床可见病灶 ≥ 2 cm 且 < 4 cm'],
      ['r / p 标记', '临床 + 影像（未标 r/p）', 'IB 期以临床查体为主，未做病理淋巴结分期'],
      ['依据', '妇科查体 2026-04-16：宫颈外生病灶约 2.4 cm；盆腔 MRI 2026-04-14：病灶 2.4 cm，宫旁未受累，淋巴结未见增大', '报告原文摘录，未改写'],
      ['医生原话', '「算 IB2，病灶 2.4 公分，淋巴结影像上没有可疑」', '门诊记录 2026-04-16'],
      ['记录日期', '2026-04-16', '分期由医生给出，工作台不重算'],
    ],
  },

  pathology: {
    title: '病理与免疫组化',
    status: '已出（2026-04-26 术后病理）',
    rows: [
      ['病理类型', '宫颈腺癌（胃型分化，中分化）'],
      ['取材方式', '根治性宫颈切除标本（2026-04-21）'],
      ['浸润深度', '间质浸润 8 mm（约 1/2 层）'],
      ['LVSI', '未见脉管浸润'],
      ['切缘', '内口切缘、外口切缘均阴性（R0）'],
      ['淋巴结', '盆腔淋巴结 0/18 阳性'],
      ['免疫组化', 'p16 斑片状 (+)、CEA (+)、PAX8 (+)'],
      ['PD-L1', 'CPS < 1（22C3）'],
      ['MMR', 'pMMR / MSS'],
    ],
    gaps: [
      ['HER2', 'IHC 1+，无扩增；医生未安排 FISH'],
      ['Silva 分型', '报告未列，如需可按医生意见补做'],
    ],
  },

  surgery: {
    title: '手术记录（做了什么，不判断该不该做）',
    rows: [
      ['2026-04-21', '根治性宫颈切除（保留子宫体）', '腹腔镜', '盆腔淋巴结清扫（0/18）', '内口 / 外口切缘阴性（R0）', '市妇幼保健院 · 妇科肿瘤', '手术用时 3 小时 20 分；留置导尿 5 天'],
    ],
  },

  rt: null,

  lateEffects: null,
  lymphedema: {
    title: '下肢淋巴水肿记录（测量值按部位记，不做分诊）',
    rows: [
      ['2026-10-09', '双侧小腿', '—', '踝上 10 cm 周径差 +0.3 cm', '术后 5 个月，久站后略胀，抬高后缓解'],
      ['2026-07-03', '双侧小腿', '—', '踝上 10 cm 周径差 +0.2 cm', '术后 2 个月，无自觉症状'],
    ],
  },
  vagina: null,
  menopause: null,
  hormone: null,

  fertility: {
    title: '生育状态档案（患者自述 + 医生原话）',
    rows: [
      ['婚育史', '未婚未育', '本人自述'],
      ['生育意愿', '希望将来生育，具体计划未定', '本人自述 2026-04-16'],
      ['避孕方式', '未采用', '本人自述'],
      ['医生谈过什么', '「保留子宫体，但宫颈切掉了，将来怀孕要按高危妊娠管理，早产风险高；生之前要跟产科一起评估」', '门诊记录 2026-04-16（原话）'],
      ['术后月经', '术后第 1 次月经 2026-05-20，量较前略少', '本人记录'],
    ],
  },

  fertSurgery: {
    title: '生育保留手术记录（含随访要求原文）',
    rows: [
      ['2026-04-21', '根治性宫颈切除（经腹腔镜，保留子宫体）', '医生原话：「宫颈切掉 2/3，内口做了环扎样缝合；子宫体保留」',
        '随访要求（医生原话）：「前 2 年每 3 个月一次，做妇科查体 + 细胞学 + HPV；第 3–5 年每 6 个月；每次都要问月经情况和有没有异常出血」'],
    ],
  },

  ovary: {
    title: '卵巢功能记录（数值按报告抄录，结论由医生给）',
    rows: [
      ['2026-10-09', 'AMH', '1.8 ng/mL', '医生结论：「卵巢储备在同龄人正常范围」'],
      ['2026-10-09', 'FSH', '8.6 mIU/mL', '—'],
      ['2026-04-14', 'AMH', '2.1 ng/mL', '术前基线'],
      ['2026-04-14', 'FSH', '7.4 mIU/mL', '术前基线'],
    ],
  },

  sexual: {
    title: '性健康记录（默认私密，不进导出与看板摘要）',
    rows: [
      ['2026-09-12', '顾虑', '担心以后同房会不会出血，还没问医生', 1],
      ['2026-07-03', '干涩', '偶尔觉得干，未用药', 1],
    ],
  },

  cytology: {
    title: '阴道残端细胞学（只存报告原文）',
    rows: [
      ['2026-10-09', '液基细胞学（TCT）', 'NILM（未见上皮内病变或恶性细胞）', '术后第 2 次随访；报告原文抄录'],
      ['2026-07-03', '液基细胞学（TCT）', 'NILM', '术后首次随访'],
    ],
  },

  hpv: {
    title: 'HPV 检测记录',
    rows: [
      ['2026-10-09', 'PCR 分型', 'HPV18 阳性', '报告原文；与术前型别一致'],
      ['2026-04-02', 'PCR 分型', 'HPV18 阳性', '确诊时'],
    ],
  },

  imaging: {
    title: '影像随访（逐次记录，已发生的检查）',
    rows: [
      ['2026-10-09', '盆腔 MRI', '宫颈术后改变，子宫体形态正常，未见异常信号灶（报告结论摘录）', '3 个月后复查', '术后 5 个月'],
      ['2026-07-03', '盆腔超声', '子宫体大小正常，内膜线清晰（报告结论摘录）', '3 个月后复查', '术后 2 个月'],
      ['2026-04-14', '盆腔 MRI', '宫颈病灶 2.4 cm，宫旁未受累，盆腔淋巴结未见增大（报告结论摘录）', '—', '术前分期'],
    ],
  },

  screening: {
    title: '筛查与预防（本人档案 + 下次可以问什么）',
    rows: [
      ['本人筛查史', '2021 年、2023 年宫颈细胞学 NILM；未做过 HPV 检测', '本人回忆'],
      ['本人筛查史', '2026-04 确诊时首次 HPV 检测，HPV18 阳性', '报告'],
      ['疫苗记录', '2018 年接种过 3 剂四价 HPV 疫苗', '本人自述，接种卡未找到'],
      ['家属可讨论问题', '妹妹 28 岁，下次门诊可以问：她这个年龄要不要做 HPV 筛查、间隔多久', '只记录要问的问题，不给筛查建议'],
    ],
  },

  nutrition: {
    title: '进食量记录（按自述，不做热量换算）',
    rows: [
      ['2026-10-09', '午餐', '约八分饱', '米饭 + 鸡肉 + 蔬菜', '无', '—'],
      ['2026-05-08', '早餐', '约六分饱', '粥 + 鸡蛋', '轻微腹胀', '术后 2 周'],
      ['2026-04-24', '晚餐', '约五分饱', '面条 + 鱼', '腹胀、没胃口', '术后第 3 天'],
    ],
  },

  supplements: [
    ['铁剂', '医嘱原文：术后血红蛋白偏低，每日 1 片，饭后服，1 个月后复查', '2026-04-26', '2026-06-05', '妇科肿瘤门诊 2026-04-26'],
  ],

  rhythm: [
    ['妇科肿瘤门诊', '前 2 年每 3 个月', '医生安排', '2027-01 上旬'],
    ['阴道残端细胞学 + HPV', '每 3 个月（前 2 年）', '医生安排', '2027-01 上旬'],
    ['盆腔 MRI', '每 6 个月', '医生安排', '2027-04 上旬'],
    ['月经情况记录', '每次门诊都问', '医生安排', '2027-01 上旬'],
  ],

  events: [
    ['2026-04-02', '确诊（宫颈活检）'],
    ['2026-04-16', '分期告知（IB2）'],
    ['2026-04-21', '根治性宫颈切除（保留子宫）'],
    ['2026-05-20', '术后第 1 次月经'],
    ['2026-07-03', '术后首次随访'],
    ['2026-10-09', '第 2 次随访'],
  ],

  viewpoints: [
    ['2026-05-05', '有点慌', '拔了尿管之后总想上厕所，医生说慢慢会好'],
    ['2026-07-20', '踏实些', '第一次复查结果正常，月经也来了'],
    ['2026-10-09', '还行', '就是每次复查前一周会紧张'],
  ],

  docs: [
    ['B-D1', '宫颈活检病理报告 2026-04-10.pdf', '2026-04-10', '病理报告', '已解析'],
    ['B-D2', '盆腔 MRI 报告 2026-04-14.pdf', '2026-04-14', '影像报告', '已解析'],
    ['B-D3', '手术记录 2026-04-21.pdf', '2026-04-21', '治疗记录', '已入库'],
    ['B-D4', '术后病理报告 2026-04-26.pdf', '2026-04-26', '病理报告', '已解析'],
    ['B-D5', 'TCT + HPV 报告 2026-10-09.pdf', '2026-10-09', '化验单', '已解析'],
    ['B-D6', '血常规 2026-10-09.jpg', '2026-10-09', '化验单', '待核对'],
  ],

  candidates: [
    ['B-C1', 'CEA', '2.4', '血生化报告 2026-10-09', '待确认'],
    ['B-C2', 'AMH', '1.8', '激素报告 2026-10-09', '已接受'],
    ['B-C3', '体重', '53.0', '门诊记录 2026-10-09', '已接受'],
  ],

  /* B 是腺癌：不给 SCC-Ag（口径 E），标志物用 CEA / CA125；FSH/AMH 作为数值线 */
  extraMetrics: [
    { key: 'cea', name: 'CEA', unit: 'ng/mL', dec: 1, band: [0, 5], note: '腺癌常用；单次波动不等于病情变化', ...cat('肿瘤标志物'),
      points: pts([
        ['2026-04-02', 4.8, '确诊时'], ['2026-04-24', 4.4, '术后第 3 天'], ['2026-07-03', 3.2, '术后 3 个月'],
        ['2026-10-09', 2.4, '复诊']]) },
    { key: 'ca125', name: 'CA125', unit: 'U/mL', dec: 0, band: [0, 35], note: '—', ...cat('肿瘤标志物'),
      points: pts([
        ['2026-04-02', 38, '确诊时'], ['2026-07-03', 22, '术后 3 个月'], ['2026-10-09', 18, '复诊']]) },
    { key: 'fsh', name: 'FSH', unit: 'mIU/mL', dec: 1, band: [3.5, 12.5], note: '卵巢功能随访项；与 AMH 一起看', ...cat('激素与卵巢'),
      points: pts([
        ['2026-04-14', 7.4, '术前基线'], ['2026-10-09', 8.6, '复诊']]) },
    { key: 'amh', name: 'AMH', unit: 'ng/mL', dec: 1, band: [1.0, 4.0], note: '卵巢储备指标；单次数值不预测能否怀孕', ...cat('激素与卵巢'),
      points: pts([
        ['2026-04-14', 2.1, '术前基线'], ['2026-10-09', 1.8, '复诊']]) },
    { key: 'menses', name: '月经恢复情况', dec: null, kind: 'qual', band: null, note: '本人记录，不是医生评估', ...cat('妇科症状'),
      points: pts([
        ['2026-05-20', '已恢复（量略少）', '自查'], ['2026-06-20', '规律', '自查'],
        ['2026-08-20', '规律', '自查'], ['2026-10-05', '规律', '自查']]) },
    { key: 'discharge', name: '阴道排液', dec: null, kind: 'qual', band: null, note: '自述；持续或带血要写进就诊清单', ...cat('妇科症状'),
      points: pts([
        ['2026-05-08', '少量淡血性', '自查'], ['2026-07-03', '无', '自查'], ['2026-10-09', '无', '自查']]) },
  ],
};

/* ---------- 试验：真实登记摘录（2026-01-01 → 2026-10-21 首次公示） ----------
   来源：CT.gov API v2，原始记录在 research/cervical-cancer/{raw-2026,trials-detail}.json。
   标题是登记标题的中文摘要；状态是登记状态，不是入组资格；phase 原样折算（NA = 未分期）。
   topic 是工作台内的检索标签，与登记库分类无关。
   覆盖：新辅助免疫 ×3 / ADC 与双抗 ×3 / 复发一线 Ⅲ 期 ×1 / 后装技术 ×2 /
   放疗长期影响（性功能） ×1 / 生育保留 ×1 / 前病变保守处理 ×1 / 低分割放化疗 ×1 / 营养 ×1。 */
const TRIAL_ROWS = [
  ['NCT07811375', '局部晚期宫颈癌：围手术期 Adebrelimab（PD-L1）联合新辅助化疗', 'Ⅱ期', '尚未招募', '安徽省立医院', '新辅助免疫', '2026-10-21'],
  ['NCT07649174', '局部晚期宫颈癌：卡度尼利单抗（PD-1/CTLA-4 双抗）联合化疗，随机对照', 'Ⅱ期', '尚未招募', '复旦大学附属妇产科医院', '新辅助免疫', '2026-10-21'],
  ['NCT07348861', '局部晚期宫颈癌：新辅助 Sacituzumab Tirumotecan（TROP2 ADC）+ 双免疫', 'Ⅱ期', '尚未招募', '中山大学肿瘤防治中心', '新辅助 ADC', '2026-10-21'],
  ['NCT07424664', '复发/转移宫颈、外阴、阴道癌：Becotatug Vedotin（EGFR ADC）+ 免疫', 'Ⅱ期', '招募中', '华中科技大学同济医学院附属协和医院', '复发 ADC', '2026-10-21'],
  ['NCT07392060', '含铂治疗失败的复发/转移宫颈癌：WX390 + 特瑞普利单抗 vs 研究者选择化疗', 'Ⅲ期', '尚未招募', '上海嘉坦医药（申办方）', '复发一线', '2026-10-21'],
  ['NCT07627620', '复发/转移宫颈癌：卡瑞利珠单抗 + 法米替尼 + 含铂化疗', 'Ⅱ期', '尚未招募', '湖南省肿瘤医院', '复发联合', '2026-10-21'],
  ['NCT07497074', '晚期宫颈癌：JSKN033 联合含铂化疗 ± 贝伐珠单抗', 'Ⅱ期', '尚未招募', '江苏康宁杰瑞（申办方）', '复发 ADC', '2026-10-21'],
  ['NCT07669363', '高级别宫颈鳞状上皮内病变（HSIL）：HAL 光动力治疗延迟手术 vs 直接手术', 'Ⅱ期', '尚未招募', '中山大学孙逸仙纪念医院', '前病变/生育保留', '2026-10-21'],
  ['NCT07394413', '宫颈腺癌保留生育功能手术方式的前瞻性队列', '观察性', '尚未招募', 'Gemelli 大学医院（意大利）', '生育保留', '2026-10-21'],
  ['NCT07855263', '宫颈癌后装治疗中降低阴道受照剂量的可行性研究', '未分期', '尚未招募', 'Duke University（美国）', '后装/阴道保护', '2026-10-21'],
  ['NCT07435987', '局部晚期宫颈癌后装：个体化 ARCHITECT 施源器的临床可行性', 'Ⅰ期', '招募中', 'Erasmus MC（荷兰）', '后装技术', '2026-10-21'],
  ['NCT07597083', '宫颈癌生存者放疗后性功能障碍：生物反馈辅助盆底康复（随机对照）', '未分期', '招募中', 'Beni-Suef University（埃及）', '放疗长期影响', '2026-10-21'],
  ['NCT07709650', '宫颈癌低分割同步放化疗 vs 常规分割（随机 Ⅲ 期）', 'Ⅲ期', '招募中', 'Mahidol University（泰国）', '放疗方案', '2026-10-21'],
  ['NCT07338487', '局部晚期宫颈癌同步放化疗期间：纳米晶甲地孕酮改善恶病质', 'Ⅰ期', '招募中', '中南大学湘雅二医院', '营养支持', '2026-10-21'],
].map(([id, title, phase, status, sponsor, topic, last_verified]) => ({
  id, title, phase, status, sponsor, topic, last_verified, url: 'https://clinicaltrials.gov/study/' + id,
}));

/* ---------- 组装 ---------- */

function assemble(P, commonLabs) {
  const metrics = [...P.extraMetrics, ...commonLabs()].map((m) => ({
    ...m, color: KEY_COLOR[m.key] || m.color, band: m.band ?? null,
  }));
  /* extraMetrics 是组装中间量，不能漏进产物：多一个键就会让 sqlite 读模型与快照 parity 断言对不上。 */
  const { extraMetrics, ...rest } = P;
  return { ...rest, metrics };
}

const DATA = {
  profiles: { A: assemble(PROFILE_A, commonLabsA), B: assemble(PROFILE_B, commonLabsB) },
  trials: TRIAL_ROWS,
};

/* 分节：键 → 对象。读模型按 section_titles 的 key 取回并加 title。 */
const SECTION_KEYS = [
  'figo', 'pathology', 'pathway', 'surgery', 'rt', 'lateEffects', 'lymphedema', 'vagina',
  'menopause', 'fertility', 'fertSurgery', 'ovary', 'sexual', 'cytology', 'hpv', 'imaging',
  'screening', 'nutrition',
];

/* ---------- 纯数据出口（不碰磁盘） ---------- */

export function buildDemoProfiles() {
  return { profiles: DATA.profiles, trials: DATA.trials, meta: buildMeta() };
}

function buildMeta() {
  return [
    ['disclaimer', '全部患者数据为虚构模拟，仅供原型演示；trials 表为真实登记摘录，登记状态未核实'],
    ['generated_at', new Date().toISOString()],
    ['source', 'demo/build-demo-data.mjs（唯一数据源）'],
    ['subjects', '2'],
    ['window', '2026-03-12..2026-10-09'],
    ['window_label', '演示数据覆盖 2026-03-12 → 2026-10-09（约 7 个月）'],
    ['views', '11'],
    ['metrics_rows', String(Object.values(DATA.profiles).reduce((a, p) => a + p.metrics.length, 0))],
    ['points_rows', String(Object.values(DATA.profiles).reduce((a, p) => a + p.metrics.reduce((b, m) => b + m.points.length, 0), 0))],
    ['trials', String(DATA.trials.length)],
    ['trial_window', '2026-01-01..2026-10-21（CT.gov 首次公示）'],
  ];
}

function isDirectRun() {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return realpathSync(resolve(entry)) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

/* ---------- 产 1：SQLite ---------- */

function writeSqlite() {
  const db = new DatabaseSync(join(ROOT, 'demo/demo-data.sqlite'));
  db.exec(`
/* 这张表的结构必须与 schema/0001_initial.sql 逐列一致（scripts/check-demo-columns.mjs 会比对）。
   改动顺序：先改 schema/0001_*.sql（或新增 0002），再改这里。 */
DROP TABLE IF EXISTS metric_points; DROP TABLE IF EXISTS metrics; DROP TABLE IF EXISTS molecular;
DROP TABLE IF EXISTS events; DROP TABLE IF EXISTS rhythm; DROP TABLE IF EXISTS cycles;
DROP TABLE IF EXISTS treatment_lines; DROP TABLE IF EXISTS stage_rows; DROP TABLE IF EXISTS pathology_rows;
DROP TABLE IF EXISTS pathway_rows; DROP TABLE IF EXISTS surgery_rows; DROP TABLE IF EXISTS rt_rows;
DROP TABLE IF EXISTS late_effect_rows; DROP TABLE IF EXISTS lymphedema_rows; DROP TABLE IF EXISTS vagina_rows;
DROP TABLE IF EXISTS menopause_rows; DROP TABLE IF EXISTS hormone_rows; DROP TABLE IF EXISTS fertility_rows;
DROP TABLE IF EXISTS fert_surgery_rows; DROP TABLE IF EXISTS ovary_rows; DROP TABLE IF EXISTS sexual_rows;
DROP TABLE IF EXISTS cytology_rows; DROP TABLE IF EXISTS hpv_rows; DROP TABLE IF EXISTS imaging_rows;
DROP TABLE IF EXISTS screening_rows; DROP TABLE IF EXISTS nutrition_rows; DROP TABLE IF EXISTS supplement_rows;
DROP TABLE IF EXISTS viewpoints; DROP TABLE IF EXISTS trials; DROP TABLE IF EXISTS subjects;
DROP TABLE IF EXISTS section_titles; DROP TABLE IF EXISTS demo_meta; DROP TABLE IF EXISTS documents;
DROP TABLE IF EXISTS candidate_fields; DROP TABLE IF EXISTS profile_meta;

CREATE TABLE subjects (
  profile_key TEXT PRIMARY KEY, name TEXT, sex TEXT, age INTEGER, meta TEXT, headline TEXT,
  stage TEXT, mindset TEXT, histology TEXT, hpv_status TEXT,
  dash_keys TEXT, path TEXT, activity TEXT, family_talk TEXT
);
CREATE TABLE section_titles (profile_key TEXT, key TEXT, title TEXT, ord INTEGER, PRIMARY KEY (profile_key, key));
CREATE TABLE metrics (
  profile_key TEXT, key TEXT, name TEXT, unit TEXT, cat TEXT, color TEXT, dec INTEGER,
  kind TEXT, band_low REAL, band_high REAL, note TEXT, PRIMARY KEY (profile_key, key)
);
CREATE TABLE metric_points (
  profile_key TEXT, metric_key TEXT, d TEXT, v_num REAL, v_text TEXT, src TEXT, ord INTEGER,
  PRIMARY KEY (profile_key, metric_key, d, ord)
);
CREATE TABLE molecular (profile_key TEXT, k TEXT, v TEXT, src TEXT, state TEXT, note TEXT, ord INTEGER);
CREATE TABLE events (profile_key TEXT, d TEXT, label TEXT);
CREATE TABLE rhythm (profile_key TEXT, item TEXT, freq TEXT, guideline TEXT, next TEXT, ord INTEGER);
CREATE TABLE cycles (profile_key TEXT, name TEXT, date TEXT, drugs TEXT, status TEXT, done INTEGER, ord INTEGER);
CREATE TABLE treatment_lines (profile_key TEXT, name TEXT, detail TEXT, done INTEGER, ord INTEGER);
CREATE TABLE stage_rows (profile_key TEXT, item TEXT, value TEXT, note TEXT, ord INTEGER);
CREATE TABLE pathology_rows (profile_key TEXT, kind TEXT, a TEXT, b TEXT, ord INTEGER);
CREATE TABLE pathway_rows (profile_key TEXT, phase TEXT, name TEXT, window TEXT, detail TEXT, note TEXT, ord INTEGER);
CREATE TABLE surgery_rows (profile_key TEXT, d TEXT, procedure TEXT, scope TEXT, lymph TEXT, margins TEXT, institution TEXT, note TEXT, ord INTEGER);
CREATE TABLE rt_rows (profile_key TEXT, mode TEXT, start TEXT, end TEXT, dose TEXT, fractions TEXT, detail TEXT, note TEXT, ord INTEGER);
CREATE TABLE late_effect_rows (profile_key TEXT, d TEXT, system TEXT, grade_text TEXT, detail TEXT, ord INTEGER);
CREATE TABLE lymphedema_rows (profile_key TEXT, d TEXT, site TEXT, stage_text TEXT, measure TEXT, note TEXT, ord INTEGER);
CREATE TABLE vagina_rows (profile_key TEXT, d TEXT, item TEXT, detail TEXT, doctor_text TEXT, is_private INTEGER DEFAULT 1, ord INTEGER);
CREATE TABLE menopause_rows (profile_key TEXT, d TEXT, symptom TEXT, severity_text TEXT, note TEXT, ord INTEGER);
CREATE TABLE hormone_rows (profile_key TEXT, item TEXT, order_text TEXT, start TEXT, end TEXT, source TEXT, ord INTEGER);
CREATE TABLE fertility_rows (profile_key TEXT, item TEXT, value TEXT, note TEXT, ord INTEGER);
CREATE TABLE fert_surgery_rows (profile_key TEXT, d TEXT, procedure TEXT, doctor_text TEXT, followup_req TEXT, ord INTEGER);
CREATE TABLE ovary_rows (profile_key TEXT, d TEXT, item TEXT, value TEXT, note TEXT, ord INTEGER);
CREATE TABLE sexual_rows (profile_key TEXT, d TEXT, item TEXT, detail TEXT, is_private INTEGER DEFAULT 1, ord INTEGER);
CREATE TABLE cytology_rows (profile_key TEXT, d TEXT, method TEXT, result_text TEXT, note TEXT, ord INTEGER);
CREATE TABLE hpv_rows (profile_key TEXT, d TEXT, method TEXT, result_text TEXT, note TEXT, ord INTEGER);
CREATE TABLE imaging_rows (profile_key TEXT, d TEXT, kind TEXT, finding TEXT, next TEXT, note TEXT, ord INTEGER);
CREATE TABLE screening_rows (profile_key TEXT, kind TEXT, item TEXT, value TEXT, note TEXT, ord INTEGER);
CREATE TABLE nutrition_rows (profile_key TEXT, d TEXT, slot TEXT, amount TEXT, foods TEXT, symptoms TEXT, note TEXT, ord INTEGER);
CREATE TABLE supplement_rows (profile_key TEXT, item TEXT, order_text TEXT, start TEXT, end TEXT, source TEXT, ord INTEGER);
CREATE TABLE viewpoints (profile_key TEXT, d TEXT, mood TEXT, text TEXT, ord INTEGER);
CREATE TABLE trials (nct_id TEXT PRIMARY KEY, title TEXT, phase TEXT, status TEXT, sponsor TEXT, url TEXT, topic TEXT, last_verified TEXT);
CREATE TABLE documents (profile_key TEXT, id TEXT, name TEXT, date TEXT, type TEXT, status TEXT, ord INTEGER, PRIMARY KEY (profile_key, id));
CREATE TABLE candidate_fields (profile_key TEXT, id TEXT, name TEXT, value TEXT, source TEXT, status TEXT, ord INTEGER, PRIMARY KEY (profile_key, id));
CREATE TABLE demo_meta (k TEXT PRIMARY KEY, v TEXT);
CREATE TABLE profile_meta (profile_key TEXT, k TEXT, v TEXT, PRIMARY KEY (profile_key, k));

CREATE INDEX idx_points   ON metric_points (profile_key, metric_key);
CREATE INDEX idx_stage    ON stage_rows    (profile_key, ord);
CREATE INDEX idx_rt       ON rt_rows       (profile_key, mode, ord);
CREATE INDEX idx_cytology ON cytology_rows (profile_key, d);
CREATE INDEX idx_docs     ON documents     (profile_key);
`);

  const insSubject = db.prepare(`INSERT INTO subjects
    (profile_key, name, sex, age, meta, headline, stage, mindset, histology, hpv_status,
     dash_keys, path, activity, family_talk)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  const insSectionTitle = db.prepare('INSERT INTO section_titles (profile_key, key, title, ord) VALUES (?,?,?,?)');
  /* 档案级零散标量（schema/0002）：一个档案一个值的字段一律进这里，别再 ALTER 补列。 */
  const insProfileMeta = db.prepare('INSERT INTO profile_meta (profile_key, k, v) VALUES (?,?,?)');
  const insMetric = db.prepare(`INSERT INTO metrics
    (profile_key, key, name, unit, cat, color, dec, kind, band_low, band_high, note)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)`);
  const insPoint = db.prepare(`INSERT INTO metric_points
    (profile_key, metric_key, d, v_num, v_text, src, ord) VALUES (?,?,?,?,?,?,?)`);
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
  const insViewpoint = db.prepare('INSERT INTO viewpoints (profile_key, d, mood, text, ord) VALUES (?,?,?,?,?)');
  const insDoc = db.prepare('INSERT INTO documents (profile_key, id, name, date, type, status, ord) VALUES (?,?,?,?,?,?,?)');
  const insCandidate = db.prepare('INSERT INTO candidate_fields (profile_key, id, name, value, source, status, ord) VALUES (?,?,?,?,?,?,?)');

  for (const [k, p] of Object.entries(DATA.profiles)) {
    insSubject.run(k, p.name, p.sex, p.age, p.meta, p.headline, p.stage, p.mindset,
      p.histology, p.hpv_status,
      JSON.stringify(p.dash_keys), JSON.stringify(p.path), p.activity, p.familyTalk);

    SECTION_KEYS.forEach((key, i) => {
      if (p[key] && p[key].title) insSectionTitle.run(k, key, p[key].title, i);
    });

    for (const m of p.metrics) {
      /* 分类指标：unit 必须 NULL（口径：不写空串）；dec 为 null 时 kind 记 'qual' 或调用方给的 'grade' */
      insMetric.run(k, m.key, m.name, m.unit ?? null, m.cat ?? null, m.color ?? null,
        m.dec ?? null, m.dec === null ? (m.kind || 'qual') : 'numeric',
        m.band ? m.band[0] : null, m.band ? m.band[1] : null, m.note ?? null);
      m.points.forEach((pt, i) => insPoint.run(k, m.key, pt.d,
        typeof pt.v === 'number' ? pt.v : null,
        typeof pt.v === 'number' ? null : pt.v,
        pt.src ?? null, i));
    }
    p.molecular.forEach((x, i) => insMolecular.run(k, x.k, x.v, x.src ?? null, x.state ?? null, x.note ?? null, i));
    p.events.forEach((e) => insEvent.run(k, e[0], e[1]));
    p.rhythm.forEach((r, i) => insRhythm.run(k, r[0], r[1], r[2], r[3], i));
    p.cycles.forEach((c, i) => insCycle.run(k, c[0], c[1], c[2], c[3], c[4] ? 1 : 0, i));
    p.lines.forEach((l, i) => insLine.run(k, l.name, l.detail, l.done ? 1 : 0, i));
    if (p.figo) p.figo.rows.forEach((r, i) => insStage.run(k, r[0], r[1], r[2], i));
    if (p.pathology) insProfileMeta.run(k, 'pathology_status', p.pathology.status ?? null);
    p.pathology.rows.forEach((r, i) => insPathology.run(k, 'row', r[0], r[1], i));
    p.pathology.gaps.forEach((r, i) => insPathology.run(k, 'gap', r[0], r[1], i));
    if (p.pathway) p.pathway.rows.forEach((r, i) => insPathway.run(k, r[0], r[1], r[2], r[3], r[4], i));
    if (p.surgery) p.surgery.rows.forEach((r, i) => insSurgery.run(k, r[0], r[1], r[2], r[3], r[4], r[5], r[6], i));
    if (p.rt) p.rt.rows.forEach((r, i) => insRt.run(k, r[0], r[1], r[2], r[3], r[4], r[5], r[6], i));
    if (p.lateEffects) p.lateEffects.rows.forEach((r, i) => insLateEffect.run(k, r[0], r[1], r[2] ?? null, r[3], i));
    if (p.lymphedema) p.lymphedema.rows.forEach((r, i) => insLymphedema.run(k, r[0], r[1], r[2] ?? null, r[3], r[4], i));
    if (p.vagina) p.vagina.rows.forEach((r, i) => insVagina.run(k, r[0], r[1], r[2], r[3], r[4] ? 1 : 0, i));
    if (p.menopause) p.menopause.rows.forEach((r, i) => insMenopause.run(k, r[0], r[1], r[2], r[3], i));
    if (p.hormone) p.hormone.forEach((r, i) => insHormone.run(k, r[0], r[1], r[2], r[3] ?? null, r[4], i));
    if (p.fertility) p.fertility.rows.forEach((r, i) => insFertility.run(k, r[0], r[1], r[2], i));
    if (p.fertSurgery) p.fertSurgery.rows.forEach((r, i) => insFertSurgery.run(k, r[0], r[1], r[2], r[3], i));
    if (p.ovary) p.ovary.rows.forEach((r, i) => insOvary.run(k, r[0], r[1], r[2], r[3], i));
    if (p.sexual) p.sexual.rows.forEach((r, i) => insSexual.run(k, r[0], r[1], r[2], r[3] ? 1 : 0, i));
    if (p.cytology) p.cytology.rows.forEach((r, i) => insCytology.run(k, r[0], r[1], r[2], r[3], i));
    if (p.hpv) p.hpv.rows.forEach((r, i) => insHpv.run(k, r[0], r[1], r[2], r[3], i));
    if (p.imaging) p.imaging.rows.forEach((r, i) => insImaging.run(k, r[0], r[1], r[2], r[3], r[4], i));
    if (p.screening) p.screening.rows.forEach((r, i) => /* 第 4 列 note 允许省略（本人筛查史多数没有备注），显式兜 null */
      insScreening.run(k, r[0], r[1], r[2], r[3] ?? null, i));
    if (p.nutrition) p.nutrition.rows.forEach((r, i) => insNutrition.run(k, r[0], r[1], r[2], r[3], r[4], r[5], i));
    p.supplements.forEach((r, i) => insSupplement.run(k, r[0], r[1], r[2], r[3] ?? null, r[4], i));
    p.viewpoints.forEach((v, i) => insViewpoint.run(k, v[0], v[1], v[2], i));
    p.docs.forEach((d, i) => insDoc.run(k, d[0], d[1], d[2], d[3], d[4], i));
    p.candidates.forEach((c, i) => insCandidate.run(k, c[0], c[1], c[2], c[3], c[4], i));
  }

  const insTrial = db.prepare('INSERT INTO trials (nct_id, title, phase, status, sponsor, url, topic, last_verified) VALUES (?,?,?,?,?,?,?,?)');
  DATA.trials.forEach((t) => insTrial.run(t.id, t.title, t.phase, t.status, t.sponsor, t.url, t.topic, t.last_verified));
  const insMeta = db.prepare('INSERT INTO demo_meta (k, v) VALUES (?,?)');
  buildMeta().forEach(([k, v]) => insMeta.run(k, v));
  db.close();
}

/* ---------- 产 2：原型数据层 ---------- */

function writePrototypeJs() {
  /* 只有 profiles 与 trials 进前端快照：meta 带 generated_at（每次都变），放进快照会让文件每次运行都变。 */
  const js = '/* 由 demo/build-demo-data.mjs 生成；勿手改，改数据请改生成器后重新运行。 */\n'
    + 'window.DEMO_DATA = ' + JSON.stringify(DATA) + ';\n';
  writeFileSync(join(P2, 'demo-data.js'), js);
}

if (isDirectRun()) {
  writeSqlite();
  writePrototypeJs();
  const nMetrics = Object.values(DATA.profiles).reduce((a, p) => a + p.metrics.length, 0);
  const nPoints = Object.values(DATA.profiles).reduce((a, p) => a + p.metrics.reduce((b, m) => b + m.points.length, 0), 0);
  console.log(`demo-data.sqlite + demo-data.js 生成完毕：2 档案 / ${nMetrics} 项指标 / ${nPoints} 个数据点 / ${DATA.trials.length} 条试验`);
}
