"""24ドボン カード面 v3 サンプル（2026-11-14 未明）第2版

真実源の承認済み部品だけで1面を組む試験:
- 土台・枠・名前欄・効果帯の紙は compose_final_v2 の実績処理を再利用
- イラストは真実源 approved のシーン原画
- 鉄板は真実源 approved の新ブランク鉄板を輪郭で切り抜いて使う。
  数字・札束を載せて鉄板ごと -2 度に傾け、矢印だけは原画スプライトからの
  抽出（aged v2 の矢印が正）を軸平行に置く
- 効果アイコンは真実源 approved を使い、下帯の内寸に収まる直径190pxにする
  （旧210pxは帯の内寸204pxを超えて縁が切れた = U-3 への回答）
対象: face-7-W-down（顔役・昼・下矢印・2点・SEVENアイコン・DAY印）
"""
import math
import pathlib
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import compose_final_v2 as C

TRUTH = pathlib.Path.home() / "workspace/goals/24-dobon-digital-web-version/repo/truth/approved"
OUT = pathlib.Path.home() / "workspace/goals/24-dobon-digital-web-version/files/design-mocks/sample-face-7-day-down-v3.webp"

# ---------- 鉄板の切り抜き（暗い背景を外側からフラッドフィル） ----------
def plate_sprite():
    import cv2
    bp = Image.open(TRUTH / "blank-plate.webp").convert("RGB")
    a = np.asarray(bp).astype(int)
    lum = a.mean(axis=2)
    # 方式1: 暗背景を外側からフラッドフィル
    dark = lum < 34
    lab, _ = ndimage.label(dark)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    m1 = ~np.isin(lab, list(border))
    # 方式2: 明るいフチの輪郭を閉じて内側を塗る
    g = cv2.cvtColor(np.asarray(bp), cv2.COLOR_RGB2GRAY)
    edges = cv2.Canny(cv2.GaussianBlur(g, (0, 0), 2), 50, 150) > 0
    e = ndimage.binary_closing(edges, structure=np.ones((13, 13)))
    m2 = ndimage.binary_fill_holes(e)
    m = ndimage.binary_fill_holes(ndimage.binary_closing(m1 | m2, structure=np.ones((17, 17))))
    lab2, n2 = ndimage.label(m)
    sizes = ndimage.sum(np.ones_like(lab2), lab2, range(1, n2 + 1))
    m = lab2 == (1 + int(np.argmax(sizes)))
    rgba = bp.convert("RGBA")
    rgba.putalpha(Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2)))
    return rgba

# 貼り付け変換: card = img * S + (OX, OY)（本体左端 x=50・肩ライン y=40 に合わせる）
S = 0.38
OX = 50 - 105 * S
OY = 40 - 335 * S

def to_card(x, y):
    return (x * S + OX, y * S + OY)

def build_plate(num, points):
    sp = plate_sprite()
    sp = sp.resize((round(sp.width * S), round(sp.height * S)), Image.LANCZOS)
    layer = Image.new("RGBA", (1280, 1920), (0, 0, 0, 0))
    layer.paste(sp, (round(OX), round(OY)), sp)
    # 数字（上段・左寄り）: 鉄板画像座標 (420, 690) が中心
    nl = C._num_layer(str(num))
    nx, ny = to_card(420, 690)
    layer.paste(nl, (round(nx - nl.width / 2), round(ny - nl.height / 2)), nl)
    # 札束（下段・中央）: 鉄板画像座標 (640, 1290) が中心
    row = C.BILL_ROWS[points]
    row = row.resize((row.width // 4, row.height // 4), Image.LANCZOS)
    bx, by = to_card(640, 1290)
    layer.paste(row, (round(bx - row.width / 2), round(by - row.height / 2)), row)
    # 鉄板ごと -2 度（仕切り線基準）。中心は鉄板本体の中心あたり
    cx, cy = to_card(640, 950)
    return layer.rotate(-2.0, resample=Image.BICUBIC, center=(round(cx), round(cy)))

def paste_plate(img, num, points):
    plate = build_plate(num, points)
    img.paste(plate, (0, 0), plate)
    # 矢印は傾けず軸平行に。置き場は「傾けた後の上段右側」に合わせて回転変換する
    ax_, ay_ = to_card(800, 690)
    cx, cy = to_card(640, 950)
    th = math.radians(2.0)  # layer.rotate(-2) は時計回り2度 = 点は -2 度回転
    dx, dy = ax_ - cx, ay_ - cy
    rx = cx + dx * math.cos(th) - dy * math.sin(th)
    ry = cy + dx * math.sin(th) + dy * math.cos(th)
    chev, _box = C.extract_chevron()
    img.paste(chev, (round(rx - chev.width / 2), round(ry - chev.height / 2)), chev)

# ---------- 面の合成 ----------
def build():
    img = C.make_base()
    scene = Image.open(TRUTH / "scene-07-day.webp").convert("RGB")
    tw, th = C.WIN[2] - C.WIN[0], C.WIN[3] - C.WIN[1]
    s = max(tw / scene.width, th / scene.height)
    sc = scene.resize((round(scene.width * s), round(scene.height * s)), Image.LANCZOS)
    ox = (sc.width - tw) // 2
    oy = max(0, min(round(sc.height * 0.945) - th, sc.height - th))
    img.paste(sc.crop((ox, oy, ox + tw, oy + th)), (C.WIN[0], C.WIN[1]))
    C.stamp_day(img)
    img.paste(C.PAPER, (91, 1628))
    img.paste(C.V1.crop((90, 1620, 1191, 1630)), (90, 1620))
    icon = Image.open(TRUTH / "icon-seven.png").convert("RGBA").resize((190, 190), Image.LANCZOS)
    im_mask = Image.new("L", (190, 190), 0)
    ImageDraw.Draw(im_mask).ellipse([0, 0, 190, 190], fill=255)
    img.paste(icon, (640 - 95, 1731 - 95), im_mask)
    img.paste(C.V1, (0, 0), C.RING_MASK)
    img.paste(C.ORN, (55, 65), C.ORN)
    img.paste(C.ORN.transpose(Image.FLIP_LEFT_RIGHT), (940, 65), C.ORN.transpose(Image.FLIP_LEFT_RIGHT))
    img.paste(C.ORN.transpose(Image.FLIP_TOP_BOTTOM), (55, 1580), C.ORN.transpose(Image.FLIP_TOP_BOTTOM))
    img.paste(C.ORN.transpose(Image.ROTATE_180), (940, 1580), C.ORN.transpose(Image.ROTATE_180))
    C.draw_name(img, "顔役")
    paste_plate(img, 7, 2)
    img.save(OUT, "WEBP", quality=92)
    print("saved", OUT)

if __name__ == "__main__":
    build()
