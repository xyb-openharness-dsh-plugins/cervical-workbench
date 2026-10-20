# 变更记录

## 2026-10-21 · 3.1 阶段交付（包版本 0.1.0）

调研 → schema → 临床数据 sqlite → 临床试验采集 → demo HTML 全链路打通，`npm run check` 全绿。

**数据层**

- 新增 `schema/0001_initial.sql`：34 表 / 224 列，含宫颈癌专属 21 表。
  **分节标题独立成表**（`section_titles`），避免食管癌那轮「0001 漏节 → 0002 ALTER 补列」的返工。
- 新增 `schema/freeze-contract.md`：`0001` 的 sha256 冻结记录 + 五条宫颈癌口径（A–E）落点表。
- 新增 `demo/build-demo-data.mjs`：唯一数据源，产出 `demo/demo-data.sqlite` 与 `prototypes/v0.2/demo-data.js`。
  两套演示档案：何秀云（47 岁鳞癌 IIIC1r，放疗长期影响主线）/ 林晓桐（33 岁腺癌 IB2，生育保留主线）。
  实测 2 档案 / 37 指标 / 310 数据点 / 14 试验。

**临床数据**

- 新增 `research/cervical-cancer/`：`fetch-list.mjs`（可复现 158 条原始登记）、`fetch-detail.mjs`（14 条详情）、
  `raw-2026.json`、`trials-detail.json`。
- 新增 `docs/CLINICAL-DATA-2026.md`：来源终态（CT.gov 已采集；ChiCTR 与药监局平台**未采集、覆盖未知**）、
  筛选口径、14 条登记摘录、写进界面的四条约束。

**原型**

- 新增 `prototypes/v0.2/{index.html, style.css, app.js, demo-data.js}`：12 个一级页 + 二级页签，
  一图秀（分类序列只画节点不连线、档位顺序显式声明、末点 13px 避让、事件标签错行），
  3D 指标卡，私密模块「一次确认只管当页」，AI 面板五态 + 提示词预览。
- 品牌青绿 `#18AFA5 / #E6F6F4 / #0E837C`，外壳与家族一致（纸色 `#f7f9fc`）。

**检查链**

- 新增 `scripts/check-{syntax,schema,wording,demo-columns}.mjs`，`npm run check` 串起六道闸。
- 新增 `test/demo-parity.test.mjs`：12 项断言（分节标题 / 指标元数据 / 数据点类型互斥 / 口径 C·D·E /
  定长数组 / 放疗分列 / 档位顺序）。
- 统一 `package.json`、`project.config.json`、`lib/client.js` 三处仓库地址，包检查 `staticPass: true`。

**本轮现场修掉的错误**（已写进 `docs/DEV-REQUIREMENTS-2026-10-21.md` 硬约束）

1. `PAGE_CONTEXT.treatment` 的 `facts` 不是数组字面量 → `SyntaxError: Unexpected token ']'`，整页白屏。
2. 生成器里 FIGO 分节对象与档案标量同名 `stage` → `subjects.stage` 被写成 `[object Object]`，改名 `figo`。
3. `screening_rows` 第 5 个绑定参数为 `undefined` → SQLite 拒绝绑定，改为 `r[3] ?? null`。
4. CT.gov 单条详情带 `?fields=` → 14 条全部 400；去掉后全部成功。
5. 时间轴上「确诊（宫颈活检）」与「分期告知（IIIC1r）」同一天叠字 → 评估标签两行错位。
6. 私密展开状态跨页残留（在「性健康」展开后切到「阴道与扩张」直接出内容）→ 换页/换页签/`hashchange` 一律收回。
7. 鳞癌档案同时登记 CEA，削弱「SCC-Ag 只属鳞癌」的口径 → 删除，页面明写「CEA 对鳞癌不特异，本档案不登记」。

## 2026-10-20 · 开发快照（包版本 0.1.0）

- 补录D9仓库纳管决定、实际仓库身份及Git同步与市场投稿的边界；当时仍是设计审定阶段。
- 本次仅修改设计会话与说明文档，未运行业务测试；不代表设计或实机验收。
- 详细范围见 [Git同步记录](docs/GIT-SYNC-2026-10-20.md)；本次未创建正式发布tag。
