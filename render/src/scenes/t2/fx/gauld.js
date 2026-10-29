// t2_gauld: the post-chorus 2 escalation as Tom Gauld's cartoon (adversary plan part two F, option B, Jade 29 Oct): two identical
// framed pictures hung side by side on cream paper, Jade's on the left and teal-tips' on the right, each with a caption plaque. The
// pictures are the same thing; only the plaques tell them apart. Colour = whose thing (the plaque under Jade's picture is orange,
// under teal-tips' teal), the words = who is captioning (OUR / THEIR), as in fx/labels.js. Three beats on the shouts:
//   1. the dish fields, Jade captioning: OUR RADAR (orange) / THEIR TARGETING (teal);
//   2. the matched posters (fx/racepost.js), teal-tips captioning: THEIR PROPAGANDA (orange) / OUR RESOLVE (teal);
//   3. both hands beside the guarded switch, on "Counting on you": OUR DETERRENT under each (the same word, from both sides).
// The pictures move on twos (plate frames); a frame is hung with a small drop and swing on its shout. Drawn in 2D, display-referred.
// p: {beats: [{t0, t1, frame: [w, h] (picture px), L: pic, R: pic, caps: [{lines, side, t0} x2]}], y (picture centre, 440),
//      xs ([540, 1380]: the two pictures' centres), capH (plaque cap height, 46)}
//   pic: {plate: 'work/plates/C101', in (s), crop: [cx, cy, h] (plate px)} | {img: url, crop, flipX, filter} | {poster: 'jade'|'teal'},
//        t0 (hung at; default the beat's t0)
import { clamp, easeOutCubic, hash1 } from '../../../util.js';
import { loadTex, pad5 } from '../plate/lib.js';
import { posterCanvas } from './racepost.js';
import { drawTag, LABEL_COL } from './labels.js';

const PAPER = '#ece3cf', INK = '#161412';
let paper = null;
function paperCanvas() {   // cream stock with a faint fibre and a soft falloff to the corners (static: printed paper does not boil)
  if (paper) return paper;
  paper = document.createElement('canvas'); paper.width = 1920; paper.height = 1080;
  const g = paper.getContext('2d');
  g.fillStyle = PAPER; g.fillRect(0, 0, 1920, 1080);
  for (let i = 0; i < 9000; i++) {
    const x = hash1(i * 1.37) * 1920, y = hash1(i * 2.91 + 7) * 1080, l = 3 + 9 * hash1(i * 0.53), a = hash1(i * 4.1) * Math.PI;
    g.strokeStyle = hash1(i * 3.3) > 0.5 ? 'rgba(120,100,70,0.06)' : 'rgba(255,255,245,0.10)'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
  const v = g.createRadialGradient(960, 520, 300, 960, 540, 1150);
  v.addColorStop(0, 'rgba(90,70,40,0)'); v.addColorStop(1, 'rgba(90,70,40,0.22)');
  g.fillStyle = v; g.fillRect(0, 0, 1920, 1080);
  return paper;
}

const picURL = (pic, tq, b) => {
  if (!pic.plate) return pic.img;
  const k = Math.max(0, Math.round(((pic.in || 0) + Math.max(0, tq - (pic.t0 ?? b.t0))) * 24));
  return `${pic.plate}/f_${pad5(Math.min(k, (pic.n ?? 144) - 1))}.jpg`;
};
const beatAt = (p, tq) => (p.beats || []).find((b) => tq >= b.t0 - 1e-4 && tq < b.t1);

// one framed picture centred at (x, y), w x h inside a black moulding, with its plaque below
function hang(c, im, pic, x, y, w, h, u) {
  const drop = (1 - easeOutCubic(clamp(u / 0.18))) * 26, sw = Math.sin(clamp(u / 0.5) * Math.PI * 2.5) * (1 - clamp(u / 0.5)) * 0.02;
  const M = 16;
  c.save(); c.translate(x, y - drop); c.rotate(sw);
  c.fillStyle = 'rgba(40,28,12,0.28)'; c.fillRect(-w / 2 - M + 10, -h / 2 - M + 14, w + 2 * M, h + 2 * M);   // its shadow on the paper
  c.fillStyle = INK; c.fillRect(-w / 2 - M, -h / 2 - M, w + 2 * M, h + 2 * M);
  c.save(); c.beginPath(); c.rect(-w / 2, -h / 2, w, h); c.clip();
  if (pic.poster) c.drawImage(posterCanvas(pic.poster), -w / 2, -h / 2, w, h);
  else if (im) {
    const [cx, cy, ch] = pic.crop || [im.width / 2, im.height / 2, im.height], cw = ch * w / h;
    if (pic.filter) c.filter = pic.filter;
    if (pic.flipX) { c.scale(-1, 1); }
    c.drawImage(im, pic.flipX ? im.width - cx - cw / 2 : cx - cw / 2, cy - ch / 2, cw, ch, -w / 2, -h / 2, w, h);
    c.filter = 'none';
  }
  c.restore();
  c.strokeStyle = 'rgba(255,255,255,0.10)'; c.lineWidth = 2; c.strokeRect(-w / 2 - M + 3, -h / 2 - M + 3, w + 2 * M - 6, h + 2 * M - 6);   // the moulding's highlight
  c.restore();
}

export default {
  async prepare(ctx, shot, t, lt, p) {
    const tq = Math.floor(t * 12 + 1e-3) / 12, b = beatAt(p, tq);
    p._img = {};
    if (!b) return;
    for (const s of ['L', 'R']) { const pic = b[s]; if (pic.poster) continue; p._img[s] = (await loadTex(picURL(pic, tq, b))).image; }
  },
  draw(ctx, shot, t, lt, p) {
    const e = ctx.engine;
    const tq = Math.floor(t * 12 + 1e-3) / 12;   // on twos
    const c = e.c2dBegin();
    c.drawImage(paperCanvas(), 0, 0);
    const b = beatAt(p, tq);
    if (b) {
      const [w, h] = b.frame, y = b.y ?? p.y ?? 440, xs = p.xs || [540, 1380];
      ['L', 'R'].forEach((s, i) => {
        const pic = b[s], h0 = pic.t0 ?? b.t0;
        if (tq < h0 - 1e-4) return;
        hang(c, p._img?.[s], pic, xs[i], y, w, h, tq - h0);
      });
      for (const cap of b.caps || []) {
        if (tq < cap.t0 - 1e-4) continue;
        const u = clamp((tq - cap.t0) / 0.1), pop = 1 + 0.12 * Math.sin(Math.PI * u) * (u < 1 ? 1 : 0);
        c.save(); c.translate(xs[cap.side === 'jade' ? 0 : 1], y + h / 2 + 16 + (p.capGap ?? 70)); c.scale(pop, pop);
        drawTag(c, cap.lines, p.capH ?? 46, LABEL_COL[cap.side], u);
        c.restore();
      }
    }
    e.blit2d('replace', p.gain ?? 1);
  },
};
