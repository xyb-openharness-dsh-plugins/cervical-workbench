#!/usr/bin/env node
/**
 * 打包后自检：**装进别人的机器能不能跑**，不是"本地能不能跑"。
 *
 * 为什么单独有这一步（2026-10-21 实测踩坑）：
 *   `dsh/demo.js` import 了 `../demo/build-demo-data.mjs`，而 `package.json` 的 files 里没有 `demo/`。
 *   本地一切正常；装到 Desktop profile 后 `Workbench.open()` 直接
 *   `ERR_MODULE_NOT_FOUND`，整个工作台起不来——`npm run check` 全绿也发现不了，
 *   因为它只跑仓库里的源码，不跑 tarball。
 *
 * 做法：npm pack → 解到临时目录 → **只从解出来的包** import 服务 → 起 port 0 → 打 health/bootstrap/export。
 * 用法：node scripts/check-pack.mjs [--keep]
 * 退出码：0 = 包可独立启动；1 = 有缺失或有接口不通。
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, rmSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const keep = process.argv.includes('--keep');

/* 临时目录放家目录下：工作台的 workspace 校验会拒绝 /tmp 与 os.tmpdir()。 */
const tmp = mkdtempSync(join(homedir(), '.xyb-cervi-pack-'));
const failures = [];
const notes = [];

function step(label, fn) {
  try {
    const r = fn();
    notes.push(`✓ ${label}${r ? ` · ${r}` : ''}`);
    return r;
  } catch (error) {
    failures.push(`${label}：${error.message.split('\n')[0]}`);
    notes.push(`✗ ${label}`);
    return null;
  }
}

let server;
try {
  execFileSync('npm', ['pack', '--pack-destination', tmp, '--silent'], { cwd: root, stdio: 'pipe' });
  const tgz = readdirSync(tmp).find((f) => f.endsWith('.tgz'));
  if (!tgz) throw new Error('npm pack 没产出 tgz');

  const unpacked = join(tmp, 'unpacked');
  mkdirSync(unpacked);
  execFileSync('tar', ['xzf', join(tmp, tgz), '-C', unpacked]);
  const pkgDir = join(unpacked, 'package');
  const pkg = JSON.parse(execFileSync('node', ['-e', `process.stdout.write(JSON.stringify(require(${JSON.stringify(join(pkgDir, 'package.json'))})))`], { encoding: 'utf8' }));
  notes.push(`包：${pkg.name}@${pkg.version} · ${tgz}`);

  const serverMod = await import(pathToFileURL(join(pkgDir, 'dsh/server.js')).href);
  const wbMod = await import(pathToFileURL(join(pkgDir, 'dsh/workbench.js')).href);

  const ws = join(tmp, 'workspace');
  mkdirSync(ws);
  const wb = await wbMod.Workbench.open(ws);
  const started = await serverMod.startWorkbenchServer({ port: 0, workbench: wb });
  server = started.server;
  const base = `http://127.0.0.1:${started.port}`;

  const health = await (await fetch(`${base}/api/cervical/health`)).json();
  if (!health.ok) throw new Error(`health 不 ok：${JSON.stringify(health)}`);
  notes.push(`✓ health · ${health.version} · ${health.capabilities.join('/')}`);

  const boot = await (await fetch(`${base}/api/cervical/bootstrap`)).json();
  const profiles = Object.keys(boot.profiles || {});
  if (!profiles.length) throw new Error('bootstrap 里没有档案（演示数据没播进去）');
  notes.push(`✓ bootstrap · 档案 ${profiles.join('/')} · 试验 ${(boot.trials || []).length} 条 · layout ${boot.layout ? '有' : '无'}`);

  for (const p of ['index.html', 'app.js', 'style.css', 'demo-data.js']) {
    const r = await fetch(`${base}/api/cervical/ui/${p}`);
    if (r.status !== 200) throw new Error(`静态文件 ${p}：HTTP ${r.status}`);
  }
  notes.push('✓ 静态四件 · 200');

  const md = await (await fetch(`${base}/api/cervical/export/A.md`)).text();
  if (!/## 最近几次的变化/.test(md)) throw new Error('导出里没有「最近几次的变化」——装的是旧包');
  if (/性交痛|干涩/.test(md)) throw new Error('导出里出现私密原文');
  notes.push(`✓ 导出 · ${Buffer.byteLength(md, 'utf8')} B · 变化段在 · 无私密`);
} catch (error) {
  failures.push(`准备阶段：${error.message.split('\n')[0]}`);
} finally {
  if (server) server.close();
  if (!keep) rmSync(tmp, { recursive: true, force: true });
  else notes.push(`保留临时目录：${tmp}`);
}

console.log(notes.join('\n'));
if (failures.length) {
  console.error('\n✗ 打包自检失败：');
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log('\n✓ 这个 tarball 能在干净目录里独立启动并出接口');
