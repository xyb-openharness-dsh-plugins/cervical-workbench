/* 抓 2026 年宫颈癌登记列表，落到 research/cervical-cancer/raw-2026.json
 *
 * 用途：docs/CLINICAL-DATA-2026.md 的第一层证据——"158 条原始登记"要能复现。
 * 重跑：node research/cervical-cancer/fetch-list.mjs
 *
 * 口径：
 *   - query.cond="cervical cancer"（CT.gov 自己的条件索引，不是全文搜）
 *   - filter.advanced 用 AREA[StudyFirstPostDate]RANGE[...] 限定首次登记窗口
 *   - pageSize 一次拿满；>1000 时要用 pageToken 翻页（本窗口 158 条，不需要）
 *   - CT.gov 是公开登记库，无需 token；但"登记状态"不等于入组资格，也不是疗效结论
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const WINDOW = '2026-01-01,2026-10-21';

const params = new URLSearchParams({
  'query.cond': 'cervical cancer',
  'filter.advanced': `AREA[StudyFirstPostDate]RANGE[${WINDOW}]`,
  pageSize: '300',
  countTotal: 'true',
});
const url = `https://clinicaltrials.gov/api/v2/studies?${params}`;

const res = await fetch(url);
if (!res.ok) {
  console.error('FAIL', res.status, await res.text().catch(() => ''));
  process.exit(1);
}
const data = await res.json();
const studies = data.studies ?? [];

writeFileSync(join(HERE, 'raw-2026.json'), JSON.stringify({
  fetched_at: new Date().toISOString(),
  window: WINDOW,
  query: 'cervical cancer',
  count: studies.length,
  totalCount: data.totalCount ?? null,
  studies,
}, null, 1));

console.log(`saved ${studies.length} 条（窗口 ${WINDOW}，totalCount=${data.totalCount ?? '—'}）`);
