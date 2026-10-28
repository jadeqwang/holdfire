// node render/tools/chess_lens.mjs [SHOT_ID] : for every frame of every t2_chess shot (dive excepted), is the lens inside a piece or
// a chain link, or within 0.07 of its surface (the near plane is 0.05)? Mirrors chess.js drawImpl's camera (twos, cameraFx shake)
// and boardState with the chain camera basis, and tests the real meshes (pieces.js) with chess.js's vertex smear applied:
// winding number for inside, point-triangle distance for near. Exit code 1 on any hit (QA_RC2 #2: BR09's first frame).
process.removeAllListeners('warning');
import path from 'node:path';
const R = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const { loadEdit } = await import(R + '/tools/shots_json.mjs');
const { buildSchedule } = await import(R + '/src/scenes/t2/chess/schedule.js');
const { cameraAt, cameraFx } = await import(R + '/src/scenes/t2/chess/camera.js');
const { boardState } = await import(R + '/src/scenes/t2/chess/state.js');
const { buildGeometries, linkGeometry } = await import(R + '/src/scenes/t2/chess/pieces.js');
const { GAME } = await import(R + '/src/scenes/t2/chess/pgn.js');
const { noise1, clamp } = await import(R + '/src/util.js');
const { A, shots } = await loadEdit();
const S = buildSchedule(A);
const geo = buildGeometries(); geo.L = linkGeometry();
const tris = {}, nrms = {}; for (const k in geo) { tris[k] = geo[k].attributes.position.array; nrms[k] = geo[k].attributes.normal.array; }
const qRot = (q, v) => qInvRot([-q[0], -q[1], -q[2], q[3]], v);
const fract = (x) => x - Math.floor(x);
const hashP = (a, b, c) => fract(Math.sin(a * 12.9898 + b * 78.233 + c * 37.719) * 43758.5453);
const camBasis = (c) => {
  const f = [c.target[0] - c.pos[0], c.target[1] - c.pos[1], c.target[2] - c.pos[2]]; const fl = Math.hypot(...f); const fwd = f.map((x) => x / fl);
  const up0 = c.up || [0, 1, 0];
  let r = [fwd[1] * up0[2] - fwd[2] * up0[1], fwd[2] * up0[0] - fwd[0] * up0[2], fwd[0] * up0[1] - fwd[1] * up0[0]]; const rl = Math.hypot(...r) || 1; r = r.map((x) => x / rl);
  const up = [r[1] * fwd[2] - r[2] * fwd[1], r[2] * fwd[0] - r[0] * fwd[2], r[0] * fwd[1] - r[1] * fwd[0]];
  return { pos: c.pos, fwd, right: r, up };
};
// world -> local: inverse of T * R(q) * S
const qInvRot = (q, v) => { const [x, y, z, w] = [-q[0], -q[1], -q[2], q[3]]; const ix = w * v[0] + y * v[2] - z * v[1], iy = w * v[1] + z * v[0] - x * v[2], iz = w * v[2] + x * v[1] - y * v[0], iw = -x * v[0] - y * v[1] - z * v[2];
  return [ix * w + iw * -x + iy * -z - iz * -y, iy * w + iw * -y + iz * -x - ix * -z, iz * w + iw * -z + ix * -y - iy * -x]; };
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], len = (a) => Math.hypot(...a);
function ptTri(p, a, b, c) {   // distance point-triangle (Ericson)
  const ab = sub(b, a), ac = sub(c, a), ap = sub(p, a);
  const d1 = dot(ab, ap), d2 = dot(ac, ap); if (d1 <= 0 && d2 <= 0) return len(ap);
  const bp = sub(p, b), d3 = dot(ab, bp), d4 = dot(ac, bp); if (d3 >= 0 && d4 <= d3) return len(bp);
  const vc = d1 * d4 - d3 * d2; if (vc <= 0 && d1 >= 0 && d3 <= 0) { const v = d1 / (d1 - d3); return len(sub(p, [a[0] + ab[0] * v, a[1] + ab[1] * v, a[2] + ab[2] * v])); }
  const cp = sub(p, c), d5 = dot(ab, cp), d6 = dot(ac, cp); if (d6 >= 0 && d5 <= d6) return len(cp);
  const vb = d5 * d2 - d1 * d6; if (vb <= 0 && d2 >= 0 && d6 <= 0) { const w = d2 / (d2 - d6); return len(sub(p, [a[0] + ac[0] * w, a[1] + ac[1] * w, a[2] + ac[2] * w])); }
  const va = d3 * d6 - d5 * d4; if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) { const w = (d4 - d3) / ((d4 - d3) + (d5 - d6)); return len(sub(p, [b[0] + (c[0] - b[0]) * w, b[1] + (c[1] - b[1]) * w, b[2] + (c[2] - b[2]) * w])); }
  const n = cross(ab, ac), nl = len(n); return nl > 1e-12 ? Math.abs(dot(ap, n)) / nl : Math.min(len(ap), len(bp), len(cp));
}
function worldTris(o) {   // the object's triangles in world space, with chess.js's vertex smear applied
  const T = tris[o.k], N = nrms[o.k], out = new Float64Array(T.length);
  const sl = o.smear ? len(o.smear) : 0;
  for (let i = 0; i < T.length; i += 3) {
    const v = qRot(o.q, [T[i] * o.sc[0], T[i + 1] * o.sc[1], T[i + 2] * o.sc[2]]);
    let w = [v[0] + o.pos[0], v[1] + o.pos[1], v[2] + o.pos[2]];
    if (sl > 1e-4) {
      const n = qRot(o.q, [N[i], N[i + 1], N[i + 2]]); const nl = len(n) || 1;
      const k = (n[0] * o.smear[0] + n[1] * o.smear[1] + n[2] * o.smear[2]) / nl / sl;
      if (k < 0) { const m = o.jag ? 0.5 + 0.5 * hashP(T[i], T[i + 1], T[i + 2]) : 1; w = [w[0] - o.smear[0] * -k * m, w[1] - o.smear[1] * -k * m, w[2] - o.smear[2] * -k * m]; }
    }
    out[i] = w[0]; out[i + 1] = w[1]; out[i + 2] = w[2];
  }
  return out;
}
function probe(T, p) {   // world point -> {d: min distance to surface, w: |winding number|}
  let d = 1e9, W = 0;
  for (let i = 0; i < T.length; i += 9) {
    const a = [T[i], T[i + 1], T[i + 2]], b = [T[i + 3], T[i + 4], T[i + 5]], c = [T[i + 6], T[i + 7], T[i + 8]];
    const dd = ptTri(p, a, b, c); if (dd === dd) d = Math.min(d, dd);
    const ra = sub(a, p), rb = sub(b, p), rc = sub(c, p), la = len(ra), lb = len(rb), lc = len(rc);
    const wa = 2 * Math.atan2(dot(ra, cross(rb, rc)), la * lb * lc + dot(ra, rb) * lc + dot(rb, rc) * la + dot(rc, ra) * lb); if (wa === wa) W += wa;
  }
  return { d, w: Math.abs(W / (4 * Math.PI)) };
}
const only = process.argv[2];
let bad = 0; const rows = [];
for (const s of shots) {
  if (s.scene !== 't2_chess' || (only && s.id !== only)) continue;
  const p = typeof s.p === 'function' ? s.p(s.t0, 0) : s.p;
  if ((p.mode || 'game') === 'dive') continue;
  const f0 = Math.ceil(s.t0 * 24 - 1e-6), f1 = Math.ceil(s.t1 * 24 - 1e-6) - 1;
  let worst = { d: 1e9 };
  for (let f = f0; f <= f1; f++) {
    let t = f / 24;
    if (p.twos) { const g0 = Math.ceil(s.t0 * 24 - 1e-6), g = Math.floor(t * 24 + 1e-6); t = (g0 + 2 * Math.floor((g - g0) / 2)) / 24 + 1e-4; }
    const st0 = boardState(S, t, { pos: [0, 5, 10], fwd: [0, 0, -1], right: [1, 0, 0], up: [0, 1, 0] });
    const c = cameraAt(S, t, p, st0);
    const fx = cameraFx(S, t, p); const sk = fx.shake * 0.12;
    const cp = [c.pos[0] + sk * (noise1(t * 37) - 0.5), c.pos[1] + sk * (noise1(t * 41 + 9) - 0.5), c.pos[2] + sk * (noise1(t * 43 + 17) - 0.5)];
    const st = boardState(S, t, camBasis(c));
    const battle = p.lights == null ? clamp((t - S.anchors.back + 0.05) / 0.12) * (1 - clamp((t - S.anchors.letgo) / 0.6)) : 0;   // as chess.js
    const objs = st.pieces.filter((o) => o.visible).map((o) => {
      const sp = Math.hypot(...o.vel); const hi = o.pos[1] > 1.2 && !o.flying;
      const lifted = battle <= 0 && !o.flying && st.moving && (st.moving.id === o.id || (st.moving.rook && st.moving.rook.id === o.id));
      const smear = sp > 2.5 && (p.smear ?? 1) > 0 && !lifted ? o.vel.map((x) => x * Math.min(0.03, (hi ? 0.4 : 0.75) / sp)) : null;
      return { k: o.type, pos: o.pos, q: o.q, sc: o.scale, id: o.id, smear, jag: !hi };
    });
    for (const L of st.links) objs.push({ k: 'L', pos: L.pos, q: L.q, sc: [1, 1, 1], id: 'link' + L.ply + '.' + L.k });
    for (const o of objs) {
      const rel = sub(cp, o.pos); if (len(rel) > 2.2 * Math.max(...o.sc) + (o.smear ? len(o.smear) : 0)) continue;
      const r = probe(worldTris(o), cp); const dw = r.w > 0.5 ? -r.d : r.d;   // negative = inside
      if (dw < worst.d) worst = { d: dw, f, t: f / 24, id: o.id, k: o.k };
      if (dw < 0.07) { bad++; rows.push(`  ${s.id} f${f} ${(f / 24).toFixed(3)} ${o.k}${typeof o.id === 'number' ? '#' + o.id : ' ' + o.id} ${dw < 0 ? 'INSIDE' : 'near'} d=${dw.toFixed(3)}`); }
    }
  }
  console.log(`${s.id.padEnd(6)} f${f0}-f${f1}  closest surface ${worst.d === 1e9 ? '> 2 squares' : worst.d.toFixed(3) + ' (' + worst.k + ' f' + worst.f + ')'}`);
}
console.log(rows.join('\n'));
console.log(bad ? `${bad} frame-object hits (lens inside or < 0.07 from a surface)` : 'OK: the lens is never inside or within 0.07 of a piece or link');
process.exitCode = bad ? 1 : 0;
