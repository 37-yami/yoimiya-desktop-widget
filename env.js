/**
 * 运行环境工具
 * ============================================================
 * ① isDevMode      — 调试入口（开发者工具/重新加载）的注入条件
 * ② clearRunAsNode — 修复 start:win 场景下 ELECTRON_RUN_AS_NODE
 *                    残留导致 "electron ." 以纯 Node 模式启动的问题
 */

/**
 * 是否为开发模式：
 *   - 未打包（app.isPackaged === false）→ true
 *   - 显式携带 --dev 启动参数 → true
 *   - 其余（正式安装包运行）→ false
 */
function isDevMode(appIsPackaged, argv) {
  if (appIsPackaged === false) return true;
  return Array.isArray(argv) && argv.includes('--dev');
}

/**
 * 删除 ELECTRON_RUN_AS_NODE 环境变量（就地修改）。
 *
 * 背景：npm scripts 里 `set ELECTRON_RUN_AS_NODE=` 在部分 shell
 * 会留下空字符串而非删除变量，Electron 看到"变量存在"就以纯
 * Node 模式启动（窗口/托盘全部失效）。在 main.js 顶部主动
 * delete 一次是跨 shell 的稳妥兜底。
 */
function clearRunAsNode(env) {
  if (env && Object.prototype.hasOwnProperty.call(env, 'ELECTRON_RUN_AS_NODE')) {
    delete env.ELECTRON_RUN_AS_NODE;
  }
}

module.exports = { isDevMode, clearRunAsNode };
