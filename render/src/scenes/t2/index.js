// Take two scene groups. Each group owns its own directory and index.js; scene names start with "t2_".
import { SCENES as PLATE } from './plate/index.js';
import { SCENES as COSMOS } from './cosmos/index.js';
import { SCENES as CHESS } from './chess/index.js';
import { SCENES as DATA } from './data/index.js';
import { SCENES as HISTORY } from './history/index.js';
import { SCENES as FX } from './fx/index.js';
import { SCENES as LYRIC } from './lyric/index.js';

export const SCENES_T2 = { ...PLATE, ...COSMOS, ...CHESS, ...DATA, ...HISTORY, ...FX, ...LYRIC };
