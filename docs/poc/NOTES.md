# P0/P1 PoC 总备忘（NOTES）

> 本文件汇总所有「尝试了、但没完全跑通」的路线及原因，
> 避免后续重复踩坑。日期：2026-11-24，分支：dev。

## P1-B1：AI 重制立绘（SDXL + LoRA）— 未实施

- 原因：需要 ComfyUI/SD WebUI + SDXL 底模 + 宵宫 LoRA（Civitai），显存与下载量大，
  本次环境不具备；且生成后仍需 rembg 抠图（该环节已具备）。
- 替代：P0 资源管线（rembg + WebP）已把原 GIF 黑边问题解决，B1 优先级下降。
- 后续：按任务书 Prompt（`(masterpiece, best quality), yoimiya \(genshin impact\), full body…`
  - ControlNet OpenPose）在本地 SD 环境出 3–5 姿势，再跑 `scripts/optimize_sprite.py` 的抠图段。

## P1-A1：GPT-SoVITS 实际合成 — 未本机跑通

- 客户端/降级链路全部就绪（测试 5/5），但本机未安装整合包（数 GB）。
- 见 `A1-gpt-sovits.md` 的三步后续建议。

## DeepSeek 第二个 key（新 key + deepseek-v4.1-flash，key 已匿名）— 暂不可用

- 官方 `api.deepseek.com` 401；官方支持模型仅 `deepseek-flash`/`deepseek-v4-pro`。
- 判定为第三方中转站 key，**缺 base URL**，已写入 `.env.local` 待补。

## P0-7：全屏检测真正事件驱动（RegisterShellHookWindow）— 折中实现

- Windows `RegisterShellHookWindow` / `EVENT_SYSTEM_FOREGROUND` 需要 Win32 原生模块
  （如 `ffi-napi`/自写 addon），与 Electron 28 的 ABI 兼容维护成本高。
- 当前折中：保留 2s 低频轮询 + `display-metrics-changed` / `powerMonitor resume` /
  `unlock-screen` 事件即时检查。进入/退出全屏的感知延迟上限 = 1 个轮询周期。

## P1-B2：Live2D 可视化运行 — 未本机验证

- 依赖 URL 全部 200 可达、页面代码完成；需要打开 `docs/poc/live2d-poc.html` 人工确认。

## P1-A5：口型同步视觉效果 — 未本机验证

- 依赖 TTS 音频（A1 未通），本地 MP3 路径刻意未挂同步（省 AudioContext 开销）。

## 环境副作用记录（供后来者知悉）

- `pip install rembg onnxruntime`：将 miniconda base 环境的 Pillow 11.1.0 升级到 12.2.0，
  并新增 scikit-image/pymatting 等包；
- u2net 模型（176MB）下载到用户目录 `~/.u2net/u2net.onnx`；
- 源 `yoimiya.gif`（21MB）已从工作树移除（git 历史保留），
  另备份于 `%TEMP%\opencode\yoimiya-source.gif`。
