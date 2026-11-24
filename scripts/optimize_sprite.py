# -*- coding: utf-8 -*-
"""
宵宫 GIF 资源优化管线：去黑底 + 压缩 → 透明动画 WebP
=====================================================
用法:
  python scripts/optimize_sprite.py                     # rembg（首选，ML 抠图）
  python scripts/optimize_sprite.py --method chroma     # 色度键控（rembg 不可用时兜底）

流程:
  ① 拆帧（Pillow）
  ② 去背景
     - rembg: u2net 模型（首次运行自动下载 ~170MB），按帧抠 alpha
     - chroma: 背景 (3,2,3) 近黑色，按色距计算 alpha + 反预乘去黑晕
  ③ 抽帧到目标帧率（默认 16fps，源 33fps → 隔帧采样）
  ④ LANCZOS 缩放到目标边长（默认 480）
  ⑤ 合成有损 + alpha 的动画 WebP

输出: characters/yoimiya/yoimiya.webp（manifest.sprite 同步指向它）
"""
import argparse
import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent


# ------------------------------------------------------------
# ②-a rembg 抠图（惰性导入，缺依赖时给出可读错误）
# ------------------------------------------------------------
def build_rembg_remover():
    try:
        from rembg import new_session, remove
    except ImportError as e:
        raise SystemExit(
            f"rembg 未安装（{e}）。"
            "安装: python -m pip install rembg onnxruntime\n"
            "或改用兜底方案: python scripts/optimize_sprite.py --method chroma"
        ) from e
    session = new_session("u2net")  # 首次自动下载模型
    return lambda img: remove(img, session=session, post_process_mask=True)


# ------------------------------------------------------------
# ②-b 色度键控兜底：近黑背景 → alpha，边缘反预乘去黑晕
# ------------------------------------------------------------
def chroma_key(frame: Image.Image, bg=(3, 2, 3), t0=26.0, t1=64.0) -> Image.Image:
    """t0 以下全透明，t1 以上不透明，中间线性过渡；fg = (rgb-(1-a)*bg)/a"""
    arr = np.asarray(frame.convert("RGB")).astype(np.float32)
    bgc = np.array(bg, dtype=np.float32)
    dist = np.linalg.norm(arr - bgc, axis=-1)
    alpha = np.clip((dist - t0) / (t1 - t0), 0.0, 1.0)

    a3 = alpha[..., None]
    # 反预乘：假设观测 rgb = a*fg + (1-a)*bg，解出 fg，避免边缘残留黑色光晕
    fg = (arr - (1.0 - a3) * bgc) / np.maximum(a3, 1e-4)
    fg = np.clip(fg, 0, 255)

    out = np.dstack([fg, alpha * 255.0]).astype(np.uint8)
    return Image.fromarray(out, "RGBA")


# ------------------------------------------------------------
# 主流程
# ------------------------------------------------------------
def main() -> int:
    ap = argparse.ArgumentParser(description="宵宫 GIF → 透明动画 WebP")
    ap.add_argument("--src", default=str(ROOT / "yoimiya.gif"))
    ap.add_argument("--out", default=str(ROOT / "characters" / "yoimiya" / "yoimiya.webp"))
    ap.add_argument("--method", choices=["rembg", "chroma"], default="rembg")
    ap.add_argument("--size", type=int, default=480, help="目标边长(px)")
    ap.add_argument("--fps", type=int, default=16, help="目标帧率")
    ap.add_argument("--quality", type=int, default=80, help="WebP 有损质量")
    ap.add_argument("--limit", type=int, default=0, help="只处理前 N 帧（调试用）")
    args = ap.parse_args()

    src = Path(args.src)
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)

    gif = Image.open(src)
    n_total = getattr(gif, "n_frames", 1)
    src_duration = gif.info.get("duration", 30) or 30  # ms/帧
    src_fps = 1000.0 / src_duration
    # 抽帧步长：源 33fps → 目标 16fps 即隔帧采样
    step = max(1, round(src_fps / args.fps))
    target_duration = round(src_duration * step)

    indices = list(range(0, n_total, step))
    if args.limit:
        indices = indices[: args.limit]
    print(
        f"源: {n_total} 帧 @ {src_fps:.1f}fps → 采样 {len(indices)} 帧 @ "
        f"{1000 / target_duration:.1f}fps (step={step}, {target_duration}ms/帧)"
    )

    remover = None
    if args.method == "rembg":
        print("初始化 rembg (u2net) ...")
        remover = build_rembg_remover()

    frames = []
    for i, idx in enumerate(indices):
        gif.seek(idx)
        rgba = gif.convert("RGBA")
        if remover is not None:
            result = remover(rgba)
        else:
            result = chroma_key(rgba)
        result = result.resize((args.size, args.size), Image.LANCZOS)
        frames.append(result)
        if (i + 1) % 10 == 0 or i + 1 == len(indices):
            print(f"  已处理 {i + 1}/{len(indices)} 帧")

    frames[0].save(
        out,
        save_all=True,
        append_images=frames[1:],
        duration=target_duration,
        loop=0,  # 无限循环
        format="WEBP",
        quality=args.quality,
        method=4,  # 压缩耗时换体积
        minimize_size=True,
    )

    size_mb = out.stat().st_size / 1024 / 1024
    print(f"完成: {out} ({size_mb:.2f}MB, {len(frames)} 帧, {args.size}px)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
