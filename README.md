# 🎆 宵宫桌面悬浮挂件 — Yoimiya Desktop Widget

> 原神角色「宵宫」的 Q 版像素风桌面宠物，基于 Electron 构建。  
> 透明悬浮 · 语音互动 · 全屏避让 · 拖拽移动 · 绿色免安装

<p align="center">
  <img src="yoimiya.gif" alt="宵宫挂件截图" width="200">
</p>

---

## ✨ 功能特性

| 功能                   | 说明                                                                                  |
| ---------------------- | ------------------------------------------------------------------------------------- |
| 🪟 **透明悬浮**        | 无边框、背景完全透明，只显示角色本体                                                  |
| 🎤 **语音互动**        | 点击角色播放随机台词，5 句宵宫原声                                                    |
| 💬 **漫画气泡**        | 自适应文字长度，弹跳动画显隐，情绪变色                                                |
| 🎭 **情绪立绘集**      | 待机 + 5 种情绪姿势随对话切换：交叉淡入、呼吸起伏、各情绪待机节奏、头顶小粒子         |
| 🔁 **形象切换**        | 右键菜单在「原形态（原 GIF）」与「AI 形态（情绪立绘）」间切换，默认原形态，选择会记住 |
| 🖱️ **自由拖拽**        | 按住角色任意位置拖动，松手带惯性滑行与边界回弹，高 DPI 不失灵                         |
| 🎮 **全屏避让**        | 检测到全屏应用自动降级透明且完全不可交互，退出游戏自动恢复                            |
| 🔔 **系统托盘**        | 隐藏后托盘图标一键恢复，可一键回到默认位置（16/32 双尺寸图标）                        |
| ⚙️ **右键菜单**        | 音效 / 全屏避让 / 置顶 / 音量滑条 / 形象切换 / AI 对话 / 回到默认位置                 |
| ⚡ **点击穿透**        | 透明区域不阻挡桌面图标和其他窗口                                                      |
| 💾 **设置持久化**      | 位置 / 音量 / 开关状态重启后全部恢复                                                  |
| 😴 **待机台词**        | 长时间未交互 / 整点 / 深夜触发角色自言自语                                            |
| 🤖 **AI 对话（可选）** | 可选接入 DeepSeek，流式回复 + 情绪/动作联动，失败自动回落本地台词                     |
| 📦 **绿色免安装**      | 解压即用，自带启动器与文件夹内快捷方式生成脚本                                        |

---

## 📁 项目结构

```
yoimiya-desktop-widget/
├── main.js                    ← Electron 主进程（窗口 / 托盘 / 菜单 / 全屏检测 / 拖拽+惯性 / LLM/TTS 调用）
├── preload.js                 ← contextBridge 安全桥接（渲染 ↔ 主进程通信）
├── yoimiya-widget.html        ← 渲染进程（CSS 动画 + 交互 + AI 气泡 + idle 状态机 + 音量滑条）
├── config.js                  ← 窗口尺寸 / 边距 / 检测阈值等全局常量
├── store.js                   ← 设置持久化（electron-store）
├── env.js                     ← 开发模式判定 / ELECTRON_RUN_AS_NODE 清理
├── character.js               ← 角色包加载（主进程读取后下发给渲染层）
├── llm.js                     ← DeepSeek 兼容客户端（SSE 流式 + JSON 三元组解析 + 流式切句）
├── tts.js                     ← GPT-SoVITS api_v2 客户端（服务不在线时自动改用本地语音）
├── yoimiya.gif                ← 原形态：角色动图原图（21MB，默认形象）
├── characters/yoimiya/        ← ★ 角色包（换角色 = 换目录，渲染层零改动）
│   ├── manifest.json          ← { name, sprite, emotionSprites, lines[], voices[], bubbleStyle }
│   ├── emotions/*.webp        ← AI 形态：情绪立绘集（idle/happy/excited/shy/sad/sleepy）
│   └── voices/voice1-5.mp3    ← 官方语音（小写 .mp3，asar 兼容）
├── tray-icon.png / -32.png    ← 托盘图标（16×16 + 32×32 高 DPI）
├── scripts/                   ← 构建 / 启动器 / 立绘处理 / 测试脚本
│   ├── optimize_sprite.py     ← 抠图（GIF 动图 / --single 单图，rembg 多模型 + chroma 兜底）
│   ├── build_emotion_sprites.py ← 多张同角色图 → 抠图/清杂点/统一取景 → 情绪立绘集
│   ├── verify_sprite.py       ← 立绘验收（体积/帧率/尺寸/四角 alpha）
│   ├── gen-avatar-zhipu.mjs   ← 智谱 CogView 一键生成 AI 立绘（需 ZHIPU_API_KEY）
│   ├── test-deepseek.mjs      ← AI 接口连通测试
│   └── check-preload.js       ← 启动自检（npm run test:preload）
├── tests/                     ← node --test 单元测试
├── docs/poc/                  ← AI 对话 / 语音克隆 / 立绘的说明与实验记录
├── .env.local                 ← AI 对话接口配置（可选，自行创建）
├── build/icon.ico             ← 应用图标
└── package.json
```

> ⚠️ `node_modules/` 和 `dist/` 不在仓库中。前者通过 `npm install` 生成，后者通过 `npm run build:dir` 生成。

---

## 🚀 快速开始

### 环境要求

- [Node.js](https://nodejs.org/) ≥ 18
- npm（随 Node.js 安装）
- Windows 10 / 11

### 安装与启动

```bash
# 1. 克隆仓库
git clone https://github.com/37-yami/yoimiya-desktop-widget.git
cd yoimiya-desktop-widget

# 2. 安装依赖（仅首次）
npm install

# 3. 启动挂件
npm start
```

> ⚠️ 如果从 VSCode 内置终端启动失败（报 `Cannot read properties of undefined`）：  
> VSCode 终端默认设置了 `ELECTRON_RUN_AS_NODE=1`，导致 Electron 退化为纯 Node.js。  
> 解决方法：使用 Windows 命令提示符或 PowerShell，或在 VSCode 中执行 `npm run start:win`。

### 安装出错了怎么办

**如果按上面的步骤安装或启动时出了问题，可以尝试把报错信息发给 AI 来解决**（GitHub Copilot、ChatGPT、通义千问、豆包等都可以）。提问时把**完整的报错文本**贴上去，并说明"在 Windows 上安装一个 Electron 桌面挂件的依赖时出错"，通常能直接得到可执行的解决命令。

下面是一个已经有用户遇到过的例子：

**现象**：`npm install` 最后出现

```text
npm warn cleanup Failed to remove some directories [
npm warn cleanup   [Error: EPERM: operation not permitted, rmdir '...\node_modules\...'
...
npm error code 1
```

**原因**：有程序正占用着 `node_modules` 里的文件，npm 清理不掉旧目录。常见的占用者是 VSCode、正在运行的挂件，或杀毒软件的实时扫描。

**解决**：先关闭 VSCode 和正在运行的挂件（托盘图标右键 → 关闭挂件），然后在项目根目录执行：

```powershell
# PowerShell
Remove-Item -Recurse -Force node_modules
npm cache clean --force
npm install
```

```bat
:: 命令提示符（cmd）
rmdir /s /q node_modules
npm cache clean --force
npm install
```

> 开头的几行 `npm warn deprecated ...` 只是依赖包的弃用提醒，不影响使用，不用处理。

### 创建快捷方式（源码启动，免打包）

`npm install` 完成后，双击运行一次 `scripts\create-source-shortcut.cmd`：

- 在**项目根目录**生成快捷方式 **「宵宫挂件.lnk」**
- 双击它即可启动挂件——直接调用 `electron.exe`，**无需打包、无控制台窗口闪烁、不依赖任何 exe 下载**
- 删除 `node_modules` 后快捷方式失效，重新 `npm install` + 再跑一次脚本即可

### 免安装使用（普通用户推荐）

从 [Releases](https://github.com/37-yami/yoimiya-desktop-widget/releases) 下载 `YoimiyaWidget-green-vX.Y.Z.zip`，**解压到任意文件夹**后，两种启动方式任选：

| 方式                 | 操作                                                                           |
| -------------------- | ------------------------------------------------------------------------------ |
| 直接启动             | 双击文件夹内的 `run-widget.cmd` → 挂件立即出现（相对路径，文件夹搬到哪都能用） |
| 快捷方式启动（推荐） | 见下方说明                                                                     |

### 如何用快捷方式启动

1. 解压绿色包后，双击运行一次 `create-shortcut.cmd`
2. 脚本会在**同一文件夹内**生成快捷方式 **「宵宫挂件.lnk」**（带应用图标，指向本文件夹内的 `win-unpacked\YoimiyaWidget.exe`）
3. 之后**双击「宵宫挂件.lnk」**即可启动挂件 ✅

> 💡 注意事项：
>
> - 整个文件夹移动位置后，快捷方式会失效（.lnk 记录绝对路径）——重新运行一次 `create-shortcut.cmd` 即可刷新
> - 为什么不预置好 .lnk？Windows 快捷方式记录的是绝对路径，压缩包解压到别人电脑的路径不可预知，预置必定失效，故采用「相对路径启动器 + 用户侧快捷方式生成脚本」的组合

### 操作说明

| 操作                        | 效果                                                                                 |
| --------------------------- | ------------------------------------------------------------------------------------ |
| **左键点击角色**            | 随机播放语音 + 弹出对话气泡（4 秒后自动消失）                                        |
| **按住角色拖动**            | 移动挂件到任意位置（自动限制在屏幕内，拖不丢）                                       |
| **右键**                    | 弹出设置菜单（音效 / 全屏 / 置顶 / 音量 / 形象切换 / AI 对话 / 回到默认位置 / 退出） |
| **点击托盘图标**            | 恢复被隐藏的窗口                                                                     |
| **托盘右键 → 回到默认位置** | 挂件回到屏幕右下角（挂件找不到了就用它）                                             |

---

## 🎵 当前台词

台词与语音由角色包 `characters/yoimiya/manifest.json` 驱动（`lines[i]` 与 `voices[i]` 一一对应）：

| 索引 | 台词                                             | 音频         |
| ---- | ------------------------------------------------ | ------------ |
| 0    | 烟花易逝，人情长存！✨                           | `voice1.mp3` |
| 1    | 风好大，声音都被吹回来啦～🎆                     | `voice2.mp3` |
| 2    | 哈哈，看我搓个雪球，咻——💥                       | `voice3.mp3` |
| 3    | 『英雄形态』的宵宫姐姐登场！邪恶必散，正义必胜！ | `voice4.mp3` |
| 4    | 一起去玩吧！😆                                   | `voice5.mp3` |

---

## 🤖 AI 对话（可选）

右键菜单勾选「💬 AI 对话」后，点击角色即调用 LLM 生成符合宵宫性格的回复
（流式逐句显示 + 情绪联动气泡/动作）。**任何失败都会自动回落本地台词与语音，
挂件本体永不依赖外部服务。**

### 配置 `.env.local`（项目根目录）

```ini
DEEPSEEK_API_KEY=sk-xxxx
DEEPSEEK_MODEL=deepseek-flash
DEEPSEEK_BASE_URL=https://api.deepseek.com
```

- 官方接口可用模型：`deepseek-flash` / `deepseek-v4-pro`；
- 使用第三方中转站时改 `DEEPSEEK_BASE_URL` 与对应模型名即可
  （例如 `https://tokenshare.net/v1` + `deepseek-v4.1-flash`）；
- 验证命令：`node scripts/test-deepseek.mjs`
- 语音克隆（GPT-SoVITS）与 Live2D 的说明见 `docs/poc/` 目录。

---

## 🔧 自定义

### 修改台词

编辑角色包 `characters/yoimiya/manifest.json` 的 `lines` 数组
（`voices` 数组与之一一对应，增减条目记得同步放音频文件）：

```json
{
  "lines": ["你的台词 1", "你的台词 2"],
  "voices": ["voice1.mp3", "voice2.mp3"]
}
```

### 替换语音

将 MP3 文件放入 `characters/yoimiya/voices/`，命名 `voice1.mp3` `voice2.mp3` …
（**扩展名统一小写 `.mp3`**——打包后 asar 虚拟文件系统区分大小写）。

### 替换角色形象

- **方式一（情绪立绘集，效果最好）**：准备同一角色的 6 张图（纯色背景、全身、
  每张一个姿势），按下表命名后放进一个文件夹，一条命令完成抠图与接入
  （脚本默认读取项目下的 `.source-assets/ai/`，这个文件夹需要自己新建；
  图片放在别处则加 `--input-dir 文件夹路径`）：

  | 文件名                                                             | 姿势             |
  | ------------------------------------------------------------------ | ---------------- |
  | `idle.png`                                                         | 待机（默认姿势） |
  | `happy.png` / `excited.png` / `shy.png` / `sad.png` / `sleepy.png` | 5 种情绪         |

  ```bash
  python scripts/build_emotion_sprites.py     # → characters/yoimiya/emotions/*.webp
  ```

  脚本会用**同一个裁切框**处理全部图片（否则切换情绪时角色会跳位），并在图片所在
  文件夹输出一张带脚底基准线的质检图 `_qa-sheet.png`。出图用的 Prompt 与方法见
  `docs/poc/B1-ai-art-guide.md`。六个姿势齐全时挂件才会启用情绪集，
  缺任何一张都整体回落到单张 `sprite`；

- **方式二（单张 AI 立绘）**：生成一张纯色背景的全身立绘后抠图接入：

  ```bash
  python scripts/optimize_sprite.py --single 你的图.png --out characters/yoimiya/sprite-ai.webp
  ```

  再把 `manifest.json` 的 `sprite` 指向新文件即可（立绘会自动叠加悬浮/呼吸/情绪动画）；

- **方式三（现成透明素材）**：把 `manifest.json` 的 `sprite` 指向新素材
  （带透明通道的 WebP/APNG/GIF/SVG 均可，路径相对项目根目录）；
- **方式四（自己处理原 GIF）**：根目录 `yoimiya.gif` 是未抠背景的原图，
  可用 `python scripts/optimize_sprite.py`（需 `pip install rembg onnxruntime`；
  `--model` 可选 `isnet-general-use`/`birefnet-general`，`--method chroma` 为色度键控兜底）
  或你自己的工具处理，产物验收：`python scripts/verify_sprite.py`；
- **原形态 / AI 形态**：右键菜单「🎭 形象切换」可在两者间切换，默认原形态，选择会记住。
  `manifest.json` 里 `sprite` 是原形态，`emotionSprites` 是 AI 形态；
  六张情绪立绘不齐全时「AI 形态」菜单项置灰；
- 想调整角色显示大小：`yoimiya-widget.html` 里 `body.electron-mode .character-frame`
  的宽高，窗口高度在 `config.js` 的 `WIDGET_HEIGHT`（当前 160px 立绘 / 350px 窗口）；
- 改完务必跑 `npm run test:preload`，它会真实启动渲染层，确认立绘加载成功、
  情绪立绘集六张齐全且能切换；
- 完整换角色：新建 `characters/<name>/` 目录（manifest + 素材 + voices），渲染层零改动。

> 如需同步更换应用图标：用 GIF 任一帧（建议选完整姿势帧）制作多尺寸 ico（16/32/48/64/128/256）覆盖 `build/icon.ico`，重新打包后 exe / 快捷方式即为新图标。

---

## 🏗️ 技术架构

```
┌─ main.js (主进程) ───────────────────────────────────────────┐
│  BrowserWindow  透明 / 无边框 / 置顶                          │
│  Tray           系统托盘                                      │
│  Menu           右键上下文菜单                                 │
│  screen         全屏检测（仅挂件所在显示器 / workArea 启发式）     │
│  setIgnoreMouseEvents  点击穿透（事件驱动 + 全屏隐藏期间锁定）     │
│  拖拽           getCursorScreenPoint 绝对坐标 + 工作区边界钳制    │
│  IPC            与渲染进程双向通信                              │
└───────────────┬─────────────────────────────────────────────┘
                │ contextBridge (preload.js)
┌───────────────▼─────────────────────────────────────────────┐
│  yoimiya-widget.html（渲染进程）                               │
│  ├─ CSS  @keyframes float  浮游呼吸动画                       │
│  ├─ CSS  @keyframes bubbleBounceIn  气泡弹跳                  │
│  ├─ CSS  pointer-events  透明区域穿透                          │
│  ├─ JS   台词随机不重复 + 音频引用池防 GC                       │
│  ├─ JS   拖拽意图判定（阈值/rAF 节流/buttons 兜底）              │
│  └─ JS   mouseenter/leave → IPC 穿透切换（按住期间锁定）        │
└─────────────────────────────────────────────────────────────┘
```

### npm 脚本

| 命令                   | 用途                                                  |
| ---------------------- | ----------------------------------------------------- |
| `npm start`            | 启动开发版                                            |
| `npm run start:win`    | 启动（强制清除 ELECTRON_RUN_AS_NODE）                 |
| `npm run dev`          | 启动 + 开发者工具                                     |
| `npm test`             | 单元测试（node --test）                               |
| `npm run test:preload` | 启动自检（真实加载页面，检查立绘与 preload 是否正常） |
| `npm run lint`         | ESLint 检查                                           |
| `npm run format`       | Prettier 格式化                                       |
| `npm run build:green`  | 构建绿色免安装包 zip（推荐分发用）                    |
| `npm run build:dir`    | 只构建 `dist/win-unpacked/` 文件夹                    |
| `npm run build`        | 构建单文件 portable exe（需 GitHub 连通）             |

---

## ❓ FAQ

### 克隆后如何运行？

```bash
git clone <仓库地址>
cd yoimiya-desktop-widget
npm install
npm start
```

### 想用老版本？

改造前的 v1.1.0 保留在 `master` 分支（当前版本在 `main`）：

```bash
git clone -b master https://github.com/37-yami/yoimiya-desktop-widget.git
```

### npm install 报 EPERM / cleanup Failed to remove some directories？

有程序占用了 `node_modules` 里的文件（常见是 VSCode 或正在运行的挂件）。关掉它们，
删除 `node_modules` 后重装即可，具体命令见[「安装出错了怎么办」](#安装出错了怎么办)。
其他报错可以把完整报错贴给 AI，一般都能直接解决。

### 音频没有声音？

1. 右键菜单 → 勾选「🔊 开启音效」
2. 确认 `characters/yoimiya/voices/` 中文件名扩展名为小写 `.mp3`
3. 右键菜单 → 「🎵 音量调节」确认音量不为 0
4. 开发模式下打开开发者工具 → Console 面板查看是否有音频加载警告

### 全屏游戏时挂件不消失？

1. 确认右键菜单中「🎮 全屏应用时自动隐藏」已勾选
2. 如果 Windows 设置了「自动隐藏任务栏」，workArea 检测会误判——请用右键菜单「暂时隐藏」手动控制
3. v1.1.0 起只检测**挂件所在显示器**的全屏状态；若挂件在副屏而游戏全屏在主屏，挂件不会隐藏（属预期行为，把挂件拖到主屏即可）

### 挂件被拖丢了 / 找不到了？

右键托盘图标 → 「📍 回到默认位置（右下角）」，挂件立即回到主屏幕右下角。
v1.1.0 起拖拽已自动限制在屏幕工作区内，正常情况下不会再拖丢。

### 拖动挂件时松开鼠标后它还跟着光标跑？

这是 v1.0 的已知 bug，v1.1.0 已修复（拖拽期间锁定鼠标穿透 + mouseup 丢失兜底）。如仍复现请提 Issue。

### 双击 run-widget.cmd 没反应？

- 确认 zip 已**完整解压**（不要在压缩软件里直接双击运行）
- 部分杀毒软件/Defender 可能拦截未签名的 Electron 程序，请添加信任后重试

---

## 📄 版权说明

- 宵宫（Yoimiya）形象与官方语音的版权归 **miHoYo / HoYoverse 及官方 CV** 所有；
- 本项目是非商业性质的同人作品，请勿用于商业用途；
- AI 形态的立绘为基于参考图生成的同人二创，随仓库一并提供；
- Release 附带 SHA256 校验文件，避免杀软静默拦截造成无提示损坏。

---

## 📄 License

MIT（见 [LICENSE](LICENSE)）
