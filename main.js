/**
 * 宵宫桌面悬浮挂件 — Electron 主进程
 * ============================================================
 *
 * 核心效果：
 *   ✅ 透明窗口      → 桌面壁纸可见，挂件"浮"在桌面上
 *   ✅ 无边框        → 没有标题栏、关闭按钮，纯画面
 *   ✅ 始终置顶      → 不会被其他窗口遮挡
 *   ✅ 不在任务栏    → 纯挂件体验，不影响工作
 *   ✅ 固定右下角    → 自动对齐屏幕右下角
 *   ✅ 右键菜单      → 音效开关 / 全屏隐藏 / 置顶切换 / 退出
 *   ✅ 系统托盘      → 隐藏后可通过托盘恢复
 *
 * 启动方式：
 *   npm install      → 安装依赖（仅首次）
 *   npm start        → 正常启动
 *   npm run dev      → 开发模式（自动打开 DevTools）
 */

const {
  app, BrowserWindow, Menu, Tray, screen,
  ipcMain, nativeImage,
} = require('electron');
const path = require('path');

// ============================================================
// 📐 窗口配置（可根据需要调整）
// ============================================================
const WIDGET_WIDTH  = 240;   // 窗口宽度（容纳角色+气泡+浮动空间）
const WIDGET_HEIGHT = 300;   // 窗口高度
const EDGE_RIGHT    = 24;    // 距屏幕右边缘（px）
const EDGE_BOTTOM   = 16;    // 距屏幕下边缘（px）

// ============================================================
// 🔧 全局状态
// ============================================================
let mainWindow  = null;
let tray        = null;

// 菜单可切换的状态（与渲染进程通过 IPC 同步）
let soundEnabled          = true;    // 音效开关（默认开启——已放入音频文件）
let autoHideOnFullscreen  = true;    // 全屏时自动隐藏
let alwaysOnTop           = true;    // 窗口置顶
let hiddenManually        = false;   // 用户手动隐藏（用于区分自动隐藏）

// 全屏检测防抖
let fullscreenCounter     = 0;
const FULLSCREEN_THRESHOLD = 2;      // 连续检测到全屏 N 次后才触发
let fullscreenPollTimer   = null;

// ============================================================
// 🎨 托盘图标（16×16 橙色方块，匹配宵宫配色 #E8753A）
// ============================================================
const TRAY_ICON_PATH = path.join(__dirname, 'tray-icon.png');

// ============================================================
// 📋 构建右键菜单模板
// ============================================================
function buildContextMenu() {
  return Menu.buildFromTemplate([
    {
      label: '🔊 开启音效',
      type: 'checkbox',
      checked: soundEnabled,
      click: (menuItem) => {
        soundEnabled = menuItem.checked;
        // 通过 IPC 通知渲染进程切换音效
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('sound-toggled', soundEnabled);
        }
      },
    },
    {
      label: '🎮 全屏应用时自动隐藏',
      type: 'checkbox',
      checked: autoHideOnFullscreen,
      click: (menuItem) => {
        autoHideOnFullscreen = menuItem.checked;
        if (autoHideOnFullscreen) {
          startFullscreenPolling();
        } else {
          stopFullscreenPolling();
          // 关闭全屏隐藏时，立即恢复窗口可见性+置顶
          if (!hiddenManually && mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.setOpacity(1);
            if (alwaysOnTop) mainWindow.setAlwaysOnTop(true, 'screen-saver');
          }
        }
      },
    },
    { type: 'separator' },
    {
      label: '👁️ 暂时隐藏（托盘恢复）',
      click: () => {
        hideWindowToTray();
      },
    },
    { type: 'separator' },
    {
      label: '🔝 置顶显示',
      type: 'checkbox',
      checked: alwaysOnTop,
      click: (menuItem) => {
        alwaysOnTop = menuItem.checked;
        // 全屏模式激活时，不立即应用，等全屏结束自动恢复
        if (mainWindow && !mainWindow.isDestroyed() && fullscreenCounter < FULLSCREEN_THRESHOLD) {
          mainWindow.setAlwaysOnTop(alwaysOnTop, 'screen-saver');
        }
      },
    },
    { type: 'separator' },
    {
      label: '🔄 重新加载',
      click: () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.reload();
        }
      },
    },
    {
      label: '🔧 开发者工具',
      click: () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.openDevTools({ mode: 'detach' });
        }
      },
    },
    { type: 'separator' },
    {
      label: '❌ 关闭挂件',
      click: () => {
        app.quit();
      },
    },
  ]);
}

// ============================================================
// 🖥️ 全屏检测（轮询 screen 模块）
// ============================================================

/**
 * 检测是否有应用占据全屏。
 *
 * 原理：比较每台显示器的物理分辨率与可用工作区大小。
 * 全屏应用会覆盖 Windows 任务栏 → workAreaSize ≈ size。
 * 阈值 10px：足够窄的任务栏也能被检测到。
 *
 * 注意：如果系统设置了"自动隐藏任务栏"，workArea 始终等于 size，
 * 此检测会一直返回 true。此时请用右键菜单"暂时隐藏"手动控制。
 */
function isFullscreenAppActive() {
  try {
    const displays = screen.getAllDisplays();
    for (const display of displays) {
      const { width: sw, height: sh } = display.size;
      const { width: ww, height: wh } = display.workAreaSize;
      // 阈值 10px —— 任务栏最小高度约 22px（小图标模式），
      // 全屏应用覆盖任务栏后 workArea 会趋近于 size
      if ((sh - wh < 10) && (sw - ww < 10)) {
        return true;
      }
    }
    return false;
  } catch (_) {
    return false;
  }
}

function startFullscreenPolling() {
  if (fullscreenPollTimer) return;

  fullscreenPollTimer = setInterval(() => {
    if (!autoHideOnFullscreen) return;
    if (!mainWindow || mainWindow.isDestroyed()) return;

    let fullscreen;
    try {
      fullscreen = isFullscreenAppActive();
    } catch (_) {
      return; // 显示配置切换中（游戏退出/进入），跳过本轮
    }

    if (fullscreen) {
      fullscreenCounter = Math.min(fullscreenCounter + 1, FULLSCREEN_THRESHOLD);
    } else {
      // 恢复时加速归零（每次减 2）
      fullscreenCounter = Math.max(fullscreenCounter - 2, 0);
    }

    // 全屏时降级：取消置顶 + 完全透明
    try {
      if (fullscreenCounter >= FULLSCREEN_THRESHOLD && !hiddenManually) {
        mainWindow.setAlwaysOnTop(false);
        mainWindow.setOpacity(0);
      }

      // 全屏结束：恢复置顶 + 恢复可见
      if (fullscreenCounter === 0 && !hiddenManually) {
        mainWindow.setOpacity(1);
        if (alwaysOnTop) {
          mainWindow.setAlwaysOnTop(true, 'screen-saver');
        }
      }
    } catch (_) {
      // 窗口操作失败（显示配置切换瞬间），下轮重试
    }
  }, 2000);
}

function stopFullscreenPolling() {
  if (fullscreenPollTimer) {
    clearInterval(fullscreenPollTimer);
    fullscreenPollTimer = null;
  }
  fullscreenCounter = 0;
}

// ============================================================
// 🔔 系统托盘
// ============================================================

function createTray() {
  try {
    const icon = nativeImage.createFromPath(TRAY_ICON_PATH);
    tray = new Tray(icon);

    // 托盘提示文字
    tray.setToolTip('宵宫桌面挂件 — 点击恢复显示');

    // 点击托盘图标 → 恢复窗口
    tray.on('click', () => {
      showWindowFromTray();
    });

    // 托盘右键菜单（精简版）
    const trayMenu = Menu.buildFromTemplate([
      {
        label: '👁️ 显示窗口',
        click: () => showWindowFromTray(),
      },
      { type: 'separator' },
      {
        label: '❌ 关闭挂件',
        click: () => app.quit(),
      },
    ]);
    tray.setContextMenu(trayMenu);
  } catch (err) {
    console.warn('⚠️ 创建系统托盘失败:', err.message);
    tray = null;
  }
}

function hideWindowToTray() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    hiddenManually = true;
    mainWindow.hide();
    // 通知渲染进程（可暂停动画等，节省资源）
    mainWindow.webContents.send('window-hidden');
  }
}

function showWindowFromTray() {
  hiddenManually = false;
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
    // 同时退出全屏隐藏状态（恢复透明度+置顶）
    mainWindow.setOpacity(1);
    if (alwaysOnTop) {
      mainWindow.setAlwaysOnTop(true, 'screen-saver');
    }
    // 重置全屏计数器，避免轮询又把它藏回去
    fullscreenCounter = 0;
    mainWindow.focus();
    mainWindow.webContents.send('window-shown');
  }
}

// ============================================================
// 🪟 创建透明无边框置顶窗口
// ============================================================
function createWindow() {
  const { width: screenW, height: screenH } =
    screen.getPrimaryDisplay().workAreaSize;

  mainWindow = new BrowserWindow({
    // ---- 尺寸与位置 ----
    width:  WIDGET_WIDTH,
    height: WIDGET_HEIGHT,
    x: screenW - WIDGET_WIDTH  - EDGE_RIGHT,
    y: screenH - WIDGET_HEIGHT - EDGE_BOTTOM,

    // ---- 🔑 桌面挂件三大核心属性 ----
    frame:          false,          // ① 无边框（frameless）
    transparent:    true,           // ② 透明背景
    alwaysOnTop:    true,           // ③ 始终置顶

    // ---- 辅助属性 ----
    resizable:      false,
    skipTaskbar:    true,
    hasShadow:      false,
    backgroundColor: '#00000000',

    // ---- 交互 ----
    focusable:      true,
    show:           false,

    // ---- 安全配置 ----
    webPreferences: {
      nodeIntegration:  false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWindow.loadFile('yoimiya-widget.html');

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // ---- 置顶层 + 透明加固 + 点击穿透 ----
  mainWindow.setAlwaysOnTop(true, 'screen-saver');
  mainWindow.setBackgroundColor('#00000000');

  // 默认启用鼠标穿透：透明区域不拦截桌面点击
  // { forward: true } 使得 mousemove 事件仍能到达渲染进程，
  // 从而用 mouseenter/mouseleave 精准切换穿透状态
  mainWindow.setIgnoreMouseEvents(true, { forward: true });

  // ---- 🖱️ 右键自定义菜单（禁用浏览器默认右键） ----
  mainWindow.webContents.on('context-menu', (e) => {
    e.preventDefault();                         // 阻止浏览器默认右键菜单
    const menu = buildContextMenu();            // 动态构建（确保勾选状态最新）
    menu.popup({ window: mainWindow });
  });

  // ---- 开发模式 ----
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  // ---- 窗口关闭前的清理 ----
  mainWindow.on('close', () => {
    stopFullscreenPolling();
  });
}

// ============================================================
// 🔄 应用生命周期
// ============================================================

// 单实例锁 —— 用户再次运行 npm start 时恢复隐藏的窗口
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    // 用户启动了第二个实例 → 恢复窗口
    showWindowFromTray();
  });

  app.whenReady().then(() => {
    createWindow();
    createTray();
    startFullscreenPolling();  // 默认开启全屏检测

    // macOS: 点击 Dock 图标时如果无窗口则重新创建
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      } else {
        showWindowFromTray();
      }
    });
  });
}

app.on('window-all-closed', () => {
  // 不退出 —— 用户可能只是隐藏了窗口到托盘
  // 真正的退出通过右键菜单"关闭挂件"触发
});

// 确保应用最终能退出
app.on('before-quit', () => {
  stopFullscreenPolling();
});

// ============================================================
// 📡 IPC 通信
// ============================================================

// 渲染进程查询当前音效状态（页面加载时同步）
ipcMain.handle('get-sound-state', () => {
  return soundEnabled;
});

// 渲染进程查询全屏隐藏开关状态
ipcMain.handle('get-auto-hide-state', () => {
  return autoHideOnFullscreen;
});

// 渲染进程主动请求切换音效
ipcMain.on('request-toggle-sound', (event) => {
  soundEnabled = !soundEnabled;
  event.reply('sound-toggled', soundEnabled);
});

// 获取挂件窗口边界（预留）
ipcMain.handle('get-widget-bounds', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    return mainWindow.getBounds();
  }
  return null;
});

// 渲染进程拖拽 → 移动窗口（增量，渲染进程累加+rAF节流）
ipcMain.on('move-window', (_event, { dx, dy }) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    const [x, y] = mainWindow.getPosition();
    mainWindow.setPosition(x + Math.round(dx), y + Math.round(dy));
  }
});

// 鼠标进入挂件区域 → 关闭穿透，正常接收点击
ipcMain.on('mouse-enter-widget', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setIgnoreMouseEvents(false);
  }
});

// 鼠标离开挂件区域 → 开启穿透，透明区域不拦截桌面点击
ipcMain.on('mouse-leave-widget', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setIgnoreMouseEvents(true, { forward: true });
  }
});
