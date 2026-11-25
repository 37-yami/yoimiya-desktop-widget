/**
 * 角色包加载（主进程）
 * ============================================================
 * 为什么单独成模块：
 *   Electron 20+ 渲染进程默认沙箱化，preload 里只能 require('electron')，
 *   不能加载本地模块（require('./config') 会直接崩）。
 *   因此角色包数据由主进程读取，经同步 IPC 交给 preload。
 */

const fs = require('fs');
const path = require('path');
const { MANIFEST_PATH, CHARACTER_DIR } = require('./config');

/** 渲染层拼 URL 用的相对资源根路径（强制正斜杠） */
const CHARACTER_DIR_NAME = path.relative(__dirname, CHARACTER_DIR).split(path.sep).join('/');

/**
 * 读取角色包 manifest。
 * @param {string} manifestPath
 * @returns {{manifest: object|null, dirName: string}} manifest 读不到时为 null（不抛错）
 */
function loadCharacterPack(manifestPath = MANIFEST_PATH) {
  let manifest = null;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch (err) {
    console.warn('⚠️ 角色包 manifest 加载失败，渲染层将使用内置兜底配置:', err.message);
  }
  return { manifest, dirName: CHARACTER_DIR_NAME };
}

/**
 * 注册 preload 启动时使用的同步 IPC 通道。
 * @param {Electron.IpcMain} ipcMain
 * @param {{manifest: object|null, dirName: string}} pack
 */
function registerCharacterIpc(ipcMain, pack) {
  ipcMain.on('get-character-pack', (event) => {
    event.returnValue = pack;
  });
}

/** 情绪立绘集必须齐全的姿势（idle = 待机，其余与 llm.js EMOTIONS 对应） */
const POSES = ['idle', 'happy', 'excited', 'shy', 'sad', 'sleepy'];

/**
 * 解析并校验情绪立绘集（manifest.emotionSprites）。
 * 规则：六个姿势必须全部存在且文件都在，否则整组返回 null
 *（回落到单张 sprite）——半套立绘会导致切换时跳图，宁可不用。
 * @param {{manifest: object|null}} pack
 * @param {string} root 项目根目录（sprite 路径相对它）
 * @returns {Record<string, string>|null} 情绪 → 相对路径
 */
function resolveEmotionSprites(pack, root = __dirname) {
  const sprites = pack && pack.manifest && pack.manifest.emotionSprites;
  if (!sprites || typeof sprites !== 'object') return null;
  const out = {};
  for (const pose of POSES) {
    const rel = sprites[pose];
    if (typeof rel !== 'string' || !rel) return null;
    if (!fs.existsSync(path.join(root, rel))) return null;
    out[pose] = rel;
  }
  return out;
}

/**
 * 构建下发给渲染层的完整角色包：manifest + 目录名 + 已校验的情绪立绘集。
 * @param {string} manifestPath
 * @returns {{manifest: object|null, dirName: string, emotionSprites: Record<string,string>|null}}
 */
function buildCharacterPack(manifestPath = MANIFEST_PATH) {
  const pack = loadCharacterPack(manifestPath);
  pack.emotionSprites = resolveEmotionSprites(pack);
  return pack;
}

module.exports = {
  CHARACTER_DIR_NAME,
  POSES,
  loadCharacterPack,
  registerCharacterIpc,
  resolveEmotionSprites,
  buildCharacterPack,
};
