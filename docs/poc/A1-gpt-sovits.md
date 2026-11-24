# P1-A1 PoC 报告：GPT-SoVITS 本地 TTS（音色克隆）

## 尝试了什么

封装 GPT-SoVITS `api_v2` 的 Node 客户端 `tts.js`：
请求体组装、`400 + JSON` 失败回包转可读错误、健康探测、
以及「LLM 回复 → 按情绪选参考音频 → 合成 wav → IPC 下发渲染层播放」的完整链路接线。

## 工具与版本

| 项                 | 值                                                           |
| ------------------ | ------------------------------------------------------------ |
| 客户端             | `tts.js`（主进程，零依赖 `fetch`）                           |
| 服务端（设计目标） | GPT-SoVITS Windows 整合包 `api_v2.py`，监听 `127.0.0.1:9880` |
| 单元测试           | `tests/tts.test.mjs`（注入假 fetch，5/5 通过）               |

## 关键参数（任务书速查表落地）

```js
// tts.js buildTtsPayload()
{
  text,                       // ≤50 字（无 GPU 的 CPU 推理建议）
  text_lang: 'zh',
  ref_audio_path: 'voices/ref/<emotion>.wav',   // 情绪分桶参考音频
  prompt_text: '参考音频对应的文本',
  prompt_lang: 'zh',
  text_split_method: 'cut5',   // 按中文标点切
  batch_size: 1,
  speed_factor: 1.0,
  media_type: 'wav',
  streaming_mode: false,
}
```

主进程链路（`main.js` `llm-chat` handler）：
健康探测与 LLM 请求**并行**发起 → LLM 成功且 TTS 在线 → 合成 wav →
`webContents.send('tts-audio', buffer)` → 渲染层 Blob URL 播放；
任何一步失败 → 渲染层回落本地 MP3（4s 等待超时兜底）。

## 结果

- ✅ 客户端代码与降级链路全部就绪，单元测试 5/5；
- ❌ **本机未实际合成出宵宫音色 wav**：本机未安装 GPT-SoVITS 整合包
  （健康探测 `http://127.0.0.1:9880` 返回不在线，符合预期）。

## 失败原因与后续建议

1. 整合包体积大（数 GB，含 PyTorch + 预训练底模），本次 PoC 环境未下载；
2. 参考音频未制作：需从现有官方 mp3 中挑选 3–5s 干净片段，按情绪
   （happy/excited/sleepy…）切到 `voices/ref/*.wav` 并配对 `prompt_text` 文本；
3. 建议后续步骤：
   - 下载整合包 → `api_v2.py` 起服务 → `python -c "from tts import checkTtsHealth; ..."` 验证 9880 在线；
   - 用 `ffmpeg -i characters/yoimiya/voices/voice1.mp3 -t 5 -ar 16000 voices/ref/happy.wav` 制作参考音频（prompt_text 填对应台词「烟花易逝，人情长存」）；
   - 无 GPU 时限制 `text` ≤50 字（任务书提示，CPU 推理慢）。
