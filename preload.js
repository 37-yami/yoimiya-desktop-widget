/**
 * 宵宫桌面挂件 — Preload 脚本
 *
 * 通过 contextBridge 安全地向渲染进程暴露 Electron 能力：
 *   ① isElectron       — 标识当前运行在桌面模式
 *   ② onToggleSound()  — 监听主进程的音效开关切换命令
 *   ③ onWindowHidden() — 窗口被隐藏通知
 *   ④ onWindowShown()  — 窗口被恢复通知
 *   ⑤ getSoundState()  — 查询初始音效状态
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
  getAutoHideState: () => ipcRenderer.invoke('get-auto-hide-state'),

  // ---- 窗口拖动（增量累加 + rAF 批量发送） ----
  moveWindow: (dx, dy) => ipcRenderer.send('move-window', { dx, dy }),

  // ---- 鼠标穿透切换（事件驱动，无延迟） ----
  notifyMouseEnter: () => ipcRenderer.send('mouse-enter-widget'),
  notifyMouseLeave: () => ipcRenderer.send('mouse-leave-widget'),
});
