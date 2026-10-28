// Take two, "fx" group: scene name -> module (docs/RENDERER.md, docs/take2/CONVENTIONS.md). Names start with t2_.
// Gold line art and light painted over plates (seed spiral, spiral trace, tower bursts, chain links), the mirror stage of the
// drop, the end card, and t2_first (the first layer of a chain that has its assets: a generated plate, else a stand-in).
import t2_first from './first.js';
import t2_seed_spiral from './seedspiral.js';
import t2_spiral_trace from './spiraltrace.js';
import t2_tower_bursts from './towerbursts.js';
import t2_chain_links from './chainlinks.js';
import t2_mirror from './mirror.js';
import t2_endcard from './endcard.js';
import t2_contact from './contact.js';
import t2_signal_link from './signallink.js';
import t2_rewind_console from './rewind.js';

export const SCENES = { t2_first, t2_seed_spiral, t2_spiral_trace, t2_tower_bursts, t2_chain_links, t2_mirror, t2_endcard, t2_contact, t2_signal_link, t2_rewind_console };
