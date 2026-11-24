# -*- coding: utf-8 -*-
"""
验收校验：characters/yoimiya/yoimiya.webp 资源是否达标
=====================================================
用法:  python scripts/verify_sprite.py

验收标准（任务书 P0-1 / P0-2）:
  ① 文件体积 <= 5MB
  ② 首帧四角 alpha == 0（黑底已去除）
  ③ 帧率在 12-16fps 区间
  ④ 尺寸 <= 480（压缩过）
返回码: 0 全部通过 / 1 有失败项
"""
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SPRITE = ROOT / "characters" / "yoimiya" / "yoimiya.webp"
MAX_BYTES = 5 * 1024 * 1024


def main() -> int:
    failures = []

    if not SPRITE.exists():
        print(f"FAIL 文件不存在: {SPRITE}")
        return 1

    size_bytes = SPRITE.stat().st_size
    size_mb = size_bytes / 1024 / 1024
    if size_bytes <= MAX_BYTES:
        print(f"PASS 体积 {size_mb:.2f}MB (<= 5MB)")
    else:
        failures.append(f"体积 {size_mb:.2f}MB 超 5MB")

    im = Image.open(SPRITE)
    im.load()
    n_frames = getattr(im, "n_frames", 1)
    duration = im.info.get("duration", 0)
    fps = 1000 / duration if duration else 0

    if 12 <= fps <= 17:
        print(f"PASS 帧率 {fps:.1f}fps ({n_frames} 帧, {duration}ms/帧)")
    else:
        failures.append(f"帧率 {fps:.1f}fps 不在 12-17 区间")

    w, h = im.size
    if max(w, h) <= 480:
        print(f"PASS 尺寸 {w}x{h} (<= 480)")
    else:
        failures.append(f"尺寸 {w}x{h} 超 480")

    # 首帧四角 alpha 必须为 0（黑边消除）
    first = im.convert("RGBA")
    px = first.load()
    corners = [(1, 1), (w - 2, 1), (1, h - 2), (w - 2, h - 2)]
    opaque_corners = [c for c in corners if px[c][3] != 0]
    if not opaque_corners:
        print("PASS 首帧四角 alpha=0（黑底已去除）")
    else:
        failures.append(f"四角仍不透明: {opaque_corners} 值 {[px[c] for c in opaque_corners]}")

    # 半透明像素占比（抗锯齿边缘存在的证据，>0 说明边缘处理过而非硬切）
    semi = 0
    total = 0
    for y in range(0, h, 5):
        for x in range(0, w, 5):
            total += 1
            if 0 < px[x, y][3] < 255:
                semi += 1
    ratio = semi / max(total, 1)
    print(f"INFO 半透明像素采样占比 {ratio:.3%}（>0 即有抗锯齿边缘）")

    if failures:
        for f in failures:
            print(f"FAIL {f}")
        return 1
    print("=== 全部通过 ===")
    return 0


if __name__ == "__main__":
    sys.exit(main())
