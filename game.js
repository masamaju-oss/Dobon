'use strict';
/* 24ドボン 純ロジック（サーバー・テスト共用）
 * ルールの正: 改訂版説明書「次期ボスを決める六夜の抗争」
 * 確定解釈: digital-spec-v0.3.md 11節
 */

// ---- カード ----
// card: { id, num, suit:'W'|'B'|null, arrow:'up'|'down', draw5?:true, doubleFaced?:true, artVariant?:string }
// artVariant は24専用の「表示用」絵柄（casino|tower|hq）。ゲーム判定には一切影響しない
function buildDeck() {
  const cards = [];
  let seq = 0;
  const add = (num, suit, arrow, opts = {}) => {
    cards.push({ id: `c${seq++}`, num, suit, arrow, ...opts });
  };
  // オールマイティ
  add(0, null, 'up');
  add(24, null, 'down', { artVariant: 'casino' }); // 通常24×2: カジノ／高層タワー
  add(24, null, 'down', { artVariant: 'tower' });
  add(24, null, 'down', { doubleFaced: true, artVariant: 'hq' }); // 両面表の24=本部（所在が全員に見える）
  // 1
  add(1, 'W', 'up'); add(1, 'W', 'up');
  add(1, 'B', 'up', { draw5: true }); // ドロー5の黒1（視覚的に区別する1枚）
  add(1, 'B', 'up');
  // 2
  add(2, 'W', 'up'); add(2, 'W', 'up');
  add(2, 'B', 'up'); add(2, 'B', 'down');
  // 3〜10
  for (let n = 3; n <= 10; n++) {
    add(n, 'W', 'up'); add(n, 'W', 'down');
    add(n, 'B', 'up'); add(n, 'B', 'down');
  }
  // 11
  add(11, 'W', 'up'); add(11, 'W', 'down');
  add(11, 'B', 'down'); add(11, 'B', 'down');
  // 12
  add(12, 'W', 'down'); add(12, 'W', 'down');
  add(12, 'B', 'down'); add(12, 'B', 'down');
  return cards;
}

function shuffle(arr, rng = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---- カード面（face）対応表（update12） ----
// カード表示は完成面画像（public/art/faces/）をそのまま使う方式に切り替えた。
// スート判別は絵の昼夜のみ（W=昼の絵／B=夜の絵）で、この対応表が
// 「データ（num/suit/arrow/draw5/artVariant/doubleFaced）⇔ 絵の昼夜」の一致を担保する
// （方針5: スート監査はこの対応表＋単体テストで担保する）。
// card は内部表現（artVariant）でも公開表現（art）でもよい。
function faceForCard(card) {
  if (!card) return null;
  if (card.num === 0) return 'face-0.webp';
  if (card.num === 24) {
    const v = card.artVariant || card.art;
    if (v === 'tower') return 'face-24-tower.webp';
    if (v === 'hq') return 'face-24-hq.webp';
    return 'face-24-casino.webp'; // 既定はカジノ
  }
  if (card.draw5) return 'face-1-B-up-draw5.webp'; // ドロー5黒1=密書（通常の黒1とは別面）
  return `face-${card.num}-${card.suit}-${card.arrow}.webp`;
}
const FACE_BACK = 'back.webp';               // 通常の裏面（新メダリオン）
const FACE_HQ_NIGHT = 'face-24-hq-night.webp'; // 両面表24（本部）の裏面位置に出す夜面

// カードの得点（支払い計算用）: 0/24/ドロー5黒1=5点、2/7/11=2点、他=1点
function cardPoints(card) {
  if (card.num === 0 || card.num === 24 || card.draw5) return 5;
  if (card.num === 2 || card.num === 7 || card.num === 11) return 2;
  return 1;
}
const handPointSum = (hand) => hand.reduce((s, c) => s + cardPoints(c), 0);
const handNumberSum = (hand) => hand.reduce((s, c) => s + c.num, 0);
const maxCardPoints = (hand) => hand.reduce((m, c) => Math.max(m, cardPoints(c)), 0);

// ---- 出せるか判定 ----
// field: { topNum, effSuit:'W'|'B', effArrow:'up'|'down', effBase:number }
function canPlay(card, field) {
  if (!field) return true;
  if (card.num === 0 || card.num === 24) return true; // 特殊カードはいつでも
  const numOk = field.effArrow === 'up' ? card.num >= field.effBase : card.num <= field.effBase;
  if (!numOk) return false;
  return card.suit === field.effSuit || card.num === field.topNum;
}

// ドボン成立: 自分以外の出した数字 == 自分の手札全カードの数字合計
function canDobon(hand, playedNum) {
  return hand.length > 0 && handNumberSum(hand) === playedNum;
}

// 11公開: 大きい順（数字→得点）に n 枚
function pickRevealCards(hand, n) {
  return hand.slice().sort((a, b) => (b.num - a.num) || (cardPoints(b) - cardPoints(a))).slice(0, n);
}

// ---- 精算 ----
// type: 'dashikiri' | 'dobon' | 'kaeshi' | 'dashikiriDobon'
// ctx: { winnerIds / declarerIds, targetId, playedCard, hands: Map<playerId, card[]> }
// returns [{from, to, amount}]
function computeTransfers(type, ctx) {
  const t = [];
  if (type === 'dashikiri') {
    const [winner] = ctx.winnerIds;
    for (const pid of ctx.loserIds) {
      const amt = maxCardPoints(ctx.hands.get(pid) || []);
      if (amt > 0) t.push({ from: pid, to: winner, amount: amt });
    }
  } else if (type === 'dobon') {
    const base = handPointSum(ctx.hands.get(ctx.targetId) || []);
    const mult = ctx.playedCard.num === 24 ? 2 : 1; // 24ドボン
    for (const d of ctx.declarerIds) {
      if (base * mult > 0) t.push({ from: ctx.targetId, to: d, amount: base * mult });
    }
  } else if (type === 'kaeshi') {
    // 宣言者それぞれが、返した人へ「全額×2倍」。対象が24ならさらに×2（=×4）
    const base = handPointSum(ctx.hands.get(ctx.targetId) || []);
    const mult = 2 * (ctx.playedCard.num === 24 ? 2 : 1);
    for (const d of ctx.declarerIds) {
      if (base * mult > 0) t.push({ from: d, to: ctx.targetId, amount: base * mult });
    }
  } else if (type === 'dashikiriDobon') {
    for (const d of ctx.declarerIds) t.push({ from: ctx.targetId, to: d, amount: 10 });
  }
  return t;
}

// players: Map<id, {score, chip:'gake'|'shi'|'off'}> を破壊的に更新する
// 戻り値: { applied:[{from,to,amount}], cliffEvents:[{playerId, kind:'gake'|'eliminated'}], eliminatedId }
function applyTransfers(players, transfers, eliminationOn) {
  const applied = [];
  const cliffEvents = [];
  let eliminatedId = null;
  // 支払者ごとに総額を集計
  const owed = new Map();
  for (const tr of transfers) owed.set(tr.from, (owed.get(tr.from) || 0) + tr.amount);
  for (const [payerId, total] of owed) {
    const payer = players.get(payerId);
    if (!payer) continue;
    const payees = transfers.filter((x) => x.from === payerId);
    if (eliminationOn && total > payer.score) {
      // ボスの信頼 or 脱落: 残高全額を勝者へ均等配分（端数は箱へ）
      const balance = Math.max(0, payer.score);
      if (payer.chip === 'gake') {
        payer.chip = 'shi';
        cliffEvents.push({ playerId: payerId, kind: 'gake' });
      } else {
        eliminatedId = payerId;
        cliffEvents.push({ playerId: payerId, kind: 'eliminated' });
      }
      const each = payees.length ? Math.floor(balance / payees.length) : 0;
      for (const p of payees) {
        if (each > 0) {
          players.get(p.to).score += each;
          applied.push({ from: payerId, to: p.to, amount: each, partial: true });
        }
      }
      payer.score = 0;
    } else {
      // 通常支払い（脱落OFFではマイナスを許す）
      for (const p of payees) {
        players.get(p.to).score += p.amount;
        applied.push({ from: payerId, to: p.to, amount: p.amount });
      }
      payer.score -= total;
    }
  }
  return { applied, cliffEvents, eliminatedId };
}

// マーカー移動: 単独トップが現れた時だけ移動（同点では移動しない）
function nextMarker(playersArr, currentMarkerId) {
  const max = Math.max(...playersArr.map((p) => p.score));
  const tops = playersArr.filter((p) => p.score === max);
  if (tops.length === 1 && tops[0].id !== currentMarkerId) return tops[0].id;
  return currentMarkerId;
}

// 最終順位: 得点降順、同点はマーカー保持者優先
function rankings(playersArr, markerId) {
  return playersArr.slice().sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.id === markerId) return -1;
    if (b.id === markerId) return 1;
    return 0;
  });
}

module.exports = {
  buildDeck, shuffle, cardPoints, handPointSum, handNumberSum, maxCardPoints,
  canPlay, canDobon, pickRevealCards, computeTransfers, applyTransfers,
  nextMarker, rankings, faceForCard, FACE_BACK, FACE_HQ_NIGHT,
};
