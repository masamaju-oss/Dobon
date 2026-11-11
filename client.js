'use strict';
/* 24ドボン クライアント */
const $ = (id) => document.getElementById(id);
let ws = null, S = null; // S = 最新の状態
let myId = null, serverOffset = 0;
let selectedCard = null;      // 候補表示中のカード
let pendingChoice = null;     // {cardId, kind:'suit'|'dir', mode:'play'|'reserve'}
let assist = localStorage.getItem('dobon_assist') !== '0';
let muted = localStorage.getItem('dobon_mute') === '1';
let lastEventSeq = -1, settleShownKey = null, resultShown = false;

// ---------- 効果音（WebAudio簡易シンセ） ----------
let AC = null;
function beep(freq, dur, type = 'sine', gain = 0.15, slideTo = null) {
  if (muted) return;
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    const o = AC.createOscillator(), g = AC.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, AC.currentTime);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, AC.currentTime + dur);
    g.gain.setValueAtTime(gain, AC.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, AC.currentTime + dur);
    o.connect(g).connect(AC.destination); o.start(); o.stop(AC.currentTime + dur);
  } catch {}
}
function playEventSound(kind) {
  if (kind === 'play') beep(220, 0.07, 'square', 0.08);
  else if (kind === 'draw') beep(500, 0.05, 'sine', 0.06);
  else if (kind === 'dobon') { beep(300, 0.35, 'sawtooth', 0.2, 55); }
  else if (kind === 'kaeshi') { beep(160, 0.5, 'sawtooth', 0.25, 40); beep(90, 0.5, 'square', 0.15, 30); }
  else if (kind === 'bundle' || kind === 'win') { beep(880, 0.09, 'sine', 0.1); setTimeout(() => beep(1174, 0.12, 'sine', 0.1), 90); }
  else if (kind === 'pass') beep(330, 0.05, 'sine', 0.05);
  else if (kind === 'reveal') beep(660, 0.1, 'triangle', 0.1);
}

// ---------- WS ----------
function connect() {
  ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host);
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.t === 'joined') {
      myId = m.playerId;
      localStorage.setItem('dobon_session', JSON.stringify({ code: m.code, token: m.token, playerId: m.playerId }));
    } else if (m.t === 'state') {
      serverOffset = m.serverNow - Date.now();
      S = m.state;
      if (S.lastEvent && S.lastEvent.seq !== lastEventSeq) {
        if (lastEventSeq >= 0) playEventSound(S.lastEvent.kind);
        lastEventSeq = S.lastEvent.seq;
      }
      render();
    } else if (m.t === 'error') {
      $('entry-error').textContent = m.msg;
      alert(m.msg);
    } else if (m.t === 'closed') {
      localStorage.removeItem('dobon_session');
      location.reload();
    }
  };
  ws.onclose = () => {
    setTimeout(() => {
      connect();
      const sess = JSON.parse(localStorage.getItem('dobon_session') || 'null');
      if (sess) setTimeout(() => send({ t: 'rejoin', code: sess.code, token: sess.token }), 300);
    }, 2000);
  };
}
function send(obj) { if (ws && ws.readyState === 1) ws.send(JSON.stringify(obj)); }

// ---------- カード描画（情報レイヤー） ----------
const ART = { 0: '0.webp', 2: '2.webp', 7: '7.webp', 11: '11.webp', 24: '24.webp' };
const FLAVOR = {
  0: 'ここでは、銃も金も、静かに眠る。', 1: '路地の奥に、最初の取引。', 2: 'その荷、次はお前が持て。',
  3: '三番地の店先、今日も静か。', 4: '四番地、顔見知りだけの店。', 5: '五番地の灯りは消えない。',
  6: '六番地、裏口はいつも開いている。', 7: 'この街の流れは、俺が決める。', 8: '八番地、噂は金より早い。',
  9: '九番地、深夜の荷下ろし。', 10: '十番地、見張りがいる。', 11: '全部、見えている。',
  12: '十二番地、街の果て。', 24: '街の金は、夜ここに集まる。',
};
function fxIcon(card) {
  // 効果アイコン（高さはCSSでカード縦の18%に統一）
  const s = 'width:auto;height:100%';
  if (card.num === 0 || card.num === 24)
    return `<svg style="${s}" viewBox="0 0 40 40"><rect x="2" y="2" width="36" height="36" rx="5" fill="#f5f5f5" stroke="#c9a227" stroke-width="2"/><path d="M2 2 L38 38 L2 38 Z" fill="#111"/></svg>`;
  if (card.draw5)
    return `<svg style="${s}" viewBox="0 0 52 40"><rect x="4" y="10" width="26" height="18" rx="2" fill="#a31621"/><rect x="8" y="6" width="26" height="18" rx="2" fill="#c12331"/><text x="36" y="30" font-size="17" font-weight="900" fill="#ff5964">+5</text></svg>`;
  if (card.num === 2)
    return `<svg style="${s}" viewBox="0 0 52 40"><rect x="4" y="10" width="26" height="18" rx="2" fill="#7d1d24"/><rect x="8" y="6" width="26" height="18" rx="2" fill="#a31621"/><text x="36" y="30" font-size="17" font-weight="900" fill="#ff7a45">+2</text></svg>`;
  if (card.num === 7)
    return `<svg style="${s}" viewBox="0 0 40 40"><rect x="8" y="4" width="10" height="15" rx="2" fill="#a31621"/><path d="M13 16 l0 -8 M9.5 11 L13 7.5 L16.5 11" stroke="#fff" stroke-width="2" fill="none"/><rect x="22" y="21" width="10" height="15" rx="2" fill="#a31621"/><path d="M27 24 l0 8 M23.5 29 L27 32.5 L30.5 29" stroke="#fff" stroke-width="2" fill="none"/><rect x="18.6" y="4" width="2.8" height="32" fill="#c9a227"/></svg>`;
  if (card.num === 11)
    return `<svg style="${s}" viewBox="0 0 48 40"><ellipse cx="24" cy="17" rx="16" ry="9" fill="#e8b33a" stroke="#8a6d1c"/><circle cx="24" cy="17" r="5.5" fill="#3a2a05"/><circle cx="24" cy="17" r="2.4" fill="#000"/><rect x="10" y="28" width="12" height="9" rx="1.5" fill="#c9a227" transform="rotate(-8 16 32)"/><rect x="26" y="28" width="12" height="9" rx="1.5" fill="#a31621" transform="rotate(6 32 32)"/><text x="29.5" y="35.5" font-size="7.5" font-weight="900" fill="#ffd7da">24</text></svg>`;
  return '';
}
function bundleSVG() {
  return `<svg viewBox="0 0 24 20" width="24" height="20"><rect x="1" y="5" width="22" height="12" rx="1.5" fill="#b9cf9f" stroke="#5c7350"/><rect x="2.5" y="2.5" width="19" height="4" rx="1" fill="#cfdfb2" stroke="#5c7350"/><rect x="10.6" y="2.5" width="2.8" height="14.5" fill="#7a8f6d"/></svg>`;
}
function cardEl(card, opts = {}) {
  const d = document.createElement('div');
  const special = card.num === 0 || card.num === 24;
  d.className = 'card' + (special ? ' gold-frame gold-line' : (card.suit === 'W' ? ' suit-W' : ' suit-B')) + (opts.big ? ' big' : '');
  const art = ART[card.num];
  const flavor = card.draw5 ? '触れるな。ここは最奥だ。' : (FLAVOR[card.num] || '');
  d.innerHTML = `
    ${art ? `<div class="art" style="background-image:url(${art})"></div>` : `<div class="art-none">${card.num}</div>`}
    <div class="idx">${card.num}<span class="arrow">${card.arrow === 'up' ? '↑' : '↓'}</span></div>
    ${!special ? '<div class="suit-dot"></div>' : ''}
    <div class="score-badge">${bundleSVG()}<span class="bnum">${card.pts}</span></div>
    ${card.draw5 ? '<div style="position:absolute;inset:3px;border:2px solid #a31621;border-radius:5px;pointer-events:none;z-index:2"></div>' : ''}
    <div class="fx">${fxIcon(card)}</div>
    <div class="flavor">${flavor}</div>`;
  return d;
}
function miniCard(card, open) {
  const d = document.createElement('div');
  d.className = 'mini-card' + (card.suit === 'W' ? ' w' : '') + (open ? ' open' : '');
  d.textContent = `${card.num}${card.arrow === 'up' ? '↑' : '↓'}`;
  return d;
}
// 札束の山（決定的な疑似ランダムで雑に積む）
function bundlesEl(player, isMe) {
  const wrap = document.createElement('div');
  const s = player.score;
  wrap.className = 'bundles' + (s < 0 ? ' neg' : '');
  const n = Math.min(Math.abs(s), 14);
  let seed = player.id.charCodeAt(0) * 31 + Math.abs(s);
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  for (let i = 0; i < n; i++) {
    const b = document.createElement('div');
    b.className = 'bundle';
    b.style.left = (rnd() * 55) + '%';
    b.style.bottom = Math.floor(i / 5) * 9 + rnd() * 3 + 'px';
    b.style.transform = `rotate(${(rnd() * 36 - 18).toFixed(0)}deg)`;
    wrap.appendChild(b);
  }
  const c = document.createElement('span');
  c.className = 'bcount';
  c.textContent = s <= -15 || s >= 15 ? `×${Math.abs(s)}` : '';
  wrap.appendChild(c);
  wrap.title = 'タップで正確な得点';
  wrap.onclick = () => showModal(`<h3>${player.name} の資金</h3><p style="font-size:28px;text-align:center">${s} 点</p><button class="big" onclick="hideModal()">閉じる</button>`);
  return wrap;
}

// ---------- 画面描画 ----------
const screens = { entry: $('screen-entry'), lobby: $('screen-lobby'), game: $('screen-game') };
function showScreen(name) { for (const k in screens) screens[k].classList.toggle('hidden', k !== name); }

function render() {
  if (!S) return;
  if (S.phase === 'lobby') { renderLobby(); showScreen('lobby'); return; }
  showScreen('game');
  renderGame();
}
function nameOf(id) { const p = S.players.find((p) => p.id === id); return p ? p.name : '？'; }

function renderLobby() {
  $('lobby-code').textContent = S.code;
  const st = S.settings;
  const roundsLabel = { '6': '6ラウンド', '8': '8ラウンド', '10': '10ラウンド', time: `時間制${st.minutes ? st.minutes + '分' : '（無制限）'}`, any: '任意終了' }[st.rounds];
  $('lobby-settings').textContent = `設定: ${roundsLabel}／脱落${st.elimination ? 'あり' : 'なし'}／手番制限${st.turnLimit ? st.turnLimit + '秒' : 'オフ'}`;
  $('lobby-players').innerHTML = '';
  for (const p of S.players) {
    const d = document.createElement('div');
    d.className = 'player-chip';
    d.innerHTML = `<span>${p.name}${p.id === myId ? '（あなた）' : ''}</span><span class="tag">${p.isHost ? 'ホスト' : ''}${p.isCPU ? ' CPU' : ''}${p.connected ? '' : ' 切断中'}</span>`;
    $('lobby-players').appendChild(d);
  }
  const isHost = S.hostId === myId;
  $('btn-start').classList.toggle('hidden', !isHost);
  $('btn-start').disabled = S.players.length < 2;
  $('lobby-wait').textContent = isHost ? (S.players.length < 2 ? '2人以上で開始できます' : '') : 'ホストの開始を待っています…';
  if (document.activeElement !== $('in-name2')) $('in-name2').value = S.me.name;
}

function renderGame() {
  const st = S.settings;
  $('round-label').textContent = `第${S.round}夜` + (S.totalRounds ? ` / 全${S.totalRounds}夜` : '');
  $('time-label').textContent = S.timeLeftSec != null ? `残り ${Math.floor(S.timeLeftSec / 60)}:${String(S.timeLeftSec % 60).padStart(2, '0')}` : (S.lastRound ? '最終夜' : '');
  $('btn-sound').textContent = muted ? '音: OFF' : '音: ON';
  $('btn-assist').textContent = assist ? '補助: ON' : '補助: OFF';
  $('host-tools').classList.toggle('hidden', !S.me.isHost || S.phase === 'gameover');

  // 相手
  const opp = $('opponents'); opp.innerHTML = '';
  for (const p of S.players) {
    if (p.id === myId) continue;
    const d = document.createElement('div');
    d.className = 'opp' + (S.currentId === p.id && (S.phase === 'turn') ? ' active' : '');
    let chipHtml = '';
    if (st.elimination) chipHtml = p.chip === 'gake' ? '<span class="chip-ico">後ろ盾: 表</span>' : '<span class="chip-ico dead">後ろ盾: 死</span>';
    d.innerHTML = `<div class="nm">${p.name}${p.isMarker ? ' 👑' : ''}</div>
      <div class="meta">手札 ${p.handCount}枚${p.connected ? '' : '・切断中'}${p.hasDouble24 ? '・両面24所持' : ''}</div>${chipHtml}`;
    if (p.openCards.length) {
      const oc = document.createElement('div'); oc.className = 'open-cards';
      for (const c of p.openCards) oc.appendChild(miniCard(c, true));
      d.appendChild(oc);
    }
    d.appendChild(bundlesEl(p));
    opp.appendChild(d);
  }
  // 自分の札束と状態
  const me = S.players.find((p) => p.id === myId);
  const ms = $('my-status');
  let myChip = '';
  if (st.elimination) myChip = me.chip === 'gake' ? '後ろ盾チップ: 表（がけっぷち）' : '後ろ盾チップ: 死（次に払い切れなければ破門）';
  ms.innerHTML = `${S.me.isMyTurn ? '<span class="turn">あなたの手番</span>' : `${nameOf(S.currentId)} の手番`}　${myChip}`;
  const oldBundles = ms.querySelector('.bundles'); if (oldBundles) oldBundles.remove();
  ms.appendChild(bundlesEl(me, true));

  // 場
  $('deck-count').textContent = S.deckCount + '枚';
  const fc = $('field-card'); fc.innerHTML = '';
  if (S.fieldTop) fc.appendChild(cardEl(S.fieldTop, { big: !!S.window }));
  const fi = $('field-info');
  let info = '';
  if (S.field) info = `条件: ${S.field.effSuit === 'W' ? '白（表通り）' : '黒（裏路地）'} ／ ${S.field.effBase}${S.field.effArrow === 'up' ? '以上↑' : '以下↓'}`;
  if (S.pendingDraw) info += `<br>ドロー累積: ${S.pendingDraw}枚`;
  if (S.pendingReveal) info += `<br>公開累積: ${S.pendingReveal}枚`;
  if (S.mustNagashi) info += '<br><span class="win">場流しをしてください（好きな1枚）</span>';
  if (S.window) {
    const remain = Math.max(0, (S.window.endsAt - (Date.now() + serverOffset)) / 1000);
    const total = S.window.extra ? 3 : st.dobonSec;
    info += `<br><span class="win">ドボン受付中</span><div class="progress"><i style="width:${(remain / total * 100).toFixed(0)}%"></i></div>`;
    if (S.window.declarations.length) info += `<br>宣言: ${S.window.declarations.map(nameOf).join('、')}`;
    if (S.window.myReservation) info += '<br>予約済み';
  }
  if (S.phase === 'kaeshi') info += '<br><span class="win">ドボン返し受付中…</span>';
  fi.innerHTML = info;

  renderBanner();
  renderActions();
  renderHand();
  // ドボンボタン
  const db = $('btn-dobon');
  const canD = S.window && S.window.canDobon;
  db.disabled = !canD;
  db.classList.toggle('ready', !!(canD && assist));
  db.textContent = 'ドボン';
  // 返し全画面
  const ko = $('kaeshi-overlay');
  if (S.phase === 'kaeshi' && S.kaeshi && S.kaeshi.mine) {
    ko.classList.remove('hidden');
    const remain = Math.max(0, Math.ceil((S.kaeshi.endsAt - (Date.now() + serverOffset)) / 1000));
    $('kaeshi-sec').textContent = remain;
  } else ko.classList.add('hidden');
  // 精算・結果モーダル
  if (S.phase === 'settle' && S.settle) {
    const key = `${S.round}-${S.settle.type}-${S.settle.transfers.length}-${S.settle.scores[myId]}`;
    if (settleShownKey !== key) { settleShownKey = key; showSettle(); }
  }
  if (S.phase === 'gameover' && S.result && !resultShown) { resultShown = true; showResult(); }
  if (S.phase !== 'gameover') resultShown = false;
}

function renderBanner() {
  const b = $('banner');
  let txt = '', cls = '';
  if (S.window && S.window.dashikiri && !S.window.declarations.length) txt = `${nameOf(S.window.playedBy)} が出し切り！ ドボンのチャンス`;
  else if (S.window && S.window.declarations.length) { txt = `ドボン！（${S.window.declarations.map(nameOf).join('、')}）`; cls = 'dobon'; }
  else if (S.phase === 'kaeshi') { txt = 'ドボン返しのチャンス！'; cls = 'dobon'; }
  else if (S.startChoice) txt = `${nameOf(S.startChoice.playerId)} が開始条件を選んでいます`;
  b.textContent = txt;
  b.className = txt ? cls : 'hidden';
}

function renderActions() {
  const a = $('action-area'); a.innerHTML = '';
  const add = (label, fn, cls = '') => { const btn = document.createElement('button'); btn.textContent = label; btn.className = cls; btn.onclick = fn; a.appendChild(btn); return btn; };
  // 開始時選択
  if (S.phase === 'startChoice' && S.startChoice && S.startChoice.playerId === myId) {
    if (S.startChoice.kind === 'suit') { add('白（表通り）で開始', () => send({ t: 'startChoice', suit: 'W' })); add('黒（裏路地）で開始', () => send({ t: 'startChoice', suit: 'B' })); }
    else { add('↑方向で開始', () => send({ t: 'startChoice', dir: 'up' })); add('↓方向で開始', () => send({ t: 'startChoice', dir: 'down' })); }
    return;
  }
  // 選択肢が必要なカードの候補確定
  if (pendingChoice) {
    const { kind, mode } = pendingChoice;
    const mk = (label, val) => add(label, () => {
      const msg = { t: mode, cardId: pendingChoice.cardId };
      if (kind === 'suit') msg.suit = val; else msg.dir = val;
      send(msg); pendingChoice = null; selectedCard = null; render();
    }, 'choice-btn');
    if (kind === 'suit') { mk('次のスート: 白（表通り）', 'W'); mk('次のスート: 黒（裏路地）', 'B'); }
    else { mk('次の方向: ↑', 'up'); mk('次の方向: ↓', 'down'); }
    add('やめる', () => { pendingChoice = null; render(); });
    return;
  }
  if (!S.me.isMyTurn || S.phase !== 'turn') return;
  if (S.pendingDraw > 0) { add(`💥 ドロー${S.pendingDraw}枚を引く`, () => send({ t: 'drawPending' })); a.insertAdjacentHTML('beforeend', '<span class="hint" style="align-self:center">2をタップで累積チェーン</span>'); return; }
  if (S.pendingReveal > 0) { add(`👁 最大のカード${S.pendingReveal}枚を公開する`, () => send({ t: 'reveal' })); a.insertAdjacentHTML('beforeend', '<span class="hint" style="align-self:center">11をタップで累積チェーン</span>'); return; }
  if (!S.me.drewThisTurn && !S.mustNagashi) add('山札から1枚引く', () => send({ t: 'draw' }));
  if (!S.mustNagashi) add('パス', () => send({ t: 'pass' }));
  if (S.mustNagashi) a.insertAdjacentHTML('beforeend', '<span class="hint" style="align-self:center">場流し: 好きなカードを出してください</span>');
}

function needsChoice(card) {
  if (card.num === 0 || card.num === 24) return 'suit';
  if (card.num === 7) return 'dir';
  return null;
}
function renderHand() {
  const h = $('hand'); h.innerHTML = '';
  const playable = new Set(S.me.playable || []);
  for (const c of S.me.hand) {
    const el = cardEl(c);
    if (assist && S.me.isMyTurn) el.classList.add(playable.has(c.id) ? 'playable' : 'unplayable');
    if (!assist) el.classList.add('noassist');
    if (selectedCard === c.id) el.classList.add('selected');
    if (S.window && S.window.myReservation === c.id) el.classList.add('reserved');
    el.onclick = () => onTapCard(c);
    h.appendChild(el);
  }
  $('hand-totals').innerHTML = `手札合計: <b>${S.me.handNumSum}</b>（数字） ／ 支払い時 <b>${S.me.handPointSum}</b>点`;
}
function onTapCard(card) {
  // ドボン受付中: 次のプレイヤーは予約
  if (S.window && S.window.canReserve && S.phase !== 'kaeshi') {
    const kind = needsChoice(card);
    if (kind) { pendingChoice = { cardId: card.id, kind, mode: 'reserve' }; selectedCard = card.id; render(); return; }
    send({ t: 'reserve', cardId: card.id });
    selectedCard = card.id;
    return;
  }
  if (!S.me.isMyTurn || S.phase !== 'turn') { selectedCard = card.id; render(); return; }
  if (selectedCard !== card.id) { selectedCard = card.id; render(); return; } // 1回目: 候補
  // 2回目: 確定
  const playable = new Set(S.me.playable || []);
  if (!playable.has(card.id) && !S.mustNagashi) { return; }
  const kind = needsChoice(card);
  if (kind) { pendingChoice = { cardId: card.id, kind, mode: 'play' }; render(); return; }
  send({ t: 'play', cardId: card.id });
  selectedCard = null;
}

// ---------- モーダル ----------
function showModal(html) { $('modal-box').innerHTML = html; $('modal').classList.remove('hidden'); }
function hideModal() { $('modal').classList.add('hidden'); }
window.hideModal = hideModal;
function showSettle() {
  const st = S.settle;
  const rows = st.transfers.map((t) => `<div class="transfer-row"><span>${nameOf(t.from)} → ${nameOf(t.to)}</span><b>${t.amount}点（札束${t.amount}）${t.partial ? ' ※払える分だけ' : ''}</b></div>`).join('');
  const cliffs = (st.cliffEvents || []).map((e) => e.kind === 'gake'
    ? `<p>🩸 ${nameOf(e.playerId)} は崖っぷちチップを使った（裏返して「死」）</p>`
    : `<p>💀 ${nameOf(e.playerId)} は破門（脱落）</p>`).join('');
  const scoreRows = S.players.map((p) => `<tr><td>${p.name}${p.id === st.markerId ? ' 👑' : ''}</td><td>${st.scores[p.id]}点</td></tr>`).join('');
  showModal(`<h3>${st.label}！</h3>
    ${st.declarerIds && st.declarerIds.length ? `<p>宣言: ${st.declarerIds.map(nameOf).join('、')}</p>` : ''}
    ${rows || '<p>得点の移動はありません</p>'}${cliffs}
    ${st.markerMoved ? `<p>後継者の証は ${nameOf(st.markerId)} へ</p>` : ''}
    <table class="score-table">${scoreRows}</table>
    <button class="big gold" id="modal-next">${st.gameEnd ? '最終結果へ' : '次の夜へ'}</button>`);
  $('modal-next').onclick = () => { hideModal(); send({ t: 'next' }); };
}
function showResult() {
  const r = S.result;
  const rows = r.rankings.map((x) => `<tr><td>${x.rank}位</td><td>${x.name}${x.id === r.winnerId ? ' 👑' : ''}</td><td>${x.score}点</td></tr>`).join('');
  showModal(`<h3>抗争 終了</h3>
    ${r.eliminatedId ? `<p>💀 ${nameOf(r.eliminatedId)} の破門で終了</p>` : ''}
    <p style="text-align:center;font-size:18px">次期ボスは <b>${nameOf(r.winnerId)}</b></p>
    <table class="score-table">${rows}</table>
    ${S.me.isHost ? '<button class="big gold" id="modal-again">もう一局</button><button class="big" id="modal-close">部屋を閉じる</button>' : '<p class="hint">ホストの操作を待っています</p>'}`);
  const ag = $('modal-again'); if (ag) ag.onclick = () => { hideModal(); send({ t: 'again' }); };
  const cl = $('modal-close'); if (cl) cl.onclick = () => { if (confirm('部屋を閉じますか？')) send({ t: 'close' }); };
}

// ---------- 入口 ----------
function entrySettings() {
  return {
    rounds: $('in-rounds').value,
    minutes: parseInt($('in-minutes').value, 10),
    elimination: $('in-elimination').value === '1',
    turnLimit: parseInt($('in-turnlimit').value, 10),
    dobonSec: 3.5,
  };
}
$('btn-create').onclick = () => send({ t: 'create', name: $('in-name').value.trim(), settings: entrySettings() });
$('btn-test').onclick = () => send({ t: 'create', name: $('in-name').value.trim() || '幹部見習い', settings: { ...entrySettings(), rounds: '6' }, test: true, cpuCount: 3 });
$('btn-join').onclick = () => send({ t: 'join', code: $('in-code').value.trim().toUpperCase(), name: $('in-name').value.trim() });
$('btn-start').onclick = () => send({ t: 'start' });
$('in-name2').onchange = () => send({ t: 'setName', name: $('in-name2').value.trim() });
$('btn-dobon').onclick = () => send({ t: 'dobon' });
$('btn-kaeshi').onclick = () => send({ t: 'kaeshi' });
$('btn-sound').onclick = () => { muted = !muted; localStorage.setItem('dobon_mute', muted ? '1' : '0'); render(); };
$('btn-assist').onclick = () => { assist = !assist; localStorage.setItem('dobon_assist', assist ? '1' : '0'); render(); };
$('btn-end-reserve').onclick = () => { if (confirm('この夜が終わったら抗争を終了しますか？')) send({ t: 'endReserve' }); };
$('btn-end-now').onclick = () => { if (confirm('今すぐ抗争を終了しますか？')) send({ t: 'endNow' }); };
$('btn-discard').onclick = () => {
  if (!S) return;
  showModal(`<h3>捨て札（出た順・${S.discard.length}枚）</h3>`);
  const g = document.createElement('div'); g.className = 'discard-grid';
  for (const c of S.discard) g.appendChild(miniCard(c));
  $('modal-box').appendChild(g);
  $('modal-box').insertAdjacentHTML('beforeend', '<button class="big" onclick="hideModal()">閉じる</button>');
};

// カウントダウン再描画
setInterval(() => { if (S && (S.window || S.phase === 'kaeshi')) renderGame(); }, 250);

connect();
// 既存セッションがあれば復帰
const sess = JSON.parse(localStorage.getItem('dobon_session') || 'null');
if (sess) setTimeout(() => send({ t: 'rejoin', code: sess.code, token: sess.token }), 400);
