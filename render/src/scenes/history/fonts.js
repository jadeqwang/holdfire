// Fonts the history group adds (registered here, not in type.js). Ma Shan Zheng (OFL; assets/fonts/OFL-mashanzheng.txt), a
// brush kaishu, subset to the ten characters the gunpowder page writes: 长生不老 硫 硝 火药 炼丹.
let loading = null;
export const BRUSH = 'MaShanZhengHF';
export function loadHistoryFonts() {
  if (!loading) {
    loading = (async () => {
      const f = new FontFace(BRUSH, 'url(assets/fonts/MaShanZheng-history-subset.ttf)', {});
      await f.load();
      document.fonts.add(f);
      return true;
    })();
  }
  return loading;
}
