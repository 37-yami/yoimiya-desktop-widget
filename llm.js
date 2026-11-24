/**
 * LLM 对话客户端（主进程）—— DeepSeek 兼容 OpenAI 协议
 * ============================================================
 * 配置来源（优先级：环境变量 > .env.local > 内置默认）：
 *   DEEPSEEK_API_KEY   必填，缺失时视为未启用（回落本地台词表）
 *   DEEPSEEK_MODEL     默认 deepseek-flash（官方已验证）
 *   DEEPSEEK_BASE_URL  默认 https://api.deepseek.com（中转站改这里）
 *
 * 优雅降级约定：chatComplete 任何异常都向调用方抛出，
 * 由调用方回落到本地 MP3 / 台词表，不影响挂件本体运行。
 */

const fs = require('fs');
const path = require('path');

const EMOTIONS = ['happy', 'shy', 'sad', 'excited', 'sleepy'];
const MOTIONS = ['idle', 'wave', 'jump', 'laugh'];

const SYSTEM_PROMPT = `你是长野原宵宫，稻妻"夏祭的女将"，烟花的继承人。
性格：热情健谈、爱打趣，三句话不离烟花和夏祭。
要求：口语化，每次回复不超过两句话。必须只输出 JSON（不要输出其他文字）：
{"text":"要说的话","emotion":"happy|shy|sad|excited|sleepy","motion":"idle|wave|jump|laugh"}`;

// ============================================================
// .env.local 解析（轻量实现，不引入 dotenv 依赖）
// ============================================================

/**
 * 解析 KEY=VALUE 文本为对象。
 * 规则：跳过空行与 # 开头的整行注释；值两侧的引号剥离。
 */
function parseEnvText(text) {
  const out = {};
  for (const rawLine of String(text).split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

/** 读取 LLM 配置（env 优先于 .env.local） */
function loadLlmConfig(env = process.env, envFile = path.join(__dirname, '.env.local')) {
  let fileEnv = {};
  try {
    fileEnv = parseEnvText(fs.readFileSync(envFile, 'utf8'));
  } catch (_) {
    // .env.local 不存在 = 未配置，正常
  }
  const apiKey = env.DEEPSEEK_API_KEY || fileEnv.DEEPSEEK_API_KEY || '';
  const model = env.DEEPSEEK_MODEL || fileEnv.DEEPSEEK_MODEL || 'deepseek-chat';
  const baseUrl = (env.DEEPSEEK_BASE_URL || fileEnv.DEEPSEEK_BASE_URL || 'https://api.deepseek.com')
    .replace(/\/+$/, '');
  return { apiKey, model, baseUrl, enabled: Boolean(apiKey) };
}

// ============================================================
// 回复解析（容错提取 {text, emotion, motion}）
// ============================================================

/**
 * 从 LLM 回复文本中提取 JSON 三元组。
 * 尝试顺序：整串直接解析 → ```json 围栏 → 首个配平的 {...}。
 * emotion/motion 不在白名单时回落 happy/idle；无有效 text 返回 null。
 */
function parseLlmJson(text) {
  if (typeof text !== 'string') return null;
  const candidates = [text.trim()];

  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) candidates.push(fence[1].trim());

  const start = text.indexOf('{');
  if (start !== -1) {
    let depth = 0;
    for (let i = start; i < text.length; i++) {
      if (text[i] === '{') depth++;
      else if (text[i] === '}') {
        depth--;
        if (depth === 0) {
          candidates.push(text.slice(start, i + 1));
          break;
        }
      }
    }
  }

  for (const candidate of candidates) {
    try {
      const obj = JSON.parse(candidate);
      if (obj && typeof obj.text === 'string' && obj.text.trim()) {
        return {
          text: obj.text.trim(),
          emotion: EMOTIONS.includes(obj.emotion) ? obj.emotion : 'happy',
          motion: MOTIONS.includes(obj.motion) ? obj.motion : 'idle',
        };
      }
    } catch (_) {
      // 尝试下一个候选
    }
  }
  return null;
}

// ============================================================
// 流式切句器
// ============================================================

/**
 * 流式切句：feed() 每次喂入增量文本，返回本批切出的完整句子。
 * 按 。！？，断句（含分隔符本身），未断句的余量留在内部缓冲，
 * flush() 取出剩余部分（调用方在流结束时调用）。
 */
class SentenceSplitter {
  constructor(delimiters = '。！？，') {
    this.buf = '';
    this.delims = delimiters;
  }

  feed(delta) {
    this.buf += delta;
    const out = [];
    let i = 0;
    for (let j = 0; j < this.buf.length; j++) {
      if (this.delims.includes(this.buf[j])) {
        out.push(this.buf.slice(i, j + 1));
        i = j + 1;
      }
    }
    this.buf = this.buf.slice(i);
    return out;
  }

  flush() {
    const rest = this.buf.trim() ? [this.buf] : [];
    this.buf = '';
    return rest;
  }
}

// ============================================================
// API 调用（SSE 流式）
// ============================================================

/**
 * 流式对话补全。返回完整回复文本；onDelta 每收到一段增量即回调。
 * @param {object} config loadLlmConfig() 的结果
 * @param {{userText: string, onDelta?: (s: string) => void, signal?: AbortSignal}} opts
 */
async function chatComplete(config, { userText, onDelta, signal }) {
  if (!config.apiKey) throw new Error('未配置 DEEPSEEK_API_KEY（LLM 未启用）');

  const res = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userText },
      ],
      stream: true,
      max_tokens: 200,
      temperature: 0.8,
    }),
    signal,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`LLM HTTP ${res.status}: ${errText.slice(0, 200)}`);
  }

  // SSE 解析：行缓冲跨越 chunk 边界（一条 data: 可能被拆成两段网络包）
  let full = '';
  let lineBuf = '';
  const decoder = new TextDecoder();
  const handleLine = (line) => {
    const trimmed = line.trim();
    if (!trimmed.startsWith('data:')) return;
    const data = trimmed.slice(5).trim();
    if (!data || data === '[DONE]') return;
    try {
      const json = JSON.parse(data);
      const delta = json.choices?.[0]?.delta?.content || '';
      if (delta) {
        full += delta;
        onDelta?.(delta);
      }
    } catch (_) {
      // 半包/心跳行，忽略
    }
  };

  for await (const chunk of res.body) {
    lineBuf += decoder.decode(chunk, { stream: true });
    const lines = lineBuf.split('\n');
    lineBuf = lines.pop(); // 最后一段可能不完整，留到下一轮
    for (const line of lines) handleLine(line);
  }
  if (lineBuf) handleLine(lineBuf);

  return full;
}

module.exports = {
  SYSTEM_PROMPT,
  EMOTIONS,
  MOTIONS,
  parseEnvText,
  loadLlmConfig,
  parseLlmJson,
  SentenceSplitter,
  chatComplete,
};
