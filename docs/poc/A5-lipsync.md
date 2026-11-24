# P1-A5 PoC 报告：口型同步（能量包络近似）

## 尝试了什么

WebAudio `AnalyserNode` 取时域能量包络 → rAF 循环驱动角色 transform，
近似"说话时的嘴部活动"（GIF 无口型参数，用纵向压缩 + 横向膨胀模拟说话感）。

## 关键代码（`yoimiya-widget.html` `attachLipSync()`）

```js
const source = lipSyncCtx.createMediaElementSource(audioEl);
const analyser = lipSyncCtx.createAnalyser();
analyser.fftSize = 256;
source.connect(analyser);
analyser.connect(lipSyncCtx.destination);

// 每帧：
analyser.getByteTimeDomainData(data);
const energy = min(1, Σ|v-128| / data.length / 40);
characterImg.style.transform = `scale(${1 + energy*0.05}, ${1 - energy*0.035})`;
```

挂接点：TTS wav 播放时（`playTtsBuffer` → `attachLipSync(audio)`），
播放结束自动取消 rAF 并还原 transform。

## 结果

- ✅ 代码链路完整（AudioContext → MediaElementSource → Analyser → transform）；
- ⚠️ **视觉效果未本机验证**（本机无 GPT-SoVITS，TTS 音频不会产生；
  本地 MP3 播放路径未挂同步，避免常驻 AudioContext 开销）。
- 精度定位：能量→缩放的近似映射（任务书允许，不要求音素对齐）。

## 后续建议

1. A1 服务可用后用真实 wav 观察效果，调 `0.05/0.035` 两个系数；
2. 若接入 Live2D（B2），能量可直接驱动 `ParamMouthOpenY`，观感质变；
3. 需注意 `createMediaElementSource` 对同一元素只能调用一次（当前实现按次创建新 Audio 元素，天然规避）。
