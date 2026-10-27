# Take two: the in-world lyrics

Jade's note on preview v2: the song goes by fast and carries a lot of words, so they should be readable on screen. This
overrides the plan's "subtitle or left out" rule. Every sung line, shout and whisper is on screen while it is sung, and it is
set into the world of the shot (the approach Rewind take two used: signs, corner-pinned planes, handwriting, terminals). The
reading rules still hold. Every word stays up at least 0.6 s, a line is never up for less time than 3 words/s needs, and each
line stays readable until the next one replaces it.

## How it works

- **Code.** `render/src/lyrics2.js` holds the plan, one entry per timing line, and the runtime. The toolkit and treatments are
  in `render/src/scenes/t2/lyric/`: `kit.js` (fonts, corner pin, layout, word timing, baked patterns) and `styles.js` (the
  treatments). The group is registered in `scenes/t2/index.js`; its only scene, `t2_lyric_fonts`, loads the fonts at boot.
- **Hook.** `render/src/main.js` has three lines marked `[lyrics2 hook]`: the import, `await lyrics2.init(ctx, shots)` after
  the timeline is built, and `lyrics2.draw(type, t, ctx)` right after the shot's own type.
- **Switch it off.** Use `?lyrics2=0` in the URL, or set `window.__lyrics2 = false` before rendering. The edit's own
  subtitles then come back, because the layer mutes the `sub` cues for its lines only while it is on.
- **The edit's words stay loud.** At init, any word that an edit cue already shows is left out of this layer. That covers the
  heroes (FIN / FOOT / HAND, OUT OF THE SEA, FLOOD, WE'RE AWAKE, CAN'T BE SURE, I'M COUNTING ON YOU, WE'RE ALIVE, HOLD YOUR
  FIRE, SHOW YOUR LIGHT, YOU WERE COUNTING TOO) and the numerals, matched by onset and text. The layer carries the rest of the
  line, quieter. If the director changes a hero, the layer follows automatically.
- **`LYRIC_LINES`** (exported) is the set of timing line numbers this layer carries. **timeline.js needs no change**:
  `init()` silences the `sub()` cues for those lines at runtime. If a static switch in the edit is ever wanted instead,
  change `sub` in `timeline.js` to start with
  `if (LYRIC_LINES.has(LN(sec, k).n)) return null;` (and import `LYRIC_LINES` from `./lyrics2.js`). Note that `?lyrics2=0`
  could then no longer bring the subtitles back.
- **Timing.** A line appears up to 0.22 s before its first word, but never back across a cut. Each word lights on its onset
  (unsung words wait at half strength or more in the line's own ink, so the whole line reads while it is up; polish 4). A line is held until 1.1 s after its last word, until the
  next line, or until the first cut into a shot its entry does not list, whichever comes first. If an edit hero carries the
  rest of the line, the layer hands over 0.4 s after that hero lands.
- **Placement.** Positions are design px (1920×1080). A line is placed either at a flat anchor (x, first baseline y or last
  baseline `yLast`, align, rot, mirror) or corner-pinned onto a surface (`quad`). It can differ per shot (`segs`), and a line
  can be drawn more than once with `copies` (the mirror). Faces and mouths are avoided. Most lines sit inside the 4:5 area
  (x 528–1392). The exceptions, where the surface is outside it, are the fish callout (V102), the golden-record legend (C102),
  the monitor bank (C108), the smoke (V201), the bare paper beside the characters (V202–V204), the split coin legend (P203)
  and the mirror's copies in DR02.
- **Cost.** 1.9 ms per frame on average at 1080p, 15 ms at most (SwiftShader, measured over every line;
  `window.__lyr2ms` holds the last frame's time).
- **Fonts** (OFL; licences in `render/assets/fonts/OFL-*.txt`): Anton, VT323, Reenie Beanie, IM Fell English, Instrument
  Serif, Big Shoulders Display, and the Latin of Ma Shan Zheng (subset to `MaShanZheng-latin-subset.ttf`). Archivo,
  Cormorant, Open Sans and IBM Plex Mono come from `type.js`.

## Treatment per section

| Section | Treatment (style) | Where it lives |
|---|---|---|
| Verse 1 | **blueprint**: drafting caps, white or cyanotype navy. Unsung words are dashed construction outlines; each word is inked left to right under a pen point; a running dimension line under the row grows and ticks at every word | in the sky beside Jade under OUT OF THE SEA; a callout over the lobe-finned fish; the full "fin into foot into hand, we were young" as the spec line beside the schematics and on the cave wall; in the sky over the mud-brick street; a label in the seed cross-section; the Okavango sky |
| Verse 1 (dust, clay) | **incise**: letters pressed into the surface (dark recess, lit lip), a reed wedge before each word on the tablet | corner-pinned onto the cart road in the dust (V112) and onto the clay tablet beside the tally (V113) |
| ISS, pre-chorus 1, Echo | **riso**: two inks off register (a screened light ink, a mottled key ink); each word prints in two frames | on the black under the ISS, the Klein-blue Voyager print, over Echo's clouds, under the tower (DR14) |
| Starlight | **light**: a thin serif in gold that ignites with a four-point flare. On the graph, words hang on nodes joined edge to edge | the night skies (V122, C101, C109, C210), the pulse flight, the pulsar diagram, "Counting on you!" over the graph and the Earth, the outro graph, "Show your light!" / "Hold your fire!" |
| Control rooms, CRTs | **crt**: VT323 phosphor typed character by character across the sung length, a block cursor, scanlines, sometimes a dark screen face | on teal-tips' window glass (P105), a shared readout across the split, the SETI CRT matrix, across C108's monitor bank, the studio split, the last room (DR16) |
| Verse 2, ink | **brush**: English in Ma Shan Zheng's brush Latin. A soaked blot for one frame, settling on the next, then dry-brush gaps | in the smoke over the cauldron, beside 硫黃 · 硝石, on the scroll beside the warning, under the weapons |
| Petrov | **terminal**: Plex Mono caps with a `>` prompt, amber phosphor, typed as sung, on a console readout panel. "ignored all previous instructions." is typed in green like a command | the bottom of the command-post frame, under 26 SEP 1983 |
| Near-miss list | **typewriter** on a strip of ticker tape (`tape`): red ribbon ink, uneven strikes | under the teletype paper |
| Coins, the tree, the record | **engrave**: Roman caps in gold, with a glint sweeping each word | the coin legend split either side of the grid (like an obverse legend), over the tree, beside the golden record, under the split records |
| Bridge, opening | **chalk**: Reenie Beanie written in chalk in the dark, with a soft smudge ground | the dark above the board and around the faces |
| Shouts at the board, bridge battle | **impact**: Anton with an ink outline and a hard orange shadow; words slam in with a tilt and shake | the lower third (the board stays clear) |
| Arkhipov | **poster**: Anton caps stamped on a black banner that wipes in, on the poster's diagonal | under the submarine and the officers (NO is the poster's own lettering) |
| Build | **terminal** in war-display red; then **osd**, the VCR's own lettering (white pixel caps, drop shadow, chroma fringes, ◀◀) over the rewind | above the globe; the rewind |
| Drop | **glass**: marker on the mirror glass in Klein ink on Jade's side and **mirrored** in teal on teal-tips' side. After the mirror is gone, ink on the white void | either side of the glass |
| Outro | **light** on the graph; **board** (an enamel plate under the safety board: "ONE… ONE… TWO… THREE…", "THE COUNT GOES HIGHER."); **whisper** (a light italic breathing in) | over the galaxy, under the counter, the night sky, the dawn sky, under the eye |

The cold open's whispered counts are carried by the edit's numerals, so the layer draws nothing there (no echoed 8). The
post-chorus counts over the graph and the lights are the edit's numerals too. The layer adds the shouted "Counting on
you!" and the counts over the chessboard, where the edit shows none.

## Checking it

- Stills of every line at mid-line, plus frames across cuts: `work/t2/lyr/final/` and its sheets
  `work/t2/lyr/sheet_lyrics_00.jpg` to `_07.jpg`. 1080p samples are in `work/t2/lyr/hd/`, and 12-frame motion strips in
  `work/t2/lyr/strip_0.jpg` to `strip_3.jpg` (clay tablet, CRT typing, impact slams, mirror glass).
- `window.__lyrics2Plan` lists each line's window (n, t0, t1, text) after boot.
- To retune a line, edit its entry in `PLAN` (`lyrics2.js`). Everything is data: style, x / y / yLast / align / maxW / br, quad,
  and per-shot `segs`.
