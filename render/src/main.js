// HOLD FIRE renderer entry point. Every frame is a pure function of song time t: window.renderAt(t).
// URL params: ?w=1920&h=1080 (render size), ?t=12.3 (render one frame), ?play=1 (live preview with audio), ?debug=1 (HUD)
import { Engine } from './engine.js';
import { AudioMap } from './audio.js';
import { TypeLayer, loadFonts } from './type.js';
import { buildTimeline, buildGlobalPost } from './timeline.js';
import { SCENES } from './scenes/index.js';

const qs = new URLSearchParams(location.search);
const W = Number(qs.get('w') || 1920), H = Number(qs.get('h') || 1080);
const canvas = document.getElementById('view');
canvas.width = W; canvas.height = H;
canvas.style.width = qs.get('fit') ? '100vw' : `${W}px`;

const state = {};

async function boot() {
  const [timing, feats] = await Promise.all([
    fetch('data/timing.json').then((r) => r.json()),
    fetch('data/audio.json').then((r) => r.json()).catch(() => null),
  ]);
  await loadFonts();
  const engine = new Engine(canvas, W, H);
  const audio = new AudioMap(timing, feats);
  const type = new TypeLayer(engine, audio);
  const shots = buildTimeline(audio);
  const ctx = { engine, audio, type, W, H, S: engine.S, state: {} };
  for (const s of Object.values(SCENES)) if (s.init) await s.init(ctx);
  Object.assign(state, { engine, audio, type, shots, ctx, globalPost: buildGlobalPost(audio) });
  window.__shots = shots.map((s) => ({ id: s.id, t0: s.t0, t1: s.t1, scene: s.scene }));
}

function shotAt(t) {
  const { shots } = state;
  for (let i = shots.length - 1; i >= 0; i--) if (t >= shots[i].t0 && t < shots[i].t1) return shots[i];
  return shots[shots.length - 1];
}

let busy = Promise.resolve();
async function renderAt(t) {
  const run = async () => {
    const { engine, type, ctx } = state;
    const shot = shotAt(t);
    const lt = t - shot.t0;
    const T0 = performance.now();
    const scene = SCENES[shot.scene];
    if (!scene) throw new Error('no scene ' + shot.scene);
    ctx.t = t; ctx.lt = lt; ctx.shot = shot;
    let p = typeof shot.p === 'function' ? shot.p(t, lt, ctx) : (shot.p || {});
    if (window.__pOverride) p = { ...p, ...window.__pOverride };   // look-dev (tools/lookdev.mjs)
    ctx.p = p;
    // scenes may need assets: prepare() resolves them, so cache timing never changes pixels
    if (scene.prepare) await scene.prepare(ctx, shot, t, lt, p);
    await scene.draw(ctx, shot, t, lt, p);
    const T1 = performance.now();
    type.begin();
    if (scene.type) scene.type(type, t, lt, shot, ctx);
    if (shot.type) shot.type(type, t, lt, shot, ctx);
    const look = typeof shot.look === 'function' ? shot.look(t, lt, ctx) : (shot.look || {});
    const g = state.globalPost ? state.globalPost(t, shot) : {};
    const post = { ...look };
    post.zoom = (look.zoom ?? 1) * (g.zoom ?? 1);
    post.ca = (look.ca ?? 0) + (g.ca ?? 0);
    post.flash = look.flash ? look.flash : (g.flash ?? 0);
    post.invert = Math.max(look.invert ?? 0, g.invert ?? 0);
    post.shakeX = (look.shakeX ?? 0) + (g.shakeX ?? 0); post.shakeY = (look.shakeY ?? 0) + (g.shakeY ?? 0);
    // grain re-drawn on twos, seeded by frame pair (deterministic)
    post.grainSeed = Math.floor(t * 12 + 1e-4);
    if (shot.post) Object.assign(post, shot.post(t, lt, ctx, post));
    if (window.__postOverride) Object.assign(post, window.__postOverride);
    const T2 = performance.now();
    engine.composite(post, t);
    engine.renderer.getContext().finish();
    window.__prof = { draw: T1 - T0, type: T2 - T1, comp: performance.now() - T2 };
    const hud = document.getElementById('hud');
    if (hud && qs.get('debug')) hud.textContent = `${t.toFixed(3)}s  ${shot.id}  ${ctx.audio.where(t)}`;
  };
  busy = busy.then(run, run);
  return busy;
}

window.renderAt = renderAt;
window.__ready = boot().then(async () => {
  if (qs.get('t')) await renderAt(Number(qs.get('t')));
  if (qs.get('play')) {
    const el = new Audio('audio/hold_fire.mp3');
    document.body.addEventListener('click', () => el.play(), { once: true });
    const loop = async () => { await renderAt(el.currentTime || 0); requestAnimationFrame(loop); };
    loop();
  }
  return true;
}).catch((e) => { console.error(e); window.__error = String(e && e.stack || e); throw e; });
