# -*- coding: utf-8 -*-
"""ブランク鉄板のスプライト生成（真実源の正を再現する処理系）:
- 入力: 第2版の原画 truth/approved/blank-plate-v2-raw.webp（コミット 813e66e の原画と同一）
- 処理: 輪郭マスクを滑らかに整える／色合いを aged v2（24カジノ）の鉄板に合わせる（帯域別の色移転）
  ／左上の切り欠き埋め／左辺の縁の処理（soften_left_rim）／縁の拡大と立体感（standardize_rim）／全体の持ち上げ（brighten）／明るさのグラデーション（level_light）
- 出力: truth/approved/blank-plate.webp（現在の正・2026-11-14 第6弾に差し替え）
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


def standardize_rim(rgb, mask, R=49):
    """外周の縁の標準化（2026-11-14 本人仕様）: 縁の幅はカード上で約12px
    （本体幅の約2.9%）を基準とし、全周に連続させる。
    その後、本人の追加指示で縁を内側へ10px（カード寸法）大きくした:
    ハイライト線の位置 R は素材換算で 26 → 49（カード上で約21px）。
    実測では、元の鉄板の縁は「輪郭から約27pxの位置にある明るい縁取り線＋その内側の溝」
    でできているが、場所によって線が弱く面と区別しにくい。そこで元の質感は残したまま、
    輪郭からの距離で一律に (1)縁の内側の明るい線（dist=R）を補強し (2)その内側に溝
    （dist=R+7）を彫り、(3)縁の内側には左上からの光で緩い面取りの陰影を付ける。
    距離場は輪郭に沿うため、角や凹凸でも縁は自然に輪郭をなぞって連続する。
    明るい画素（リベットの頭など）では溝を浅くし、部品を線で切らない。"""
    dist = ndimage.distance_transform_edt(mask)
    gy, gx = np.gradient(dist)
    norm = np.maximum(np.hypot(gx, gy), 1e-6)
    nx, ny = -gx / norm, -gy / norm           # 外向き法線
    diffuse = ndimage.gaussian_filter(nx * -0.55 + ny * -0.83, 2)  # 左上からの光
    lum = rgb.astype(float).mean(axis=2)
    f = np.ones_like(dist)
    t = np.clip(dist / (R + 4), 0, 1)
    rim = mask & (dist <= R + 4)
    f[rim] = (1 + 0.28 * diffuse * (1 - t) ** 1.5)[rim]            # 面取りの陰影
    f *= 1 + 0.14 * np.exp(-((dist / 2.5) ** 2))                   # 輪郭の際の線
    f = np.where(mask, f, 1.0)
    out = rgb.astype(float) * f[..., None]
    # 旧い縁の線（dist≈27）とその溝（dist≈33）を弱め、質感として残す。
    # 縁を内側へ広げた分、定義は新しい線と溝へ移す。
    out *= (1 - 0.55 * np.exp(-(((dist - 27) / 3.0) ** 2)))[..., None]
    w = np.clip((70 - lum) / 40, 0, 1)
    out *= (1 + 0.55 * w * np.exp(-(((dist - 33) / 3.5) ** 2)))[..., None]
    # 縁の定義は「線」ではなく面の明暗で作る（aged v2 の実物が基準）:
    # 天面全体が明るい帯＋内側の影の帯で縁を定義する。下記の帯リフトと影を参照。
    # 新しい溝（dist=R+7）: 暗い金属色へ寄せる。明るい部品（リベット）では浅くする
    depth = 0.45 * (1 - 0.65 * np.clip((lum - 100) / 90, 0, 1))
    mix_g = depth * np.exp(-(((dist - (R + 7)) / 3.5) ** 2))
    lo = np.array([22, 19, 15], float)
    out = out * (1 - mix_g[..., None]) + lo * mix_g[..., None]
    # 立体感（2026-11-14 本人指示、理想は aged v2 の鉄板）: v2 の縁は
    # 「天面全体が擦れた金属で明るい帯」＋「内側に落ちる影の帯」で立体感を作っている。
    # 細い線ではなく面の明暗で再現する。
    def _sstep(a, b, x):
        t = np.clip((x - a) / (b - a), 0, 1)
        return t * t * (3 - 2 * t)
    out_lum = out.mean(axis=2)
    band = _sstep(0, 6, dist) * (1 - _sstep(46, 56, dist))        # 縁の天面の重み
    side = 0.88 + 0.24 * np.clip(diffuse, -1, 1)                   # 上・左が少し明るい
    lift = 1 + 1.5 * band * side
    worn = np.clip((out_lum - 90) / 90, 0, 1)                      # 擦れの明部はさらに立てる
    lift = lift * (1 + 0.55 * band * worn)
    out = out * np.where(mask, lift, 1.0)[..., None]
    # 天面は銀色寄りに（v2 の縁は面より冷たく明るい金属色）
    gray = out.mean(axis=2, keepdims=True)
    out = out * (1 - 0.22 * band[..., None]) + gray * (0.22 * band[..., None])
    # 内側の影の帯: 縁から面へ落ちる影。下・右で少し深い
    D = 0.5 * nx + 0.75 * ny                                       # 外向き法線の下右成分
    ao = (1 - _sstep(52, 92, dist)) * (0.9 + 0.2 * np.clip(D, 0, 1))
    out = out * np.where(mask, 1 - 0.45 * ao, 1.0)[..., None]
    out = np.where(mask[..., None], out, rgb.astype(float))
    return np.clip(out, 0, 255).astype(np.uint8)


def level_light(rgb, mask):
    """明るさの整え（2026-11-14 本人指示の最終形）: 右上を基準（OK済みの明るさ）に、
    左下を約60まで落とし、左上と右下はその間の自然な光のグラデーションにする。
    輝度の大域成分（σ100のぼかし）を目標の斜めグラデーション場へ寄せる。
    縁と面の境目や影の帯のような細かい明暗はぼかしに残らないため、立体感は保たれる。
    目標場 T(s) = 55.4 + 26.2*s（s は右上=1・左下=0 の斜め座標）:
    隅ゾーンの平均で 右上≈77・左下≈60・左上と右下≈68 になるよう解いた値。
    ガンマ補正後の最終空間で適用するため、呼び出しは brighten の後に置く。"""
    lum = rgb.astype(float).mean(axis=2)
    m = mask.astype(float)
    L = ndimage.gaussian_filter(lum * m, 100) / np.maximum(ndimage.gaussian_filter(m, 100), 1e-6)
    ys, xs = np.where(mask)
    y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()
    u = (np.arange(rgb.shape[1])[None, :] - x0) / max(x1 - x0, 1)
    v = (np.arange(rgb.shape[0])[:, None] - y0) / max(y1 - y0, 1)
    s = (u + (1 - v)) / 2
    T = 55.4 + 26.2 * s
    gain = np.clip(T / np.maximum(L, 1), 0.6, 2.4)
    gain = ndimage.gaussian_filter(gain, 10)
    return np.clip(rgb.astype(float) * np.where(mask, gain, 1.0)[..., None], 0, 255).astype(np.uint8)


def brighten(rgb, gamma=0.88):
    """全体を均一に少し明るくする（2026-11-14 本人指示: 左右で明暗の違いは付けない、
    そのうえで全体をもう少し明るく）。以前の左側だけの光補正（brighten_left）は廃止。"""
    return np.clip(255 * (rgb.astype(float) / 255) ** gamma, 0, 255).astype(np.uint8)



def sprite():
    # 入力は第2版の原画（truth/approved/blank-plate-v2-raw.webp = コミット 813e66e の原画）
    bp = Image.open(TRUTH / RAW).convert('RGB')
    rgb = np.asarray(bp)
    m = raw_mask(bp)
    rgb, m = fill_left_ear(rgb, m)
    m = ndimage.binary_closing(m, structure=np.ones((9, 9)))
    mf = ndimage.gaussian_filter(m.astype(float), 5)
    m = ndimage.binary_fill_holes(mf > 0.45)
    graded = level_light(brighten(standardize_rim(soften_left_rim(grade(rgb), m), m)), m)
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
