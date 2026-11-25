# 自己生成 AI 形象：完整方法（P1-B1）

> 当前默认形象：根目录 `yoimiya.gif` 原图（未抠背景）。形象由你出图、
> 项目管线负责抠图和接入。

## 第 1 步：出图

### 1A. 参考图生图（官方图 / 同人图 → Q版）— 推荐

把 1～3 张**正面、全身、无文字水印**的角色图作为参考图上传，再用下面的 Prompt。

#### Prompt A：单张参考图 → Q版全身立绘（先出这张）

```
参考图中的角色，转换为Q版（chibi）卡通形象，保留她的发型、发色、发饰、
服装款式和配色，头身比约2.5头身，大眼睛，表情开心微笑，
一只手挥手打招呼，另一只手拿着发光的线香花火，
全身正面站立，人物居中、四周留出空白，纯白色背景，
干净的粗线条描边，柔和赛璐璐上色，扁平插画风格，高质量
```

English:

```
Turn the character in the reference image into a chibi cartoon version.
Keep her hairstyle, hair color, hair accessories, outfit and color palette
exactly. About 2.5 heads tall, big expressive eyes, cheerful smile, one hand
waving hello, the other hand holding a glowing hand-held sparkler. Full body,
standing, front-facing, centered with generous margins, pure solid white
background, clean bold outlines, soft cel shading, flat illustration style.
```

#### Prompt B：多张参考图（同一角色的不同图）

```
这几张参考图是同一个角色的不同图片。请综合它们，生成这个角色的Q版（chibi）
全身立绘：保留她的发型、发饰、服装和配色，头身比约2.5头身，大眼睛，
开心微笑，一只手挥手打招呼，全身正面站立，人物居中、四周留出空白，
纯白色背景，干净的粗线条描边，柔和赛璐璐上色，扁平插画风格
```

#### Prompt C：以满意的 Q版图为参考，生成其他表情（保持一致）

**先只出 Prompt A。满意后，把那张结果图当作新的参考图**，再逐张生成其它表情——
每张图只画一个姿势，这样每张都能直接抠图当立绘用。
下面 5 组正好对应挂件里的 5 种情绪（`emotion`）：

| 情绪      | 把 Prompt C 里「___」替换成        |
| --------- | ---------------------------------- |
| `happy`   | 开心地微笑，一只手挥手打招呼       |
| `excited` | 开心地跳起来，双手高举，兴奋地大笑 |
| `shy`     | 害羞地脸红，双手捂着脸颊，眼神躲闪 |
| `sad`     | 难过地低下头，眼睛含泪，嘴角向下   |
| `sleepy`  | 困倦地眯眼打哈欠，双手扶着脸       |

```
参考图中的Q版角色，在保持完全相同的发型、发饰、服装、配色和画风的条件下，
只改变姿势和表情：___。全身，人物居中、四周留出空白，纯白色背景，
干净的粗线条描边，柔和赛璐璐上色，扁平插画风格
```

English:

```
Same chibi character as the reference image — identical hairstyle, hair
accessories, outfit, colors and art style. Change only the pose and
expression: ___. Full body, centered with generous margins, pure solid white
background, clean bold outlines, soft cel shading, flat illustration style.
```

#### 负面提示词（有"负向词"输入框的工具填这个）

```
复杂背景, 场景, 渐变背景, 投在背景上的阴影, 多余人物, 多个角色, 文字,
水印, 签名, 边框, 头顶被裁切, 脚被裁切, 写实风格, 3D渲染, 厚涂, 模糊, 低质量, 畸形手指
```

English: `complex background, scenery, gradient background, cast shadow, extra characters, multiple people, text, watermark, signature, frame, cropped head, cropped feet, photorealistic, 3d render, blurry, low quality, bad hands`

#### 参数与常见的坑

| 坑                             | 对策                                                             |
| ------------------------------ | ---------------------------------------------------------------- |
| 写"透明背景"结果出棋盘格假透明 | 一律写**纯白色背景**，透明交给抠图管线                           |
| 角色变了样（换脸/换衣）        | 调高"主体参考度 / 角色一致性"（即梦 70–80%），或改用多图参考     |
| 风格被参考图带偏成厚涂/写实    | 调低"风格参考度"，Prompt 保留"扁平插画、赛璐璐、粗线条描边"      |
| 结果带了场景或地面阴影         | 用消除笔去掉，或追加一句"去掉背景，换成纯白色背景，保持角色不变" |
| 一次出多姿势的设定图           | 每张图只要**一个姿势**，否则抠图后还要手动切图                   |
| 参考图有文字/水印              | 先裁掉再上传，否则容易被学进画面                                 |

常见工具的入口：即梦 AI（图生图 / 参考图，模型选图片 3.0 以上）、
通义万相（图生图 / 人物一致性）、豆包（对话里直接传图）、
Gemini / GPT 的生图（直接上传图片 + English Prompt，角色一致性很好）。
SD / ComfyUI：img2img 重绘幅度 0.55–0.7 + Q版 LoRA，可加 ControlNet OpenPose 固定姿势。

### 1B. 纯文字生图（没有参考图时）

```
Q版动漫原创角色少女，烟花祭典主题，暖橙色双马尾，大红色蝴蝶结发饰，
琥珀色大眼睛，白色羽织外套带红橙色火焰纹样，内搭深蓝色和服裙，
手拿发光的小烟花棒，开心笑着挥手打招呼，全身正面站立居中，
纯白色背景，柔和赛璐璐上色，干净利落的边缘，高质量动漫插画
```

### 四条硬性要求（决定抠图成败）

1. **纯色背景**（纯白最稳）——不要场景、不要光效、不要渐变
2. **全身** + 四周留边——头顶和脚不要贴边
3. **每张图只有一个姿势**，正面或微侧站立
4. 发饰、呆毛等**细小部件与背景对比明显**

## 第 2 步：抠图 + 接入

### 2A. 六张图 → 情绪立绘集（推荐，挂件会按情绪自动换姿势）

把 6 张图按下面的名字放进 `.source-assets/ai/`（不入库），每张一个姿势：

| 文件名        | 姿势                          |
| ------------- | ----------------------------- |
| `idle.png`    | 待机（Prompt A 的基础图即可） |
| `happy.png`   | 开心微笑、挥手                |
| `excited.png` | 跳起、双手高举                |
| `shy.png`     | 害羞捂脸                      |
| `sad.png`     | 低头含泪                      |
| `sleepy.png`  | 打哈欠                        |

```bash
python scripts/build_emotion_sprites.py
# → characters/yoimiya/emotions/{idle,happy,excited,shy,sad,sleepy}.webp
# → .source-assets/ai/_qa-sheet.png（质检图：灰底并排 + 包围盒 + 脚底基准线）
```

脚本要点：全部图**共用同一个裁切框**（否则切换情绪时角色会跳位）、自动清除水印残点与
游离小色块、输出统一 640px 高。六张齐全挂件才启用情绪集，缺一张就整体回落到单张 `sprite`。

### 2B. 单张图 → 单张立绘

```bash
python scripts/optimize_sprite.py --single .source-assets/你的图.png --out characters/yoimiya/sprite-ai.webp
npm run test:preload   # 真实启动渲染层，确认立绘能加载
```

把 `characters/yoimiya/manifest.json` 的 `sprite` 改成新文件路径即可，例如
`"sprite": "characters/yoimiya/sprite-ai.webp"`。立绘会自动叠加挂件原有的悬浮呼吸、
点击星火、情绪气泡与动作动画。

## 附 A：自己处理原 GIF

根目录 `yoimiya.gif`（720×720 / 125 帧 / 33fps / 不透明黑底）可用同一套脚本处理：

```bash
python scripts/optimize_sprite.py --model birefnet-general   # 或 --method chroma
python scripts/verify_sprite.py                              # 验收
```

u2net（丢呆毛发饰）与 isnet（空白乱扣）两种模型在本 GIF 上效果都不好，
根因是源图压缩伪影重；`birefnet-general` 未在该 GIF 上试过，可作下一个尝试。

## 附 B：有智谱 key 时的一键脚本

```powershell
$env:ZHIPU_API_KEY="你的智谱key"
node scripts/gen-avatar-zhipu.mjs --out .source-assets/ai-character.png
```

key 只从环境变量读取，不打印、不入库。

## 附 C：原形态 / AI 形态切换

挂件有两种形态，右键菜单「🎭 形象切换」可选，默认原形态，选择会记住：

| 形态    | 来源                                                | 行为                                                 |
| ------- | --------------------------------------------------- | ---------------------------------------------------- |
| 原形态  | `manifest.sprite`（根目录 `yoimiya.gif`）           | 始终显示原图，不随情绪换图（气泡配色/动作/粒子照常） |
| AI 形态 | `manifest.emotionSprites`（`emotions/*.webp` 六张） | 随情绪换姿势，气泡消失后回待机                       |

六张情绪立绘不齐全时「AI 形态」菜单项置灰；设置里停在 AI 形态但立绘缺失时自动退回原形态。

## 版权说明

用官方图 / 同人图生成的立绘属于同人二创：形象版权归 miHoYo 及官方 CV，
本项目为非商业同人作品。
