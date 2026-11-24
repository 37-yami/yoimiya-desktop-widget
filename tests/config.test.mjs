import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

test('config.js 导出全部窗口常量且为正整数', () => {
  const config = require('../config.js');
  const keys = [
    'WIDGET_WIDTH',
    'WIDGET_HEIGHT',
    'EDGE_RIGHT',
    'EDGE_BOTTOM',
    'FULLSCREEN_THRESHOLD',
  ];
  for (const k of keys) {
    assert.ok(config[k] !== undefined, `缺少常量 ${k}`);
    assert.ok(Number.isInteger(config[k]) && config[k] > 0, `${k} 应为正整数`);
  }
});

test('config.js 指向角色包目录与 manifest', () => {
  const config = require('../config.js');
  assert.match(config.CHARACTER_DIR.replaceAll('\\', '/'), /characters\/yoimiya$/);
  assert.ok(config.MANIFEST_PATH.endsWith('manifest.json'));
});

test('角色包 manifest.json 结构合法且语音文件全部存在（小写扩展名）', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const config = require('../config.js');
  const manifest = require(config.MANIFEST_PATH);

  assert.equal(manifest.name, 'yoimiya');
  assert.ok(Array.isArray(manifest.lines) && manifest.lines.length > 0, 'lines 应为非空数组');
  assert.ok(
    Array.isArray(manifest.voices) && manifest.voices.length === manifest.lines.length,
    'voices 与 lines 数量应一一对应'
  );
  assert.ok(
    typeof manifest.sprite === 'string' && manifest.sprite.length > 0,
    'sprite 应为非空字符串'
  );

  for (const voice of manifest.voices) {
    assert.match(voice, /\.mp3$/, `语音文件 ${voice} 扩展名必须是小写 .mp3`);
    const abs = path.join(config.CHARACTER_DIR, 'voices', voice);
    assert.ok(fs.existsSync(abs), `语音文件不存在：${abs}`);
  }
});
