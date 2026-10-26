// node render/tools/chess_check.mjs : replays Fischer–Tal (Leipzig 1960) with the scene's SAN engine, asserts every move is legal and
// that the final position is the plan's (docs/PLAN_TAKE_TWO.md, "The chess game"); then prints the ply schedule from timing.json.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { GAME, describe, inCheck, legalMoves, moveToSan, sqName, sanToMove, apply } from '../src/scenes/t2/chess/pgn.js';
import { buildSchedule } from '../src/scenes/t2/chess/schedule.js';
import { AudioMap } from '../src/audio.js';

const here = path.dirname(new URL(import.meta.url).pathname);

assert.equal(GAME.plies.length, 42, '42 plies');
const fin = describe(GAME.final);
const want = { white: ['Kg2', 'Qh7', 'Rf1', 'a3', 'a5', 'c2', 'f2', 'h2'], black: ['Kc8', 'Qg4', 'Ne7', 'a7', 'b7', 'c3', 'd5'] };
const norm = (a) => a.slice().sort();
assert.deepEqual(norm(fin.white), norm(want.white), 'final White pieces');
assert.deepEqual(norm(fin.black), norm(want.black), 'final Black pieces');
assert.equal(GAME.final.turn, 'w', 'White to move');
assert.ok(inCheck(GAME.final), 'White in check');
const lm = legalMoves(GAME.final).map((m) => moveToSan(GAME.final, m));
assert.deepEqual(lm, ['Kh1'], 'only legal move is Kh1');
// the perpetual (not played; the draw was agreed at 21...Qg4+): 22.Kh1 Qf3+ 23.Kg1 Qg4+, each White move the only legal one
{ let p = GAME.final; const only = [];
  for (const san of ['Kh1', 'Qf3+', 'Kg1', 'Qg4+']) { if (p.turn === 'w') only.push(legalMoves(p).length); p = apply(p, sanToMove(p, san)).pos; }
  assert.deepEqual(only, [1, 1], 'perpetual: one legal reply each time');
  assert.ok(inCheck(p) && legalMoves(p).map((m) => moveToSan(p, m)).join() === 'Kh1', 'after 23...Qg4+ again only Kh1: the cycle repeats'); }
const checks = GAME.plies.filter((p) => p.check).map((p) => p.label);
assert.deepEqual(checks, ['18...Rxg2+', '21...Qg4+'], 'checks');
const caps = GAME.plies.filter((p) => p.capId >= 0);
console.log(`OK: 42 plies legal, SAN round-trips, final position matches the plan, White in check with one legal move (${lm[0]}).`);
console.log(`   ${caps.length} captures: ${caps.map((p) => p.label).join(' ')}`);
console.log(`   final: White ${fin.white.join(' ')} | Black ${fin.black.join(' ')}`);

// schedule
const timing = JSON.parse(fs.readFileSync(path.join(here, '..', 'data', 'timing.json'), 'utf8'));
const A = new AudioMap(timing, null);
const S = buildSchedule(A);
assert.equal(S.plies.length, 42);
for (let i = 1; i < 42; i++) assert.ok(S.plies[i].t > S.plies[i - 1].t + 0.1, `ply ${i + 1} after ply ${i}`);
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a.toFixed(3)} vs ${b.toFixed(3)}`);
const T = (lbl) => S.plies.find((p) => p.label === lbl).t;
near(T('1.e4'), 143.58, 0.03, '1.e4 on drums-out');
near(T('9.Qxg7'), 150.32, 0.042, '9.Qxg7 on "spark"');
near(T('13...O-O-O'), 153.04, 0.042, '13...O-O-O on "death"');
near(T('14.Bg5'), 153.69, 0.042, '14.Bg5 on drums back');
near(T('21...Qg4+'), 157.48, 0.042, '21...Qg4+ on "hand"');
near(S.stop, 158.10, 0.042, 'clocks stop on "let go"');
// clocks: each side's clock only runs on its own move; the sum of both elapsed times = stop - start press
const c = S.clockAt(S.stop + 1);
near((180 - c.w) + (180 - c.b), S.stop - S.startPress, 1e-6, 'clock bookkeeping');
console.log(`   Black starts White's clock at ${S.startPress.toFixed(3)}; clocks stop at ${S.stop.toFixed(3)}: White ${c.w.toFixed(2)} s, Black ${c.b.toFixed(2)} s left`);
const rows = [];
for (let i = 0; i < 42; i += 2) {
  const a = S.plies[i], b = S.plies[i + 1];
  rows.push(`${String(a.moveNo).padStart(2)}. ${a.san.padEnd(6)} ${a.t.toFixed(3)} ${a.grid.padEnd(5)}  ${b.san.padEnd(6)} ${b.t.toFixed(3)} ${b.grid}`);
}
console.log(rows.join('\n'));
console.log('set:', S.set.map((x) => `${sqName(x.sq)}@${x.t.toFixed(3)}`).join(' '));
