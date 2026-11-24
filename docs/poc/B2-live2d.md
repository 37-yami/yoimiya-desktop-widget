# P1-B2 PoC 报告：Live2D 集成（pixi-live2d-display）

## 尝试了什么

独立 PoC 页面 `docs/poc/live2d-poc.html`：pixi.js 6 + pixi-live2d-display 0.4 +
Cubism 官方免费运行时（live2dcubismcore），加载 Cubism 4 示例模型 **Haru**
（pixi-live2d-display 官方测试资产），验证：

- 模型加载与透明背景渲染（`backgroundAlpha: 0`）
- 内建交互（拖拽 / 点击身体触发动作）
- 情绪 → 动作映射（与主应用 `MOTION_MAP` 同构：happy→tap_body, excited→flick_head）

## 版本与锁定原因

| 包                  | 版本     | 说明                                                                     |
| ------------------- | -------- | ------------------------------------------------------------------------ |
| pixi.js             | 6.5.10   | pixi-live2d-display@0.4 的 peer 上限（7/8 存在兼容问题，任务书预警的坑） |
| pixi-live2d-display | 0.4.0    | 支持 Cubism 2.1 / 4                                                      |
| live2dcubismcore    | 官方 CDN | 必须在库之前加载                                                         |

均从 CDN 加载（PoC 页不进生产包，主应用体积不受影响）。

## 验证结果

- ✅ 四个依赖 URL 全部 HTTP 200 可达（cubism.live2d.com + jsdelivr ×3，2026-11-24 实测）；
- ✅ 页面与调用代码完成（加载失败时有状态栏错误提示）；
- ⚠️ **本机未做可视化运行验证**（需要浏览器打开页面观察，自动化环境无头）。
  打开方式：直接双击 `docs/poc/live2d-poc.html`（需联网）。

## 后续建议

1. 本机打开 PoC 页确认 Haru 渲染/动作后，再决定是否把渲染层切到 Live2D：
   - 需要定制宵宫 Cubism 模型（社区制作或 Live2D 官方编辑器自制）——**最大工作量项**；
   - 接入主应用时注意 `window.PIXI.live2d` UMD 导出与 Electron file:// 加载本地模型路径；
2. lipsyncpatch 分支（`pixi-live2d-display-lipsyncpatch`）内置音频驱动口型，
   与 A5 可直接整合；
3. 保持 pixi 6.x 锁版本，升级 pixi 前先看该库 release notes。
