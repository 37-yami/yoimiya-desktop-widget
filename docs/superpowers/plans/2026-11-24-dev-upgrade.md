# yoimiya-desktop-widget dev 分支升级改造实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在新建 dev 分支上完成任务书 P0 必做基线（资源压缩/去黑边/持久化/工程化/重构/性能）+ P1 AI 试点 PoC（DeepSeek LLM 实测、GPT-SoVITS 客户端、流式管线、情绪联动、主动搭话、Live2D 尽力而为）。

**Architecture:** 保持 Electron 28 + 原生 JS 单窗口架构。主进程拆分出 config.js / store.js / llm.js / tts.js；渲染层 HTML 内联脚本抽为独立 widget.js 并新增 idle 状态机与音量 UI；资源迁移到 characters/yoimiya/ 角色包。P1 代码全部带优雅降级，关闭服务时回落到本地 MP3 + 静态形象。

**Tech Stack:** Electron 28、electron-store@8（CJS 最后一个主版本）、ffmpeg-static（构建期工具）、Python Pillow + rembg(u2net)（离线资源管线）、DeepSeek chat API（实测 key 已验证可用）。

**Spec:** 用户提供的任务书（本对话），P0 各项 + P1 试点 A/B/C/D。

## Global Constraints

- 全部提交落在新建 `dev` 分支，P0 每项独立 commit，message 中文一句话。
- 不破坏核心功能：透明窗口 / 点击穿透 / 拖拽 / 托盘。
- asar 大小写敏感：音频统一小写 `.mp3`，比较用 `toLowerCase()`。
- P1 允许失败，失败写入 `docs/poc/NOTES.md`；禁止硬编码 hack。
- API key 不入库：DeepSeek key 放 `.env.local`（已在 .gitignore）。
- 版权：不公开分发克隆音色/角色素材；仓库文档注明。

## 已确认的现状（省去重复探查）

- GIF：720×720、125 帧、30ms/帧（≈33fps）、**无 alpha 通道**，背景实心 `(3,2,3)` 近黑 → 黑边根源。
- 音频：`audio/voice1-5.MP3` 大写后缀；HTML 里 `AUDIO_EXT='.MP3'`。
- 常量：`WIDGET_WIDTH/HEIGHT/EDGE_RIGHT/EDGE_BOTTOM/FULLSCREEN_THRESHOLD` 硬编码在 main.js。
- 托盘图标仅 16×16；全屏检测 `setInterval 2000`；右键菜单的开发者工具/重新加载无条件注入。
- 无 LICENSE 文件、无 eslint/prettier/jsconfig、无 CI；node_modules 未安装；ffmpeg 未装（用 ffmpeg-static 或 Python Pillow 替代）；Python 3.13 + Pillow 11.1 可用；DeepSeek key 已实测连通（返回 model: deepseek-flash）。

## 任务分解（每项一个 commit）

### Task 1: 建分支 + P0-6 资源命名与角色包重构

- `git checkout -b dev`
- `audio/voiceN.MP3` → `characters/yoimiya/voices/voiceN.mp3`（git mv，全部小写）
- 新建 `characters/yoimiya/manifest.json`（name/sprite/lines[]/voices[]/bubbleStyle）与 `config.js`（抽出全部窗口常量 + 路径）
- main.js / HTML 改为读 manifest + config；文件比较 toLowerCase
- package.json build.files 更新（`characters/**`、`config.js`、widget.js 等）
- 验收：`npm start` 手动可用（或至少 `node -e` require config 无错 + manifest JSON 合法）

### Task 2: P0-3 设置持久化（electron-store）

- `npm i electron-store@8`；持久化 soundEnabled / alwaysOnTop / autoHideOnFullscreen / 窗口位置 / 音量
- 启动恢复位置（clamp 到工作区防"丢失"），变更即写入
- 验收：启动→改设置→重启后恢复（userData 里 config.json 可查）

### Task 3: P0-4 调试入口收敛

- 右键菜单「开发者工具」「重新加载」仅 `!app.isPackaged || --dev` 时注入；`start:win` 在 main.js 顶部 `delete process.env.ELECTRON_RUN_AS_NODE` 兜底

### Task 4: P0-5 工程化（LICENSE/eslint/prettier/jsconfig/CI）

- MIT LICENSE（版权 37-yami）
- eslint（js 公共配置）+ prettier + `.prettierignore` + jsconfig.json（URIBase `.`）
- `.github/workflows/ci.yml`：windows-latest，npm ci + lint + `electron-builder --dir` 校验；tag 触发 release
- 验收：`npm run lint` 0 error，CI yaml 语法合法

### Task 5: P0-1+P0-2 资源管线：去黑底 + 压缩

- `pip install rembg onnxruntime`（u2net 模型自动下载）→ 处理 125 帧
- 降采样：480×480、抽帧至 ~16fps、导出**带 alpha 的动画 WebP**（Pillow 原生支持）；目标 ≤5MB
- rembg 装不上则回落 numpy 色度键控（背景 (3,2,3) 距离阈值）
- 产物 `characters/yoimiya/yoimiya.webp`，manifest 指向它；管线脚本入 `scripts/`
- 验收：文件 ≤5MB、四角 alpha=0、`npm start` 观感无黑方块

### Task 6: P0-7 性能与体验

- 全屏检测：`display-metrics-changed` / `powerMonitor resume` 事件触发即时检查 + 保留低频轮询兜底（纯 JS 无法 RegisterShellHookWindow，记入 NOTES）
- 拖拽惯性：drag-move 采样速度，drag-end 后主进程衰减动画 + 边界回弹（钳制内）
- idle 状态机（渲染层规则表）：N 分钟未交互→待机台词；整点/深夜特定台词
- 托盘图标 16+32 双尺寸（Pillow 放大生成 32）
- 音量滑条 0–100（右键菜单入口 + HTML 滑条，持久化）
- 验收：`npm run lint` 过 + 手动逻辑走查

### Task 7: P1-A3+A4 LLM 对话 + 流式（DeepSeek 实测）

- `.env.local` 写 key（gitignored）；`llm.js` 主进程客户端：SYSTEM_PROMPT 强制 JSON `{text,emotion,motion}`，流式吐字、按 。！？，切句
- `scripts/test-deepseek.mjs` 实测脚本（真实调用、打印 JSON 三元组与切句流）
- 右键菜单「AI 对话」开关；渲染端点击→LLM 回复→气泡+情绪样式；LLM 失败回落本地台词表
- `docs/poc/A3-llm-deepseek.md` 报告（含真实返回样例）

### Task 8: P1-A1 TTS 客户端（GPT-SoVITS，PoC 代码 + 连通性探测）

- `tts.js`：按任务书参数封装 9880 端口调用 + 400 JSON 异常分支 + 健康探测
- 服务不在本机 → 记录 `docs/poc/A1-gpt-sovits.md`（代码、参数速查、未跑通原因）
- 渲染端播放链路预留：有 TTS 用 TTS，无则本地 MP3

### Task 9: P1-C 情绪-动作联动（≥2 情绪端到端）

- LLM emotion → 气泡 CSS 变体（happy 金色光晕 / sleepy 蓝紫+zzz）+ 角色动作类（wave/jump 关键帧）+ 本地语音桶
- `docs/poc/C-emotion-motion.md`

### Task 10: P1-D 主动搭话调度器

- 主进程定时：整点/深夜/系统空闲 N 分钟 → LLM 一句话 → 气泡；失败回落本地规则表
- 合入 Task 7 的 llm.js，`docs/poc/D-proactive.md`

### Task 11: P1-B2 Live2D PoC（尽力而为，允许失败）

- dev-only 页面 `docs/poc/live2d-poc.html` + pixi@6/pixi-live2d-display，官方示例模型远程加载
- 跑不通则记录 peer 依赖/CDN 问题于 NOTES.md

### Task 12: 收尾

- `docs/poc/NOTES.md` 汇总失败项与原因；README 增补 dev 分支说明与版权边界
- 验收复查：打包 `--dir` 体积、lint、LICENSE 识别、manifest 结构

## Review Focus

1. asar 内大写路径 → 全部小写化 + toLowerCase 比较（Task 1 测试：manifest voices 全小写）
2. electron-store 9+ 是 ESM，main.js require 会炸 → 锁 ^8.2.0
3. WebP 在 Electron 28 Chromium 渲染 OK，但 `image-rendering: pixelated` 会破坏观感 → 移除该 CSS（Task 5）
4. 多显示器/缩放：恢复窗口位置必须 clampToWorkArea（Task 2）
5. 全屏隐藏期间锁定穿透的既有逻辑不能被惯性拖拽/调度器破坏（Task 6 走查 mousePassthroughLocked 分支）
