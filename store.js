/**
 * 设置持久化 —— electron-store 包装
 * ============================================================
 * 保存：soundEnabled / alwaysOnTop / autoHideOnFullscreen /
 *       volume / windowPosition
 *
 * 设计要点：
 *   - 主进程 app ready 后调用 initStore() 创建真实存储
 *   - 单元测试（无 Electron 环境）使用 createMemoryStore() 兜底
 *   - electron-store 锁定 v8（最后一个 CommonJS 主版本，9+ 为纯 ESM）
 */

let ElectronStore;
try {
  // 在纯 Node（单元测试）环境 require('electron') 只会得到路径字符串，
  // 真正初始化放到 initStore() 里由主进程调用
  ElectronStore = null;
} catch (_) {
  ElectronStore = null;
}

const DEFAULTS = Object.freeze({
  soundEnabled: true,          // 音效开关
  alwaysOnTop: true,           // 始终置顶
  autoHideOnFullscreen: true,  // 全屏应用时自动隐藏
  volume: 100,                 // 音量 0-100
  windowPosition: null,        // [x, y]（null = 使用默认右下角）
});

let storeInstance = null;

/** 返回默认设置（冻结副本） */
function defaults() {
  return { ...DEFAULTS };
}

/** 音量清洗：任意输入 → 0-100 整数，非法值回落 100 */
function sanitizeVolume(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULTS.volume;
  return Math.min(100, Math.max(0, Math.round(n)));
}

/** 内存兜底存储（单元测试 / electron-store 不可用时） */
function createMemoryStore() {
  let data = { ...DEFAULTS };
  return {
    get(key) {
      return key === undefined ? { ...data } : data[key];
    },
    set(key, value) {
      data[key] = value;
      return this;
    },
  };
}

/**
 * 初始化真实持久化存储（仅主进程调用）。
 * electron-store 加载失败时自动退回内存实现，应用照常运行。
 */
function initStore() {
  if (storeInstance) return storeInstance;
  try {
    const ElectronStoreCtor = require('electron-store');
    storeInstance = new ElectronStoreCtor({
      defaults: { ...DEFAULTS },
      name: 'widget-settings',
    });
  } catch (err) {
    console.warn('⚠️ electron-store 初始化失败，退回内存设置:', err.message);
    storeInstance = createMemoryStore();
  }
  return storeInstance;
}

/** 读取一项设置（未初始化时返回默认值） */
function getSetting(key) {
  const s = storeInstance || createMemoryStore();
  const value = s.get(key);
  return value === undefined ? DEFAULTS[key] : value;
}

/** 写入一项设置（音量自动钳制） */
function setSetting(key, value) {
  const s = storeInstance || createMemoryStore();
  const safe = key === 'volume' ? sanitizeVolume(value) : value;
  s.set(key, safe);
}

module.exports = {
  defaults,
  sanitizeVolume,
  createMemoryStore,
  initStore,
  getSetting,
  setSetting,
};
