import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

test('parseEnvText 解析 .env.local 格式（注释/空行/引号）', () => {
  const { parseEnvText } = require('../llm.js');
  const text = [
    '# 注释行',
    'DEEPSEEK_API_KEY=sk-test123',
    '',
    'DEEPSEEK_MODEL="deepseek-flash"',
    '  DEEPSEEK_BASE_URL=https://api.deepseek.com  ',
  ].join('\n');
  const env = parseEnvText(text);
  assert.equal(env.DEEPSEEK_API_KEY, 'sk-test123');
  assert.equal(env.DEEPSEEK_MODEL, 'deepseek-flash');
  assert.equal(env.DEEPSEEK_BASE_URL, 'https://api.deepseek.com');
});

test('parseLlmJson 提取裸 JSON 并补齐默认 emotion/motion', () => {
  const { parseLlmJson } = require('../llm.js');
  const r = parseLlmJson('{"text":"烟花易逝！","emotion":"happy"}');
  assert.deepEqual(r, { text: '烟花易逝！', emotion: 'happy', motion: 'idle' });
});

test('parseLlmJson 提取 ```json 代码块内的 JSON', () => {
  const { parseLlmJson } = require('../llm.js');
  const r = parseLlmJson('好的！\n```json\n{"text":"一起去看烟花吧","emotion":"excited","motion":"jump"}\n```');
  assert.equal(r.text, '一起去看烟花吧');
  assert.equal(r.emotion, 'excited');
  assert.equal(r.motion, 'jump');
});

test('parseLlmJson 从夹杂文字的回复中捞出 JSON 对象', () => {
  const { parseLlmJson } = require('../llm.js');
  const r = parseLlmJson('前置说明 {"text":"晚安","emotion":"sleepy","motion":"idle"} 后置补充');
  assert.equal(r.text, '晚安');
});

test('parseLlmJson 非法/缺 text 输入返回 null', () => {
  const { parseLlmJson } = require('../llm.js');
  assert.equal(parseLlmJson('完全不是 JSON'), null);
  assert.equal(parseLlmJson('{"emotion":"happy"}'), null);
  assert.equal(parseLlmJson('{"text":""}'), null);
  assert.equal(parseLlmJson('{"text":123}'), null);
});

test('SentenceSplitter 按中文标点流式切句', () => {
  const { SentenceSplitter } = require('../llm.js');
  const sp = new SentenceSplitter();
  assert.deepEqual(sp.feed('你好呀！最近'), ['你好呀！']);
  assert.deepEqual(sp.feed('烟花大会怎么样？'), ['最近烟花大会怎么样？']);
  assert.deepEqual(sp.feed('很热闹'), []);
  assert.deepEqual(sp.flush(), ['很热闹']);
});

test('SentenceSplitter 长句按逗号断句（流式首包提前）', () => {
  const { SentenceSplitter } = require('../llm.js');
  const sp = new SentenceSplitter();
  const out = sp.feed('今晚的烟花，特别漂亮，不看会后悔哦。');
  assert.equal(out.length, 3);
  assert.equal(out[0], '今晚的烟花，');
});

test('sanitizeEmotion/sanitizeMotion 白名单回落', () => {
  const { EMOTIONS, MOTIONS } = require('../llm.js');
  assert.deepEqual(EMOTIONS, ['happy', 'shy', 'sad', 'excited', 'sleepy']);
  assert.deepEqual(MOTIONS, ['idle', 'wave', 'jump', 'laugh']);
});
