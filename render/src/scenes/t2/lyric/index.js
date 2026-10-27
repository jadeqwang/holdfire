// Take two, "lyric" group (docs/take2/LYRICS.md): the toolkit and treatments behind render/src/lyrics2.js, the in-world lyric
// layer. It draws on the type canvas from main.js's lyrics2 hook, not as a shot's scene; the one scene here only loads the
// group's fonts at boot (scene inits are awaited before the first frame).
import { loadLyricFonts } from './kit.js';

const t2_lyric_fonts = {
  async init() { await loadLyricFonts(); },
  draw() {},
};

export const SCENES = { t2_lyric_fonts };
