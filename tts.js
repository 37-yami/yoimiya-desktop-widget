/**
 * TTS 客户端 —— GPT-SoVITS api_v2（本地服务，P1-A1 PoC）
 * ============================================================
 * 前置：GPT-SoVITS Windows 整合包，启动 api_v2.py 监听
 *       http://127.0.0.1:9880（默认账号无需鉴权）
 *
 * 参考音频：利用现有官方语音按情绪分桶（voices/ref/<emotion>.wav），
 * 配对的 prompt_text 写在 voices/ref/<emotion>.txt。
 *
 * 优雅降级：服务不在线时 checkTtsHealth() 返回 false，
 * 调用方回落本地 MP3 随机播放（任务书 A4 约定）。
 */

const DEFAULT_TTS_BASE_URL = 'http://127.0.0.1:9880';

/**
 * 组装 api_v2 /tts 请求体（参数速查见任务书 A1）。
 * ref_audio_path / prompt_text 由情绪桶推导，可显式覆盖。
 */
function buildTtsPayload({
  text,
  emotion = 'happy',
  refAudioPath,
  promptText,
  speedFactor = 1.0,
}) {
  return {
    text,
    text_lang: 'zh',
    ref_audio_path: refAudioPath || `voices/ref/${emotion}.wav`,
    prompt_text: promptText || '参考音频对应的文本',
    prompt_lang: 'zh',
    text_split_method: 'cut5',
    batch_size: 1,
    speed_factor: speedFactor,
    media_type: 'wav',
    streaming_mode: false,
  };
}

/**
 * 合成语音，返回 wav Buffer。
 * 失败回包为 4xx + JSON（{message, data}），转为可读 Error 抛出。
 * @param {string} text 待合成文本（无 GPU 环境建议 ≤50 字）
 * @param {{baseUrl?: string, fetchImpl?: typeof fetch, ...payloadOpts}} opts
 */
async function ttsLocal(text, opts = {}) {
  const { baseUrl = DEFAULT_TTS_BASE_URL, fetchImpl = fetch, ...payloadOpts } = opts;
  const res = await fetchImpl(`${baseUrl}/tts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildTtsPayload({ text, ...payloadOpts })),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    let detail = errText.slice(0, 200);
    try {
      const json = JSON.parse(errText);
      detail = json.message || JSON.stringify(json.data) || detail;
    } catch (_) {
      // 非 JSON 回包，保留原文
    }
    throw new Error(`GPT-SoVITS ${res.status}: ${detail}`);
  }

  return Buffer.from(await res.arrayBuffer());
}

/**
 * 健康探测：服务在线返回 true，连接失败返回 false（不抛错）。
 * 实现：对根路径发一个带超时的 HEAD（api_v2 会返回 200/404，均视为在线）。
 */
async function checkTtsHealth({
  baseUrl = DEFAULT_TTS_BASE_URL,
  fetchImpl = fetch,
  timeoutMs = 1500,
} = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl(baseUrl, { method: 'HEAD', signal: controller.signal });
    return Boolean(res); // 有响应即在线（404 也算）
  } catch (_) {
    return false; // ECONNREFUSED / 超时
  } finally {
    clearTimeout(timer);
  }
}

module.exports = {
  DEFAULT_TTS_BASE_URL,
  buildTtsPayload,
  ttsLocal,
  checkTtsHealth,
};
