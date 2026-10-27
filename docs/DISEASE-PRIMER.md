# 疾病概要 · 宫颈癌

> 本项目实例文件，由 `xyb-workbench-starter` 的 `templates/DISEASE-PRIMER.md` 复制而来。
> 规范：starter `docs/36-DISEASE-PRIMER.md`。四段固定、顺序不变，缺段不合格。

- 项目 / 品牌：小莲宝 CerviPal
- 病种：宫颈癌（Cervical Cancer）
- 最后更新：2026-10-25
- 数据文件：`prototypes/v0.2/primer-data.js`（`window.DISEASE_PRIMER`）
- README 对应段：`## 疾病概要`
- 实现：`prototypes/v0.2/primer.js` + `primer.css`（来自 starter `assets/patterns/`，逻辑未改）
- 探针：`NODE_OPTIONS= node scripts/probe-disease-primer.mjs --port 8132 --url http://127.0.0.1:8132/prototypes/v0.2/index.html` → 9/9

## 0 原件状态（本项目的前提）

| 文件 | 状态 |
|---|---|
| FIGO 2018 宫颈癌分期 | **未取得原件**：据 `docs/SPEC.md` 与 `docs/USER-RESEARCH.md` 转引 |
| CSCO 宫颈癌诊疗指南 | **未取得原件**：`docs/USER-RESEARCH.md` 原文写明「CSCO / NCCN 宫颈癌指南全文未核对」，版本号不臆测 |
| NCCN Cervical Cancer | **未取得原件**，同上 |
| WHO 女性生殖系统肿瘤分类 | **未取得原件**，版本未核实 |

这一条与家族既有口径一致：**没看到原件，不许假装看到了**。所以本项目证据表里两个肿瘤指南都写「版本未核实」，不填一个像样的年份。

## 1 定义（`definition`）

宫颈癌是发生在子宫颈上皮的恶性肿瘤。治疗路径先按临床分期分岔：手术，还是根治性放化疗。

- 病理类型常见鳞状细胞癌、腺癌、腺鳞癌三类；本台按三类建档，不合并成一个空字段。
- 分期用 FIGO 2018 宫颈癌临床分期，含 IIIC1 / IIIC2 与 r（影像）/ p（病理）标记。
- FIGO 2018 允许影像与病理参与分期；本台只记录医生给出的期别、依据原文与日期，不自算、不推导。
- HPV 筛查史单列：筛查史与发病不是因果关系，本台不做归因。

**来源**：FIGO · FIGO staging for carcinoma of the cervix uteri（2018 修订）· 未取得原件，据二次来源 · 页码待核 ｜ WHO · Classification of Tumours: Female Genital Tumours, 5th ed. · 版本未核实 · 未取得原件，据二次来源 · 页码待核

## 2 医学资料规范和指南情况（`evidence`）

| 机构 | 文件 | 版本 / 年份 | 原件 | 本台的用途 |
|---|---|---|---|---|
| FIGO | FIGO staging for carcinoma of the cervix uteri | 2018 修订 | [未取得原件，据 NCI PDQ 二次来源](https://www.cancer.gov/types/cervical/hp/cervical-treatment-pdq) | 分期档案的期别结构（含 IIIC1/IIIC2、r/p 标记） |
| CSCO | CSCO 宫颈癌诊疗指南 | 版本未核实 | [未取得原件，据出版方书目页](https://www.pmphmall.com/gdsdetail/660506-338835) | 国内治疗路径与药物可及性的对照；本版不作引用依据 |
| NCCN | NCCN Guidelines · Cervical Cancer | 版本未核实 | [未取得原件，据 NCCN 官网指南页](https://www.nccn.org/guidelines/guidelines-detail?category=1&id=1426) | 国际路径结构的对照；本版不作引用依据 |
| WHO | Classification of Tumours: Female Genital Tumours | 第 5 版（年份未核实） | [未取得原件，据 IARC 官方书目页](https://publications.iarc.fr/Book-And-Report-Series/Who-Classification-Of-Tumours/Female-Genital-Tumours-2020) | 病理类型命名口径 |

- 一台一表，不合并；未取得原件的必须标出来。
- 两个肿瘤指南只到「存在」这一层，本表不引用其条文，也不做版本对比。

**来源**：见上表逐行。

## 3 目前治疗全景概要（`landscape`）

按病期 / 线序分组，只列指南列举过的手段类别，不排序、不比优劣、不含剂量与疗程。

### 3.1 早期（可以手术时）

- 手术：按期别与是否要求保留生育，指南结构里出现锥切、根治性宫颈切除、广泛子宫切除与盆腔淋巴结评估等术式。术式取舍属医生判断。
- 生育保留：锥切与根治性宫颈切除等保留子宫或宫颈的术式被列出，适用条件严格；本台只记录医生提过哪些、你怎么想。
- 术后辅助治疗：按病理高危因素决定是否加放疗或放化疗。

### 3.2 局部晚期 / 不能手术时

- 根治性同步放化疗（dCRT）：体外放疗 + 含铂化疗 + 后装是这一段的路径主干。
- 后装（brachytherapy）：近距离放疗是根治性放疗的组成部分；本台只记疗程与日期。
- 支持性内容：营养支持、贫血与不良反应处理被列出；本台只记录症状与检查值。

### 3.3 复发 / 转移后

- 系统治疗：化疗、靶向治疗、免疫治疗在不同线序中被列出。本项目未取得指南全文，此处只写类别，不写具体药物与线序。
- 局部处理：复发灶的放疗或手术在特定情形下被列出。
- 临床研究：被列为正式选项，不是最后手段。

### 3.4 贯穿全程

- 放疗后的长期影响：阴道狭窄、淋巴水肿、治疗诱导绝经与卵巢功能变化；本台只记录你的感受与处理，不判定严重程度。
- 随访节奏：阴道残端细胞学等复查项目按医生安排执行；本台只整理时间线。

**固定出口（原话照抄）**：

> 以上是文献与指南里列出的手段，按病期与线序排列，不代表任何一项适合你。选哪一个，这一句需要问你的医生。

**来源**：FIGO · FIGO staging for carcinoma of the cervix uteri（2018 修订）· 未取得原件，据二次来源 · 页码待核 ｜ CSCO · CSCO 宫颈癌诊疗指南 · 版本未核实 · 未取得原件 · 页码待核

## 4 发展趋势（`trend`）

只写已发生的事实，每条带日期或版本号。

1. 2018 年：FIGO 发布宫颈癌 2018 修订分期，把影像（r）与病理（p）淋巴结结果纳入 IIIC1 / IIIC2。
2. 截至 2026-10-21：ClinicalTrials.gov 以 query.cond=cervical cancer、StudyFirstPostDate 2026-01-01 至 2026-10-21 检索到 158 条登记；人工筛出 14 条（Ⅰ期 2、Ⅱ期 7、Ⅲ期 2、观察性 1、登记未分期 2）。
3. 2026-10-21：国家药监局药物临床试验登记与信息公示平台返回 HTTP 202 挑战页、ChiCTR 返回 HTTP 405，两个渠道本轮判定不可采集，中国登记覆盖数未知。

**未写**：本项目没有核实过任何 NMPA 批件，也没有拿到指南版本更替的原文，所以这两类事实一条都没写。

**来源**：FIGO 2018 修订 · 未取得原件 · 页码待核 ｜ ClinicalTrials.gov · API v2 检索（检索日 2026-10-21）· 一手登记数据，本项目自采 ｜ NMPA 药品审评中心 / ChiCTR · 采集探测记录（2026-10-21）· 只存判定，未复制站点内容

## 5 落地清单

- [x] `prototypes/v0.2/primer.css`（starter 原样复制）
- [x] `prototypes/v0.2/primer.js`（starter 原样复制，逻辑未改）
- [x] `prototypes/v0.2/primer-data.js`（四段数据）
- [x] `index.html` 三处引用：`primer.css`、`primer-data.js`、`primer.js`
- [x] 顶栏「?」由模块自动插入 `.top-actions`（未手写按钮）
- [x] README 的 `## 疾病概要` 四段正文（位置：项目简介之后、`## 当前状态` 之前）
- [x] `NODE_OPTIONS= node scripts/probe-disease-primer.mjs --port 8132 --url …/prototypes/v0.2/index.html` → 9/9 PASS
- [x] `node /Users/qinxiaoqiang/Downloads/xyb-workbench-starter/scripts/check-conformance.mjs .` → primer/* 四项无失败

## 6 验收（P1–P8）

| 编号 | 判据 | 结果 |
|---|---|---|
| P1 | 顶栏有可点「?」，aria-label 说明四段 | ✅ text="?" label="疾病概要：定义、医学资料与指南情况、治疗全景、发展趋势" |
| P2 | 整页面板，四段顺序 定义 → 指南 → 治疗全景 → 趋势 | ✅ definition › evidence › landscape › trend |
| P3 | 面板宽高 ≥ 视口 90% | ✅ 1249×829 / 视口 1280×860 |
| P4 | 打开压一条 history，`history.back()` 收起 | ✅ history.length=3；返回后 open=false |
| P5 | 「返回」「关闭」两个独立入口 | ✅ back=true close=true same=false |
| P6 | 关闭后焦点回触发按钮、滚动位置不变 | ✅ focusOnTrigger=true scrollY=260→260 |
| P7 | Esc 只退一层 | ✅ open=false，URL 仍在 /prototypes/v0.2/index.html |
| P8 | 四段齐全、每段有来源、趋势段无禁止词 | ✅ |

## 7 本项目教训

- **「全文未核对」不是一句客套**：项目 `docs/USER-RESEARCH.md` 明确写了 CSCO / NCCN 宫颈癌指南全文未核对。写证据表时手很痒，想填「CSCO 2025」；填了就等于把二手印象当版本号，最后写「版本未核实」。
- **趋势段凑不出五类就不凑**：登记数量和 FIGO 2018 都是项目自采/自引的事实；NMPA 批件与指南版本更替手上没有，就整类不写。
- **覆盖率必须跟着数字走**：158 条是 ClinicalTrials.gov 单通道数字，国内两个平台被 WAF 拦。只报 158 会让人以为是全国全量，所以第三条专门写渠道边界。
