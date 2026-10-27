// Take two, "lyric" group (docs/take2/LYRICS.md): the toolkit and treatments behind render/src/lyrics2.js, the in-world lyric
// layer. It draws on the type canvas from main.js's lyrics2 hook, not as a shot's scene. The group's scenes: t2_lyric_fonts only
// loads the group's fonts at boot (scene inits are awaited before the first frame); t2_tablet is V113's clay tablet (the
// cuneiform pressed into it, tablet.js), a multi layer over the plate.
import { loadLyricFonts } from './kit.js';
import t2_tablet from './tablet.js';

const t2_lyric_fonts = {
  async init() { await loadLyricFonts(); },
  draw() {},
};

export const SCENES = { t2_lyric_fonts, t2_tablet };
