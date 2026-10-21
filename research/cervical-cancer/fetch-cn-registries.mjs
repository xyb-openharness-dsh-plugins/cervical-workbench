#!/usr/bin/env node
/**
 * 中国境内两个登记平台的可采集性探测（ChiCTR / 药监局药物临床试验登记与信息公示平台）。
 *
 * 为什么单独一个脚本：这两个平台**都没有开放 API**，站点前面还有 WAF / JS 挑战。
 * 之前的文档只能写"未采集"，但说不清"是没查还是查不到"。这个脚本把"查了、被拦了"
 * 变成可复现的证据：每次运行都把 HTTP 状态、字节数、是否命中挑战页写进
 * `research/cervical-cancer/cn-registry-attempt.json`。
 *
 * 判定标准（三条任一即视为"被拦"，不重试、不伪装成空结果）：
 * 1. 状态码不是 200；
 * 2. 响应里出现 JS 挑战特征（`<meta id=` + 大段乱码 content、`__jsl_clearance`、`acw_sc__v2`）；
 * 3. 没有任何可解析的项目列表（找不到 `登记号` / `CTR` / `ChiCTR` 这类锚点）。
 *
 * 用法：node research/cervical-cancer/fetch-cn-registries.mjs
 * 退出码：0 = 至少一个平台可采集；3 = 都被拦（这是当前已知状态，不算脚本错误）。
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, 'cn-registry-attempt.json');

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36';

const TARGETS = [
  {
    id: 'chinadrugtrials',
    name: '国家药监局药物临床试验登记与信息公示平台',
    url: 'https://www.chinadrugtrials.org.cn/clinicaltrials.searchlist.dhtml?keywords=%E5%AE%AB%E9%A2%88%E7%99%8C',
    anchors: [/登记号/, /CTR\d{8}/],
  },
  {
    id: 'chictr',
    name: '中国临床试验注册中心（ChiCTR）',
    url: 'https://www.chictr.org.cn/searchproj.html?title=%E5%AE%AB%E9%A2%88%E7%99%8C',
    anchors: [/ChiCTR\d{9,}/, /注册号/],
  },
];

const CHALLENGE = [/__jsl_clearance/, /acw_sc__v2/, /<meta id="[A-Za-z0-9]{10,}" content="/, /405/];

function looksBlocked(status, text) {
  if (status !== 200) return `HTTP ${status}`;
  if (CHALLENGE.some((re) => re.test(text))) return '命中 WAF / JS 挑战页';
  if (/<title>\s*40[13]\s*<\/title>/i.test(text)) return '错误页（401/403）';
  return null;
}

const results = [];
for (const t of TARGETS) {
  const startedAt = new Date().toISOString();
  let status = 0;
  let bytes = 0;
  let text = '';
  let error = null;
  try {
    const res = await fetch(t.url, {
      headers: { 'user-agent': UA, accept: 'text/html,application/xhtml+xml' },
      signal: AbortSignal.timeout(20000),
    });
    status = res.status;
    text = await res.text();
    bytes = Buffer.byteLength(text, 'utf8');
  } catch (e) {
    error = e.message;
  }

  const blocked = error ? `请求失败：${error}` : looksBlocked(status, text);
  const hasAnchor = !blocked && t.anchors.some((re) => re.test(text));
  results.push({
    id: t.id,
    name: t.name,
    url: t.url,
    startedAt,
    status: status || null,
    bytes,
    blockedReason: blocked,
    collectable: !blocked && hasAnchor,
    /* 只记判定，不落原文：这两个站点的页面有版权与个人信息，留证据不等于复制整页。 */
  });
  console.log(`${blocked ? '✗' : '✓'} ${t.name}：${blocked ? `被拦（${blocked}）` : hasAnchor ? '页面含登记锚点，可尝试结构化解析' : '页面无登记锚点'} · HTTP ${status} · ${bytes} B`);
}

const payload = {
  checkedAt: new Date().toISOString(),
  note: '这两个平台没有开放 API；本文件只记录"查过、结果如何"，不复制站点内容。',
  results,
};
writeFileSync(OUT, JSON.stringify(payload, null, 2) + '\n');

const anyOk = results.some((r) => r.collectable);
console.log(anyOk ? `\n可采集：结果已写入 ${OUT}` : `\n两个平台本轮都被拦，覆盖仍然未知。证据写入 ${OUT}`);
process.exit(anyOk ? 0 : 3);
