/* 导出：把档案整理成一份「复诊准备」markdown（给用户带去门诊，不是病历）。
 *
 * 三条硬约束：
 * 1. **私密分节不进导出**（口径 D）：阴道扩张 / 性健康记录默认不写。即便调用方传了
 *    includePrivate 也只影响页面，导出侧一律跳过——带出去被人看见的风险不在页面里。
 * 2. **看法不是结论**：viewpoints 段必须带「本人记录，不是医生结论」的抬头。
 * 3. **只抄不解释**：数值、分级、报告原文照抄；不写"建议/可能/需要注意"这类判读词
 *    （check-wording 会拦）。
 */

const LINE = '\n';

function table(headers, rows) {
  if (!rows.length) return '';
  const out = [`| ${headers.join(' | ')} |`, `| ${headers.map(() => '---').join(' | ')} |`];
  for (const r of rows) out.push(`| ${r.map((c) => (c === null || c === undefined || c === '' ? '—' : String(c))).join(' | ')} |`);
  return out.join(LINE);
}

function section(title, body) {
  return body ? `${LINE}## ${title}${LINE}${LINE}${body}${LINE}` : '';
}

/* ---------------- 最近几次的变化 ----------------
 *
 * 用户要的不是"再列一遍数字"，而是**最近 2–3 次之间发生了什么**：哪个指标在往上走、
 * 哪个分级变了、哪一项掉出参考区间。但"变差""需要注意"是判断，工作台不给——
 * 所以这里只做三件事：并排、算差值、标出命中了哪条固定规则。
 *
 * 规则写死、可复算，不按情况调整（改阈值就改这几个常量，测试会跟着拦）：
 *   - 相邻两次变化 ≥ 参考区间宽度的 20%（无区间时按相对变化 ≥5%）
 *   - 最近 3 次连续同向，且累计变化 ≥ 区间宽度的 30%（无区间时 ≥10%）
 *   - 最新一次落在参考区间外（不论是不是这次才越出）
 *   - 分级 / 描述类指标在窗口内发生过改变（不做"加重/好转"的判断，只写"由 A 变为 B"）
 * 用"区间宽度"而不是纯百分比，是因为白细胞 4.0→4.8 是 +20% 却没什么信息量，
 * 而 SCC-Ag 2.4→1.6 只有 -33% 但已占区间宽度的三分之一。
 * 没命中的一律不单列，只在末尾说一句"其余 N 项在阈值内"，避免又变成数字清单。
 */

export const CHANGE_WINDOW = 3;
export const REL_TRIGGER = 0.05;
export const ADJ_BAND_RATIO = 0.2;
export const TREND_BAND_RATIO = 0.3;
export const TREND_REL_TRIGGER = 0.1;

const shortDate = (d) => (typeof d === 'string' && d.length >= 10 ? d.slice(5) : String(d ?? ''));
const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? Number(v.toFixed(2)) : v);
const signed = (v) => (v > 0 ? `+${num(v)}` : String(num(v)));
const pct = (r) => `${r > 0 ? '+' : ''}${Math.round(r * 100)}%`;

function inBand(v, band) {
  if (!band) return null;
  const [low, high] = band;
  if (low === null && high === null) return null;
  if (low !== null && v < low) return false;
  if (high !== null && v > high) return false;
  return true;
}

function bandWidth(band) {
  if (!band) return null;
  const [low, high] = band;
  if (low === null || high === null) return null;
  return high - low;
}

function bandText(band, unit) {
  const [low, high] = band;
  const u = unit ? ` ${unit}` : '';
  if (low !== null && high !== null) return `${low}–${high}${u}`;
  if (low !== null) return `≥${low}${u}`;
  return `≤${high}${u}`;
}

/**
 * 算出"哪几项值得先看"，不产出任何判断词。
 * @returns {{numeric: object[], categorical: object[], quiet: string[], single: string[]}}
 */
export function summarizeChanges(profile, { window = CHANGE_WINDOW } = {}) {
  const numeric = [];
  const categorical = [];
  const quiet = [];
  const single = [];
  for (const m of profile?.metrics ?? []) {
    const pts = (m.points ?? []).filter((p) => p.v !== null && p.v !== undefined);
    if (pts.length < 2) { if (pts.length === 1) single.push(m.name); continue; }
    const win = pts.slice(-window);
    const isNum = typeof win[win.length - 1].v === 'number';
    if (!isNum) {
      const changed = win.some((p, i) => i > 0 && p.v !== win[i - 1].v);
      if (changed) categorical.push({ name: m.name, points: win, from: win[0].v, to: win[win.length - 1].v });
      continue;
    }
    const prev = win[win.length - 2];
    const last = win[win.length - 1];
    const first = win[0];
    const delta = last.v - prev.v;
    const rel = prev.v === 0 ? null : delta / Math.abs(prev.v);
    const span = last.v - first.v;
    const spanRel = first.v === 0 ? null : span / Math.abs(first.v);
    const sameDir = win.length >= 3 && (win[1].v - win[0].v) * (delta || (last.v - win[1].v)) > 0;
    const band = m.band ?? null;
    const bw = bandWidth(band);
    const was = inBand(prev.v, band);
    const now = inBand(last.v, band);
    const outNow = now === false;
    const crossed = was === true && outNow;

    /* 阈值：有区间按区间宽度算，没区间退化成相对变化。 */
    const adjHit = bw !== null ? Math.abs(delta) >= ADJ_BAND_RATIO * bw : (rel !== null && Math.abs(rel) >= REL_TRIGGER);
    const trendHit = bw !== null
      ? Math.abs(span) >= TREND_BAND_RATIO * bw
      : (spanRel !== null && Math.abs(spanRel) >= TREND_REL_TRIGGER);

    const reasons = [];
    if (crossed) reasons.push('本次越出参考区间');
    else if (outNow) reasons.push('参考区间外');
    if (adjHit && delta !== 0) reasons.push('相邻两次变化明显');
    if (sameDir && trendHit) reasons.push('连续 3 次同向');
    if (reasons.length) {
      numeric.push({ name: m.name, unit: m.unit ?? null, points: win, delta, rel, span, spanRel, band, reasons, outOfBand: outNow });
    } else {
      quiet.push(m.name);
    }
  }
  return { numeric, categorical, quiet, single };
}

function renderChanges(summary) {
  const { numeric, categorical, quiet, single } = summary;
  const hasAny = numeric.length || categorical.length;
  const out = [];
  out.push('> 这里只把最近 2–3 次记录并排放，标出变化方向与幅度。**谁需要处理由医生判断，工作台不做评价。**');
  out.push('> 固定筛选规则：相邻两次变化达到参考区间宽度的 20%（无区间按 5%）、连续 3 次同向且累计达到宽度 30%（无区间按 10%）、最新一次落在参考区间外、分级或描述发生改变。没命中的不单列。');

  if (!hasAny) {
    out.push('');
    out.push('最近几次记录里，没有命中上述规则的变化。');
    if (!single.length && !quiet.length) out.push('（也没有可比较的第二条记录。）');
  }

  if (numeric.length) {
    out.push('');
    out.push('**数值：值得先看的几项**');
    out.push('');
    out.push(table(['指标', '最近 3 次（日期 / 值）', '较前一次', '命中规则'],
      numeric.map((r) => {
        const u = r.unit ? ` ${r.unit}` : '';
        const trace = r.points.map((p) => `${shortDate(p.d)} ${num(p.v)}`).join(' → ');
        const relTxt = r.rel === null ? signed(r.delta) : `${signed(r.delta)}（${pct(r.rel)}）`;
        return [`${r.name}${r.unit ? `（${r.unit}）` : ''}`, trace, `${relTxt}${u ? '' : ''}`.trim(), r.reasons.join('；')];
      })));
    const bands = numeric.filter((r) => r.band).map((r) => `- ${r.name} 参考区间 ${bandText(r.band, r.unit)}`);
    if (bands.length) {
      out.push('');
      out.push('对照的参考区间（照抄报告/化验单，工作台不另设）：');
      out.push(...bands);
    }
  }

  if (categorical.length) {
    out.push('');
    out.push('**分级与描述：窗口内发生过的改变**');
    out.push('');
    for (const c of categorical) {
      out.push(`- ${c.name}：${c.points.map((p) => `${shortDate(p.d)} ${p.v}`).join(' → ')}`);
    }
  }

  if (quiet.length) {
    out.push('');
    out.push(`其余 ${quiet.length} 项（${quiet.join('、')}）最近几次都在上述阈值内，未单列。`);
  }
  if (single.length) {
    out.push(`只有 1 次记录、无法比较的：${single.join('、')}。`);
  }
  return out.join(LINE);
}

/**
 * @param {object} profile readmodels.getProfile() 的返回值（建议 includePrivate=false）
 * @param {object} [opts]
 * @param {string} [opts.generatedAt] ISO 时间；不传则不写时间（避免"看起来像刚出的报告"）
 * @param {string} [opts.version]
 * @param {boolean} [opts.excludedPrivate] 调用方已确认档案里有私密分节、并刻意剔除
 */
export function renderPrepMarkdown(profile, { generatedAt = null, version = null, excludedPrivate = false } = {}) {
  if (!profile) throw new Error('renderPrepMarkdown 需要一份档案');
  const p = profile;
  const out = [];

  out.push(`# 复诊准备 · ${p.name ?? '档案'}`);
  out.push('');
  out.push(`- 基本信息：${[p.sex, p.age ? `${p.age} 岁` : null, p.meta].filter(Boolean).join(' · ')}`);
  if (p.stage) out.push(`- 分期（医生告知）：${p.stage}`);
  if (p.histology) out.push(`- 病理类型：${p.histology}`);
  if (p.hpv_status) out.push(`- HPV：${p.hpv_status}`);
  out.push(`- 本文件由本人从工作台导出，内容为本人记录的抄录，不是医院病历，也不是医生结论。`);
  if (generatedAt) out.push(`- 导出时间：${generatedAt}`);
  if (version) out.push(`- 工作台版本：${version}`);

  /* 一、最近几次的变化（关键信息放最前，不让人自己在数字里找） */
  if ((p.metrics ?? []).length) {
    out.push(section('最近几次的变化（并排看，不是判断）', renderChanges(summarizeChanges(p))));
  }

  /* 二、最近指标（只列有数据的，末 3 点） */
  const metrics = (p.metrics ?? []).filter((m) => (m.points ?? []).length);
  if (metrics.length) {
    const rows = metrics.map((m) => {
      const last = m.points[m.points.length - 1];
      return [m.name, `${last.v}${m.unit ? ` ${m.unit}` : ''}`, last.d, m.points.length];
    });
    out.push(section('最近一次记录（全部指标的最新一点）', table(['指标', '数值', '日期', '累计记录数'], rows)));
  }

  /* 二、治疗经过 */
  const lines = p.lines ?? [];
  if (lines.length) {
    out.push(section('治疗经过', table(['方案', '说明', '状态'], lines.map((l) => [l.name, l.detail, l.done ? '已完成' : '进行中']))));
  }

  /* 三、放疗（外照与后装分列，不合成总剂量 —— 口径 B） */
  if (p.rt?.rows?.length) {
    out.push(section(p.rt.title ?? '放疗', table(['方式', '开始', '结束', '剂量', '次数', '说明'],
      p.rt.rows.map((r) => [r[0], r[1], r[2], r[3], r[4], [r[5], r[6]].filter(Boolean).join('；')]))));
  }

  /* 四、病理与免疫组化 */
  if (p.pathology) {
    const body = [p.pathology.status ? `结论状态：${p.pathology.status}` : null,
      table(['项目', '结果'], (p.pathology.rows ?? []).map((r) => [r[0], r[1]])),
      p.pathology.gaps?.length ? `${LINE}**未取得/未做：**${LINE}${p.pathology.gaps.map((g) => `- ${g[0]}：${g[1]}`).join(LINE)}` : null,
    ].filter(Boolean).join(LINE);
    out.push(section(p.pathology.title ?? '病理与免疫组化', body));
  }

  /* 五、放疗后长期影响与下肢淋巴水肿（分级照抄报告原文） */
  if (p.lateEffects?.rows?.length) {
    out.push(section(p.lateEffects.title ?? '放疗后长期影响',
      table(['日期', '系统', '报告分级', '说明'], p.lateEffects.rows.map((r) => [r[0], r[1], r[2], r[3]]))));
  }
  if (p.lymphedema?.rows?.length) {
    out.push(section(p.lymphedema.title ?? '下肢淋巴水肿',
      table(['日期', '部位', '报告分期', '周径差', '备注'], p.lymphedema.rows.map((r) => [r[0], r[1], r[2], r[3], r[4]]))));
  }

  /* 六、随访与筛查 */
  if (p.rhythm?.length) {
    out.push(section('随访节奏', table(['项目', '频率', '依据', '下次'], p.rhythm.map((r) => [r[0], r[1], r[2], r[3]]))));
  }
  if (p.imaging?.rows?.length) {
    out.push(section(p.imaging.title ?? '影像复查',
      table(['日期', '类型', '所见', '下次', '备注'], p.imaging.rows.map((r) => [r[0], r[1], r[2], r[3], r[4]]))));
  }
  if (p.cytology?.rows?.length) {
    out.push(section(p.cytology.title ?? '细胞学（报告原文）',
      table(['日期', '方法', '报告原文', '备注'], p.cytology.rows.map((r) => [r[0], r[1], r[2], r[3]]))));
  }
  if (p.hpv?.rows?.length) {
    out.push(section(p.hpv.title ?? 'HPV 检测（报告原文）',
      table(['日期', '方法', '报告原文', '备注'], p.hpv.rows.map((r) => [r[0], r[1], r[2], r[3]]))));
  }

  /* 七、本人关注（不是结论） */
  if (p.viewpoints?.length) {
    const body = ['**下面是本人自己记的想法与感受，不是医生结论。**', ''].concat(
      p.viewpoints.map((v) => `- ${v[0]}［${v[1] ?? '记录'}］${v[2]}`),
    ).join(LINE);
    out.push(section('本人关注', body));
  }

  /* 八、想问医生的问题（从追问清单里带出来，不生成问题） */
  out.push(section('想问医生的问题', [
    '（这一栏留空，由本人手写。）',
    '',
    '- ',
  ].join(LINE)));

  out.push(LINE);
  out.push('---');
  out.push('');
  out.push('本文件只包含本人记录的信息，不构成诊断或治疗意见；具体判断请以主诊医生意见为准。');
  if (excludedPrivate || p.vagina || p.sexual) {
    /* 不写原文，只写"有这块内容、被有意排除"，否则用户会以为丢数据。 */
    out.push('阴道扩张与性健康记录属于本人私密内容，本文件不包含。');
  }
  return out.filter((x) => x !== null).join(LINE).replace(/\n{3,}/g, '\n\n') + LINE;
}

/** 导出文件名：档案名 + 日期，去掉路径分隔符。 */
export function exportFilename(profile, date = new Date()) {
  const stamp = date.toISOString().slice(0, 10);
  const who = String(profile?.name ?? '档案').replace(/[\\/:*?"<>|]/g, '');
  return `复诊准备-${who}-${stamp}.md`;
}
