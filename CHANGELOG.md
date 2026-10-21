# 变更记录

## 未发布 — 2026-10-22（面板改判 customFrame，修「装上去界面变形」）

装机后用户截图反馈：业务区被拉满整幅、**顶栏没有 AI 对话按钮**、右侧会话区宽度拖不动。

**根因不是漏接服务**：0.1.0 注册的是 `customFrame:false`（标准分栏）。标准分栏下宿主
只把 `--workbench-business-width` 写成注册时的静态 CSS 值，服务里**没有**拖宽或关闭面板的
编程接口——所以那条路上根本不存在"AI 按钮位"和"可拖分栏"。乳腺癌工作台走的是
`customFrame:true`（宿主把原生会话节点作为 `conversation` prop 交给插件排版）。

**做了什么**

- `lib/layout.js`：`customFrame` false → true；顶部注释推翻旧结论并写清改判依据与代价。
  `businessWidth` 保持 0.65（不取 0.7：会把会话区压到 30% 以下）。`AGENT_PANE` 补
  `default / ratioStep / narrowBelowPx / drawerMaxPx`，并纳入 `assertPanelConfig()` 自检。
- 新增 `src/client.js` + `scripts/build-client.mjs`：客户端入口改为**生成物**，面板参数、
  接口前缀、版本、仓库都从唯一来源注入（以前是手写 50 行，参数要抄第二份）。`npm run check`
  增加 `build-client.mjs --check`，改了来源忘了重新生成会红。
- `lib/client.js` 重写：语义 `<header>`（品牌 + 版本 chip + 右侧「AI 对话 / 收起」，用
  `--dsh-frame-leading-clearance` 避让 macOS 窗口按钮）＋ 业务 iframe ＋ 会话 `<aside>`
  （**始终挂载**，只用 display 控显隐）＋ 可拖 splitter（鼠标 / 键盘 ←→ 2% / Home-End，
  `role="separator"` + `aria-valuenow`，区间 25%–45%）＋ 容器 <760px 覆盖式抽屉（420px 上限）
  ＋ 宽度存 `localStorage`（`cervip.pal.cervical.agent-pane.v1`）。
- 会话桥接接上 `ensureSession({ folder })` + `sessions.scope(id).get('conversation').input`
  填**原生草稿**（不自动发送）；`inject` 补 `sessions`。
- `test/client.test.mjs` 重写 4 条：③ 断言 `customFrame:true`、② 断言 inject 含 sessions、
  ④ 断言 Panel 是 header + iframe + aside + splitter（不是裸 iframe）。
- 检查链 57 条全绿，`staticPass: true`，tarball 自检通过。

## 未发布 — 2026-10-22（MinerU 统一口径）

- **显式提交 `model_version: 'pipeline'`**：原先吃服务端默认值，现在写死并导出 `MINERU_MODEL_DEFAULT`。
- 设置页删掉写死的假文案「MINERU_TOKEN 已配置（掩码：mr-****）」——本版没有 Token 状态接口，改成如实说明"只从 `.secrets/mineru.json` 读取，此处不显示状态"。
- 单测 57 条仍全绿。

## 2026-10-21 · 装机目标更正（V2 前的准备）

- **更正**：装机目录不是 `~/.dsh/profiles/desktop`（CLI 侧，Desktop 不读）。DSH Desktop 0.12.0 实际加载的是 app 自己的 Harness `~/Library/Application Support/dsh-desktop/harness/profiles/web`。
- `scripts/check-install.mjs` 换成自动探测版（Desktop Harness → `DSH_HOME` → `~/.dsh`，打印判定依据，区分市场安装/手工安装）。
- `scripts/build-version.mjs --check` 不再比较 `build` / `commit`（易变量），修掉每次提交后必失败的假阴性。


## 2026-10-21 · 导出的第一段改成「最近几次的变化」（走查反馈）

用户原话：「导出的记录中，病情波动（最近 2–3 次对比的重要变化提示，比如指标变差）要加进去，
这是关键信息，而不是罗列数字。」

**做了什么**

- `dsh/export.js` 新增 `summarizeChanges()` 与变化段，位置在**基本信息之后、指标清单之前**——
  这是带去门诊时医生最先看的一屏。
- 每条只写「并排 + 差值 + 命中了哪条规则」，**不写"变差/加重/需要关注"**：那是判断，工作台不给。
  段首固定两句：这是并排对比、谁需要处理由医生判断；筛选规则固定（可复算）。
- 筛选规则（写死，改阈值会红测试）：
  1. 相邻两次变化 ≥ 参考区间宽度的 20%（无区间按相对变化 ≥5%）
  2. 最近 3 次连续同向，累计 ≥ 区间宽度 30%（无区间按 10%）
  3. 最新一次落在参考区间外（本次才越出的单独标出）
  4. 分级 / 描述类指标在窗口内改变过 → 写「由 A 变为 B」，不做程度判断
- 用区间宽度而不是纯百分比：白细胞 4.0→4.8 是 +20% 却没信息量；SCC-Ag 2.4→1.6 只有 -33%，
  但已占区间宽度的三分之一。演示档案 A 因此只浮出 **SCC-Ag 连续下降、白蛋白仍在区间外、
  潮热与淋巴水肿的分级改变**，其余 12 项收进一句"在阈值内，未单列"。
- 只有 1 条记录的指标明说「无法比较」，不硬比。

**顺带修的**

- **接口基址拼重**（严重）：`apiBase()` 返回 `/api/cervical`，调用处又拼 `/api/cervical/xxx`，
  实际请求 `/api/cervical/api/cervical/bootstrap` → 404 → 页面静默回退演示数据。
  即 3.2 的「开发版接了真库」在浏览器里从未成立：看着有数据，其实是 demo-data。
  现在 `apiBase()` 只留挂载前缀（独立启动与 Desktop 都是空串），新增 `test/ui-base.test.mjs` 4 条钉住。
- 导出弹窗在 api 模式下**直接取服务端那份 markdown**（本地草稿只作演示态兜底），
  「最近的变化」只有服务端算得出，也避免"预览一套、下载另一套"。
- 用户在预览框里手改过就下载改过的那份（Blob），不再"看着改了、下下来还是原文"。
- 「整理成复诊清单」入口提到「复诊准备」页级，四个子页签都能点到（原来只在「就诊准备」页签里）。

**测试**：`test/import-export.test.mjs` 新增 ⑨–⑫（分级改变/趋势浮出、不写判断词、单条记录不硬比、
越出区间要标并照抄区间）；新增 `test/ui-base.test.mjs`。`npm run check` 53 条断言全绿。

## 2026-10-21 · 3.2 开发版（包版本 0.1.0）

原型签认后补齐 3.1 明确未做的部分：开发版界面、读模型与接口、MinerU 真实解析、导出。
`NODE_OPTIONS= npm run check` 全绿（43 条断言）。

**开发版界面（`public/`）**

- 新增 `public/{index.html, app.js, style.css, demo-data.js}`：12 个一级页与原型逐视图一致。
  `style.css`、`demo-data.js` 与 `prototypes/v0.2/` **逐字节相同**；`index.html` 只改 `<title>`；
  `app.js` 只换数据层（`apiBase` / `applyData` / `loadBootstrap` / `init` / `flushUploadQueue` / `uploadToWorkbench`），
  DOM 渲染、页面表、档位、私密闸门一行未改。
- 数据来源三态：`api`（接口可达）/ `demo`（接口不可达才回退）/ `empty`。页面标出来源，不静默造假数据。
- 上传、保存导出、接受候选在 `api` 模式下走真实接口，不再只写内存。

**读模型与接口（`dsh/`）**

- 新增 `dsh/readmodels.js`：`getProfile(includePrivate)` 与原型快照**逐字段全等**（parity 断言）。
- 新增 `dsh/demo.js`：`seedDemo` 幂等 + 整批事务 + 全显式列名；`SECTION_KEYS` 18 项与读模型同序。
- 新增 `dsh/workbench.js`：`open()` 校验资料目录 → migrate → 空库才灌演示数据；`saveExport()` 落 `exports/`。
- 新增 `dsh/routes.js`：路由表**唯一真身**（食管癌踩过"本地能开、装进 Desktop 就 404"），
  含 `/health`（带 `capabilities`）、`/bootstrap`、`/profile/:key`、`/export/:key.md`（GET 下载 + POST 落盘）、
  `/import`（30 MB 上限，超限 413）、`/candidate/:key/:id/accept`、`/ui/*`。
  MinerU 的 `CODE` 翻成 502/503；`failure` 非空时除 `/health` 与 `/ui/*` 一律 503。
- 重写 `dsh/index.js`：DSH 插件入口（`name` / `inject:['webServer','connection']` / `Config` / `apply`），
  无 `root` 时退 `:memory:`；鉴权走 `ctx.connection.requestRejection`；`ctx.effect` 卸载时关库。
- `dsh/server.js` 改为复用 `routes.js` 与 `public/`，独立启动与 Desktop 同一套接口。

**MinerU 真实解析（`dsh/import.js`）**

- 链路：`POST /file-urls/batch` → `PUT` 上传 → 轮询 → 下 zip 取 `full.md` + `*_content_list.json`。
- 18 项字典指标 + 拉丁别名（前后否定断言，`\b` 对中文无效）；参考范围不当结果；
  `<0.5` 保留原文且 `value_num=null`；`decodeEntities()` 还原 `&lt;0.5`；HTML `<table>` 先转成 `| a | b |`。
- 只写 `documents` + `candidate_fields`（`status='待确认'`），**不碰事实层**；`accept` 只改状态。
- 真实 PDF（8 KB / 1 页）实测：5 条候选、`skipped: []`、`documentId='A-D8'`。

**导出（`dsh/export.js`）**

- `renderPrepMarkdown()` 分节输出（最近指标 / 治疗经过 / 放疗分列 / 病理 / 长期影响 / 淋巴水肿 / 随访 /
  影像 / 细胞学 / HPV / 本人关注 / 想问医生的问题），末尾固定「不是医生结论」。
- **私密强制剔除**：即便请求带 `?private=1`，导出正文也没有 `vagina` / `sexual` 原文，只留一句「私密内容不包含」。
- 文件名去分隔符；Markdown 落 `exports/`。

**schema**

- 新增 `schema/0002_profile_meta.sql`（1 表 3 列，`(profile_key,k)` 复合主键）：装"一档案一个值"的零散标量，
  已知 `k='pathology_status'`。**以后加字段 = 加一行，不再 ALTER 补列**。sha256 已写入 `schema/freeze-contract.md`。

**研究**

- 新增 `research/cervical-cancer/fetch-cn-registries.mjs` + `cn-registry-attempt.json`：
  药监局平台 `HTTP 202`（25 KB 挑战页）、ChiCTR `HTTP 405`（2.6 KB），判定 `collectable:false`，退出码 3。
  只记判定不复制站点内容；两个平台的**覆盖仍然未知**，不写成"没有相关试验"。

**测试（4 个文件 / 43 条断言）**

- `test/store.test.mjs`（8）：migrate 幂等 / seedDemo 幂等 / parity（含私密原文）/ 读模型形状 / 库重开 / 口径 D / 18 分节序 / `profile_meta` 而非 `subjects` 列。
- `test/server.test.mjs`（9）：health / bootstrap / 私密闸门 / 导出不含私密 / 保存导出落盘 / 静态文件与路径穿越 / JSON 404 / 导入失败要说清种类 / 目录校验。
- `test/ui-parity.test.mjs`（7）：函数集不许丢 / 新增函数白名单 / 页面表与副标题一致 / 档位一致 / `style.css` 逐字节 / `index.html` 只差 `<title>` / 接口路径存在。
- `test/import-export.test.mjs`（9）：单值抽取 / `<0.5` 留原文 / HTML 实体还原 / HTML 表格 / 日期不猜今天 / 只写候选 / accept 只改状态 / 导出不含私密 / 文件名去分隔符。

**本轮现场修掉的错误**

1. `table profile_meta already exists` —— 生成器 `DROP TABLE` 列表漏了新表。
2. `TypeError: sectionRows[section] is not a function` —— `pathology` 是特殊形状，主循环加 `continue` 单独处理。
3. parity 抖动：`screening_rows.note` 为 NULL 时多出第 4 元素 → 只出三元组；档案 B 激素为空给 `[]` 而快照是 `null` → 改 `null`。
4. 导出拿不到私密标记：`source.profile()` 默认不含私密 → 取全量后手动置空并传 `excludedPrivate`。
5. 导入抽不出候选：原实现"见分隔行就 continue"把表头一起跳过 → 改成按整块连续表格扫描。
6. MinerU 返回 HTML 表格且 `<0.5` 被转义 → 加 `decodeEntities()`。
7. `lib/version.js` 未生成 → `ERR_MODULE_NOT_FOUND`；默认频道改 `beta`（3.2 是开发版）。
8. MinerU 不接受 `.md`（`code=-60002`）→ 测通路改用真实 PDF。
9. `public/index.html` 多加了 `<link rel="icon" href="data:,">` → 原型已有内联 svg favicon，`ui-parity` ⑥ 会红，已删。

**仍未做**

- DSH Desktop 实机装机（`lib/client.js` 已按家族实证改成 `__ModuleLoader__` 包装的 React 组件，iframe 指向 `/api/cervical/ui/index.html`，标准分栏 `customFrame:false`；本机无 Desktop 会话，没装不算通过）。
- 导出 PDF/DOCX、云端同步、真实患者访谈。

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
