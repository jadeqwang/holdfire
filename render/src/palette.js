// HOLD FIRE palette (display-referred sRGB 0..1). Red is fire (weapons, targeting, alarms, burning worlds) and nothing else;
// gold is light (signal, contact, choice). See docs/take1/STYLE_BIBLE.md.
const hex = (h) => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];

export const P = {
  void: hex('#05070d'),      // abyss blue-black: the ground of every frame
  night: hex('#0b1220'),     // deep sea-night blue
  fog: hex('#1c2635'),       // fog, mid-shadow
  steel: hex('#5c6b80'),     // cool mid-tone
  cream: hex('#f3eee4'),     // the books' paper, used as type and as white light
  gold: hex('#f4b443'),      // SIGNAL GOLD: beacons, the count, held fire
  goldDeep: hex('#c8862a'),
  goldPale: hex('#ffe2a3'),
  bookGold: hex('#b8a88a'),  // the books' muted accent (small type, rules)
  ember: hex('#ff8a3d'),     // the Keeper's lining, warm halation
  red: hex('#ff2e1f'),       // FIRE: weapons, reticles, alarms
  redDeep: hex('#7a0e0a'),
  ice: hex('#d7ecff'),       // the Listener (AI): starlight
  cyan: hex('#6fd6ff'),
  luna: hex('#bff3cf'),      // the Other: luna-moth green
  lunaDeep: hex('#3f7f66'),
  violet: hex('#8e7cff'),
  phosphor: hex('#3bff9a'),  // P1 sonar/CRT green (1962)
  amberCRT: hex('#ffb000'),  // P3 amber CRT
};

export const css = (c, a = 1) => `rgba(${Math.round(c[0] * 255)},${Math.round(c[1] * 255)},${Math.round(c[2] * 255)},${a})`;
export const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
export const scale = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
