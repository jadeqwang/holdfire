// Cuneiform for V113's clay tablet (0:25.4-27.3, "...and the mud"; docs/take2/LYRICS.md, "The clay tablet"). No imports: node loads
// this module too (tools/t2/cuneiform_card.py checks every sign against its Unicode name and renders a test card).
//
// The tablet counts the Fibonacci numbers 1 1 2 3 5 8 13 21 34 55 89 in Old Babylonian sexagesimal place-value numerals: within
// a place, tens are Winkelhaken (U) and units are vertical wedges (DISH); places are separated by a gap (no zero sign was
// needed here), so 89 = 1;29 = DISH | U U + NINE DISH. The edge carries a real line of the Ea-nasir complaint tablet.
// Font: Noto Sans Cuneiform (SIL OFL 1.1), subset to these signs: assets/fonts/NotoSansCuneiform-t2-subset.ttf.

// units 1-9 (diš): the single wedge DISH, MIN (2), then the numeric signs THREE DISH ... NINE DISH
export const UNITS = [null, 0x12079, 0x1222B, 0x12408, 0x12409, 0x1240A, 0x1240B, 0x1240C, 0x1240D, 0x1240E];
// tens 10-50 (u): U, U U, U U U, FOUR U, FIVE U
export const TENS = [null, 0x1230B, 0x12399, 0x1230D, 0x1240F, 0x12410];

export const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89];

// n -> places (most significant first), each place a list of signs (tens sign, then units sign), as code points
export function cuneiformNumber(n) {
  const digits = [];
  for (let v = n; v > 0; v = Math.floor(v / 60)) digits.unshift(v % 60);
  return digits.map((d) => {
    const signs = [];
    if (Math.floor(d / 10)) signs.push(TENS[Math.floor(d / 10)]);
    if (d % 10) signs.push(UNITS[d % 10]);
    return signs;
  });
}

// UET 5, 81 (CDLI P414985), obverse line 3, the letter's sender: "um-ma na-an-ni-ma", "thus (says) Nanni".
// Each sign checked in the ORACC sign list (osl.asl: value -> sign -> Unicode). Line 1 ("a-na e2-a-na-s,i-ir") is left out:
// the CDLI transliteration's unindexed s,i is ZE2 in the ORACC list but ZI in the older convention, and without a photo of the
// tablet the sign cannot be confirmed.
export const NANNI = {
  src: 'UET 5, 81 (CDLI P414985) obv. 3',
  translit: 'um-ma na-an-ni-ma',
  signs: [['um', 0x1231D], ['ma', 0x12220], ['na', 0x1223E], ['an', 0x1202D], ['ni', 0x1224C], ['ma', 0x12220]],
};

export const cps = (list) => String.fromCodePoint(...list);
