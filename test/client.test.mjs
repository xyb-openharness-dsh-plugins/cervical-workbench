/* 宿主侧入口（lib/client.js）的离线自检。
 *
 * 为什么值得单独测：这个文件**不经过任何打包/编译**，直接丢给宿主 renderer 的
 * `window.__ModuleLoader__.load({id, factory})`。家族里踩过两次：
 *   - 写成原生 ESM（`export default`）→ renderer 报 `Unexpected token 'export'`，
 *     还会触发 plugin-recovery 把整个包移出 profile；
 *   - register 少传 `businessSide/businessWidth` → 面板宽度按宿主默认，页面被挤成一条。
 * 这两类错误在仓库里 `npm run check` 不会红（没人执行这个文件），装到 Desktop 才发现。
 *
 * 做法：给一个假 window + 假 require('react')，把文件当普通脚本 eval 一遍，
 * 断言它调用了 register、参数对不对、Panel 渲染出来是 iframe 指到正确路径。
 * 注意：这只是**入口契约**自检，不等于在 Desktop 里真的画出来了（那要实机签认）。
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const SRC = readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8');

/** 极简 React 替身：只要 createElement 能记录 tag/props/children。 */
const React = {
  createElement(tag, props, ...children) {
    return { tag, props: props || {}, children };
  },
};

function loadClient() {
  let captured = null;
  const sandbox = {
    window: {
      __ModuleLoader__: {
        load(spec) { captured = spec; },
      },
    },
  };
  const require = (name) => {
    if (name === 'react') return React;
    throw new Error(`client.js 不该 require(${name})——宿主只保证 react 可用`);
  };
  /* eslint-disable no-new-func */
  new Function('window', 'require', `${SRC}\n`)(sandbox.window, require);
  return captured;
}

test('① 必须是 ModuleLoader.load({id, factory}) 包装的普通脚本，不能是 ESM', () => {
  assert.equal(/^\s*export\s/m.test(SRC), false, '出现 export 会被 renderer 拒绝');
  assert.equal(/^\s*import\s/m.test(SRC), false, '不能被当成 ESM 解析');
  const spec = loadClient();
  assert.ok(spec, '没有调用 window.__ModuleLoader__.load');
  assert.equal(spec.id, '@xyb-community/cervical-workbench');
  assert.equal(typeof spec.factory, 'function');
});

test('② factory 只依赖 react，返回 {apply, inject}', () => {
  const spec = loadClient();
  const mod = spec.factory((name) => {
    if (name === 'react') return React;
    throw new Error(`factory 里 require(${name}) 会炸`);
  });
  assert.equal(typeof mod.apply, 'function');
  assert.deepEqual(mod.inject, ['desktopWorkbenches']);
});

test('③ register 参数：标题、仓库、标准分栏（left/0.65/customFrame=false）', () => {
  const spec = loadClient();
  const mod = spec.factory(() => React);
  let registered = null;
  const ctx = {
    effect(fn) { return fn(); },
    desktopWorkbenches: {
      register(meta, Panel) { registered = { meta, Panel }; },
    },
  };
  mod.apply(ctx);
  assert.ok(registered, 'apply 里没有 register');
  assert.match(registered.meta.title, /小莲宝/);
  assert.equal(registered.meta.repository, 'https://github.com/xyb-openharness-dsh-plugins/cervical-workbench');
  assert.equal(registered.meta.businessSide, 'left');
  assert.equal(registered.meta.businessWidth, 0.65);
  assert.equal(registered.meta.customFrame, false);
});

test('④ Panel 是一个占满空间的 iframe，src 指向本包 UI 前缀（不维护第二套 UI）', () => {
  const spec = loadClient();
  const mod = spec.factory(() => React);
  let Panel = null;
  mod.apply({
    effect(fn) { return fn(); },
    desktopWorkbenches: { register(meta, P) { Panel = P; } },
  });
  const node = Panel();
  assert.equal(node.tag, 'iframe');
  assert.equal(node.props.src, '/api/cervical/ui/index.html');
  assert.equal(node.props.style.flex, 1);
  assert.equal(node.props.style.border, 0);
});
