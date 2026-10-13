# 🎆 宵宫桌面悬浮挂件 — Yoimiya Desktop Widget

> 原神角色「宵宫」的 Q 版像素风桌面宠物，基于 Electron 构建。  
> 透明悬浮 · 语音互动 · 全屏避让 · 拖拽移动 · 绿色免安装

<p align="center">
  <img src="yoimiya.gif" alt="宵宫挂件截图" width="200">
</p>

---

## ✨ 功能特性

| 功能 | 说明 |
|---|---|
| 🪟 **透明悬浮** | 无边框、背景完全透明，只显示角色本体 |
| 🎤 **语音互动** | 点击角色播放随机台词，5 句宵宫原声 |
| 💬 **漫画气泡** | 自适应文字长度，弹跳动画显隐 |
| 🖱️ **自由拖拽** | 按住角色任意位置拖动，自动限制在屏幕内，高 DPI 缩放不失灵 |
| 🎮 **全屏避让** | 检测到全屏应用自动降级透明且完全不可交互，退出游戏自动恢复 |
| 🔔 **系统托盘** | 隐藏后托盘图标一键恢复，可一键回到默认位置 |
| ⚙️ **右键菜单** | 音效开关 / 全屏避让 / 置顶切换 / 回到默认位置 / 开发者工具 |
| ⚡ **点击穿透** | 透明区域不阻挡桌面图标和其他窗口 |
| 📦 **绿色免安装** | 解压即用，自带启动器与文件夹内快捷方式生成脚本 |

---

## 📁 项目结构

```
yoimiya-desktop-widget/
├── main.js                    ← Electron 主进程（窗口 / 托盘 / 右键菜单 / 全屏检测 / 拖拽 / IPC）
├── preload.js                 ← contextBridge 安全桥接（渲染 ↔ 主进程通信）
├── yoimiya-widget.html        ← 渲染进程（CSS 动画 + JS 交互 + 台词 + 音频逻辑）
├── package.json               ← 项目配置 + npm 脚本 + electron-builder 打包配置
├── package-lock.json          ← 依赖版本锁定
├── yoimiya.gif                ← 宵宫角色 GIF（21 MB，可替换为其他角色的同格式图片）
├── tray-icon.png              ← 系统托盘橙色图标（16×16）
├── audio/                     ← 语音文件夹
│   ├── voice1.MP3             ← "烟花易逝，人情长存！✨" (63 KB)
│   ├── voice2.MP3             ← "风好大，声音都被吹回来啦～🎆" (119 KB)
│   ├── voice3.MP3             ← "哈哈，看我搓个雪球，咻——💥" (94 KB)
│   ├── voice4.MP3             ← "『英雄形态』的宵宫姐姐登场！邪恶必散，正义必胜！" (126 KB)
│   └── voice5.MP3             ← "一起去玩吧！😆" (53 KB)
├── scripts/                   ← 绿色包打包脚本（npm run build:green 使用）
│   ├── pack-green.ps1         ← 一键构建绿色包（win-unpacked + 启动器 → zip）
│   ├── run-widget.cmd         ← 相对路径启动器（解压后双击即运行）
│   └── create-shortcut.cmd    ← 快捷方式生成器（在文件夹内生成「宵宫挂件.lnk」）
├── build/
│   └── icon.ico               ← 应用图标（取自 yoimiya.gif 静态帧，可自行替换）
├── .gitignore
└── README.md
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

### 操作说明

| 操作 | 效果 |
|---|---|
| **左键点击角色** | 随机播放语音 + 弹出对话气泡（4 秒后自动消失） |
| **按住角色拖动** | 移动挂件到任意位置（自动限制在屏幕内，拖不丢） |
| **右键** | 弹出设置菜单（音效 / 全屏 / 置顶 / 回到默认位置 / 退出） |
| **点击托盘图标** | 恢复被隐藏的窗口 |
| **托盘右键 → 回到默认位置** | 挂件回到屏幕右下角（挂件找不到了就用它） |

---

## 🎵 当前台词

| 索引 | 台词 | 音频 |
|---|---|---|
| 0 | 烟花易逝，人情长存！✨ | `voice1.MP3` |
| 1 | 风好大，声音都被吹回来啦～🎆 | `voice2.MP3` |
| 2 | 哈哈，看我搓个雪球，咻——💥 | `voice3.MP3` |
| 3 | 『英雄形态』的宵宫姐姐登场！邪恶必散，正义必胜！ | `voice4.MP3` |
| 4 | 一起去玩吧！😆 | `voice5.MP3` |

---

## 🔧 自定义

### 修改台词

编辑 `yoimiya-widget.html`，搜索 `const MESSAGES` 找到台词数组：

```js
const MESSAGES = [
  '你的台词 1',   // 索引 0 → audio/voice1.MP3
  '你的台词 2',   // 索引 1 → audio/voice2.MP3
  // 增减条目后记得同步调整 audio/ 中的文件
];
```

### 替换语音

将 MP3 文件放入 `audio/` 文件夹，命名规则 `voice1.MP3` `voice2.MP3` …（**扩展名必须大写 `.MP3`**——打包后 asar 虚拟文件系统区分大小写）。

### 替换角色图片

将新的 GIF/PNG 命名为 `yoimiya.gif`，替换项目根目录下的原文件即可。

> 如需同步更换应用图标：用 GIF 任一帧（建议选完整姿势帧）制作多尺寸 ico（16/32/48/64/128/256）覆盖 `build/icon.ico`，重新打包后 exe / 快捷方式即为新图标。

---

## 📦 打包

### 方式一：绿色免安装包（推荐分发）

```bash
npm run build:green
```

一键产出 `dist/YoimiyaWidget-green-vX.Y.Z.zip`，包含：

```
YoimiyaWidget-green-vX.Y.Z.zip
├── win-unpacked/                  ← 应用本体（绿色目录，无需安装）
│   └── YoimiyaWidget.exe
├── run-widget.cmd                 ← 启动器（相对路径，解压到哪里都能用）
└── create-shortcut.cmd            ← 快捷方式生成器（在解压文件夹内生成 .lnk）
```

**给使用者：**

1. 把 zip 发给对方（或上传 GitHub Release）
2. 对方解压到**任意目录**
3. 两种用法任选：
   - 双击 `run-widget.cmd` 直接运行（零前置步骤，启动器使用相对路径，整个文件夹搬到哪都能用）
   - 或先运行一次 `create-shortcut.cmd`，在**同一文件夹内**生成快捷方式「宵宫挂件.lnk」，之后双击它启动（有正式的应用图标，观感更像原生程序）

> 💡 为什么不直接在 zip 里预置 .lnk？  
> Windows 快捷方式记录的是**绝对路径**，且系统 API 保存相对路径时也会强制转成绝对路径（已实测）。压缩包解压到别人电脑的路径不可预知，预置的 .lnk 必定失效。所以采用「相对路径启动器 + 用户侧快捷方式生成脚本」的组合。文件夹整体移动后，重新运行一次 `create-shortcut.cmd` 即可刷新快捷方式。

### 方式二：单文件 portable exe

```bash
npm run build
```

产出 `dist/YoimiyaWidget.exe` 单文件。缺点：每次启动要解压到临时目录，启动明显更慢，一般不推荐。

### 只想构建不打包

```bash
npm run build:dir    # 只产出 dist/win-unpacked/ 文件夹
```

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

| 命令 | 用途 |
|---|---|
| `npm start` | 启动开发版 |
| `npm run start:win` | 启动（强制清除 ELECTRON_RUN_AS_NODE） |
| `npm run dev` | 启动 + 开发者工具 |
| `npm run build:green` | 构建绿色免安装包 zip（推荐分发用） |
| `npm run build:dir` | 只构建 `dist/win-unpacked/` 文件夹 |
| `npm run build` | 构建单文件 portable exe（需 GitHub 连通） |

---

## ❓ FAQ

### 克隆后如何运行？

```bash
git clone <仓库地址>
cd yoimiya-desktop-widget
npm install
npm start
```

### 音频没有声音？

1. 右键菜单 → 勾选「🔊 开启音效」
2. 确认 `audio/` 中文件名扩展名为大写 `.MP3`
3. 打开开发者工具 → Console 面板查看是否有音频加载警告

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

## 📜 更新日志

### v1.1.0

**🐛 Bug 修复**

- **拖拽残留**：快速拖动后在窗口边缘松开鼠标，挂件会"粘"在光标上继续跟随。根因是穿透 forward 模式只转发 mousemove 不转发 mouseup；现按住期间锁定穿透保证 mouseup 送达，并增加 `e.buttons` 兜底检测（覆盖 Alt-Tab、拖拽中弹菜单等场景）
- **高 DPI 拖拽失灵**：125%/150% 缩放下挂件移动速度与光标不同步。拖拽增量改为在主进程用 `getCursorScreenPoint()` 绝对坐标计算，单位天然一致；同时消除慢速拖动时逐帧取整丢失小数位移的问题
- **拖出屏幕丢失**：拖拽位置现在自动钳制在显示器工作区内，跨屏拖拽不受影响；托盘/右键菜单新增「📍 回到默认位置」
- **全屏期间隐形窗口可交互**：全屏自动隐藏时只做了透明化，挂件区域仍会吞掉游戏点击、甚至误触语音。现全屏隐藏期间完全忽略鼠标事件，且屏蔽穿透切换请求
- **多显示器误判全屏**：任务栏仅主屏显示时，副屏 workArea==size 会被永久误判为全屏导致挂件永久隐藏。现只检测挂件所在显示器
- **托盘图标残留**：退出时销毁托盘图标
- **打包瘦身**：files 移除 `node_modules/**`（应用无运行时依赖，此前的包体积白胖数十 MB）

**✨ 新增**

- `npm run build:green` 一键产出绿色包 zip（win-unpacked + 相对路径启动器 + 文件夹内快捷方式生成器），解压后双击 `run-widget.cmd` 即可运行，无需安装
- 自定义应用图标：取 `yoimiya.gif` 静态帧生成 `build/icon.ico`，exe / 窗口 / 快捷方式不再是默认 Electron 图标
- 打包脚本内置 npmmirror 镜像回退，GitHub 不可达时也能正常构建
- 压缩改用 .NET ZipFile，规避 Compress-Archive 在部分环境下的路径解析问题

### v1.0.0

- 首个版本：透明无边框置顶窗口、5 条随机台词 + 语音、托盘 + 右键菜单、全屏避让、JS 拖拽 + 点击穿透、electron-builder 打包

---

## 📄 License

MIT
