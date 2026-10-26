// Blueprint subjects for t2_blueprint p.subject: named schematic drawings in the white-line style, as path lists.
// Each subject is authored about (0, 0) in design px at scale 1 and placed by p.pos ([960, 540]), p.scale (1), p.rot (radians).
// Paths carry a stage index; t2_blueprint gives every stage a draw-on window (on the snares by default).
// No labels: the plan allows numbers/dates only, and the edit adds those itself (as dim/callout paths in p.paths).
const D2R = Math.PI / 180;

// a long bone: shaft of width w between a and b, knobbed ends (closed smooth outline)
function bone(a, b, w = 22, knob = 1.5) {
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, d = [dx / L, dy / L], n = [-d[1], d[0]];
  const k = (w * knob) / 2, h = w / 2;
  const P = (o, s, t) => [o[0] + d[0] * s + n[0] * t, o[1] + d[1] * s + n[1] * t];
  return { type: 'poly', smooth: true, closed: true, pts: [P(a, -k * 0.7, 0), P(a, 0, k), P(a, k * 1.6, h), P(b, -k * 1.6, h), P(b, 0, k), P(b, k * 0.7, 0),
    P(b, 0, -k), P(b, -k * 1.6, -h), P(a, k * 1.6, -h), P(a, 0, -k)] };
}
// a small rounded block (carpal, radial)
function nub(c, rx, ry = rx, ang = 0) {
  const pts = []; for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; const x = Math.cos(a) * rx, y = Math.sin(a) * ry;
    pts.push([c[0] + x * Math.cos(ang) - y * Math.sin(ang), c[1] + x * Math.sin(ang) + y * Math.cos(ang)]); }
  return { type: 'poly', smooth: true, closed: true, pts };
}
// a digit: n phalanges from base along angle (degrees, 0 = right, -90 = up)
function digit(base, ang, lens, w = 11) {
  const out = []; let p = base; const a = ang * D2R;
  for (const l of lens) { const q = [p[0] + Math.cos(a) * l, p[1] + Math.sin(a) * l]; out.push(bone(p, q, w, 1.35)); p = [q[0] + Math.cos(a) * 5, q[1] + Math.sin(a) * 5]; }
  return out;
}
const st = (k, list) => list.map((x) => ({ ...x, stage: k }));
const lerp2 = (a, b, u) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];

// ---- the lobe fin (Tiktaalik-like pectoral fin): humerus / radius + ulna / wrist and rays
function finParts() {
  const hum = bone([-330, 30], [-110, -10], 30, 1.6);
  const rad = bone([-90, -34], [70, -86], 20), uln = bone([-88, 14], [86, -26], 22);
  const wrist = [nub([110, -102], 18, 14, -0.3), nub([118, -44], 20, 16, -0.2), nub([150, -76], 14, 12, -0.4),
    ...digit([140, -126], -40, [40, 30], 10), ...digit([170, -96], -20, [44, 32], 10), ...digit([172, -50], 0, [46, 34], 10), ...digit([150, -14], 22, [40, 28], 10)];
  const rays = []; for (let i = 0; i < 9; i++) { const a = (-70 + i * 14) * D2R; const r0 = 150, r1 = 290 + 30 * Math.sin(i * 1.7);
    rays.push({ type: 'line', a: [60 + Math.cos(a) * r0 * 0.7, -50 + Math.sin(a) * r0 * 0.7], b: [60 + Math.cos(a) * r1, -50 + Math.sin(a) * r1], w: 2 }); }
  const web = { type: 'poly', smooth: true, dash: [9, 7], pts: [[-340, 70], [-140, 60], [40, 40], [250, 60], [350, -60], [250, -260], [40, -200], [-140, -60], [-340, -10]] };
  return { hum, rad, uln, wrist, rays, web };
}
function finBones() { const f = finParts(); return [...st(0, [f.hum, { type: 'cross', c: [-110, -10], size: 12 }]), ...st(1, [f.rad, f.uln]), ...st(2, [...f.wrist, f.web])]; }
function finFull() {
  const f = finParts();
  return [...st(0, [f.web, f.hum]), ...st(1, [f.rad, f.uln, ...f.rays]), ...st(2, [...f.wrist,
    { type: 'dim', a: [-330, 110], b: [86, 110], off: 40 }, { type: 'circle', c: [-110, -10], r: 46, cross: true }, { type: 'ticks', a: [-420, 230], b: [420, 230], n: 24, len: 8, major: 4 }])];
}

// ---- an early tetrapod forelimb (Acanthostega: eight digits)
function foot() {
  const hum = bone([-330, -60], [-140, -10], 30, 1.6);
  const rad = bone([-120, -40], [10, -40], 20), uln = bone([-118, 14], [12, 26], 22);
  const carp = [nub([40, -36], 18, 15), nub([44, 22], 18, 15), nub([78, -8], 15, 13)];
  const digits = [];
  for (let i = 0; i < 8; i++) { const ang = -52 + i * 15; const base = [100 + Math.cos(ang * D2R) * 20, -6 + Math.sin(ang * D2R) * 34];
    digits.push(...digit(base, ang, [40 + 6 * Math.sin(i), 30, 22].slice(0, i === 0 || i === 7 ? 2 : 3), 10)); }
  const outline = { type: 'poly', smooth: true, dash: [9, 7], pts: [[-340, -20], [-120, 50], [60, 70], [200, 110], [270, 30], [260, -120], [180, -190], [60, -90], [-140, -70], [-340, -100]] };
  return [...st(0, [hum, rad, uln]), ...st(1, carp), ...st(2, [...digits, outline])];
}

// ---- a human hand, palm on, fingers up: radius/ulna ends, eight carpals, five metacarpals, phalanges
function hand() {
  const out = [bone([-36, 330], [-30, 210], 26, 1.5), bone([36, 330], [34, 214], 22, 1.5)];
  const carps = [[-40, 180], [-14, 186], [14, 186], [40, 182], [-34, 150], [-8, 154], [18, 152], [42, 148]].map((c) => nub(c, 13, 11));
  out.push(...carps.map((x) => ({ ...x, stage: 1 })));
  const fingers = [[-62, 140, -125, [70, 44, 34]], [-28, 132, -98, [92, 52, 32, 24]], [2, 130, -90, [98, 58, 36, 26]], [30, 132, -82, [92, 54, 34, 24]], [56, 138, -70, [80, 44, 28, 22]]];
  fingers.forEach(([x, y, a, lens], i) => out.push(...digit([x, y], a, lens, i === 0 ? 14 : 12).map((b) => ({ ...b, stage: 2 }))));
  return out.map((x) => ({ stage: 0, ...x }));
}

// ---- egg outline -> clay grain jar (a morph between two closed outlines)
function eggPts(n = 40) { const o = []; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 - Math.PI / 2; const y = Math.sin(a), x = Math.cos(a);
  o.push([x * 120 * (1 - 0.18 * y), y * 160]); } return o; }
function jarPts(n = 40) {
  // profile (half): mouth, neck, shoulder, belly, foot; mirrored, then resampled to n points by angle so the morph pairs up
  const prof = [[44, -200], [40, -170], [48, -150], [120, -110], [160, -30], [150, 60], [110, 140], [56, 186], [48, 200]];
  const full = [...prof.map(([x, y]) => [x, y]), ...prof.slice().reverse().map(([x, y]) => [-x, y])];
  const o = []; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 - Math.PI / 2;
    // nearest ray hit on the polygon from the centre
    let best = [0, 0], bd = 1e9; const dir = [Math.cos(a), Math.sin(a)];
    for (let k = 0; k < full.length; k++) { const p = full[k], q = full[(k + 1) % full.length];
      const ex = q[0] - p[0], ey = q[1] - p[1], den = dir[0] * ey - dir[1] * ex; if (Math.abs(den) < 1e-9) continue;
      const t = (p[0] * ey - p[1] * ex) / den, s = (p[0] * dir[1] - p[1] * dir[0]) / den;
      if (t > 0 && s >= 0 && s <= 1 && t < bd) { bd = t; best = [dir[0] * t, dir[1] * t]; } }
    o.push(best); }
  return o;
}
function eggToJar(u) {
  const e = eggPts(), j = jarPts();
  const pts = e.map((p, i) => lerp2(p, j[i], u));
  const out = [{ type: 'poly', closed: true, smooth: true, pts, stage: 0 }, { type: 'cross', c: [0, 0], size: 12, stage: 0 },
    { type: 'line', a: [-190, 0], b: [190, 0], dash: [6, 8], w: 2, stage: 0 }];
  if (u > 0.6) out.push({ type: 'arc', c: [0, -60], r: 150, a0: 200, a1: 340, dash: [6, 8], stage: 1 }, { type: 'line', a: [-150, 120], b: [150, 120], w: 2, stage: 1 });
  return out;
}

// ---- seed cross-section: ground, soil horizons, the seed at depth, the irrigation canal to the field
function seedSection() {
  return [
    ...st(0, [{ type: 'poly', pts: [[-460, -60], [120, -60], [170, -60]] }, { type: 'poly', pts: [[300, -60], [460, -60]] },
      { type: 'poly', pts: [[170, -60], [200, 40], [270, 40], [300, -60]] },
      { type: 'line', a: [-460, 40], b: [150, 40], dash: [10, 10], w: 2 }, { type: 'line', a: [-460, 150], b: [460, 150], dash: [10, 10], w: 2 }]),
    ...st(1, [nub([-200, 20], 34, 22, -0.25), { type: 'poly', smooth: true, pts: [[-214, 18], [-200, 6], [-186, 16], [-196, 28]] },
      { type: 'poly', smooth: true, pts: [[-226, 32], [-246, 60], [-240, 92]] }, { type: 'dim', a: [-280, -60], b: [-280, 20], off: -40 }]),
    ...st(2, [{ type: 'poly', smooth: true, pts: [[178, -30], [205, -36], [235, -28], [265, -36], [292, -30]] },
      { type: 'poly', pts: [[170, 70], [-160, 70]], dash: [14, 10] }, { type: 'poly', pts: [[-140, 60], [-160, 70], [-140, 80]] },
      { type: 'dim', a: [170, 70], b: [300, 70], off: 56 }]),
  ];
}

// ---- machines (side elevations), drawn fast: the flood of machines cuts on eighth notes
function wheel(c, r) { return [{ type: 'circle', c, r }, { type: 'circle', c, r: r * 0.2 }, { type: 'line', a: [c[0] - r, c[1]], b: [c[0] + r, c[1]], w: 2 }, { type: 'line', a: [c[0], c[1] - r], b: [c[0], c[1] + r], w: 2 }]; }
function locomotive() {
  return [...st(0, [{ type: 'poly', closed: true, pts: [[-300, -40], [150, -40], [190, -20], [190, 50], [-300, 50]] }, { type: 'rect', a: [-120, -120], b: [-60, -40] },
    { type: 'poly', closed: true, pts: [[150, -40], [150, -140], [130, -150], [190, -150], [170, -140], [170, -40]] }, { type: 'rect', a: [-400, -150], b: [-260, 50] },
    { type: 'poly', pts: [[190, 50], [260, 120], [150, 120]] }]),
  ...st(1, [...wheel([-200, 110], 60), ...wheel([-60, 110], 60), ...wheel([80, 110], 60), { type: 'line', a: [-200, 130], b: [80, 130] }, { type: 'line', a: [-440, 170], b: [300, 170], w: 2 }])];
}
function wrightFlyer() {
  const out = [{ type: 'line', a: [-420, -60], b: [420, -60] }, { type: 'line', a: [-420, 40], b: [420, 40] }];
  for (let i = -4; i <= 4; i++) out.push({ type: 'line', a: [i * 100, -60], b: [i * 100, 40], w: 2, stage: 1 });
  for (let i = -4; i < 4; i++) out.push({ type: 'line', a: [i * 100, -60], b: [(i + 1) * 100, 40], w: 2, dash: [5, 6], stage: 1 });
  out.push({ type: 'circle', c: [-120, -10], r: 70, dash: [8, 8], stage: 2 }, { type: 'circle', c: [120, -10], r: 70, dash: [8, 8], stage: 2 },
    { type: 'rect', a: [-40, 50], b: [40, 80], stage: 2 }, { type: 'line', a: [-180, 120], b: [180, 120], stage: 2 }, { type: 'line', a: [-140, 150], b: [140, 150], stage: 2 });
  return out.map((x) => ({ stage: 0, ...x }));
}
function jetAirliner() {
  return [...st(0, [{ type: 'poly', smooth: true, closed: true, pts: [[-440, 0], [-400, -36], [-300, -50], [300, -50], [380, -40], [440, -10], [430, 20], [300, 40], [-300, 40], [-410, 30]] }]),
    ...st(1, [{ type: 'poly', pts: [[-330, -50], [-410, -190], [-350, -190], [-250, -50]] }, { type: 'poly', pts: [[-360, -10], [-440, -40], [-410, -50]] },
      { type: 'poly', pts: [[-40, 20], [160, 120], [210, 120], [80, 20]] }, { type: 'rect', a: [40, 80], b: [150, 120] }]),
    ...st(2, [{ type: 'line', a: [330, -28], b: [380, -28], w: 2 }, { type: 'ticks', a: [-280, -20], b: [280, -20], n: 28, len: 6, major: 100 }, { type: 'dim', a: [-440, 60], b: [440, 60], off: 70 }])];
}
function saturnV() {
  const x = 60;
  return [...st(0, [{ type: 'rect', a: [-x, 120], b: [x, 400] }, { type: 'poly', pts: [[-x, 340], [-x - 40, 400], [-x, 400]] }, { type: 'poly', pts: [[x, 340], [x + 40, 400], [x, 400]] },
    { type: 'poly', pts: [[-40, 400], [-50, 440], [-20, 440], [-28, 400]] }, { type: 'poly', pts: [[28, 400], [20, 440], [50, 440], [40, 400]] }]),
  ...st(1, [{ type: 'rect', a: [-x, -60], b: [x, 120] }, { type: 'poly', closed: true, pts: [[-x, -60], [-44, -120], [44, -120], [x, -60]] }, { type: 'rect', a: [-44, -230], b: [44, -120] }]),
  ...st(2, [{ type: 'poly', closed: true, pts: [[-44, -230], [-30, -290], [30, -290], [44, -230]] }, { type: 'poly', closed: true, pts: [[-14, -290], [0, -330], [14, -290]] },
    { type: 'line', a: [0, -330], b: [0, -400] }, { type: 'dim', a: [x, 440], b: [x, -400], off: -110 }])];
}

export const SUBJECTS = {
  fin_bones: () => finBones(), fin: () => finFull(), foot: () => foot(), hand: () => hand(), egg_to_jar: (u) => eggToJar(u),
  egg: () => eggToJar(0), jar: () => eggToJar(1), seed_section: () => seedSection(),
  locomotive: () => locomotive(), wright_flyer: () => wrightFlyer(), jet_airliner: () => jetAirliner(), saturn_v: () => saturnV(),
};

// place a subject's paths (pos, scale, rot, flipX: mirrored left-right before the rotation) and give each a draw-on window.
// stageT: [song time per stage]; dur: per-stage draw time.
export function subjectPaths(name, time, { stageT, dur = 0.5, pos = [960, 540], scale = 1, rot = 0, flipX = false, morph } = {}) {
  const f = SUBJECTS[name]; if (!f) return [];
  const u = morph !== undefined ? morph : 0;
  const paths = f(u);
  scale *= ({ saturn_v: 0.82, hand: 1.1 })[name] || 1;
  const c = Math.cos(rot), s = Math.sin(rot);
  const F = flipX ? -1 : 1;
  const X = (p) => [pos[0] + scale * (c * F * p[0] - s * p[1]), pos[1] + scale * (s * F * p[0] + c * p[1])];
  const byStage = {};
  paths.forEach((P) => { (byStage[P.stage || 0] = byStage[P.stage || 0] || []).push(P); });
  const out = [];
  for (const [k, list] of Object.entries(byStage)) {
    const t0 = stageT[Math.min(Number(k), stageT.length - 1)] ?? stageT[0];
    list.forEach((P, j) => {
      const a = t0 + dur * 0.55 * (j / Math.max(1, list.length));
      const q = { ...P, t0: a, t1: a + dur * 0.45 };
      for (const key of ['a', 'b', 'c', 'at', 'to']) if (q[key]) q[key] = X(q[key]);
      if (q.pts) q.pts = q.pts.map(X);
      if (flipX) { if (q.off) q.off = -q.off; if (q.a0 !== undefined) q.a0 = 180 - q.a0; if (q.a1 !== undefined) { q.a1 = 180 - q.a1; [q.a0, q.a1] = [q.a1, q.a0]; } if (q.type === 'circle') q.dir = -(q.dir ?? 1); }
      if (q.r) q.r *= scale; if (q.off) q.off *= scale; if (q.size) q.size *= scale; if (q.len) q.len *= scale;
      if (q.type === 'arc' || q.type === 'circle') { if (q.a0 !== undefined) q.a0 += rot / D2R; if (q.a1 !== undefined) q.a1 += rot / D2R; }
      out.push(q);
    });
  }
  return out;
}
