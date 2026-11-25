# 更新日志 — Changelog

## 未发布（main 分支）— 工程化基线 + AI 试点

**🏗️ 工程与资源（P0）**

- **角色包架构**：台词/语音迁移到 `characters/yoimiya/`（manifest.json 驱动），换角色零改码；音频统一小写 `.mp3`（asar 大小写兼容）；立绘路径同样由 manifest 的 `sprite` 指定
- **抠图管线（工具）**：`scripts/optimize_sprite.py` 支持 GIF 动图与单张立绘两种模式（rembg 多模型 + 色度键控兜底）。自动抠图在原 GIF 上效果不达标（u2net 丢呆毛发饰、isnet 空白误抠），根目录 `yoimiya.gif` 原图保留（未被应用引用），背景由使用者自行处理
- **形象**：默认原形态（根目录 `yoimiya.gif`）；右键菜单「🎭 形象切换」可切到 AI 形态
  （`characters/yoimiya/emotions/` 六张情绪立绘），选择持久化，重启首帧即为所选形态
- **设置持久化**：electron-store 保存位置/音效/置顶/音量/AI 开关，重启全恢复（位置恢复自动钳制回工作区）
- **调试入口收敛**：开发者工具/重新加载仅开发模式注入；`start:win` 环境变量残留修复
- **工程化**：MIT LICENSE、ESLint + Prettier + jsconfig、GitHub Actions CI（lint + test + build:dir，tag 自动发布并附 SHA256）、`node --test` 单元测试 23 例
- **体验**：拖拽松手惯性滑行 + 边界回弹；idle 状态机（长时间未交互/整点/深夜台词）；全屏检测增加事件触发即时检查；托盘 16/32 双尺寸图标；右键菜单 0–100 音量滑条

**🤖 AI 试点（P1，全部可降级）**

- **LLM 对话**：DeepSeek 兼容客户端（SSE 流式、`{text,emotion,motion}` JSON 三元组容错解析、流式 text 字段切句），思考中气泡 → 逐句显示；连续失败自动停用并回落本地台词（`.env.local` 配置 key）
- **情绪-动作联动**：emotion 驱动气泡 5 套配色（CSS 变量，尾巴自动跟随），motion 驱动 wave/jump/laugh 关键帧
- **情绪立绘集**：同一角色 6 个姿势（待机 + happy/excited/shy/sad/sleepy）随对话切换——双层交叉淡入、切换弹跳、持续呼吸、各情绪待机节奏、头顶情绪小粒子（⭐🎆💕💧💤）、气泡消失后自动回待机；六张共用同一取景框保证切换不跳位；角色框放大到 160px（窗口高度 300 → 350）
- **本地台词自带情绪**：`manifest.json` 新增 `lineEmotions` / `lineMotions`，点击时按台词切换情绪，并优先挑与当前情绪不同的台词（每次点击都有可见变化）；自言自语规则表每条带情绪，五种情绪在不接 AI 对话时都能触发
- **主动搭话**：主进程 `powerMonitor` 检测系统空闲 ≥15 分钟，LLM/本地规则表双路径主动开口
- **TTS 客户端**：GPT-SoVITS api_v2 封装 + wav 播放 + WebAudio 能量口型同步 PoC（服务不在线自动回落本地 MP3）
- **Live2D PoC**：pixi-live2d-display + Cubism 4 示例模型验证页（`docs/poc/`）
- 所有试点的报告与失败原因记录于 `docs/poc/`（含 DeepSeek 第二个 key 401 分析）

## v1.1.0

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
- 源码启动快捷方式：`scripts\create-source-shortcut.cmd` 在项目根目录生成指向 `electron.exe` 的「宵宫挂件.lnk」，git clone + `npm install` 后双击即用，无需下载任何 exe
- 自定义应用图标：取 `yoimiya.gif` 静态帧生成 `build/icon.ico`，exe / 窗口 / 快捷方式不再是默认 Electron 图标
- 打包脚本内置 npmmirror 镜像回退，GitHub 不可达时也能正常构建
- 压缩改用 .NET ZipFile，规避 Compress-Archive 在部分环境下的路径解析问题

## v1.0.0

- 首个版本：透明无边框置顶窗口、5 条随机台词 + 语音、托盘 + 右键菜单、全屏避让、JS 拖拽 + 点击穿透、electron-builder 打包
