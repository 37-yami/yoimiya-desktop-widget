import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

test('默认设置完整且类型正确', () => {
  const store = require('../store.js');
  const d = store.defaults();
  assert.equal(d.soundEnabled, true);
  assert.equal(d.alwaysOnTop, true);
  assert.equal(d.autoHideOnFullscreen, true);
  assert.equal(d.volume, 100);
  assert.equal(d.windowPosition, null);
  assert.equal(d.aiChatEnabled, false, 'AI 对话默认关闭（未配 key 时零依赖）');
  assert.equal(d.spriteMode, 'original', '形象模式默认原形态');
});

test('sanitizeSpriteMode：只接受 ai / original，其余一律回落 original', () => {
  const { sanitizeSpriteMode } = require('../store.js');
  assert.equal(sanitizeSpriteMode('ai'), 'ai');
  assert.equal(sanitizeSpriteMode('original'), 'original');
  assert.equal(sanitizeSpriteMode('AI'), 'original');
  assert.equal(sanitizeSpriteMode(undefined), 'original');
  assert.equal(sanitizeSpriteMode(''), 'original');
});

test('音量写入时钳制到 0-100', () => {
  const store = require('../store.js');
  assert.equal(store.sanitizeVolume(150), 100);
  assert.equal(store.sanitizeVolume(-3), 0);
  assert.equal(store.sanitizeVolume('75'), 75);
  assert.equal(store.sanitizeVolume(42), 42);
  assert.equal(store.sanitizeVolume(undefined), 100);
});

test('内存兜底 store 的 get/set 与默认值回退', () => {
  const store = require('../store.js');
  const mem = store.createMemoryStore();
  mem.set('volume', 55);
  assert.equal(mem.get('volume'), 55);
  assert.equal(mem.get('soundEnabled'), true);
  mem.set('windowPosition', [100, 200]);
  assert.deepEqual(mem.get('windowPosition'), [100, 200]);
});
