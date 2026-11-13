---
状態: 提案中（移行ドラフト / 2026-11-13）
出所: files/iron-plate-spec.md（作業場の蓄積）
注意: これは移行ドラフト。本人の承認を経て「確定」になる。数値の実行上の正は合成スクリプト（tools/）。
---

# スート選択 効果アイコン仕様（生成プロンプト再現レベル）

確定: 2026-11-13。基準サンプル = 24カジノ aged v3 の下の帯のアイコン（`card-art-v2/media-generation-dobon-card-24-casino-aged-v3-0-934169ad-aa8d-4383-9589-8f9e9dd47d86.webp`）。本人が「素晴らしい」と評価し、この形を正式なスート選択アイコンとする。
用途: 効果「次のスートを選ぶ」を持つカード（0 と 24）の、下の帯に載せる効果アイコン。

## 形と構造
- 正円のメダリオン。外周は真鍮〜ブロンズ色の金属リング（二重の細い縁＋外側に小さなボルト／リベットが等間隔に並ぶ、舷窓のような造り）。
- 内側の円盤は、中心の垂直線で正確に左右半分に分かれる: 左半分=オフホワイト（生成りに近い白、わずかに経年した matte な面）、右半分=黒（つや消しの濃黒）。
- 左右の境目は鋭い直線。グラデーションや陰陽勾玉のような曲線は使わない。
- 面は平らで matte。光沢・ハイライト・立体的な球面感は付けない（リング部分のみ金属の質感と軽い陰影）。

## サイズと配置
- 直径はカード高さの約11〜12%（下の帯の高さの約75〜80%）。
- 位置: 下の帯の中で、水平方向は中央、垂直方向も帯の中央。
- 周囲には何も置かない（文字・ラベルなし。アイコン単体で意味が伝わる形）。

## 再現プロンプト断片（英語・生成用）
"a single round medallion effect icon centered in the bottom band: an antique brass porthole-style ring with a double rim and small evenly spaced bolts, holding a flat matte disc split exactly in half vertically — left half aged off-white, right half matte black — divided by one sharp straight vertical line, no gradient, no yin-yang curve, no gloss, no text"

---

# 効果アイコン共通仕様＋個別仕様（生成プロンプト再現レベル）

確定: 2026-11-13。基準サンプル = 効果アイコン一式 v4（`design-mocks/media-generation-dobon-effect-icons-set-v4-0-0d70255e-30c3-4597-b453-4bb3b75522b3.webp`）。スート／ドロー5／7（DIRECT）／公開（REVEAL）は本人がOKを出した。ドロー2は枚数修正中（後述）。

## 共通（全効果アイコン）
- 正円のメダリオン（楕円は不可）。地は一段暗いブロンズ色の生成り円盤（明るいクリームではなく、濃いタンブロンズ）。外周は真鍮の二重縁＋小さなリベット等間隔＋柔らかい落影で、カード下の帯（生成り）から分離して浮いて見える。
- 絵柄は濃い茶黒のエングレービング線＋真鍮の差し色。matte、光沢なし、軽い印刷のかすれ。
- アイコンの直径はカード高さの約11〜12%で、下の帯の中央に単体で置く。ラベル文字は付けない。

## SUIT（スート選択／0と24）— 承認済み
- 上記「スート選択 効果アイコン仕様」の円盤版: 円を垂直線で左右半分、左=生成りの白、右=つや消しの黒。縁は共通の真鍮リベット縁。
- Prompt: "a perfect-circle medallion, dark tan-bronze disc, brass double rim with small rivets; inside, a circle split exactly in half vertically, left half aged off-white, right half matte black, one sharp straight dividing line, no text"

## DRAW 5（ドロー5／黒1）— 承認済み
- 実際のカード裏面（濃紺の地・縦横の彫り線・中央に金の目と月桂樹のメダリオン・金の装飾縁）をそのまま縮小したカードが、5枚、扇状に重なって立ち上がる。右下に生成りの小さなプレートに太いセリフ体の「5」。
- Prompt: "five miniature playing cards fanned upward, every card back copying the game's real card back (deep navy, fine engraved grid, large central gold eye-and-laurel medallion, gold ornamental border), and a small ivory plaque chip at the lower right bearing a bold serif numeral '5'"

## DIRECT（方向選択／7）— 確定（v1一式の道標を正式採用）
- 本人が効果アイコン一式v1（`design-mocks/media-generation-dobon-effect-icons-set-v1-0-47a1a876-d1ad-4188-9cb4-bc99d542c275.webp` の DIRECT）を指して「7の効果アイコンはこれを使いなさい」「今後はこのアイコンを使う」と確定（2026-11-13）。今後の7の効果アイコンはこの道標で固定する。4枚板のv4版は不採用。
- 形状の言語化: 画面中央に立つ細い鉄の柱1本。柱は暗い鉄色で、縦の面に細かいハッチングの陰影。柱の頭には小さな丸い飾り（フィニアル）。柱の上部に2か所、板を締めるリング状の金具（カラー）がある。
- 板はちょうど2枚。どちらも横長の六角形（長方形の外向きの端が尖った矢印形）で、生成り（アイボリー）のエングレービング調、面には細いハッチングと軽い摩耗、縁は一段濃い線で締める。文字は一切書かない。
- 上の板: 柱の上部に付き、先端は左を指す。下の板: 上の板より少し低い位置に付き、先端は右を指す。2枚は柱を挟んで反対方向、高さはわずかにずれる（真向かいに重ならない）。板の付け根は柱のリング金具の位置に一致する。
- 板の角度（実測で言語化、2026-11-13に本人の確認質問を受けて追記）: 2枚とも完全な水平ではない。どちらも「先端が垂れ下がる」向きに約5〜7度傾いている。つまり左向きの上の板は先端（左端）が付け根よりわずかに低く、右向きの下の板も先端（右端）が付け根よりわずかに低い。古い木の看板が自重で先端だけ少し垂れたような、左右で揃った自然な垂れ方であり、先端が上がる傾きや、2枚が平行に同じ向きへ傾く形ではない。元のv1画像の板の縁を画像計測して得た値（長い縁の検出角度が約-5〜-7度と約+5〜+8度の2群に分かれ、両群とも先端下がりに対応）。
- 構図: 道標全体はメダリオンの中央に収まり、柱は円の中心の縦軸上。左右の板の先端は円の縁に届かない余白を残す。
- 地の色だけ現行仕様（一段暗いブロンズ円盤＋真鍮リベット縁）に置き換えて使う。絵柄（道標そのもの）はこのv1の形を厳密に踏襲する。
- Prompt: "a vintage street signpost, engraved ivory on a dark bronze disc: one slender dark iron pole with fine vertical hatching, a small round finial on top and two ring collars; exactly TWO long hexagonal arrow-ended signboards with hatched shading and worn edges — the upper board mounted high pointing LEFT, the lower board mounted slightly lower pointing RIGHT — attached at the collars, opposite directions, slightly offset in height, no text anywhere"

## REVEAL（公開／11）— 承認済み
- カード裏面のメダリオンと同じ目: 金のレリーフの目。重く緩んだ瞼、筋の入った虹彩、matte な黒い瞳孔。ハイライトなし。感情のない冷静で冷徹な視線。円盤いっぱいに目が大きく入る。
- Prompt: "a realistic human eye in antique gold relief filling the medallion, heavy relaxed eyelid, finely ribbed iris, matte black pupil, absolutely no highlight, emotionless cold gaze"

## DRAW 2（ドロー／2）— 修正指定あり
- 本人指摘（2026-11-13）: 一式v4ではカードが3枚描かれており不可。必ず「実際の裏面のカード ちょうど2枚」の扇＋右下に「2」のプレート、で作り直す。デザイン言語はDRAW 5と対にする。

---

