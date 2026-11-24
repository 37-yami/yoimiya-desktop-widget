# P1-B1 实操指南：AI 形象生图 Prompt 包 + 集成管线

> 状态：本会话内置生图服务两次返回 `Invalid credential`（不可用），
> 本地无 SD 环境。**改为用户出图 + 本项目管线集成**的模式。
> 生成一张你满意的图 ≈ B1 完成。

## 一、去哪里生成（任选其一，网页版即可）

| 工具 | 地址 | 说明 |
|---|---|---|
| 即梦 AI | jimeng.jianying.com | 字节系，中文 Prompt 友好，免费额度 |
| 通义万相 | tongyi.aliyun.com/wanxiang | 阿里系，免费额度 |
| 豆包 | doubao.com | 对话式生图 |
| Midjourney / SD WebUI | — | 若已有账号/环境 |

## 二、Prompt（复制即用）

### 关键构图要求（务必保留在 Prompt 里）

- `纯白背景 / pure solid white background` —— 抠图干净的前提
- `全身 / full body`、`正面站立 / front-facing standing`、`居中留边 / centered with margins`
- 不要复杂光效、不要背景元素

### 姿势 1：挥手打招呼（默认立绘，推荐先出这张）

```
Q版动漫原创角色少女，烟花祭典主题，暖橙色双马尾头发配大红色蝴蝶结发饰，
琥珀色眼睛，白色羽织外套带红橙色火焰纹样，内搭深蓝色和服裙，
一只手拿着发光的小烟花棒，开心地笑着挥另一只手打招呼，
全身正面站立居中，纯白色背景，柔和赛璐璐上色，干净利落的边缘，
高质量动漫插画
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

### 姿势 2：开心跳起（对应 motion=jump）

在姿势 1 基础上替换动作句：
`开心地跳起来双手举起 / jumping joyfully with both arms raised, mid-air`

### 姿势 3：困倦打瞌睡（对应 emotion=sleepy）

在姿势 1 基础上替换动作与表情：
`困倦地眯眼打哈欠，双手扶着脸 / sleepy yawning with eyes closed, hands on cheeks`

## 三、拿到图之后（集成管线，一步完成）

1. 把图放到项目 `.source-assets/`（任意名字，png/jpg/webp 均可）
2. 告诉我文件名，或自己运行：

```bash
# 抠图 + 缩放 + 输出（AI 生图边缘干净，rembg 效果远好于 GIF 帧）
python scripts/optimize_sprite.py --model birefnet-general --single <你的图>.png
```

3. 替换 `characters/yoimiya/manifest.json` 的 `sprite` 字段即可生效
   （静态立绘会自动叠加现有的 float 呼吸动画 + 点击特效，仍有"活"的感觉）

## 四、为什么不用宵宫本体 Prompt

按任务书版权边界：仓库默认形象使用**原创角色**（同主题不同设计），
宵宫素材作为用户自导入角色包保留在本地，不进入公开仓库。
