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

  /* 一、最近指标（只列有数据的，末 3 点） */
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
