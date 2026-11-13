# ブランク鉄板（空白の鉄板）

- 状態: 承認済み（2026-11-14 本人OK「これを正とする」。第2版。第1版は差し替え）
- 承認画像: `../approved/blank-plate.webp`（1600×1600）
- 位置づけ: カード面の鉄板の原本。数字・矢印・札束はこの上に部品として載せる。**素材は鎖・接続パーツ・鉄板とも真っ直ぐに描いたものが正**で、カードへの配置時に吊り点（カード画面外の上）を中心に全体を右肩上がりに傾ける（角度の目安は約5〜6°）。

## 構造（2026-11-14 本人の説明で確定）

- 吊り点はカードの画面外（上）にある。そこから鎖が降りる。
- 鉄板の吊り穴は、**上部センターの突起部分**に開く。穴は高く、**鉄板の上縁と穴の縁が隣り合う**位置。
- 接続パーツ（シャックルと輪）は、その穴に配置され、鎖と鉄板をつなぐ。接続パーツと鎖のデザインは本人がOK済み。

## 実測（承認画像、1600×1600）

- 鉄板の外接: x 約284〜1293、y 約135（突起上端）〜1428（下端の尖り）。幅は完成カード幅の約3分の1が目安（合成時）。
- 仕切り線: **外接範囲の上端から59%**（上段59%・下段41%。本人が基準拡大画像から実測して指定）。内幅の約96%を横断する金属の段差。素材が水平なため仕切り線も水平（実測 0.005°）。
- 左右の辺: 左 +1.2°・右 −1.1°の左右対称のわずかなすぼまり。仕切り線との角度は 88.8°／91.1°で90°を挟んで対称。
- 穴: 上部センターの突起の中。輪の中心は鉄板幅の約50%。
- 面の色: 濃い炭色の鍛造鉄。周縁に使い込まれた金属の擦れ、面内に傷と錆びの斑点は中程度。

## 再現プロンプト

```
Generate a blank hanging iron sign plate as a standalone game asset on a plain
very dark background, drawn perfectly straight and level, front view, no tilt.
The plate is a decorative shield-shaped sign of dark charcoal forged iron:
slightly tapered sides narrowing gently and symmetrically toward the bottom,
scalloped ears at the corners, a shallow wavy bottom edge with a small central
point, and a raised forged rim with an inner groove and irregular rivets.
At the top center the rim rises into a small protruding tab, and a circular
hanging hole is punched through that tab, placed high so the top edge of the
hole sits right next to the top edge of the plate. A dark iron ring and shackle
connector sit in the hole. The face has two completely blank fields divided by
a raised horizontal metal step at 59 percent of the plate's full height from
the top. Worn dark iron texture: scratches, faint rust mottling, brighter worn
edges. No numbers, no letters, no arrows, no icons, no text anywhere.
Photorealistic forged metal, moody light.
```

## 経緯

- 第1版（2026-11-13承認）は、吊りポストが中央・仕切り線57%等が基準と合わず、2026-11-14に作り直し。本人の「傾き比較」文書（吊り金具は左寄り・傾き5〜6°目安・盾形・幅は約3分の1）と、その後の構造訂正（吊り点は画面外／穴は上部センターの突起／鉄板の縁と穴の縁を隣り合わせる）を受けて候補を生成し、画素補正で水平化・左右対称化・仕切り線59%化を行い、本人が「これを正とする」と承認した。
- 旧・第1版は approved/ から外した（履歴に残る）。

## 現在の正は「整えた鉄板」（2026-11-14 本人「整えた鉄板を正としてOK」）

- approved/blank-plate.webp は、上記の第2版（生成＋画素補正）を素材に、決定的な画像処理を施したものに差し替えた（透過つき 1600×1600）。第2版の原画そのものはコミット 813e66e の同パスに残る。
- 処理の内容（tools/plate_sprite_v2.py で再現可能）:
  1. 色移転: aged v2（24カジノ）鉄板の帯域別中央値（影 (21,26,23)／中間 (71,67,56)／高中間 (138,125,102)／擦れ (231,204,161)）へ、輝度アンカー 25/70/120/190 でゲインを補間して寄せる。
  2. 左上の切り欠き埋め: 耳の縁帯を本体から切り離す溝（素材座標 y 280〜480 の範囲、幅70px以下の行方向の欠け）を埋め、画素は溝の両端から直線補間する。あわせて輪郭の鏡像不足分も補う。
  3. 左側の光補正: 左端で最大+28%、幅の55%地点で0になる横グラデーション。
  4. 輪郭の平滑化: マスクに小さい欠け埋め（9×9クロージング）→σ5でぼかして0.45で二値化し、縁を滑らかにする。
- 面の合成では、この承認済みファイルをそのままスプライトとして使う（合成のたびに処理を掛け直さない）。
