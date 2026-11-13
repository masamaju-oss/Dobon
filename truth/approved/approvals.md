# 承認台帳

本人が承認し、真実源に登録された画像の一覧。登録されていない画像は「正」ではない。
判定は原本に付ける。派生物は原本の判定を引き継ぎ、派生の忠実さはモカが検品で担保する。

## 登録済み（2026-11-13 第1弾）

| 項目 | ファイル | 種別 | 承認の根拠 | 仕様 |
|---|---|---|---|---|
| カード裏面 | card-back.webp | 原本 | 本人が正式採用（モックv2）＋v4を最終形として確認、同日の棚卸しでOK | prompts/card-back.md |
| ファミリーの紋章 | crest.webp | 原本 | 本人「形は完璧」（新鍵v4）、同日の棚卸しでも再確認 | prompts/crest.md |
| ボスの信頼コイン（表） | coin-front.webp | 派生（紋章から合成） | 本人「素晴らしい」、同日の棚卸しでOK | prompts/coin-front.md |
| 札束の山 | billstack.webp | 原本 | 本人「札束OK」 | prompts/billstack.md |
| 札束アイコン（単束・並び1/2/5） | bill-bundle.png, bill-row-1.png, bill-row-2.png, bill-row-5.png | 派生（山のアセットから） | 単束・並びとも同日の棚卸しでOK | prompts/bill-bundle.md |
| ブランク鉄板 | blank-plate.webp | 原本（新規生成） | 同日の棚卸しでOK（仕切り線57%・フチ銀寄りを承知のうえ） | prompts/blank-plate.md |
| 後継者の証（指輪） | marker-ring.webp | 原本 | 第2案「いい感じ」→穴消去→鍵の向き修正→OK | prompts/marker-ring.md |
| 効果アイコン SUIT | icon-suit.png | 派生（シートv4から切り出し） | 本人「公開以外OK」 | prompts/effect-icons-approved.md |
| 効果アイコン DRAW 2 | icon-draw2.png | 派生（同上） | 同上 | 同上 |
| 効果アイコン DRAW 5 | icon-draw5.png | 派生（同上） | 同上 | 同上 |
| 枠・名前欄（aged v1由来） | （画像は作業場の aged v1 が原本） | 原本 | 棚卸しで「枠、名前欄、カジノイラストOK」 | prompts/name-band.md・plate.md（移行ドラフト） |
| 紙質（aged v3由来） | （画像は作業場の aged v3 が原本） | 原本 | 棚卸しで「紙質OK」 | prompts/design-notes-2026-11-13.md（移行ドラフト） |
| 鉄板デザイン・配置・吊り（aged v2由来） | （画像は作業場の aged v2 が原本） | 原本 | 棚卸しで「鉄板デザインOK 数字矢印札束配置OK 画面外から吊られている表現OK」「矢印OK 数字フォントOK 数字の僅かな汚れOK」 | prompts/plate.md（移行ドラフト） |

## 未登録（承認されていないもの）

- コイン裏: 要修正（暗すぎる／ひびは大胆でよいが割れて分かれるのはダメ）
- REVEAL（公開）アイコン: NG。再作成時は裏面の目を原本にする
- 7の効果アイコン（真鍮両頭矢印）: 未判定
- 目アイコン: 未判定（原本は裏面の金の目）
- シーン原画（0〜12昼夜・密書・24の3種＋本部夜）: 判定中（2026-11-13 提示開始）
- 完成面48面（作業場の生成物）: 未承認。本人判定「まだ本番に耐えられない」
- 旧ブランク鉄板（自作テクスチャ版）・画素消去版: 不採用
