# 🎆 宵宫桌面悬浮挂件 — Yoimiya Desktop Widget

> 原神角色「宵宫」的 Q 版像素风桌面宠物，基于 Electron 构建。  
> 透明悬浮 · 语音互动 · 全屏避让 · 拖拽移动 · 绿色免安装

<p align="center">
  <!-- 替换为你自己的截图 -->
  <img src="screenshot.png" alt="宵宫挂件截图" width="500">
</p>

---

## ✨ 功能特性

| 功能 | 说明 |
|---|---|
| 🪟 **透明悬浮** | 无边框、背景完全透明，只显示角色本体 |
| 🎤 **语音互动** | 点击角色随机播放 5 条元气台词 |
| 💬 **漫画气泡** | 自适应文字长度，弹跳动画显隐 |
| 🖱️ **自由拖拽** | 按住角色任意位置拖动到屏幕任何角落 |
| 🎮 **全屏避让** | 检测到全屏应用自动降级，退出游戏自动恢复 |
| 🔔 **系统托盘** | 隐藏后托盘图标一键恢复 |
| ⚙️ **右键菜单** | 音效开关 / 全屏避让 / 置顶切换 / 开发者工具 |
| ⚡ **点击穿透** | 透明区域不阻挡桌面图标和窗口 |
| 📦 **绿色免安装** | 打包后文件夹双击即运行 |

---

## 📁 项目结构

```
yoimiya-desktop-widget/
├── main.js                 ← Electron 主进程（窗口/托盘/菜单/全屏检测/IPC）
├── preload.js              ← contextBridge 安全桥接
├── yoimiya-widget.html     ← 渲染进程（CSS 动画 + JS 交互 + 音频）
├── package.json            ← 项目配置 + 打包脚本
├── yoimiya.gif             ← 宵宫角色 GIF（可替换）
├── tray-icon.png           ← 系统托盘图标
├── audio/                  ← 语音文件夹
│   ├── voice1.MP3          ← 台词 1
│   ├── voice2.MP3          ← 台词 2
│   ├── voice3.MP3          ← 台词 3
│   ├── voice4.MP3          ← 台词 4
│   └── voice5.MP3          ← 台词 5
├── .gitignore
├── package-lock.json
└── README.md
```

> ⚠️ `node_modules/` 和 `dist/` 不在仓库中，前者通过 `npm install` 生成，后者通过 `npm run build:dir` 生成。

---

## 🚀 快速开始

### 环境要求

- [Node.js](https://nodejs.org/) ≥ 18
- npm（随 Node.js 一起安装）
- Windows 10/11（macOS 也可运行，部分穿透功能需微调）

### 安装与启动

```bash
# 1. 克隆仓库
git clone https://github.com/你的用户名/yoimiya-desktop-widget.git
cd yoimiya-desktop-widget

# 2. 安装依赖（仅首次）
npm install

# 3. 启动挂件
npm start

# ⚠️ 如果从 VSCode 内置终端启动失败，请用 Windows 命令提示符或 PowerShell
#    原因：VSCode 终端设置了 ELECTRON_RUN_AS_NODE=1
#    或在 VSCode 中使用：npm run start:win
```

### 操作说明

| 操作 | 效果 |
|---|---|
| **左键点击角色** | 随机播放语音 + 弹出对话气泡 |
| **按住拖动** | 移动挂件到任意位置 |
| **右键** | 弹出设置菜单 |
| **点击托盘图标** | 恢复被隐藏的窗口 |

---

## 🔧 自定义台词 & 语音

### 修改台词

编辑 `yoimiya-widget.html`，找到 `MESSAGES` 数组：

```js
const MESSAGES = [
  '你的台词 1',   // 索引 0 → audio/voice1.MP3
  '你的台词 2',   // 索引 1 → audio/voice2.MP3
  // ...添加更多...
];
```

### 替换语音

将你的 MP3 文件放入 `audio/` 文件夹，按 `voice1.MP3`、`voice2.MP3`... 命名。文件名**必须大写 `.MP3`**（Electron 打包后路径区分大小写）。

### 替换角色图片

将你的 GIF 文件命名为 `yoimiya.gif`，替换项目根目录下的原文件。

---

## 📦 打包为绿色免安装版

```bash
# 使用国内镜像加速（国内用户必须）
ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/" npm run build:dir

# 产物在 dist/win-unpacked/
# 双击 YoimiyaWidget.exe 即可运行
```

---

## 🏗️ 技术架构

```
┌─ main.js (主进程) ───────────────────────────┐
│  BrowserWindow  透明/无边框/置顶               │
│  Tray           系统托盘                      │
│  Menu           右键上下文菜单                  │
│  screen         全屏检测（workArea 启发式）      │
│  setIgnoreMouseEvents  点击穿透动态切换         │
│  IPC            与渲染进程双向通信               │
└──────────────┬───────────────────────────────┘
               │ contextBridge (preload.js)
┌──────────────▼───────────────────────────────┐
│  yoimiya-widget.html (渲染进程)                │
│  ├─ CSS: @keyframes float 浮游呼吸动画         │
│  ├─ CSS: @keyframes bubbleBounceIn 气泡弹跳    │
│  ├─ JS:  台词随机 + 音频播放 + 引用池防 GC     │
│  ├─ JS:  mousedown→拖拽（增量累加 + rAF 节流） │
│  └─ JS:  mouseenter/leave→IPC 点击穿透切换     │
└──────────────────────────────────────────────┘
```

---

## ❓ FAQ

### 为什么 git push 后没有 `node_modules` 和 `dist` 文件夹？

| 文件夹 | 作用 | 为什么不提交 |
|---|---|---|
| `node_modules/` | 存放 npm 安装的依赖包（Electron、electron-builder 等），约 ~250MB | 体积巨大；任何人 `npm install` 即可根据 `package.json` 自动下载一模一样的依赖 |
| `dist/` | `npm run build:dir` 的打包产物，包含 Electron 运行时和你的代码 | 约 ~250MB；可随时用打包命令重新生成 |

**类比**：`package.json` 是菜谱，`node_modules` 是按菜谱买回来的食材。你只需要分享菜谱，别人自己买菜就行。

### 别人克隆后怎么运行？

```bash
git clone <仓库地址>
cd yoimiya-desktop-widget
npm install        # 根据 package.json 自动下载 node_modules
npm start          # 启动
```

### 音频播放不了？

1. 右键菜单 → 勾选「🔊 开启音效」
2. 确认 `audio/` 文件夹中有 `voice1.MP3` ~ `voice5.MP3`
3. 文件名后缀**必须大写 `.MP3`**（打包后 asar 内路径区分大小写）

---

## 📄 License

MIT
