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
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // ---- 环境标识 ----
  isElectron: true,

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

  // ---- 窗口拖动（主进程绝对坐标 + rAF 节流） ----
  // start：主进程记录光标起点+窗口起点
  // move ：主进程用 getCursorScreenPoint() 计算增量并移动窗口
  // end  ：拖拽结束，清理主进程状态
  dragWindowStart: () => ipcRenderer.send('drag-start'),
  dragWindowMove:  () => ipcRenderer.send('drag-move'),
  dragWindowEnd:   () => ipcRenderer.send('drag-end'),

  // ---- 鼠标穿透切换（事件驱动，无延迟；全屏隐藏期间主进程会忽略） ----
  notifyMouseEnter: () => ipcRenderer.send('mouse-enter-widget'),
  notifyMouseLeave: () => ipcRenderer.send('mouse-leave-widget'),
});
