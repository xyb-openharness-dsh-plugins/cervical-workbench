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

## 四、本轮明确未做（不许在验收里算通过）

- `public/` 开发版与 `dsh/` 读模型 / 接口（3.2）。
- DSH Desktop 装机、`lib/client.js` 实机加载。
- MinerU 真实解析、导出 PDF/DOCX、云端同步。
- 国家药监局药物临床试验登记平台与 ChiCTR 采集（无公开 API，覆盖未知，已在 `docs/CLINICAL-DATA-2026.md` 显式记录）。
- 真实患者访谈（`docs/USER-RESEARCH.md` 仍写「未做真实访谈」）。

## 五、按脚手架替你定的（默认执行，可回退）

| # | 项 | 默认决定 | 理由 |
| --- | --- | --- | --- |
| Q1 | 品牌主色 | **小莲宝青绿** `--violet:#18AFA5` / `--violet-soft:#E6F6F4` / `--violet-deep:#0E837C`；外壳纸色 `#f7f9fc` 与家族一致 | `#18AFA5` 直接做正文只有 2.9:1，deep 压到 `#0E837C` 才够对比；变量集中 3 行，换色成本低 |
| Q2 | 档案设定 | A 何秀云 47 岁鳞癌 IIIC1r（放疗长期影响主线）；B 林晓桐 33 岁腺癌 IB2（生育保留主线） | 覆盖 SPEC 两组核心场景；两人路径不同才能验"路径三选一"和"保留子宫"分支 |
| Q3 | 试验年份口径 | 首次公示（StudyFirstPostDate）在 2026 年 | 与样板一致，便于横向比较 |
| Q4 | 3D 卡高 | 沿用样板 **188px**，不套 doc24 的 276px | 与家族现有交付一致；改完必须截图确认页脚没被裁 |
| Q5 | 分节标题表化 | `section_titles` 独立表（偏离样板的 `subjects.*_title`） | 18 个分节，平铺会在下次加节时再返工一次；表化后加节 = 加一行 |
