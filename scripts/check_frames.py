# -*- coding: utf-8 -*-
"""
逐帧检查头顶区域完整性（呆毛/发饰是否被误抠）
======================================================
用法:  python scripts/check_frames.py [webp路径]

原理：
  角色主体在每帧中的躯干部分像素量基本稳定；
  头顶细结构（呆毛、发饰）被误抠的帧，其「上半区不透明像素」
  会显著少于其他帧。输出每帧统计 + 标记离群帧（低于中位数 85%），
  并把最可疑的 3 帧导出 PNG 供人工复核。
"""
import sys
import statistics
from pathlib import Path

import numpy as np
from PIL import Image

# Windows GBK 控制台兼容
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ROOT = Path(__file__).resolve().parent.parent
SPRITE = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "characters" / "yoimiya" / "yoimiya.webp"
OUT_DIR = Path(__file__).resolve().parent.parent / ".source-assets" / "suspect-frames"


def main():
    im = Image.open(SPRITE)
    n = getattr(im, "n_frames", 1)
    stats = []  # (idx, total, upper)
    for i in range(n):
        im.seek(i)
        arr = np.asarray(im.convert("RGBA"))[..., 3]
        h, w = arr.shape
        total = int((arr > 128).sum())
        upper = int((arr[: h // 3] > 128).sum())  # 上 1/3 = 头顶区域
        stats.append((i, total, upper))

    uppers = [s[2] for s in stats]
    med = statistics.median(uppers)
    totals = [s[1] for s in stats]
    tmed = statistics.median(totals)

    print(f"帧数: {n}，上半区不透明像素 中位数={med:.0f} 主体中位数={tmed:.0f}")
    print(f"{'帧':>4} {'主体px':>8} {'头顶px':>8} 头顶/中位  状态")
    suspects = []
    for idx, total, upper in stats:
        ratio = upper / med if med else 0
        flag = ""
        if ratio < 0.85:
            flag = "⚠️ 可疑（头顶细结构可能被抠掉）"
            suspects.append((idx, ratio))
        print(f"{idx:>4} {total:>8} {upper:>8} {ratio:>8.2f}  {flag}")

    if suspects:
        print(f"\n共 {len(suspects)} 个可疑帧：{[s[0] for s in suspects]}")
        OUT_DIR.mkdir(parents=True, exist_ok=True)
        for idx, _ in suspects[:3]:
            im.seek(idx)
            im.convert("RGBA").save(OUT_DIR / f"suspect_{idx:03d}.png")
        print(f"最可疑的 {min(3, len(suspects))} 帧已导出到 {OUT_DIR}（人工复核）")
        return 1
    print("\n✅ 全部帧头顶区域像素量正常，无明显细结构丢失")
    return 0


if __name__ == "__main__":
    sys.exit(main())
