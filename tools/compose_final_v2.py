"""24ドボン カード面「最終デザイン」全カード生成（2026-11-13）

カジノ完成見本（compose_final.py）の作り方を全48面に一般化したもの。
- 土台・名前欄・枠・効果エリアの紙は compose_final.py と完全同一の処理
- イラストは承認済みシーン原画を窓 (91,259)-(1190,1622) に余白なく配置
  配置は build_faces.py の PLACE（subj_frac, target）を尊重し、それ以外は
  カジノと同じ「下端94.5%」ルール
- 鉄板は plate-v2-sprite.png をブランク化し、数字・矢印・札束を描き直す
- 効果アイコンは確定済み原画から円盤を切り出し、直径210pxで下帯中央へ
"""
import pathlib
from PIL import Image, ImageDraw, ImageFilter, ImageFont
import numpy as np
from scipy import ndimage

BASE = pathlib.Path.home() / "workspace/goals/24-dobon-digital-web-version/files"
DM = BASE / "design-mocks"
S = BASE / "card-art-v2"
OUT = DM / "final-faces"
OUT.mkdir(parents=True, exist_ok=True)

V1 = Image.open(S / "media-generation-dobon-card-24-casino-aged-v1-0-6e6891ef-0177-440d-a781-93c1f214256a.webp").convert("RGB")
V3 = Image.open(S / "media-generation-dobon-card-24-casino-aged-v3-0-934169ad-aa8d-4383-9589-8f9e9dd47d86.webp").convert("RGB")
V2 = Image.open(S / "media-generation-dobon-card-24-casino-aged-v2-0-99687f9f-917b-4f71-97bc-c7a7b3869b01.webp").convert("RGB")
SERIF = "/usr/share/fonts/opentype/noto/NotoSerifCJK-Bold.ttc"

# ============================================================ 土台（compose_final と同一）
def flatten_paper(region_img, radius=25, strength=0.85):
    a = np.asarray(region_img).astype(float)
    blur = np.asarray(region_img.filter(ImageFilter.GaussianBlur(radius))).astype(float)
    mean = blur.mean(axis=(0, 1))
    out = a / np.maximum(blur, 1.0) * mean
    res = a * (1 - strength) + out * strength
    return Image.fromarray(np.clip(res, 0, 255).astype(np.uint8))

def make_base():
    img = V1.copy()
    for box in [(0, 0, 1280, 60), (0, 1860, 1280, 1920), (0, 0, 56, 1920), (1224, 0, 1280, 1920)]:
        reg = img.crop(box)
        img.paste(Image.blend(reg, flatten_paper(reg, radius=120, strength=1.0), 0.8), (box[0], box[1]))
    # band: interpolation fill + transplanted grain from clean region
    band = V1.crop((86, 84, 1194, 266))
    bs = (np.asarray(band).astype(float) * 0.68
          + np.asarray(band.filter(ImageFilter.GaussianBlur(16))).astype(float) * 0.32)
    x0, x1 = 445 - 86, 815 - 86
    for yy in range(bs.shape[0]):
        c0 = bs[yy, x0]; c1 = bs[yy, x1]
        t = np.linspace(0, 1, x1 - x0)[:, None]
        bs[yy, x0:x1] = c0[None, :] * (1 - t) + c1[None, :] * t
    band_img = Image.fromarray(bs.astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.7))
    bs2 = np.asarray(band_img).astype(float)
    detail_src = bs - np.asarray(Image.fromarray(bs.astype(np.uint8)).filter(ImageFilter.GaussianBlur(6))).astype(float)
    rng = np.random.default_rng(3)
    for start in range(x0, x1, 120):
        sx = rng.integers(760, 950)
        wseg = min(120, x1 - start)
        bs2[:, start:start + wseg] += detail_src[:, sx:sx + wseg] * 0.8
    band = Image.fromarray(np.clip(bs2, 0, 255).astype(np.uint8))
    img.paste(band, (86, 84))
    return img

def _match_rows(top_img, bot_img, rows=10, fade=0.7):
    """下ブロックの上端の色調を上ブロックの下端に合わせ、継ぎ目の段差を消す。"""
    from scipy import ndimage as _ndi
    t = np.asarray(top_img).astype(float)
    b = np.asarray(bot_img).astype(float)
    tm = _ndi.gaussian_filter(t[-rows:].mean(0), (30, 0))
    bm = _ndi.gaussian_filter(b[:rows].mean(0), (30, 0))
    off = (tm - bm)[None, :, :]
    ramp = (1 - np.linspace(0, fade, b.shape[0]))[:, None, None]
    return Image.fromarray(np.clip(b + off * ramp, 0, 255).astype(np.uint8))


def effect_paper():
    # 反転タイルは汚れが鏡合わせになるため廃止。実在の紙2種を回転・切り出しでつなぐ。
    # 上下は122pxずつを38px重ねてぼかす（合計206px）。
    stripA = flatten_paper(V1.crop((480, 284, 1180, 356)).resize((700, 122)))
    stripB700 = flatten_paper(V3.crop((760, 1680, 1160, 1770)).resize((700, 122)))
    stripB398 = flatten_paper(V3.crop((760, 1680, 1160, 1770)).resize((398, 122)))
    top = Image.new("RGB", (1098, 122))
    top.paste(stripA, (0, 0))
    top.paste(stripB398, (700, 0))
    bottom = Image.new("RGB", (1098, 122))
    bottom.paste(stripA.transpose(Image.ROTATE_180), (0, 0))
    bottom.paste(stripB700.crop((302, 0, 700, 122)), (700, 0))
    bottom = _match_rows(top, bottom)
    paper = Image.new("RGB", (1098, 206))
    paper.paste(top, (0, 0))
    vmask = Image.fromarray(np.tile(np.linspace(0, 255, 38).astype(np.uint8)[:, None], (1, 1098)), "L")
    paper.paste(bottom.crop((0, 0, 1098, 38)), (0, 84), vmask)
    paper.paste(bottom.crop((0, 38, 1098, 122)), (0, 122))
    hmask = Image.fromarray(np.tile(np.linspace(0, 255, 49).astype(np.uint8)[None, :], (206, 1)), "L")
    right = Image.new("RGB", (49, 206))
    right.paste(top.crop((700, 0, 749, 122)), (0, 0))
    right.paste(bottom.crop((700, 38, 749, 122)), (0, 122))
    paper.paste(right, (676, 0), hmask)
    return paper

PAPER = effect_paper()
RING_MASK = Image.open(DM / "frame-v1-ring-mask.png")
ORN = Image.open(DM / "frame-v1-ornament-tl.png")

def draw_name(img, name):
    d = ImageDraw.Draw(img)
    font = ImageFont.truetype(SERIF, 92)
    spacing = 20
    widths = [d.textlength(ch, font=font) for ch in name]
    total = sum(widths) + spacing * (len(name) - 1)
    cx = (524 + 1164) // 2; cy = (90 + 255) // 2
    x = cx - total / 2
    for ch, wch in zip(name, widths):
        bb = d.textbbox((0, 0), ch, font=font)
        d.text((x - bb[0], cy - (bb[3] - bb[1]) / 2 - bb[1]), ch, font=font, fill=(22, 12, 5))
        x += wch + spacing

# ============================================================ 鉄板
SPRITE = Image.open(DM / "plate-v2-sprite.png")  # RGBA 490x500

def blank_plate_rgb():
    """数字・矢印・札束を消した鉄板（RGB）。plate_sprite.py の下段処理を踏襲。"""
    sp = SPRITE.convert("RGB")
    # upper section: erase number + chevron by interpolation through plain-metal
    # anchor columns (x=56 left / x=261 middle gap / x=383 right). Anchors are
    # local means (vertically smoothed to avoid stripes), field is blurred,
    # pasted with a feathered mask, then fine grain is added.
    a = np.asarray(sp).astype(float)
    X0, X1, Y0, Y1 = 54, 384, 126, 303
    H, W = Y1 - Y0 + 1, X1 - X0 + 1
    def anchor_col(x):
        strip = a[Y0:Y1 + 1, x - 2:x + 3].mean(axis=1)
        return ndimage.gaussian_filter1d(strip, 6, mode="nearest")
    cols = {X0: anchor_col(X0), 261: anchor_col(261), X1: anchor_col(X1)}
    field = np.zeros((H, W, 3))
    xs_line = np.arange(X0, X1 + 1)
    for ch in range(3):
        anch = np.stack([cols[X0][:, ch], cols[261][:, ch], cols[X1][:, ch]], axis=1)
        for yy in range(H):
            field[yy, :, ch] = np.interp(xs_line, [X0, 261, X1], anch[yy])
    field = ndimage.gaussian_filter(field, (2.2, 2.2, 0), mode="nearest")
    rng = np.random.default_rng(5)
    field += rng.normal(0, 2.2, (H, W, 1))
    fill = Image.fromarray(np.clip(field, 0, 255).astype(np.uint8))
    fmask = Image.new("L", (W, H), 255)
    fa = np.asarray(fmask).astype(float)
    for yy in range(H):
        fa[yy, :] *= min(1.0, yy / 7, (H - 1 - yy) / 7)
    for xx in range(W):
        fa[:, xx] *= min(1.0, xx / 7, (W - 1 - xx) / 7)
    sp.paste(fill, (X0, Y0), Image.fromarray(np.clip(fa, 0, 255).astype(np.uint8)))
    # lower section: plain metal derived from the erased upper metal.
    # (旧 plate_sprite.py のタイル素材 V2(372,330)-(462,420) は「点」の字画を含み、
    #  タイルするとスリット状の帯になったため廃止。2026-11-13 修正)
    strip = sp.crop((54, 196, 384, 300))  # 330x104 glyph-free erased metal
    patch = Image.new("RGB", (404, 104))
    patch.paste(strip, (0, 0))
    patch.paste(strip.transpose(Image.FLIP_LEFT_RIGHT).crop((0, 0, 74, 104)), (330, 0))
    # 質感付け: 補間面は平坦すぎて「貼った板」に見えるため、鍛造のむら・粒子・傷を足す
    arr = np.asarray(patch).astype(float) * 0.94
    rng = np.random.default_rng(11)
    mottle = ndimage.gaussian_filter(rng.normal(0, 1, (104, 404)), (6, 10))
    mottle /= (np.abs(mottle).max() + 1e-6)
    arr *= (1 + 0.10 * mottle[..., None])
    arr += rng.normal(0, 3.0, (104, 404))[..., None]
    patch = Image.fromarray(arr.clip(0, 255).astype(np.uint8))
    d = ImageDraw.Draw(patch, "RGBA")
    for _ in range(46):
        x0, y0 = rng.uniform(0, 404), rng.uniform(0, 104)
        ln = rng.uniform(12, 90)
        ang = rng.uniform(-0.25, 0.25) + (0 if rng.random() < 0.7 else 1.35)
        x1, y1 = x0 + ln * np.cos(ang), y0 + ln * np.sin(ang)
        if rng.random() < 0.55:
            col = (210, 205, 190, int(rng.uniform(10, 30)))
        else:
            col = (8, 8, 10, int(rng.uniform(10, 26)))
        d.line([(x0, y0), (x1, y1)], fill=col, width=1)
    pa = np.zeros((104, 404))
    for yy in range(104):
        for xx in range(404):
            f = min(1.0, yy / 12, (103 - yy) / 12, xx / 12, (403 - xx) / 12)
            pa[yy, xx] = int(255 * max(0.0, f))
    sp.paste(patch, (42, 328), Image.fromarray(pa.astype(np.uint8)))
    return sp

BLANK_PLATE = blank_plate_rgb()
PLATE_ALPHA = np.asarray(SPRITE)[..., 3].copy()

def extract_chevron():
    """元スプライトの青鋼シェブロン（下矢印）を RGBA で切り出す（実測 bbox (272,131)-(360,267)）。"""
    a = np.asarray(SPRITE).astype(int)
    rgb, alpha = a[..., :3], a[..., 3]
    R, G, B = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    lum = rgb.mean(axis=2)
    region = np.zeros(lum.shape, bool)
    region[132:304, 256:368] = True
    cand = region & (alpha > 128) & (
        (((B - R) > 24) & (lum > 60)) | ((lum > 145) & ((R - B) < 50)) | (((B - R) > 12) & (lum > 38) & (B > G)))
    lab, n = ndimage.label(cand)
    keep = np.zeros_like(cand)
    for i in range(1, n + 1):
        comp = lab == i
        if comp.sum() >= 80:
            keep |= comp
    keep = ndimage.binary_dilation(keep, iterations=1)
    ys, xs = np.where(keep)
    box = (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)
    chev_alpha = Image.fromarray((keep * 255).astype(np.uint8)).crop(box).filter(ImageFilter.GaussianBlur(0.8))
    chev = SPRITE.convert("RGB").crop(box)
    rgba = chev.convert("RGBA"); rgba.putalpha(chev_alpha)
    return rgba, box

CHEVRON, CHEV_BOX = extract_chevron()  # 旧抽出は参照用（配置実測の出所）

# ===== 鉄板フロー（2026-11-13 本人提示の手順で再構成）=====
# 1. 鉄板を正位置にする（仕切り線の傾き -2度を打ち消す）
# 2. 正位置のまま数字・矢印・札束を配置する
# 3. 鉄板一式を固定し、角度（-2度）を付けてカードに配置する
# 実装: 部品は完成品アセットを使い、正位置レイヤーに組んでから一括で
# 傾けてブランク鉄板へ載せる（鉄板のピクセル自体は回転で劣化させない）。
TILT = 2.0  # PIL 角度（正=反時計回り）。実測: PIL rotate(-2.0) で仕切り線が水平になる
CHEV_UP_PART = Image.open(DM / "chevron-up-vermillion-v2.png").resize((88, 136), Image.LANCZOS)
CHEV_DOWN_PART = Image.open(DM / "chevron-down-steel-v2.png").resize((88, 136), Image.LANCZOS)
BILL_ROWS = {n: Image.open(DM / f"bill-row-{n}.png") for n in (1, 2, 5)}

def _straight_anchor(x, y):
    """傾いた鉄板座標の点を、正位置レイヤー座標へ移す（マーカー回転で実測変換）。"""
    m = Image.new("L", (490, 500), 0)
    ImageDraw.Draw(m).ellipse([x - 3, y - 3, x + 3, y + 3], fill=255)
    m = m.rotate(-TILT, resample=Image.BICUBIC, center=(245, 250))
    ys, xs = np.where(np.asarray(m) > 100)
    return float(xs.mean()), float(ys.mean())


def _num_layer(text):
    """数字を透明レイヤーに描き、字高130px・横0.88圧縮（元の「24」インク実測 176x130 に合わせる）。"""
    f = ImageFont.truetype(SERIF, 200)
    bb = ImageDraw.Draw(Image.new("RGB", (10, 10))).textbbox((0, 0), text, font=f)
    font = ImageFont.truetype(SERIF, int(200 * 130 / (bb[3] - bb[1])))
    layer = Image.new("RGBA", (340, 190), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    bb = d.textbbox((0, 0), text, font=font)
    d.text(((340 - (bb[2] - bb[0])) / 2 - bb[0], (190 - (bb[3] - bb[1])) / 2 - bb[1]),
           text, font=font, fill=(232, 218, 182, 255))
    box = layer.getbbox()
    layer = layer.crop(box)
    layer = layer.resize((max(1, int(layer.width * 0.88)), layer.height), Image.LANCZOS)
    return layer

NUM_ANCHOR_S = _straight_anchor(164, 226)          # 数字の中心
CHEV_ANCHOR_S = _straight_anchor(CHEV_BOX[0], CHEV_BOX[1])  # 矢印の左上
BILL_ANCHOR_S = _straight_anchor(245, 382)         # 札束列の中心

def make_plate(num, up, points):
    # --- 正位置レイヤーに部品を配置 ---
    layer = Image.new("RGBA", (490, 500), (0, 0, 0, 0))
    nl = _num_layer(str(num))
    layer.paste(nl, (int(NUM_ANCHOR_S[0] - nl.width // 2), int(NUM_ANCHOR_S[1] - nl.height // 2)), nl)
    row = BILL_ROWS[points]
    row = row.resize((row.width // 4, row.height // 4), Image.LANCZOS)
    layer.paste(row, (int(BILL_ANCHOR_S[0] - row.width // 2), int(BILL_ANCHOR_S[1] - row.height // 2)), row)
    # --- 固定して角度を付け、ブランク鉄板へ ---
    tilted = layer.rotate(TILT, resample=Image.BICUBIC, center=(245, 250))
    sp = BLANK_PLATE.copy().convert("RGBA")
    sp.paste(tilted, (0, 0), tilted)
    if up is not None:
        # 矢印は傾けない（2026-11-13 本人指示: 方向記号が傾くのは気持ち悪い）
        chev = CHEV_UP_PART if up else CHEV_DOWN_PART
        sp.paste(chev, (CHEV_BOX[0], CHEV_BOX[1]), chev)
    alpha = PLATE_ALPHA.copy()
    alpha[40:132, 0:128] = 0  # 左上の破片除去（カジノ見本どおり）
    sp.putalpha(Image.fromarray(alpha))
    return sp

# ============================================================ 効果アイコン（円盤切り出し→直径210）
def _disc(src_img, cx, cy, side):
    crop = src_img.crop((cx - side // 2, cy - side // 2, cx + side // 2, cy + side // 2))
    return crop.resize((210, 210))

def load_icons():
    sheet = Image.open(DM / "media-generation-dobon-effect-icons-set-v4-0-0d70255e-30c3-4597-b453-4bb3b75522b3.webp").convert("RGB")
    draw2 = Image.open(DM / "media-generation-dobon-effect-icon-draw2-v2-0-59990e57-99cd-4f01-bf4e-5801c4f238a3.webp").convert("RGB")
    direct = Image.open(DM / "media-generation-dobon-effect-icon-direct-v2-0-a6fd25ae-c78d-4c6c-89bc-e32fe4f1f3be.webp").convert("RGB")
    icons = {
        # SUIT: aged v3 から中心 (641,1710)・半径105（カジノ見本と同一）
        "suit": V3.crop((641 - 105, 1710 - 105, 641 + 105, 1710 + 105)).resize((210, 210)),
        # 実測した円盤中心・直径（放射プロファイル／暗部bbox）で切り出し
        "draw2": _disc(draw2, 800, 828, 1240),
        "direct": Image.open(DM / "effect-icon-seven-brass-straight.png").convert("RGB").resize((210, 210)),
        # 円盤中心はシート実測（暗部連結成分）: DRAW5 (959,656) / REVEAL (1714,657)、
        # 外径約360・影ぶん中心は約17px上。旧値 (929,523)/(1535,516) はズレており廃止。
        "draw5": _disc(sheet, 959, 639, 366),
        "reveal": _disc(sheet, 1714, 639, 366),
    }
    return icons

ICONS = load_icons()
ICON_MASK = Image.new("L", (210, 210), 0)
ImageDraw.Draw(ICON_MASK).ellipse([0, 0, 210, 210], fill=255)

# ============================================================ シーン配置
WIN = (91, 259, 1190, 1622)

def paste_scene(img, scene_path, place=None):
    sc = Image.open(scene_path).convert("RGB")
    tw, th = WIN[2] - WIN[0], WIN[3] - WIN[1]
    s = max(tw / sc.width, th / sc.height)
    sc = sc.resize((int(sc.width * s), int(sc.height * s)))
    ox = (sc.width - tw) // 2
    if place is not None:
        oy = int(place[0] * sc.height - place[1] * th)
    else:
        oy = int(sc.height * 0.945) - th
    oy = max(0, min(oy, sc.height - th))
    img.paste(sc.crop((ox, oy, ox + tw, oy + th)), (WIN[0], WIN[1]))

# ============================================================ 面の定義（build_faces.py が正）
DAY = {1: "media-generation-dobon-scene-1-day-0-37371336-b2df-43fc-a802-0dc4b0910f9f.webp",
       2: "scene-2-day-midtone.webp",
       3: "media-generation-dobon-scene-3-day-0-bd55f22a-a2d3-40bf-9154-be49dce9684f.webp",
       4: "media-generation-dobon-scene-4-day-0-64bf9824-34e9-4565-8c2e-5d51146c9592.webp",
       5: "media-generation-dobon-scene-5-day-0-f81de872-60a0-412a-bd82-d2f26778727a.webp",
       6: "media-generation-dobon-scene-6-day-0-56372d79-010d-411f-b7fc-35693e9acfe9.webp",
       7: "media-generation-dobon-scene-7-day-0-6e89c130-e521-427c-9a62-75ab467aa773.webp",
       8: "media-generation-dobon-scene-8-day-0-7caa46ca-3219-4b2b-be92-dae43842ae0c.webp",
       9: "media-generation-dobon-scene-9-day-0-5e74f36a-d82e-4159-b394-253df5e39ee2.webp",
       10: "media-generation-dobon-scene-10-day-0-b4ac7306-55e0-48b8-992a-c498658a3afe.webp",
       # 11昼は家のスケール修正版（2026-11-13 本人指示: 人物のサイズを基準に家を大きく。
       # 旧原画は家がミニチュアに見えた。構図・画調は同一）
       11: "media-generation-scene-11-day-housefix-0-8cf6e27b-49d6-4266-987b-5af0fc04df70.webp",
       12: "media-generation-dobon-scene-12-day-0-c7778e1d-77f8-4ecb-ab89-fb8c4ce2ab81.webp"}
NIGHT = {1: "media-generation-dobon-scene-1-night-0-49a68dc8-5509-4778-a935-4a1a3ed75322.webp",
         2: "scene-2-night-dark.webp",
         3: "media-generation-dobon-scene-3-night-0-03a739b0-1265-464c-99c4-4f3e1a253eb2.webp",
         4: "media-generation-dobon-scene-4-night-0-acef32ff-9f54-4f53-94fc-50b5131d8d0c.webp",
         5: "media-generation-dobon-scene-5-night-0-c9d0e6fb-e9ca-45af-ba53-cd76fa8e9395.webp",
         6: "media-generation-dobon-scene-6-night-0-a4698b95-20da-4a45-bb9c-bc81f97b79e4.webp",
         7: "media-generation-dobon-scene-7-night-0-224afa2f-3cf1-4421-9f93-95645d74bb63.webp",
         8: "media-generation-dobon-scene-8-night-0-ed85cc00-cdfe-4a5b-82bd-83ca63c60d91.webp",
         9: "media-generation-dobon-scene-9-night-0-aac19b27-d2f3-409b-aa93-e8a9b941cbd7.webp",
         10: "scene-10-night-dark.webp",
         11: "media-generation-dobon-scene-11-night-0-6f6dc9cb-d5f9-4d14-897b-1aaeb22d0589.webp",
         12: "scene-12-night-v5-dark.webp"}
NAMES = {0: "修道院", 1: "共同水道", 2: "荷運び", 3: "場末の酒場", 4: "露天市", 5: "検問の橋",
         6: "裏口", 7: "顔役", 8: "情報屋", 9: "荷下ろし", 10: "高級クラブ", 11: "見張り", 12: "大銀行"}
POINTS = {0: 5, 1: 1, 2: 2, 3: 1, 4: 1, 5: 1, 6: 1, 7: 2, 8: 1, 9: 1, 10: 1, 11: 2, 12: 1, 24: 5}
ICON_FOR = {0: "suit", 2: "draw2", 7: "direct", 11: "reveal", 24: "suit"}
PLACE = {("B", 6): (0.946, 0.974)}
# 6夜は原画の NIGHT（実測 0.937-0.955）が 94.5% ルールだと下端で半分切れるため、
# 単語中心 0.946 を窓の 0.974 に置いて全文が見えるよう調整（2026-11-13 生成時の判断）
# 黒スート面の NIGHT 全文表示（2026-11-13 修正）: 各夜原画の単語位置（場面高さ比率・実測）をもとに、
# 単語下端が窓の 0.988 に来る最小のずらしを設定。単語位置: 1夜 0.943-0.968 / 2夜 0.955-0.977 /
# 3夜 0.952-0.977 / 4夜 0.952-0.974 / 5夜 0.960-0.983 / 7夜 0.950-0.974 / 8夜 0.944-0.973 /
# 9夜 0.960-0.978 / 10夜 0.968-0.982 / 11夜 0.949-0.973 / 12夜 0.963-0.980。
# ずらし量（oy の増加分・原画高さ比）: 1:+67(3.0%) 2:+87(4.0%) 3:+87(4.0%) 4:+80(3.6%)
# 5:+619(28.2%・従来配置は橋主体で単語が窓外だったため大幅) 7:+80(3.6%) 8:+78(3.5%)
# 9:+89(4.0%) 10:+260(11.8%) 11:+78(3.5%) 12:+139(6.3%)。
# 黒スート面のうち 1・2・3・4・7・8・9・11 は配置を既定（下端94.5%）に戻した
# （2026-11-13 本人指示: 単語のためにずらしたイラストは全て元に戻し、NIGHT を入れる）。
# 原画の単語は窓外になるため、STAMP_FACES で打ち直す。6 のみ生成時の調整で原画の単語が見えている。
# 承認済み構図の復元（2026-11-13 本人指示）: 5・10・12 は承認済みの切り取り位置が正。
# 単語のために構図をずらすのは不可（5夜の大切な情報は小屋・橋・道）。
# NIGHT は承認済み構図の中へ打ち直す（下の STAMP_FACES）。build_faces.py の PLACE が正。
PLACE.update({
    ("B", 5): (0.30, 0.34), ("B", 10): (0.665, 0.667), ("B", 12): (0.80, 0.80)})

# 承認済み構図では原画の NIGHT が窓外になる面: 単語を窓の下部中央に打ち直す
STAMP_FACES = {"face-5-B-up", "face-5-B-down", "face-10-B-up", "face-10-B-down",
               "face-12-B-down", "face-1-B-up-draw5",
               "face-1-B-up", "face-2-B-up", "face-2-B-down", "face-3-B-up", "face-3-B-down",
               "face-4-B-up", "face-4-B-down", "face-7-B-up", "face-7-B-down",
               "face-8-B-up", "face-8-B-down", "face-9-B-up", "face-9-B-down",
               "face-11-B-down"}

def stamp_night(img):
    """旧 compose_cards.py の night_word と同じ作法（N I G H T / セリフ / 金色）。"""
    d = ImageDraw.Draw(img, "RGBA")
    f = ImageFont.truetype(SERIF, 52)
    t = "N I G H T"
    bb = d.textbbox((0, 0), t, font=f)
    d.text(((1280 - (bb[2] - bb[0])) / 2 - bb[0], 1548), t, font=f, fill=(216, 188, 120, 235))

# 白スート（昼）の印は DAY（2026-11-13 本人決定）。NIGHT と同位置・同書体、
# 明るい絵で読めるよう濃いセピアで打ち込む。対象は W 面すべて（0 と 24 は無地スートのため対象外）。
DAY_STAMP_FACES = {"face-1-W-up", "face-2-W-up", "face-12-W-down"} | {
    f"face-{n}-W-{a}" for n in range(3, 12) for a in ("up", "down")}

def stamp_day(img):
    d = ImageDraw.Draw(img, "RGBA")
    f = ImageFont.truetype(SERIF, 52)
    t = "D A Y"
    bb = d.textbbox((0, 0), t, font=f)
    d.text(((1280 - (bb[2] - bb[0])) / 2 - bb[0], 1548), t, font=f, fill=(84, 60, 30, 230))

# (out, scene, name, num, up, points, icon, place)
FACES = []
FACES.append(("face-0", "media-generation-dobon-scene-0-monastery-0-13b7326c-fcdb-447e-ab2c-7e3588c73e58.webp",
              NAMES[0], 0, None, 5, "suit", None))
FACES.append(("face-1-W-up", DAY[1], NAMES[1], 1, True, 1, None, None))
FACES.append(("face-1-B-up", NIGHT[1], NAMES[1], 1, True, 1, None, PLACE.get(("B", 1))))
# 密書: game.js のデッキ定義（1は全て up、draw5 黒1も B-up）が正。矢印は上。
# 配置は承認済み (0.47, 0.50) が正。NIGHT は STAMP_FACES で打ち直す。
FACES.append(("face-1-B-up-draw5", "scene-1black-letter-v8-dark.webp", "密書", 1, True, 5, "draw5", (0.47, 0.50)))
FACES.append(("face-2-W-up", DAY[2], NAMES[2], 2, True, 2, "draw2", None))
FACES.append(("face-2-B-up", NIGHT[2], NAMES[2], 2, True, 2, "draw2", PLACE.get(("B", 2))))
FACES.append(("face-2-B-down", NIGHT[2], NAMES[2], 2, False, 2, "draw2", PLACE.get(("B", 2))))
for n in range(3, 11):
    for suit, scenes in (("W", DAY), ("B", NIGHT)):
        for arrow in ("up", "down"):
            FACES.append((f"face-{n}-{suit}-{arrow}", scenes[n], NAMES[n], n, arrow == "up",
                          POINTS[n], ICON_FOR.get(n), PLACE.get((suit, n))))
FACES.append(("face-11-W-up", DAY[11], NAMES[11], 11, True, 2, "reveal", None))
FACES.append(("face-11-W-down", DAY[11], NAMES[11], 11, False, 2, "reveal", None))
FACES.append(("face-11-B-down", NIGHT[11], NAMES[11], 11, False, 2, "reveal", PLACE.get(("B", 11))))
FACES.append(("face-12-W-down", DAY[12], NAMES[12], 12, False, 1, None, None))
FACES.append(("face-12-B-down", NIGHT[12], NAMES[12], 12, False, 1, None, PLACE[("B", 12)]))
FACES.append(("face-24-casino", "scene-24-casino-v1art.webp",
              "カジノ", 24, False, 5, "suit", None))
FACES.append(("face-24-tower", "scene-24-tower-v7-tuned.webp", "高層タワー", 24, False, 5, "suit", (0.755, 0.85)))
FACES.append(("face-24-hq", "media-generation-dobon-scene-24-hq-crestfix-0-5bde1a27-816e-4199-b20d-37018745978e.webp",
              "本部", 24, False, 5, "suit", None))
FACES.append(("face-24-hq-night", "media-generation-dobon-scene-24-hq-night-0-6f17cb58-eadb-4fb9-b2f9-c40a90644e54.webp",
              "本部", 24, False, 5, "suit", None))

def build(face):
    out_name, scene, name, num, up, points, icon, place = face
    img = make_base()
    paste_scene(img, S / scene, place)
    if out_name in STAMP_FACES:
        stamp_night(img)
    if out_name in DAY_STAMP_FACES:
        stamp_day(img)
    img.paste(PAPER, (91, 1628))
    img.paste(V1.crop((90, 1620, 1191, 1630)), (90, 1620))
    if icon:
        img.paste(ICONS[icon], (640 - 105, 1731 - 105), ICON_MASK)
    img.paste(V1, (0, 0), RING_MASK)
    img.paste(ORN, (55, 65), ORN)
    img.paste(ORN.transpose(Image.FLIP_LEFT_RIGHT), (940, 65), ORN.transpose(Image.FLIP_LEFT_RIGHT))
    img.paste(ORN.transpose(Image.FLIP_TOP_BOTTOM), (55, 1580), ORN.transpose(Image.FLIP_TOP_BOTTOM))
    img.paste(ORN.transpose(Image.ROTATE_180), (940, 1580), ORN.transpose(Image.ROTATE_180))
    draw_name(img, name)
    plate = make_plate(num, up, points)
    img.paste(plate, (30, 0), plate)
    out = OUT / f"{out_name}.webp"
    img.save(out, "WEBP", quality=92)
    print("saved", out.name, "<-", scene)
    return out_name, scene

if __name__ == "__main__":
    for f in FACES:
        build(f)
    print("faces:", len(FACES))
