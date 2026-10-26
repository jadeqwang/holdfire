// Scene registry: timeline shots name a scene; each scene is {init?, prepare?, draw, type?} (docs/RENDERER.md).
import sky from './sky.js';
import coldopen from './coldopen.js';
import engraved from './engraved.js';
import constellation from './constellation.js';
import stipple from './stipple.js';
import placeholder from './placeholder.js';
import multi from './multi.js';
import endcard from './endcard.js';
import { SCENES as SPACE } from './space/index.js';
import { SCENES as SIGNAL } from './signal/index.js';
import { SCENES as HISTORY } from './history/index.js';
import { SCENES_T2 } from './t2/index.js';

export const SCENES = { sky, coldopen, engraved, constellation, stipple, placeholder, multi, endcard, ...SPACE, ...SIGNAL, ...HISTORY, ...SCENES_T2 };
