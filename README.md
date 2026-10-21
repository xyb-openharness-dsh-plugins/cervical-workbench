# 小莲宝 CerviPal 宫颈癌工作台

简体中文 · CerviPal Cervical Cancer Workbench

小莲宝（CerviPal）是面向宫颈癌患者及照护者的 DSH Desktop 本机优先工作台。它围绕 FIGO 2018 临床分期与治疗路径，重点记录生育保留、放疗长期影响（后装疗程、淋巴水肿、阴道狭窄、治疗诱导绝经）与随访节奏。医疗内容只用于资料整理和就诊沟通，不替代医生诊断或治疗意见。

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
| **导出** | 完成（Markdown） | `GET /api/cervical/export/:key.md` 下载、`POST …/save` 落 `exports/`；**私密内容强制剔除** |
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

**MinerU Token 优先级**：显式传参 > 环境变量 `MINERU_TOKEN` > `.secrets/mineru.json`（600）。
两者并存时**环境变量赢**；换 token 时先 `unset MINERU_TOKEN`，否则会以为文件没生效。
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
