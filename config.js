/**
 * 全局配置与常量 —— main.js / preload.js 共用
 * ============================================================
 * 把原先硬编码在 main.js 顶部的窗口与检测常量集中到这里，
 * 后续新增角色包 / 调整窗口尺寸只需改这一个文件。
 */

const path = require('path');

/** 窗口宽度（容纳角色+气泡+浮动空间） */
const WIDGET_WIDTH = 240;

/** 窗口高度（角色框 160 + 提示行 + 底部留白 + 气泡空间） */
const WIDGET_HEIGHT = 350;

/** 默认停靠位置：距屏幕右边缘（px） */
const EDGE_RIGHT = 24;

/** 默认停靠位置：距屏幕下边缘（px） */
const EDGE_BOTTOM = 16;

/** 全屏检测防抖：连续检测到全屏 N 次后才触发隐藏 */
const FULLSCREEN_THRESHOLD = 2;

/** 全屏检测轮询间隔（ms）——事件驱动的补充兜底 */
const FULLSCREEN_POLL_INTERVAL = 2000;

// ============================================================
// 角色包目录（P1 AI 管线复用：换角色 = 换一个 characters/<name> 目录）
// ============================================================
const CHARACTER_DIR = path.join(__dirname, 'characters', 'yoimiya');
const MANIFEST_PATH = path.join(CHARACTER_DIR, 'manifest.json');

module.exports = {
  WIDGET_WIDTH,
  WIDGET_HEIGHT,
  EDGE_RIGHT,
  EDGE_BOTTOM,
  FULLSCREEN_THRESHOLD,
  FULLSCREEN_POLL_INTERVAL,
  CHARACTER_DIR,
  MANIFEST_PATH,
};
