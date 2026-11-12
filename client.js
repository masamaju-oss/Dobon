'use strict';
/* 24ドボン クライアント */
const $ = (id) => document.getElementById(id);
let ws = null, S = null; // S = 最新の状態
let myId = null, serverOffset = 0;
let assist = localStorage.getItem('dobon_assist') !== '0';
let muted = localStorage.getItem('dobon_mute') === '1';
let showOppNums = localStorage.getItem('dobon_oppnums') !== '0'; // 他者の札束の数字表示（初期値ON、update4）
let lastEventSeq = -1, settleShownKey = null, resultShown = false;
let modalKind = null;        // 'generic'（捨て札・得点・遊び方）|'settle'（精算・結果）|'info'（自己確認）。受付中の退避判定に使う
let localReadyClicked = false; // 精算で自分が「次の夜へ」を押したか（モーダルを閉じず待機表示にする）
let touchByPlayer = {};      // 他プレイヤーが「いま触れている手札の位置」（位置だけ。中身は来ない）
let touchSentCardId = null;  // 自分が送信中の選択カード（解除送信の重複防止）
let prevMyTurn = false, prevRound = 0; // 番バナーの立ち上がり検出／ラウンド変更で touch 表示リセット
let selfCardShown = false;   // 開始時の自己確認カードを出したか（ロビーに戻るたびリセット）
let hqShowBack = false;      // スポットライトで本部24の裏面（夕景）を表示中か

// プレイヤーカラー（update4・ユーザー決定）: 入室順に 赤・青・緑・黄（5人目は紫=仮）。
// カードの色ルールとは別枠。サーバーは colorIdx/colorName を送り、CSS色はここで対応づける
const PCOLORS = [
  { name: '赤', css: '#e5484d' }, { name: '青', css: '#3e8ef7' }, { name: '緑', css: '#43b581' },
  { name: '黄', css: '#f2c230' }, { name: '紫', css: '#9b6dd6' },
];
const pcolor = (p) => PCOLORS[(p && p.colorIdx) || 0] || PCOLORS[0];
const myColorCss = () => (S && S.me ? (PCOLORS[S.me.colorIdx] || PCOLORS[0]).css : PCOLORS[0].css);
let sortingMode = false;       // 並び替えモード中はドラッグ並び替え有効・タップで出す操作は無効
let handDrag = null;           // ドラッグ並び替え中 {id, el, pid, startX, moved}
let localHandOrder = null;     // 直近の並び替え結果（サーバー状態が追いつくまでの楽観表示用）
let suppressTapUntil = 0;      // ドラッグ直後のタップ誤爆防止
let selected = null;           // 手札の選択状態 {cardId, choice:{suit?,dir?}}（1タップ=選択+大写し、2タップ=場に出す）
let spotInfo = null;           // 手札以外のカード（場札・公開札・捨て札）の詳細表示用カード
let spotKey = '';              // 大写しの再構築キー（250ms再描画でボタンが消えないよう変化時のみ再構築）

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
function playEventSound(ev) {
  const kind = ev && ev.kind;
  if (kind === 'play') beep(220, 0.07, 'square', 0.08);
  else if (kind === 'draw') beep(300, 0.05, 'triangle', 0.06);
  else if (kind === 'dobon') { beep(300, 0.35, 'sawtooth', 0.2, 55); }
  else if (kind === 'kaeshi') { beep(160, 0.5, 'sawtooth', 0.25, 40); beep(90, 0.5, 'square', 0.15, 30); }
  else if (kind === 'bundle' || kind === 'win') { beep(196, 0.07, 'triangle', 0.11); setTimeout(() => beep(147, 0.1, 'triangle', 0.09), 75); }
  else if (kind === 'pass') beep(262, 0.05, 'sine', 0.05);
  else if (kind === 'reveal') { beep(392, 0.09, 'triangle', 0.12); setTimeout(() => beep(523, 0.13, 'triangle', 0.12), 85); } // 公開: 上がる2音
  else if (kind === 'fx' && ev.fx === 'draw2') { beep(392, 0.09, 'square', 0.13); setTimeout(() => beep(311, 0.13, 'square', 0.13), 95); } // ドロー2: 下がる2音
  else if (kind === 'fx' && ev.fx === 'draw5') { beep(330, 0.12, 'sawtooth', 0.16, 220); setTimeout(() => beep(196, 0.22, 'sawtooth', 0.16, 120), 120); } // ドロー5: 重く長く
  else if (kind === 'fx' && ev.fx === 'reveal11') { beep(523, 0.08, 'triangle', 0.12); setTimeout(() => beep(659, 0.14, 'triangle', 0.12), 80); } // 11予告: 高い2音
}

// ---------- 効果発動の演出 ----------
let fxBannerTimer = null, fxFlashUntil = 0;
function showFxBanner(text, bad = false) {
  const b = $('fx-banner');
  b.textContent = text;
  b.className = bad ? 'bad' : '';
  clearTimeout(fxBannerTimer);
  fxBannerTimer = setTimeout(() => { b.className = 'hidden'; }, 2600);
}
function onFxEvent(ev) {
  if (!S) return;
  if (ev.kind === 'fx') {
    fxFlashUntil = Date.now() + 1250;
    const target = nameOf(ev.targetId);
    const mine = ev.targetId === myId;
    if (ev.fx === 'draw2') showFxBanner(`ドロー2。${target} は累積${ev.total}枚引く`, mine);
    else if (ev.fx === 'draw5') showFxBanner(`最奥のドロー5。${target} が5枚引く`, mine);
    else if (ev.fx === 'reveal11') showFxBanner(`11。${target} の最大カード${ev.total > 1 ? ev.total + '枚' : ''}が公開される`, mine);
  } else if (ev.kind === 'reveal' && ev.cardIds) {
    // 公開の確定通知（自分が公開したときは、どのカードが・なぜ出たかまで明示）
    if (ev.playerId === myId) {
      const names = ev.cardIds.map((id) => {
        const c = (S.me.hand || []).find((x) => x.id === id);
        return c ? `${c.num}${c.arrow === 'up' ? '↑' : '↓'}` : '？';
      }).join('・');
      showFxBanner(`11の効果。お前の ${names} が公開された`, true);
    } else {
      showFxBanner(`${nameOf(ev.playerId)} が最大カードを公開`);
    }
  }
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
        if (lastEventSeq >= 0) {
          playEventSound(S.lastEvent); onFxEvent(S.lastEvent);
          // 場に出たカードの演出（render前のDOM=手札/裏面列の位置から飛ばすため、ここで処理する）
          if (S.lastEvent.kind === 'play') onPlayEvent(S.lastEvent);
        }
        lastEventSeq = S.lastEvent.seq;
      }
      render();
    } else if (m.t === 'handShuffle') {
      animateHandShuffle(m.playerId);
    } else if (m.t === 'touchCard') {
      // 相手が触れているカードの「位置」だけが届く（中身は届かない）。裏面列の1枚を持ち上げる
      if (m.index == null) delete touchByPlayer[m.playerId];
      else touchByPlayer[m.playerId] = m.index;
      applyTouchLift(m.playerId);
    } else if (m.t === 'error') {
      showError(m.msg); // alert() は廃止（帯表示に統一。update4）
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

// エラー表示（update4: alert廃止）。入口では従来のインライン、対戦中は上部の帯で出す
let errorBandTimer = null;
function showError(msg) {
  const entryVisible = !$('screen-entry').classList.contains('hidden');
  if (entryVisible || !S) { $('entry-error').textContent = msg; return; }
  const b = $('error-band');
  if (!b) { $('entry-error').textContent = msg; return; }
  b.textContent = msg;
  b.classList.remove('hidden');
  clearTimeout(errorBandTimer);
  errorBandTimer = setTimeout(() => b.classList.add('hidden'), 3500);
}

// 自分の「触れている位置」をサーバーへ（位置=サーバー順の手札の添字。中身は送らない）
function sendTouch(cardId) {
  if (touchSentCardId === cardId) return;
  touchSentCardId = cardId;
  if (!S || !S.me) return;
  const idx = cardId ? S.me.hand.findIndex((c) => c.id === cardId) : -1;
  send({ t: 'touch', index: cardId ? idx : null });
}
// 相手の裏面列へ「触れている1枚」の持ち上げを反映する（再描画後にも renderGame から呼ばれる）
function applyTouchLift(playerId) {
  const row = document.querySelector(`.opp-backs[data-pid="${playerId}"]`);
  if (!row) return;
  const idx = touchByPlayer[playerId];
  [...row.children].forEach((b, i) => b.classList.toggle('touching', idx != null && i === idx));
}

// ---------- カード描画（情報レイヤー） ----------
// イラストは承認サンプルの「中央イラスト帯だけ」を切り出した band 画像を使う。
// サンプル全面には数字・バッジ・効果アイコンが印刷されており、そのまま使うと
// 情報レイヤーと二重描画になるため（2026-11-11 大改修）。元画像は見本表示用に残置。
// アートパスはこのブロックに集約する（flat変換ではプレフィックス AP の値だけが変わる）
const AP = '';
const ART = {
  0: AP + '0-band.webp', 1: AP + '1-band.webp', 2: AP + '2-band.webp', 3: AP + '3-band.webp',
  4: AP + '4-band.webp', 5: AP + '5-band.webp', 6: AP + '6-band.webp', 7: AP + '7-band.webp',
  8: AP + '8-band.webp', 9: AP + '9-band.webp', 10: AP + '10-band.webp', 11: AP + '11-band.webp',
  12: AP + '12-band.webp', 24: AP + '24-band.webp',
};
const ART_DRAW5 = AP + '1-draw5-band.webp'; // ドロー5黒1専用（密書。通常の1=共同水道とは別絵で管理）
const ART24 = { // 24の絵柄バリアント（表示専用）。全体像を切り抜かずに見せる
  casino: AP + '24-casino.webp', tower: AP + '24-tower.webp',
  hq: AP + '24-hq.webp', hqBack: AP + '24-hq-back.webp', // 本部: 表=真昼／裏=夕景
};
const MARKER_IMG = AP + 'marker-ring.webp'; // 後継者の証（紋章の印章指輪）
const CHIP_IMG = { front: AP + 'chip-front.webp', back: AP + 'chip-back.webp' }; // 庇護の証 表／裏（死）
// cover 表示時の主役の横位置（帯画像内で被写体が中央に無いものだけ調整）
const ART_POS = { 0: '50%', 2: '38%', 7: '50%', 11: '34%', 24: '50%' };
// カード→表示アートの解決（24はバリアントで全面寄り表示、それ以外は中央バンド）
function artFor(card) {
  if (card.draw5) return { src: ART_DRAW5, full: false };
  if (card.num === 24 && card.art && ART24[card.art]) return { src: ART24[card.art], full: true };
  return { src: ART[card.num] || null, full: false };
}
const FLAVOR = {
  0: 'ここでは、銃も金も、静かに眠る。', 1: '路地の奥に、最初の取引。', 2: 'その荷、次はお前が持て。',
  3: '三番地の店先、今日も静か。', 4: '四番地、顔見知りだけの店。', 5: '五番地の灯りは消えない。',
  6: '六番地、裏口はいつも開いている。', 7: 'この街の流れは、俺が決める。', 8: '八番地、噂は金より早い。',
  9: '九番地、深夜の荷下ろし。', 10: '十番地、見張りがいる。', 11: '全部、見えている。',
  12: '十二番地、街の果て。', 24: '街の金は、夜ここに集まる。',
};
function fxIcon(card) {
  // 効果アイコン（2026-11-11 新ルール）: 高さ上限はカード縦の最大3/7まで可（CSS側で32%に設定）。
  // 円形の紋章メダルの中に収める: 真鍮の縁取り＋濃い地＋影で、イラスト背景に混ざらないようにする。
  // ラベルはSVGから分離し、メダル下部にHTMLテキストで置く（旧: SVG内テキスト＋18%上限）
  const s = 'width:auto;height:100%';
  const lab = (t) => `<span class="fxlab">${t}</span>`;
  if (card.num === 0 || card.num === 24)
    return `<svg style="${s}" viewBox="0 0 52 36"><rect x="11" y="2" width="30" height="30" rx="5" fill="#f5f5f5" stroke="#c9a227" stroke-width="3"/><path d="M11 2 L41 32 L11 32 Z" fill="#111"/></svg>${lab('変更')}`;
  if (card.draw5)
    return `<svg style="${s}" viewBox="0 0 52 36"><rect x="10" y="7" width="30" height="21" rx="2.5" fill="#7d1119"/><rect x="13" y="4" width="30" height="21" rx="2.5" fill="#d21f2e" stroke="#5c0a10" stroke-width="1.6"/><text x="28" y="21" font-size="14" font-weight="900" text-anchor="middle" fill="#fff">+5</text></svg>${lab('引5')}`;
  if (card.num === 2)
    return `<svg style="${s}" viewBox="0 0 52 36"><rect x="10" y="7" width="30" height="21" rx="2.5" fill="#8a3408"/><rect x="13" y="4" width="30" height="21" rx="2.5" fill="#f06414" stroke="#6e2a05" stroke-width="1.6"/><text x="28" y="21" font-size="14" font-weight="900" text-anchor="middle" fill="#fff">+2</text></svg>${lab('引2')}`;
  if (card.num === 7)
    return `<svg style="${s}" viewBox="0 0 52 36"><rect x="24.6" y="3" width="2.8" height="29" fill="#c9a227"/><rect x="4" y="3" width="19" height="21" rx="2.5" fill="#c1121f" stroke="#5c0a10" stroke-width="1.4"/><path d="M13.5 19 l0 -11 M9 12.5 L13.5 8 L18 12.5" stroke="#fff" stroke-width="2.6" fill="none"/><rect x="29" y="11" width="19" height="21" rx="2.5" fill="#1d3557" stroke="#0a1626" stroke-width="1.4"/><path d="M38.5 15 l0 11 M34 21.5 L38.5 26 L43 21.5" stroke="#fff" stroke-width="2.6" fill="none"/></svg>${lab('方向')}`;
  if (card.num === 11)
    return `<svg style="${s}" viewBox="0 0 52 36"><ellipse cx="26" cy="14" rx="17" ry="10" fill="#f2b63a" stroke="#7a5a10" stroke-width="2"/><circle cx="26" cy="14" r="5.8" fill="#38290a"/><circle cx="26" cy="14" r="2.6" fill="#000"/><rect x="12" y="25" width="13" height="9" rx="1.5" fill="#c9a227" transform="rotate(-8 18 29)"/><rect x="27" y="25" width="13" height="9" rx="1.5" fill="#c1121f" transform="rotate(6 33 29)"/><text x="30.5" y="32.5" font-size="7.5" font-weight="900" fill="#ffd7da">24</text></svg>${lab('公開')}`;
  return '';
}
// 効果の文章説明（拡大モーダルに必ず表示する）
function effectInfo(card) {
  if (card.draw5) return { name: 'ドロー5（黒の1）', text: '次の者が5枚引く。その者の手番は飛ぶ。回避できない、最奥の効果。' };
  if (card.num === 0 || card.num === 24) return { name: 'オールマイティ／スート変更', text: 'いつでも出せる。出したら、次のスート（白か黒）を自分で決める。' };
  if (card.num === 2) return { name: 'ドロー2', text: '次の者が2枚引く。2を出せば累積して次へ引き継げる（累積は増えていく）。' };
  if (card.num === 7) return { name: '方向指定', text: '出したら、次の方向（↑以上／↓以下）を自分で決める。' };
  if (card.num === 11) return { name: '公開（目）', text: '次の者は、自分のいちばん大きいカード1枚を全員に公開する。11を出せば累積する。' };
  return null;
}
function bundleSVG() {
  // 札束バッジ: 最高額ドル紙幣（100ドル札）の緑系を参考に描き直し（2026-11-11）
  // 最上の紙幣（肖像の楕円＋額縁）＋下の紙幣の層＋全体を束ねる帯が見える形
  return `<svg viewBox="0 0 48 40">
    <rect x="7" y="15" width="35" height="19" rx="2" fill="#5d7d5f"/>
    <path d="M7 21h35 M7 26h35 M7 31h35" stroke="#425c44" stroke-width="1.6"/>
    <rect x="7" y="15" width="35" height="19" rx="2" fill="none" stroke="#425c44" stroke-width="1.6"/>
    <rect x="5" y="6" width="37" height="20" rx="2" fill="#aac7a2" stroke="#47634a" stroke-width="1.8"/>
    <rect x="8.5" y="9.5" width="30" height="13" rx="1.5" fill="none" stroke="#5d7d5f" stroke-width="1.2"/>
    <ellipse cx="23.5" cy="16" rx="4.6" ry="5.6" fill="#8fb48c" stroke="#47634a" stroke-width="1.2"/>
    <circle cx="11" cy="12" r="1.7" fill="#7fa376"/><circle cx="36" cy="20" r="1.7" fill="#7fa376"/>
    <rect x="20.5" y="6" width="6" height="28" fill="#e9ddc0" stroke="#a68f5e" stroke-width="1.2"/>
  </svg>`;
}
function cardEl(card, opts = {}) {
  const d = document.createElement('div');
  const special = card.num === 0 || card.num === 24;
  d.className = 'card' + (special ? ' gold-frame gold-line' : (card.suit === 'W' ? ' suit-W' : ' suit-B')) + (opts.big ? ' big' : '');
  const a = artFor(card);
  const art = a.src;
  const flavor = card.draw5 ? '触れるな。ここは最奥だ。' : (FLAVOR[card.num] || '');
  d.innerHTML = `
    ${art ? `<div class="art${a.full ? ' full' : ''}" style="background-image:url(${art});background-position:${ART_POS[card.num] || '50%'} 50%"></div>` : `<div class="art-none">${card.num}</div>`}
    <div class="idx"><span class="num">${card.num}</span><span class="arrow">${card.arrow === 'up' ? '↑' : '↓'}</span>${special ? '' : '<span class="suit-dot"></span>'}</div>
    <div class="score-badge">${bundleSVG()}<span class="bnum">${card.pts}</span></div>
    ${card.draw5 ? '<div style="position:absolute;inset:3px;border:2px solid #a31621;border-radius:5px;pointer-events:none;z-index:2"></div>' : ''}
    <div class="fx">${fxIcon(card)}</div>
    <div class="flavor">${flavor}</div>`;
  return d;
}
// 相手の手札が並び替えられたら、裏向きカード列を揺らして「いじっている動き」を伝える
function animateHandShuffle(playerId) {
  const row = document.querySelector(`.opp-backs[data-pid="${playerId}"]`);
  if (!row) return;
  [...row.children].forEach((b, i) => {
    b.style.setProperty('--j', (Math.random() * 12 - 6).toFixed(1) + 'px');
    b.style.animationDelay = (i * 35) + 'ms';
  });
  row.classList.remove('shuffling');
  void row.offsetWidth; // アニメーションを最初から再生し直す
  row.classList.add('shuffling');
  setTimeout(() => row.classList.remove('shuffling'), 1200);
}
function miniCard(card, open) {
  const d = document.createElement('div');
  // 公開中カードの目印（update4）: 両面24=df（所在が常に見える特別な1枚）と、11の公開=open を区別する
  d.className = 'mini-card' + (card.suit === 'W' ? ' w' : '') + (card.df ? ' df' : (open ? ' open' : ''));
  d.textContent = `${card.num}${card.arrow === 'up' ? '↑' : '↓'}`;
  if (card.df) d.title = '両面表の24（所在は全員に見えている）';
  else if (open) d.title = '11で公開中のカード';
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
  // 札束の数字（update4・ユーザー決定）: 自分は常時表示。他者は設定ON/OFF（初期値ON）
  if (isMe || showOppNums) c.textContent = `${s}点`;
  else c.textContent = s <= -15 || s >= 15 ? `×${Math.abs(s)}` : '';
  wrap.appendChild(c);
  wrap.title = 'タップで正確な得点';
  wrap.onclick = () => {
    // ドボン受付中はモーダルを開かず、ドボンボタンを光らせて視線を戻す（受付中モーダルの退避と対）
    if (S && S.window) { flashDobonBtn(); return; }
    showModal(`<h3>${player.name} の資金</h3><p style="font-size:28px;text-align:center">${s} 点</p><button class="big" onclick="hideModal()">閉じる</button>`, 'generic');
  };
  return wrap;
}
// 受付中に汎用モーダルを開こうとした時の合図: ドボンボタンを1回だけ強く光らせる
function flashDobonBtn() {
  const db = $('btn-dobon');
  db.classList.remove('flash');
  void db.offsetWidth;
  db.classList.add('flash');
  setTimeout(() => db.classList.remove('flash'), 900);
}

// ---------- 画面描画 ----------
const screens = { entry: $('screen-entry'), lobby: $('screen-lobby'), game: $('screen-game') };
function showScreen(name) { for (const k in screens) screens[k].classList.toggle('hidden', k !== name); }

function render() {
  if (!S) return;
  if (S.phase === 'lobby') {
    selfCardShown = false; localReadyClicked = false;
    if (modalKind === 'settle') hideModal(); // 「もう一局」でロビーへ戻ったら精算/結果モーダルを畳む
    renderLobby(); showScreen('lobby'); return;
  }
  showScreen('game');
  // 受付中モーダルの退避（update4）: ドボン受付が始まったら汎用モーダルは自動で閉じ、判断を隠さない。
  // 精算モーダル（settle）と返し全画面は対象外。閉じたモーダルを受付終了後に開き直すこともしない
  if ((S.window || S.phase === 'kaeshi') && modalKind === 'generic' && !$('modal').classList.contains('hidden')) hideModal();
  if (S.round !== prevRound) { prevRound = S.round; touchByPlayer = {}; } // 夜が替わったら触れている表示はリセット
  renderGame();
  maybeShowSelfCard();
}
function nameOf(id) { const p = S.players.find((p) => p.id === id); return p ? p.name : '？'; }

function renderLobby() {
  sortingMode = false;
  $('lobby-code').textContent = S.code;
  const st = S.settings;
  const roundsLabel = { '6': '6ラウンド', '8': '8ラウンド', '10': '10ラウンド', time: `時間制${st.minutes ? st.minutes + '分' : '（無制限）'}`, any: '任意終了' }[st.rounds];
  $('lobby-settings').textContent = `設定: ${roundsLabel}／脱落${st.elimination ? 'あり' : 'なし'}／手番制限${st.turnLimit ? st.turnLimit + '秒' : 'オフ'}`;
  $('lobby-players').innerHTML = '';
  for (const p of S.players) {
    const d = document.createElement('div');
    d.className = 'player-chip';
    const pc = pcolor(p);
    d.style.borderLeft = `5px solid ${pc.css}`;
    d.innerHTML = `<span><span class="pdot" style="background:${pc.css}"></span>${p.name}（${pc.name}）${p.id === myId ? ' ← 自分' : ''}</span><span class="tag">${p.isHost ? 'ホスト' : ''}${p.isCPU ? ' CPU' : ''}${p.connected ? '' : ' 切断中'}</span>`;
    $('lobby-players').appendChild(d);
  }
  const isHost = S.hostId === myId;
  $('btn-start').classList.toggle('hidden', !isHost);
  $('btn-start').disabled = S.players.length < 2;
  $('lobby-wait').textContent = isHost ? (S.players.length < 2 ? '2人以上で開始できる' : '') : 'ホストが始めるのを待っている…';
  if (document.activeElement !== $('in-name2')) $('in-name2').value = S.me.name;
}

function renderGame() {
  const st = S.settings;
  $('round-label').textContent = `第${S.round}夜` + (S.totalRounds ? ` / 全${S.totalRounds}夜` : '');
  $('time-label').textContent = S.timeLeftSec != null ? `残り ${Math.floor(S.timeLeftSec / 60)}:${String(S.timeLeftSec % 60).padStart(2, '0')}` : (S.lastRound ? '最終夜' : '');
  $('btn-sound').textContent = muted ? '音: OFF' : '音: ON';
  $('btn-assist').textContent = assist ? '補助: ON' : '補助: OFF';
  $('btn-oppnums').textContent = showOppNums ? '相手の点数: 表示' : '相手の点数: 隠す';
  $('screen-game').style.setProperty('--pc-self', myColorCss()); // 自分の色（枠・帯の差し色に使う）
  $('btn-sort').textContent = sortingMode ? '並び替え終了' : '並び替え';
  $('btn-sort').classList.toggle('gold', sortingMode);
  $('hand').classList.toggle('sorting', sortingMode);
  $('host-tools').classList.toggle('hidden', !S.me.isHost || S.phase === 'gameover');

  // 相手: 座席配置（自分=下辺、相手は手番順に 左→正面→右。1人だけなら正面）
  const seats = { left: $('seat-left'), top: $('seat-top'), right: $('seat-right') };
  for (const k in seats) seats[k].innerHTML = '';
  const myIdx = S.players.findIndex((p) => p.id === myId);
  const opps = S.players
    .map((p, i) => ({ p, dist: (i - myIdx + S.players.length) % S.players.length }))
    .filter((x) => x.dist > 0).sort((a, b) => a.dist - b.dist).map((x) => x.p);
  const slotFor = (i, n) => (n === 1 ? 'top' : (['left', 'top', 'right', 'top'][i] || 'top'));
  opps.forEach((p, i) => {
    const d = document.createElement('div');
    const pc = pcolor(p);
    d.className = 'opp' + (S.currentId === p.id && (S.phase === 'turn') ? ' active' : '');
    d.style.setProperty('--pc', pc.css); // 手番枠・触れている裏面の縁取りはそのプレイヤーの色
    let chipHtml = '';
    if (st.elimination) chipHtml = p.chip === 'gake'
      ? `<span class="chip-ico"><img class="chip-img" src="${CHIP_IMG.front}" alt="">庇護の証</span>`
      : `<span class="chip-ico dead"><img class="chip-img" src="${CHIP_IMG.back}" alt="">庇護の証・死</span>`;
    const tl = (S.currentId === p.id && S.turnEndsAt) ? ' <span class="turn-left" data-pid="' + p.id + '"></span>' : '';
    d.innerHTML = `<div class="nm"><span class="pdot" style="background:${pc.css}"></span><span style="color:${pc.css}">${p.name}</span>${p.isMarker ? ` <img class="marker-img" src="${MARKER_IMG}" alt="後継者の証" title="後継者の証（スタートプレイヤー）">` : ''}</div>
      <div class="meta">手札 ${p.handCount}枚${p.connected ? '' : '・切断中'}${p.hasDouble24 ? '・両面24所持' : ''}${tl}</div>${chipHtml}`;
    if (p.openCards.length) {
      const oc = document.createElement('div'); oc.className = 'open-cards';
      for (const c of p.openCards) {
        const mc = miniCard(c, true);
        mc.onclick = () => showInfoCard(c);
        oc.appendChild(mc);
      }
      d.appendChild(oc);
    }
    // 裏向きカード列（裏面は全て同一デザイン。並び替え時はこの列が揺れる）
    const backs = document.createElement('div');
    backs.className = 'opp-backs'; backs.dataset.pid = p.id;
    for (let j = 0; j < p.handCount; j++) {
      const b = document.createElement('div'); b.className = 'card-back';
      backs.appendChild(b);
    }
    d.appendChild(backs);
    applyTouchLift(p.id); // 「触れている1枚」の持ち上げを再描画後も維持する
    d.appendChild(bundlesEl(p));
    seats[slotFor(i, opps.length)].appendChild(d);
  });
  // 自分の札束と状態
  const me = S.players.find((p) => p.id === myId);
  const ms = $('my-status');
  let myChip = '';
  if (st.elimination) myChip = me.chip === 'gake' ? '庇護の証: 表' : '庇護の証: 死（次に払い切れなければ破門）';
  const mtl = (S.me.isMyTurn && S.turnEndsAt) ? ' <span class="turn-left" data-pid="' + myId + '"></span>' : '';
  ms.innerHTML = `${S.me.isMyTurn ? `<span class="turn" style="color:${myColorCss()}">お前の手番</span>` : `${nameOf(S.currentId)} の手番`}${mtl}　${myChip}`;
  // 番の呼びかけ帯＋専用SE（update4、オインクの番到来フローの翻訳。文面は本人の決定で「{名前}、お前の番だ」:
  // 暗い地＋真鍮の縁取り＋自分の色の差し線。明るい黄帯にはしない）。帯は指示文の置き場所でもある
  const tb = $('turn-banner');
  const myStartChoice = S.phase === 'startChoice' && S.startChoice && S.startChoice.playerId === myId;
  if (S.me.isMyTurn && S.phase === 'turn') {
    tb.textContent = `${nameOf(myId)}、お前の番だ`;
    tb.classList.remove('hidden');
    if (!prevMyTurn) { beep(392, 0.09, 'triangle', 0.12); setTimeout(() => beep(587, 0.14, 'triangle', 0.12), 95); } // 番到来の専用SE（低く短い2音）
  } else if (myStartChoice) {
    tb.textContent = '開始の条件を選べ';
    tb.classList.remove('hidden');
  } else tb.classList.add('hidden');
  prevMyTurn = S.me.isMyTurn && S.phase === 'turn';
  // 山札の光: 自分の番でまだ引いていない間だけ、山札の積みが弱く光る（物の大きさは変えない）
  $('deck-pile').classList.toggle('myturn', !!(S.me.isMyTurn && S.phase === 'turn' && !S.me.drewThisTurn && !S.pendingDraw && !S.pendingReveal && !S.mustNagashi));
  // 受け手への事前警告: 自分の手番に累積ドロー/公開が来ている間、手札エリア付近に出し続ける
  const warn = $('my-warning');
  if (S.me.isMyTurn && S.pendingDraw > 0) {
    warn.textContent = `この手番、お前は ${S.pendingDraw} 枚引く（2を出せば累積して次へ回せる）`;
    warn.className = 'warn-draw';
  } else if (S.me.isMyTurn && S.pendingReveal > 0) {
    warn.textContent = `この手番、お前の最大カード ${S.pendingReveal} 枚が公開される（11を出せば累積する）`;
    warn.className = 'warn-reveal';
  } else {
    warn.textContent = '';
    warn.className = 'hidden';
  }
  // 自分の札束の山は手札の下（#my-bundles）に配置する（2026-11-11 本人指定）
  const mb = $('my-bundles'); mb.innerHTML = ''; mb.appendChild(bundlesEl(me, true));

  // 場（卓中央: 山札の積み／場札／捨て札の山）
  $('deck-count').textContent = S.deckCount + '枚';
  const fc = $('field-card'); fc.innerHTML = '';
  if (S.fieldTop) {
    const fel = cardEl(S.fieldTop, { big: true });
    if (Date.now() < fxFlashUntil) fel.classList.add('fx-flash');
    fel.onclick = () => showInfoCard(S.fieldTop);
    fc.appendChild(fel);
  }
  const dt = $('discard-top'); dt.innerHTML = '';
  if (S.discard.length) dt.appendChild(miniCard(S.discard[S.discard.length - 1]));
  $('discard-count').textContent = S.discard.length + '枚';
  // 場の条件チップ（update4）: 条件は文章から独立させ、カードの顔と同じ部品
  // （スートドット＋数字＋矢印）で場札の下に置く。文章は状況の説明だけに使う（文言の2層化）
  const fcond = $('field-cond');
  if (S.field) {
    fcond.innerHTML = `<span class="cond-dot ${S.field.effSuit === 'W' ? 'w' : 'b'}"></span><span class="cond-num">${S.field.topNum}</span><span class="cond-arrow">${S.field.effArrow === 'up' ? '↑' : '↓'}</span>`;
    fcond.title = `条件: ${S.field.effSuit === 'W' ? '白（表通り）' : '黒（裏路地）'} ／ ${S.field.topNum}と同数字か、${S.field.effBase}${S.field.effArrow === 'up' ? '以上↑' : '以下↓'}`;
    fcond.classList.remove('hidden');
  } else fcond.classList.add('hidden');
  const fi = $('field-info');
  let info = '';
  if (S.pendingDraw) info += `ドロー累積: ${S.pendingDraw}枚`;
  if (S.pendingReveal) info += `${info ? '<br>' : ''}公開累積: ${S.pendingReveal}枚`;
  if (S.mustNagashi) info += '<br><span class="win">場流し（仕切り直し）: 好きな1枚を出せ</span>';
  if (S.window) {
    // カウントダウンバーは本人の指示で削除（2026-11-11）。受付中は文言とドボンボタンの強調で示す。時間ロジックは存続
    info += '<br><span class="win">ドボン受付中</span>';
    if (S.window.declarations.length) info += `<br>宣言: ${S.window.declarations.map(nameOf).join('、')}`;
    // 「予約済み」は自分の操作の状態なので、自分のエリア（手札見出し）側へ移した（renderHand）
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
  // 有効表示（ready）は「状態」であってヒントではないので、補助ON/OFFに関わらず常時出す（update4）
  db.classList.toggle('ready', !!canD);
  db.textContent = 'ドボン';
  // 最下部の表示は手番で切り替える（2026-11-11 本人新指定）:
  // 自分の手番（と開始時選択）ではアクション群、それ以外の場面ではドボンボタンを出す。
  // ドボン返しの全画面ボタンは従来通り別扱い（#kaeshi-overlay）。
  const showActions = (S.phase === 'turn' && S.me.isMyTurn)
    || (S.phase === 'startChoice' && S.startChoice && S.startChoice.playerId === myId);
  $('action-area').classList.toggle('hidden', !showActions);
  db.classList.toggle('hidden', showActions);
  // 返し全画面
  const ko = $('kaeshi-overlay');
  if (S.phase === 'kaeshi' && S.kaeshi && S.kaeshi.mine) {
    ko.classList.remove('hidden');
    const remain = Math.max(0, Math.ceil((S.kaeshi.endsAt - (Date.now() + serverOffset)) / 1000));
    $('kaeshi-sec').textContent = remain;
    // 返しの内訳（update4）: 誰のドボンに返せるか／成立するといくら動くか。
    // 金額はクライアントが持つ情報（自分の手札得点合計×倍率）だけで計算でき、精算式と一致する
    if (S.window) {
      const base = S.me.handPointSum;
      const mult = 2 * (S.window.card.num === 24 ? 2 : 1);
      const each = base * mult;
      const n = S.window.declarations.length;
      $('kaeshi-detail').innerHTML =
        `${S.window.declarations.map(nameOf).join('、')} のドボンに返せる<br>` +
        `成立すれば、宣言者それぞれがお前へ <b>${each}点</b> を払う` + (n > 1 ? `（合計 <b>${each * n}点</b>）` : '');
    }
  } else ko.classList.add('hidden');
  // 精算・結果モーダル
  if (S.phase === 'settle' && S.settle) {
    const key = `${S.round}-${S.settle.type}-${S.settle.transfers.length}-${S.settle.scores[myId]}`;
    if (settleShownKey !== key) { settleShownKey = key; localReadyClicked = false; showSettle(); }
    else if (modalKind === 'settle' && !$('modal').classList.contains('hidden')) updateSettleWait(); // 待機者だけを更新
  }
  if (S.phase !== 'settle' && S.phase !== 'gameover' && modalKind === 'settle') hideModal(); // 次の夜へ進んだら精算モーダルを畳む
  if (S.phase === 'gameover' && S.result && !resultShown) { resultShown = true; showResult(); }
  if (S.phase !== 'gameover') resultShown = false;
  if (S.phase === 'settle' || S.phase === 'gameover') { selected = null; spotInfo = null; sendTouch(null); }
  renderSpotlight();
}

function renderBanner() {
  const b = $('banner');
  let txt = '', cls = '';
  if (S.window && S.window.dashikiri && !S.window.declarations.length) txt = `${nameOf(S.window.playedBy)} が出し切った。ドボンの好機`;
  else if (S.window && S.window.declarations.length) { txt = `ドボン！（${S.window.declarations.map(nameOf).join('、')}）`; cls = 'dobon'; }
  else if (S.phase === 'kaeshi') { txt = 'ドボン返しの好機！'; cls = 'dobon'; }
  else if (S.startChoice) txt = `${nameOf(S.startChoice.playerId)} が開始の条件を選んでいる`;
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
  // ※ 0/24・7 のスート/方向選択は、選択中カードの大写し（スポットライト）内に出す
  if (!S.me.isMyTurn || S.phase !== 'turn') return;
  if (S.pendingDraw > 0) { add(`ドロー${S.pendingDraw}枚を引く`, () => send({ t: 'drawPending' })); a.insertAdjacentHTML('beforeend', '<span class="hint" style="align-self:center">2を出せば累積して次へ</span>'); return; }
  if (S.pendingReveal > 0) { add(`最大のカード${S.pendingReveal}枚を公開する`, () => send({ t: 'reveal' })); a.insertAdjacentHTML('beforeend', '<span class="hint" style="align-self:center">11を出せば累積して次へ</span>'); return; }
  if (!S.me.drewThisTurn && !S.mustNagashi) add('山札から1枚引く', () => send({ t: 'draw' }));
  if (!S.mustNagashi) add('パス', () => send({ t: 'pass' }));
  if (S.mustNagashi) a.insertAdjacentHTML('beforeend', '<span class="hint" style="align-self:center">場流し: 好きなカードを1枚出せ</span>');
}

function needsChoice(card) {
  if (card.num === 0 || card.num === 24) return 'suit';
  if (card.num === 7) return 'dir';
  return null;
}
function renderHand() {
  if (handDrag) return; // ドラッグ中はDOMを作り直さない
  const h = $('hand'); h.innerHTML = '';
  const playable = new Set(S.me.playable || []);
  let cards = S.me.hand;
  // 並び替え直後はサーバー状態が追いつくまで自分の並び順で表示する（チラつき防止）。
  // 手札のID集合が変わったら自動的にサーバー順へ戻る
  if (localHandOrder && localHandOrder.length === cards.length && cards.every((c) => localHandOrder.includes(c.id))) {
    const rank = new Map(localHandOrder.map((id, i) => [id, i]));
    cards = [...cards].sort((a, b) => rank.get(a.id) - rank.get(b.id));
  }
  // 選択中カードが手札から消えていたら（予約の自動実行など）選択を解除する
  if (selected && !cards.some((c) => c.id === selected.cardId)) selected = null;
  for (const c of cards) {
    const el = cardEl(c);
    el.dataset.cid = c.id;
    if (selected && selected.cardId === c.id) el.classList.add('selected');
    if (assist && S.me.isMyTurn) el.classList.add(playable.has(c.id) ? 'playable' : 'unplayable');
    if (!assist) el.classList.add('noassist');
    if (S.window && S.window.myReservation === c.id) el.classList.add('reserved');
    if (c.open) { // 11で公開中の自分のカードには残り続ける目印（update4）
      el.classList.add('is-open');
      const bd = document.createElement('div');
      bd.className = 'open-badge'; bd.textContent = '👁'; bd.title = 'このカードは全員に公開中';
      el.appendChild(bd);
    }
    el.onclick = () => onTapCard(c);
    h.appendChild(el);
  }
  layoutHand();
  // ドボンの式表示（update4・第2ラウンド改訂形）: 補助ONかつ受付中だけ、合計と場の数字を並べる。
  // 不一致のときは「あと○で一致」とは書かず、事実として「○違い」とだけ出す（受付中に手札は変わらないため）
  if (sortingMode) {
    $('hand-totals').innerHTML = '並び替え中: カードを左右にドラッグ';
  } else if (assist && S.window) {
    const sum = S.me.handNumSum, num = S.window.card.num;
    const formula = sum === num
      ? `手札合計 <b>${sum}</b> ＝ 場の数字 <b>${num}</b>`
      : `手札合計 <b>${sum}</b> ／ 場の数字 <b>${num}</b>（${Math.abs(sum - num)}違い）`;
    $('hand-totals').innerHTML = (S.window.extra ? '追加ドボン受付中：' : '') + formula +
      ` ／ 支払い時 <b>${S.me.handPointSum}</b>点` + (S.window.myReservation ? ' <span class="resv-chip">予約済み</span>' : '');
  } else {
    $('hand-totals').innerHTML = `手札合計: <b>${S.me.handNumSum}</b>（数字） ／ 支払い時 <b>${S.me.handPointSum}</b>点` +
      (S.window && S.window.myReservation ? ' <span class="resv-chip">予約済み</span>' : '');
  }
}
// 手札をファン状に重ねる: 枚数が多くても各カードの左端（数字+矢印）が必ず見える幅を残す
function layoutHand() {
  const h = $('hand');
  const els = [...h.querySelectorAll('.card')];
  for (const el of els) el.style.marginLeft = '';
  if (els.length < 2) return;
  const cw = els[0].offsetWidth;
  if (!cw) return;
  const avail = h.clientWidth - 6;
  const total = cw * els.length;
  if (total <= avail) return;
  const overlap = Math.min((total - avail) / (els.length - 1), cw - 42); // 最低42px（数字+矢印の幅）は見せる
  if (overlap <= 0) return;
  for (let i = 1; i < els.length; i++) els[i].style.marginLeft = (-overlap).toFixed(1) + 'px';
}
// ---------- 手札のドラッグ並び替え（並び替えモード中のみ有効） ----------
// 通常時は手札ストリップの横スクロールとタップ操作を優先し、モード中だけ
// touch-action:none でドラッグを確実に効かせる（タップで出す操作は無効化）。
function handPointerDown(e) {
  if (!sortingMode || !S || handDrag) return;
  const el = e.target.closest('#hand .card');
  if (!el || (e.button !== undefined && e.button > 0)) return;
  handDrag = { id: el.dataset.cid, el, pid: e.pointerId, startX: e.clientX, moved: false };
  const cleanup = () => {
    el.removeEventListener('pointermove', move);
    el.removeEventListener('pointerup', up);
    el.removeEventListener('pointercancel', cancel);
  };
  const move = (ev) => handPointerMove(ev);
  const up = () => { cleanup(); handPointerEnd(); };
  const cancel = () => { cleanup(); handPointerCancel(); };
  el.addEventListener('pointermove', move);
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', cancel);
  try { el.setPointerCapture(e.pointerId); } catch {}
}
function handPointerMove(e) {
  if (!handDrag || e.pointerId !== handDrag.pid) return;
  const el = handDrag.el;
  if (!handDrag.moved) {
    if (Math.abs(e.clientX - handDrag.startX) < 12) return; // 閾値まではタップ扱い（並び替えにしない）
    handDrag.moved = true;
    el.classList.add('dragging');
  }
  e.preventDefault();
  el.style.transform = `translateX(${e.clientX - handDrag.startX}px)`;
  // 中心を越えた隣のカードとその場で入れ替える（ライブフィードバック）
  const rect = el.getBoundingClientRect();
  const center = rect.left + rect.width / 2;
  const next = el.nextElementSibling, prev = el.previousElementSibling;
  if (next && next.classList.contains('card')) {
    const nr = next.getBoundingClientRect();
    if (center > nr.left + nr.width / 2) {
      const delta = next.offsetLeft - el.offsetLeft;
      next.after(el);
      handDrag.startX += delta; // レイアウト位置の変化分を打ち消して見た目の位置を連続させる
      el.style.transform = `translateX(${e.clientX - handDrag.startX}px)`;
      return;
    }
  }
  if (prev && prev.classList.contains('card')) {
    const pr = prev.getBoundingClientRect();
    if (center < pr.left + pr.width / 2) {
      const delta = el.offsetLeft - prev.offsetLeft;
      prev.before(el);
      handDrag.startX -= delta;
      el.style.transform = `translateX(${e.clientX - handDrag.startX}px)`;
    }
  }
}
function handPointerEnd() {
  if (!handDrag) return;
  const { el, moved } = handDrag;
  handDrag = null;
  el.classList.remove('dragging');
  el.style.transform = '';
  if (moved) {
    suppressTapUntil = Date.now() + 350; // ドラッグ直後の click を「出す」操作にしない
    const order = [...$('hand').querySelectorAll('.card')].map((x) => x.dataset.cid);
    localHandOrder = order;
    send({ t: 'reorder', order });
  }
  renderHand();
}
function handPointerCancel() {
  if (!handDrag) return;
  const el = handDrag.el;
  handDrag = null;
  el.classList.remove('dragging');
  el.style.transform = '';
  renderHand();
}

// ---------- 手札のタップ操作（2026-11-12 本人指定の新方式） ----------
// 1タップ目: カードが上にずれて選択状態になり、そのカードを大写し（スポットライト）で表示する
// 2タップ目: 選択中のカードが場へ出る（出せる文脈のとき）。出せない文脈では選択解除（トグル）
// 0/24のスート選択・7の方向選択は、大写しの中のボタンで選んでから2タップ目で確定する
// 旧方式（シングルタップで拡大モーダル＋「場に出す」ボタン）は廃止した
function selectionAction(card) {
  // 現在の文脈でこのカードを「出す/予約する」ことができるかと、選択肢の要否を返す
  if (!S || !selected) return null;
  const kind = needsChoice(card);
  const choiceReady = !kind || !!(selected.choice.suit || selected.choice.dir);
  if (S.window && S.window.canReserve && S.phase !== 'kaeshi') return { mode: 'reserve', kind, choiceReady };
  if (S.me.isMyTurn && S.phase === 'turn') {
    const playable = new Set(S.me.playable || []);
    if (playable.has(card.id) || S.mustNagashi) return { mode: 'play', kind, choiceReady };
  }
  return null;
}
function onTapCard(card) {
  if (sortingMode) return; // 並び替えモード中はタップで出さない
  if (Date.now() < suppressTapUntil) return; // ドラッグ直後の誤爆防止
  spotInfo = null;
  hqShowBack = false;
  if (!selected || selected.cardId !== card.id) {
    // 1タップ目（別のカードをタップしたら選択はそちらへ移る＝迷いの動きも含め他者へ共有される）
    selected = { cardId: card.id, choice: {} };
    sendTouch(card.id);
    renderHand(); renderSpotlight();
    return;
  }
  // 2タップ目
  const act = selectionAction(card);
  if (!act || (act.kind && !act.choiceReady)) { // 出せない/条件未選択なら確定しない
    if (!act) { selected = null; sendTouch(null); renderHand(); } // 出せない文脈での再タップは選択解除
    renderSpotlight();
    return;
  }
  const extra = { ...selected.choice };
  const mode = act.mode;
  selected = null;
  sendTouch(null);
  renderHand(); renderSpotlight();
  send({ t: mode, cardId: card.id, ...extra });
}

// ---------- 大写し（スポットライト） ----------
// 選択中カード／場札などの詳細を画面中央に大きく出す。ラッパーは pointer-events:none で
// 操作を通し（ドボン受付・予約を妨げない）、条件選択ボタンだけがタップを受ける
function showInfoCard(card) { selected = null; sendTouch(null); spotInfo = card; hqShowBack = false; renderHand(); renderSpotlight(); }
function renderSpotlight() {
  const el = $('spotlight');
  if (!el) return;
  const selCard = (!spotInfo && selected && S && S.me) ? (S.me.hand || []).find((c) => c.id === selected.cardId) : null;
  const card = spotInfo || selCard;
  if (!card || !S) {
    if (spotKey !== '') { spotKey = ''; el.innerHTML = ''; el.classList.add('hidden'); }
    return;
  }
  const act = selCard ? selectionAction(card) : null;
  // 再構築キー: 状況が変わった時だけDOMを作り直す（250ms再描画でボタンが消えないため）
  const key = [spotInfo ? 'info' : 'sel', card.id, act ? act.mode : '-',
    act && act.kind ? (selected.choice.suit || selected.choice.dir || 'none') : '',
    hqShowBack ? 'b' : 'f',
    S.phase, S.me.isMyTurn ? 1 : 0].join('|');
  if (key === spotKey) return;
  spotKey = key;
  el.innerHTML = '';
  const panel = document.createElement('div');
  panel.className = 'spot-panel';
  const big = cardEl(card);
  big.classList.add('modal-card');
  if (selCard) {
    // スポットライト正常化（update4）: 見ている大写し自体も2タップ目の対象にする
    // （視線の先と操作対象を一致させる。ラッパーは操作を通すが、このカードだけ受ける）
    big.style.pointerEvents = 'auto';
    big.style.cursor = 'pointer';
    big.title = 'もう一度タップで確定';
    big.onclick = (ev) => { ev.stopPropagation(); onTapCard(selCard); };
  }
  panel.appendChild(big);
  // 本部（両面表24）: 表（真昼）を主表示にし、裏面（夕景）は小さな切り替えで見る形にする
  // （短い横画面で常時並べると収まらないため。第2ラウンド改訂）。他プレイヤーに見える面は表で固定
  if (card.art === 'hq') {
    const backs = document.createElement('div');
    backs.className = 'spot-backs';
    const fig = document.createElement('figure');
    fig.innerHTML = hqShowBack
      ? `<img src="${ART24.hqBack}" alt="本部・夕景"><figcaption>裏（夕景）</figcaption>`
      : `<img src="${ART24.hq}" alt="本部・真昼"><figcaption>表（真昼）</figcaption>`;
    backs.appendChild(fig);
    const tog = document.createElement('button');
    tog.className = 'mini spot-hq-toggle';
    tog.textContent = hqShowBack ? '表（真昼）を見る' : '裏（夕景）を見る';
    tog.onclick = (ev) => { ev.stopPropagation(); hqShowBack = !hqShowBack; spotKey = ''; renderSpotlight(); };
    backs.appendChild(tog);
    panel.appendChild(backs);
  }
  // 効果の文章説明（必ず表示。効果のない数字は「効果なし」）
  const fx = effectInfo(card);
  const fxBox = document.createElement('div');
  fxBox.className = 'card-modal-fx';
  fxBox.innerHTML = fx
    ? `<div class="fx-name">${fx.name}</div><p>${fx.text}</p>`
    : '<div class="fx-name">効果なし</div><p>このカードに特殊な効果はない。</p>';
  panel.appendChild(fxBox);
  const note = document.createElement('p');
  note.className = 'spot-note';
  const openNote = selCard && selCard.open ? 'このカードは全員に公開中。' : '';
  if (spotInfo) {
    note.textContent = '場のカードの詳細';
  } else if (act && act.kind) {
    // 条件選択の「選択済み表示」（update4）: 両方のボタンを残し、選んだ方に自分の色の枠＋拡大、
    // もう一方を暗くする。確定（2タップ目）までは選び直せる
    const chosen = act.kind === 'suit' ? selected.choice.suit : selected.choice.dir;
    const chosenLabel = act.kind === 'suit'
      ? (chosen === 'W' ? '白（表通り）' : chosen === 'B' ? '黒（裏路地）' : '')
      : (chosen === 'up' ? '↑方向' : chosen === 'down' ? '↓方向' : '');
    note.textContent = openNote + (act.choiceReady
      ? `「${chosenLabel}」で${act.mode === 'reserve' ? '予約する' : '出す'}。もう一度タップで確定（条件は選び直せる）`
      : (act.mode === 'reserve' ? '予約の条件を選べ' : '出す条件を選べ'));
    const ch = document.createElement('div');
    ch.className = 'spot-choices';
    const mk = (label, val) => {
      const b = document.createElement('button');
      b.textContent = label;
      b.className = 'gold' + (chosen === val ? ' chosen' : (chosen ? ' dim' : ''));
      if (chosen === val) b.style.setProperty('--pc', myColorCss());
      b.onclick = (ev) => {
        ev.stopPropagation();
        if (!selected) return;
        if (act.kind === 'suit') selected.choice = { suit: val };
        else selected.choice = { dir: val };
        spotKey = ''; renderHand(); renderSpotlight();
      };
      ch.appendChild(b);
    };
    if (act.kind === 'suit') { mk('白（表通り）', 'W'); mk('黒（裏路地）', 'B'); }
    else { mk('↑方向', 'up'); mk('↓方向', 'down'); }
    panel.appendChild(ch);
  } else if (act) {
    note.textContent = openNote + (act.mode === 'reserve' ? 'もう一度タップで予約する' : 'もう一度タップで場に出す');
  } else if (S.me.isMyTurn && S.phase === 'turn') {
    note.textContent = openNote + (S.field ? `いまの条件（${S.field.effSuit === 'W' ? '白' : '黒'}／${S.field.effBase}${S.field.effArrow === 'up' ? '以上↑' : '以下↓'}）では出せない` : '出せない');
  } else {
    note.textContent = openNote + 'お前の手番ではない';
  }
  panel.appendChild(note);
  if (spotInfo) {
    const close = document.createElement('button');
    close.textContent = '閉じる';
    close.className = 'spot-close';
    close.onclick = (ev) => { ev.stopPropagation(); spotInfo = null; renderSpotlight(); };
    panel.appendChild(close);
  } else if (selCard) {
    // 選択中にも「閉じる（選択解除）」を置く（update4。従来は情報表示モードだけだった）
    const close = document.createElement('button');
    close.textContent = '選択を解除';
    close.className = 'spot-close';
    close.onclick = (ev) => { ev.stopPropagation(); selected = null; sendTouch(null); renderHand(); renderSpotlight(); };
    panel.appendChild(close);
  }
  el.appendChild(panel);
  el.classList.remove('hidden');
}

// ---------- 出たカードの演出 ----------
// (1) 場へ飛ぶアニメーション: transform/opacityのみ・0.55秒。
//     横の席（左/右）は1種類の動きを反転して共用し、正面の席は別の動きにする
function flyKeyframes(kind, dx, dy, s1) {
  if (kind === 'left' || kind === 'right') {
    const s = kind === 'left' ? 1 : -1; // 反転はこの符号だけ
    return [
      { transform: 'translate(0,0) scale(.62)', opacity: .85 },
      { transform: `translate(${dx * 0.52 + s * 20}px, ${dy * 0.5 - 26}px) scale(.85)`, opacity: 1, offset: 0.55 },
      { transform: `translate(${dx}px, ${dy}px) scale(${s1})`, opacity: 1 },
    ];
  }
  if (kind === 'top') { // 正面: 真っ直ぐ手前へ落ちてきて大きくなる
    return [
      { transform: 'translate(0,0) scale(.5)', opacity: .8 },
      { transform: `translate(${dx}px, ${dy}px) scale(${s1})`, opacity: 1 },
    ];
  }
  // 自分: 手札から少し浮いて場へ
  return [
    { transform: 'translate(0,0) scale(1)', opacity: 1 },
    { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 16}px) scale(.95)`, opacity: 1, offset: 0.5 },
    { transform: `translate(${dx}px, ${dy}px) scale(${s1})`, opacity: 1 },
  ];
}
function flyToField(ev, card) {
  const field = $('field-card');
  if (!field) return;
  const fr = field.getBoundingClientRect();
  const tw = fr.width || 96, th = fr.height || 134;
  let from = null, kind = 'top';
  if (ev.playerId === myId) {
    const el = document.querySelector(`#hand .card[data-cid="${ev.cardId}"]`);
    if (el) { from = el.getBoundingClientRect(); kind = 'mine'; }
  } else {
    const backs = document.querySelector(`.opp-backs[data-pid="${ev.playerId}"]`);
    if (backs) {
      from = backs.getBoundingClientRect();
      const seat = backs.closest('.seat');
      if (seat && seat.id === 'seat-left') kind = 'left';
      else if (seat && seat.id === 'seat-right') kind = 'right';
      else {
        // 縦画面フォールバック等: 場の中心との相対位置で振り分ける
        const cx = from.left + from.width / 2, fx = fr.left + fr.width / 2;
        kind = cx < fx - 40 ? 'left' : (cx > fx + 40 ? 'right' : 'top');
      }
    }
  }
  if (!from) return;
  const W = 84;
  const ghost = cardEl(card);
  ghost.classList.add('fly-card');
  ghost.style.width = W + 'px';
  const sx = from.left + from.width / 2 - W / 2;
  const sy = from.top + from.height / 2 - (W * 1.4) / 2;
  ghost.style.left = sx + 'px';
  ghost.style.top = sy + 'px';
  document.body.appendChild(ghost);
  const dx = (fr.left + fr.width / 2) - (sx + W / 2);
  const dy = (fr.top + fr.height / 2) - (sy + W * 1.4 / 2);
  const anim = ghost.animate(flyKeyframes(kind, dx, dy, tw / W), { duration: 550, easing: 'ease-in-out', fill: 'both' });
  anim.onfinish = () => ghost.remove();
  setTimeout(() => ghost.remove(), 900); // 保険
}
// (2) 大写し表示: 左から0.3秒で入る→1.0秒静止→右へ0.3秒で出る（合計1.6秒）。操作は妨げない
let playedTimers = [];
function showPlayedOverlay(card) {
  const ov = $('played-overlay');
  if (!ov) return;
  playedTimers.forEach(clearTimeout); playedTimers = [];
  ov.innerHTML = '';
  const el = cardEl(card, { big: true });
  ov.appendChild(el);
  ov.classList.remove('hidden');
  el.animate([
    { transform: 'translateX(-130vw)' },
    { transform: 'translateX(0)', offset: 0.1875 },
    { transform: 'translateX(0)', offset: 0.8125 },
    { transform: 'translateX(130vw)' },
  ], { duration: 1600, easing: 'ease-in-out', fill: 'both' });
  playedTimers.push(setTimeout(() => { ov.classList.add('hidden'); ov.innerHTML = ''; }, 1680));
}
function onPlayEvent(ev) {
  const card = S.fieldTop;
  if (!card || card.id !== ev.cardId) return;
  flyToField(ev, card);
  showPlayedOverlay(card);
}

// ---------- モーダル ----------
// kind: 'generic'（捨て札・得点・遊び方。ドボン受付が始まったら自動で退避する）
//       'settle'（精算・結果。フェーズが進んだら畳む）／'info'（自己確認。自動では畳まない）
function showModal(html, kind = 'generic') { modalKind = kind; $('modal-box').innerHTML = html; $('modal').classList.remove('hidden'); }
function hideModal() { $('modal').classList.add('hidden'); modalKind = null; }
window.hideModal = hideModal;
function settleWaitHtml() {
  // 精算の待機表示（update4）: 誰を待っているかを名前と状態で出す。切断中は自動進行の注記つき
  return S.players.map((p) => {
    const pc = pcolor(p);
    const ready = p.readyNext || (p.id === myId && localReadyClicked);
    const note = ready ? '✓' : (!p.connected && !p.isCPU ? '切断中のため自動進行' : '待機中');
    return `<span class="wait-item"><span class="pdot" style="background:${pc.css}"></span>${p.name} ${note}</span>`;
  }).join('');
}
function updateSettleWait() {
  const w = $('settle-wait');
  if (w) w.innerHTML = settleWaitHtml();
}
function showSettle() {
  const st = S.settle;
  const rows = st.transfers.map((t) => `<div class="transfer-row"><span>${nameOf(t.from)} → ${nameOf(t.to)}</span><b>${t.amount}点（札束${t.amount}）${t.partial ? ' ※払える分だけ' : ''}</b></div>`).join('');
  const cliffs = (st.cliffEvents || []).map((e) => e.kind === 'gake'
    ? `<p>${nameOf(e.playerId)} は庇護の証を使った（裏返して「死」）</p>`
    : `<p>${nameOf(e.playerId)} は破門（脱落）</p>`).join('');
  const scoreRows = S.players.map((p) => `<tr><td>${p.name}${p.id === st.markerId ? ` <img class="marker-img" src="${MARKER_IMG}" alt="後継者の証" title="後継者の証">` : ''}</td><td>${st.scores[p.id]}点</td></tr>`).join('');
  showModal(`<h3>${st.label}！</h3>
    ${st.declarerIds && st.declarerIds.length ? `<p>宣言: ${st.declarerIds.map(nameOf).join('、')}</p>` : ''}
    ${rows || '<p>得点の移動はない</p>'}${cliffs}
    ${st.markerMoved ? `<p>後継者の証は ${nameOf(st.markerId)} へ</p>` : ''}
    <table class="score-table">${scoreRows}</table>
    <div id="settle-wait" class="wait-list">${settleWaitHtml()}</div>
    <button class="big gold" id="modal-next">${st.gameEnd ? '最終結果へ' : '次の夜へ'}</button>`, 'settle');
  $('modal-next').onclick = () => {
    // 押してもモーダルは閉じない（update4）。ボタンを「待機中」に変え、全員が揃うまで誰待ちか見せる
    localReadyClicked = true;
    const b = $('modal-next');
    b.disabled = true; b.textContent = '待機中…';
    updateSettleWait();
    send({ t: 'next' });
  };
}
function showResult() {
  const r = S.result;
  const rows = r.rankings.map((x) => `<tr><td>${x.rank}位</td><td>${x.name}${x.id === r.winnerId ? ` <img class="marker-img" src="${MARKER_IMG}" alt="後継者の証" title="後継者の証">` : ''}</td><td>${x.score}点</td></tr>`).join('');
  showModal(`<h3>抗争 終了</h3>
    ${r.eliminatedId ? `<p>${nameOf(r.eliminatedId)} の破門で終了</p>` : ''}
    <p style="text-align:center;font-size:18px">次期ボスは <b>${nameOf(r.winnerId)}</b></p>
    <table class="score-table">${rows}</table>
    ${S.me.isHost ? '<button class="big gold" id="modal-again">もう一局</button><button class="big" id="modal-close">部屋を閉じる</button>' : '<p class="hint">ホストの操作を待っている</p>'}`, 'settle');
  const ag = $('modal-again'); if (ag) ag.onclick = () => { hideModal(); send({ t: 'again' }); };
  const cl = $('modal-close'); if (cl) cl.onclick = () => { if (confirm('部屋を閉じるか？')) send({ t: 'close' }); };
}

// ---------- 開始時の自己確認カード（update4・ユーザー決定） ----------
// プレイヤーカラーの割り振り提示。開始直後に自分の色と名前を大きく見せ、タップで閉じる
// （オインクの「自分のコマを大きく見せて置かせる」自己確認フローの翻訳）
function maybeShowSelfCard() {
  if (selfCardShown || !S || !S.me) return;
  if (S.phase === 'lobby' || S.phase === 'gameover') return;
  if (!$('modal').classList.contains('hidden')) return; // 他のモーダルが出ている間は待つ
  selfCardShown = true;
  const pc = PCOLORS[S.me.colorIdx] || PCOLORS[0];
  showModal(`<div class="self-card">
    <div class="self-swatch" style="background:${pc.css}"></div>
    <p class="self-you">お前の名は <b>${S.me.name}</b></p>
    <p>お前の色は <b style="color:${pc.css}">${pc.name}</b>。名前も手番も札束も、この色で示される。<br>お前の席は画面の下だ。</p>
    <button class="big gold" onclick="hideModal()">わかった</button>
  </div>`, 'info');
}

// ---------- 遊び方1枚（update4） ----------
// 初めての人向けに3点だけ（情報は絞る）。入口とロビーに置き、対戦画面には常駐させない
function showHowto() {
  showModal(`<h3>遊び方</h3>
    <ol class="howto-list">
      <li><b>自分の番</b>: まず山札から1枚引ける（引かなくてもいい）。場の条件（色と数字の範囲）に合うカードを1枚出して交代。合う札がなければパス。</li>
      <li><b>ドボン</b>: 誰かが出したカードの数字と、自分の手札の数字の合計がピッタリ同じなら「ドボン」と宣言できる。<b>宣言しなくてもいい</b>（義務ではない）。</li>
      <li><b>困ったらカードをタップ</b>: 1回タップで大きく表示され、効果の説明が出る。もう1回タップで場に出る。相手が触れているカードは、裏向きの列で持ち上がって見える。</li>
    </ol>
    <button class="big" onclick="hideModal()">閉じる</button>`, 'generic');
}

// ---------- 手番残り秒数の数字表示（update4） ----------
// サーバー送信済みの turnEndsAt を、バーではなく数字だけで出す。ここでは文字だけを書き換え、
// 画面全体の再描画はしない（250ms再描画と手札DOMの再構築を避ける）
function updateTurnLeft() {
  const els = document.querySelectorAll('.turn-left');
  if (!els.length) return;
  if (!S || !S.turnEndsAt) { els.forEach((e) => { e.textContent = ''; }); return; }
  const remain = Math.max(0, Math.ceil((S.turnEndsAt - (Date.now() + serverOffset)) / 1000));
  els.forEach((e) => {
    const p = S.players.find((x) => x.id === e.dataset.pid);
    e.textContent = (p && !p.connected && !p.isCPU) ? `切断中・あと${remain}秒で自動` : `あと${remain}秒`;
    e.classList.toggle('low', remain <= 5);
  });
}
setInterval(updateTurnLeft, 500);

// ---------- 入口 ----------
function entrySettings() {
  return {
    rounds: $('in-rounds').value,
    minutes: parseInt($('in-minutes').value, 10),
    elimination: $('in-elimination').value === '1',
    turnLimit: parseInt($('in-turnlimit').value, 10),
    dobonSec: 2.5,
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
$('btn-oppnums').onclick = () => { showOppNums = !showOppNums; localStorage.setItem('dobon_oppnums', showOppNums ? '1' : '0'); render(); };
$('btn-howto').onclick = () => showHowto();
$('btn-howto2').onclick = () => showHowto();
$('btn-sort').onclick = () => { sortingMode = !sortingMode; if (!sortingMode && handDrag) handPointerCancel(); render(); };
window.addEventListener('resize', () => { if (S && S.me) layoutHand(); });
$('hand').addEventListener('pointerdown', handPointerDown);
$('btn-end-reserve').onclick = () => { if (confirm('この夜が終わったら、抗争を終了するか？')) send({ t: 'endReserve' }); };
$('btn-end-now').onclick = () => { if (confirm('今すぐ抗争を終了するか？')) send({ t: 'endNow' }); };
function showDiscard() {
  if (!S) return;
  // 受付中に一覧は開かない（判断を隠さないため）。ドボンボタンを光らせて合図する
  if (S.window || S.phase === 'kaeshi') { flashDobonBtn(); return; }
  showModal(`<h3>捨て札（出た順・${S.discard.length}枚）</h3>`, 'generic');
  const g = document.createElement('div'); g.className = 'discard-grid';
  for (const c of S.discard) {
    const mc = miniCard(c);
    mc.onclick = () => { hideModal(); showInfoCard(c); };
    g.appendChild(mc);
  }
  $('modal-box').appendChild(g);
  $('modal-box').insertAdjacentHTML('beforeend', '<button class="big" onclick="hideModal()">閉じる</button>');
}
$('btn-discard').onclick = showDiscard;
$('discard-pile').onclick = showDiscard;

// 選択中カード以外の場所のタップで選択/詳細を閉じる（カード本体・大写し・モーダル内は除く）
document.addEventListener('click', (e) => {
  if (!selected && !spotInfo) return;
  if (e.target.closest('#hand .card') || e.target.closest('#spotlight') || e.target.closest('#modal')) return;
  selected = null; spotInfo = null;
  sendTouch(null);
  renderHand(); renderSpotlight();
});

// カウントダウン再描画
setInterval(() => { if (S && (S.window || S.phase === 'kaeshi')) renderGame(); }, 250);

connect();
// 既存セッションがあれば復帰
const sess = JSON.parse(localStorage.getItem('dobon_session') || 'null');
if (sess) setTimeout(() => send({ t: 'rejoin', code: sess.code, token: sess.token }), 400);
