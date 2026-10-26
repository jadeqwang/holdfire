// Fonts the take-two history group adds (registered here, additively; not in type.js).
//   T2Brush: LXGW WenKai TC Bold (OFL, assets/fonts/OFL-lxgwwenkaitc.txt), a traditional-Chinese kai face with the Taiwan/HK
//            standard forms (黃 with 廿, 燒 and 燼 with their full components), subset to the characters these scenes write
//            (assets/fonts/LXGWWenKaiTC-Bold-t2-subset.ttf): 硫黃 · 硝石 and 有以硫黃、雄黃合硝石，并蜜燒之，焰起燒手面，及燼屋舍者。
//            (Not Yuji Boku: a Japanese face draws 黃 as 黄. Not Ma Shan Zheng: it has no 黃 燒 燼.)
//   T2Num:   Ma Shan Zheng (OFL, assets/fonts/OFL-mashanzheng.txt), subset to its brushed figures 0-9 (the years 1132 · 1288 ·
//            1453 · 1916 · 1945) and 真元妙道 for the seal (forms identical in traditional and simplified; LXGW TC draws 真 as 眞).
//            assets/fonts/MaShanZheng-t2-subset.ttf
let loading = null;
export const BRUSH = 'T2Brush', NUM = 'T2Num', SEAL = 'T2Num';
export function loadT2HistoryFonts() {
  if (!loading) {
    loading = (async () => {
      const faces = [new FontFace(BRUSH, 'url(assets/fonts/LXGWWenKaiTC-Bold-t2-subset.ttf)', {}), new FontFace(NUM, 'url(assets/fonts/MaShanZheng-t2-subset.ttf)', {})];
      await Promise.all(faces.map((f) => f.load()));
      faces.forEach((f) => document.fonts.add(f));
      return true;
    })();
  }
  return loading;
}
