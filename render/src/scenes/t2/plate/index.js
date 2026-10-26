// Take two, "plate" group: scene name -> module (docs/RENDERER.md, docs/take2/CONVENTIONS.md "Plate toolkit"). Names start with t2_.
import t2_plate from './plate.js';
import t2_still from './still.js';
import t2_split from './split.js';
import t2_vhs from './vhs.js';
import t2_impact from './impact.js';
import t2_blueprint from './blueprint.js';

export const SCENES = { t2_plate, t2_still, t2_split, t2_vhs, t2_impact, t2_blueprint };
export { PLATE_LOOK } from './lib.js';
export { applyStyle, stylize, vhsPass, STYLES, INKS, RISO_SETS } from './styles.js';
export { smashZoom, impactPulse } from './impact.js';
export { drawBlueprint } from './blueprint.js';
