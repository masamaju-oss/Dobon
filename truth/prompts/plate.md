---
状態: 提案中（移行ドラフト / 2026-11-13）
出所: files/iron-plate-spec.md（作業場の蓄積）
注意: これは移行ドラフト。本人の承認を経て「確定」になる。数値の実行上の正は合成スクリプト（tools/）。
---

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

