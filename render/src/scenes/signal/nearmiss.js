// Pre-chorus 2 "Secret list of every near-miss and disaster, running total no one ever knew:": the station's terminal (now
// gold: this is after the Listener chose) scrolls the real list, render/data/nearmisses.json (39 sourced entries, 1950-2022),
// date · place · description, disputed entries tagged as such. Each new entry is declassified as it arrives (its redaction bar
// wipes off), the scroll accelerates, and the RUNNING TOTAL climbs to 39 and holds, over the caveat: an incomplete list.
// p: {t0 (first entry; default shot start + 0.2), t1 (last entry; default the word "knew"), warm (1)}
import { P, css, mix } from '../../palette.js';
import { clamp, lerp, smooth, easeOutCubic, easeInOutCubic, range } from '../../util.js';
import { lineByText, wordT } from './lib.js';
import { crtPass, RECT, amberAt, dimAt } from './crt.js';

let DATA = null;
async function load() {
  if (DATA) return DATA;
  const d = await (await fetch('data/nearmisses.json')).json();
  DATA = d.incidents.slice().sort((a, b) => a.date.localeCompare(b.date));
  return DATA;
}

const X0 = 262, XR = 1658, TOP = 300, BOT = 836, H = 76;
const TAG = { disputed: 'DISPUTED', severity_debated: 'SEVERITY DEBATED' };

function schedule(ctx, shot, p, n) {
  const L = lineByText(ctx.audio, 'running total');
  const tA = p.t0 ?? shot.t0 + 0.2;
  const tB = p.t1 ?? Math.min(wordT(L, 'knew', shot.t1 - 0.6), shot.t1 - 0.3);
  const k = 0.68;                                         // < 1: the gaps shrink, the list speeds up
  const R = (i) => tA + (tB - tA) * Math.pow(i / (n - 1), k);
  const f = (t) => (t <= tA ? 0 : t >= tB ? n - 1 : (n - 1) * Math.pow((t - tA) / (tB - tA), 1 / k));
  return { tA, tB, R, f };
}

export const look = { bloom: 0.7, bloomThreshold: 0.75, halation: 0.25, halCol: [1.0, 0.5, 0.15], vignette: 0.3, grain: 0.035 };

export default {
  async init() { await load(); },
  async prepare() { await load(); },
  draw(ctx, shot, t, lt, p) {
    const e = ctx.engine; const D = DATA; const n = D.length;
    const S = schedule(ctx, shot, p, n);
    const warm = p.warm ?? 1;
    const gold = amberAt(warm), dim = dimAt(warm, 0.55), hot = mix(gold, P.goldPale, 0.5);
    const c = e.c2dBegin();
    c.textBaseline = 'alphabetic';
    const fNow = S.f(t);
    const cur = t < S.tA ? -1 : Math.floor(fNow + 1e-6);
    // header
    const ha = smooth(range(t, shot.t0, shot.t0 + 0.25));
    c.globalAlpha = ha;
    c.font = '500 34px PlexM'; c.fillStyle = css(gold, 1);
    c.fillText('NUCLEAR CLOSE CALLS & ACCIDENTS, 1950–2022', X0, 160);
    c.font = '19px Plex'; c.fillStyle = css(dim, 1);
    c.fillText('SOURCES: UCS · FLI · CHATHAM HOUSE · A. F. PHILLIPS · AHF', X0, 200);
    { const ca = smooth(range(t, S.tB + 0.05, S.tB + 0.4));
      c.globalAlpha = ha * (1 - ca); c.fillText('NOT A COMPLETE LIST · DISPUTED ENTRIES MARKED', X0, 230);
      c.globalAlpha = ha * ca; c.fillStyle = css(gold, 1); c.fillText('39 LOGGED · THE TRUE NUMBER IS UNKNOWN', X0, 230); c.fillStyle = css(dim, 1); c.globalAlpha = ha; }
    c.textAlign = 'right';
    c.fillText('RUNNING TOTAL', XR, 132);
    c.font = '500 112px PlexM';
    const count = Math.max(0, cur + 1);
    const flip = cur >= 0 ? Math.exp(-(t - S.R(cur)) / 0.12) : 0;
    c.fillStyle = css(mix(gold, P.goldPale, 0.3 + 0.7 * flip), 1);
    c.fillText(String(count).padStart(2, '0'), XR, 238);
    c.textAlign = 'left';
    c.fillStyle = css(dim, 0.7); c.fillRect(X0, 262, XR - X0, 2);
    c.globalAlpha = 1;
    // the list: entry i sits H px above entry i+1; the newest at the bottom; scroll is continuous in f
    c.save(); c.beginPath(); c.rect(X0 - 20, TOP - 4, XR - X0 + 40, BOT - TOP + 10); c.clip();
    const fs = fNow;
    for (let i = Math.max(0, cur - 9); i <= cur; i++) {
      const y = BOT - H * 0.62 - (fs - i) * H;
      if (y < TOP - H) continue;
      const it = D[i];
      const fadeTop = smooth(range(y, TOP - 10, TOP + 60));
      const age = t - S.R(i);
      const reveal = clamp(age / 0.2);
      const isNew = i === cur;
      c.globalAlpha = fadeTop;
      // index · date · place · tag
      c.font = '22px Plex'; c.fillStyle = css(dim, 0.9);
      c.fillText(String(i + 1).padStart(2, '0'), X0, y);
      c.font = '500 25px PlexM'; c.fillStyle = css(isNew ? hot : gold, 1);
      c.fillText(it.date, X0 + 58, y);
      c.font = '25px Plex'; c.fillStyle = css(gold, 0.95);
      c.fillText(it.place.toUpperCase(), X0 + 250, y);
      const tag = TAG[it.status];
      if (tag) {
        c.font = '500 18px PlexM'; const tw = c.measureText(tag).width;
        c.strokeStyle = css(gold, 0.9); c.lineWidth = 2; c.strokeRect(XR - tw - 18, y - 20, tw + 18, 28);
        c.fillStyle = css(gold, 0.95); c.fillText(tag, XR - tw - 9, y);
      }
      // description, declassified: a redaction bar wipes off left to right
      c.font = '24px Plex'; c.fillStyle = css(mix(gold, P.cream, 0.25), 0.9);
      const dy = y + 33;
      c.fillText(it.desc, X0 + 58, dy);
      if (reveal < 1) {
        const w = c.measureText(it.desc).width + 8;
        const x0 = X0 + 54 + w * easeInOutCubic(reveal);
        c.fillStyle = css(dim, 0.95); c.fillRect(x0, dy - 21, Math.max(0, X0 + 54 + w - x0), 27);
      }
      c.globalAlpha = 1;
    }
    c.restore();
    // after the last entry: the caveat beneath the total
    const zoom = lerp(1.0, 1.03, smooth(range(t, shot.t0, shot.t1)));
    crtPass(e, t, { warm, zoom, zc: [960, 470], gain: lerp(1.08, 1.3, warm), power: 1 + 0.6 * warm });
  },
};
