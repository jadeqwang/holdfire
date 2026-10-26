// Writes docs/take2/shots.json (the take-two production tracker) from the edit itself: it imports src/timeline.js with the
// real timing data, so the tracker and the timeline can never disagree. Re-run after every timeline change.
//   cd render && node tools/shots_json.mjs [OUT.json]
// Per shot: {id, t0, t1, section, lyric, voice, picture, era_style, method, scene, clip, type, lipsync_window, anchor, plan, notes}
process.removeAllListeners('warning');   // render/package.json has no "type": "module"; node re-parses src/*.js as ESM
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = process.argv[2] || path.join(ROOT, '..', 'docs', 'take2', 'shots.json');

export async function loadEdit() {
  const { AudioMap } = await import(path.join(ROOT, 'src', 'audio.js'));
  const TL = await import(path.join(ROOT, 'src', 'timeline.js'));
  const timing = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'timing.json'), 'utf8'));
  const A = new AudioMap(timing, null);
  return { A, shots: TL.buildTimeline(A), timing, TL };
}

const VOICE = { A_breathy: 'A', B_belt: 'B', both: 'both', choir: 'both' };
const r3 = (x) => Math.round(x * 1000) / 1000;
const clean = (w) => String(w).replace(/[()]/g, '');

export function trackerRows(A, shots, names = {}) {
  const words = A.lines.flatMap((L) => L.words.map((w) => ({ ...w, voice: L.voice, line: L.n })));
  return shots.map((s) => {
    const inside = words.filter((w) => w.t >= s.t0 && w.t < s.t1);
    const sounding = words.filter((w) => w.end > s.t0 + 0.02 && w.t < s.t1);          // includes a note held over the cut
    const vs = [...new Set(sounding.map((w) => VOICE[w.voice] ?? null))].filter(Boolean);
    const voice = vs.length === 0 ? null : vs.length === 1 ? vs[0] : 'both';
    const p = typeof s.p === 'function' ? null : s.p;
    const clips = [];
    const walk = (o) => { if (!o || typeof o !== 'object') return; if (o.clip) clips.push(o.clip); if (o.img) clips.push(o.img); for (const k in o) if (o[k] && typeof o[k] === 'object' && k !== 'plies') walk(o[k]); };
    walk(p);
    const row = {
      id: s.id, t0: r3(s.t0), t1: r3(s.t1), section: names[s.section] || s.section, edit_section: s.section, timing_section: A.sections.find((x) => s.t0 >= x.start && s.t0 < x.end)?.name ?? null,
      lyric: inside.map((w) => clean(w.w)).join(' ') || null,
      voice,
      picture: s.want || null,
      era_style: s.era || null,
      method: s.method || null,
      scene: s.scene,
      ...(s.scene === 'multi' ? { layers: (p.layers || []).map((l) => l.scene) } : {}),
      ...(s.scene === 't2_split' ? { layers: [p.left?.scene, p.right?.scene] } : {}),
      clip: clips.length ? [...new Set(clips)] : null,
      type: (s.cues || []).map((c) => c.label).join(' / ') || null,
      lipsync_window: s.method === 'seedance_sung' && sounding.length ? [r3(Math.max(s.t0, sounding[0].t)), r3(Math.min(s.t1, Math.max(...sounding.map((w) => w.end))))] : null,
      anchor: { kind: s.anchor.kind, ref: s.anchor.ref, t: r3(s.anchor.t) },
      plan: s.plan,
      notes: s.notes || null,
    };
    return row;
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { A, shots, TL } = await loadEdit();
  const rows = trackerRows(A, shots, TL.SECTION_NAMES);
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(rows, null, 1) + '\n');
  const by = {}; rows.forEach((r) => { by[r.edit_section] = (by[r.edit_section] || 0) + 1; });
  const m = {}; rows.forEach((r) => { m[r.method] = (m[r.method] || 0) + 1; });
  console.log(`${rows.length} shots -> ${OUT}`);
  console.log('by section', by);
  console.log('by method', m);
}
