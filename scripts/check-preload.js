/**
 * preload 回归检查 —— 防止「沙箱 preload 里 require 本地模块导致挂件整体失效」再次发生
 * ============================================================
 * 用与 main.js 相同的沙箱配置加载真实页面 + 真实 preload，断言：
 *   ① preload 无报错
 *   ② window.electronAPI 已暴露（含关键方法）
 *   ③ <html> 带上了 electron-mode 类（透明桌面模式生效的前提）
 *   ④ 角色立绘真实加载成功（naturalWidth > 0）
 *
 * 用法:  npm run test:preload      退出码 0 = 通过，1 = 失败
 */

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { registerCharacterIpc, loadCharacterPack } = require('../character');

delete process.env.ELECTRON_RUN_AS_NODE;
const ROOT = path.join(__dirname, '..');

const failures = [];
const check = (ok, label, detail) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ' — ' + detail : ''}`);
  if (!ok) failures.push(label);
};

app.disableHardwareAcceleration();

app.whenReady().then(async () => {
  // 与 main.js 一致：创建窗口前注册 preload 要用的同步 IPC
  registerCharacterIpc(ipcMain, loadCharacterPack());

  const win = new BrowserWindow({
    width: 240,
    height: 300,
    show: false,
    frame: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(ROOT, 'preload.js'),
    },
  });

  const preloadErrors = [];
  win.webContents.on('preload-error', (_e, preloadPath, err) => {
    preloadErrors.push(`${path.basename(preloadPath)}: ${err.message}`);
  });

  try {
    await win.loadFile(path.join(ROOT, 'yoimiya-widget.html'));
  } catch (err) {
    failures.push(`页面加载失败: ${err.message}`);
  }

  // 等欢迎气泡与图片加载
  await new Promise((r) => setTimeout(r, 2500));

  const info = await win.webContents.executeJavaScript(`(async () => {
    const api = window.electronAPI;
    let settings = null;
    try { settings = api ? await api.getSettings() : null; } catch (_) {}
    const img = document.querySelector('.character-inner img');
    return {
      hasAPI: typeof api !== 'undefined',
      apiKeys: api ? Object.keys(api).sort() : [],
      electronMode: document.documentElement.classList.contains('electron-mode'),
      bodyElectronMode: document.body.classList.contains('electron-mode'),
      spriteLoaded: Boolean(img && img.complete && img.naturalWidth > 0),
      spriteSrc: img ? img.getAttribute('src') : null,
      characterName: api && api.getCharacter ? (api.getCharacter() || {}).name : null,
      bubbleShown: document.getElementById('speechBubble').classList.contains('show'),
    };
  })()`);

  check(preloadErrors.length === 0, 'preload 无加载错误', preloadErrors.join('; '));
  check(info.hasAPI, 'window.electronAPI 已暴露');
  const required = [
    'getSettings',
    'getCharacter',
    'dragWindowStart',
    'dragWindowMove',
    'dragWindowEnd',
    'notifyMouseEnter',
    'notifyMouseLeave',
    'onLlmSentence',
    'llmChat',
    'setVolume',
  ];
  const missing = required.filter((k) => !info.apiKeys.includes(k));
  check(
    missing.length === 0,
    `electronAPI 含全部 ${required.length} 个关键方法`,
    missing.length ? '缺少 ' + missing.join(', ') : ''
  );
  check(info.electronMode && info.bodyElectronMode, '透明桌面模式类已生效（electron-mode）');
  check(info.spriteLoaded, '角色立绘加载成功', info.spriteSrc);
  check(info.characterName === 'yoimiya', '角色包经 IPC 下发成功', String(info.characterName));
  check(info.bubbleShown, '欢迎气泡已显示');

  console.log(failures.length ? `\n✖ ${failures.length} 项失败` : '\n✔ preload 回归检查全部通过');
  app.exit(failures.length ? 1 : 0);
});
