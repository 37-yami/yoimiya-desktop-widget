import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

test('buildTtsPayload 按任务书参数速查组装请求体', () => {
  const { buildTtsPayload } = require('../tts.js');
  const p = buildTtsPayload({
    text: '烟花易逝，人情长存',
    emotion: 'happy',
    promptText: '参考音频文本',
  });
  assert.equal(p.text, '烟花易逝，人情长存');
  assert.equal(p.text_lang, 'zh');
  assert.equal(p.prompt_lang, 'zh');
  assert.equal(p.ref_audio_path, 'voices/ref/happy.wav');
  assert.equal(p.prompt_text, '参考音频文本');
  assert.equal(p.text_split_method, 'cut5');
  assert.equal(p.batch_size, 1);
  assert.equal(p.media_type, 'wav');
  assert.equal(p.streaming_mode, false);
});

test('ttsLocal 成功返回 Buffer（注入假 fetch）', async () => {
  const { ttsLocal } = require('../tts.js');
  const bytes = new Uint8Array([1, 2, 3, 4]);
  const fakeFetch = async () => ({
    ok: true,
    status: 200,
    arrayBuffer: async () => bytes.buffer,
  });
  const buf = await ttsLocal('你好', { fetchImpl: fakeFetch });
  assert.ok(Buffer.isBuffer(buf));
  assert.deepEqual([...buf], [1, 2, 3, 4]);
});

test('ttsLocal 失败回包（400 + JSON）转为可读错误', async () => {
  const { ttsLocal } = require('../tts.js');
  const fakeFetch = async () => ({
    ok: false,
    status: 400,
    text: async () => JSON.stringify({ message: 'text 为空', data: null }),
  });
  await assert.rejects(
    () => ttsLocal('', { fetchImpl: fakeFetch }),
    (err) => {
      assert.match(err.message, /GPT-SoVITS 400/);
      assert.match(err.message, /text 为空/);
      return true;
    }
  );
});

test('checkTtsHealth 服务未启动时返回 false 而非抛错', async () => {
  const { checkTtsHealth } = require('../tts.js');
  const fakeFetch = async () => {
    throw new Error('fetch failed'); // ECONNREFUSED 等价物
  };
  assert.equal(await checkTtsHealth({ fetchImpl: fakeFetch, timeoutMs: 50 }), false);
});

test('checkTtsHealth 服务在线返回 true', async () => {
  const { checkTtsHealth } = require('../tts.js');
  const fakeFetch = async () => ({ ok: true, status: 200 });
  assert.equal(await checkTtsHealth({ fetchImpl: fakeFetch, timeoutMs: 50 }), true);
});
