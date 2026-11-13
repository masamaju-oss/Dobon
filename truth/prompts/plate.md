---
状態: 確定（2026-11-14、aged v2 の再測定値を追記。本人が aged v2 を鉄板の正の基準として再確認）
出所: files/iron-plate-spec.md（作業場の蓄積）＋ 2026-11-14 の原画再測定
注意: 数値の実行上の正は合成スクリプト（tools/）。破棄されたスプライト由来の数値は使わない。
---

## aged v3 の位置づけ（2026-11-14 0時、本人決定・範囲を本人が明示）

- **aged v3 で正なのは、紙質・汚れ具合・色合いの3点のみ**。枠・名前欄・レイアウトなど他の要素の正は従来どおり（枠デザインと名前欄エリアの色合いは aged v1 が正）。
- 紙質・汚れ・色合いで aged v3 と競合する過去のものは破棄する。

# 数字鉄板パネル仕様（生成プロンプト再現レベル）

**カードのベースデザイン = 24カジノ aged v3**（`card-art-v2/media-generation-dobon-card-24-casino-aged-v3-0-934169ad-aa8d-4383-9589-8f9e9dd47d86.webp`）。2026-11-13に本人が明示（モカが v2 をベースとして提示したのを訂正）。カード全体の型・風合いは v3 が正。
**紙質は v3 のもの**（2026-11-13 本人決定）。**場所名の欄は v3 の上に濃い茶褐色を乗せて作る**（文字は生成り。サンプル: `design-mocks/base-v3-darkband-sample.png`）。
**鉄板の正規デザイン＆正規配置は aged v2 の鉄板**（下記。2026-11-13に本人が再確認）。
**枠デザインと名前欄エリアの色合いは aged v1 が正**（2026-11-13 本人決定。下記「枠デザインと名前欄エリアの色合い（aged v1 基準・完全言語化）」を参照）。v3 由来の枠抽出見本・真鍮化見本は参考に降格する。

確定: 2026-11-13。基準サンプル = 24カジノ aged v2（`card-art-v2/media-generation-dobon-card-24-casino-aged-v2-0-99687f9f-917b-4f71-97bc-c7a7b3869b01.webp`）。
本人が「鉄板デザイン及び配置は24が最適・採用」と決定。矢印デザインもこの24のものを上下矢印の正式デザインとして採用。

## 配置・角度・大きさ
- カード左上に配置。パネル上端はカードの上端（タイトル帯の上辺ライン付近）に接し、上辺から吊り下がる形で重なる。パネルの左辺はカード内枠の左ラインにほぼ揃う。
- 角度: **基準線は鉄板内の仕切り線**とし、正規サンプル（aged v2）実測で **約-2度（反時計回り・右上がり）**。2026-11-13に本人の指示でこの基準線に変更して再計測した値（旧記述の「回転なし0度」は上辺基準の甘い測定で訂正）。仕切り線自体は生成画の描画ばらつきで±2度程度振れる。合成時は仕切り線が-2度になるよう鉄板全体を回す。
- 大きさ: カード幅の約32〜34%、カード高さの約27〜29%。標準インデックスタブ比で1.2倍。
- 重なり: タイトル帯の左端と、中央の風景エリアの左上に重なって前面に出る（風景より手前）。

## 鉄板そのもののデザイン
- 素材: 暗い鉄板。つや消しの黒鉄〜ダークグレー（中心部は青灰寄りに少し明るく、周縁は黒に近づく）。表面にブラシ目（細かい擦り傷の流れ）と、所々に薄い錆・擦れ。
- 形状: 下記の「輪郭の完全言語化」が正。縦長の盾／吊り看板型だが、直線だけで作る単純な五角形ではない。
- 内部は2段構成で、段の境目に水平の仕切りライン（下記）。

## 輪郭の完全言語化（aged v2 実測・2026-11-13 本人指示で追加）
本番実装の鉄板が「長方形＋下の三角」という単純な五角形に単純化され面白みがなくなっている、との本人の指摘を受け、正規サンプル aged v2（24カジノ aged v2 本体と plate-crop-v2.png 拡大、および同型の 1白 aged v2）から輪郭を読み直した記録。比率は鉄板本体の幅を100、高さを100とする（吊り帯・輪は高さに含めない）。数値は目視実測で ±3 程度の幅を持つ。

### 全体比率
- 本体は幅:高さ ≒ 100:135 前後（カード上では幅がカード幅の約32〜34%、高さがカード高さの約27〜29%）。
- 左右は完全な平行ではない。肩付近が最も張り出し、下部は下隅に向けてわずか（約3%）にすぼまる。全体に手鍛えのわずかな非対称を残す（左右の肩の高さ・下隅の張り出しが数%ずれる程度。ベクター図形のような完全対称・完全な直線は不可）。

### 吊り金具（上部）
- カードの上端から、幅が鉄板幅の約9%の暗い鉄の帯（ストラップ）が垂直に降りてくる。帯の下端は輪に繋がる。
- 輪（リング）: 外径は鉄板幅の約14%、内径は約8%、太さ約3%。鉄板上辺中央の半円形の張り出し（タブ）に開いた穴を通り、輪の下半分はタブに埋まり、上半分がタブの上に出る。輪はカードの上辺ラインをまたぐ位置にある。
- 中央タブ: 幅は鉄板幅の約20%、上辺ラインから約6%の高さだけ半円〜緩いアーチ状に盛り上がる。頂点に穴があり、輪が通る。

### 上辺（中央タブから左右の肩へ）
- タブの左右では、辺は一度 内側に concave に沈む（鞍部。深さ約2〜3%）。
- 鞍部の外側で、辺は小さな convex の膨らみ（肩の瘤）を作る。肩の瘤の上に球形リベットが1個乗る。
- 上隅は直角ではない。外側へ小さく張り出した「耳」状の段差（ステップ）で角を取り、耳の先端付近にリベットが付く。角の外形は約45度に落とした面取り＋小さな丸み。

### 側辺（肩から下隅へ）
- 上隅の直下に、深さ約2%の concave な咬み込み（ノッチ）が入る。ノッチの上下にリベットが近接して並ぶ場所がある（左辺上部で顕著）。この段差が単調な直線を崩している。
- 側辺の主部はほぼ垂直だが、中央付近で約1〜2%だけ外へ膨らむ緩い弧。仕切りラインの高さ付近で、辺にごく小さな段（キンク）が入る。
- 下段では側辺は下隅へ向けてわずかに内へ傾く。

### 下隅と下辺
- 下隅は内側へ丸く収めない。外側へ小さく尖って張り出した「耳」で終わり、耳の付近にリベットが乗る。耳の下面から下辺へ折り返す。
- 下辺は直線ではない。左右の下隅から中央へ向けて、2つの concave な弧（浅い逆アーチ）が連なり、中央で出会って下向きの浅い尖り（カスプ）を作る W 字に近いオージー曲線。中央の尖りが鉄板の最下点で、下隅のラインより約5〜6%だけ低い。
- 中央の尖りの直上（フチの上）に球形リベットが1個ある。1白 aged v2 の同型鉄板では、この中央の尖りの先に小さな葉形の飾り（フルール状ドロップ）がさらに下へ垂れる個体もあるが、24 aged v2 本体には無いため必須とはしない。

### フチ（リム）と内側の溝
- 外周の全周に、輪郭に沿って一段盛り上がった鍛造のフチが回る。フチの幅は鉄板幅の約4〜5%。一様ではなく、中央タブ・上隅・下隅・下辺中央の尖りでは少し太くなり、側辺中央では少し細くなる。
- フチの上面は左上からの光を受けて明るい線が走り、下面・右側では影が落ちる。平らな塗りや細い均一なアウトライン線では代替できない（本番実装の「細い金の線での縁取り」は単純化として不可）。
- フチの内側に、フチから約2%内側へ、細い刻み溝が輪郭と平行に一周する。本体面はその内側。

### リベット（球形の丸鋲）
- 平らなドットではない。直径は鉄板幅の約4〜5%の半球で、左上に小さなハイライト、右下に影を持ち、フチの上に乗って浮き出る。
- 等間隔には並ばない。総数は11個前後（数え方で10〜12）。配置の型は「隅に寄る」: 上部=中央タブ直下に1個＋右肩の瘤に1個＋左上隅付近に大小2個が近接／側辺=仕切りライン付近の高さに左右各1個／下部=左下に大小2個が近接＋右辺下部に大1個と直下に小1個＋下辺中央の尖りの直上に1個。隅では大小のペア、下辺中央と肩では単独、という不均一さが手作り感を作っている。等間隔・等サイズ・左右完全対称の配置は不可。

### 表面と立体感
- 面の中央（数字の周り）が最も明るく、周縁と下段の隅へ向けて暗くなる緩いグラデーション。
- 細かい傷は水平〜斜めに流れ、数本が数字や矢印の上を横切る。錆は全面ではなく、下段の左下隅・下辺のフチ・仕切り溝の際など縁に近い場所に茶色の斑として寄る。
- 鉄板全体に、面より一段明るいフチのハイライトと、カード面へ落ちる柔らかい落影（右下方向へ数%）があり、「紙に印刷された図」ではなく「紙の上に吊られた実物の鉄板」に見えることが条件。

### 単純化の禁止リスト（本番実装で起きた単純化の再発防止）
- 輪郭を長方形＋下向き三角の五角形（ホームプレート型）にすること。
- 上辺を直線にし、中央タブ・鞍部・肩の瘤を消すこと。
- 下辺を1つの直線的な尖りにし、下隅の耳と2連の逆アーチ＋中央カスプを消すこと。
- フチを細い均一な色線（金線など）で代替すること。
- リベットを小さな平ドットにして等間隔・等サイズに並べること。
- 吊り輪を鉄板と切り離して上に浮く小さな円にすること、または三角形の小タブで代替すること（aged v3 型）。
- 面を単色の平塗り（紺〜黒の一色）にし、ブラシ目・錆・中央の明るさを消すこと。

## 段構成と仕切りライン
- 上段（パネル高さの約58%）: 数字＋矢印。
- 仕切りライン: パネル幅の約86%の長さの水平線。細い金属の溝／刻み線で、両端は少し内側で止まる（端まで貫通しない）。色は鉄より一段明るいグレー〜生成り。太さはパネル幅の約1%。
- 下段（パネル高さの約42%）: **札束アイコンの個数で得点を表す**（1点=1個、2点=2個、5点=5個を横並び）。**得点数字と「点」の表記は廃止**（2026-11-13 本人決定）。

## 文字・記号のサイズと位置
- 数字（上段）: パネル高さの約40%の高さの大きなセリフ体。色は生成り（アイボリー）。上段の左寄り、左マージンはパネル幅の約10%。ベースラインは上段の下寄り（仕切りラインの少し上）。
- 矢印（上段）: 数字の右隣。数字との間隔はパネル幅の約4%。高さは数字の約62%。垂直位置は数字のキャップハイトに揃えて中央寄り。
- 札束アイコン（下段）: 得点の個数だけ横並び（1点=1個、2点=2個、5点=5個）。5個でも下段に収まるよう、1個の幅はパネル幅の約17〜18%目安、高さは下段高さの約55%。横向きの札束（帯封のついた紙幣の束）を斜め上から見た画。線は生成りの細いエングレービング線。並びは左寄せ、間隔は詰める。
- ~~得点数字＋「点」~~: 廃止（2026-11-13）。数字は置かない。
- 全ての文字・記号は印刷のかすれ（軽い摩耗）を伴う。

## 矢印デザイン（正式採用・上下共通）
- 形: 幅広のシェブロン（V字の鏃）が縦に2段重なった形状。矢尻が下向きなら先端は下に鋭く、上向きなら上下反転した同形。全体は「鍛造した鉄の矢印」で、平たい鏃＋短い軸。
- 素材感: 表面は鉄の質感＋色付け。色: 上矢印=くすんだ朱（vermilion）、下矢印=くすんだ鋼青（steel blue）。どちらも彩度を落とし、縁と面に擦れ・剥げがあり、下地の鉄色が部分的に見える。
- 輪郭: 黒に近い濃色の細い縁取りで形を引き締める。ドロップシャドウで鉄板からわずかに浮いて見える。
- これは文字フォントの矢印（↑↓）ではなく、独立した造形グリフとして毎回同形で描く。

## 再現プロンプト断片（英語・生成用）
"a dark riveted IRON PLATE plaque hanging from the card's TOP-LEFT corner by a short dark iron strap and a real iron RING (outer diameter about 14 percent of the plate width) passing through a semicircular tab raised at the plate's top center, about one third of the card width and 28 percent of its height, overlapping the header band and the scenery; ORNATE hand-forged hanging-sign silhouette, never a plain rectangle or pentagon: a raised semicircular center tab, a shallow concave dip on each side of it, a small convex shoulder bump carrying a ball rivet, stepped ear-like top corners, a small concave notch just below each top corner, sides that bulge very slightly at mid-height and taper about 3 percent toward the bottom, pointed outward ears at the bottom corners, and a bottom edge of TWO shallow concave arcs meeting in a small downward cusp at the center (an ogee / shallow W); a thick RAISED forged rim (about 4-5 percent of the plate width, thicker at the tab, corners and bottom cusp) follows the whole outline with a bright highlight on its upper-left faces and shadow below, plus a thin incised groove running parallel inside it; about ELEVEN hemispherical BALL rivets of slightly varying size sit ON the rim, clustered unevenly — pairs near the corners, singles at the shoulders, mid-sides and just above the bottom cusp — never evenly spaced, never flat dots; brushed blue-grey black-iron surface, lighter in the center and darker toward the edges, with fine scratches, rust mottling gathered near the lower corners and rim, and a soft drop shadow onto the card; the plate is divided by a thin horizontal engraved divider line (about 86 percent of the plate width, stopping short of the edges, tilted about -2 degrees counterclockwise, right side up) into an upper row (about 58 percent) and a lower row (about 42 percent); upper row: a very large ivory serif numeral at the left and, right beside it, a DESIGNED forged-metal arrow glyph made of two stacked wide chevrons — vermilion for UP, steel blue for DOWN — worn paint over iron with dark outline and slight drop shadow; lower row: the score shown ONLY as a row of small engraved banknote-bundle icons, one icon per point (1 icon for 1 point, 5 icons for 5 points), NO numerals and NO point text anywhere; all lettering with subtle print distress"

---


## aged v2 鉄板の実測と再現プロンプト（2026-11-14、原画から再測定）

基準画像: 24カジノ aged v2（1280×1920）。破棄されたスプライト由来の旧数値（仕切り線66%など）は使わない。

### 実測（カード座標 px）

- 本体: 左端 x≈45、右端 x≈505（幅 ≈460 = カード幅の約36%）。中心列でのタブ頂点 y≈83、下辺中央の尖り y≈539（高さ ≈456）。肩ラインは y≈100。
- 吊り: カード上端から幅 ≈35 の黒い帯が x≈215〜250（本体中央の真上）を垂直に降り、鉄の輪（外径 ≈65）を通してタブの穴に繋がる。帯の上端はカードの上辺で切れ、画面外へ抜ける。タブは上辺中央の半円状の張り出しで、付け根に唐草状の装飾がある。
- 仕切り線: 直線フィットで角度 **−2.23°**（右上がり）。左端（x=90）で y≈311、右端（x=490）で y≈296。本体高さに対する位置は肩から約52%（ほぼ中央）。
- 数字「24」: 2桁の外接 x 86〜261（幅 175）。「2」x 86〜159（幅 73）、「4」x 179〜261（幅 82）。桁の高さ ≈110〜124。傾きのため右の桁の上端が約14px高い。色の中央値 RGB (233, 208, 164)（温かい生成り）。太さは「2」の縦画で約16〜31px（セリフの太細）。古典的なセリフ体。表面に小さな欠け・擦れが点在し、色は (240,222,180)〜(200,175,130) のむらがある（均一なベタではない）。
- 矢印（下向きシェブロン）: 外接 x 301〜403、y 145〜262（幅 ≈102、高さ ≈117）。色の中央値 RGB (76, 109, 120)、明部は (144, 162, 170)、芯の暗部は (36, 79, 103) の鋼青。形は左右に開いた羽根スラット（各側5〜6段）と太い中央軸、下端の大きな鏃。擦れた青ペンキの質感。
- 下段（v2 当時の形）: 左にセピア色の札束の山アイコン（x ≈125〜300、y ≈348〜418）、右に「5点」の生成り文字（x ≈306〜436、高さ ≈55〜60、色 (231, 214, 181)）。※得点の表記は後の決定で札束アイコンの個数に置き換え済み。ここは v2 原画の記録。
- 鉄板面の色: 暗い青灰鉄。中央寄りは RGB (60〜75, 65〜75, 55〜65) 程度、周縁は (30〜45) 台まで暗く落ちる。フチは使い込まれた金属の明るい擦れ (239, 218, 178) が細く走る。

### 再現プロンプト（鉄板単体を生成する場合）

```
Aged dark iron hanging sign plate for a card game, front view, straight-on.
Vertical ornate sign silhouette, width:height about 100:135 — not a plain
pentagon: a semicircular lug tab at top-center pierced by an iron ring,
small concave saddles beside the tab, convex shoulder bumps with dome
rivets, ear-like stepped top corners, sides nearly vertical with a shallow
notch under each top corner and a slight outward bow at mid-height, bottom
edge formed by two shallow inverted arches meeting in a small center point,
ear-like lower corners. Surface: dark blue-grey forged iron, brighter in
the center (RGB about 65,70,60), falling to near-black at the edges,
brushed scratches, sparse rust specks, a raised forged rim with an inner
groove and about 11 uneven dome rivets, thin worn bright metal highlights
(RGB about 239,218,178) along the rim. A black leather strap about 35px
wide (at card scale) descends from above the frame through the ring; the
strap continues off the top edge. Two fields divided by a horizontal
divider line at about 52% of the body height. Upper-left field: large
classical serif numerals in warm ivory (RGB 233,208,164), strokes with
serif contrast, small chips and scratches on the letter faces, uneven tone
from (240,222,180) to (200,175,130). Upper-right field: a downward steel-
blue chevron arrow (median RGB 76,109,120, highlights 144,162,170) built
from a thick central shaft, five to six fletching slats opening to each
side and a large triangular arrowhead, worn blue paint texture. Whole
plate tilted so the divider line sits at -2.2 degrees (right side up).
Soft drop shadow to the lower right. Muted, antique, hardboiled mood.
No text other than the numerals.
```

### 合成時の数値（カード 1280×1920 基準）

- 本体の配置: 左端 x=45、本体幅 460、タブ頂点 y=83。鉄板全体を仕切り線が −2.2° になるよう回す。
- 数字と札束は鉄板と一緒に傾け、矢印だけは傾けず軸平行に置く（※この配置規則は2026-11-14の確定で置き換えた。現在の規則は本ファイル末尾の「構造と配置の確定」「矢印と札束の配置」を参照）。

## 傾き・吊りリンク・接続パーツの実測と言語化（2026-11-14、aged v2 原画から再測定）

### 傾き

- 基準線は鉄板内部の仕切り線。実測 **−2.23°**（右上がり）。測定は仕切り線の明部を列ごとに検出し直線フィット（x=90 で y≈311、x=490 で y≈296）。
- 回転中心は吊り点（輪の中心）。鉄板は輪を中心に傾く。
- 一緒に傾くもの: 本体・タブ・輪・数字・札束。傾かないもの: 吊りリンク（重力で垂直を保つ）、矢印（軸平行を保つ）。
- したがって鎖と鉄板の角度差は常に 2.23° ある。
- ※以上は aged v2 原画の見え方の記録。現在の合成規則（全体を吊り点から傾ける／矢印も一緒に傾く）は本ファイル末尾の確定を参照。

### 吊りリンク（鎖）

- 正体: 細い多連チェーンではなく、**太い鉄バーの単一リンク（縦長の輪）** がカード上端から垂直に降りる。
- 実測（カード座標）: 幅 ≈60px（本体幅の約13%）、中心軸 x≈195、上端はカードの上辺（y=0）で切れて画面外へ抜ける。下端は輪に入り込む。
- 色: 暗い茶黒の鉄 RGB ≈ (70, 55, 36)。中央に縦のハイライトが走る。
- 輪との関係: リンクは輪の穴を、カード面に平行な向きで通る。リンクの下部は輪の奥側に隠れ、上部だけが見える。

### 接続パーツ（輪とタブ）

- 輪は鉄板上辺の盛り上がり（タブ）の頂点にある、盛り上がった円形のアイレット（同心円の段を持つボス）。中心はカード座標 ≈ (195, 95)、外径 ≈90px。
- **輪の中心は本体の横中心（x≈275）ではなく、本体左端から約35%の位置（x≈195）にある**（実測上の重要事実）。
- タブは輪を抱える土台で、左右へ鞍部を経て肩へ流れ、付け根に渦巻き状の装飾がある。
- 輪とタブは本体と一体で、傾きに追従する。リンクだけが追従しない。

### 重なり順（手前→奥）

1. 輪の前側リムとタブ（鉄板の一部）
2. リンク（輪の穴の中で奥に隠れる部分がある）
3. 名前欄・枠などの紙面
- リンクと輪は紙面に柔らかい影を右下へ落とす。

### 再現プロンプト（吊りまわり）

```
The plate hangs from a single thick dark-iron link (an elongated oval
ring of heavy bar, about 13% of the plate body's width, RGB about
70,55,36, with a vertical highlight along its center) that descends
perfectly vertically from the top edge of the card and out of frame.
It passes through a raised circular eyelet boss with concentric rings
(outer diameter about 90px at card scale) set into the crest tab at the
top of the plate. The hanging point is NOT at the body's horizontal
center: it sits at about 35% of the body width from the left edge. The
plate, its tab and its eyelet tilt together at -2.23 degrees around the
eyelet's center (divider line as reference, right side up); the link
stays vertical, so link and plate always differ by that angle. Soft
drop shadows fall to the lower right onto the paper.
```

### ブランク鉄板（承認済み原本）の実測と、v2 との差異

- スプライト外接: x 104〜1167（本体幅 ≈1063）、y 8〜1554（画像 1280×1728）。
- ポスト: y 8〜125、幅 ≈112、中心 x≈632（本体の横中心と一致）。輪の構造は y ≈125〜230、中心 ≈ (632, 175)。
- 肩ラインは y≈335、下辺は y=1554。仕切り線は y≈1037（肩〜下辺の約57%）。
- 差異1: 輪が本体の中央にある（v2 は左から35%）。
- 差異2: 本体の縦横比が v2 より縦長（肩〜下辺/本幅: ブランク ≈1.16、v2 ≈0.88）。
- 差異3: ポスト＋輪の積み上げが肩から約200px（画像座標）あり、v2 の「肩の位置にある輪＋その上のリンク」と積み上げ方が違う。
- 合成上の帰結: ブランク鉄板では「本体を v2 の位置に置く」「輪とポストを v2 のように見せる」を同時には満たせない。当面の合成では、本体位置を優先しつつ全体を下げ、ポストが上端から抜け輪が見える位置に置く（2026-11-14 の夜顔役で採用）。

## 構造と配置の確定（2026-11-14 未明、本人の説明で訂正・確定）

- 吊り点はカードの画面外（上）にある。
- 鉄板の吊り穴は、上部センターの突起部分にある。穴は高く、**鉄板の上縁と穴の縁が隣り合う**位置に開く。
- 接続パーツ（シャックルと輪）は、その穴に配置され、吊り点からの鎖と鉄板をつなぐ。接続パーツと鎖のデザインは本人がOK済み。
- **鎖・接続パーツ・鉄板は、真っ直ぐに描画したものを正とする**（素材は傾けずに作る）。
- 配置のときは、**吊り点を中心に、鎖・接続パーツ・鉄板の全体へ傾きを与え、右肩上がりで配置する**（角度の目安は本人の比較資料の約5〜6°）。
- 先の節の「輪は左から約35%」「鎖は垂直を保ち鉄板だけが傾く」は、この確定で置き換える。

## 仕切り線の配置仕様（2026-11-14、本人が基準拡大画像から実測して指定）

- 仕切り線の位置は、**鉄板の外接範囲（装飾を含む外形）の上端から59%**。上段59%・下段41%。鉄板の左右どちらで測ってもこの比率を維持する。
- 仕切り線の長さは、内幅の約96%を横断する。
- 仕切り線の傾きは鉄板本体の傾きと同じにする（鉄板に対して水平に補正しない。素材が水平なら仕切り線も水平）。
- 構造は単なる描画線ではなく、金属の段差を伴う仕切り。右端の金属製の留め具は、当初実測仕様に入っていたが**2026-11-14に本人が「不要」と決定**し、付けない（候補も提示のうえ却下）。
- 先にモカが行った「本体（肩〜下辺）基準の52%」は、この外接基準59%の指定で置き換える。

## 矢印と札束の配置（2026-11-14 本人が訂正）

- **矢印は、水平な鉄板に対して垂直に配置する。鉄板が傾けば矢印も一緒に傾く。** 従来の「矢印だけは傾けず軸平行に置く」は、この訂正で置き換える。
- **札束アイコンは下段のセンター**に置く（従来の左寄り＋右に文字は、得点の文字表記廃止に伴い変更）。

## 余白ルールからの除外（2026-11-14 本人）

- **鉄板は余白ルールから除外する。余白からはみ出る仕様**とする（吊り看板がカードの縁に掛かる見せ方）。耳の先が縁にかかることを理由に位置をずらさない。

## aged v2（24カジノ）鉄板の色合いの言語化（2026-11-14 実測）

面の画素を輝度帯ごとに分けた中央値RGB（数字・矢印・札束の領域を除く）:

| 帯域 | aged v2（24） | 新ブランク鉄板（適用前） |
|---|---|---|
| 影（輝度45未満） | (21, 26, 23) | (21, 25, 26) |
| 中間（45〜100） | (71, 67, 56) | (52, 60, 65) |
| 高中間（100〜150） | (138, 125, 102) | (114, 116, 119) |
| 擦れ・ハイライト（150以上） | (231, 204, 161) | (182, 181, 182) |

- 言葉で言うと: 影は両者ほぼ同じ暗さ。中間以上の色が決定的に違い、**v2 は R>G>B の温かい色**（中間は茶灰、擦れは真鍮〜生成りのクリーム）で、新鉄板は B≥R の冷たい炭色で、擦れも無彩色の灰色止まり。
- 視認性の差の主因（同日実測）: 鉄板の後ろの明るさ。24は明るい名前欄・紙（周囲の中央値 約135）の上に掛かり輪郭が立つ。7は濃茶の名前欄と暗い夜絵（約51）の上で、面（約57）と明度差が約6しかなく溶ける。数字自体の明るさは両者とも約200で差はない。
- 適用方法: 帯域アンカー（輝度 25/70/120/190）で目標色÷原色のゲインを補間し、新鉄板の質感を保ったまま色だけを移す（作業場 files/tools/plate_sprite_v2.py）。承認済みの素材そのものは変更せず、面合成時の派生処理として扱う。
- 追加の派生処理（2026-11-14 本人指示）: ①左上の耳の切り欠き（縁帯を本体から切り離す溝）は埋めて右上と同じ形にする。溝の画素は両端から直線補間でつなぐ。②左側が暗い問題は、横グラデーションの光補正（左端で最大+28%、中央で0）で右側と釣り合わせる。③輪郭の小さい欠けはマスクを滑らかに整えて消す。

## 面合成の標準配置（2026-11-14 本人が位置を確定）

- 吊り位置は本人が夜顔役の面で調整して確定した: 当初のOK位置から右へ +20px（v8）→ さらに +20px（v9）の計 +40px で「完璧」と確定。
- 数値（カード 1280×1920、鉄板素材 1600×1600）: 縮小率 S=0.431（鉄板幅 1009px → カード上 約435px、カード幅の約34%）。傾きは吊り点を中心に PIL +6.5°（右肩上がり）。吊り点のカード座標 (214, −300)（カード画面外の上）。穴の着地点 (260, 104)。
- 手順（必須）: 鉄板グループ（鎖・接続パーツ・鉄板・数字・矢印・札束）は、カードより大きなキャンバス（四方400pxの余白）の上で先に吊り点中心で傾けてから、カード寸法に切り出して配置する。カード大のレイヤーに真っ直ぐ置いてから回転させると、回転前にキャンバス外へ出た部分が、回転後にカード内へ戻る場所でも欠けて直線に切れて見える（2026-11-14 本人指摘・画素実測で確認）。
- 部品の素材座標（グループ内）: 数字は中心 (575, 640)、字高は素材換算302px、生成り (232, 218, 182)、横0.88圧縮し、傷み（ムラ・擦れ傷・欠け）を入れる。矢印は中心 (1065, 640)、213×348、鉄板に対して垂直に置き鉄板と一緒に傾ける。札束は中心 (775, 1120)、幅404（下段センター）。
- 落影: 鉄板レイヤーのアルファを σ10 ぼかし＋(14, 18) オフセット＋不透明度0.38倍、色 (12, 10, 8) で、本体の前に貼る。
- 実装: 作業場 files/tools/compose_v4_night7.py（夜顔役で確立）。全カードの面はこの方式で合成する。
