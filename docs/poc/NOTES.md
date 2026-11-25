# P0/P1 PoC 总备忘（NOTES）

> 本文件汇总所有「尝试了、但没完全跑通」的路线及原因，
> 避免后续重复踩坑。日期：2026-11-24 起持续更新，分支：dev。

## ⚠️ 严重回归（已修复）：沙箱 preload 里 require 本地模块

- **现象**：dev 分支自首个提交（1be1a29）起，挂件在桌面模式下整体失效 ——
  无透明、无拖拽、无穿透切换、无语音、无设置/LLM。主进程与托盘看起来正常。
- **根因**：给 `preload.js` 加了 `require('./config')` / `require('path')`。
  Electron 20+ 渲染进程**默认沙箱化**，preload 只能 `require('electron')`，
  其它模块一律 `module not found` → preload 启动即崩 → `window.electronAPI` 不存在。
- **为何没被及时发现**：当时的冒烟测试只检查了「进程存活 + 设置文件生成」，
  没有验证渲染层。这是验证方法的漏洞，不是偶然。
- **修复**：角色包改由主进程 `character.js` 读取，经同步 IPC `get-character-pack`
  下发给 preload；preload 不再 require 任何本地/Node 模块（保留沙箱，更安全）。
- **防复发**：
  - `npm run test:preload`（`scripts/check-preload.js`）用与 main.js 相同的沙箱配置
    加载真实页面，断言 preload 无错、API 齐全、electron-mode 生效、立绘加载；
    已接入 CI；已验证它对坏版本报 FAIL。
  - 真实应用 E2E（CDP 连入运行中的 main.js）实测：设置 IPC ✓、拖拽结束位置写盘 ✓、
    音量写盘 ✓、透明模式 ✓。
- **教训**：Electron 应用的"能启动"≠"能用"。任何 preload 改动都必须跑
  `npm run test:preload`。

## P1-B1：AI 形象 — 改为用户自行出图 + 项目管线集成

- 原因①：本地无 SD/ComfyUI 环境。
- 原因②：会话内置生图服务（grok-imagine）两次 `Invalid credential`。
- 原因③（2026-11-25 排查）：本机当前所有连接均无生图通道 ——
  magpie 本地网关（`127.0.0.1:3425`）仅 13 个 GLM **文本**模型；
  配置里的 `zhipu` 直连 provider 的 key 为空（残留项）；tokenshare 中转站仅 5 个文本模型、
  `/v1/images/generations` 路由级 404。
- 原因④：源 GIF 自动抠图两轮（u2net 丢呆毛发饰 / isnet 空白乱扣）均不达标，已放弃；
  **2026-11-25 按用户要求恢复根目录 `yoimiya.gif` 原图为默认形象**，失败产物 webp 已从仓库移除
  （git 历史可取回），背景由用户自行处理。
- **可行路径（见 `B1-ai-art-guide.md`）**：
  1. 用户用即梦/通义万相等出图 → `scripts/optimize_sprite.py --single` 抠图集成；
  2. 有智谱 key 时：`ZHIPU_API_KEY=xxx node scripts/gen-avatar-zhipu.mjs` 一键生成。
- **2026-11-25 已落地**：用户用即梦按 Prompt A/C 出了 6 张图（基础图 + 5 情绪变体），
  经 `scripts/build_emotion_sprites.py` 抠图（isnet-general-use，深色底无白边）并统一取景
  （脚底基准线偏差 ≤4px@640px），产出 `characters/yoimiya/emotions/*.webp`（合计约 340KB），
  挂件按情绪自动切换，真实应用逐情绪截图验证通过。
- **形态切换**：默认原形态（根目录 `yoimiya.gif`），右键菜单「形象切换」可切到 AI 形态，
  持久化；带着已保存的 AI 形态重启时首帧即为 AI 待机（同步 IPC 取初始模式，无闪烁）。
- **发布说明**：仓库所有者于 2026-11-25 删除了任务书中「不公开分发 AI 生成的角色素材」
  一条，AI 立绘随仓库提供；文档统一改为「版权归 miHoYo 及官方 CV，非商业同人作品」。
- 后续：按任务书 Prompt（`(masterpiece, best quality), yoimiya \(genshin impact\), full body…`
  - ControlNet OpenPose）在本地 SD 环境出 3–5 姿势，再跑 `scripts/optimize_sprite.py` 的抠图段。

## P1-A1：GPT-SoVITS 实际合成 — 未本机跑通

- 客户端/降级链路全部就绪（测试 5/5），但本机未安装整合包（数 GB）。
- 见 `A1-gpt-sovits.md` 的三步后续建议。

## DeepSeek 第二个 key（新 key + deepseek-v4.1-flash，key 已匿名）— 已跑通

- 官方 `api.deepseek.com` 401；官方支持模型仅 `deepseek-flash`/`deepseek-v4-pro`。
- **2026-11-25 已解决**：中转站 base URL = `https://tokenshare.net/v1`，全链路实测 PASS
  （详见 `A3-llm-deepseek.md`）。该站仅 5 个文本模型，无生图端点。

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
