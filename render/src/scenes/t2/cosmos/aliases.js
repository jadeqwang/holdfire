// Names the edit used while it was being wired (render/src/timeline.js), mapped onto this group's scenes so either works:
//   t2_graph {mode: 'war' | 'relight' | 'finale' | 'flicker', bright}  -> t2_war (graph view) / t2_graph_outro
//   t2_pulse_ride {ly}                                                  -> t2_pulse
// and t2_graph_grow's {mode: 'eight'} (-> t2_graph_flash) and {mode: 'first_line'} are handled in graph_grow.js.
import war from './war.js';
import graph_outro from './graph_outro.js';
import pulse from './pulse.js';

const pick = (p) => {
  const m = p.mode || 'finale';
  if (m === 'war') return [war, { ...p, view: 'graph' }];
  if (m === 'relight' && !p.bright) return [war, { ...p, rewind: true, view: 'graph' }];
  if (m === 'relight') return [graph_outro, { ...p, reveal: false, wave: [p.t0 ?? 178.0, (p.t0 ?? 178.0) + 1.2] }];
  return [graph_outro, p];
};
export const t2_graph = {
  draw(ctx, shot, t, lt, p) { const [sc, q] = pick(p); return sc.draw(ctx, shot, t, lt, q); },
};
export const t2_pulse_ride = { draw(ctx, shot, t, lt, p) { return pulse.draw(ctx, shot, t, lt, p); } };
