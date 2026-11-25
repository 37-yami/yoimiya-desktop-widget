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
  ipcMain.on('get-sprite-mode', (event) => {
    event.returnValue = 'original'; // 本检查不接主进程的设置存储，固定按默认形态启动
  });

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

    // ---- 形态：原形态（默认）/ AI 形态（情绪立绘集）----
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
    state.modeAtStart = window.__widget ? window.__widget.getMode() : null;
    if (window.__widget && sprites) {
      // 切到 AI 形态：从待机姿势开始
      window.__widget.applySpriteMode('ai');
      await new Promise((r) => setTimeout(r, 450));
      state.aiIdle = { mode: window.__widget.getMode(), active: activeSrc() };
      // AI 形态下连续点击（本地台词）：情绪应每次都换一种，且画面与情绪一致
      state.localClicks = [];
      for (let k = 0; k < 6; k++) {
        window.__widget.showBubble();
        await new Promise((r) => setTimeout(r, 260));
        state.localClicks.push({ emo: window.__widget.getEmotion(), active: activeSrc() });
      }
      // AI 形态下随情绪换图
      window.__widget.applyEmotion('excited', null);
      await new Promise((r) => setTimeout(r, 450));
      state.aiExcited = { pose: window.__widget.getPose(), active: activeSrc() };
      // 切回原形态
      window.__widget.applySpriteMode('original');
      await new Promise((r) => setTimeout(r, 450));
      state.backOriginal = { mode: window.__widget.getMode(), active: activeSrc() };
      // 原形态下换情绪不应换图
      window.__widget.applyEmotion('sad', null);
      await new Promise((r) => setTimeout(r, 350));
      state.originalStays = activeSrc();
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
    'getSpriteMode',
    'setSpriteMode',
    'onSpriteModeChanged',
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

  // ---- 形态：原形态（默认）/ AI 形态（manifest.emotionSprites）----
  const ORIG = 'yoimiya.gif';
  check((initial || '').endsWith(ORIG), '默认原形态：启动时显示原图', initial);
  check(info.modeAtStart === 'original', '初始模式为 original', String(info.modeAtStart));
  check((info.afterWelcome || '').endsWith(ORIG), '原形态下欢迎气泡不换图', info.afterWelcome);
  if (info.hasEmotionSprites) {
    check(info.spriteCount === 6, `情绪立绘集经 IPC 下发（${info.spriteCount}/6 个姿势）`);
    check(info.spriteFailed.length === 0, '六张情绪立绘全部加载成功', info.spriteFailed.join(','));
    const a = info.aiIdle || {};
    check(
      a.mode === 'ai' && (a.active || '').endsWith('/emotions/idle.webp'),
      '切到 AI 形态：显示待机立绘',
      `${a.mode} → ${a.active}`
    );
    const e = info.aiExcited || {};
    check(
      e.pose === 'excited' && (e.active || '').endsWith('/emotions/excited.webp'),
      'AI 形态下随情绪换图（excited）',
      `${e.pose} → ${e.active}`
    );
    // 本地点击路径：台词自带情绪 → 每次点击情绪都变、立绘跟随
    const clicks = info.localClicks || [];
    const localEmotions = buildCharacterPack().manifest.lineEmotions || [];
    const alternates = clicks.every((c, i) => i === 0 || c.emo !== clicks[i - 1].emo);
    const matches = clicks.every((c) => (c.active || '').endsWith(`/emotions/${c.emo}.webp`));
    const legal = clicks.every((c) => localEmotions.includes(c.emo));
    check(
      clicks.length === 6 && alternates,
      '点击时情绪每次都换一种（本地台词自带情绪）',
      clicks.map((c) => c.emo).join(' → ')
    );
    check(
      matches,
      '点击时立绘与情绪一致',
      clicks.map((c) => (c.active || '').split('/').pop()).join(' → ')
    );
    check(legal, '点击产生的情绪均在 manifest.lineEmotions 标注范围内');
    const b = info.backOriginal || {};
    check(
      b.mode === 'original' && (b.active || '').endsWith(ORIG),
      '切回原形态：显示原图',
      `${b.mode} → ${b.active}`
    );
    check((info.originalStays || '').endsWith(ORIG), '切回后换情绪不再换图', info.originalStays);
  } else {
    console.log('INFO  情绪立绘集未安装：AI 形态不可用，仅原形态');
  }

  console.log(failures.length ? `\n✖ ${failures.length} 项失败` : '\n✔ preload 回归检查全部通过');
  app.exit(failures.length ? 1 : 0);
});
