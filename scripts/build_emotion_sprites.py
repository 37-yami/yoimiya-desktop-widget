# -*- coding: utf-8 -*-
"""
情绪立绘集构建：多张同角色图 → 抠图 → 清杂点 → 统一取景 → 输出
======================================================
用法:
  python scripts/build_emotion_sprites.py --input-dir .source-assets/ai \
      --out-dir characters/yoimiya/emotions [--height 640] [--model isnet-general-use]

输入目录下按文件名识别姿势：idle / happy / excited / shy / sad / sleepy（.png/.jpg/.webp）。

关键设计 —— 统一取景（否则切换情绪时角色会跳位）:
  六张图各自的内容包围盒取【并集】得到唯一裁切框，所有图都用同一个框裁切，
  不逐图居中、不逐图缩放。像素比例与相对位置完全保留原画的生成一致性。
"""
import argparse
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from skimage.measure import label as cc_label

sys.path.insert(0, str(Path(__file__).resolve().parent))
from optimize_sprite import build_rembg_remover  # noqa: E402

POSES = ("idle", "happy", "excited", "shy", "sad", "sleepy")
ROOT = Path(__file__).resolve().parent.parent


def clean_alpha(rgba, alpha_floor=24, min_ratio=0.004):
    """去掉背景残雾/水印浅痕，并移除极小的游离色块（只保留与主体相连的大块）"""
    arr = np.asarray(rgba).copy()
    a = arr[..., 3]
    a[a < alpha_floor] = 0
    lab = cc_label(a > 0, connectivity=2)
    if lab.max() > 1:
        sizes = np.bincount(lab.ravel())
        sizes[0] = 0
        keep = sizes >= sizes.max() * min_ratio
        arr[~keep[lab], 3] = 0
    return Image.fromarray(arr, "RGBA")


def content_bbox(img, thresh=128):
    a = np.asarray(img)[..., 3] > thresh
    rows = np.nonzero(a.any(axis=1))[0]
    cols = np.nonzero(a.any(axis=0))[0]
    return cols[0], rows[0], cols[-1] + 1, rows[-1] + 1  # l, t, r, b


def main():
    ap = argparse.ArgumentParser(description="情绪立绘集构建")
    ap.add_argument("--input-dir", default=str(ROOT / ".source-assets" / "ai"))
    ap.add_argument("--out-dir", default=str(ROOT / "characters" / "yoimiya" / "emotions"))
    ap.add_argument("--height", type=int, default=640, help="输出高度(px)，宽度按比例")
    ap.add_argument("--model", default="isnet-general-use")
    ap.add_argument("--quality", type=int, default=85)
    ap.add_argument("--margin", type=float, default=0.04, help="裁切框外扩比例（相对内容高度）")
    args = ap.parse_args()

    src_dir, out_dir = Path(args.input_dir), Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    files = {}
    for p in sorted(src_dir.iterdir()):
        stem = p.stem.lower()
        if p.suffix.lower() in (".png", ".jpg", ".jpeg", ".webp") and stem in POSES:
            files[stem] = p
    missing = [p for p in POSES if p not in files]
    if missing:
        raise SystemExit(f"输入目录缺少姿势图: {missing}（需在 {src_dir} 提供 <pose>.png）")

    remover = build_rembg_remover(args.model)

    cut = {}
    print(f"{'姿势':<8} {'原图尺寸':<12} 内容包围盒 l,t,r,b")
    for pose in POSES:
        img = Image.open(files[pose]).convert("RGBA")
        out = clean_alpha(remover(img))
        cut[pose] = out
        print(f"{pose:<8} {str(img.size):<12} {content_bbox(out)}")

    # ---- 统一取景：所有内容包围盒的并集 + 外扩边距 ----
    boxes = [content_bbox(im) for im in cut.values()]
    L = min(b[0] for b in boxes)
    T = min(b[1] for b in boxes)
    R = max(b[2] for b in boxes)
    B = max(b[3] for b in boxes)
    m = int((B - T) * args.margin)
    W0, H0 = cut[POSES[0]].size
    L, T, R, B = max(0, L - m), max(0, T - m), min(W0, R + m), min(H0, B + m)
    print(f"统一裁切框: ({L}, {T}, {R}, {B})  → {R - L}x{B - T}")

    scale = args.height / (B - T)
    out_w = round((R - L) * scale)
    print(f"输出尺寸: {out_w}x{args.height}（缩放 {scale:.3f}）")

    results = {}
    for pose in POSES:
        cropped = cut[pose].crop((L, T, R, B))
        resized = cropped.resize((out_w, args.height), Image.LANCZOS)
        out_path = out_dir / f"{pose}.webp"
        resized.save(out_path, format="WEBP", quality=args.quality, method=6)
        results[pose] = resized
        print(f"  {pose}.webp  {out_path.stat().st_size / 1024:.0f}KB")

    # ---- 质检图：灰底并排 + 包围盒 + 脚底基准线，供人工核对对齐 ----
    pad, qa = 12, 4
    sheet_w = len(POSES) * (out_w + pad) + pad
    sheet = Image.new("RGB", (sheet_w, args.height + 2 * pad + 20), (150, 158, 168))
    dr = ImageDraw.Draw(sheet)
    for i, pose in enumerate(POSES):
        x = pad + i * (out_w + pad)
        sheet.paste(results[pose], (x, pad + 20), results[pose])
        l, t, r, b = content_bbox(results[pose])
        dr.rectangle([x + l, pad + 20 + t, x + r - 1, pad + 20 + b - 1], outline=(0, 200, 255))
        dr.line([x, pad + 20 + b, x + out_w, pad + 20 + b], fill=(255, 60, 60))
        dr.text((x + 4, pad + 4), f"{pose}  feet_y={b}", fill=(0, 0, 0))
        print(f"  [质检] {pose:<8} 输出包围盒 l={l} t={t} r={r} 脚底 y={b}")
    qa_path = src_dir / "_qa-sheet.png"
    sheet.save(qa_path)
    print(f"质检图: {qa_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
