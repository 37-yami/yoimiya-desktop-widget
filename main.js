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

// 全屏隐藏是否正在生效（状态标记，避免每轮轮询重复设置窗口属性）
let fullscreenHidden       = false;
// 全屏隐藏期间锁定鼠标穿透 —— 屏蔽渲染进程的穿透切换请求，
// 防止"隐形窗口"仍然可交互（吞掉全屏应用的点击、误触台词语音）
let mousePassthroughLocked = false;

// 拖拽状态：主进程用屏幕绝对坐标（getCursorScreenPoint）计算增量。
// 渲染进程的 e.screenX 与主进程窗口坐标在非 100% DPI 缩放下
// 单位可能不一致（Electron 已知问题），在主进程内部计算可完全规避。
let dragState = null;   // { startCursor: {x, y}, startWindow: [x, y] }

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
          // 关闭全屏隐藏时，立即恢复窗口可见性+置顶+穿透检测模式
          // （若正处于全屏隐藏状态，穿透被锁定为"完全忽略"，
          //   必须同步解锁，否则挂件可见但无法交互）
          if (!hiddenManually && mainWindow && !mainWindow.isDestroyed()) {
            if (fullscreenHidden) {
              fullscreenHidden = false;
              mousePassthroughLocked = false;
              mainWindow.setIgnoreMouseEvents(true, { forward: true });
            }
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
    {
      label: '📍 回到默认位置（右下角）',
      click: () => {
        resetWidgetPosition();
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
 * 检测挂件所在显示器是否有应用占据全屏。
 *
 * 原理：比较该显示器的物理分辨率与可用工作区大小。
 * 全屏应用会覆盖 Windows 任务栏 → workAreaSize ≈ size。
 * 阈值 10px：足够窄的任务栏也能被检测到。
 *
 * ⚠️ 只检测挂件所在的显示器（而非所有显示器）：
 *   多显示器下若系统设置"任务栏仅主屏显示"，副屏的
 *   workArea 恒等于 size，检测所有屏幕会永久误判为全屏，
 *   导致挂件永远隐藏不可见。
 *
 * 注意：如果系统设置了"自动隐藏任务栏"，workArea 始终等于 size，
 * 此检测会一直返回 true。此时请用右键菜单"暂时隐藏"手动控制。
 */
function isFullscreenAppActive() {
  try {
    if (!mainWindow || mainWindow.isDestroyed()) return false;
    const display = screen.getDisplayMatching(mainWindow.getBounds());
    const { width: sw, height: sh } = display.size;
    const { width: ww, height: wh } = display.workAreaSize;
    // 阈值 10px —— 任务栏最小高度约 22px（小图标模式），
    // 全屏应用覆盖任务栏后 workArea 会趋近于 size
    if ((sh - wh < 10) && (sw - ww < 10)) {
      return true;
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

    // 状态切换只做一次（fullscreenHidden 标记保证幂等）
    try {
      // 全屏时降级：取消置顶 + 完全透明 + 完全不可交互
      // 拖拽进行中（dragState 非空）则跳过本轮，
      // 避免拖拽中途切断鼠标捕获导致 mouseup 丢失
      if (fullscreenCounter >= FULLSCREEN_THRESHOLD && !hiddenManually
          && !fullscreenHidden && !dragState) {
        fullscreenHidden = true;
        mousePassthroughLocked = true;         // 🔒 锁定：屏蔽渲染进程的穿透切换
        mainWindow.setAlwaysOnTop(false);
        mainWindow.setOpacity(0);
        mainWindow.setIgnoreMouseEvents(true); // 不带 forward：隐形期间不接收任何鼠标事件
      }

      // 全屏结束：恢复可见 + 恢复穿透检测模式（forward）
      if (fullscreenCounter === 0 && !hiddenManually && fullscreenHidden) {
        fullscreenHidden = false;
        mousePassthroughLocked = false;
        mainWindow.setOpacity(1);
        mainWindow.setIgnoreMouseEvents(true, { forward: true });
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
// 📐 窗口位置工具（拖拽边界钳制 + 恢复默认位置）
// ============================================================

/**
 * 将窗口坐标钳制到最近的显示器工作区内。
 *
 * 作用：
 *   - 防止拖拽把挂件甩出屏幕外导致"丢失"
 *   - getDisplayMatching 会跟随窗口位置自动切换显示器，
 *     因此跨显示器拖拽仍然畅通无阻
 */
function clampToWorkArea(x, y) {
  const display = screen.getDisplayMatching({
    x, y, width: WIDGET_WIDTH, height: WIDGET_HEIGHT,
  });
  const wa = display.workArea;
  const nx = Math.min(Math.max(x, wa.x), wa.x + wa.width  - WIDGET_WIDTH);
  const ny = Math.min(Math.max(y, wa.y), wa.y + wa.height - WIDGET_HEIGHT);
  return [Math.round(nx), Math.round(ny)];
}

/** 将挂件重置到主显示器右下角默认位置（挂件"丢失"时的找回手段） */
function resetWidgetPosition() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const { width: sw, height: sh } = screen.getPrimaryDisplay().workArea;
  mainWindow.setPosition(
    sw - WIDGET_WIDTH  - EDGE_RIGHT,
    sh - WIDGET_HEIGHT - EDGE_BOTTOM
  );
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
      {
        label: '📍 回到默认位置（右下角）',
        click: () => {
          showWindowFromTray();
          resetWidgetPosition();
        },
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
    // 若隐藏时拖拽尚未结束，清理主进程拖拽状态
    dragState = null;
    mainWindow.hide();
    // 通知渲染进程（可暂停动画等，节省资源）
    mainWindow.webContents.send('window-hidden');
  }
}

function showWindowFromTray() {
  hiddenManually = false;
  if (mainWindow && !mainWindow.isDestroyed()) {
    dragState = null;
    fullscreenHidden = false;
    mousePassthroughLocked = false;
    mainWindow.show();
    // 同时退出全屏隐藏状态（恢复透明度+置顶+穿透检测模式）
    mainWindow.setOpacity(1);
    mainWindow.setIgnoreMouseEvents(true, { forward: true });
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

// 确保应用最终能退出（同时销毁托盘，避免 Windows 托盘图标残留）
app.on('before-quit', () => {
  stopFullscreenPolling();
  if (tray) {
    tray.destroy();
    tray = null;
  }
});

// ============================================================
// 📡 IPC 通信
// ============================================================

// 渲染进程查询当前音效状态（页面加载时同步）
ipcMain.handle('get-sound-state', () => {
  return soundEnabled;
});

// ============================================================
// 🖱️ 拖拽移动窗口（主进程绝对坐标方案）
//
// 渲染进程负责判定拖拽意图（阈值 + rAF 节流），只发送三条信号：
//   drag-start → 主进程记录「光标起点 + 窗口起点」
//   drag-move  → 主进程用 getCursorScreenPoint() 计算绝对增量并移动
//   drag-end   → 清理状态
//
// 为什么不在渲染进程算 dx/dy？
//   e.screenX 与主进程窗口坐标在非 100% DPI 缩放下单位可能不一致，
//   会导致挂件移动速度与光标不同步；主进程内部计算则天然一致。
// ============================================================
ipcMain.on('drag-start', () => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mousePassthroughLocked || hiddenManually) return;
  dragState = {
    startCursor: screen.getCursorScreenPoint(),
    startWindow: mainWindow.getPosition(),
  };
});

ipcMain.on('drag-move', () => {
  if (!dragState || !mainWindow || mainWindow.isDestroyed()) return;
  const cursor = screen.getCursorScreenPoint();
  const x = dragState.startWindow[0] + (cursor.x - dragState.startCursor.x);
  const y = dragState.startWindow[1] + (cursor.y - dragState.startCursor.y);
  // 钳制到显示器工作区内，防止拖出屏幕导致挂件"丢失"
  mainWindow.setPosition(...clampToWorkArea(x, y));
});

ipcMain.on('drag-end', () => {
  dragState = null;
});

// 鼠标进入挂件区域 → 关闭穿透，正常接收点击
ipcMain.on('mouse-enter-widget', () => {
  if (mainWindow && !mainWindow.isDestroyed() && !mousePassthroughLocked) {
    mainWindow.setIgnoreMouseEvents(false);
  }
});

// 鼠标离开挂件区域 → 开启穿透，透明区域不拦截桌面点击
ipcMain.on('mouse-leave-widget', () => {
  if (mainWindow && !mainWindow.isDestroyed() && !mousePassthroughLocked) {
    mainWindow.setIgnoreMouseEvents(true, { forward: true });
  }
});
