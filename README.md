# 小莲宝 CerviPal 宫颈癌工作台

简体中文 · CerviPal Cervical Cancer Workbench

小莲宝（CerviPal）是面向宫颈癌患者及照护者的 DSH Desktop 本机优先工作台。它围绕 FIGO 2018 临床分期与治疗路径，重点记录生育保留、放疗长期影响（后装疗程、淋巴水肿、阴道狭窄、治疗诱导绝经）与随访节奏。医疗内容只用于资料整理和就诊沟通，不替代医生诊断或治疗意见。

## 疾病概要

> 四段固定：定义 → 医学资料规范和指南情况 → 目前治疗全景概要 → 发展趋势。整体属**解释层**（第 ② 层）：
> 只整理公开信息，不判断你的病情。工作台右上角的「?」看同一份内容的整页版。
> 原件状态照实写：FIGO 2018 据项目 SPEC 转引；CSCO / NCCN 宫颈癌指南全文未核对，版本号不臆测。

### 定义

宫颈癌是发生在子宫颈上皮的恶性肿瘤。这台工作台把「医生给的是哪一期、凭什么定的」放在第一位，因为宫颈癌的治疗路径先按临床分期分岔：手术，还是根治性放化疗。

病理类型常见鳞状细胞癌、腺癌、腺鳞癌三类；本台的病历结构按这三类建档，不合并成「宫颈癌」一个空字段。分期用国际妇产科联盟（FIGO）2018 年宫颈癌临床分期，含 IIIC1 / IIIC2 的淋巴结分期，以及 r（影像）与 p（病理）标记。FIGO 2018 允许影像与病理参与分期（IIIC r/p）；本台只记录医生给出的期别、依据原文与日期，不自算、不推导。HPV 筛查史在档案里单列：筛查史与发病不是因果关系，本台不做归因。

**来源**：FIGO · FIGO staging for carcinoma of the cervix uteri（2018 修订）· 未取得原件，据二次来源 · 页码待核 ｜ WHO · Classification of Tumours: Female Genital Tumours, 5th ed. · 版本未核实 · 未取得原件，据二次来源 · 页码待核

### 医学资料规范和指南情况

| 机构 | 文件 | 版本 / 年份 | 原件 | 本台的用途 |
|---|---|---|---|---|
| FIGO | FIGO staging for carcinoma of the cervix uteri | 2018 修订 | [未取得原件，据 NCI PDQ 二次来源](https://www.cancer.gov/types/cervical/hp/cervical-treatment-pdq) | 分期档案的期别结构（含 IIIC1/IIIC2、r/p 标记） |
| CSCO | CSCO 宫颈癌诊疗指南 | 版本未核实 | [未取得原件，据出版方书目页](https://www.pmphmall.com/gdsdetail/660506-338835) | 国内治疗路径与药物可及性的对照；本版不作引用依据 |
| NCCN | NCCN Guidelines · Cervical Cancer | 版本未核实 | [未取得原件，据 NCCN 官网指南页](https://www.nccn.org/guidelines/guidelines-detail?category=1&id=1426) | 国际路径结构的对照；本版不作引用依据 |
| WHO | Classification of Tumours: Female Genital Tumours | 第 5 版（年份未核实） | [未取得原件，据 IARC 官方书目页](https://publications.iarc.fr/Book-And-Report-Series/Who-Classification-Of-Tumours/Female-Genital-Tumours-2020) | 病理类型命名口径 |

表内链接与看板「?」浮窗同源（2026-10-27 逐条用真浏览器验活）。二次来源的性质照实写在括号里：NCI PDQ 是国家癌症研究所的治疗概要（含 FIGO 分期说明），人卫商城与 IARC 是出版方书目页，NCCN 官网指南页需注册才能下载全文。

指南给的是「通常怎么做」，不是「你该怎么做」；本台引用一律带机构与版本，查不到版本就写「版本未核实」。未取得原件的文件只记「存在」与「大致讲什么」，不引用其具体条文。本项目 2026-10-21 探测过国家药监局药物临床试验登记与信息公示平台（HTTP 202 挑战页）与 ChiCTR（HTTP 405），均判定不可采集；覆盖未知不等于没有登记。

**来源**：见上表逐行。

### 目前治疗全景概要

按病期与线序列出指南里出现过的手段类别。这是「世界上大致有哪些办法」的地图，不含剂量、疗程与适用条件——那些必须由医生按你的分期与病理决定。

- **早期（可以手术时）**：手术（按期别与是否要求保留生育，指南结构里出现锥切、根治性宫颈切除、广泛子宫切除与盆腔淋巴结评估等术式）／生育保留（锥切与根治性宫颈切除等保留子宫或宫颈的术式，适用条件严格；本台只记录医生提过哪些、你怎么想）／术后辅助治疗（按病理高危因素决定是否加放疗或放化疗）。
- **局部晚期 / 不能手术时**：根治性同步放化疗（体外放疗 + 含铂化疗 + 后装）是路径主干／后装近距离放疗（本台只记疗程与日期，不评价剂量方案）／治疗中的支持（营养支持、贫血与不良反应处理；本台只记录你的症状与检查值）。
- **复发 / 转移后**：系统治疗（化疗、靶向治疗、免疫治疗在不同线序中被列出；本项目未取得指南全文，只写类别）／复发灶的放疗或手术在特定情形下被列出／临床研究被列为正式选项，不是最后手段。
- **贯穿全程**：放疗后的长期影响（阴道狭窄、淋巴水肿、治疗诱导绝经与卵巢功能变化；本台只记录你的感受与处理，不判定严重程度）／随访节奏（阴道残端细胞学等复查项目按医生安排执行，本台只整理时间线）。

以上是文献与指南里列出的手段，按病期与线序排列，**不代表任何一项适合你**。选哪一个，这一句需要问你的医生。

**来源**：FIGO · FIGO staging for carcinoma of the cervix uteri（2018 修订）· 未取得原件，据二次来源 · 页码待核 ｜ CSCO · CSCO 宫颈癌诊疗指南 · 版本未核实 · 未取得原件 · 页码待核

### 发展趋势

只写已经发生的事，每条带日期或版本号。不预测、不评价、不给倾向。

- 2018 年：FIGO 发布宫颈癌 2018 修订分期，把影像（r）与病理（p）淋巴结结果纳入 IIIC1 / IIIC2。
- 截至 2026-10-21：ClinicalTrials.gov 以 query.cond=cervical cancer、StudyFirstPostDate 2026-01-01 至 2026-10-21 检索到 158 条登记；人工筛出 14 条，其中Ⅰ期 2 条、Ⅱ期 7 条、Ⅲ期 2 条、观察性 1 条、登记未分期 2 条。
- 2026-10-21：国家药监局药物临床试验登记与信息公示平台返回 HTTP 202 挑战页、ChiCTR 返回 HTTP 405，两个渠道本轮判定不可采集，中国登记覆盖数未知；因此上面 158 条只代表 ClinicalTrials.gov 一个通道。

**来源**：FIGO · FIGO staging for carcinoma of the cervix uteri（2018 修订）· 未取得原件 · 页码待核 ｜ ClinicalTrials.gov · API v2 检索（检索日 2026-10-21）· 一手登记数据，本项目自采 ｜ NMPA 药品审评中心 / ChiCTR · 采集探测记录（2026-10-21）· 只存判定，未复制站点内容

## 当前状态（v0.1.0 · 3.2 开发版已可跑）

| 阶段 | 状态 | 证据 |
| --- | --- | --- |
| 调研（SPEC / 场景 / 用户假设） | 完成 | `docs/SPEC.md`、`docs/SCENARIOS.md`、`docs/USER-RESEARCH.md`（如实标注「未做真实访谈」） |
| 临床试验采集 | 完成（**CT.gov 单一通道**） | `research/cervical-cancer/` 158 条原始登记 → 14 条精筛；国内两平台**已探测、被 WAF 拦**（HTTP 202 / 405），见 `docs/CLINICAL-DATA-2026.md` 与 `cn-registry-attempt.json` |
| 数据模型 | 完成，已冻结 | `schema/0001_initial.sql`（34 表）+ `schema/0002_profile_meta.sql`（1 表 3 列）；sha256 见 `schema/freeze-contract.md` |
| 演示数据 | 完成 | `demo/build-demo-data.mjs` → sqlite + 原型快照（2 档案 / 37 指标 / 310 数据点 / 14 试验 / 35 表 227 列） |
| 原型 demo | 完成并签认 | `prototypes/v0.2/`（12 个一级页、三档字号、私密折叠、AI 面板五态） |
| **开发版 `public/` + `dsh/` 接口** | **完成（3.2）** | `public/` 四件与原型逐视图 parity；`dsh/` 提供 bootstrap / profile / export / import / candidate；43 条断言全绿 |
| **MinerU 真实解析** | **完成** | 真实 PDF 8 KB → 5 条候选（含 `<0.5`，HTML 表格已解码），只写候选、不碰事实层 |
| **导出** | 完成（Markdown） | 第一段就是「最近几次的变化」（并排 + 差值 + 命中规则，不写判断），再列指标/治疗/放疗/病理/随访；`GET /api/cervical/export/:key.md` 下载、`POST …/save` 落 `exports/`；**私密内容强制剔除** |
| 检查链 | 全绿 | `npm run check`：语法 / 冻结合同 / 文案红线 / 列一致性 / 43 条单测 / 包结构 |

**仍未做（如实）**：DSH Desktop 实机装机（`lib/client.js` 已按家族实证改成 ModuleLoader 组件，但本机无 Desktop 会话，没装就不算通过）；导出 PDF/DOCX；云端同步；真实患者访谈。逐条落点见 `docs/DEV-REQUIREMENTS-2026-10-21.md` 第四节。

## 产品范围（一期）

- **FIGO 分期档案（专属主线）**：IIIC1/IIIC2 细分与 r/p 标记，只记医生给出的分期、依据与记录日期，不自算。
- **性与生育（专属模块）**：生育状态档案、生育保留手术（含随访要求原文位）、卵巢功能（FSH/AMH/月经）、性健康——**全家族首个默认私密模块**。
- **放疗与长期影响（专属模块）**：外照射与后装**分列**（不合成总剂量）、放射性肠炎/膀胱炎事件、下肢淋巴水肿（部位 + 医生分期 + 周径差）、阴道狭窄与扩张训练（医嘱驱动，默认私密）、绝经症状与激素医嘱两列分开。
- **检查与指标**：SCC-Ag（仅鳞癌）、CEA/CA125（腺癌）、阴道残端细胞学与 HPV（**只存原文，不重判读**）、影像随访。
- **复诊准备**：细胞学 + 标志物 + 影像三类随访节点；筛查与预防为子页。

## 数据与能力边界

- 患者数据必须存入用户明确选择的资料目录；导入文件本机处理，识别字段先作候选，用户核对后才写入。
- 2026 临床线索只来自 ClinicalTrials.gov 一个通道；登记不证明有效、安全或开放入组，状态以登记页与研究中心为准。
- 工作台不提供诊断、分期判读、疗效评价或处置建议；用户看法按「一条信息」记录并标注「不是医生结论」。
- 原型中全部数据为虚构演示数据，不是真实病例；试验条目是真实登记摘录，状态未核实。

## 本地开发

要求 Node.js `>=22`。

```bash
npm run build:demo   # 重新生成 demo-data.sqlite 与 demo-data.js（唯一数据源）
npm run check        # 语法 → 冻结合同 → 文案红线 → 列一致性 → 43 条单测 → 包结构
npm run pack:check   # npm 包内容检查，不发布

# 独立启动（不装 Desktop 也能开）
npm start -- --workspace ~/CerviPalWorkspace
# → http://127.0.0.1:4199/api/cervical/ui/index.html
```

**MinerU Token 优先级**（2026-10-22 统一口径）：显式传参 > 密钥文件（600）> 环境变量 `MINERU_TOKEN`（仅在文件缺失时兜底）。
**文件赢，env 只兜底**：一条遗留的过期 env 若优先，会长期盖住新存的 Token，症状就是"换了 Token 还是 401"，极难自查。
密钥文件位置：`CERVIPAL_MINERU_SECRET` 指定的路径 > 包内 `.secrets/mineru.json`（**仅当它已存在**时沿用）> `~/.cervipal/secrets/mineru.json`（默认落点）。
默认放用户目录是因为装进 Desktop 后包目录会随升级被替换掉；包里那份只作为已有部署的兼容。

**Token 怎么填**：设置 →「文档解析」页直接粘贴保存（也可清除），保存即原子写入上面那个 JSON（tmp+rename，文件 600 / 目录 700），状态区回显掩码与文件路径，**不回显 Token 原文**。设置页与解析器共用 `dsh/settings.js` 这一份实现，不会出现"界面写一个文件、解析读另一个文件"。
MinerU 不接受 `.md`（`unsupported file type`），测通路请用真实 PDF。

原型是纯静态页，直接双击 `prototypes/v0.2/index.html`（file:// 只读，不写盘）。
开发版不能双击打开——它要同源调接口；接口不可达时才会回退 `demo-data.js` 演示数据（页面右下角标数据来源）。

改数据层只有两条路：改 `demo/build-demo-data.mjs`，或**新增** `schema/0003_*.sql` 后把新文件与哈希追加到 `schema/freeze-contract.md`——改 `0001`/`0002` 会被 `check-schema` 拦下。

## 架构（开发版）

```
dsh/index.js      DSH 插件入口（name / inject / Config / apply）
  └ routes.js     路由表唯一真身（/health /bootstrap /profile /export /import /candidate /ui/*）
      ├ workbench.js  可单测的 Workbench 类（open / bootstrap / getProfile / saveExport）
      │   ├ store.js      openDatabase + migrate
      │   ├ demo.js       seedDemo（幂等、整批事务）
      │   ├ readmodels.js 读模型（含 private 闸门）
      │   ├ import.js     MinerU 解析 → 候选字段
      │   └ export.js     Markdown 渲染
      └ server.js   独立启动（npm start），其余请求交给 public/
public/           业务界面（与原型逐视图 parity，只换数据层）
lib/client.js     宿主侧 ModuleLoader 组件（iframe → /api/cervical/ui/index.html）
```

`routes.js` **禁止 import Schemastery**：独立启动时该 peer 依赖不存在。
`API_PREFIX='/api/cervical'`、`UI_PREFIX='/api/cervical/ui'` 只在 `routes.js` 定义，前端按 `location.pathname` 反推 `apiBase()`。

## 文档

- 本轮执行依据：[`docs/DEV-REQUIREMENTS-2026-10-21.md`](docs/DEV-REQUIREMENTS-2026-10-21.md)（范围 + 23 条硬约束 + 9 条宫颈癌专属约束）
- 临床线索口径：[`docs/CLINICAL-DATA-2026.md`](docs/CLINICAL-DATA-2026.md)
- 冻结合同与口径落点：[`schema/freeze-contract.md`](schema/freeze-contract.md)
- 开发流程与 Desktop 合同：`AGENTS.md`、`docs/02-DSH-CONTRACT.md`、`docs/09-WORKBENCH-STATUS.md`

## 版本

当前开发版本 `0.1.0`：3.1（SPEC + 数据层 + 原型签认）+ 3.2（`public/` 开发版 + `dsh/` 接口 + MinerU 真实解析 + 导出）。变更随 CHANGELOG 记录。

## 致谢

感谢小x宝社区志愿者 sam 的 ❤️ 贡献。感谢每一位提供反馈、案例和改进建议的社区成员。
