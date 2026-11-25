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

module.exports = { CHARACTER_DIR_NAME, loadCharacterPack, registerCharacterIpc };
