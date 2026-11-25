# 自己生成 AI 形象：完整方法（P1-B1）

> 结论先行：本机目前没有任何可用的生图通道（排查过程见 `NOTES.md`），
> 所以形象由你出图、项目管线负责抠图和接入。**全程约 5 分钟。**

## 第 1 步：出图（任选一个工具）

| 工具           | 地址                       | 说明                                 |
| -------------- | -------------------------- | ------------------------------------ |
| 即梦 AI        | jimeng.jianying.com        | 字节系，中文 Prompt 友好，有免费额度 |
| 通义万相       | tongyi.aliyun.com/wanxiang | 阿里系，有免费额度                   |
| 豆包           | doubao.com                 | 对话式生图，改图方便                 |
| 有智谱 API key | 见下方「一键脚本」         | 可直接在本项目里命令行生成           |

### Prompt（直接复制）

```
Q版动漫原创角色少女，烟花祭典主题，暖橙色双马尾，大红色蝴蝶结发饰，
琥珀色大眼睛，白色羽织外套带红橙色火焰纹样，内搭深蓝色和服裙，
手拿发光的小烟花棒，开心笑着挥手打招呼，全身正面站立居中，
纯白色背景，柔和赛璐璐上色，干净利落的边缘，高质量动漫插画
```

英文版（部分工具英文效果更好）：

```
Chibi anime original character girl, fireworks festival theme, warm orange
twin-tails hair with large red ribbon hair accessory, amber eyes, white haori
jacket with red-orange flame trim over navy kimono, holding a glowing
hand-held sparkler, cheerful smile waving hello, full body standing
front-facing, pure solid white background, soft cel shading, crisp clean
edges, high quality anime illustration, centered with margins
```

### 四条硬性要求（决定抠图成败，务必保留在 Prompt 里）

1. **纯色背景**（纯白最稳）——不要场景、不要光效、不要渐变
2. **全身** + 四周留边——头顶和脚不要贴边
3. **正面/微侧站立**——大幅动作容易出肢体错误
4. 发饰、呆毛等**细小部件与背景对比明显**——这是之前 GIF 抠图翻车的根源

想换姿势只改动作句，例如：

- 跳起：`开心地跳起来双手举起 / jumping joyfully with both arms raised, mid-air`
- 困倦：`困倦地眯眼打哈欠，双手扶着脸 / sleepy yawning, hands on cheeks`

## 第 2 步：抠图 + 接入（两条命令）

把生成的图放进项目的 `.source-assets/` 目录（该目录不入库），然后：

```bash
# ① 抠图 + 等比缩放到 480px，输出带透明通道的立绘
python scripts/optimize_sprite.py --single .source-assets/你的图.png --out characters/yoimiya/sprite-ai.webp
#    需要: pip install rembg onnxruntime（首次自动下载约 170MB 模型）
#    想要无损就输出 .png；默认模型 isnet-general-use，细节保留不好时加 --model birefnet-general

# ② 确认能正常加载（会真实启动渲染层检查立绘）
npm run test:preload
```

然后把 `characters/yoimiya/manifest.json` 的 `sprite` 改成新文件：

```json
"sprite": "characters/yoimiya/sprite-ai.webp"
```

启动 `npm start` 即生效。立绘会自动叠加挂件原有的悬浮呼吸、点击星火、
情绪气泡与动作动画，所以**静态图也是有"活"感的**。

> 若用 `--out characters/yoimiya/sprite-ai.webp`，可先直接把 manifest 指过去再跑
> `test:preload`——它失败会明确告诉你立绘没加载。

## 附 A：有智谱 key 时的一键脚本

```bash
# Windows PowerShell
$env:ZHIPU_API_KEY="你的智谱key"
node scripts/gen-avatar-zhipu.mjs --out .source-assets/ai-character.png
# 可选: --model cogview-4-250304（默认，约 ¥0.06/张）  --size 1024x1024
```

key 只从环境变量读取，不打印、不入库。生成后同样走第 2 步。

## 附 B：零凭据备选（仓库自带）

`characters/yoimiya/sprite.svg` 是一个代码手绘的原创矢量角色：天然透明、
仅 8KB、内置眨眼/挥手/花火闪烁动画。想直接用它，把 manifest 的 `sprite` 改成
`characters/yoimiya/sprite.svg` 即可（SVG 内嵌动画在 `<img>` 模式下实测会运行）。

## 版权提醒

按任务书边界：公开分发时默认形象用**原创角色**；宵宫素材仅作个人自用的
自导入角色包，不要连同克隆音色/生成素材一起发布。
