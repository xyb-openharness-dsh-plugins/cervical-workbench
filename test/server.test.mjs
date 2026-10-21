/* HTTP 层：健康检查 / bootstrap / 私密闸门 / 导出 / 静态文件 / 未知接口 / 路径穿越 / 资料目录校验。
 *
 * 起真实服务（port:0 由系统分配），只用内置 fetch。测完必须关 server 与 db，
 * 否则 node --test 进程不会退出。
 */

import assert from 'node:assert/strict';
import { homedir } from 'node:os';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { Workbench, validateWorkspacePath } from '../dsh/workbench.js';
import { startWorkbenchServer } from '../dsh/server.js';

const tmp = mkdtempSync(join(homedir(), '.xyb-cervical-server-'));
after(() => { try { rmSync(tmp, { recursive: true, force: true }); } catch { /* 清理失败不影响结果 */ } });

async function withServer(fn) {
  const workbench = await Workbench.open(join(tmp, 'workspace'));
  const { server, port, url } = await startWorkbenchServer({ port: 0, host: '127.0.0.1', workbench });
  try {
    await fn({ url, port, workbench });
  } finally {
    await new Promise((r) => server.close(r));
    workbench.close();
  }
}

test('① /api/cervical/health 返回 ok 与版本', async () => {
  await withServer(async ({ url }) => {
    const r = await fetch(`${url}api/cervical/health`);
    assert.equal(r.status, 200);
    const j = await r.json();
    assert.equal(j.ok, true);
    assert.match(j.version, /^\d+\.\d+\.\d+/);
    assert.equal(j.ui, '/api/cervical/ui');
    assert.ok(j.capabilities.includes('import'), '能力清单要能看出装了哪些功能');
  });
});

test('② /api/cervical/bootstrap 返回两个档案与临床研究，且与原型数据同形', async () => {
  await withServer(async ({ url }) => {
    const r = await fetch(`${url}api/cervical/bootstrap`);
    assert.equal(r.status, 200);
    const j = await r.json();
    assert.deepEqual(Object.keys(j.profiles).sort(), ['A', 'B']);
    assert.ok(j.profiles.A.metrics.length > 10);
    assert.ok(j.profiles.A.docs.length >= 1, '病情整理的资料库要随档案返回');
    assert.equal(j.trials.length, 14);
    assert.equal(j.agent.available, true, '开发版自带挂载位演示');
    assert.ok(j.layout.agentPane, '布局常量要随 bootstrap 下发给前端');
  });
});

test('③ 私密闸门：bootstrap 不含私密原文，?private=1 才给', async () => {
  await withServer(async ({ url }) => {
    const open = await (await fetch(`${url}api/cervical/bootstrap`)).json();
    assert.equal(open.profiles.A.vagina, null, 'bootstrap 默认不给阴道扩张原文');
    assert.equal(open.profiles.A.sexual, null, 'bootstrap 默认不给性健康原文');

    const one = await (await fetch(`${url}api/cervical/profile/A`)).json();
    assert.equal(one.profile.sexual, null);
    const privy = await (await fetch(`${url}api/cervical/profile/A?private=1`)).json();
    assert.ok(privy.profile.sexual.rows.length, '显式 private=1 才返回原文');
  });
});

test('④ 导出：markdown 可下载，且不含私密分节', async () => {
  await withServer(async ({ url }) => {
    const r = await fetch(`${url}api/cervical/export/A.md`);
    assert.equal(r.status, 200);
    assert.match(r.headers.get('content-type'), /text\/markdown/);
    assert.match(r.headers.get('content-disposition'), /attachment/);
    const md = await r.text();
    assert.match(md, /复诊准备/);
    assert.match(md, /不是医生结论/, '看法区必须带否定语境的抬头');
    assert.equal(/性交痛|干涩|扩张训练/.test(md), false, '私密原文不许进导出');
    assert.match(md, /私密内容/, '要说清"有意排除"，否则用户以为丢了数据');
  });
});

test('④b 保存导出：写进 <资料目录>/exports/，且不含私密原文', async () => {
  await withServer(async ({ url, workbench }) => {
    const r = await fetch(`${url}api/cervical/export/A.md/save`, { method: 'POST' });
    assert.equal(r.status, 200);
    const j = await r.json();
    assert.ok(j.file.includes(`${workbench.workspace}/exports/`), `导出要落进资料目录：${j.file}`);
    assert.ok(j.bytes > 500);
    const { readFileSync } = await import('node:fs');
    const md = readFileSync(j.file, 'utf8');
    assert.match(md, /复诊准备/);
    assert.equal(/性交痛/.test(md), false, '落盘文件同样不许带私密原文');
  });
});

test('⑤ 静态文件：UI 前缀能取到 index.html，路径穿越被拦', async () => {
  await withServer(async ({ url }) => {
    const r = await fetch(`${url}api/cervical/ui/index.html`);
    assert.equal(r.status, 200);
    assert.match(await r.text(), /小莲宝/);

    const evil = await fetch(`${url}api/cervical/ui/..%2f..%2fpackage.json`);
    const body = await evil.text();
    assert.equal(body.includes('"private": true'), false, '不许把仓库文件读出去');
  });
});

test('⑥ 未知接口回 JSON 404（不能回 HTML，前端按 JSON 解析）', async () => {
  await withServer(async ({ url }) => {
    const r = await fetch(`${url}api/cervical/nope`);
    assert.equal(r.status, 404);
    assert.match(r.headers.get('content-type'), /application\/json/);
    assert.equal((await r.json()).error, 'not_found');
  });
});

test('⑦ 导入接口：解析失败要明确报错，不许假装成功', async () => {
  await withServer(async ({ url }) => {
    /* 这条会用真实 MinerU（本机配了 token），喂的是伪造 PDF，所以**预期失败**。
       断言的是"失败要说清是哪一类"，不是"必须成功"——测试不该依赖网络是否通。
       解析失败的三条硬要求：不产候选、原件留着可重试、界面不显示成功。 */
    const r = await fetch(`${url}api/cervical/import?name=test.pdf`, {
      method: 'POST', headers: { 'content-type': 'application/octet-stream' }, body: Buffer.from('%PDF-1.4 fake'),
    });
    const j = await r.json();
    assert.ok([200, 502, 503].includes(r.status), `状态码不该是 ${r.status}`);
    if (r.status !== 200) {
      assert.ok(['NO_TOKEN', 'UNAUTHORIZED', 'NETWORK', 'TIMEOUT', 'API_ERROR', 'BAD_INPUT', 'TASK_FAILED', 'NO_MARKDOWN', 'BAD_ZIP']
        .includes(j.error), `失败原因不在已知枚举里：${j.error}`);
      assert.equal(Array.isArray(j.candidates), false, '解析失败不许返回候选');
    } else {
      assert.ok(Array.isArray(j.candidates), '成功时必须有 candidates 数组（哪怕是空的）');
    }
  });
});

test('⑧ 资料目录校验：主目录 / 桌面 / /tmp 一律拒绝', () => {
  assert.ok(validateWorkspacePath(homedir()).length > 0);
  assert.ok(validateWorkspacePath(join(homedir(), 'Desktop')).length > 0);
  assert.ok(validateWorkspacePath('/tmp/x').length > 0);
  assert.deepEqual(validateWorkspacePath(join(tmp, 'ok')), [], '自己新建的目录应当可用');
});
