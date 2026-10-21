# 迁移冻结合同（小莲宝 CerviPal）

`schema/` 下的迁移一旦对外发布就不许再改：改历史迁移 = 两台机器的库结构不一样 = 数据不可复现。
本文件记每个迁移文件的 sha256，由 `npm run check` 里的 `scripts/check-schema.mjs` 逐条比对。

要改结构：**新增** `NNNN_name.sql`，并把新文件与哈希追加到下表的末尾。改旧文件会被检查拦下。

| 文件 | sha256 |
| --- | --- |
| `0001_initial.sql` | 119eb5931360545a961cf09e6ee87935045397c067c18ab20455644c546636c4 |
| `0002_profile_meta.sql` | 0e42bfa8ba72e6b5baa89f009c52aa066b42885cbaa2919f62ff92d7d6ccf954 |

## 0001 的内容边界（写在冻结之前，便于日后审）

34 张表，224 列（`scripts/check-demo-columns.mjs` 实测）。分四组：

- **档案级 2 张**：`subjects`（档案标量：姓名/年龄/分期/病理/HPV 状态/看板勾选/沟通口径）
  与 **`section_titles`**（`profile_key + key → title + ord`）。
- **指标 3 张**：`metrics` / `metric_points` / `molecular`。分类指标 `dec IS NULL` 且 `kind ∈ {grade, qual}`；
  数值指标 `kind = 'numeric'`。`band` 用 `band_low/band_high` 两列，都没有则为 NULL（≠ 0）。
- **通用 8 张**：`events` / `rhythm` / `cycles` / `treatment_lines` / `viewpoints` / `trials` /
  `documents` / `candidate_fields`。
- **宫颈癌专属 21 张**：`stage_rows`（FIGO 2018，只抄不自算）/ `pathology_rows`（`kind` 为 row/gap）/
  `pathway_rows`（`phase` 当前/既往）/ `surgery_rows`（术式·范围·淋巴·切缘）/
  `rt_rows`（`mode` 外照射 / 后装，分列不合成总剂量）/ `late_effect_rows`（放疗后事件，分级照抄）/
  `lymphedema_rows`（部位·分期·周径差）/ `vagina_rows`（扩张与狭窄，`is_private` 默认 1）/
  `menopause_rows` / `hormone_rows`（医嘱留痕）/ `fertility_rows` / `fert_surgery_rows` /
  `ovary_rows`（FSH/AMH/月经）/ `sexual_rows`（`is_private` 默认 1）/ `cytology_rows` /
  `hpv_rows`（两项都只存报告原文，无「正常/异常」枚举列）/ `imaging_rows` / `screening_rows` /
  `nutrition_rows` / `supplement_rows` / `demo_meta`。

> **为什么分节标题单独一张表**：食管癌那轮把 11 个 `*_title` 平铺在 `subjects` 上，
> 0001 漏了「扩张记录」「通路相关事件」两节，只能追加 `0002 ALTER TABLE` 补列，
> 生成器镜像、读模型、25 列 INSERT 三处跟着改——那是最贵的一次返工。
> 宫颈癌有 18 个分节，用 `section_titles` 表化之后：**加一节 = 加一行**，不加列、不改迁移。

> 列名避坑：`using` 是 SQLite 保留字，裸写 `using INTEGER` 会在建表时报 `near "using": syntax error`。
> 本 schema 里凡是"当前在用"语义的列，一律叫 `in_use`。

## 宫颈癌五条独有口径的落点

| 口径 | 落在哪 |
| --- | --- |
| A. 分期只记录、不自算 | `stage_rows(item, value, note, ord)`，无任何 r/p 自动推导列；`r/p` 只作为一行文字记录 |
| B. 外照射与后装分列、不合成总剂量 | `rt_rows.mode ∈ {EBRT, 后装}`，每行各自 `dose`/`fractions`，全库无「总量」列 |
| C. 细胞学/HPV 只存原文 | `cytology_rows.result_text`、`hpv_rows.result_text`；没有 `is_normal` 类枚举列 |
| D. 性与生育默认私密 | `vagina_rows.is_private`、`sexual_rows.is_private` 均 `DEFAULT 1` |
| E. SCC-Ag 只属于鳞癌 | 由生成器保证：腺癌档案不产 `scc` 指标行；鳞癌档案不产 `cea` 行 |

## 四条家族契约在本 schema 里的落点

| 契约 | 落点 |
| --- | --- |
| 看法恒不为结论 | `viewpoints` 无 `is_conclusion` 列（恒视为 0），读模型不输出结论字段 |
| 四点位 1–4 点、缺健侧不生成差值 | `metric_points` 允许任意点数；差值在读取时算，NULL 不折算成 0 |
| 更正只新增版本 | `pathway_rows.phase` 只取「当前 / 既往」，切路径新增行不覆盖旧行 |
| 事实四层不合并 | 文档 `documents` / 候选 `candidate_fields` / 记录 `*.rows` / 指标 `metric_points` 各存各的 |

## 0002 的内容边界

**1 张表 3 列**：`profile_meta(profile_key, k, v)`，复合主键 `(profile_key, k)`。
用途是装「一个档案只有一个值、又不值得占 `subjects` 一列」的零散标量。已知 `k`：

| k | 含义 | 为什么放这里 |
| --- | --- | --- |
| `pathology_status` | 病理结论状态（如「已出（2026-03-18 活检）」） | 只在「病理与免疫组化」一节出现，且鳞癌档案可能长期为空 |

**为什么不再 ALTER 补列**：食管癌那轮为两个分节标题补过一次 `0002 ADD COLUMN`，生成器 / 读模型 /
INSERT 三处跟着改，是本轮最贵的一次返工。以后加字段 = 加一行，表结构不动，`check-demo-columns` 也不用重签。

**与 `subjects` 的边界**：看板/侧栏要一次取到的标量（`name`/`stage`/`headline`/`histology`）留在 `subjects`；
只在某一节里出现、可能整体缺失的，放这里，读模型按 `k` 取值，取不到返回 `null`（前端按「没有这一项」渲染）。

## 与生成器的一致性

`demo/build-demo-data.mjs` 里那份 `CREATE TABLE` 是 schema 的镜像。
改完任一边都要跑：

```bash
node demo/build-demo-data.mjs
node scripts/check-demo-columns.mjs     # 逐表比对 PRAGMA table_info：列名 / 顺序 / 类型 / 主键
```

（H6：胃癌那轮连续 6 次 INSERT 列数不匹配，靠位置式 INSERT 才没在写代码时暴露。
本项目所有 INSERT 一律写显式列名。）
