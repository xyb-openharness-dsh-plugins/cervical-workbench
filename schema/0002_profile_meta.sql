/* 0002 · 档案级零散标量（profile_meta）
 *
 * 为什么不在 0001 里加列：0001 已冻结（sha256 见 freeze-contract.md），改它会被 check-schema 拦。
 * 更重要的是——**别再用 ALTER 一列一列补**：食管癌那轮为了两个分节标题补过一次 0002，
 * 生成器、读模型、INSERT 三处跟着改。以后凡是"一个档案只有一个值"的零散字段
 * （病理结论状态、下次复查日期、沟通偏好…）一律进这张表：加字段 = 加一行。
 *
 * 与 subjects 的边界：
 *   - 看板/侧栏要一次取到的标量（name / stage / headline / histology …）留在 subjects；
 *   - 只在某一节里出现、并且可能为空/没有的，放这里，读模型按 k 取值。
 *
 * 已知用到的 k：
 *   pathology_status  —— 病理结论状态（如「已出（2026-03-18 活检）」「待出」）
 */
CREATE TABLE profile_meta (
  profile_key TEXT,
  k           TEXT,
  v           TEXT,
  PRIMARY KEY (profile_key, k)
);
