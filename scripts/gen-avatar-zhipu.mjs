/**
 * AI 形象生成（P1-B1）—— 智谱 CogView / GLM-Image 官方接口
 * ============================================================
 * 用法:
 *   ZHIPU_API_KEY=xxx node scripts/gen-avatar-zhipu.mjs [--model cogview-4-250304] [--out 路径.png] [--prompt "..."]
 *
 * 说明:
 *   - key 只从环境变量读取，绝不打印、不入库
 *   - 生成结果 URL 约 30 分钟失效，脚本立即下载落盘
 *   - 费用参考: cogview-4 系列约 ¥0.06/张，glm-image 略高
 */

import fs from 'node:fs';
import path from 'node:path';

const API = 'https://open.bigmodel.cn/api/paas/v4/images/generations';

const DEFAULT_PROMPT =
  'Q版动漫原创角色少女，烟花祭典主题，暖橙色双马尾，大红色蝴蝶结发饰，' +
  '琥珀色大眼睛，白色羽织外套带红橙色火焰纹样，内搭深蓝色和服裙，' +
  '手拿发光的小烟花棒，开心笑着挥手打招呼，全身正面站立居中，' +
  '纯白色背景，柔和赛璐璐上色，干净利落的边缘，高质量动漫插画';

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : fallback;
};

const apiKey = process.env.ZHIPU_API_KEY;
if (!apiKey) {
  console.error('缺少环境变量 ZHIPU_API_KEY（智谱开放平台 API key）');
  process.exit(1);
}

const model = arg('model', 'cogview-4-250304');
const out = path.resolve(arg('out', '.source-assets/ai-character.png'));
const size = arg('size', '1024x1024');
const prompt = arg('prompt', DEFAULT_PROMPT);

console.log(`模型: ${model}  尺寸: ${size}  输出: ${out}`);

const res = await fetch(API, {
  method: 'POST',
  headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ model, prompt, size }),
  signal: AbortSignal.timeout(120_000),
});

if (!res.ok) {
  const detail = await res.text().catch(() => '');
  console.error(`生成失败 HTTP ${res.status}: ${detail.slice(0, 300)}`);
  process.exit(1);
}

const json = await res.json();
const item = json.data && json.data[0];
if (!item) {
  console.error('回包无 data:', JSON.stringify(json).slice(0, 300));
  process.exit(1);
}

let buf;
if (item.b64_json) {
  buf = Buffer.from(item.b64_json, 'base64');
} else if (item.url) {
  const img = await fetch(item.url, { signal: AbortSignal.timeout(120_000) });
  if (!img.ok) {
    console.error(`下载结果图失败 HTTP ${img.status}`);
    process.exit(1);
  }
  buf = Buffer.from(await img.arrayBuffer());
} else {
  console.error('回包既无 url 也无 b64_json');
  process.exit(1);
}

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, buf);
console.log(`完成: ${out} (${(buf.length / 1024).toFixed(0)}KB)`);
