// Cuneiform for V113's clay tablet (0:25.4-27.3, "...and the mud"; docs/take2/LYRICS.md, "The clay tablet"). No imports: node loads
// this module too (tools/t2/cuneiform_card.py checks every sign against its Unicode name and renders a test card).
//
// The tablet counts the Fibonacci numbers 1 1 2 3 5 8 13 21 34 55 89 in Old Babylonian sexagesimal place-value numerals: within
// a place, tens are Winkelhaken (U) and units are vertical wedges (DISH); places are separated by a gap (no zero sign was
// needed here), so 89 = 1;29 = DISH | U U U + LAL + DISH (30 minus 1). The edge carries two real lines of the Ea-nasir complaint
// tablet.
// Font: Noto Sans Cuneiform (SIL OFL 1.1), subset to these signs: assets/fonts/NotoSansCuneiform-t2-subset.ttf.

// units 1-9 (diš): the single wedge DISH, MIN (2), then the numeric signs THREE DISH ... NINE DISH
export const UNITS = [null, 0x12079, 0x1222B, 0x12408, 0x12409, 0x1240A, 0x1240B, 0x1240C, 0x1240D, 0x1240E];
// tens 10-50 (u): U, U U, U U U, FOUR U, FIVE U
export const TENS = [null, 0x1230B, 0x12399, 0x1230D, 0x1240F, 0x12410];

export const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89];

// LAL, "minus": a 9 in the units is written the scribes' way, the next ten LAL one (B. R. Foster, 29 Oct: "the scribes usually wrote
// 9 as 10 minus 1 ... minus is written with the sign LAL between 10 and 1 and the 1 is tilted slightly to the left"), so 29 = 30 LAL 1
export const LAL = 0x121F2;
export const DISH = 0x12079;

// n -> places (most significant first), each place a list of signs (tens sign, then units sign), as code points; a units 9 is
// (tens + 1) LAL DISH, its DISH drawn tilted (the renderer's job: the code point is plain DISH)
export function cuneiformNumber(n) {
  const digits = [];
  for (let v = n; v > 0; v = Math.floor(v / 60)) digits.unshift(v % 60);
  return digits.map((d) => {
    const signs = [];
    const t = Math.floor(d / 10), u = d % 10;
    if (u === 9) return [TENS[t + 1], LAL, DISH];
    if (t) signs.push(TENS[t]);
    if (u) signs.push(UNITS[u]);
    return signs;
  });
}

// UET 5, 81 (CDLI P414985), the Ea-nasir complaint tablet. Obverse line 1, the addressee: "a-na e2-a-na-s,i-ir", "to Ea-nasir";
// line 3, the sender: "um-ma na-an-ni-ma", "thus (says) Nanni" (line 2, "qi2-bi2-ma", "speak!", is left out). Each sign checked in the
// ORACC sign list (osl.asl: value -> sign -> Unicode). The s,i of Ea-nas,ir is ZE2 (ORACC's numbering; the older convention calls
// it ZI): Benjamin R. Foster (Yale), 29 Oct, in reply to Jade: "the s. you are looking for in ea-nasir is in fact the sign you
// have as ze2". He also read line 3 as "Thus says Nanni".
export const EA_NASIR = {
  src: 'UET 5, 81 (CDLI P414985) obv. 1',
  translit: 'a-na e2-a-na-s,i-ir',
  signs: [['a', 0x12000], ['na', 0x1223E], ['e2', 0x1208D], ['a', 0x12000], ['na', 0x1223E], ['s,i', 0x12362], ['ir', 0x12155]],
};
export const NANNI = {
  src: 'UET 5, 81 (CDLI P414985) obv. 3',
  translit: 'um-ma na-an-ni-ma',
  signs: [['um', 0x1231D], ['ma', 0x12220], ['na', 0x1223E], ['an', 0x1202D], ['ni', 0x1224C], ['ma', 0x12220]],
};

export const cps = (list) => String.fromCodePoint(...list);
