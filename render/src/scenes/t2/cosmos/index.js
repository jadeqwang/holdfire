// Take two, "cosmos" group: scene name -> module (docs/RENDERER.md, docs/take2/CONVENTIONS.md). Names start with t2_.
// Pure light on black: the contact graph over the Milky Way (gold links, pale-blue Earth), Earth's night side, Echo
// (fiction), the war and its rewind. Shared code: gfx.js (GPU points/lines), mw.js + core.js (the galaxy), web.js (the
// contact graph), earth.js (the globe), common.js (times, palette, VHS smear).
import earth_night from './earth_night.js';
import graph_outro from './graph_outro.js';
import graph_flash from './graph_flash.js';
export const SCENES = { t2_earth_night: earth_night, t2_graph_outro: graph_outro, t2_graph_flash: graph_flash };
