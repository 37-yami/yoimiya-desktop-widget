import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

test('isDevMode：未打包或带 --dev 参数时为 true', () => {
  const { isDevMode } = require('../env.js');
  assert.equal(isDevMode(false, ['electron', '.']), true, '未打包 → 开发模式');
  assert.equal(isDevMode(true, ['electron', '.', '--dev']), true, '--dev → 开发模式');
  assert.equal(isDevMode(true, ['electron', '.']), false, '已打包且无 --dev → 生产模式');
});

test('clearRunAsNode 清理 ELECTRON_RUN_AS_NODE 环境变量', () => {
  const { clearRunAsNode } = require('../env.js');
  const env = { ELECTRON_RUN_AS_NODE: '1', PATH: 'x' };
  clearRunAsNode(env);
  assert.equal('ELECTRON_RUN_AS_NODE' in env, false, '变量应被删除');
  assert.equal(env.PATH, 'x', '其他环境变量不受影响');
});
