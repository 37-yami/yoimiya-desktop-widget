# P1-A3 PoC 报告：DeepSeek LLM 对话（JSON 三元组输出）

## 尝试了什么

主进程封装 `llm.js`，用 DeepSeek（OpenUI 兼容协议）做角色扮演对话，
强制输出 `{text, emotion, motion}` JSON 三元组，供气泡显示 / 情绪联动 / 动作触发消费。

## 工具与版本

| 项                   | 值                                                  |
| -------------------- | --------------------------------------------------- |
| API                  | `POST {baseUrl}/chat/completions`（SSE 流式）       |
| 官方模型（实测可用） | `deepseek-flash`、`deepseek-v4-pro`                 |
| 客户端               | Node/Electron 主进程 `fetch`（无额外依赖）          |
| 系统 Prompt          | 见 `llm.js` `SYSTEM_PROMPT`（宵宫人设 + JSON 约束） |

## 关键代码 / 参数

```js
// llm.js —— 配置全走 .env.local / 环境变量（换中转站只改一行）
DEEPSEEK_API_KEY=...
DEEPSEEK_MODEL=deepseek-flash
DEEPSEEK_BASE_URL=https://api.deepseek.com

// 请求体
{ model, stream: true, max_tokens: 200, temperature: 0.8,
  messages: [{role:'system', content: SYSTEM_PROMPT}, {role:'user', content: 场景上下文}] }
```

容错解析链：整串 JSON → ` ```json ` 围栏 → 首个配平 `{...}`；
`emotion`/`motion` 白名单校验（`happy|shy|sad|excited|sleepy` / `idle|wave|jump|laugh`），
缺省回落 `happy`/`idle`。

## 实测结果（2026-11-24，官方接口 + deepseek-flash）

```
--- 用户: 宵宫，今天晚上有什么安排吗？ ---
[流式] 30 个增量包，首包延迟 1622ms
[三元组] {"text":"嘿嘿，当然是去长野原看烟花啦！要不要一起来？","emotion":"excited","motion":"jump"}

--- 用户: 宵宫，今天晚上有什么安排吗？（第二次）---
[三元组] {"text":"嘿嘿，今晚我准备去海边试放新做的烟花，要不要一起来看？","emotion":"excited","motion":"jump"}
```

复现命令：

```bash
node scripts/test-deepseek.mjs --key <你的key> --model deepseek-flash
```

## ✅ 第二个 key（用户提供的新 key + deepseek-v4.1-flash）— 已查清并跑通

- 该 key 在官方 `api.deepseek.com` 实测 **401**；官方接口支持模型仅 `deepseek-flash` / `deepseek-v4-pro`，
  **不存在 `v4.1-flash`** → 判定属第三方中转站；
- **2026-11-25 用户提供中转站地址，实测确认**：base URL = `https://tokenshare.net/v1`
  （`/v1/models` 返回 200；根路径是网页后台，不能当 base URL）；
- 中转站可用模型（共 5 个，全部文本模型）：`deepseek-v4.1-flash`、`glm5.3-nvfp4`、
  `kimi-k3.1-pro`、`minimax-m3.1-flash`、`qwen38-nvfp4`；
- `/v1/images/generations` 为路由级 404 → **该站无生图能力**；
- 全链路实测 PASS：

```
[流式] 12 个增量包，首包延迟 1628ms
[三元组] {"text":"今晚要去试做新的烟花哦，要不要一起来看？","emotion":"excited","motion":"jump"}
```

复现：`node scripts/test-deepseek.mjs --base-url https://tokenshare.net/v1`
（`.env.local` 已切到该配置；key 不入库）。

## 优雅降级（已实现）

- 未配置 key → 菜单项置灰，点击走本地台词表；
- 连续失败 ≥3 次（如 401）→ 本次运行期内自动停用 LLM，避免每次点击都打失败请求；
- 任何失败 → 渲染层回落本地台词 + 本地 MP3，挂件本体不受影响。

## 后续建议

1. 补充中转站 base URL 后用 `scripts/test-deepseek.mjs --base-url ... --key ... --model deepseek-v4.1-flash` 一键验证；
2. 对话记忆：当前每次请求无历史，可加最近 3 轮的 messages 上下文（注意 token 成本）；
3. 若要更低首包延迟，可试官方 `deepseek-v4-pro` 是否有更快的 TTFB（未实测计费差异）。
