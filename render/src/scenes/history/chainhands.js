// CHAIN HANDS (B2: "But fear's a chain, and chains are links, / and every link's a hand that can let go:"). The hunters'
// sight-lines from the forest shot (every reticle locked on the struck match) swing out and hang as a chain of engraved red
// links; "chains are links" runs a pulse along it; on "every link's a hand" each ring-link turns into two hands hooked into each
// other, and the line turns from red to gold; on "let go" the fingers open, the hands draw apart and the chain's remaining
// links fall away. Liu's 猜疑链, "chain of suspicion", answered (facts.md §6).
// drawChainHands(ctx, p) draws ADDITIVELY into rtScene (over the forest plate or a dark ground); the 'chainhands' scene adds the
// dark ground. p: {tForm, tLinks, tHands, tLetGo (word onsets of lines 48-49 by default), y (500: chain height), sag (70),
//   scale (0.86: hands), stagger (0.2), gain (1.25), from: reticles/match of the forest shot (forest.js RETICLES, MATCH)}
import { P, css, mix } from '../../palette.js';
import { clamp, lerp, smooth, range, easeOutCubic, easeInOutCubic, easeInCubic, hash1 } from '../../util.js';
import { clasp } from './hands.js';
import { RETICLES, MATCH } from './forest.js';

export function chainTimes(A, p = {}) {
  const l48 = A.lines.find((l) => /^But fear's a chain/.test(l.text)), l49 = A.lines.find((l) => /^and every link's a hand/.test(l.text));
  const w = (l, j, d) => (l && l.words[j] ? l.words[j].t : d);
  return {
    tForm: p.tForm ?? w(l48, 0, 153.4), tLinks: p.tLinks ?? w(l48, 7, 155.48),
    tHands: p.tHands ?? w(l49, 1, 156.36), tLetGo: p.tLetGo ?? w(l49, 7, 158.12),
  };
}

const CLASPS = [400, 960, 1520];                   // face-on links: each becomes two hands
const BARS = [120, 680, 1240, 1800];               // edge-on links between them: these fall away
function chainY(x, t, p) {
  const y0 = p.y ?? 500, sag = p.sag ?? 70;
  const u = (x - 960) / 1100;
  return y0 + sag * (1 - u * u) + Math.sin(t * 1.1 + x * 0.004) * 4;
}

function ovalLink(c, x, y, ang, col, a, draw = 1) {
  c.save(); c.translate(x, y); c.rotate(ang);
  c.strokeStyle = css(col, a); c.lineWidth = 2.2;
  const seg = (rx, ry, a0, a1) => { c.beginPath(); c.ellipse(0, 0, rx, ry, 0, a0, a0 + (a1 - a0) * draw); c.stroke(); };
  c.fillStyle = 'rgb(0,0,0)';
  c.beginPath(); c.ellipse(0, 0, 182, 76, 0, 0, Math.PI * 2); c.ellipse(0, 0, 132, 37, 0, 0, Math.PI * 2, true); c.fill('evenodd');
  seg(182, 76, 0, Math.PI * 2); seg(132, 37, 0, Math.PI * 2);
  // engraved shading: concentric lines on the lower half of the ring, closer toward the bottom (the shadow side)
  c.globalAlpha = 0.75;
  for (const [rx, ry] of [[168, 64], [154, 53], [143, 45]]) seg(rx, ry, 0.25, Math.PI - 0.25);
  c.globalAlpha = 1;
  c.restore();
}
function barLink(c, x, y, ang, col, a, draw = 1) {
  c.save(); c.translate(x, y); c.rotate(ang);
  c.strokeStyle = css(col, a); c.lineWidth = 2.2; c.fillStyle = 'rgb(0,0,0)';
  const L = 150, R = 20;
  c.beginPath(); c.moveTo(-L, -R); c.lineTo(L, -R); c.arc(L, 0, R, -Math.PI / 2, Math.PI / 2); c.lineTo(-L, R); c.arc(-L, 0, R, Math.PI / 2, Math.PI * 1.5); c.closePath(); c.fill();
  c.save(); c.beginPath(); c.rect(-L - R, -R - 3, (2 * L + 2 * R) * draw, 2 * R + 6); c.clip();
  c.beginPath(); c.moveTo(-L, -R); c.lineTo(L, -R); c.arc(L, 0, R, -Math.PI / 2, Math.PI / 2); c.lineTo(-L, R); c.arc(-L, 0, R, Math.PI / 2, Math.PI * 1.5); c.closePath(); c.stroke();
  c.globalAlpha = 0.8; c.beginPath(); c.moveTo(-L + 4, 0); c.lineTo(L - 4, 0); c.stroke();           // the slot seen edge-on
  c.globalAlpha = 0.6; c.beginPath(); c.moveTo(-L + 10, R * 0.55); c.lineTo(L - 10, R * 0.55); c.stroke();
  c.restore();
  c.restore();
}

export function drawChainHands(ctx, p = {}) {
  const e = ctx.engine, t = ctx.t;
  const T = chainTimes(ctx.audio, p);
  const red = P.red, gold = P.gold;
  const c = e.c2dBegin();
  const form = easeInOutCubic(range(t, T.tForm, T.tForm + 0.95));
  const ret = (p.from && p.from.reticles) || RETICLES, match = (p.from && p.from.match) || MATCH;
  // the sight-lines, still converging on the match, swing out into the chain's line
  const nodes = [...BARS.map((x) => ({ x, bar: true })), ...CLASPS.map((x) => ({ x, bar: false }))].sort((a, b) => a.x - b.x);
  const srcs = ret.map((r) => r).sort((a, b) => a[0] - b[0]);
  if (form < 1) {
    c.lineWidth = 2;
    nodes.forEach((n, i) => {
      const s = srcs[Math.min(srcs.length - 1, Math.round(i * (srcs.length - 1) / (nodes.length - 1)))];
      const y = chainY(n.x, t, p);
      const half = n.bar ? 170 : 182;
      const a0 = [lerp(match[0], n.x - half, form), lerp(match[1], y, form)], a1 = [lerp(s[0], n.x + half, form), lerp(s[1], y, form)];
      c.strokeStyle = css(red, 0.55 * (1 - smooth(range(form, 0.6, 1)))); c.beginPath(); c.moveTo(a0[0], a0[1]); c.lineTo(a1[0], a1[1]); c.stroke();
    });
    // the locked target lets go of the match as the lines leave it
    const ta = 1 - smooth(range(t, T.tForm, T.tForm + 0.45));
    if (ta > 0) { c.strokeStyle = css(red, 0.8 * ta); c.lineWidth = 2; for (let k = 0; k < 6; k++) { c.beginPath(); c.arc(match[0], match[1] - 6, 18 + k * 11 * (1 + (1 - ta)), 0, Math.PI * 2); c.stroke(); } }
  }
  const linkDraw = smooth(range(form, 0.45, 1));
  const pulse = (x) => Math.exp(-Math.pow((t - T.tLinks) * 1400 - (x + 100), 2) / (2 * 140 * 140)) * (t > T.tLinks - 0.2 ? 1 : 0);
  const letGo = smooth(range(t, T.tLetGo, T.tLetGo + 0.38));
  // the edge-on links: they hang between the hands until "let go", then fall away
  for (const [i, x] of BARS.entries()) {
    if (linkDraw <= 0) break;
    const fall = Math.max(0, t - T.tLetGo - 0.05 * (i % 3));
    const y = chainY(x, t, p) + 0.5 * 1500 * fall * fall;
    const ang = (chainY(x + 20, t, p) - chainY(x - 20, t, p)) / 40 + fall * (hash1(i * 3.3) - 0.5) * 3.2;
    const a = (0.95 + 0.5 * pulse(x)) * (1 - smooth(range(fall, 0.25, 0.6)));
    const col = mix(red, [1, 0.62, 0.5], 0.4 * pulse(x));
    barLink(c, x + fall * (hash1(i) - 0.5) * 120, y, ang, col, Math.min(1, a), linkDraw);
  }
  // the ring-links, each becoming two hands hooked together
  const order = CLASPS.map((x, i) => [Math.abs(x - 960), i]).sort((a, b) => a[0] - b[0]).map((q) => q[1]);
  for (const [i, x] of CLASPS.entries()) {
    if (linkDraw <= 0) break;
    const y = chainY(x, t, p);
    const ang = (chainY(x + 20, t, p) - chainY(x - 20, t, p)) / 40;
    const th = T.tHands + (p.stagger ?? 0.2) * order.indexOf(i);
    const morph = smooth(range(t, th, th + 0.45));
    const col = mix(red, [1, 0.62, 0.5], 0.4 * pulse(x));
    if (morph < 1) ovalLink(c, x, y, ang, col, (1 - morph) * Math.min(1, 0.95 + 0.5 * pulse(x)), linkDraw);
    if (morph > 0) {
      const hcol = mix(red, gold, smooth(range(t, th + 0.15, th + 0.95)));
      const draw = easeOutCubic(range(t, th, th + 0.7));
      clasp(c, x, y + 2, p.scale ?? 0.86, 1 - letGo, { col: hcol, lw: 2.3 / (p.scale ?? 0.86), fill: 'rgb(0,0,0)', arm: 150, draw, alpha: 1 }, ang);
    }
  }
  e.blit2d('add', p.gain ?? 1.25);
}

export default {
  draw(ctx, shot, t, lt, p) {
    const e = ctx.engine;
    e.clear(e.rtScene, ...P.void);
    drawChainHands(ctx, p);
  },
};
