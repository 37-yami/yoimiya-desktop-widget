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
├── scripts/                   ← 脚本（打包 / 启动器 / 快捷方式生成）
│   ├── pack-green.ps1         ← 一键构建绿色包（win-unpacked + 启动器 → zip，npm run build:green）
│   ├── run-widget.cmd         ← 相对路径启动器（绿色包内双击即运行）
│   ├── create-shortcut.cmd    ← 快捷方式生成器（绿色包内生成指向 exe 的「宵宫挂件.lnk」）
│   └── create-source-shortcut.cmd ← 快捷方式生成器（项目根目录生成指向 electron.exe 的源码启动 lnk）
├── build/
│   └── icon.ico               ← 应用图标（取自 yoimiya.gif 静态帧，可自行替换）
├── .gitignore
├── CHANGELOG.md               ← 更新日志
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

### 创建快捷方式（源码启动，免打包）

`npm install` 完成后，双击运行一次 `scripts\create-source-shortcut.cmd`：

- 在**项目根目录**生成快捷方式 **「宵宫挂件.lnk」**
- 双击它即可启动挂件——直接调用 `electron.exe`，**无需打包、无控制台窗口闪烁、不依赖任何 exe 下载**
- 删除 `node_modules` 后快捷方式失效，重新 `npm install` + 再跑一次脚本即可

### 免安装使用（普通用户推荐）

从 [Releases](https://github.com/37-yami/yoimiya-desktop-widget/releases) 下载 `YoimiyaWidget-green-vX.Y.Z.zip`，**解压到任意文件夹**后，两种启动方式任选：

| 方式 | 操作 |
|---|---|
| 直接启动 | 双击文件夹内的 `run-widget.cmd` → 挂件立即出现（相对路径，文件夹搬到哪都能用） |
| 快捷方式启动（推荐） | 见下方说明 |

### 如何用快捷方式启动

1. 解压绿色包后，双击运行一次 `create-shortcut.cmd`
2. 脚本会在**同一文件夹内**生成快捷方式 **「宵宫挂件.lnk」**（带应用图标，指向本文件夹内的 `win-unpacked\YoimiyaWidget.exe`）
3. 之后**双击「宵宫挂件.lnk」**即可启动挂件 ✅

> 💡 注意事项：
> - 整个文件夹移动位置后，快捷方式会失效（.lnk 记录绝对路径）——重新运行一次 `create-shortcut.cmd` 即可刷新
> - 为什么不预置好 .lnk？Windows 快捷方式记录的是绝对路径，压缩包解压到别人电脑的路径不可预知，预置必定失效，故采用「相对路径启动器 + 用户侧快捷方式生成脚本」的组合

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

将新的 GIF/PNG 命名为 `yoimiya.gif`，替换项目根目录下的原文件即可（建议使用自带透明背景的素材，观感最佳）。

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

## 📄 License

MIT
