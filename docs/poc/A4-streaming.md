# P1-A4 PoC 报告：流式管线（LLM 吐字 → 切句 → TTS 排队）

## 尝试了什么

三个组件打通「边生成边消费」的流式管线：

1. `llm.js` `chatComplete()`：SSE 增量解析（**行缓冲跨 chunk**，半包 `data:` 行不丢）；
2. `llm.js` `SentenceSplitter`：按 `。！？，` 切句，余量留缓冲；
3. `llm.js` `TextFieldStreamer`：**JSON 未收完就先吐 text 字段里的完整句子**
   （本 PoC 的核心发现：LLM 输出的是 JSON 而非裸文本，直接对流切句会产出
   `{"text":"嘿嘿，` 这种碎片；先定位 `"text":"` 再切才能正确断句）。

## 实测证据（官方 deepseek-flash）

`node scripts/test-deepseek.mjs` 输出（节选）：

```
{"te…xt":"今晚的烟花，特别漂亮，不看可惜哦！",…}   ← 30 个增量包陆续到达
[切句] 今晚的烟花，              ← 第一句先于 JSON 收完产出
[切句] 特别漂亮，
[切句] 不看可惜哦！","emotion":…  ← TextFieldStreamer 在闭合引号处正确停止
首包延迟 1622ms
```

单元测试 `tests/llm.test.mjs`：`SentenceSplitter` 3 例 + `TextFieldStreamer` 2 例全过。

## 应用内链路（已实现）

```
点击 → main llm-chat → chatComplete(onDelta)
                        └→ TextFieldStreamer.feed(delta)
                             └→ 完整句子 → send('llm-sentence') → 渲染层气泡逐句累积显示
       LLM 完成 → parseLlmJson → {text, emotion, motion}
                → TTS 在线？ 合成 wav → send('tts-audio') → 播放（口型同步）
                → 否则 随机本地 MP3
```

渲染层有「（歪头思考中……✨）」呼吸闪烁占位气泡（`.speech-bubble.thinking`）。

## 已知限制与后续建议

- `TextFieldStreamer` 不处理 text 值内转义引号（中文台词几乎不出现）；
- 句子级 TTS 排队接口已就绪但未真正并行合成（等 A1 服务可用后，
  把 `sendSentence` 同时送 TTS 队列即可实现"第一句音频立即播放"）；
- 首包延迟 ~1.6s 主要是官方 API TTFB，中转站可能更高，思考气泡已覆盖该空窗。
