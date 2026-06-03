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
| 🖱️ **自由拖拽** | 按住角色任意位置拖动到屏幕任何角落 |
| 🎮 **全屏避让** | 检测到全屏应用自动降级透明，退出游戏自动恢复 |
| 🔔 **系统托盘** | 隐藏后托盘图标一键恢复 |
| ⚙️ **右键菜单** | 音效开关 / 全屏避让 / 置顶切换 / 开发者工具 |
| ⚡ **点击穿透** | 透明区域不阻挡桌面图标和其他窗口 |
| 📦 **绿色免安装** | 打包后文件夹双击即运行 |

---

## 📁 项目结构

```
yoimiya-desktop-widget/
├── main.js                    ← Electron 主进程（窗口 / 托盘 / 右键菜单 / 全屏检测 / IPC）
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
git clone https://github.com/你的用户名/yoimiya-desktop-widget.git
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
| **按住角色拖动** | 移动挂件到任意位置 |
| **右键** | 弹出设置菜单（音效 / 全屏 / 置顶 / 重载 / 退出） |
| **点击托盘图标** | 恢复被隐藏的窗口 |

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

编辑 `yoimiya-widget.html`，找到 `MESSAGES` 数组（约第 585 行）：

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

---

## 📦 打包

### 分发给其他人

将 `dist/win-unpacked/` 整个文件夹压缩为 zip 或 rar，发给对方解压即可使用，无需安装任何依赖。

---

## 🏗️ 技术架构

```
┌─ main.js (主进程) ───────────────────────────┐
│  BrowserWindow  透明 / 无边框 / 置顶           │
│  Tray           系统托盘                      │
│  Menu           右键上下文菜单                  │
│  screen         全屏检测（workArea 启发式）      │
│  setIgnoreMouseEvents  点击穿透（事件驱动）      │
│  IPC            与渲染进程双向通信               │
└──────────────┬───────────────────────────────┘
               │ contextBridge (preload.js)
┌──────────────▼───────────────────────────────┐
│  yoimiya-widget.html（渲染进程）                │
│  ├─ CSS  @keyframes float  浮游呼吸动画        │
│  ├─ CSS  @keyframes bubbleBounceIn  气泡弹跳   │
│  ├─ CSS  pointer-events  透明区域穿透          │
│  ├─ JS   台词随机不重复 + 音频引用池防 GC       │
│  ├─ JS   mousedown → 拖拽（增量累加 + rAF）    │
│  └─ JS   mouseenter/leave → IPC 穿透切换      │
└──────────────────────────────────────────────┘
```

### npm 脚本

| 命令 | 用途 |
|---|---|
| `npm start` | 启动开发版 |
| `npm run start:win` | 启动（强制清除 ELECTRON_RUN_AS_NODE） |
| `npm run dev` | 启动 + 开发者工具 |
| `npm run build:dir` | 打包为绿色免安装文件夹 |
| `npm run build` | 打包为单文件 exe（需 GitHub 连通） |

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

---

## 📄 License

MIT
