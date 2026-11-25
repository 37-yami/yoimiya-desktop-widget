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
const { registerCharacterIpc, buildCharacterPack } = require('../character');
const { WIDGET_WIDTH, WIDGET_HEIGHT } = require('../config');

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
  registerCharacterIpc(ipcMain, buildCharacterPack());

  const win = new BrowserWindow({
    width: WIDGET_WIDTH,
    height: WIDGET_HEIGHT,
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

  // 第一时间取初始画面（欢迎气泡 1.2s 后才会触发情绪联动）
  const initial = await win.webContents.executeJavaScript(`(() => {
    const el = document.querySelector('.sprite-layer.is-active');
    return el ? el.getAttribute('src') : null;
  })()`);

  // 等欢迎气泡与图片加载
  await new Promise((r) => setTimeout(r, 2500));

  const info = await win.webContents.executeJavaScript(`(async () => {
    const api = window.electronAPI;
    let settings = null;
    try { settings = api ? await api.getSettings() : null; } catch (_) {}
    const img = document.querySelector('.character-inner img');
    const state = {
      hasAPI: typeof api !== 'undefined',
      apiKeys: api ? Object.keys(api).sort() : [],
      electronMode: document.documentElement.classList.contains('electron-mode'),
      bodyElectronMode: document.body.classList.contains('electron-mode'),
      spriteLoaded: Boolean(img && img.complete && img.naturalWidth > 0),
      spriteSrc: img ? img.getAttribute('src') : null,
      characterName: api && api.getCharacter ? (api.getCharacter() || {}).name : null,
      bubbleShown: document.getElementById('speechBubble').classList.contains('show'),
    };

    // ---- 情绪立绘集：逐张加载 + 实际切换一次 ----
    const sprites = api && api.getEmotionSprites ? api.getEmotionSprites() : null;
    state.hasEmotionSprites = Boolean(sprites);
    state.spriteCount = sprites ? Object.keys(sprites).length : 0;
    state.spriteFailed = [];
    if (sprites) {
      await Promise.all(Object.entries(sprites).map(([pose, src]) => new Promise((done) => {
        const im = new Image();
        im.onload = () => { if (!(im.naturalWidth > 0)) state.spriteFailed.push(pose); done(); };
        im.onerror = () => { state.spriteFailed.push(pose); done(); };
        im.src = src;
      })));
    }
    const activeSrc = () => {
      const el = document.querySelector('.sprite-layer.is-active');
      return el ? el.getAttribute('src') : null;
    };
    state.afterWelcome = activeSrc();
    if (window.__widget && sprites) {
      window.__widget.setPose('excited');
      await new Promise((r) => setTimeout(r, 500));
      state.switched = { pose: window.__widget.getPose(), active: activeSrc() };
      window.__widget.setPose('idle');
      await new Promise((r) => setTimeout(r, 400));
    }
    return state;
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
    'getEmotionSprites',
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

  // ---- 情绪立绘集（manifest.emotionSprites，可选增强）----
  // 已安装 → 必须六张齐全、可加载、可切换；未安装 → 回落单张 sprite，同样必须能显示
  if (info.hasEmotionSprites) {
    check(info.spriteCount === 6, `情绪立绘集经 IPC 下发（${info.spriteCount}/6 个姿势）`);
    check(info.spriteFailed.length === 0, '六张情绪立绘全部加载成功', info.spriteFailed.join(','));
    check((initial || '').endsWith('/emotions/idle.webp'), '启动时显示待机立绘', initial);
    check(
      (info.afterWelcome || '').endsWith('/emotions/happy.webp'),
      '欢迎气泡触发情绪联动（待机 → happy）',
      info.afterWelcome
    );
    const sw = info.switched || {};
    check(
      sw.pose === 'excited' && (sw.active || '').endsWith('/emotions/excited.webp'),
      '情绪切换：切到 excited 后显示层完成交接',
      `${sw.pose} → ${sw.active}`
    );
  } else {
    console.log('INFO  情绪立绘集未安装，回落单张 sprite（manifest.sprite）');
    check((initial || '').endsWith(String(info.spriteSrc)), '回落：启动时显示单张 sprite', initial);
  }

  console.log(failures.length ? `\n✖ ${failures.length} 项失败` : '\n✔ preload 回归检查全部通过');
  app.exit(failures.length ? 1 : 0);
});
