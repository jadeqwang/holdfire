// A tiny SAN move engine for the bridge's chess game (Fischer–Tal, Leipzig Olympiad 1960, ½–½, 42 plies).
// Board state, legal-move generation (enough to resolve SAN: disambiguation, castling, captures, en passant, promotion,
// checks), and a replay that verifies every move. Pure JS, no browser deps (render/tools/chess_check.mjs runs it in node).
//
// Squares are 0..63, sq = file + 8 * rank (a1 = 0, h1 = 7, a8 = 56). Pieces are 'PNBRQK' (White) / 'pnbrqk' (Black).
// Every piece carries a stable id (0..31) so the renderer can track it across moves: GAME.boards[k][sq] = id or -1.

export const MOVETEXT = '1.e4 e6 2.d4 d5 3.Nc3 Bb4 4.e5 c5 5.a3 Ba5 6.b4 cxd4 7.Qg4 Ne7 8.bxa5 dxc3 9.Qxg7 Rg8 10.Qxh7 Nbc6 ' +
  '11.Nf3 Qc7 12.Bb5 Bd7 13.O-O O-O-O 14.Bg5 Nxe5 15.Nxe5 Bxb5 16.Nxf7 Bxf1 17.Nxd8 Rxg5 18.Nxe6 Rxg2+ 19.Kh1 Qe5 ' +
  '20.Rxf1 Qxe6 21.Kxg2 Qg4+ 1/2-1/2';

export const FILES = 'abcdefgh';
export const sqName = (s) => FILES[s & 7] + String((s >> 3) + 1);
export const sqOf = (n) => FILES.indexOf(n[0]) + 8 * (Number(n[1]) - 1);
export const isWhite = (p) => p === p.toUpperCase();
const KN = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]];
const KG = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
const DIAG = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
const ORTH = [[1, 0], [-1, 0], [0, 1], [0, -1]];

// ------------------------------------------------------------------------------------------------ position
export function initial() {
  const back = 'RNBQKBNR';
  const pos = { b: new Array(64).fill(null), turn: 'w', castle: { K: true, Q: true, k: true, q: true }, ep: -1, pieces: [] };
  let id = 0;
  const put = (s, p) => { pos.b[s] = { p, id }; pos.pieces.push({ id, p, home: s }); id++; };
  for (let f = 0; f < 8; f++) put(f, back[f]);
  for (let f = 0; f < 8; f++) put(8 + f, 'P');
  for (let f = 0; f < 8; f++) put(48 + f, 'p');
  for (let f = 0; f < 8; f++) put(56 + f, back[f].toLowerCase());
  return pos;
}
const clone = (pos) => ({ b: pos.b.slice(), turn: pos.turn, castle: { ...pos.castle }, ep: pos.ep, pieces: pos.pieces });
const on = (f, r) => f >= 0 && f < 8 && r >= 0 && r < 8;
const colorOf = (c) => (c ? (isWhite(c.p) ? 'w' : 'b') : null);

// is square s attacked by side `by` ('w' | 'b')?
export function attacked(pos, s, by) {
  const f = s & 7, r = s >> 3, b = pos.b;
  const is = (ff, rr, set) => { if (!on(ff, rr)) return false; const c = b[ff + 8 * rr]; return !!c && colorOf(c) === by && set.includes(c.p.toUpperCase()); };
  const dir = by === 'w' ? -1 : 1;   // a white pawn on r-1 attacks r
  if (is(f - 1, r + dir, 'P') || is(f + 1, r + dir, 'P')) return true;
  for (const [df, dr] of KN) if (is(f + df, r + dr, 'N')) return true;
  for (const [df, dr] of KG) if (is(f + df, r + dr, 'K')) return true;
  const ray = (dirs, set) => {
    for (const [df, dr] of dirs) {
      let ff = f + df, rr = r + dr;
      while (on(ff, rr)) { const c = b[ff + 8 * rr]; if (c) { if (colorOf(c) === by && set.includes(c.p.toUpperCase())) return true; break; } ff += df; rr += dr; }
    }
    return false;
  };
  return ray(DIAG, 'BQ') || ray(ORTH, 'RQ');
}
export const kingSq = (pos, side) => pos.b.findIndex((c) => c && c.p === (side === 'w' ? 'K' : 'k'));
export const inCheck = (pos, side = pos.turn) => attacked(pos, kingSq(pos, side), side === 'w' ? 'b' : 'w');

// pseudo-legal moves for the side to move: {from, to, piece, cap (square of captured piece or -1), promo, castle ('K'|'Q'|null), ep}
function pseudo(pos) {
  const out = [], b = pos.b, me = pos.turn, them = me === 'w' ? 'b' : 'w';
  for (let s = 0; s < 64; s++) {
    const c = b[s]; if (!c || colorOf(c) !== me) continue;
    const P = c.p.toUpperCase(), f = s & 7, r = s >> 3;
    const add = (to, extra = {}) => out.push({ from: s, to, piece: P, cap: b[to] ? to : -1, promo: null, castle: null, ep: false, ...extra });
    if (P === 'P') {
      const d = me === 'w' ? 1 : -1, start = me === 'w' ? 1 : 6, last = me === 'w' ? 7 : 0;
      const push = (to, extra) => { if ((to >> 3) === last) for (const q of 'QRBN') add(to, { ...extra, promo: q }); else add(to, extra); };
      if (on(f, r + d) && !b[f + 8 * (r + d)]) {
        push(f + 8 * (r + d));
        if (r === start && !b[f + 8 * (r + 2 * d)]) add(f + 8 * (r + 2 * d));
      }
      for (const df of [-1, 1]) {
        if (!on(f + df, r + d)) continue;
        const to = f + df + 8 * (r + d);
        if (b[to] && colorOf(b[to]) === them) push(to);
        else if (to === pos.ep) add(to, { cap: to - 8 * d, ep: true });
      }
    } else if (P === 'N' || P === 'K') {
      for (const [df, dr] of (P === 'N' ? KN : KG)) {
        if (!on(f + df, r + dr)) continue; const to = f + df + 8 * (r + dr);
        if (!b[to] || colorOf(b[to]) === them) add(to);
      }
      if (P === 'K') {
        const rk = me === 'w' ? 0 : 7, home = 4 + 8 * rk;
        if (s === home && !attacked(pos, home, them)) {
          const R = me === 'w' ? 'R' : 'r';
          const k = me === 'w' ? 'K' : 'k', q = me === 'w' ? 'Q' : 'q';
          if (pos.castle[k] && !b[home + 1] && !b[home + 2] && b[home + 3] && b[home + 3].p === R && !attacked(pos, home + 1, them) && !attacked(pos, home + 2, them)) add(home + 2, { castle: 'K' });
          if (pos.castle[q] && !b[home - 1] && !b[home - 2] && !b[home - 3] && b[home - 4] && b[home - 4].p === R && !attacked(pos, home - 1, them) && !attacked(pos, home - 2, them)) add(home - 2, { castle: 'Q' });
        }
      }
    } else {
      const dirs = P === 'B' ? DIAG : P === 'R' ? ORTH : [...DIAG, ...ORTH];
      for (const [df, dr] of dirs) {
        let ff = f + df, rr = r + dr;
        while (on(ff, rr)) { const to = ff + 8 * rr; if (b[to]) { if (colorOf(b[to]) === them) add(to); break; } add(to); ff += df; rr += dr; }
      }
    }
  }
  return out;
}

// apply a move (no legality check); returns the new position plus what happened (for the renderer)
export function apply(pos, m) {
  const n = clone(pos), b = n.b, me = pos.turn;
  const mover = b[m.from];
  const info = { from: m.from, to: m.to, id: mover.id, piece: mover.p, capId: -1, capSq: -1, rook: null, promo: m.promo };
  if (m.cap >= 0) { info.capId = b[m.cap].id; info.capSq = m.cap; info.capPiece = b[m.cap].p; b[m.cap] = null; }
  b[m.from] = null;
  b[m.to] = m.promo ? { p: me === 'w' ? m.promo : m.promo.toLowerCase(), id: mover.id } : mover;
  if (m.castle) {
    const rk = me === 'w' ? 0 : 7;
    const rf = m.castle === 'K' ? 7 + 8 * rk : 8 * rk, rt = m.castle === 'K' ? 5 + 8 * rk : 3 + 8 * rk;
    info.rook = { id: b[rf].id, from: rf, to: rt };
    b[rt] = b[rf]; b[rf] = null;
  }
  // castling rights: any move from or to a corner / king square clears the matching right
  const clear = (s) => { if (s === 4) { n.castle.K = n.castle.Q = false; } if (s === 60) { n.castle.k = n.castle.q = false; }
    if (s === 0) n.castle.Q = false; if (s === 7) n.castle.K = false; if (s === 56) n.castle.q = false; if (s === 63) n.castle.k = false; };
  clear(m.from); clear(m.to);
  n.ep = (m.piece === 'P' && Math.abs(m.to - m.from) === 16) ? (m.from + m.to) / 2 : -1;
  n.turn = me === 'w' ? 'b' : 'w';
  return { pos: n, info };
}

export function legalMoves(pos) {
  return pseudo(pos).filter((m) => !inCheck(apply(pos, m).pos, pos.turn));
}

// ------------------------------------------------------------------------------------------------ SAN
export function sanToMove(pos, san) {
  const s = san.replace(/[+#!?]+$/, '');
  const legal = legalMoves(pos);
  if (s === 'O-O' || s === 'O-O-O') {
    const want = s === 'O-O' ? 'K' : 'Q';
    const ms = legal.filter((m) => m.castle === want);
    if (ms.length !== 1) throw new Error(`illegal castling ${san}`);
    return ms[0];
  }
  const mm = s.match(/^([NBRQK])?([a-h])?([1-8])?(x)?([a-h][1-8])(=?[NBRQ])?$/);
  if (!mm) throw new Error(`cannot parse SAN ${san}`);
  const [, pc, df, dr, x, dest, promo] = mm;
  const piece = pc || 'P', to = sqOf(dest);
  const ms = legal.filter((m) => m.piece === piece && m.to === to && !m.castle &&
    (!df || (m.from & 7) === FILES.indexOf(df)) && (!dr || (m.from >> 3) === Number(dr) - 1) &&
    (promo ? m.promo === promo.replace('=', '') : !m.promo));
  if (ms.length !== 1) throw new Error(`SAN ${san}: ${ms.length} matching legal moves`);
  const m = ms[0];
  if (!!x !== (m.cap >= 0)) throw new Error(`SAN ${san}: capture mark does not match the board`);
  return m;
}

// SAN for a legal move (used to cross-check the parse)
export function moveToSan(pos, m) {
  const legal = legalMoves(pos);
  let s = '';
  if (m.castle) s = m.castle === 'K' ? 'O-O' : 'O-O-O';
  else if (m.piece === 'P') { if (m.cap >= 0) s = FILES[m.from & 7] + 'x'; s += sqName(m.to); if (m.promo) s += '=' + m.promo; }
  else {
    const rivals = legal.filter((o) => o.piece === m.piece && o.to === m.to && o.from !== m.from);
    let dis = '';
    if (rivals.length) {
      if (!rivals.some((o) => (o.from & 7) === (m.from & 7))) dis = FILES[m.from & 7];
      else if (!rivals.some((o) => (o.from >> 3) === (m.from >> 3))) dis = String((m.from >> 3) + 1);
      else dis = sqName(m.from);
    }
    s = m.piece + dis + (m.cap >= 0 ? 'x' : '') + sqName(m.to);
  }
  const after = apply(pos, m).pos;
  if (inCheck(after)) s += legalMoves(after).length ? '+' : '#';
  return s;
}

export function parseMovetext(txt) {
  return txt.replace(/\{[^}]*\}/g, ' ').replace(/\d+\.(\.\.)?/g, ' ').split(/\s+/).filter((w) => w && !/^(1-0|0-1|1\/2-1\/2|\*)$/.test(w));
}

// Replay a game. Throws on the first illegal or ambiguous move, or on a wrong check mark.
export function replay(txt = MOVETEXT) {
  const sans = parseMovetext(txt);
  let pos = initial();
  const plies = [], positions = [pos];
  sans.forEach((san, k) => {
    const m = sanToMove(pos, san);
    const canon = moveToSan(pos, m);
    if (canon !== san) throw new Error(`ply ${k + 1}: SAN ${san} replays as ${canon}`);
    const { pos: next, info } = apply(pos, m);
    const check = inCheck(next);
    plies.push({ k, san, side: pos.turn, moveNo: (k >> 1) + 1, label: `${(k >> 1) + 1}.${k & 1 ? '..' : ''}${san}`, check, ...info });
    pos = next; positions.push(pos);
  });
  const pieces = positions[0].pieces;
  const boards = positions.map((p) => p.b.map((c) => (c ? c.id : -1)));
  return { sans, plies, positions, boards, pieces, final: pos };
}

// position -> {white: ['Kg2', 'Qh7', 'a3', ...], black: [...]} (pieces K Q R B N then pawns, squares sorted)
export function describe(pos) {
  const out = { white: [], black: [] };
  const order = 'KQRBNP';
  for (let s = 0; s < 64; s++) {
    const c = pos.b[s]; if (!c) continue;
    const P = c.p.toUpperCase();
    (isWhite(c.p) ? out.white : out.black).push((P === 'P' ? '' : P) + sqName(s));
  }
  const key = (x) => { const P = /^[KQRBN]/.test(x) ? x[0] : 'P'; return order.indexOf(P) * 100 + (P === 'P' ? 0 : 1) * 0 + x.slice(-2).charCodeAt(0) * 2 + Number(x.slice(-1)); };
  out.white.sort((a, b) => key(a) - key(b)); out.black.sort((a, b) => key(a) - key(b));
  return out;
}

export const GAME = replay();
