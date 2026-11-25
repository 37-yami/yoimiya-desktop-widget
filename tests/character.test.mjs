import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('loadCharacterPack 返回 manifest 与正斜杠相对目录名', () => {
  const { loadCharacterPack } = require('../character.js');
  const pack = loadCharacterPack();
  assert.equal(pack.manifest.name, 'yoimiya');
  assert.equal(pack.dirName, 'characters/yoimiya', '目录名必须是正斜杠相对路径（渲染层拼 URL 用）');
});

test('manifest.sprite 指向的文件真实存在（约定：相对项目根目录）', () => {
  const { loadCharacterPack } = require('../character.js');
  const pack = loadCharacterPack();
  const abs = path.join(ROOT, pack.manifest.sprite);
  assert.ok(fs.existsSync(abs), `sprite 文件不存在：${abs}`);
});

test('registerCharacterIpc 注册 get-character-pack 同步通道并回填 returnValue', () => {
  const { loadCharacterPack, registerCharacterIpc } = require('../character.js');
  const handlers = {};
  registerCharacterIpc({ on: (ch, h) => (handlers[ch] = h) }, loadCharacterPack());
  assert.ok(handlers['get-character-pack'], '应注册 get-character-pack 处理器');
  const ev = {};
  handlers['get-character-pack'](ev);
  assert.equal(ev.returnValue.manifest.name, 'yoimiya');
  assert.equal(ev.returnValue.dirName, 'characters/yoimiya');
});

test('manifest 缺失时 loadCharacterPack 返回 null manifest 而不抛错', () => {
  const { loadCharacterPack } = require('../character.js');
  const pack = loadCharacterPack(path.join(ROOT, 'no-such', 'manifest.json'));
  assert.equal(pack.manifest, null);
  assert.equal(pack.dirName, 'characters/yoimiya');
});
