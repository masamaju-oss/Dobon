---
状態: 提案中（移行ドラフト / 2026-11-13）
出所: files/iron-plate-spec.md（作業場の蓄積）
注意: これは移行ドラフト。本人の承認を経て「確定」になる。数値の実行上の正は合成スクリプト（tools/）。
---

# 紋章の鍵 2種 仕様（プロンプト完全再現レベル）

確定: 2026-11-13。対象はファミリーの紋章（三日月＋交差する二本の鍵）を構成する「豊かな鍵」と「貧しい鍵」。基準画像はボスの信頼コイン v1/v2（`design-mocks/media-generation-dobon-chip-boss-trust-v1-0-93d26064-7991-4b63-bb6f-284438c5848c.webp` ／ v2）。v1で本人が指摘した「貧しい鍵の持ち手がおかしい」は、v2で一重の鉄の輪に直した形を正式とする。
共通: 鍵はアンティークな大型の鍵（全長を10として比率を記す）。持ち手（bow）が上、軸（shaft）が斜めに下り、先端に歯（bit）。紋章内では2本が中心で交差し、なす角はほぼ90度、各鍵は垂直から約45度傾く。三日月は交差点の真上に、鍵がしっかり重なる位置に置く。

## 豊かな鍵（表の鍵・金）
- 意味: 大銀行の金庫と表通り。秩序・信用・正確さ。
- 色と素材: 金。温かい黄金色で、面は滑らか、彫金の光沢。傷はほぼ無く、手入れされた輝き。
- 持ち手: 全長の約22%。透かし彫りの装飾ボウ——渦巻き（スクロール）と唐草が左右対称に編まれた楕円〜ハート形の透かしで、中央に小さな十字〜星形の核がある。縁は二重線で締め、付け根には彫りの入った小さなカラー（首輪）が2段ある。
- 軸: 全長の約52%。真っ直ぐな円柱で、表面に細かいエングレービングの線彫り（斜めの刻みや幾何学の帯）入り。途中に装飾の膨らみ（ノブ）が1〜2か所。
- 歯: 全長の約15%。幅は広い（基準比1.3倍）。精密に切り分けられた複数段の歯で、直角の刻みが整然と並ぶ「金庫の鍵」らしい複雑さ。輪郭はシャープ。
- 全体の印象: 宝飾品の精度。左右対称で、欠け・歪みがない。
- Prompt: "one large antique GOLD key, jewel-grade craftsmanship: an ornate openwork bow (about 22 percent of the key's length) of symmetrical scrolls and arabesques with a small cross-star core and a double-line rim, two engraved collars at its base; a straight polished shaft (about 52 percent) with fine engraved banding and one or two decorative knobs; a WIDE precise bit (about 15 percent, 1.3x width) with several clean rectangular wards like a vault key; warm smooth gold, almost no scratches"

## 貧しい鍵（裏の鍵・鉄）
- 意味: 裏口と密輸路。錠に合わせて現場で削った形。
- 色と素材: 暗い鉄。黒ずんだ鉄色で、面はざらつき、傷と錆が全体に入る。光沢は鈍く、不均一。
- 持ち手: 全長の約20%。**質素な一重の輪**——太さが均一な鉄の棒を曲げただけの、装飾ゼロの単純な円環（リング）。楕円にわずかに歪み、継ぎ目に粗い溶接〜叩きの跡。透かし・彫り・カラーは一切なし。輪の内側も無地。（v1の装飾的な持ち手は誤り。ここが本人の修正指定箇所）
- 軸: 全長の約55%。装飾なしの棒状（やや太めの角〜丸棒）で、表面は叩き跡と深い傷、錆の斑点。膨らみや刻みは無く、付け根から先端までほぼ同じ太さで荒く削られた跡がある。
- 歯: 全長の約13%。幅は狭い（基準比0.9倍）。歯は縦歯2本だけで、2本の高さが少し違う（1本がわずかに短い）。切り口は粗く、手削りの非対称さがある。
- 全体の印象: 無骨で荒々しい。実用の道具感。左右非対称の歪みを含む。
- Prompt: "one large antique IRON key, crude hand-forged work: a PLAIN SINGLE RING bow (about 20 percent of the key's length) — one simple unadorned circle of uniform iron bar, slightly oval, with a rough welded joint, no openwork, no engraving, no collar; a bare rough shaft (about 55 percent), a plain bar with hammer marks, deep scratches and rust spots, no decoration; a NARROW bit (about 13 percent, 0.9x width) with only TWO vertical teeth of slightly different heights, crudely hand-filed; blackened matte iron, uneven and rugged"

## 紋章としての配置（再掲・確定値）
- 交差点は紋章の円の真ん中。豊かな鍵と貧しい鍵が約90度で交差し、各45度傾く。
- 三日月は交差点の真上、鍵の持ち手どうしの間に収まる位置。月は上向きの三日月（両端が上）。
- どちらが手前か: 豊かな鍵が手前（交差点で金の軸が見える）、貧しい鍵はその下を通る。

---

# ファミリーの紋章マスター 確定仕様（プロンプト完全再現レベル）

確定: 2026-11-13。基準画像 = 紋章 newkeys v4（`design-mocks/media-generation-dobon-crest-newkeys-v4-0-2088fbfc-5ea6-467b-a34d-861b3cbf7e0d.webp`）。本人が「形的なデザインは完璧」と確定。旧マスター（production-assets/crest-master.webp）の構図を継承し、鍵を新2種に差し替えたもの。

## 全体構成（比率は紋章円盤の直径を100とする）
- 正面・真円のメダリオン。背景は無地の黒（円盤の外側は影で落ちる）。
- 円盤の外周: 縄を捻ったようなロープ縁（ツイストロープの帯）が一周。幅は直径の約3.5%。その内側に細い溝のリングが1本。
- 円盤の地: 真鍮。色は鈍い金〜黄土寄りの真鍮色で、全面に細かい傷、叩き目、擦れ、浅い凹凸、経年で曇った部分と少しだけ明るい部分の斑がある。**サビは入れない**（赤茶色の錆び、緑青の変色は無し）。真鍮という素材が生む凹凸・傷・摩耗の質感だけを残す。鏡面にはしない。

## 三日月
- 形: 円盤の下半分を抱える大きな三日月。両端の角（ホーン）は左右対称に、円盤の高さの上から約33%の位置まで上がる。月の下端は円盤の内縁に沿う。
- 太さ: 最も太い下部中央で直径の約13%。角に向かって徐々に細くなり、先端は鋭い。
- 質感: 地と同じ真鍮だが、地より一段高く浮き上がるレリーフ。上面に光の帯が走り、下側に柔らかい影が落ちて、地との段差がはっきり読める。存在感のある太さと高さが必須（v3以降の強化を維持）。
- 位置関係: 2本の鍵の持ち手（下部）は、この三日月の内側の弧の上に乗るように収まる。

## 鍵の配置（共通）
- 2本の鍵が円盤の中心（直径の50%地点）で交差。なす角はほぼ90度、各鍵は垂直・水平から約45度。
- 向き: 歯（bit）は上、持ち手（bow）は下。金（豊か）の鍵は左上に歯・右下に持ち手で、手前（交差点で上を通る）。鉄（貧）の鍵は右上に歯・左下に持ち手で、奥（交差点で下を通る）。
- 鍵の全長は直径の約62%。交差点は鍵の全長のほぼ中点。
- 鍵そのものの詳細は上記「紋章の鍵 2種 仕様」に従う。ただし素材表現は次項に合わせる。

## 素材の統一ルール（最重要）
- 金の鍵・円盤の地・三日月・ロープ縁は、全て同一の「使い込まれた真鍮」で描く。色味・曇り・傷の入り方が揃っていること。
- 真鍮側に残すもの: 細かい傷、叩きの凹凸、擦れによる明暗、浅いへこみ、経年の曇り。
- 真鍮側に入れないもの: サビ（赤茶の腐食色、緑青）。汚れの斑も「錆び色」にはしない。
- 鉄の鍵だけは別素材（黒ずんだ鉄）で、その無骨さ・傷は維持する。

## 再現プロンプト断片（英語・生成用）
"a round antique medallion emblem on a black background: a rope-twist rim (about 3.5 percent of the diameter) with a thin groove ring inside; the disc is AGED BRASS — dull gold, fine scratches, hammered dents, worn matte patches, NO rust, NO verdigris, NO corrosion colors; a large bold crescent moon in high brass relief cradles the bottom half, its horns rising to about one third of the disc height on both sides, thickest (about 13 percent of the diameter) at the bottom center, tapering to sharp points, with a band of light on its upper face and a soft shadow below; two antique keys (each about 62 percent of the diameter) cross at the exact center at 90 degrees, bits at the top, bows at the bottom, resting over the crescent: the front key in the same aged brass — ornate openwork scroll bow with a cross-star core at the lower right, engraved collars, a wide precise multi-ward vault bit at the upper left; the rear key in blackened crude iron — a plain single ring bow at the lower left, a bare scratched bar shaft, a narrow bit with two uneven teeth at the upper right"

---

## 夜（黒スート）風景の暗さ基準（2026-11-13 本人指示で追加）
夜の絵の暗さ自体がスート判定になるため、暗さのラインを一定に保つ。実測（平均輝度・0-255、承認済み夜カード7枚）では大半が30〜34に集まる。新しい夜の絵はこの帯（おおよそ28〜36）を目安にし、外れたら明るさ調整でラインに寄せる（実例: 荷運びv2は46.6と明るすぎたため31.6へ調整）。昼（白スート）は対照的に明るい絵で統一する。

---

