// Fonts the take-two history group adds (registered here, additively; not in type.js).
//   T2Brush: Yuji Boku (OFL, assets/fonts/OFL-yujiboku.txt), a heavy brush kaisho with the traditional forms the gunpowder warning
//            needs (黃 燒 燼, which Ma Shan Zheng lacks), subset to the 29 characters these scenes write (assets/fonts/YujiBoku-t2-subset.ttf):
//            硫黃 · 硝石, 有以硫黃、雄黃合硝石，并蜜燒之，焰起燒手面，及燼屋舍者。 and the title 真元妙道要略.
//   T2Num:   Ma Shan Zheng (OFL, assets/fonts/OFL-mashanzheng.txt), its brushed lining figures 0-9 only (MaShanZheng-t2-subset.ttf),
//            for the small brushed years 1132 · 1288 · 1453 · 1916 · 1945.
let loading = null;
export const BRUSH = 'T2Brush', NUM = 'T2Num';
export function loadT2HistoryFonts() {
  if (!loading) {
    loading = (async () => {
      const faces = [new FontFace(BRUSH, 'url(assets/fonts/YujiBoku-t2-subset.ttf)', {}), new FontFace(NUM, 'url(assets/fonts/MaShanZheng-t2-subset.ttf)', {})];
      await Promise.all(faces.map((f) => f.load()));
      faces.forEach((f) => document.fonts.add(f));
      return true;
    })();
  }
  return loading;
}
