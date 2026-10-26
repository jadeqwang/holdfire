// Timing + audio-feature lookups (data/timing.json from analysis/, data/audio.json per-frame features).
// Everything the renderer does is a pure function of song time t.
import { clamp } from './util.js';

const num = (x) => (typeof x === 'number' ? x : (x && (x.t ?? x.time ?? x.start)));

export class AudioMap {
  constructor(timing, feats) {
    this.d = timing;
    this.duration = timing.duration || 247.2;
    this.beats = (timing.beats || []).map(num).filter((x) => x != null);
    const bars = timing.bars || timing.downbeats || [];
    this.bars = bars.map(num).filter((x) => x != null);
    this.sections = timing.sections || [];
    this.lines = (timing.lines || []).map((l, i) => ({
      ...l, i, t: l.start ?? l.t, end: l.end,
      words: (l.words || []).map((w) => ({ ...w, w: w.w ?? w.word ?? w.text, t: w.start ?? w.t, end: w.end })),
    }));
    this.hits = (timing.hits || []).map((h) => ({ ...h, t: h.t_attack ?? h.start ?? h.t ?? h.time }));
    this.events = timing.events || [];
    this.events = timing.events || [];
    this.fps = (feats && feats.fps) || 24;
    this.f = (feats && (feats.features || feats.frames || feats)) || {};
    this.kicks = ((feats && feats.kicks) || []).map((k) => (Array.isArray(k) ? k : [num(k), k.s ?? k.strength ?? 1]));
    this.snares = ((feats && feats.snares) || []).map((k) => (Array.isArray(k) ? k : [num(k), k.s ?? k.strength ?? 1]));
  }

  static last(arr, t, key = (x) => x) {
    let lo = 0, hi = arr.length - 1, ans = -1;
    while (lo <= hi) { const m = (lo + hi) >> 1; if (key(arr[m]) <= t) { ans = m; lo = m + 1; } else hi = m - 1; }
    return ans;
  }

  beat(t) {
    const b = this.beats; if (b.length < 2) return { k: -1, t0: 0, t1: 1, phase: 0, period: 0.667 };
    const k = AudioMap.last(b, t);
    if (k < 0) { const p = b[1] - b[0]; return { k: -1, t0: b[0] - p, t1: b[0], phase: clamp((t - b[0] + p) / p), period: p }; }
    const t0 = b[k], t1 = k + 1 < b.length ? b[k + 1] : t0 + (t0 - b[k - 1]);
    return { k, t0, t1, phase: clamp((t - t0) / (t1 - t0)), period: t1 - t0 };
  }
  bar(t) {
    const b = this.bars; if (b.length < 2) return { k: -1, t0: 0, t1: 1, phase: 0, period: 2.667 };
    const k = AudioMap.last(b, t);
    if (k < 0) { const p = b[1] - b[0]; return { k: -1, t0: b[0] - p, t1: b[0], phase: clamp((t - b[0] + p) / p), period: p }; }
    const t0 = b[k], t1 = k + 1 < b.length ? b[k + 1] : t0 + (t0 - b[k - 1]);
    return { k, t0, t1, phase: clamp((t - t0) / (t1 - t0)), period: t1 - t0 };
  }
  // bar start by index (extrapolated past either end)
  B(i) {
    const b = this.bars; if (i >= 0 && i < b.length) return b[i];
    const p = b[b.length - 1] - b[b.length - 2];
    return i < 0 ? b[0] + i * (b[1] - b[0]) : b[b.length - 1] + (i - b.length + 1) * p;
  }
  beatT(k) { const b = this.beats; if (k >= 0 && k < b.length) return b[k]; const p = b[1] - b[0]; return k < 0 ? b[0] + k * p : b[b.length - 1] + (k - b.length + 1) * (b[b.length - 1] - b[b.length - 2]); }
  snap(t) {
    const k = AudioMap.last(this.beats, t);
    const a = this.beats[Math.max(0, k)], b = this.beats[Math.min(this.beats.length - 1, k + 1)];
    return Math.abs(t - a) < Math.abs(b - t) ? a : b;
  }

  env(list, t, decay = 0.12, minStrength = 0) {
    const k = AudioMap.last(list, t, (x) => x[0]);
    if (k < 0) return 0;
    for (let j = k; j >= Math.max(0, k - 3); j--) { const [ot, s] = list[j]; if (s >= minStrength) return s * Math.exp(-(t - ot) / decay); }
    return 0;
  }
  kick(t, decay = 0.12) { return this.env(this.kicks, t, decay, 0.35); }
  snare(t, decay = 0.08) { return this.env(this.snares, t, decay, 0.5); }

  feat(name, t) {
    const a = this.f[name]; if (!a || !a.length) return 0;
    const x = t * this.fps, i = Math.floor(x);
    if (i < 0) return a[0];
    if (i >= a.length - 1) return a[a.length - 1];
    const u = x - i; return a[i] * (1 - u) + a[i + 1] * u;
  }

  // lyric helpers
  line(i) { return this.lines[i]; }
  L(i) { return this.lines[i].t; }
  Le(i) { return this.lines[i].end; }
  W(i, j) { return this.lines[i].words[j].t; }
  We(i, j) { return this.lines[i].words[j].end; }
  // find a line by (section name or tag substring, index within that section)
  findLine(section, k = 0) {
    const ls = this.lines.filter((l) => (l.section || '').toLowerCase().includes(section.toLowerCase()));
    return ls[k];
  }
  section(name, k = 0) {
    const ss = this.sections.filter((s) => (s.name || s.tag || '').toLowerCase().includes(name.toLowerCase()));
    return ss[k];
  }
  // first analysed event of a type (impact, drums_out, ...) whose desc matches re, at or after t
  event(type, re, t = 0) { const e = this.events.find((x) => x.type === type && x.t >= t && (!re || re.test(x.desc || ''))); return e ? e.t : null; }
  hitList(kind) { return this.hits.filter((h) => !kind || (h.kind || h.section || '').includes(kind)); }
  where(t) {
    const s = this.sections.find((x) => t >= x.start && t < x.end);
    const b = this.bar(t);
    return `${s ? s.name : '?'}  bar ${b.k} beat ${(b.phase * 4).toFixed(2)}`;
  }
}
