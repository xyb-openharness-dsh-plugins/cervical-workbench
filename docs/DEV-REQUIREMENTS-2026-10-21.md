# 宫颈癌开发版需求与硬约束清单（2026-10-21）

本文件是宫颈癌工作台从「starter 骨架」进入「调研 → schema → 临床数据 → demo HTML」的**唯一执行依据**。
前半部分是范围与验收（照抄小咽宝 `esophageal-workbench/docs/DEV-REQUIREMENTS-2026-10-21.md` 的体例），
后半部分是**从食管癌与乳腺癌开发中逐条回收的错误 + 本轮宫颈癌现场犯过的错**，标为硬约束，违反即视为未完成。

样板 = `~/Downloads/esophageal-workbench`（v0.1.0，`3fe12c3`，`npm run check` 全绿）。
本轮目标：**达到样板现在的开发版效果**，并按宫颈癌 SPEC（`docs/SPEC.md`）换内容。

---

## 一、范围（本轮 3.1 交付什么）

| # | 交付物 | 落点 | 怎么验 |
| --- | --- | --- | --- |
| 1 | 宫颈癌 2026 临床试验资料 | `research/cervical-cancer/{raw-2026.json, trials-detail.json, fetch-list.mjs, fetch-detail.mjs}` | 原始 158 条可复现；14 条详情齐全；`docs/CLINICAL-DATA-2026.md` 写清**未采集渠道** |
| 2 | 数据模型 | `schema/0001_initial.sql` + `schema/freeze-contract.md` | `check-schema` 验 sha256；改结构只能加 `0002_*.sql` |
| 3 | 2 套演示档案 | `demo/build-demo-data.mjs` → `demo/demo-data.sqlite` + `prototypes/v0.2/demo-data.js` | `test/demo-parity.test.mjs` 12 项断言全绿 |
| 4 | 原型 demo 四件套 | `prototypes/v0.2/{index.html, style.css, app.js, demo-data.js}` | file:// 打开无控制台错误；12 个一级页；三档字号无横向溢出 |
| 5 | 检查链 | `scripts/check-{syntax,schema,wording,demo-columns}.mjs` + `test/` | `npm run check` 全绿（含包检查 `staticPass: true`） |

不在本轮：`public/` 开发版、`dsh/` 读模型与接口、DSH 装机（属 3.2 / M5）。

## 二、照抄样板的四条产品要求（不许"按比例缩减"）

| # | 要求 | 做什么 | 怎么验 |
| --- | --- | --- | --- |
| R1 | 顶栏三段式 + AI 主按钮五态 | 左＝品牌+版本 chip / 中＝一句说明 / 右＝主操作组 `margin-left:auto` | 截图核对；`#agent-state` 文案随五态切换 |
| R2 | AI 面板可打开 / 隐藏 / 调宽 | `#agent-dock` 三档宽度、`aria-expanded`、关闭按钮 | 冒烟脚本断言 `hidden` 切换与 `#agent-body` 出提示词预览 |
| R3 | 一图秀严格按设计原型 | 画布 `CW980/CH420/CX0 62/CX1 954/CY0 132/CY1 366`、`smoothPath` 单调三次、末点 13px 避让、事件竖虚线止于 `CY0` | 截图 + DOM 断言（path 段数、circle 数、末点标签坐标） |
| R4 | 3D 指标卡 | 整卡 180°、`perspective`、双面 `backface-visibility:hidden`、隐藏面 `aria-hidden`、分类记录 `data-static` 不翻不连线 | 翻面后 `scrollHeight <= 高度` 不裁切 |

---

## 三、硬约束

### 3.1 数据层

| # | 约束 | 错误来源 |
| --- | --- | --- |
| H1 | **所有 INSERT 必须写显式列名**。位置式 INSERT 在加列后必炸，而且只在跑到那一步才炸。 | 胃癌连续 6 次列数不匹配 |
| H2 | **分节标题独立成表**（`section_titles(profile_key, key, title, ord)`），不加 `subjects.*_title` 列。加一节 = 加一行。 | 食管癌 0001 漏两节 → 只能发 0002 ALTER 补列，生成器/读模型/INSERT 三处跟着改 |
| H3 | **档案标量 `stage` 不得与分节对象同名**。生成器里 FIGO 分节对象必须叫 `figo`，`stage` 只放 `'IIIC1r'` 这样的字符串。 | 本轮现场：`stage` 被对象覆盖成 `[object Object]`，`subjects.stage` 写坏了才发现 |
| H4 | **绑定参数不许传 `undefined`**：`ins.run(...)` 前一律 `x ?? null`。 | 本轮现场：`screening_rows` 第 5 个参数 undefined → `Provided value cannot be bound to SQLite parameter 5` |
| H5 | 分类指标 `dec IS NULL` 且 `unit IS NULL`（不是空字符串）；数值指标 `kind='numeric'`。`band` 两列都为 NULL 表示没有参考范围（≠ 0）。 | 家族 `check-demo-columns` |
| H6 | **`using` 是 SQLite 保留字**，"当前在用"的列叫 `in_use`。 | 食管癌建表报 `near "using"` |
| H7 | 手写倒序数组只 `ORDER BY ord`，不叠加 `DESC`（作者已按最新在前写）。 | 肠癌造口日记二次反转 |
| H8 | 演示数据口径：化验/体征每 2–4 周一点并延续到当天；**影像/细胞学按真实频率，不加密**。 | 家族约定 |
| H9 | 分类序列的**档位顺序必须显式声明**（`QUAL_LEVELS`），不许按出现顺序排。 | 本轮：阴道狭窄 / 淋巴水肿 / 腹泻 / 潮热 / 月经恢复都要声明；测试 `demo-parity` 第 12 项会拦 |

### 3.2 前端

| # | 约束 | 错误来源 |
| --- | --- | --- |
| H10 | **`facts` 等聚合字段必须是数组字面量**，多来源一律 `[...a.map(), ...b.map()]`。写成 `(x.map(...), ...y.map(...))` 会 `Unexpected token ']'`。 | 本轮现场：`PAGE_CONTEXT.treatment` 语法错误，整页白屏 |
| H11 | **同一 x 附近的事件标签必须错行**（评估标记/确诊/手术常同一天），周期标签与评估标签各自维护 `labelEnd`。 | 本轮截图：「确诊（宫颈活检）」与「分期告知（IIIC1r）」叠字 |
| H12 | **私密展开一次只管当页**：切一级页、切二级页、`hashchange` 都要 `state.privateOpen = false`。 | 本轮现场：在「性健康」展开后切到「阴道与扩张」，折叠态直接出内容 |
| H13 | 私密模块的 `PAGE_CONTEXT` 只写「N 条（默认私密，不进入草稿）」，**不带原文**。 | SPEC D4 / A4 |
| H14 | 二级页签必须按 `state.sub` 分流；测试要穷举 sub × 档案。 | 家族踩坑 |
| H15 | 字号三档用 `--tz` 倍率，固定高卡片写 `calc(Hpx * var(--tz))`；判溢出用 `body.scrollWidth`。 | 家族约定 |
| H16 | `[hidden]` 要防 CSS `display` 覆盖（`[hidden]{display:none!important}`）。 | 家族踩坑 |

### 3.3 工程与交付

| # | 约束 | 错误来源 |
| --- | --- | --- |
| H17 | **CT.gov 单条详情接口不要加 `?fields=`**：白名单与列表接口不同，写错一个字段整体 400。 | 本轮现场：14 条全 FAIL，去掉 fields 后全成功 |
| H18 | `freeze-contract.md` 的 sha256 必须**实算写入**，不能留占位。 | 肠癌 `check-schema` 失败 |
| H19 | **文案红线词表本身也会命中红线** → 词表那一行加 `// wording-allow`（同一行，不能写在上一行，也不能写在块注释里）。 | 本轮现场：`FORBIDDEN` 数组 6 处命中 |
| H20 | `check-workbench-package` 比对 `package.json.repository`、`project.config.json.repository`、`lib/client.js` 描述符三处，**必须同字符串**。 | 本轮现场：`xyb-community` 旧地址残留 |
| H21 | 跑测试 / `pnpm add` 前先 `NODE_OPTIONS=`（置空）。 | 家族记忆 |
| H22 | macOS BSD grep 的 `\|` 会静默失败，用 `grep -E`；本会话的 Grep 工具同理用 `a|b`。 | 本轮现场：`grep "\|"` 返回空，误判函数不存在 |
| H23 | 提交前确认 cwd 与分支；`git` 不带 `-C` 会跑在会话默认目录。 | 肠癌推送踩到 |

### 3.4 宫颈癌专属约束

| # | 约束 | 依据 |
| --- | --- | --- |
| C-A1 | **FIGO 分期只记录不自算**：`stage_rows` 存「分期 / 分期体系 / r-p 标记 / 依据 / 医生原话 / 记录日期」，任何 r/p 自动推导都不做。 | SPEC A1、口径 A |
| C-A2 | **外照射与后装分列**，各自剂量与分次，**全库无总剂量列**。 | 口径 B |
| C-A3 | 细胞学与 HPV **只存报告原文**，无「正常/异常」枚举列；缩写（NILM / ASC-US / HPV16+）照抄。 | 口径 C |
| C-A4 | 性与生育默认私密：`vagina_rows.is_private`、`sexual_rows.is_private` 均 `DEFAULT 1`，展开需本人确认。 | 口径 D、SPEC A4 |
| C-A5 | **SCC-Ag 只属鳞癌**：鳞癌档案不登记 CEA，腺癌档案不登记 SCC-Ag。 | 口径 E |
| C-A6 | 一图秀默认三序列：鳞癌档案 `scc / wt / vagina`，腺癌档案 `cea / wt / menses`。 | SPEC A6 |
| C-A7 | 淋巴水肿只记「部位 / 医生分期 / 周径差 / 备注」，**压力袜压力值以处方为准，不推荐型号**。 | SPEC A5 |
| C-A8 | 不做：生育力保存方案推荐、激素替代适用性判断、阴道扩张器型号推荐、放疗剂量换算、复发概率、病友匹配。 | SPEC「明确不做」 |
| C-A9 | 试验线索不做适配判断，只出「入组问题」清单；境外中心显示申办单位原文，不暗示国内可参加。 | `docs/CLINICAL-DATA-2026.md` §四 |

---

## 四、本轮明确未做 → 3.2 补齐状态

> 3.1 签认时这一节写的是"不许在验收里算通过"。3.2 逐条补齐，**补齐情况按下表认定，不靠口头**。
> 每条都给落点文件与可复跑的验收证据；没补齐的留在"仍未做"，不许含糊。

| 项 | 3.2 状态 | 落点 | 验收证据 |
| --- | --- | --- | --- |
| `public/` 开发版（12 页 parity） | **已实现** | `public/{index.html,app.js,style.css,demo-data.js}` | `test/ui-parity.test.mjs` 7 条（函数集 / 页面表 / 档位 / `style.css` 逐字节 / `index.html` 只差 `<title>` / 接口路径）；12 页无头浏览器冒烟 `OVERFLOW none`、`CHART {paths:2,circles:18}`、`PRIVATE {leaked:false}` |
| `dsh/` 读模型 | **已实现** | `dsh/readmodels.js`、`dsh/store.js`、`dsh/demo.js` | `test/store.test.mjs` 8 条，含 `getProfile(A/B,{includePrivate:true})` 与 `prototypes/v0.2/demo-data.js` **逐字段 `deepStrictEqual`** |
| `dsh/` 接口（bootstrap / profile / export / import / candidate） | **已实现** | `dsh/routes.js`（唯一真身）、`dsh/index.js`（插件入口）、`dsh/server.js`（独立启动） | `test/server.test.mjs` 9 条；`/api/cervical/health` 返回 `capabilities:['bootstrap','profile','export','import','candidate']` |
| 私密内容导出侧剔除 | **已实现** | `dsh/workbench.js#saveExport`、`dsh/export.js` | 即便 `?private=1`，导出正文仍无 `vagina/sexual` 原文，只留「私密内容不包含」一句；`test/server.test.mjs` ④/④b |
| MinerU 真实解析 | **已实现** | `dsh/mineru.js`、`dsh/import.js` | 真实 PDF（8 KB / 1 页）解析出 5 条候选（含 `<0.5`），`skipped: []`；`test/import-export.test.mjs` 9 条（含 HTML 实体 `&lt;0.5` 还原、HTML 表格、日期不猜今天） |
| 导出文件落盘 | **已实现**（Markdown） | `dsh/export.js#renderPrepMarkdown`、`POST /export/:key.md/save` | 落 `exports/`，文件名去分隔符；PDF/DOCX 见"仍未做" |
| 国家药监局平台 / ChiCTR 采集 | **探测过，被 WAF 拦**（结论落地，不是"没做"） | `research/cervical-cancer/fetch-cn-registries.mjs` → `cn-registry-attempt.json` | 药监局 `HTTP 202`（25 KB 挑战页）、ChiCTR `HTTP 405`（2.6 KB），`collectable:false`；退出码 3。**覆盖仍然未知**，`docs/CLINICAL-DATA-2026.md` 已写明 |
| DSH Desktop 实机装机 | **未做** | `lib/client.js` 已按家族实证改成 `__ModuleLoader__` 包装的 React 组件（iframe → `/api/cervical/ui/index.html`） | 只有 `check-workbench-package staticPass:true`；**本机无 Desktop 会话，没装机就不算通过**（P-19 仍标"部分"） |
| 导出 PDF / DOCX | **未做** | — | 只出 Markdown；PDF/DOCX 需要额外渲染依赖，未纳入 3.2 |
| 云端同步 | **未做** | — | 与"本机优先"口径冲突，不在 3.2 范围 |
| 真实患者访谈 | **未做** | `docs/USER-RESEARCH.md` 仍写「未做真实访谈」 | — |

### 4.1 3.2 现场新修的错误（供后续病种复用）

1. `profile_meta already exists`：`build-demo-data.mjs` 的 `DROP TABLE` 列表漏了新表。
2. `TypeError: sectionRows[section] is not a function`：`SECTION_KEYS` 含 `pathology`，但它是特殊形状、没有通用行取器 → 主循环加 `continue` 单独处理。
3. parity 抖动 ①：`screening_rows.note` 为 `NULL` 时读模型多出第 4 个元素 → 只出三元组。
4. parity 抖动 ②：档案 B 未用激素，读模型给 `[]` 而快照是 `null` → 空则 `null`。
5. 导出拿不到私密标记：`source.profile()` 默认 `includePrivate:false`，`p.vagina || p.sexual` 恒假 → 取全量后手动置空并传 `excludedPrivate`。
6. 导入抽不出候选：原实现"见分隔行就 `continue`"把表头一起跳过、整表静默丢弃 → 改成**按整块连续表格**扫描，先切 block、过滤分隔行，再取首行作表头。
7. MinerU 返回的是 HTML `<table>`，`<0.5` 被转义成 `&lt;0.5`，不解码就当"文字"整行丢 → 加 `decodeEntities()`。
8. `lib/version.js` 是生成物，没跑 `build-version.mjs` 时 `ERR_MODULE_NOT_FOUND`；3.2 起默认频道 `beta`（`CERVIPAL_CHANNEL`）。
9. MinerU **不接受 `.md`**（`code=-60002 unsupported file type`）：测通路必须用真实 PDF。
10. `public/index.html` 多加一行 `<link rel="icon" href="data:,">` → 原型已有内联 svg favicon，重复且 `ui-parity` ⑥ 会红。

## 五、按脚手架替你定的（默认执行，可回退）

| # | 项 | 默认决定 | 理由 |
| --- | --- | --- | --- |
| Q1 | 品牌主色 | **小莲宝青绿** `--violet:#18AFA5` / `--violet-soft:#E6F6F4` / `--violet-deep:#0E837C`；外壳纸色 `#f7f9fc` 与家族一致 | `#18AFA5` 直接做正文只有 2.9:1，deep 压到 `#0E837C` 才够对比；变量集中 3 行，换色成本低 |
| Q2 | 档案设定 | A 何秀云 47 岁鳞癌 IIIC1r（放疗长期影响主线）；B 林晓桐 33 岁腺癌 IB2（生育保留主线） | 覆盖 SPEC 两组核心场景；两人路径不同才能验"路径三选一"和"保留子宫"分支 |
| Q3 | 试验年份口径 | 首次公示（StudyFirstPostDate）在 2026 年 | 与样板一致，便于横向比较 |
| Q4 | 3D 卡高 | 沿用样板 **188px**，不套 doc24 的 276px | 与家族现有交付一致；改完必须截图确认页脚没被裁 |
| Q5 | 分节标题表化 | `section_titles` 独立表（偏离样板的 `subjects.*_title`） | 18 个分节，平铺会在下次加节时再返工一次；表化后加节 = 加一行 |
