# 小莲宝 CerviPal 宫颈癌工作台

简体中文 · CerviPal Cervical Cancer Workbench

小莲宝（CerviPal）是面向宫颈癌患者及照护者的 DSH Desktop 本机优先工作台。它围绕 FIGO 2018 临床分期与治疗路径，重点记录生育保留、放疗长期影响（后装疗程、淋巴水肿、阴道狭窄、治疗诱导绝经）与随访节奏。医疗内容只用于资料整理和就诊沟通，不替代医生诊断或治疗意见。

## 当前状态（v0.1.0 · 3.1 阶段已完成）

| 阶段 | 状态 | 证据 |
| --- | --- | --- |
| 调研（SPEC / 场景 / 用户假设） | 完成 | `docs/SPEC.md`、`docs/SCENARIOS.md`、`docs/USER-RESEARCH.md`（如实标注「未做真实访谈」） |
| 临床试验采集 | 完成（**单一通道**） | `research/cervical-cancer/` 158 条原始登记 → 14 条精筛；口径与**未采集渠道**见 `docs/CLINICAL-DATA-2026.md` |
| 数据模型 | 完成，已冻结 | `schema/0001_initial.sql`（34 表 / 224 列）+ `schema/freeze-contract.md`（sha256） |
| 演示数据 | 完成 | `demo/build-demo-data.mjs` → `demo/demo-data.sqlite` + `prototypes/v0.2/demo-data.js`（2 档案 / 37 指标 / 310 数据点 / 14 试验） |
| 原型 demo | 完成 | `prototypes/v0.2/`（12 个一级页、三档字号、私密折叠、AI 面板五态） |
| 检查链 | 全绿 | `npm run check`：语法 / 冻结合同 / 文案红线 / 列一致性 / 12 项单测 / 包结构 |

**未做（如实）**：`public/` 开发版与 `dsh/` 读模型接口（3.2 阶段）；DSH Desktop 实机装机；MinerU 真实解析；导出；ChiCTR 与药监局登记平台采集（覆盖未知）。

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
npm run check        # 语法 → 冻结合同 → 文案红线 → 列一致性 → 单测 → 包结构
npm run pack:check   # npm 包内容检查，不发布
```

原型是纯静态页，直接双击 `prototypes/v0.2/index.html`（file:// 只读，不写盘）。

改数据层只有两条路：改 `demo/build-demo-data.mjs`，或**新增** `schema/0002_*.sql` 后把新文件与哈希追加到 `schema/freeze-contract.md`——改 `0001` 会被 `check-schema` 拦下。

## 文档

- 本轮执行依据：[`docs/DEV-REQUIREMENTS-2026-10-21.md`](docs/DEV-REQUIREMENTS-2026-10-21.md)（范围 + 23 条硬约束 + 9 条宫颈癌专属约束）
- 临床线索口径：[`docs/CLINICAL-DATA-2026.md`](docs/CLINICAL-DATA-2026.md)
- 冻结合同与口径落点：[`schema/freeze-contract.md`](schema/freeze-contract.md)
- 开发流程与 Desktop 合同：`AGENTS.md`、`docs/02-DSH-CONTRACT.md`、`docs/09-WORKBENCH-STATUS.md`

## 版本

当前开发版本 `0.1.0`：脚手架（xyb-workbench-starter v1.3.3）初始化 + 差异化 SPEC + 3.1 数据层与原型。变更随 CHANGELOG 记录。

## 致谢

感谢小x宝社区志愿者 sam 的 ❤️ 贡献。感谢每一位提供反馈、案例和改进建议的社区成员。
