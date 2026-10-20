/* 宫颈癌工作台 · 初始数据模型（0001）
 *
 * 家族四条契约（与肠癌、胃癌、食管癌同源，改这里等于改契约）：
 *   1. 看法恒不为结论（viewpoints 只是记录，不设 is_conclusion 列，由读模型保证恒为"不是医生结论"）；
 *   2. 四点位 1–4 点且缺健侧不生成差值（NULL ≠ 0）—— 宫颈癌本轮不做四点位，留白不建表；
 *   3. 更正只新增版本，不覆盖（pathway_rows 留旧路径、stage_rows 留旧分期）；
 *   4. 事实四层不合并（文档 / 候选 / 记录 / 指标分表存放）。
 *
 * 迁移只增不改：本文件冻结后（sha256 见 freeze-contract.md），
 * 要加结构只能新增 0002_*.sql，改这里会被 scripts/check-schema.mjs 拦下。
 *
 * 宫颈癌独有的五条口径（写在这里，读模型与前端都按这个来）：
 *   A. **FIGO 分期只记录，不自算**（SPEC A1）：stage_rows 存医生给出的分期、r/p 标记、依据原文与日期，
 *      不设任何由 TNM 推导 FIGO 的列或触发器。IIIC1/IIIC2 必须能分开存，故分期值用 TEXT 原样抄。
 *   B. **外照射与后装分列**（SPEC A2）：rt_rows.mode 取 'EBRT' | '后装'，各自记剂量与次数，
 *      **不设"总剂量"合成列** —— 两者剂量学不可直接相加，加了就一定会有人去加。
 *   C. **细胞学与 HPV 只存原文**（SPEC A7）：cytology_rows.result_text / hpv_rows.result_text 是报告原文抄录，
 *      表里没有"正常/异常/阳性/阴性"枚举列，避免界面重判读。
 *   D. **性与生育默认私密**（SPEC A4）：sexual_rows.is_private 缺省 1；vagina_rows.is_private 缺省 1（扩张训练）。
 *      读模型必须默认过滤 is_private=1，导出层不得包含；本人显式开放才变更。
 *   E. **SCC-Ag 只属于鳞癌**（SPEC A8）：数据层不拦（同一张 metrics 表），由档案的 histology 决定是否显示；
 *      腺癌档案写 scc 指标属于数据错误，check 脚本会比对 metrics.key 与档案病理类型。
 *
 * 与食管癌模型的结构差异（勿互相抄回）：
 *   - 食管癌的分段 / 吞咽六档 / 进食通路 / 扩张 / 内镜 五张表，在这里换成
 *     stage / rt / late_effect / lymphedema / vagina / menopause / hormone / fertility /
 *     fert_surgery / ovary / sexual / cytology / hpv / imaging / screening 十五张表；
 *   - **分节标题改存 section_titles 表，不再用 subjects 上的一排 *_title 列**：
 *     食管癌那轮 0001 漏了两节标题，只能再发 0002 ALTER 补列，生成器、读模型、25 列 INSERT
 *     三处跟着改，是本轮最贵的一次返工。表化之后加一节只加一行，不动表结构。
 *     代价：读模型要一次查出再分组（见 dsh/readmodels.js 的 sectionsByKey）。
 *   - subjects 上保留 headline / stage / mindset 三个"一眼看到"的标量，其余分节标题一律进 section_titles。
 */

/* ---------- 档案级 ---------- */

CREATE TABLE subjects (
  profile_key   TEXT PRIMARY KEY,
  name          TEXT,
  sex           TEXT,
  age           INTEGER,
  meta          TEXT,            -- 侧栏第二行（年龄 · 病理 · 分期 · 职业）
  headline      TEXT,            -- 看板顶部一句病情摘要
  stage         TEXT,            -- 一眼看到的分期字符串（与 stage_rows 的"分期"行同源，不许单独改）
  mindset       TEXT,
  histology     TEXT,            -- 鳞癌 / 腺癌 / 腺鳞癌 / 其他：决定 SCC-Ag 是否显示（口径 E）
  hpv_status    TEXT,            -- 高危型别与检测方法摘要（原文在 hpv_rows）
  dash_keys     TEXT,            -- JSON 数组：看板指标卡顺序
  path          TEXT,            -- JSON 数组：路径条（病理 / 分期 / 当前路径）
  activity      TEXT,
  family_talk   TEXT
);

/* 分节标题（口径 D1）：key 与读模型里的 section 键一一对应，ord 决定同页内顺序。
   某个档案没有这一节就不写行 —— 读模型返回 null，前端整节不渲染（不写空标题）。 */
CREATE TABLE section_titles (
  profile_key TEXT,
  key         TEXT,
  title       TEXT,
  ord         INTEGER,
  PRIMARY KEY (profile_key, key)
);

/* ---------- 指标（通用） ---------- */

CREATE TABLE metrics (
  profile_key TEXT,
  key         TEXT,
  name        TEXT,
  unit        TEXT,              -- 分类指标必须 NULL（不写空字符串）
  cat         TEXT,
  color       TEXT,
  dec         INTEGER,           -- 数值指标小数位；NULL = 分类/等级指标
  kind        TEXT,              -- 'numeric' | 'grade' | 'qual'
  band_low    REAL,
  band_high   REAL,
  note        TEXT,
  PRIMARY KEY (profile_key, key)
);

CREATE TABLE metric_points (
  profile_key TEXT,
  metric_key  TEXT,
  d           TEXT,              -- 采样日期 YYYY-MM-DD
  v_num       REAL,              -- 数值指标
  v_text      TEXT,              -- 分类/等级指标原值
  src         TEXT,              -- 来源（报告名 / 场合）
  ord         INTEGER,
  PRIMARY KEY (profile_key, metric_key, d, ord)
);

/* 分子/免疫组化：宫颈癌看 PD-L1 CPS、p16（HPV 相关性的替代标记）、MMR、HER2（腺癌）。
   四态 state：ok 已检测 / na 未检测 / warn 需关注 / pending 待出。未检测不得写成"阴性"。 */
CREATE TABLE molecular (
  profile_key TEXT,
  k           TEXT,
  v           TEXT,
  src         TEXT,
  state       TEXT,
  note        TEXT,
  ord         INTEGER
);

/* ---------- 病情与时间轴（通用） ---------- */

CREATE TABLE events (
  profile_key TEXT,
  d           TEXT,
  label       TEXT
);

CREATE TABLE rhythm (
  profile_key TEXT,
  item        TEXT,
  freq        TEXT,
  guideline   TEXT,
  next        TEXT,
  ord         INTEGER
);

CREATE TABLE cycles (
  profile_key TEXT,
  name        TEXT,
  date        TEXT,
  drugs       TEXT,
  status      TEXT,
  done        INTEGER,
  ord         INTEGER
);

CREATE TABLE treatment_lines (
  profile_key TEXT,
  name        TEXT,
  detail      TEXT,
  done        INTEGER,
  ord         INTEGER
);

/* ---------- 宫颈癌专属 ---------- */

/* FIGO 2018 分期档案（口径 A / SPEC A1）：
   item 取 分期 / 分期体系 / r-p 标记 / 依据 / 医生原话 / 记录日期 …
   value 原样抄医生给的值（如「IIIC1r」「IIIC2p」），**不允许前端拆解或重算**。
   旧分期不删除：同一 item 可以有多行（按 ord 排序，最新在前）。 */
CREATE TABLE stage_rows (
  profile_key TEXT,
  item        TEXT,
  value       TEXT,
  note        TEXT,
  ord         INTEGER
);

/* 病理资料：kind 取 'row'（已确认条目）/ 'gap'（缺口，待核对或未检测）。
   a = 项目，b = 结果或说明。腺癌/鳞癌、分化、LVSI、浸润深度、切缘都在这张表。 */
CREATE TABLE pathology_rows (
  profile_key TEXT,
  kind        TEXT,
  a           TEXT,
  b           TEXT,
  ord         INTEGER
);

/* 治疗路径三选一（SPEC §3）：手术 / 根治性放化疗 / 系统治疗。
   切换路径时新增一行并留旧路径，不覆盖：phase 只取「当前 / 既往」；
   为什么换路径写 note（医生原话），工作台不判断该不该换。 */
CREATE TABLE pathway_rows (
  profile_key TEXT,
  phase       TEXT,
  name        TEXT,
  window      TEXT,
  detail      TEXT,
  note        TEXT,
  ord         INTEGER
);

/* 手术范围记录（SPEC A3 的"做了什么"部分）：
   procedure 取 锥切 / 根治性宫颈切除 / 筋膜外子宫切除 / 广泛子宫切除 / 盆腔廓清 …；
   scope 记范围与入路（腹腔镜 / 开腹 / 机器人），lymph 记淋巴清扫范围，margins 记切缘原文。
   只记做了什么，不给"该不该做/做得够不够"的判断。 */
CREATE TABLE surgery_rows (
  profile_key TEXT,
  d           TEXT,
  procedure   TEXT,
  scope       TEXT,
  lymph       TEXT,
  margins     TEXT,
  institution TEXT,
  note        TEXT,
  ord         INTEGER
);

/* 放疗疗程（口径 B / SPEC A2）：mode='EBRT' 记外照射（剂量/次数/技术），
   mode='后装' 记近距离治疗（分次数/每次剂量/施源器）。两者分列，不合成总剂量。
   dose 存原文（如「50.4 Gy/28 次」「6 Gy × 5 次」），避免单位换算引入错误。 */
CREATE TABLE rt_rows (
  profile_key TEXT,
  mode        TEXT,              -- 'EBRT' | '后装'
  start       TEXT,
  end         TEXT,
  dose        TEXT,
  fractions   TEXT,
  detail      TEXT,              -- 技术/施源器/靶区（原文摘录）
  note        TEXT,
  ord         INTEGER
);

/* 放疗长期影响事件（SPEC A5）：system 取 肠道 / 膀胱 / 皮肤 / 其他。
   grade_text 抄医生记录的分级原文（如「2 级」「CTCAE 1 级」），无分级就写 NULL，
   **不自行补分级、不给处理建议**。 */
CREATE TABLE late_effect_rows (
  profile_key TEXT,
  d           TEXT,
  system      TEXT,
  grade_text  TEXT,
  detail      TEXT,
  ord         INTEGER
);

/* 下肢淋巴水肿（SPEC V6）：site 记部位（单侧/双侧/大腿/小腿），
   stage_text 抄医生给的分期（如「Ⅰ期」），measure 记周径差原值（cm，按测量部位写清）。
   工作台不做分诊、不推荐压力袜型号。 */
CREATE TABLE lymphedema_rows (
  profile_key TEXT,
  d           TEXT,
  site        TEXT,
  stage_text  TEXT,
  measure     TEXT,
  note        TEXT,
  ord         INTEGER
);

/* 阴道狭窄与扩张训练（口径 D / SPEC V4）：item 取 狭窄程度 / 扩张训练 / 医嘱。
   is_private 缺省 1：这条记录默认不进导出、不进看板摘要。
   doctor_text 只抄医嘱原文，不写"应该多久一次"的自造建议。 */
CREATE TABLE vagina_rows (
  profile_key TEXT,
  d           TEXT,
  item        TEXT,
  detail      TEXT,
  doctor_text TEXT,
  is_private  INTEGER DEFAULT 1,
  ord         INTEGER
);

/* 绝经症状（治疗诱导绝经，SPEC A6 的第一列）：symptom 取 潮热 / 盗汗 / 失眠 / 情绪 …
   severity_text 抄自述或医生记录，不换算成量表分。 */
CREATE TABLE menopause_rows (
  profile_key TEXT,
  d           TEXT,
  symptom     TEXT,
  severity_text TEXT,
  note        TEXT,
  ord         INTEGER
);

/* 激素替代 / 非激素用药医嘱（SPEC A6 的第二列，与症状表**分开**，不许合并成一行）：
   只存医嘱原文与起止，无剂量推荐、无品牌比较。 */
CREATE TABLE hormone_rows (
  profile_key TEXT,
  item        TEXT,
  order_text  TEXT,
  start       TEXT,
  end         TEXT,
  source      TEXT,
  ord         INTEGER
);

/* 生育状态档案（SPEC V2）：item 取 婚育史 / 生育意愿 / 避孕方式 / 医生谈过什么。
   value 是患者自述或医生原话，工作台不判断"还能不能生"。 */
CREATE TABLE fertility_rows (
  profile_key TEXT,
  item        TEXT,
  value       TEXT,
  note        TEXT,
  ord         INTEGER
);

/* 生育保留手术记录（SPEC A3）：procedure 取 冷刀锥切 / LEEP / 根治性宫颈切除 / 卵巢移位 …
   followup_req 是**随访要求原文位**（医生写的复查频率与内容），不许改写成建议。 */
CREATE TABLE fert_surgery_rows (
  profile_key TEXT,
  d           TEXT,
  procedure   TEXT,
  doctor_text TEXT,
  followup_req TEXT,
  ord         INTEGER
);

/* 卵巢功能（SPEC A6 周边）：item 取 FSH / AMH / E2 / 医生结论，value 原文 + 单位。
   治疗诱导绝经的判断由医生给，这里只存数值与结论原话。 */
CREATE TABLE ovary_rows (
  profile_key TEXT,
  d           TEXT,
  item        TEXT,
  value       TEXT,
  note        TEXT,
  ord         INTEGER
);

/* 性健康记录（口径 D / SPEC A4，全家族首个默认私密模块）：
   item 取 性交痛 / 干涩 / 出血 / 顾虑；detail 是本人自述。
   is_private 缺省 1；读模型默认不返回，除非调用方显式 includePrivate=true。 */
CREATE TABLE sexual_rows (
  profile_key TEXT,
  d           TEXT,
  item        TEXT,
  detail      TEXT,
  is_private  INTEGER DEFAULT 1,
  ord         INTEGER
);

/* 阴道残端细胞学（口径 C / SPEC A7）：result_text 是报告原文抄录，
   表里**没有**"正常/异常"列 —— 界面也不许加"正常/异常"标签（A7 的验收点）。 */
CREATE TABLE cytology_rows (
  profile_key TEXT,
  d           TEXT,
  method      TEXT,              -- 液基细胞学 / 巴氏涂片 / 其他
  result_text TEXT,              -- 原文，含 NILM/ASC-US/LSIL 等英文缩写也照抄
  note        TEXT,
  ord         INTEGER
);

/* HPV 检测记录：method 记检测平台（如 HC2 / PCR 分型），result_text 抄原文（含型别）。 */
CREATE TABLE hpv_rows (
  profile_key TEXT,
  d           TEXT,
  method      TEXT,
  result_text TEXT,
  note        TEXT,
  ord         INTEGER
);

/* 影像随访（逐次记录已发生的检查）：kind 取 盆腔 MRI / 胸腹盆 CT / PET-CT / 超声；
   finding 抄报告结论原文，next 抄报告或医生写的下一次建议（不改写成我们的建议）。 */
CREATE TABLE imaging_rows (
  profile_key TEXT,
  d           TEXT,
  kind        TEXT,
  finding     TEXT,
  next        TEXT,
  note        TEXT,
  ord         INTEGER
);

/* 筛查与预防子页（SPEC A15：不设一级页，防变成科普页）：
   kind 取 本人筛查史 / 疫苗记录 / 家属可讨论问题。
   只存本人档案与"下次可以问医生什么"，**不写疫苗建议、不写给家属的建议**。 */
CREATE TABLE screening_rows (
  profile_key TEXT,
  kind        TEXT,
  item        TEXT,
  value       TEXT,
  note        TEXT,
  ord         INTEGER
);

/* 营养支持（骨架页，权重低于食管癌）：记"吃了多少"，按自述，不做热量换算。 */
CREATE TABLE nutrition_rows (
  profile_key TEXT,
  d           TEXT,
  slot        TEXT,
  amount      TEXT,
  foods       TEXT,
  symptoms    TEXT,
  note        TEXT,
  ord         INTEGER
);

/* 营养补充医嘱留痕：只显示医嘱原文与起止，无剂量推荐、无品牌。 */
CREATE TABLE supplement_rows (
  profile_key TEXT,
  item        TEXT,
  order_text  TEXT,
  start       TEXT,
  end         TEXT,
  source      TEXT,
  ord         INTEGER
);

/* ---------- 通用 ---------- */

CREATE TABLE viewpoints (
  profile_key TEXT,
  d           TEXT,
  mood        TEXT,
  text        TEXT,
  ord         INTEGER
);

/* 临床试验：真实登记摘录，状态是登记状态，不是入组资格。
   topic 是工作台内的检索标签（与登记库的分类无关），用于「按关注点筛」；
   last_verified 记我们最后一次核对登记页的日期，过期就要重新核。 */
CREATE TABLE trials (
  nct_id        TEXT PRIMARY KEY,
  title         TEXT,
  phase         TEXT,
  status        TEXT,
  sponsor       TEXT,
  url           TEXT,
  topic         TEXT,
  last_verified TEXT
);

CREATE TABLE documents (
  profile_key TEXT,
  id          TEXT,
  name        TEXT,
  date        TEXT,
  type        TEXT,
  status      TEXT,
  ord         INTEGER,
  PRIMARY KEY (profile_key, id)
);

CREATE TABLE candidate_fields (
  profile_key TEXT,
  id          TEXT,
  name        TEXT,
  value       TEXT,
  source      TEXT,
  status      TEXT,
  ord         INTEGER,
  PRIMARY KEY (profile_key, id)
);

CREATE TABLE demo_meta (
  k TEXT PRIMARY KEY,
  v TEXT
);

CREATE INDEX idx_points   ON metric_points (profile_key, metric_key);
CREATE INDEX idx_stage    ON stage_rows    (profile_key, ord);
CREATE INDEX idx_rt       ON rt_rows       (profile_key, mode, ord);
CREATE INDEX idx_cytology ON cytology_rows (profile_key, d);
CREATE INDEX idx_docs     ON documents     (profile_key);
