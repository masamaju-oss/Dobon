'use strict';
/* 24ドボン Web版サーバー
 * - サーバーが正。手札は本人のクライアントにのみ送る
 * - 部屋コード入室 / 再接続トークンで同席復帰 / CPU（1人テストモード）
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');
const G = require('./game');

const PORT = process.env.PORT || 3000;
const PUBLIC = __dirname;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.webp': 'image/webp', '.png': 'image/png', '.json': 'application/json' };

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const DENY = ['/server.js', '/game.js', '/package.json', '/package-lock.json'];
  if (DENY.includes(p) || p.startsWith('/test/')) { res.writeHead(404); res.end('not found'); return; }
  const file = path.join(PUBLIC, p);
  if (!file.startsWith(PUBLIC) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404); res.end('not found'); return;
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': p.endsWith('.webp') ? 'public, max-age=604800' : 'no-cache' });
  fs.createReadStream(file).pipe(res);
});
const wss = new WebSocketServer({ server });

// ---------- 部屋・プレイヤー ----------
const rooms = new Map();
const newCode = () => {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let c; do { c = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join(''); } while (rooms.has(c));
  return c;
};
const uid = () => crypto.randomBytes(8).toString('hex');

const DEFAULT_SETTINGS = {
  rounds: '6',          // '6'|'8'|'10'|'time'|'any'
  minutes: 60,          // 時間制: 30/60/90/120/0(無制限)
  elimination: true,    // 脱落ON（公式形）が初期値
  turnLimit: 0,         // 手番制限秒。0=オフ、15〜120
  dobonSec: 2.5,        // ドボン受付の確定空白（2026-11-11 本人指示で3.5→2.5秒に短縮）
};

// プレイヤーカラー（update4・ユーザー決定）: 入室順に割り振る。カードの色ルールとは別枠。
// 5人目（紫）はユーザー未指定のため仮置き（BUILD_LOG update4 参照）
const PLAYER_COLORS = ['赤', '青', '緑', '黄', '紫'];

function mkPlayer(name, isCPU = false) {
  return {
    id: uid(), token: uid(), name: name || '幹部', isCPU,
    ws: null, connected: false,
    hand: [], score: 50, chip: 'gake', revealed: new Set(),
    readyNext: false,
    colorIdx: 0,        // プレイヤーカラーの添字（部屋への参加時に確定）
    touchIndex: null,   // 「いま触れている手札の位置」。中身ではなく位置だけを他者へ共有する
  };
}
// 部屋の参加順で色を割り振る（参加を取り消す仕組みが無いため添字は席順で安定する）
function assignColor(room, player) { player.colorIdx = Math.min(room.players.length, PLAYER_COLORS.length - 1); }

function mkRoom(host, settings) {
  host.colorIdx = 0; // ホストは1席目（赤）
  return {
    code: newCode(), hostId: host.id,
    settings: { ...DEFAULT_SETTINGS, ...settings },
    players: [host],
    phase: 'lobby', // lobby|startChoice|turn|dobonWindow|dobonExtra|kaeshi|settle|gameover
    round: 0, markerId: host.id,
    deck: [], discard: [], field: null, fieldTop: null, fieldTopRv: false, // 場札が「11で公開中だったカード」か（update10: 【仮表面】として両面表扱いにする演出フラグ。場でトップにある間だけ付く）
    currentId: null, lastPlayerId: null, passCount: 0,
    pendingDraw: 0, pendingReveal: 0, mustNagashi: false, drewThisTurn: false,
    window: null, reservation: null, settle: null, result: null,
    startedAt: null, endReserved: false, forceLastRound: false,
    startChoice: null, timers: {}, lastEvent: null, eventSeq: 0,
    settleDeadline: null,
  };
}

// ---------- タイマー ----------
function setTimer(room, key, ms, fn) {
  clearTimer(room, key);
  if (ms == null || ms <= 0) { fn(); return; }
  room.timers[key] = setTimeout(() => { delete room.timers[key]; fn(); }, ms);
}
function clearTimer(room, key) {
  if (room.timers[key]) { clearTimeout(room.timers[key]); delete room.timers[key]; }
}
function clearAllTimers(room) { for (const k of Object.keys(room.timers)) clearTimer(room, k); }

// ---------- 汎用 ----------
const P = (room, id) => room.players.find((p) => p.id === id);
const seatIdx = (room, id) => room.players.findIndex((p) => p.id === id);
function nextSeat(room, id) {
  const i = seatIdx(room, id);
  return room.players[(i + 1) % room.players.length];
}
// data: 効果発動の内訳（fx種別・対象・枚数など）。クライアントのバナー/効果音/警告表示に使う
function event(room, kind, data = {}) { room.lastEvent = { kind, seq: ++room.eventSeq, at: Date.now(), ...data }; }

// 「触れている位置」の共有（update4）: 位置（手札の添字）だけを本人以外へ送る。
// 手札の中身は一切送らない。手札の構成が変わる操作では呼び出し側が clearTouch で消す
function sendTouch(room, player) {
  for (const p of room.players) {
    if (p !== player && p.ws && p.ws.readyState === 1) {
      send(p.ws, { t: 'touchCard', playerId: player.id, index: player.touchIndex });
    }
  }
}
function clearTouch(room, player, notify = true) {
  if (player.touchIndex === null) return;
  player.touchIndex = null;
  if (notify) sendTouch(room, player);
}
function doTouch(room, player, index) {
  // ゲーム中フェーズでのみ有効。CPUは対象外（クライアントを持たない）
  if (!['turn', 'dobonWindow', 'dobonExtra', 'kaeshi', 'startChoice'].includes(room.phase)) return false;
  let idx = null;
  if (index !== null && index !== undefined && index !== -1) {
    if (!Number.isInteger(index) || index < 0 || index >= player.hand.length) return false;
    idx = index;
  }
  if (player.touchIndex === idx) return true; // 変化なしなら送らない
  player.touchIndex = idx;
  sendTouch(room, player);
  return true;
}

function drawCards(room, player, n) {
  const drawn = [];
  for (let i = 0; i < n; i++) {
    if (room.deck.length === 0) reshuffle(room);
    if (room.deck.length === 0) break;
    const c = room.deck.pop();
    player.hand.push(c);
    drawn.push(c);
  }
  if (drawn.length) { event(room, 'draw'); clearTouch(room, player); } // 手札が増えたら触れている位置は無効
  return drawn;
}
function reshuffle(room) {
  // 現在の場札トップ1枚を残し、それ以外を山札に戻す
  const keep = room.fieldTop;
  const rest = room.discard.filter((c) => c !== keep);
  room.discard = keep ? [keep] : [];
  room.deck = G.shuffle(rest);
}

function fieldFromCard(card, choice = {}) {
  return {
    topNum: card.num,
    effSuit: card.suit || choice.suit || 'W',
    effArrow: card.num === 7 ? (choice.dir || card.arrow) : card.arrow,
    effBase: card.num,
  };
}

// ---------- ラウンド開始 ----------
function startRound(room) {
  clearAllTimers(room);
  room.round += 1;
  room.phase = 'turn';
  room.settle = null; room.window = null; room.reservation = null;
  room.pendingDraw = 0; room.pendingReveal = 0; room.passCount = 0;
  room.lastPlayerId = null; room.mustNagashi = false;
  room.endReserved = room.endReserved || false;
  if (room.settings.rounds === 'time' && room.settings.minutes > 0 &&
      Date.now() - room.startedAt >= room.settings.minutes * 60000) room.forceLastRound = true;

  room.deck = G.shuffle(G.buildDeck());
  for (const p of room.players) { p.hand = []; p.revealed = new Set(); p.readyNext = false; p.touchIndex = null; }
  const marker = P(room, room.markerId);
  const order = [];
  let cur = marker;
  for (let i = 0; i < room.players.length; i++) { order.push(cur); cur = nextSeat(room, cur.id); }
  const base = room.round === 1 ? 6 : 6; // 2ラウンド目以降マーカーは+1
  for (let r = 0; r < base + 1; r++) {
    for (const p of order) {
      const want = base + (room.round >= 2 && p.id === room.markerId ? 1 : 0);
      if (p.hand.length < want) drawCards(room, p, 1);
    }
    if (order.every((p) => p.hand.length >= base + (room.round >= 2 && p.id === room.markerId ? 1 : 0))) break;
  }
  // 最初の場札（ドボン受付なし: 仕様10節E）
  const top = room.deck.pop();
  room.fieldTop = top;
  room.fieldTopRv = false; // 最初の場札は公開経由ではない
  room.discard = [top];
  room.field = fieldFromCard(top);
  room.currentId = room.markerId;

  // 最初の場札の特殊処理（説明書: 準備の注記）
  if (top.num === 0 || top.num === 24) {
    room.phase = 'startChoice';
    room.startChoice = { kind: 'suit', playerId: room.markerId };
  } else if (top.num === 7) {
    room.phase = 'startChoice';
    room.startChoice = { kind: 'dir', playerId: room.markerId };
  } else if (top.num === 2) {
    room.pendingDraw = 2;
    event(room, 'fx', { fx: 'draw2', targetId: room.markerId, total: 2 });
  } else if (top.num === 11) {
    room.pendingReveal = 1;
    event(room, 'fx', { fx: 'reveal11', targetId: room.markerId, total: 1 });
  } else if (top.draw5) {
    // 最初の場札がドロー5黒1だった場合: スタートプレイヤーが5枚引く
    drawCards(room, marker, 5); // drawCards の 'draw' イベントに上書きされないよう、fx通知は後から出す
    event(room, 'fx', { fx: 'draw5', targetId: room.markerId, amount: 5 });
  }
  beginTurn(room);
  broadcast(room);
  scheduleCPU(room);
}

// ---------- 手番 ----------
function beginTurn(room) {
  room.drewThisTurn = false;
  // 全員パス一周 → 最後に出した人（いなければマーカー）が場流し
  room.mustNagashi = false;
  if (room.lastPlayerId && room.passCount >= room.players.length - 1 && room.currentId === room.lastPlayerId) {
    room.mustNagashi = true;
  }
  if (!room.lastPlayerId && room.passCount >= room.players.length && room.currentId === room.markerId) {
    room.mustNagashi = true;
  }
  armTurnTimer(room);
}
function armTurnTimer(room) {
  clearTimer(room, 'turn');
  if (room.phase !== 'turn') return;
  const cur = P(room, room.currentId);
  if (!cur) return;
  let limit = room.settings.turnLimit > 0 ? room.settings.turnLimit : 0;
  if (!limit && !cur.connected && !cur.isCPU) limit = 60; // 切断中は60秒で自動処理
  if (limit > 0) {
    room.turnEndsAt = Date.now() + limit * 1000;
    setTimer(room, 'turn', limit * 1000, () => autoTurn(room));
  } else room.turnEndsAt = null;
}
function autoTurn(room) {
  if (room.phase !== 'turn') return;
  const cur = P(room, room.currentId);
  if (!cur) return;
  if (room.pendingDraw > 0) return doDrawPending(room, cur, true);
  if (room.pendingReveal > 0) return doReveal(room, cur, true);
  if (room.mustNagashi) {
    const c = cur.hand[0];
    if (c) return doPlay(room, cur, c.id, autoChoice(room, c), true);
  }
  return doPass(room, cur, true);
}
function autoChoice(room, card) {
  const ch = {};
  if (card.num === 0 || card.num === 24) ch.suit = Math.random() < 0.5 ? 'W' : 'B';
  if (card.num === 7) ch.dir = Math.random() < 0.5 ? 'up' : 'down';
  return ch;
}
function advance(room) {
  const nx = nextSeat(room, room.currentId);
  room.currentId = nx.id;
  room.phase = 'turn';
  beginTurn(room);
}

// ---------- カードを出す ----------
function playableCards(room, player) {
  if (room.mustNagashi && room.currentId === player.id) return player.hand.slice();
  if (room.pendingDraw > 0) return player.hand.filter((c) => c.num === 2);
  if (room.pendingReveal > 0) return player.hand.filter((c) => c.num === 11);
  return player.hand.filter((c) => G.canPlay(c, room.field));
}

function doPlay(room, player, cardId, choice = {}, isAuto = false) {
  if (room.phase !== 'turn' || room.currentId !== player.id) return false;
  const idx = player.hand.findIndex((c) => c.id === cardId);
  if (idx < 0) return false;
  const card = player.hand[idx];
  const ok = room.mustNagashi || playableCards(room, player).some((c) => c.id === cardId);
  if (!ok) return false;
  if ((card.num === 0 || card.num === 24) && !choice.suit) return false;
  if (card.num === 7 && !choice.dir) return false;

  clearTimer(room, 'turn');
  clearTouch(room, player); // 出したら「触れている位置」は消える（手札の添字もずれる）
  // update10（本人確定）: 11で公開中だったカードの「両面が表」は【仮表面】という位置づけ。
  // そのまま場に出す時は全員の画面で表のまま移動しフリップしない。判定は revealed から
  // 外す前に行う。仮表面は場でトップにある間（見えている間）だけ: フラグは現在の場札に
  // だけ付き、次のカードに覆われた時点で通常に戻る（捨て札・再シャッフル先では特別扱いしない）
  const wasRevealed = player.revealed.has(cardId);
  player.hand.splice(idx, 1);
  player.revealed.delete(cardId);
  room.discard.push(card);
  room.fieldTop = card;
  room.fieldTopRv = wasRevealed;
  room.field = fieldFromCard(card, choice);
  room.lastPlayerId = player.id;
  room.passCount = 0;
  room.mustNagashi = false;
  room.reservation = null;
  event(room, 'play', { playerId: player.id, cardId: card.id, rv: wasRevealed }); // クライアントの出すアニメーション演出用（rv=公開中だったカード）

  // ドボン受付（3.5秒の確定空白）
  room.phase = 'dobonWindow';
  room.window = {
    card, playedBy: player.id, declarations: [],
    dashikiri: player.hand.length === 0,
    endsAt: Date.now() + room.settings.dobonSec * 1000,
    extra: false,
  };
  setTimer(room, 'window', room.settings.dobonSec * 1000, () => closeWindow(room));
  broadcast(room);
  scheduleCPU(room);
  return true;
}

function closeWindow(room) {
  if (!room.window) return;
  const w = room.window;
  if (!w.extra && w.declarations.length > 0) {
    // 追加ドボン受付3秒（延長なし）
    w.extra = true;
    w.endsAt = Date.now() + 3000;
    event(room, 'dobon');
    setTimer(room, 'window', 3000, () => closeWindow(room));
    broadcast(room);
    scheduleCPU(room);
    return;
  }
  room.window = null;
  finishPlay(room, w);
}

function declareDobon(room, player) {
  const w = room.window;
  if (!w || (room.phase !== 'dobonWindow' && room.phase !== 'dobonExtra')) return false;
  if (player.id === w.playedBy) return false;
  if (w.declarations.includes(player.id)) return false;
  if (!G.canDobon(player.hand, w.card.num)) return false;
  w.declarations.push(player.id);
  event(room, 'dobon');
  if (!w.extra) {
    // 最初の宣言で追加受付3秒へ即移行
    clearTimer(room, 'window');
    w.extra = true;
    w.endsAt = Date.now() + 3000;
    room.phase = 'dobonExtra';
    setTimer(room, 'window', 3000, () => closeWindow(room));
  }
  broadcast(room);
  scheduleCPU(room);
  return true;
}

function finishPlay(room, w) {
  const player = P(room, w.playedBy);
  // ドボン成立
  if (w.declarations.length > 0) {
    if (w.dashikiri) return settle(room, 'dashikiriDobon', { targetId: player.id, declarerIds: w.declarations, playedCard: w.card });
    // ドボン返し判定: 対象の残り手札合計が一致すれば返し可能
    if (G.canDobon(player.hand, w.card.num)) {
      room.phase = 'kaeshi';
      room.window = { ...w, kaeshiEndsAt: Date.now() + 3000 };
      // 3秒経過でシステムが自動発動（仕様11節）
      setTimer(room, 'window', 3000, () => {
        if (room.phase === 'kaeshi') { room.window = null; settle(room, 'kaeshi', { targetId: player.id, declarerIds: w.declarations, playedCard: w.card }); }
      });
      broadcast(room);
      scheduleCPU(room);
      return;
    }
    return settle(room, 'dobon', { targetId: player.id, declarerIds: w.declarations, playedCard: w.card });
  }
  // 出し切り
  if (w.dashikiri) {
    return settle(room, 'dashikiri', {
      winnerIds: [player.id],
      loserIds: room.players.filter((p) => p.id !== player.id).map((p) => p.id),
    });
  }
  // 予約の実行（次のプレイヤーが空白中に選んだカード）
  const res = room.reservation;
  room.reservation = null;
  const card = w.card;
  // 効果の発動
  if (card.draw5) {
    room.reservation = null; // ドロー5は予約自動取消
    const nx = nextSeat(room, player.id);
    // 効果の分かりやすさ対策: 先に効果を全員へ知らせ（バナー・効果音）、一拍置いてから実際に配る
    event(room, 'fx', { fx: 'draw5', targetId: nx.id, amount: 5 });
    room.phase = 'fxWait';
    broadcast(room); scheduleCPU(room);
    setTimer(room, 'fx', 1150, () => {
      if (room.phase !== 'fxWait') return;
      drawCards(room, nx, 5);
      room.currentId = player.id;
      advance(room); advance(room); // 出した人の次（引いた人）を飛ばして次へ
      broadcast(room); scheduleCPU(room);
    });
    return;
  }
  if (card.num === 2) {
    room.pendingDraw += 2;
    event(room, 'fx', { fx: 'draw2', targetId: nextSeat(room, player.id).id, total: room.pendingDraw });
  }
  if (card.num === 11) {
    room.pendingReveal += 1;
    event(room, 'fx', { fx: 'reveal11', targetId: nextSeat(room, player.id).id, total: room.pendingReveal });
  }

  room.currentId = player.id;
  // 予約があれば、効果競合ルールを確認して実行
  if (res && res.playerId === nextSeat(room, player.id).id) {
    const np = P(room, res.playerId);
    const rc = np && np.hand.find((c) => c.id === res.cardId);
    if (rc) {
      let valid = false;
      if (card.num === 2 || card.num === 11) valid = rc.num === card.num; // 累積のみ有効
      else if (!card.draw5) valid = G.canPlay(rc, room.field);
      if (valid) {
        advance(room); // currentIdを次のプレイヤーへ
        broadcast(room);
        if (doPlay(room, np, rc.id, res.choice || {})) return;
        // 失敗したら通常手番に戻す
        room.phase = 'turn'; beginTurn(room); broadcast(room); scheduleCPU(room);
        return;
      }
    }
  }
  advance(room);
  broadcast(room);
  scheduleCPU(room);
}

function doReserve(room, player, cardId, choice = {}) {
  if (room.phase !== 'dobonWindow' && room.phase !== 'dobonExtra') return false;
  if (!room.window) return false;
  if (nextSeat(room, room.window.playedBy).id !== player.id) return false;
  if (player.id === room.window.playedBy) return false;
  if (!player.hand.some((c) => c.id === cardId)) return false;
  room.reservation = { playerId: player.id, cardId, choice };
  broadcast(room);
  return true;
}

function doReorder(room, player, order) {
  // 手札の並び替え: IDの集合が現在の手札と完全一致する場合のみ採用する（順序以外の変更は一切しない）
  if (!Array.isArray(order) || order.length !== player.hand.length) return false;
  if (new Set(order).size !== order.length) return false; // 重複IDを拒否
  const byId = new Map(player.hand.map((c) => [c.id, c]));
  const next = [];
  for (const id of order) {
    const c = byId.get(id);
    if (!c) return false; // 手札に無いIDが混ざっていたら全体を拒否
    next.push(c);
  }
  const changed = next.some((c, i) => c !== player.hand[i]);
  player.hand = next;
  clearTouch(room, player); // 並びが変わったら「触れている位置」は意味を失う
  broadcast(room);
  if (changed) {
    // 相手画面の裏向きカード列を揺らすための軽量イベント。
    // 状態broadcastの「後」に送る: 先に再描画された列へアニメーションを当てるため
    for (const p of room.players) {
      if (p !== player && p.ws && p.ws.readyState === 1) send(p.ws, { t: 'handShuffle', playerId: player.id });
    }
  }
  return true;
}

function doDraw(room, player) {
  if (room.phase !== 'turn' || room.currentId !== player.id) return false;
  if (room.drewThisTurn || room.pendingDraw > 0 || room.pendingReveal > 0 || room.mustNagashi) return false;
  drawCards(room, player, 1);
  room.drewThisTurn = true;
  armTurnTimer(room);
  broadcast(room); scheduleCPU(room);
  return true;
}
function doPass(room, player, isAuto = false) {
  if (room.phase !== 'turn' || room.currentId !== player.id) return false;
  if (room.pendingDraw > 0 || room.pendingReveal > 0 || room.mustNagashi) return false;
  // ルール（2026-11-12 本人訂正）: 通常手番の最初の選択は「手札を出す」か「山札を引く」か。
  // パスは山札を1枚引いた後のみ選べる。出せる札が無いプレイヤーは引くしかない。
  // isAuto（手番制限時間切れ・切断中の自動処理）だけは例外として従来どおり自動パスを認める。
  if (!isAuto && !room.drewThisTurn) return false;
  clearTimer(room, 'turn');
  room.passCount += 1;
  event(room, 'pass');
  advance(room);
  broadcast(room); scheduleCPU(room);
  return true;
}
function doDrawPending(room, player, isAuto = false) {
  if (room.phase !== 'turn' || room.currentId !== player.id || room.pendingDraw <= 0) return false;
  clearTimer(room, 'turn');
  drawCards(room, player, room.pendingDraw);
  room.pendingDraw = 0;
  advance(room);
  broadcast(room); scheduleCPU(room);
  return true;
}
function doReveal(room, player, isAuto = false) {
  if (room.phase !== 'turn' || room.currentId !== player.id || room.pendingReveal <= 0) return false;
  clearTimer(room, 'turn');
  const picked = G.pickRevealCards(player.hand, room.pendingReveal);
  for (const c of picked) player.revealed.add(c.id);
  room.pendingReveal = 0;
  event(room, 'reveal', { playerId: player.id, cardIds: picked.map((c) => c.id) });
  advance(room);
  broadcast(room); scheduleCPU(room);
  return true;
}
function doKaeshi(room, player) {
  if (room.phase !== 'kaeshi' || !room.window) return false;
  if (player.id !== room.window.playedBy) return false;
  clearTimer(room, 'window');
  const w = room.window; room.window = null;
  settle(room, 'kaeshi', { targetId: player.id, declarerIds: w.declarations, playedCard: w.card });
  return true;
}

// ---------- 精算 ----------
const SETTLE_LABEL = {
  dashikiri: '出し切り',
  dobon: 'ドボン',
  kaeshi: 'ドボン返し',
  dashikiriDobon: '出し切りドボン',
};
function settle(room, type, ctx) {
  clearTimer(room, 'window'); clearTimer(room, 'turn');
  room.phase = 'settle';
  room.reservation = null;
  const hands = new Map(room.players.map((p) => [p.id, p.hand]));
  const transfers = G.computeTransfers(type, { ...ctx, hands });
  const pMap = new Map(room.players.map((p) => [p.id, p]));
  const { applied, cliffEvents, eliminatedId } = G.applyTransfers(pMap, transfers, room.settings.elimination);
  event(room, type === 'kaeshi' ? 'kaeshi' : type === 'dashikiri' ? 'win' : 'bundle');
  const beforeMarker = room.markerId;
  room.markerId = G.nextMarker(room.players, room.markerId);
  room.settle = {
    type, label: SETTLE_LABEL[type],
    playedCard: ctx.playedCard || room.fieldTop,
    targetId: ctx.targetId || null,
    declarerIds: ctx.declarerIds || [],
    winnerIds: ctx.winnerIds || [],
    transfers: applied,
    cliffEvents,
    eliminatedId,
    markerId: room.markerId,
    markerMoved: beforeMarker !== room.markerId,
    scores: Object.fromEntries(room.players.map((p) => [p.id, p.score])),
  };
  // ゲーム終了判定
  let gameEnd = false;
  if (eliminatedId) gameEnd = true;
  const total = { '6': 6, '8': 8, '10': 10 }[room.settings.rounds];
  if (total && room.round >= total) gameEnd = true;
  if (room.settings.rounds === 'time' && room.forceLastRound) gameEnd = true;
  if (room.endReserved) gameEnd = true;
  room.settle.gameEnd = gameEnd;
  for (const p of room.players) p.readyNext = p.isCPU || !p.connected;
  room.settleDeadline = Date.now() + 45000;
  setTimer(room, 'settle', 45000, () => proceedAfterSettle(room));
  broadcast(room);
  scheduleCPU(room);
}
function proceedAfterSettle(room) {
  if (room.phase !== 'settle') return;
  clearTimer(room, 'settle');
  if (room.settle && room.settle.gameEnd) return gameOver(room);
  startRound(room);
}
function gameOver(room) {
  clearAllTimers(room);
  room.phase = 'gameover';
  const rk = G.rankings(room.players, room.markerId);
  room.result = {
    rankings: rk.map((p, i) => ({ rank: i + 1, id: p.id, name: p.name, score: p.score })),
    winnerId: rk[0].id,
    eliminatedId: room.settle ? room.settle.eliminatedId : null,
  };
  broadcast(room);
}

// ---------- 状態ビュー（個人別） ----------
function publicCard(c) { return { id: c.id, num: c.num, suit: c.suit, arrow: c.arrow, draw5: !!c.draw5, pts: G.cardPoints(c), art: c.artVariant || null, df: !!c.doubleFaced }; }
function viewFor(room, me) {
  const now = Date.now();
  const total = { '6': 6, '8': 8, '10': 10 }[room.settings.rounds] || null;
  let timeLeftSec = null;
  if (room.settings.rounds === 'time' && room.settings.minutes > 0 && room.startedAt) {
    timeLeftSec = Math.max(0, Math.round(room.settings.minutes * 60 - (now - room.startedAt) / 1000));
  }
  const w = room.window;
  const isMyTurn = room.phase === 'turn' && room.currentId === me.id;
  const playable = isMyTurn ? playableCards(room, me).map((c) => c.id) : [];
  const nextP = w ? nextSeat(room, w.playedBy) : null;
  return {
    code: room.code, phase: room.phase, settings: room.settings,
    round: room.round, totalRounds: total, timeLeftSec,
    lastRound: room.forceLastRound || room.endReserved,
    hostId: room.hostId, markerId: room.markerId,
    currentId: room.currentId, turnEndsAt: room.turnEndsAt || null,
    deckCount: room.deck.length,
    // rv（update10）: 場札が「公開中だったカード」なら true（【仮表面】。場でトップにある間だけ）。出すアニメーションの
    // フォールバック経路（lastEvent を取りこぼした場合）でも表のまま扱えるようにするためのフラグ
    fieldTop: room.fieldTop ? { ...publicCard(room.fieldTop), rv: !!room.fieldTopRv } : null,
    field: room.field,
    discard: room.discard.map(publicCard),
    pendingDraw: room.pendingDraw, pendingReveal: room.pendingReveal,
    mustNagashi: isMyTurn && room.mustNagashi,
    lastEvent: room.lastEvent,
    startChoice: room.startChoice && room.startChoice.playerId === me.id ? room.startChoice : (room.startChoice ? { kind: room.startChoice.kind, playerId: room.startChoice.playerId, mine: false } : null),
    window: w ? {
      card: publicCard(w.card), playedBy: w.playedBy,
      declarations: w.declarations, extra: !!w.extra, dashikiri: !!w.dashikiri,
      endsAt: w.endsAt || null, kaeshiEndsAt: w.kaeshiEndsAt || null,
      canDobon: me.id !== w.playedBy && !w.declarations.includes(me.id) && G.canDobon(me.hand, w.card.num),
      canReserve: !!nextP && nextP.id === me.id,
      myReservation: room.reservation && room.reservation.playerId === me.id ? room.reservation.cardId : null,
    } : null,
    kaeshi: room.phase === 'kaeshi' && w ? { mine: w.playedBy === me.id, playedBy: w.playedBy, endsAt: w.kaeshiEndsAt } : null,
    settle: room.settle ? {
      ...room.settle,
      playedCard: room.settle.playedCard ? publicCard(room.settle.playedCard) : null,
      myReady: me.readyNext,
    } : null,
    result: room.result,
    players: room.players.map((p) => ({
      id: p.id, name: p.name, isCPU: p.isCPU, connected: p.connected || p.isCPU,
      isHost: p.id === room.hostId, isMarker: p.id === room.markerId,
      colorIdx: p.colorIdx, colorName: PLAYER_COLORS[p.colorIdx],
      readyNext: p.readyNext, // 精算モーダルの「誰を待っているか」表示用
      score: p.score, chip: room.settings.elimination ? p.chip : 'off',
      handCount: p.hand.length,
      // 公開情報: 11で公開されたカード + 両面24の所在
      openCards: p.hand.filter((c) => p.revealed.has(c.id) || c.doubleFaced).map(publicCard),
      // 公開位置（update10）: 11で公開中のカードが「手札のどの位置か」を、相手の扇で
      // その位置だけ表面＋目アイコンで示すために送る。載せるのは公開済みカードの情報だけで、
      // 非公開カードの位置・中身は一切含めない（位置以外の新たな情報漏洩は生じない）
      openSlots: p.hand.map((c, i) => (p.revealed.has(c.id) ? { i, card: publicCard(c) } : null)).filter(Boolean),
      hasDouble24: p.hand.some((c) => c.doubleFaced),
    })),
    me: {
      id: me.id, name: me.name, isHost: me.id === room.hostId,
      colorIdx: me.colorIdx, colorName: PLAYER_COLORS[me.colorIdx],
      // open: 11で公開され全員に見えている自分のカード（目印表示用。本人の分のみ追加情報）
      hand: me.hand.map((c) => ({ ...publicCard(c), open: me.revealed.has(c.id) })),
      handNumSum: G.handNumberSum(me.hand),
      handPointSum: G.handPointSum(me.hand),
      isMyTurn, playable, drewThisTurn: room.drewThisTurn,
      canAct: isMyTurn,
    },
  };
}
function broadcast(room) {
  for (const p of room.players) {
    if (p.ws && p.ws.readyState === 1) {
      p.ws.send(JSON.stringify({ t: 'state', state: viewFor(room, p), serverNow: Date.now() }));
    }
  }
}

// ---------- CPU ----------
const CPU_NAMES = ['ドン・カルロ', 'ルチア', 'ヴィト', 'サルバトーレ', 'ジーナ'];
function cpuThink(room) {
  if (room.phase === 'lobby' || room.phase === 'gameover') return;
  // ドボン宣言（受付中）
  if ((room.phase === 'dobonWindow' || room.phase === 'dobonExtra') && room.window) {
    for (const p of room.players) {
      if (!p.isCPU) continue;
      if (p.id === room.window.playedBy || room.window.declarations.includes(p.id)) continue;
      if (G.canDobon(p.hand, room.window.card.num) && Math.random() < 0.8) {
        setTimeout(() => { if (rooms.has(room.code)) declareDobon(room, p); }, 300 + Math.random() * 900);
        return;
      }
    }
    // 予約: 次のCPUが受付中にカードを選ぶ
    const np = nextSeat(room, room.window.playedBy);
    if (np.isCPU && !room.reservation) {
      setTimeout(() => {
        if (!rooms.has(room.code) || room.phase !== 'dobonWindow' || room.reservation) return;
        const cand = np.hand.find((c) => G.canPlay(c, room.field));
        if (cand) doReserve(room, np, cand.id, autoChoice(room, cand));
      }, 500);
    }
    return;
  }
  if (room.phase === 'startChoice' && room.startChoice) {
    const p = P(room, room.startChoice.playerId);
    if (p && p.isCPU) setTimeout(() => doStartChoice(room, p, autoChoice(room, room.fieldTop)), 600);
    return;
  }
  if (room.phase === 'turn') {
    const cur = P(room, room.currentId);
    if (!cur || !cur.isCPU) return;
    setTimeout(() => {
      if (!rooms.has(room.code) || room.phase !== 'turn' || room.currentId !== cur.id) return;
      if (room.pendingDraw > 0) {
        const chain = cur.hand.find((c) => c.num === 2);
        if (chain && Math.random() < 0.6) return doPlay(room, cur, chain.id, autoChoice(room, chain));
        return doDrawPending(room, cur);
      }
      if (room.pendingReveal > 0) {
        const chain = cur.hand.find((c) => c.num === 11);
        if (chain && Math.random() < 0.5) return doPlay(room, cur, chain.id, autoChoice(room, chain));
        return doReveal(room, cur);
      }
      const playable = playableCards(room, cur);
      if (room.mustNagashi) {
        const c = cur.hand[Math.floor(Math.random() * cur.hand.length)];
        if (c) return doPlay(room, cur, c.id, autoChoice(room, c));
      }
      if (playable.length) {
        const c = playable[Math.floor(Math.random() * playable.length)];
        return doPlay(room, cur, c.id, autoChoice(room, c));
      }
      if (!room.drewThisTurn) { doDraw(room, cur); return cpuThinkSoon(room); }
      return doPass(room, cur);
    }, 700 + Math.random() * 500);
  }
}
function cpuThinkSoon(room) { setTimeout(() => scheduleCPU(room), 350); }
function scheduleCPU(room) { cpuThink(room); }

function doStartChoice(room, player, choice) {
  if (room.phase !== 'startChoice' || !room.startChoice || room.startChoice.playerId !== player.id) return false;
  const top = room.fieldTop;
  if (room.startChoice.kind === 'suit' && choice.suit) room.field.effSuit = choice.suit;
  if (room.startChoice.kind === 'dir' && choice.dir) room.field.effArrow = choice.dir;
  room.startChoice = null;
  room.phase = 'turn';
  beginTurn(room);
  broadcast(room); scheduleCPU(room);
  return true;
}

// ---------- WS ----------
function send(ws, obj) { if (ws.readyState === 1) ws.send(JSON.stringify(obj)); }

wss.on('connection', (ws) => {
  let myRoom = null, myPlayer = null;
  ws.on('message', (raw) => {
    let m; try { m = JSON.parse(raw); } catch { return; }
    try {
      switch (m.t) {
        case 'create': {
          const settings = {};
          for (const k of Object.keys(DEFAULT_SETTINGS)) if (m.settings && m.settings[k] !== undefined) settings[k] = m.settings[k];
          settings.elimination = !!settings.elimination;
          myPlayer = mkPlayer((m.name || '').slice(0, 16) || '幹部');
          myPlayer.ws = ws; myPlayer.connected = true;
          myRoom = mkRoom(myPlayer, settings);
          rooms.set(myRoom.code, myRoom);
          if (m.test) {
            const n = Math.min(4, Math.max(1, m.cpuCount || 3));
            for (let i = 0; i < n && myRoom.players.length < 5; i++) {
              const cpu = mkPlayer(CPU_NAMES[i % CPU_NAMES.length], true);
              cpu.connected = true;
              assignColor(myRoom, cpu);
              myRoom.players.push(cpu);
            }
          }
          send(ws, { t: 'joined', code: myRoom.code, playerId: myPlayer.id, token: myPlayer.token });
          broadcast(myRoom);
          break;
        }
        case 'join': {
          const room = rooms.get((m.code || '').toUpperCase());
          if (!room) return send(ws, { t: 'error', msg: '部屋が見つからない' });
          if (room.phase !== 'lobby') return send(ws, { t: 'error', msg: '抗争はもう始まっている' });
          if (room.players.length >= 5) return send(ws, { t: 'error', msg: '満員で席がない' });
          myPlayer = mkPlayer((m.name || '').slice(0, 16) || '幹部');
          myPlayer.ws = ws; myPlayer.connected = true;
          assignColor(room, myPlayer);
          room.players.push(myPlayer);
          myRoom = room;
          send(ws, { t: 'joined', code: room.code, playerId: myPlayer.id, token: myPlayer.token });
          broadcast(room);
          break;
        }
        case 'rejoin': {
          const room = rooms.get((m.code || '').toUpperCase());
          if (!room) return send(ws, { t: 'error', msg: '部屋が見つからない' });
          const p = room.players.find((x) => x.token === m.token);
          if (!p) return send(ws, { t: 'error', msg: '席が見つからない' });
          myRoom = room; myPlayer = p;
          p.ws = ws; p.connected = true;
          send(ws, { t: 'joined', code: room.code, playerId: p.id, token: p.token });
          if (room.phase === 'turn' && room.currentId === p.id) armTurnTimer(room);
          broadcast(room);
          break;
        }
        case 'setName': {
          if (!myRoom || !myPlayer) return;
          myPlayer.name = (m.name || '').slice(0, 16) || myPlayer.name;
          broadcast(myRoom);
          break;
        }
        case 'start': {
          if (!myRoom || !myPlayer || myPlayer.id !== myRoom.hostId) return;
          if (myRoom.phase !== 'lobby' || myRoom.players.length < 2) return;
          myRoom.startedAt = Date.now();
          myRoom.round = 0;
          myRoom.markerId = myRoom.players[Math.floor(Math.random() * myRoom.players.length)].id;
          for (const p of myRoom.players) { p.score = 50; p.chip = 'gake'; }
          startRound(myRoom);
          break;
        }
        case 'startChoice': if (myRoom && myPlayer) doStartChoice(myRoom, myPlayer, m); break;
        case 'draw': if (myRoom && myPlayer) doDraw(myRoom, myPlayer); break;
        case 'play': if (myRoom && myPlayer) { if (!doPlay(myRoom, myPlayer, m.cardId, m)) send(ws, { t: 'error', msg: 'そのカードは出せない' }); } break;
        case 'pass': if (myRoom && myPlayer) doPass(myRoom, myPlayer); break;
        case 'reserve': if (myRoom && myPlayer) doReserve(myRoom, myPlayer, m.cardId, m); break;
        case 'touch': if (myRoom && myPlayer) doTouch(myRoom, myPlayer, m.index); break;
        case 'reorder': if (myRoom && myPlayer) doReorder(myRoom, myPlayer, m.order); break;
        case 'dobon': if (myRoom && myPlayer) declareDobon(myRoom, myPlayer); break;
        case 'kaeshi': if (myRoom && myPlayer) doKaeshi(myRoom, myPlayer); break;
        case 'drawPending': if (myRoom && myPlayer) doDrawPending(myRoom, myPlayer); break;
        case 'reveal': if (myRoom && myPlayer) doReveal(myRoom, myPlayer); break;
        case 'next': {
          if (!myRoom || !myPlayer || myRoom.phase !== 'settle') return;
          myPlayer.readyNext = true;
          if (myRoom.players.every((p) => p.readyNext || !p.connected)) proceedAfterSettle(myRoom);
          else broadcast(myRoom);
          break;
        }
        case 'endReserve': {
          if (!myRoom || !myPlayer || myPlayer.id !== myRoom.hostId) return;
          myRoom.endReserved = true;
          broadcast(myRoom);
          break;
        }
        case 'endNow': {
          if (!myRoom || !myPlayer || myPlayer.id !== myRoom.hostId) return;
          if (myRoom.phase !== 'lobby' && myRoom.phase !== 'gameover') { myRoom.settle = myRoom.settle || { eliminatedId: null }; gameOver(myRoom); }
          break;
        }
        case 'again': {
          if (!myRoom || !myPlayer || myPlayer.id !== myRoom.hostId) return;
          clearAllTimers(myRoom);
          myRoom.phase = 'lobby'; myRoom.result = null; myRoom.settle = null;
          myRoom.endReserved = false; myRoom.forceLastRound = false; myRoom.round = 0;
          for (const p of myRoom.players) { p.score = 50; p.chip = 'gake'; p.hand = []; }
          broadcast(myRoom);
          break;
        }
        case 'close': {
          if (!myRoom || !myPlayer || myPlayer.id !== myRoom.hostId) return;
          clearAllTimers(myRoom);
          for (const p of myRoom.players) if (p.ws) send(p.ws, { t: 'closed' });
          rooms.delete(myRoom.code);
          myRoom = null;
          break;
        }
      }
    } catch (e) {
      console.error('handler error', e);
      send(ws, { t: 'error', msg: '処理に失敗した' });
    }
  });
  ws.on('close', () => {
    if (myRoom && myPlayer) {
      myPlayer.connected = false;
      myPlayer.ws = null;
      clearTouch(myRoom, myPlayer); // 切断したら「触れている」表示も消す
      if (myRoom.phase === 'turn' && myRoom.currentId === myPlayer.id) armTurnTimer(myRoom);
      if (myRoom.phase === 'settle') {
        myPlayer.readyNext = true;
        if (myRoom.players.every((p) => p.readyNext || !p.connected)) proceedAfterSettle(myRoom);
      }
      broadcast(myRoom);
    }
  });
});

if (require.main === module) {
  server.listen(PORT, () => console.log(`24ドボン Web版 listening on :${PORT}`));
}

// テスト用（スモークテストの再現ケースから内部関数を直接検証するため）
module.exports = { mkRoom, mkPlayer, viewFor, doPlay, playableCards, closeWindow, doTouch, PLAYER_COLORS, doPass, doDraw, doReveal };
