/**
 * 宵宫桌面挂件 — Preload 脚本
 *
 * 通过 contextBridge 安全地向渲染进程暴露 Electron 能力：
 *   ① isElectron       — 标识当前运行在桌面模式
 *   ② onToggleSound()  — 监听主进程的音效开关切换命令
 *   ③ onWindowHidden() — 窗口被隐藏通知
 *   ④ onWindowShown()  — 窗口被恢复通知
 *   ⑤ getSoundState()  — 查询初始音效状态
 *   ⑥ dragWindow*()    — 窗口拖拽（start/move/end 三段式）
 *   ⑦ notifyMouse*()   — 鼠标穿透状态切换
 *
 * ⚠️ 沙箱约束：渲染进程默认沙箱化（Electron 20+），本文件只能
 *    require('electron')。任何本地模块（./config 等）或 Node 内置模块
 *    （path/fs）都不能在这里 require —— 否则 preload 直接崩溃，
 *    window.electronAPI 不存在，整个挂件的桌面模式全部失效。
 *    需要主进程数据时走 IPC（见 character.js）。
 */

const { contextBridge, ipcRenderer } = require('electron');

// 角色包由主进程读取后经同步 IPC 下发（换角色 = 换 characters/<name> 目录）
let characterPack = null;
try {
  characterPack = ipcRenderer.sendSync('get-character-pack');
} catch (err) {
  console.warn('⚠️ 角色包获取失败，渲染层将使用内置兜底配置:', err.message);
}

// 初始形象模式同样在 preload 阶段同步取得：渲染层首帧就要显示对的立绘
let initialSpriteMode = 'original';
try {
  initialSpriteMode = ipcRenderer.sendSync('get-sprite-mode');
} catch (err) {
  console.warn('⚠️ 形象模式获取失败，按原形态启动:', err.message);
}

contextBridge.exposeInMainWorld('electronAPI', {
  // ---- 环境标识 ----
  isElectron: true,

  // ---- 角色包（manifest.json 内容 + 资源根路径） ----
  getCharacter: () => (characterPack && characterPack.manifest) || null,
  characterDirName: (characterPack && characterPack.dirName) || 'characters/yoimiya',
  // 情绪立绘集（主进程已校验齐全；不完整时为 null → 渲染层回落单张 sprite）
  getEmotionSprites: () => (characterPack && characterPack.emotionSprites) || null,

  // ---- 音效开关（主进程 → 渲染进程） ----
  // callback 接收 (enabled: boolean)
  onToggleSound: (callback) => {
    ipcRenderer.on('sound-toggled', (_event, enabled) => callback(enabled));
  },

  // ---- 窗口隐藏/恢复通知 ----
  onWindowHidden: (callback) => {
    ipcRenderer.on('window-hidden', () => callback());
  },
  onWindowShown: (callback) => {
    ipcRenderer.on('window-shown', () => callback());
  },

  // ---- 查询初始状态（渲染进程主动调用） ----
  getSoundState: () => ipcRenderer.invoke('get-sound-state'),
  getSettings: () => ipcRenderer.invoke('get-settings'),

  // ---- LLM 对话（P1：DeepSeek 流式） ----
  llmChat: (userText) => ipcRenderer.invoke('llm-chat', userText),
  onLlmSentence: (callback) => {
    ipcRenderer.on('llm-sentence', (_event, sentence) => callback(sentence));
  },
  onAiChatToggled: (callback) => {
    ipcRenderer.on('ai-chat-toggled', (_event, enabled) => callback(enabled));
  },

  // ---- 音量滑条（主进程菜单打开，渲染层交互，主进程持久化） ----
  onOpenVolumePanel: (callback) => {
    ipcRenderer.on('open-volume-panel', () => callback());
  },
  setVolume: (value) => ipcRenderer.send('set-volume', value),

  // ---- 形象切换（右键菜单 ↔ 渲染层共用主进程同一个入口） ----
  getSpriteMode: () => initialSpriteMode,
  setSpriteMode: (mode) => ipcRenderer.invoke('set-sprite-mode', mode),
  onSpriteModeChanged: (callback) => {
    ipcRenderer.on('sprite-mode-changed', (_event, mode) => callback(mode));
  },

  // ---- TTS 音频下发（P1-A1：GPT-SoVITS 合成的 wav Buffer） ----
  onTtsAudio: (callback) => {
    ipcRenderer.on('tts-audio', (_event, wavBuffer) => callback(wavBuffer));
  },

  // ---- 主动搭话触发（P1-D：系统空闲检测在主进程） ----
  onProactiveTrigger: (callback) => {
    ipcRenderer.on('proactive-trigger', (_event, info) => callback(info));
  },

  // ---- 窗口拖动（主进程绝对坐标 + rAF 节流） ----
  // start：主进程记录光标起点+窗口起点
  // move ：主进程用 getCursorScreenPoint() 计算增量并移动窗口
  // end  ：拖拽结束，清理主进程状态
  dragWindowStart: () => ipcRenderer.send('drag-start'),
  dragWindowMove: () => ipcRenderer.send('drag-move'),
  dragWindowEnd: () => ipcRenderer.send('drag-end'),

  // ---- 鼠标穿透切换（事件驱动，无延迟；全屏隐藏期间主进程会忽略） ----
  notifyMouseEnter: () => ipcRenderer.send('mouse-enter-widget'),
  notifyMouseLeave: () => ipcRenderer.send('mouse-leave-widget'),
});
