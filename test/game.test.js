'use strict';
const test = require('node:test');
const assert = require('node:assert');
const G = require('../game');

const C = (num, suit = 'W', arrow = 'up', opts = {}) => ({ id: `${num}${suit}${arrow}${opts.draw5 ? 'd5' : ''}${Math.random()}`, num, suit, arrow, ...opts });

test('デッキは52枚で構成が説明書通り', () => {
  const d = G.buildDeck();
  assert.equal(d.length, 52);
  assert.equal(d.filter((c) => c.num === 0).length, 1);
  assert.equal(d.filter((c) => c.num === 24).length, 3);
  assert.equal(d.filter((c) => c.num === 24 && c.doubleFaced).length, 1);
  assert.equal(d.filter((c) => c.draw5).length, 1);
  assert.equal(d.filter((c) => c.num === 1).length, 4);
  assert.equal(d.filter((c) => c.num === 2).length, 4);
  for (let n = 3; n <= 10; n++) assert.equal(d.filter((c) => c.num === n).length, 4, `num=${n}`);
  assert.equal(d.filter((c) => c.num === 11).length, 4);
  assert.equal(d.filter((c) => c.num === 12).length, 4);
  assert.equal(new Set(d.map((c) => c.id)).size, 52);
});

test('カード得点: 0/24/ドロー5=5点、2/7/11=2点、他=1点', () => {
  assert.equal(G.cardPoints(C(0, null)), 5);
  assert.equal(G.cardPoints(C(24, null, 'down')), 5);
  assert.equal(G.cardPoints(C(1, 'B', 'up', { draw5: true })), 5);
  assert.equal(G.cardPoints(C(1, 'B')), 1);
  assert.equal(G.cardPoints(C(2)), 2);
  assert.equal(G.cardPoints(C(7)), 2);
  assert.equal(G.cardPoints(C(11)), 2);
  assert.equal(G.cardPoints(C(9)), 1);
  assert.equal(G.cardPoints(C(12, 'B', 'down')), 1);
});

test('出せる判定: 説明書の例（場=白3↑）', () => {
  const f = { topNum: 3, effSuit: 'W', effArrow: 'up', effBase: 3 };
  assert.equal(G.canPlay(C(5, 'W'), f), true);  // 3以上の白
  assert.equal(G.canPlay(C(3, 'B'), f), true);  // 白か黒の3
  assert.equal(G.canPlay(C(2, 'W'), f), false); // 矢印条件を満たさない
  assert.equal(G.canPlay(C(9, 'B'), f), false); // スートも数字も合わない
  assert.equal(G.canPlay(C(0, null), f), true); // 特殊カードはいつでも
  assert.equal(G.canPlay(C(24, null, 'down'), f), true);
});

test('出せる判定: ↓条件と7の方向指定フィールド', () => {
  const f = { topNum: 12, effSuit: 'B', effArrow: 'down', effBase: 12 };
  assert.equal(G.canPlay(C(4, 'B', 'up'), f), true);
  assert.equal(G.canPlay(C(12, 'W', 'down'), f), true);
  // 7で↑指定: ベースは7
  const f7 = { topNum: 7, effSuit: 'W', effArrow: 'up', effBase: 7 };
  assert.equal(G.canPlay(C(6, 'W'), f7), false);
  assert.equal(G.canPlay(C(8, 'W'), f7), true);
  assert.equal(G.canPlay(C(7, 'B'), f7), true);
});

test('ドボン判定: 手札全カードの数字合計が一致した時のみ', () => {
  assert.equal(G.canDobon([C(3), C(4)], 7), true);
  assert.equal(G.canDobon([C(3), C(4)], 8), false);
  assert.equal(G.canDobon([C(24, null, 'down')], 24), true);
  assert.equal(G.canDobon([], 0), false);
  assert.equal(G.canDobon([C(0, null)], 0), true);
});

test('精算: 出し切りは各敗者が最も高いカード得点を払う', () => {
  const hands = new Map([
    ['W', []],
    ['A', [C(3), C(11)]],      // 最大2点
    ['B', [C(24, null, 'down'), C(5)]], // 最大5点
  ]);
  const t = G.computeTransfers('dashikiri', { winnerIds: ['W'], loserIds: ['A', 'B'], hands });
  assert.deepEqual(t, [
    { from: 'A', to: 'W', amount: 2 },
    { from: 'B', to: 'W', amount: 5 },
  ]);
});

test('精算: ドボンは残り手札合計を各勝者へ全額、24対象で2倍', () => {
  const hands = new Map([['T', [C(2), C(9)]]]); // 合計 2+1=3点
  let t = G.computeTransfers('dobon', { targetId: 'T', declarerIds: ['D1'], playedCard: C(9, 'B'), hands });
  assert.deepEqual(t, [{ from: 'T', to: 'D1', amount: 3 }]);
  t = G.computeTransfers('dobon', { targetId: 'T', declarerIds: ['D1', 'D2'], playedCard: C(24, null, 'down'), hands });
  assert.deepEqual(t, [
    { from: 'T', to: 'D1', amount: 6 },
    { from: 'T', to: 'D2', amount: 6 },
  ]);
});

test('精算: ドボン返しは宣言者それぞれが全額×2（24なら×4）', () => {
  const hands = new Map([['T', [C(2), C(9)]]]); // base 3点
  let t = G.computeTransfers('kaeshi', { targetId: 'T', declarerIds: ['D1', 'D2'], playedCard: C(9, 'B'), hands });
  assert.deepEqual(t, [
    { from: 'D1', to: 'T', amount: 6 },
    { from: 'D2', to: 'T', amount: 6 },
  ]);
  t = G.computeTransfers('kaeshi', { targetId: 'T', declarerIds: ['D1'], playedCard: C(24, null, 'down'), hands });
  assert.deepEqual(t, [{ from: 'D1', to: 'T', amount: 12 }]);
});

test('精算: 出し切りドボンは宣言者それぞれへ10点全額', () => {
  const t = G.computeTransfers('dashikiriDobon', { targetId: 'F', declarerIds: ['D1', 'D2'], playedCard: C(5), hands: new Map() });
  assert.deepEqual(t, [
    { from: 'F', to: 'D1', amount: 10 },
    { from: 'F', to: 'D2', amount: 10 },
  ]);
});

test('支払い適用: 通常・崖っぷち・脱落・脱落OFFのマイナス', () => {
  // 通常
  let players = new Map([['A', { score: 50, chip: 'gake' }], ['B', { score: 50, chip: 'gake' }]]);
  let r = G.applyTransfers(players, [{ from: 'A', to: 'B', amount: 20 }], true);
  assert.equal(players.get('A').score, 30);
  assert.equal(players.get('B').score, 70);
  assert.equal(r.eliminatedId, null);
  // 崖っぷち: 払い切れない→全額渡して0点、チップは死面へ
  players = new Map([['A', { score: 10, chip: 'gake' }], ['B', { score: 50, chip: 'gake' }]]);
  r = G.applyTransfers(players, [{ from: 'A', to: 'B', amount: 25 }], true);
  assert.equal(players.get('A').score, 0);
  assert.equal(players.get('A').chip, 'shi');
  assert.equal(players.get('B').score, 60);
  assert.deepEqual(r.cliffEvents, [{ playerId: 'A', kind: 'gake' }]);
  // 死面で再度→脱落
  players = new Map([['A', { score: 5, chip: 'shi' }], ['B', { score: 50, chip: 'gake' }]]);
  r = G.applyTransfers(players, [{ from: 'A', to: 'B', amount: 9 }], true);
  assert.equal(r.eliminatedId, 'A');
  assert.equal(players.get('B').score, 55);
  // 脱落OFF: マイナスを許す
  players = new Map([['A', { score: 10, chip: 'off' }], ['B', { score: 50, chip: 'off' }]]);
  r = G.applyTransfers(players, [{ from: 'A', to: 'B', amount: 25 }], false);
  assert.equal(players.get('A').score, -15);
  assert.equal(players.get('B').score, 75);
  assert.equal(r.eliminatedId, null);
});

test('マーカー: 単独トップへ移動、同点では移動しない／順位の同点はマーカー優先', () => {
  const arr = [{ id: 'A', score: 60 }, { id: 'B', score: 55 }, { id: 'C', score: 60 }];
  assert.equal(G.nextMarker(arr, 'B'), 'B'); // 同点トップ→移動しない
  const arr2 = [{ id: 'A', score: 61 }, { id: 'B', score: 55 }, { id: 'C', score: 60 }];
  assert.equal(G.nextMarker(arr2, 'B'), 'A');
  const rk = G.rankings(arr, 'C');
  assert.equal(rk[0].id, 'C'); // 同点はマーカー保持者が先頭
});

test('face対応表（update12）: 全デッキカードに面が決まり、実ファイルが存在する', () => {
  const fs = require('fs');
  const path = require('path');
  // app 配置（public/art/faces）と flat 配置（faces/）の両方に対応
  const dirApp = path.join(__dirname, '..', 'public', 'art', 'faces');
  const dirFlat = path.join(__dirname, '..', 'faces');
  const dir = fs.existsSync(dirApp) ? dirApp : dirFlat;
  assert.ok(fs.existsSync(dir), 'faces ディレクトリが見つからない');
  const files = new Set(fs.readdirSync(dir));
  const used = new Set();
  for (const c of G.buildDeck()) {
    const f = G.faceForCard(c);
    assert.ok(f, `面が決まらない: ${JSON.stringify(c)}`);
    assert.ok(files.has(f), `面ファイルが存在しない: ${f}`);
    used.add(f);
  }
  // faces/ の全49ファイルは「デッキのどれか」か「裏面／本部の夜面」のどちらかであること
  for (const f of files) {
    assert.ok(used.has(f) || f === G.FACE_BACK || f === G.FACE_HQ_NIGHT, `未使用の面ファイル: ${f}`);
  }
  assert.equal(files.size, 49);
});

test('face対応表（update12）: スート監査 — ファイル名の昼夜がデータのスートと一致する', () => {
  for (const c of G.buildDeck()) {
    const f = G.faceForCard(c);
    if (c.num === 0 || c.num === 24) continue; // 特殊カードはスートなし（着彩・別格）
    if (c.suit === 'W') assert.ok(f.includes('-W-'), `白スートなのに昼面でない: ${f}`);
    if (c.suit === 'B') assert.ok(f.includes('-B-'), `黒スートなのに夜面でない: ${f}`);
    // 矢印も面ファイル名と一致すること
    assert.ok(f.includes(`-${c.arrow}`), `矢印が面と一致しない: ${f} vs ${c.arrow}`);
  }
  // 個別の確定対応
  assert.equal(G.faceForCard({ num: 1, suit: 'B', arrow: 'up', draw5: true }), 'face-1-B-up-draw5.webp');
  assert.equal(G.faceForCard({ num: 1, suit: 'B', arrow: 'up' }), 'face-1-B-up.webp');
  assert.equal(G.faceForCard({ num: 24, suit: null, arrow: 'down', artVariant: 'casino' }), 'face-24-casino.webp');
  assert.equal(G.faceForCard({ num: 24, suit: null, arrow: 'down', artVariant: 'tower' }), 'face-24-tower.webp');
  assert.equal(G.faceForCard({ num: 24, suit: null, arrow: 'down', artVariant: 'hq', doubleFaced: true }), 'face-24-hq.webp');
  assert.equal(G.faceForCard({ num: 0, suit: null, arrow: 'up' }), 'face-0.webp');
  assert.equal(G.faceForCard({ num: 11, suit: 'B', arrow: 'down' }), 'face-11-B-down.webp');
  assert.equal(G.faceForCard({ num: 12, suit: 'W', arrow: 'down' }), 'face-12-W-down.webp');
});

test('11公開: 大きい順に選ぶ', () => {
  const hand = [C(3), C(12, 'B', 'down'), C(7), C(12, 'W', 'down')];
  const picked = G.pickRevealCards(hand, 2);
  assert.deepEqual(picked.map((c) => c.num), [12, 12]);
});
