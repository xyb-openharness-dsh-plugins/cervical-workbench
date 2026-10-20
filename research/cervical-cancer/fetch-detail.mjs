/* 抓取指定 NCT 的登记详情，落到 research/cervical-cancer/trials-detail.json
   用途：CLINICAL-DATA-2026.md 与 demo 试验表只摘录登记事实（标题/分期/状态/申办方/中心），
   不写疗效结论。重跑：node research/cervical-cancer/fetch-detail.mjs
   注意：CT.gov 是公开登记库，无需 token；但 status 只代表登记状态，不等于入组资格。 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const IDS = [
  'NCT07811375', 'NCT07649174', 'NCT07348861', 'NCT07424664', 'NCT07392060',
  'NCT07627620', 'NCT07497074', 'NCT07669363', 'NCT07394413', 'NCT07855263',
  'NCT07435987', 'NCT07597083', 'NCT07709650', 'NCT07338487',
];
const out = {};
for (const id of IDS) {
  /* 单条接口的 fields 白名单与列表接口不同，写错一个字段就整体 400；这里直接取完整记录。 */
  const url = `https://clinicaltrials.gov/api/v2/studies/${id}`;
  const res = await fetch(url);
  if (!res.ok) { console.error('FAIL', id, res.status); continue; }
  out[id] = await res.json();
  console.log('ok', id);
  await new Promise((r) => setTimeout(r, 250)); // 对公开 API 温柔一点
}
writeFileSync(join(HERE, 'trials-detail.json'), JSON.stringify(out, null, 1));
console.log('saved', Object.keys(out).length);
