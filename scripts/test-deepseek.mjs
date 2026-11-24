/**
 * DeepSeek LLM 实测脚本（P1-A3/A4 PoC 验收）
 * ============================================================
 * 用法：
 *   node scripts/test-deepseek.mjs
 *       —— 使用 .env.local / 环境变量里的配置
 *   node scripts/test-deepseek.mjs --key sk-xxx --model deepseek-flash
 *       —— 显式覆盖（测试不同 key / 中转站时用）
 *
 * 验证内容：
 *   ① SSE 流式增量到达（打印每个 delta）
 *   ② JSON 三元组 {text, emotion, motion} 容错解析
 *   ③ 按 。！？， 切句（TTS 排队预备）
 */
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { loadLlmConfig, chatComplete, parseLlmJson, SentenceSplitter } = require('../llm.js');

const args = process.argv.slice(2);
const arg = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};

const config = { ...loadLlmConfig() };
if (arg('key')) config.apiKey = arg('key');
if (arg('model')) config.model = arg('model');
if (arg('base-url')) config.baseUrl = arg('base-url');

if (!config.apiKey) {
  console.error('未配置 DEEPSEEK_API_KEY（.env.local 或 --key）');
  process.exit(1);
}

console.log(`配置: model=${config.model}  baseUrl=${config.baseUrl}  key=${config.apiKey.slice(0, 6)}***`);
console.log('--- 用户: 宵宫，今天晚上有什么安排吗？ ---');

const sp = new SentenceSplitter();
let deltaCount = 0;
let firstDeltaMs = 0;
const startedAt = Date.now();

try {
  const full = await chatComplete(config, {
    userText: '宵宫，今天晚上有什么安排吗？',
    onDelta: (d) => {
      if (!firstDeltaMs) firstDeltaMs = Date.now() - startedAt;
      deltaCount++;
      process.stdout.write(d);
      for (const s of sp.feed(d)) console.log(`\n  [切句] ${s}`);
    },
  });
  console.log('\n---');
  console.log(`[流式] ${deltaCount} 个增量包，首包延迟 ${firstDeltaMs}ms`);
  console.log(`[三元组] ${JSON.stringify(parseLlmJson(full))}`);
  const rest = sp.flush();
  if (rest.length) console.log(`  [切句/尾句] ${rest.join('')}`);
  console.log('=== PASS: 流式对话 + JSON 解析 + 切句 全链路 OK ===');
} catch (err) {
  console.error(`\nFAIL: ${err.message}`);
  process.exit(1);
}
