'use strict';
/* スモークテスト: サーバーを起動し、
 * (1) 2クライアントで手札並び替え（反映／不正ID拒否／相手への handShuffle 配信）
 * (2) 1人テストモードで入室→開始→プレイ→ラウンド終了（精算→次の夜）
 * まで流れるか確認する。
 * 使い方: node test/smoke.js  （PORT=3100で自動起動）
 */
const { spawn } = require('child_process');
const WebSocket = require('ws');

const PORT = 3100;
const server = spawn('node', ['server.js'], { env: { ...process.env, PORT }, stdio: 'pipe' });
let serverLog = '';
server.stdout.on('data', (d) => { serverLog += d; });
server.stderr.on('data', (d) => { serverLog += d; });

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let done = false;
function finish(ok, msg) {
  if (done) return; done = true;
  console.log((ok ? 'SMOKE OK: ' : 'SMOKE FAIL: ') + msg);
  try { server.kill(); } catch {}
  process.exit(ok ? 0 : 1);
}
setTimeout(() => finish(false, 'タイムアウト（150秒）\n' + serverLog), 150000);

// ---------- 並び替え検証（2クライアント） ----------
function reorderPreTest() {
  return new Promise((resolve, reject) => {
    const to = setTimeout(() => reject(new Error('タイムアウト（25秒）')), 25000);
    const A = new WebSocket(`ws://127.0.0.1:${PORT}`);
    const B = new WebSocket(`ws://127.0.0.1:${PORT}`);
    let code = null, aId = null, bOpen = false, bJoined = false, started = false;
    let phase = 0; // 0:送信待ち 1:有効な並び替えの反映待ち 2:不正な並び替えが拒否されることの確認待ち
    let expected = null, aOrderOk = false, bSawShuffle = false;
    let touchSent = false, bSawTouch = false, bSawTouchClear = false;
    const cleanup = () => { clearTimeout(to); try { A.close(); } catch {} try { B.close(); } catch {} };
    const maybeResolve = () => { if (aOrderOk && bSawShuffle && bSawTouch && bSawTouchClear) { cleanup(); resolve(); } };
    const maybeJoin = () => { if (code && bOpen && !bJoined) B.send(JSON.stringify({ t: 'join', code, name: '並替B' })); };
    const maybeStart = () => { if (code && bJoined && !started) { started = true; A.send(JSON.stringify({ t: 'start' })); } };

    A.on('open', () => A.send(JSON.stringify({
      t: 'create', name: '並替A',
      settings: { rounds: '6', minutes: 60, elimination: true, turnLimit: 0, dobonSec: 0.3 },
    })));
    A.on('message', (raw) => {
      const m = JSON.parse(raw);
      if (m.t === 'joined') { code = m.code; aId = m.playerId; maybeJoin(); return; }
      if (m.t === 'error') { cleanup(); reject(new Error('Aエラー: ' + m.msg)); return; }
      if (m.t !== 'state' || !started) return;
      const ids = m.state.me.hand.map((c) => c.id);
      if (phase === 0 && ids.length >= 2) {
        expected = [...ids].reverse();
        phase = 1;
        A.send(JSON.stringify({ t: 'reorder', order: expected }));
        return;
      }
      if (phase === 1 && JSON.stringify(ids) === JSON.stringify(expected)) {
        // 有効な並び替えが反映された → 次に不正な並び替え（存在しないID混入）を送り、
        // setName で broadcast を誘発して「順序が変わっていない」ことを確認する
        phase = 2;
        A.send(JSON.stringify({ t: 'reorder', order: [...expected.slice(1), 'bogus-id-xxxx'] }));
        A.send(JSON.stringify({ t: 'setName', name: '並替A・改' }));
        return;
      }
      if (phase === 2) {
        if (JSON.stringify(ids) === JSON.stringify(expected)) {
          aOrderOk = true;
          // 並び替え検証が済んだら「触れている位置」の共有を検証する:
          // Aが位置1に触れる → Bへ touchCard(index:1)。少し置いて解除 → Bへ touchCard(index:null)
          if (!touchSent) {
            touchSent = true;
            A.send(JSON.stringify({ t: 'touch', index: 1 }));
            setTimeout(() => { try { A.send(JSON.stringify({ t: 'touch', index: null })); } catch {} }, 400);
          }
          maybeResolve();
        }
        else if (ids.length === expected.length) { cleanup(); reject(new Error('不正な並び替えが受理された')); }
      }
    });
    A.on('error', (e) => { cleanup(); reject(new Error('A WSエラー: ' + e.message)); });

    B.on('open', () => { bOpen = true; maybeJoin(); });
    B.on('message', (raw) => {
      const m = JSON.parse(raw);
      if (m.t === 'joined') { bJoined = true; maybeStart(); return; }
      if (m.t === 'handShuffle' && m.playerId === aId) { bSawShuffle = true; maybeResolve(); return; }
      if (m.t === 'touchCard' && m.playerId === aId) {
        // 位置だけが届くこと（カード情報のキーが含まれないこと）も合わせて確認する
        if (m.index === 1 && !('cardId' in m) && !('card' in m)) bSawTouch = true;
        if (m.index === null && bSawTouch) bSawTouchClear = true;
        maybeResolve(); return;
      }
      if (m.t === 'error') { cleanup(); reject(new Error('Bエラー: ' + m.msg)); }
    });
    B.on('error', (e) => { cleanup(); reject(new Error('B WSエラー: ' + e.message)); });
  });
}

// ---------- 再現ケース: 場=黒5↑で 24↓・黒11 が出せる／白11 は出せない ----------
// 本人のプレイ報告（2026-11-11）の検証。サーバー内部関数を直接叩く。
async function playableReproTest() {
  const SRV = require('../server.js');
  const assert = (cond, msg) => { if (!cond) throw new Error(msg); };
  const mkSituation = () => {
    const host = SRV.mkPlayer('再現ホスト');
    const room = SRV.mkRoom(host, { rounds: '6', minutes: 60, elimination: true, turnLimit: 0, dobonSec: 999 });
    const human = SRV.mkPlayer('再現君');
    room.players.push(human);
    room.phase = 'turn';
    room.currentId = human.id;
    room.fieldTop = { id: 'tf5', num: 5, suit: 'B', arrow: 'up' };
    room.discard = [room.fieldTop];
    room.field = { topNum: 5, effSuit: 'B', effArrow: 'up', effBase: 5 }; // 黒／5以上↑
    human.hand = [
      { id: 't24', num: 24, suit: null, arrow: 'down' },
      { id: 't11b', num: 11, suit: 'B', arrow: 'down' },
      { id: 't11w', num: 11, suit: 'W', arrow: 'down' },
    ];
    return { room, human };
  };
  // (1) playable 応答: 24 と 黒11 が含まれ、白11 が含まれない
  {
    const { room, human } = mkSituation();
    const view = SRV.viewFor(room, human);
    assert(view.me.playable.includes('t24'), 'playable に 24 が含まれない');
    assert(view.me.playable.includes('t11b'), 'playable に 黒11 が含まれない');
    assert(!view.me.playable.includes('t11w'), 'playable に 白11 が含まれてしまう（スート不一致は不可が正解）');
  }
  // (2) doPlay: 24（スート選択あり）は成功して場札になる
  {
    const { room, human } = mkSituation();
    assert(SRV.doPlay(room, human, 't24', { suit: 'W' }) === true, 'doPlay(24) が失敗');
    assert(room.fieldTop && room.fieldTop.id === 't24', 'doPlay(24) 後に場札が 24 になっていない');
  }
  // (3) doPlay: 黒11 は成功する
  {
    const { room, human } = mkSituation();
    assert(SRV.doPlay(room, human, 't11b', {}) === true, 'doPlay(黒11) が失敗');
    assert(room.fieldTop && room.fieldTop.id === 't11b', 'doPlay(黒11) 後に場札が 黒11 になっていない');
  }
  // (4) doPlay: 白11 は拒否され、手札も変わらない
  {
    const { room, human } = mkSituation();
    assert(SRV.doPlay(room, human, 't11w', {}) === false, 'doPlay(白11) が成功してしまう');
    assert(human.hand.length === 3, 'doPlay(白11) 拒否後に手札が変化した');
  }
  console.log('REPRO OK: 場=黒5↑ で 24↓・黒11 は playable かつ doPlay 成功／白11 は正しく拒否（サーバー判定は正常）');

  // (4.5) update4: プレイヤーカラー（入室順）／公開目印（open）／readyNext／touch の検証
  {
    const { room, human } = mkSituation();
    const host = room.players[0];
    assert(host.colorIdx === 0 && SRV.PLAYER_COLORS[host.colorIdx] === '赤', 'ホストの色が赤でない');
    assert(human.colorIdx === 0, 'mkRoom外で作ったプレイヤーは既定0のまま（参加時に assignColor で確定する想定）');
    human.colorIdx = 1; // join ハンドラの assignColor 相当
    human.revealed = new Set(['t24']);
    const view = SRV.viewFor(room, human);
    const meP = view.players.find((p) => p.id === human.id);
    assert(meP.colorIdx === 1 && meP.colorName === '青', '2席目の色が青で view に載っていない');
    assert(typeof meP.readyNext === 'boolean', 'players に readyNext が無い（精算の待機表示用）');
    const openCard = view.me.hand.find((c) => c.id === 't24');
    const closedCard = view.me.hand.find((c) => c.id === 't11b');
    assert(openCard.open === true && closedCard.open === false, '自分の公開中カードの open 目印が正しくない');
    // doTouch: 範囲内は受理、範囲外・非整数は拒否、解除は null
    assert(SRV.doTouch(room, human, 0) === true && human.touchIndex === 0, 'doTouch(0) が受理されない');
    assert(SRV.doTouch(room, human, 99) === false && human.touchIndex === 0, 'doTouch(範囲外) が拒否されない');
    assert(SRV.doTouch(room, human, 1.5) === false, 'doTouch(非整数) が拒否されない');
    assert(SRV.doTouch(room, human, null) === true && human.touchIndex === null, 'doTouch(解除) が効かない');
  }
  console.log('UPDATE4 OK: プレイヤーカラー割当／公開目印 open／readyNext／touch の位置検証（範囲外・非整数は拒否）');

  // (5) 効果発動イベント: 2 を出すと fx(draw2, 累積・対象つき) が通知される
  {
    const host = SRV.mkPlayer('fxホスト');
    const room = SRV.mkRoom(host, { rounds: '6', minutes: 60, elimination: true, turnLimit: 0, dobonSec: 999 });
    const human = SRV.mkPlayer('fx君');
    room.players.push(human);
    room.phase = 'turn'; room.currentId = human.id;
    room.fieldTop = { id: 'tf2', num: 2, suit: 'B', arrow: 'up' };
    room.discard = [room.fieldTop];
    room.field = { topNum: 2, effSuit: 'B', effArrow: 'up', effBase: 2 };
    human.hand = [{ id: 't2b', num: 2, suit: 'B', arrow: 'up' }, { id: 'tx9', num: 9, suit: 'W', arrow: 'up' }];
    assert(SRV.doPlay(room, human, 't2b', {}) === true, 'doPlay(黒2) が失敗');
    SRV.closeWindow(room); // 受付を閉じて効果発動まで進める
    assert(room.pendingDraw === 2, `pendingDraw が 2 でない: ${room.pendingDraw}`);
    assert(room.lastEvent && room.lastEvent.kind === 'fx' && room.lastEvent.fx === 'draw2'
      && room.lastEvent.total === 2 && room.lastEvent.targetId === host.id,
      `fx(draw2) イベントが正しくない: ${JSON.stringify(room.lastEvent)}`);
  }
  // (6) ドロー5: 発動通知の直後はまだ配られず（fxWait）、一拍後に5枚配られて手番が進む
  {
    const host = SRV.mkPlayer('fx5ホスト');
    const room = SRV.mkRoom(host, { rounds: '6', minutes: 60, elimination: true, turnLimit: 0, dobonSec: 999 });
    const human = SRV.mkPlayer('fx5君');
    const third = SRV.mkPlayer('fx5三');
    room.players.push(human); room.players.push(third);
    room.phase = 'turn'; room.currentId = human.id;
    room.fieldTop = { id: 'tf1', num: 1, suit: 'B', arrow: 'down' };
    room.discard = [room.fieldTop];
    room.field = { topNum: 1, effSuit: 'B', effArrow: 'down', effBase: 1 };
    human.hand = [{ id: 'td5', num: 1, suit: 'B', arrow: 'up', draw5: true }, { id: 'ty9', num: 9, suit: 'W', arrow: 'up' }];
    room.deck = Array.from({ length: 20 }, (_, i) => ({ id: 'dk' + i, num: 3, suit: 'W', arrow: 'up' }));
    const thirdBefore = third.hand.length; // 被害者 = 出した人の次の席（players順: host→human→third）
    assert(SRV.doPlay(room, human, 'td5', {}) === true, 'doPlay(ドロー5) が失敗');
    SRV.closeWindow(room);
    assert(room.phase === 'fxWait', `ドロー5発動直後の phase が fxWait でない: ${room.phase}`);
    assert(room.lastEvent && room.lastEvent.fx === 'draw5' && room.lastEvent.targetId === third.id, 'fx(draw5) イベントが正しくない');
    assert(third.hand.length === thirdBefore, 'fxWait 中に先行して配られてしまった');
    await wait(1400); // 一拍（1.15秒）＋余裕
    assert(room.phase === 'turn', `ドロー5後に手番へ戻っていない: ${room.phase}`);
    assert(third.hand.length === thirdBefore + 5, `ドロー5で5枚配られていない: ${thirdBefore} -> ${third.hand.length}`);
    assert(room.currentId === host.id, `ドロー5を受けた人が飛ばされていない: current=${room.currentId}`);
  }
  console.log('FX REPRO OK: ドロー2の fx 通知（累積・対象）／ドロー5の一拍（fxWait→5枚配布→受け手スキップ）を確認');
}

// ---------- update10 再現ケース: 11公開の確定フロー ----------
// 本人訂正で確定（2026-11-12）: 公開したら手番は終わる／公開状態は手札に残り続ける／
// 公開済みカードを出す時は【仮表面】（両面表扱い・場でトップにある間だけ、覆われたら通常に戻る）
async function update10ReproTest() {
  const SRV = require('../server.js');
  const assert = (cond, msg) => { if (!cond) throw new Error(msg); };
  const mkRoom2 = () => {
    const host = SRV.mkPlayer('u10ホスト');
    const room = SRV.mkRoom(host, { rounds: '6', minutes: 60, elimination: true, turnLimit: 0, dobonSec: 999 });
    const human = SRV.mkPlayer('u10君');
    room.players.push(human);
    room.phase = 'turn';
    room.fieldTop = { id: 'tf5', num: 5, suit: 'W', arrow: 'up' };
    room.discard = [room.fieldTop];
    room.field = { topNum: 5, effSuit: 'W', effArrow: 'up', effBase: 5 }; // 白／5以上↑
    room.deck = Array.from({ length: 20 }, (_, i) => ({ id: 'dk' + i, num: 3, suit: 'W', arrow: 'up' }));
    return { room, host, human };
  };

  // (U1) 公開したら手番は終わる。公開状態は手番が移っても手札に残り続ける
  {
    const { room, host, human } = mkRoom2();
    room.currentId = human.id;
    room.pendingReveal = 1;
    human.hand = [
      { id: 'u3', num: 3, suit: 'W', arrow: 'up' },
      { id: 'u12', num: 12, suit: 'B', arrow: 'down' },
      { id: 'sec9', num: 9, suit: 'W', arrow: 'up' }, // 非公開カード（他者ビューへ漏れないことの確認用）
    ];
    assert(SRV.doReveal(room, human) === true, 'doReveal が失敗');
    assert(human.revealed.has('u12'), '最大カード(12)が公開されていない');
    assert(room.pendingReveal === 0, 'pendingReveal が消費されていない');
    assert(room.currentId === host.id, `公開で手番が終わっていない: current=${room.currentId}`);
    // 次のプレイヤーがパスして手番が一巡しても、公開は解除されない
    assert(SRV.doPass(room, host, true) === true, 'ホストの自動パスが失敗');
    assert(room.currentId === human.id, '手番が対象に戻っていない');
    assert(human.revealed.has('u12'), '手番が移ったら公開が解除されてしまった（確定仕様は「手札に残り続ける」）');
    // 他者ビュー: 公開位置（openSlots）が含まれ、非公開カードの中身は含まれない
    const view = SRV.viewFor(room, host);
    const hp = view.players.find((p) => p.id === human.id);
    assert(Array.isArray(hp.openSlots) && hp.openSlots.length === 1, `openSlots が1件でない: ${JSON.stringify(hp.openSlots)}`);
    assert(hp.openSlots[0].i === 1 && hp.openSlots[0].card.id === 'u12', 'openSlots の位置/カードが公開カードと一致しない');
    assert(!JSON.stringify(view).includes('sec9'), '他者ビューに非公開カードのIDが漏れている');
    console.log('UPDATE10-1 OK: 公開で手番終了／公開は手番が移っても残る／他者ビューに openSlots（位置）のみ・非公開カードは漏れない');
  }

  // (U2) 公開済みカードを場に出す: play イベントと fieldTop に rv（仮表面）が付く
  {
    const { room, host, human } = mkRoom2();
    room.currentId = human.id;
    human.hand = [
      { id: 'u12w', num: 12, suit: 'W', arrow: 'down' },
      { id: 'u8', num: 8, suit: 'W', arrow: 'up' },
    ];
    human.revealed = new Set(['u12w']);
    assert(SRV.doPlay(room, human, 'u12w', {}) === true, '公開カードの doPlay が失敗');
    assert(room.lastEvent && room.lastEvent.kind === 'play' && room.lastEvent.rv === true,
      `play イベントに rv=true が付いていない: ${JSON.stringify(room.lastEvent)}`);
    assert(!human.revealed.has('u12w'), '出したカードが revealed に残っている');
    const view = SRV.viewFor(room, host);
    assert(view.fieldTop && view.fieldTop.id === 'u12w' && view.fieldTop.rv === true, 'ビューの fieldTop に rv=true が付いていない');
    // 仮表面の失効: 次のカードに覆われたら通常に戻る。捨て札側に rv は残らない
    SRV.closeWindow(room); // 効果なしの12 → 次の手番（ホスト）へ
    assert(room.currentId === host.id && room.phase === 'turn', '窓明け後に手番が進んでいない');
    host.hand = [{ id: 'h9', num: 9, suit: 'W', arrow: 'up' }, { id: 'h4', num: 4, suit: 'B', arrow: 'up' }];
    assert(SRV.doPlay(room, host, 'h9', {}) === true, '覆う側の doPlay が失敗');
    const view2 = SRV.viewFor(room, human);
    assert(view2.fieldTop && view2.fieldTop.id === 'h9' && view2.fieldTop.rv === false, '覆われた後も場札に rv が残っている');
    const covered = view2.discard.find((c) => c.id === 'u12w');
    assert(covered && !('rv' in covered), '捨て札側に rv フラグが残っている（仮表面は覆われた時点で通常に戻る）');
    console.log('UPDATE10-2 OK: 公開カードを出すとイベント/fieldTop に rv（仮表面）／覆われたら通常に戻り捨て札に残らない');
  }

  // (U3) 通常プレイでは rv は付かない／チェーン11は従来どおり（公開せず累積して手番終了）
  {
    const { room, host, human } = mkRoom2();
    room.currentId = human.id;
    human.hand = [{ id: 'n8', num: 8, suit: 'W', arrow: 'up' }, { id: 'n3', num: 3, suit: 'B', arrow: 'up' }];
    assert(SRV.doPlay(room, human, 'n8', {}) === true, '通常プレイが失敗');
    assert(room.lastEvent.rv === false, '通常プレイに rv が付いてしまった');
    assert(SRV.viewFor(room, host).fieldTop.rv === false, '通常プレイの fieldTop に rv が付いてしまった');
  }
  {
    const { room, host, human } = mkRoom2();
    room.currentId = human.id;
    room.pendingReveal = 1;
    human.hand = [{ id: 'c11', num: 11, suit: 'B', arrow: 'down' }, { id: 'c5', num: 5, suit: 'W', arrow: 'up' }];
    assert(SRV.doPlay(room, human, 'c11', {}) === true, 'チェーン11の doPlay が失敗');
    assert(human.revealed.size === 0, 'チェーン11で公開してしまった');
    SRV.closeWindow(room);
    assert(room.pendingReveal === 2, `チェーンで累積が2になっていない: ${room.pendingReveal}`);
    assert(room.currentId === host.id, 'チェーン11で手番が次へ移っていない');
    console.log('UPDATE10-3 OK: 通常プレイに rv は付かない／チェーン11は公開せず累積して手番終了（従来どおり）');
  }
}

// ---------- update12 再現ケース: タップ無反応バグの切り分け（方針6） ----------
// 「強調表示されたカードをタップしても出せない」が候補(c)（クライアントの出せる判定
// ＝ viewFor.me.playable と、サーバー受理条件 ＝ doPlay の不一致）によるものかを、
// 全デッキカード × 代表的な場の条件で網羅検証する。一致すれば (c) は否定され、
// バグは入力経路側（タップ奪取／選択処理の黙り）にあったことになる
// （クライアント側は update12 で札束の重なり解消・ドラッグ常時化・トースト表示で対策）。
async function update12ReproTest() {
  const SRV = require('../server.js');
  const G = require('../game.js');
  const assert = (cond, msg) => { if (!cond) throw new Error(msg); };
  const FIELDS = [
    null, // 場札なし（ラウンド開始）
    { topNum: 5, effSuit: 'B', effArrow: 'up', effBase: 5 },
    { topNum: 5, effSuit: 'W', effArrow: 'down', effBase: 5 },
    { topNum: 1, effSuit: 'B', effArrow: 'up', effBase: 1 },
    { topNum: 12, effSuit: 'B', effArrow: 'down', effBase: 12 },
    { topNum: 24, effSuit: null, effArrow: 'down', effBase: 0 }, // 24が出た直後（選択済み相当は下で別途検証）
  ];
  const deck = G.buildDeck();
  let checked = 0, mism = 0;
  for (const field of FIELDS) {
    const mk = (cards) => {
      const host = SRV.mkPlayer('u12ホスト');
      const room = SRV.mkRoom(host, { rounds: '6', minutes: 60, elimination: true, turnLimit: 0, dobonSec: 999 });
      const human = SRV.mkPlayer('u12君');
      room.players.push(human);
      room.phase = 'turn'; room.currentId = human.id;
      room.field = field ? { ...field } : null;
      room.fieldTop = field ? { id: 'tf', num: field.topNum, suit: field.effSuit, arrow: field.effArrow } : null;
      room.discard = room.fieldTop ? [room.fieldTop] : [];
      human.hand = cards;
      return { room, human };
    };
    // playable 集合は「全デッキを持った手札」に対する viewFor 応答で取る
    const all = deck.map((c, i) => ({ ...c, id: 'u' + i }));
    const { room: r0, human: h0 } = mk(all);
    const view = SRV.viewFor(r0, h0);
    const playableIds = new Set(view.me.playable);
    // face が playable・hand の両方に全カード分載っていることも併せて担保する
    for (const pc of view.me.hand) assert(typeof pc.face === 'string' && pc.face.endsWith('.webp'), 'view の手札カードに face が無い');
    for (const c of all) {
      const { room, human } = mk([{ ...c }]);
      let ok = SRV.doPlay(room, human, c.id, {});
      if (!ok && (c.num === 0 || c.num === 24 || c.num === 7)) {
        // 選択必須カードは「選択を渡した時」に受理されるかまで含めて一致を見る
        const r2 = mk([{ ...c }]).room; const h2 = r2.players[1];
        ok = SRV.doPlay(r2, h2, c.id, c.num === 7 ? { dir: 'up' } : { suit: 'W' });
      }
      const expect = playableIds.has(c.id);
      if (ok !== expect) { mism++; console.error(`MISMATCH field=${JSON.stringify(field)} card=${c.num}/${c.suit}/${c.arrow} playable=${expect} doPlay=${ok}`); }
      checked++;
    }
  }
  assert(mism === 0, `playable と doPlay の不一致が ${mism} 件`);
  console.log(`UPDATE12-6 OK: 全デッキカード×${FIELDS.length}場条件で playable ⇔ doPlay が完全一致（${checked}件検証＝候補(c)否定）`);
  const faces = new Set(deck.map((c) => G.faceForCard(c)));
  assert(faces.size === 47, `デッキの面の種類数が47でない: ${faces.size}`);
}

(async () => {
  await wait(800);
  try {
    await playableReproTest();
  } catch (e) {
    return finish(false, '再現ケース失敗: ' + e.message + '\n' + serverLog);
  }
  try {
    await update10ReproTest();
  } catch (e) {
    return finish(false, 'update10検証失敗: ' + e.message + '\n' + serverLog);
  }
  try {
    await reorderPreTest();
    console.log('REORDER OK: 並び替えの反映／不正IDの拒否／相手への handShuffle 配信／touchCard（位置のみ・解除）配信を確認');
  } catch (e) {
    return finish(false, '並び替え検証失敗: ' + e.message + '\n' + serverLog);
  }
  try {
    await update12ReproTest();
  } catch (e) {
    return finish(false, 'update12検証失敗: ' + e.message + '\n' + serverLog);
  }
  const ws = new WebSocket(`ws://127.0.0.1:${PORT}`);
  let myId = null, actedKey = '', plays = 0, sawSettle = false, maxRound = 0;

  ws.on('open', () => {
    ws.send(JSON.stringify({
      t: 'create', name: 'スモーク君',
      settings: { rounds: '6', minutes: 60, elimination: true, turnLimit: 0, dobonSec: 0.3 },
      test: true, cpuCount: 3,
    }));
  });
  ws.on('message', (raw) => {
    const m = JSON.parse(raw);
    if (m.t === 'joined') { myId = m.playerId; ws.send(JSON.stringify({ t: 'start' })); return; }
    if (m.t === 'error') return finish(false, 'サーバーエラー: ' + m.msg);
    if (m.t !== 'state') return;
    const S = m.state;
    maxRound = Math.max(maxRound, S.round);
    if (S.phase === 'settle') sawSettle = true;
    if (sawSettle && S.round >= 2) return finish(true, `入室→開始→${plays}手プレイ→精算→第2夜に到達`);
    if (S.phase === 'gameover') return finish(true, `ゲーム終了まで到達（${plays}手）`);

    const act = (key, fn) => { if (actedKey !== key) { actedKey = key; setTimeout(fn, 120); } };
    if (S.phase === 'startChoice' && S.startChoice && S.startChoice.playerId === myId) {
      act('choice' + S.round, () => ws.send(JSON.stringify(
        S.startChoice.kind === 'suit' ? { t: 'startChoice', suit: 'W' } : { t: 'startChoice', dir: 'up' })));
      return;
    }
    if (S.phase === 'settle') { act('settle' + S.round + JSON.stringify(S.settle.scores), () => ws.send(JSON.stringify({ t: 'next' }))); return; }
    if (S.phase === 'kaeshi' && S.kaeshi && S.kaeshi.mine) { act('kaeshi' + S.round + plays, () => ws.send(JSON.stringify({ t: 'kaeshi' }))); return; }
    if (S.phase !== 'turn' || !S.me.isMyTurn) return;
    const key = `turn-${S.round}-${S.me.hand.length}-${S.pendingDraw}-${S.pendingReveal}-${S.me.drewThisTurn}-${plays}`;
    act(key, () => {
      if (S.pendingDraw > 0) return ws.send(JSON.stringify({ t: 'drawPending' }));
      if (S.pendingReveal > 0) return ws.send(JSON.stringify({ t: 'reveal' }));
      const playable = S.me.hand.filter((c) => S.me.playable.includes(c.id));
      if (playable.length) {
        const c = playable[0];
        const msg = { t: 'play', cardId: c.id };
        if (c.num === 0 || c.num === 24) msg.suit = 'W';
        if (c.num === 7) msg.dir = 'up';
        plays++;
        return ws.send(JSON.stringify(msg));
      }
      if (!S.me.drewThisTurn && !S.mustNagashi) return ws.send(JSON.stringify({ t: 'draw' }));
      return ws.send(JSON.stringify({ t: 'pass' }));
    });
  });
  ws.on('error', (e) => finish(false, 'WSエラー: ' + e.message));
})();
