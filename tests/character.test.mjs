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

test('resolveEmotionSprites：manifest 无 emotionSprites 时返回 null（回落单张 sprite）', () => {
  const { resolveEmotionSprites } = require('../character.js');
  assert.equal(resolveEmotionSprites({ manifest: null, dirName: 'characters/yoimiya' }), null);
  assert.equal(resolveEmotionSprites({ manifest: { sprite: 'a.png' }, dirName: 'x' }), null);
});

test('resolveEmotionSprites：完整合法的情绪立绘集原样返回（路径相对项目根）', () => {
  const { resolveEmotionSprites } = require('../character.js');
  const fs = require('node:fs');
  const os = require('node:os');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pack-'));
  const sprites = {};
  for (const e of ['idle', 'happy', 'excited', 'shy', 'sad', 'sleepy']) {
    fs.writeFileSync(path.join(tmp, `${e}.webp`), 'x');
    sprites[e] = `${path.basename(tmp)}/${e}.webp`;
  }
  const root = path.dirname(tmp);
  const r = resolveEmotionSprites({ manifest: { emotionSprites: sprites }, dirName: 'd' }, root);
  assert.deepEqual(Object.keys(r).sort(), ['excited', 'happy', 'idle', 'sad', 'shy', 'sleepy']);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('真实角色包：六个姿势的情绪立绘集全部解析成功且文件存在', () => {
  const { buildCharacterPack, POSES } = require('../character.js');
  const pack = buildCharacterPack();
  assert.ok(pack.emotionSprites, 'manifest.emotionSprites 应完整且文件齐全');
  for (const p of POSES) {
    assert.ok(fs.existsSync(path.join(ROOT, pack.emotionSprites[p])), `缺少 ${p} 立绘`);
  }
});

test('normalizeSpriteMode：AI 形态仅在情绪立绘集可用时生效，否则退回原形态', () => {
  const { normalizeSpriteMode } = require('../character.js');
  assert.equal(normalizeSpriteMode('original', true), 'original');
  assert.equal(normalizeSpriteMode('original', false), 'original');
  assert.equal(normalizeSpriteMode('ai', true), 'ai');
  assert.equal(normalizeSpriteMode('ai', false), 'original', '立绘集缺失时不能停在 AI 形态');
  assert.equal(normalizeSpriteMode(undefined, true), 'original');
  assert.equal(normalizeSpriteMode('garbage', true), 'original');
});

test('resolveEmotionSprites：缺少必需情绪或文件不存在时返回 null（整组降级，避免半套立绘跳图）', () => {
  const { resolveEmotionSprites } = require('../character.js');
  const fs = require('node:fs');
  const os = require('node:os');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pack-'));
  const base = path.basename(tmp);
  const full = {};
  for (const e of ['idle', 'happy', 'excited', 'shy', 'sad', 'sleepy']) {
    full[e] = `${base}/${e}.webp`;
  }
  // 文件都没写 → 全部不存在
  assert.equal(
    resolveEmotionSprites({ manifest: { emotionSprites: full }, dirName: 'd' }, path.dirname(tmp)),
    null
  );
  // 写齐文件后应通过
  for (const e of Object.keys(full)) fs.writeFileSync(path.join(tmp, `${e}.webp`), 'x');
  assert.ok(
    resolveEmotionSprites({ manifest: { emotionSprites: full }, dirName: 'd' }, path.dirname(tmp))
  );
  // 去掉 sleepy → 不完整
  delete full.sleepy;
  assert.equal(
    resolveEmotionSprites({ manifest: { emotionSprites: full }, dirName: 'd' }, path.dirname(tmp)),
    null
  );
  // 未知情绪键被忽略（不影响合法性）
  full.sleepy = `${base}/sleepy.webp`;
  full.angry = `${base}/nope.webp`;
  const r = resolveEmotionSprites(
    { manifest: { emotionSprites: full }, dirName: 'd' },
    path.dirname(tmp)
  );
  assert.equal(r.angry, undefined, '未知情绪不应出现在结果里');
  fs.rmSync(tmp, { recursive: true, force: true });
});
