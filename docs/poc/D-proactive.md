# P1-D PoC 报告：主动搭话调度器

## 尝试了什么

主进程定时调度器（`main.js` `startProactiveScheduler()`）：

- 每 5 分钟用 `powerMonitor.getSystemIdleTime()` 读**整机**空闲时长
  （该 API 仅主进程可用，是渲染层 idle 状态机做不到的互补能力）；
- 系统空闲 ≥15 分钟且距上次主动搭话 ≥20 分钟 → 向渲染层发 `proactive-trigger`；
- 渲染层双路径：AI 对话开启 → 用「时间 + 空闲时长」上下文调 LLM 生成一句；
  否则回落本地待机台词表（sleepy 配色）。
- 按任务书约定**不引入记忆系统**，上下文只有当前时段与空闲分钟数。

## 关键代码

```js
// main.js
idleSeconds = powerMonitor.getSystemIdleTime();
if (idleMinutes >= 15) {
  mainWindow.webContents.send('proactive-trigger', { kind: 'idle', idleMinutes, hour });
}

// 渲染层
const context = `[场景：现在是${period}，用户已经离开电脑 ${info.idleMinutes} 分钟]
 请主动说一句符合性格的话`;
```

## 职责划分（避免双冒泡）

| 调度器                 | 触发条件              | 位置   |
| ---------------------- | --------------------- | ------ |
| 系统空闲搭话（本 PoC） | 整机无键鼠输入 ≥15min | 主进程 |
| 挂件待机台词           | 用户 5min 未点击挂件  | 渲染层 |
| 整点 / 深夜台词        | 时钟规则              | 渲染层 |

## 结果与建议

- ✅ 代码链路完整，隐藏窗口（托盘/全屏）期间不触发；
- ⚠️ 15 分钟空闲条件需挂机才能实测（本 PoC 环境无法模拟整机空闲）；
- 建议：后续可加「空闲时长分层」（5min 轻声、30min 睡着）与用户可配置开关。
