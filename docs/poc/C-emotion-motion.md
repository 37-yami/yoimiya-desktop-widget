# P1-C PoC 报告：情绪-动作联动

## 尝试了什么

LLM 输出的 `emotion` + `motion` 同时驱动三层表现，端到端打通 ≥2 个情绪
（实际实现 5 情绪 + 3 动作全覆盖）：

| 层       | 机制                                                                          | 实现位置                                                        |
| -------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------- |
| 气泡配色 | `emotion-*` 类覆盖 `--bubble-border/--bubble-bg` CSS 变量（尾巴三角自动跟随） | CSS + `applyEmotion()`                                          |
| 角色动作 | `motion-wave/jump/laugh` 关键帧动画（2.2s 后自动移除类）                      | CSS + `applyEmotion()`                                          |
| 触发源   | LLM 三元组 / 本地台词随机 / idle 系统台词                                     | `requestAiReply` / `showBubble` / `showSystemBubbleWithEmotion` |

## 情绪立绘集（2026-11-25 落地：静态图"动"起来的方案）

6 张同角色姿势图（`characters/yoimiya/emotions/`）+ 程序化动态，分层实现、互不覆盖：

| 层                 | 负责                                            | 效果                                                          |
| ------------------ | ----------------------------------------------- | ------------------------------------------------------------- |
| `.yoimiya-widget`  | 悬浮                                            | 整体上下浮动（原有）                                          |
| `.character-frame` | 情绪待机 `idle-*` / 事件动作 `motion-*`         | excited 弹跳、sleepy 摇晃、sad 下沉、shy 扭动；挥手/跳跃/大笑 |
| `.character-inner` | 切换弹跳 `pose-pop` / 说话轻弹 `talking` / 口型 | 换姿势时先压扁再回弹；每句话到达轻弹                          |
| `.sprite-breath`   | 持续呼吸                                        | 3.2s 周期的轻微缩放                                           |
| `.sprite-layer` ×2 | 交叉淡入淡出                                    | 新图加载完才交接，不闪白                                      |

- **情绪退场**：气泡消失 2.5s 后回到待机姿势（情绪是反应，不是常驻状态）
- **小粒子**：⭐（happy）🎆（excited）💕（shy）💧（sad）💤（sleepy）从头顶飘起
- **切换不跳位**：六张图在 `scripts/build_emotion_sprites.py` 中共用同一裁切框
- **真实应用验证**（CDP 连入运行中的 main.js 逐情绪截图）：立绘/气泡色/待机类/粒子
  全部对应；交叉过渡中间帧两层透明度并存；点击 → happy → 4s 自动隐藏 → 2.5s 后回待机 ✓
- **原形态 / AI 形态**：右键菜单「形象切换」，默认原形态（原 GIF 不随情绪换图）；
  AI 形态才有情绪换图与回待机。两种形态下气泡配色、动作、小粒子都生效。
- **情绪的三个来源**（2026-11-25 补全）：
  ① 点击 → 本地台词自带的情绪（`manifest.lineEmotions`，抽取时优先挑与当前情绪不同的台词，
  保证每次点击都有可见变化）；② 自言自语规则表每条带情绪（待机：shy/happy/sad；整点：happy/excited；
  深夜：sleepy）；③ AI 对话 → LLM 返回的 emotion。
  在此之前点击路径写死 `happy`，且 happy 与待机姿势几乎一样，导致"AI 形态下看不到情绪切换"。
- **局限**（如实说明）：单张静态图做不出眨眼、头发飘动这类画面内部形变；
  需要的话走 AI 图生视频路线（manifest 的 `emotionSprites` 以后可指向视频片段）

## 情绪 → 视觉映射

- `happy` 金橙（默认配色）
- `excited` 橙红边框
- `shy` 粉色系
- `sad` 蓝灰系
- `sleepy` 蓝紫系 + 文字变暗（深夜/待机台词使用）

## 无 LLM 也可验证（本地规则表路径）

- 点击角色（AI 关闭时）→ happy + 35% 概率 wave；
- 整点台词 → happy + wave；
- 深夜/待机台词 → sleepy 配色。

即**关闭所有 AI 服务，情绪联动依旧可演示**（满足验收第 4 条的降级要求）。

## 结果与建议

- ✅ 单元层面：emotion/motion 白名单在 `llm.js` 有测试覆盖（回落默认值）；
- ✅ 链路层面：LLM 实测返回 `{"emotion":"excited","motion":"jump"}` → 类名注入代码就绪；
- ⚠️ 视觉效果需本机 `npm start` 观察（自动化环境无 GUI）；
- 建议：TTS 接通后给 `emotion` 增加参考音频分桶（`voices/ref/<emotion>.wav`，
  `tts.js` 已按此约定组装 `ref_audio_path`）。
