# -*- coding: utf-8 -*-
"""ブランク鉄板のスプライト生成（真実源の正を再現する処理系）:
- 入力: 第2版の原画 truth/approved/blank-plate-v2-raw.webp（コミット 813e66e の原画と同一）
- 処理: 輪郭マスクを滑らかに整える／色合いを aged v2（24カジノ）の鉄板に合わせる（帯域別の色移転）
  ／左上の切り欠き埋め／左側の光補正／左辺の縁の処理（soften_left_rim）
- 出力: truth/approved/blank-plate.webp（現在の正・2026-11-14 差し替え）
色の実測（中央値RGB）: 影 (21,26,23) / 中間 (71,67,56) / 高中間 (138,125,102) / 擦れ (231,204,161)
= 温かい真鍮・生成り側に寄るアンティーク鉄。新鉄板は影は同じだが中間 (52,60,65) と
擦れ (182,181,182) が冷たい灰色で暗い。"""
import pathlib

import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

TRUTH = pathlib.Path(__file__).resolve().parent.parent / 'truth' / 'approved'
RAW = 'blank-plate-v2-raw.webp'

# 輝度アンカー（帯域の代表輝度）と、その輝度での目標色／原色（中央値RGB）
ANCHOR_L = np.array([25.0, 70.0, 120.0, 190.0])
SRC = np.array([[21, 25, 26], [52, 60, 65], [114, 116, 119], [182, 181, 182]], float)
TGT = np.array([[21, 26, 23], [71, 67, 56], [138, 125, 102], [231, 204, 161]], float)


def grade(rgb):
    a = rgb.astype(float)
    lum = a.mean(2)
    gain = np.ones((*lum.shape, 3))
    for c in range(3):
        g_anchor = TGT[:, c] / np.maximum(SRC[:, c], 1)
        gain[..., c] = np.interp(lum, ANCHOR_L, g_anchor)
    return np.clip(a * gain, 0, 255).astype(np.uint8)


def smooth_mask(bp):
    import cv2
    a = np.asarray(bp).astype(int)
    lum = a.mean(2)
    dark = lum < 34
    lab, _ = ndimage.label(dark)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    m1 = ~np.isin(lab, list(border))
    g = cv2.cvtColor(np.asarray(bp), cv2.COLOR_RGB2GRAY)
    edges = cv2.Canny(cv2.GaussianBlur(g, (0, 0), 2), 50, 150) > 0
    e = ndimage.binary_closing(edges, structure=np.ones((13, 13)))
    m2 = ndimage.binary_fill_holes(e)
    m = ndimage.binary_fill_holes(ndimage.binary_closing(m1 | m2, structure=np.ones((17, 17))))
    lab2, n2 = ndimage.label(m)
    sizes = ndimage.sum(np.ones_like(lab2), lab2, range(1, n2 + 1))
    m = lab2 == (1 + int(np.argmax(sizes)))
    # 滑らかに整える: 小さな欠けを埋め、輪郭を丸める
    m = ndimage.binary_closing(m, structure=np.ones((9, 9)))
    mf = ndimage.gaussian_filter(m.astype(float), 5)
    m = mf > 0.45
    m = ndimage.binary_fill_holes(m)
    return m


def raw_mask(bp):
    import cv2
    a = np.asarray(bp).astype(int)
    lum = a.mean(2)
    dark = lum < 34
    lab, _ = ndimage.label(dark)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    m1 = ~np.isin(lab, list(border))
    g = cv2.cvtColor(np.asarray(bp), cv2.COLOR_RGB2GRAY)
    edges = cv2.Canny(cv2.GaussianBlur(g, (0, 0), 2), 50, 150) > 0
    e = ndimage.binary_closing(edges, structure=np.ones((13, 13)))
    m2 = ndimage.binary_fill_holes(e)
    m = ndimage.binary_fill_holes(ndimage.binary_closing(m1 | m2, structure=np.ones((17, 17))))
    lab2, n2 = ndimage.label(m)
    sizes = ndimage.sum(np.ones_like(lab2), lab2, range(1, n2 + 1))
    return lab2 == (1 + int(np.argmax(sizes)))


def fill_left_ear(rgb, mask):
    """左上の切り欠きを、右上を鏡写しにして埋める（鉄板中心 x=774 で反転）。"""
    H, W = mask.shape
    cx = 774
    mirrored_rgb = rgb[:, ::-1]
    mirrored_mask = mask[:, ::-1]
    # 鏡写しの座標ずれを中心に合わせる（反転軸 cx → 列 j は 2*cx - j）
    shift = 2 * cx - (W - 1)
    if shift > 0:
        mirrored_rgb = np.roll(mirrored_rgb, shift, axis=1)
        mirrored_mask = np.roll(mirrored_mask, shift, axis=1)
    zone = np.zeros_like(mask)
    zone[140:500, 220:500] = True
    fill = zone & mirrored_mask & ~mask
    out_rgb = rgb.copy()
    out_rgb[fill] = mirrored_rgb[fill]
    out_mask = mask | fill
    # 耳の縁帯を本体から切り離す溝（切り欠き）を行方向に埋める。
    # RGBは溝の両端の画素から直線補間し、縁の光の流れを切らない。
    for y in range(280, 481):
        row = out_mask[y, 230:560]
        idx = np.where(row)[0]
        if len(idx) < 2:
            continue
        base = 230 + idx.min()
        seg = row[idx.min():idx.max() + 1]
        runs = []
        run_start = None
        for i, v in enumerate(seg):
            if not v and run_start is None:
                run_start = i
            elif v and run_start is not None:
                if i - run_start <= 70:
                    runs.append((run_start, i - 1))
                run_start = None
        for s, e in runs:
            xa, xb = base + s, base + e
            left = rgb[y, xa - 1].astype(float)
            right = rgb[y, xb + 1].astype(float)
            for x in range(xa, xb + 1):
                t = (x - xa + 1) / (xb - xa + 2)
                out_mask[y, x] = True
                out_rgb[y, x] = (left * (1 - t) + right * t).astype(np.uint8)
    return out_rgb, out_mask


def brighten_left(rgb, mask):
    """左側の暗さを横グラデーションで補正（左端で最大+28%、中央付近で0）。"""
    ys, xs = np.where(mask)
    x0, x1 = xs.min(), xs.max()
    u = (np.arange(rgb.shape[1])[None, :] - x0) / max(x1 - x0, 1)
    gain = 1 + 0.28 * np.clip((0.55 - u) / 0.55, 0, 1)
    return np.clip(rgb.astype(float) * gain[..., None], 0, 255).astype(np.uint8)


def soften_left_rim(rgb, mask):
    """左辺の縁の光がまっすぐな線になるのを崩す: 縁から18pxの帯を少し暗くし、
    行ごとに滑らかな濃淡の揺らぎを入れる（特に明るい擦れの線を弱める）。"""
    out = rgb.astype(float)
    rng = np.random.default_rng(11)
    noise = ndimage.gaussian_filter(rng.normal(1.0, 0.05, rgb.shape[0]), 9)
    for y in range(460, 1321):
        xs = np.where(mask[y])[0]
        if len(xs) == 0:
            continue
        xL = xs.min()
        band = out[y, xL:xL + 18]
        t = np.linspace(0, 1, band.shape[0])[:, None]
        f = (0.80 + 0.20 * t) * noise[y]
        lum = band.mean(axis=1, keepdims=True)
        f = np.where(lum > 120, f * 0.85, f)
        out[y, xL:xL + 18] = band * f
    return np.clip(out, 0, 255).astype(np.uint8)


def sprite():
    # 入力は第2版の原画（truth/approved/blank-plate-v2-raw.webp = コミット 813e66e の原画）
    bp = Image.open(TRUTH / RAW).convert('RGB')
    rgb = np.asarray(bp)
    m = raw_mask(bp)
    rgb, m = fill_left_ear(rgb, m)
    m = ndimage.binary_closing(m, structure=np.ones((9, 9)))
    mf = ndimage.gaussian_filter(m.astype(float), 5)
    m = ndimage.binary_fill_holes(mf > 0.45)
    graded = soften_left_rim(brighten_left(grade(rgb), m), m)
    rgba = Image.fromarray(graded).convert('RGBA')
    alpha = Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2))
    rgba.putalpha(alpha)
    return rgba


if __name__ == '__main__':
    sp = sprite()
    white = Image.new('RGB', sp.size, (255, 255, 255))
    white.paste(sp, (0, 0), sp)
    sp.save(TRUTH / 'blank-plate.webp', lossless=True)
    white.save('/tmp/plate-graded-white.png')
    print('saved truth/approved/blank-plate.webp + /tmp/plate-graded-white.png')
