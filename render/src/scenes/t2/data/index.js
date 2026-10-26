// Take two, "data" group: scene name -> module (docs/RENDERER.md, docs/take2/CONVENTIONS.md). Names start with t2_.
import nearmiss from './nearmiss.js';
import { coins, cointree } from './coins.js';
import counter from './counter.js';
import crtmatrix from './crtmatrix.js';
import petrov from './petrov.js';

export const SCENES = { t2_nearmiss: nearmiss, t2_coins: coins, t2_cointree: cointree, t2_counter: counter, t2_crt_matrix: crtmatrix, t2_petrov_screen: petrov };
