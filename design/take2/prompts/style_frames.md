# Take two: era style frames (prompt drafts)

Drafts only; nothing here has been sent. Model: `google/nano-banana-pro`, 2K, 16:9 (about $0.13 a call). One take of every frame and set is about $2.10; budget three takes each (about $6.50). Before sending, copy each prompt into its own `design/take2/prompts/<name>.txt` (CONVENTIONS § Files).

**How a prompt is assembled.** Each prompt is its scene text plus the blocks it names, appended word for word in the order given. Word counts include the blocks. The jacket's sleeve patch and RARE EARTH back are repaired in post (`tools/plates/fix_patch.py`), so the blanket text guard is safe here.

**Rules for every frame.** The two Jades stay flat cel-shaded anime; only the world takes the era style. Faces stay inside the centred 4:5 area (x 528–1392). No "cinematic", "epic" or "anamorphic" (pipeline_lessons §1.2). Sets are environment plates with no characters, so they get no character block (§1.2.5). `TEAL_SHEET` = `design/take2/teal_tips_sheet.jpg`: every frame that uses it waits until the sheet exists.

**Blocks**

- `JADE`: Jade stays flat cel-shaded anime with crisp black lineart, unlike the world around her: long straight black hair, centre-parted curtain bangs, pale-blue dot catchlights, orange-foam 1977 headphones, cropped white jacket with orange bands and a pale-blue left-chest dot, navy cargo trousers with orange straps.
- `TEAL`: Teal-tips Jade stays flat cel-shaded anime with crisp black lineart, unlike the world around her: Jade's face family, long straight black hair ending in teal tips, the same cropped white jacket with orange bands and pale-blue left-chest dot, orange-foam headphones, navy cargo trousers.
- `TEAL+` (after `JADE`): Teal-tips Jade: the same face family, outfit and drawing, hair ending in teal tips.
- `GUARD`: No text, letters, numbers, logos or signage, and no labels copied from the reference sheets. No flags, emblems or national insignia. Historical figures are anonymous, never likenesses. 16:9.

## Era frames

### 1. Cold open spirals (0:02–0:07): macro photography
**Prompt** (+ `GUARD`, 95 words): Macro nature photograph, true colour: a single romanesco floret seen from directly above, its spiral centre exactly at the centre of the frame, the surrounding florets spiralling out to the edges and falling into soft focus. Pure black beyond the head, one soft key light from the upper left, shallow depth of field, fine beads of dew. No people and no drawn lines: this is a photograph.
**Refs:** none. Later spiral cuts (artichoke, sunflower, aloe) attach this frame so the centre and light match.
**Guards:** `GUARD`; no drawn spirals or golden rectangles. Jade is absent; her 0:00 eye is a cel-shaded close-up from the DOT sheet's eye detail, not a photograph.
**Palette:** black #050505, romanesco #7FA34A / #C9D97A, gold numerals #D4A84B.
**JS layer:** giant gold numerals, the real five-row trace on the aloe only, then the red flash and VHS rewind, so keep the frame free of overlays.

### 2. Human lights (0:08–0:13): night photography
**Prompt** (+ `GUARD`, 86 words): Night photograph through an aircraft window: a city street grid far below glows sodium orange on black, lines of streetlights converging toward the centre of the frame, the curved window rim soft and dark at the borders, light film grain, no reflections in the glass. No people. Quiet and still, a single source of warmth in the dark.
**Refs:** none. Earth's night side from orbit is NASA imagery, not generated.
**Guards:** `GUARD`; no aircraft markings or brand names. Jade is absent until the pull-back into her catchlight (control-room set A).
**Palette:** black #07060A, night navy #0C1424, sodium #FF8A2A / #FFB45C.
**JS layer:** whisper-cut numerals and the light gathering into one point; leave the centre dark enough for a gold 3.

### 3. Verse 1 (0:13–0:31): painted plate + white blueprint
**Prompt** (+ `JADE` + `GUARD`, 136 words): A painted plate in sepia and cyanotype blue, like a matte painting for a science documentary: dawn over a mud-brick city wall above a dusty plain, a solid wooden cart wheel in a mud rut at the lower right, soft atmospheric depth, visible brushwork. Jade walks side-on, left to right, just left of centre, mid-stride. Plenty of plain sky and ground around the wheel.
**Refs:** `refs/dot_character_sheet.jpg`.
**Guards:** `GUARD`; no lines, arrows, grids or dimension marks.
**Palette:** sepia #704214 / #A67B4F, parchment #E8D9BC, cyanotype #1F4E79 / #2B6CB0, blueprint white #F4F7FA.
**JS layer:** white blueprint linework (dimension lines, callouts, the wheel's spokes) that draws on with the snare, as in the Enterprise titles; the empty sky and ground are its room.

### 4. Okavango flood (0:30–0:31): gouache over documentary
**Prompt** (+ `JADE` + `GUARD`, 128 words): A nature-documentary frame of the Okavango Delta painted over in opaque matte gouache: the seasonal flood spreading across dry golden grassland in silver channels, water lilies opening, reeds, a distant line of palms, soft morning light, brush strokes over a photographic composition. Jade wades shin-deep just right of centre, three-quarter back view, looking across the water.
**Refs:** `refs/dot_character_sheet.jpg`.
**Guards:** `GUARD`; no vehicles, no other people.
**Palette:** greens #2F5233 / #4E7D3A / #8DB255, silver water #9FB2B8 / #C9D3D6, dry grass #C8A96A, lily #F2EFE6.
**JS layer:** the advancing flood front, the blueprint irrigation channel carried over from the seeds shot, and FLOOD in big type, so keep the upper left calm.

### 5. Space and signals (0:32–0:40): signal print
**Prompt** (+ `JADE` + `GUARD`, 133 words): Risograph signal print on warm paper: night on a dry hillside, a Klein-blue sky over a beacon-orange horizon glow, a single bright pale-blue point crossing the stars. Halftone dots, paper grain and slight two-colour misregistration on the sky and land only. Jade stands at centre in three-quarter view, face up toward the point, wind lifting her hair, in clean flat colour.
**Refs:** `refs/dot_character_sheet.jpg`, `refs/style_board_signal_print.jpg`.
**Guards:** `GUARD`; no halftone or grain on Jade.
**Palette:** Klein blue #1F2BD1, beacon orange #FF5A1F, pale blue #9CCBFF, ink #0B0B14, paper #F3EFE6.
**JS layer:** the ISS track and its snowflake arrays, animated riso misregistration, and the Voyager and Golden Record shots (goldenrecord.js); the open sky is theirs.

### 6. Echo (0:38–0:43, 3:22): fluo pink and mint
**Prompt** (+ `GUARD`, 94 words): Risograph signal print in fluo pink, mint and ink on warm paper: a tall slender white signal tower rising from a sea of violet-pink clouds at dusk, topped by a ring of mint lights; a planetary ring arcs across a magenta sky, a coral sun sits low at the left. Halftone clouds, paper grain, slight misregistration. The tower stands exactly on the centre line. No people.
**Refs:** `refs/world_echo_sheet.jpg` (panel 04), `refs/style_board_signal_print.jpg`.
**Guards:** `GUARD`. No Jade: Echo is only ever seen from afar.
**Palette:** fluo pink #FF48B0, mint #3FE0C5, violet #4B2E83, coral #FF7A59, ink #0B0B14, paper #F3EFE6.
**JS layer:** the ring firing 1, 1, 2, 3, 5 on eighth notes and the pulse ride to 217 LY; leave the ring's lamps unlit.

### 7. Gunpowder (1:22–1:32): Chinese ink wash
**Prompt** (+ `TEAL` + `GUARD`, 130 words): A Chinese ink-wash painting on rice paper: a misty mountain grotto with pines on the cliff, four Daoist alchemists in fine-line robes around a bronze tripod cauldron, smoke curling up, sparse expressive brushwork. Teal-tips Jade stands among them at centre, singing, the only cel-shaded figure in the painting. A tall strip of empty paper runs down the right edge.
**Refs:** `TEAL_SHEET`.
**Guards:** `GUARD`; no calligraphy, characters or seals; the alchemists are anonymous.
**Palette:** ink #111111, grey wash #8A8680, rice paper #EFE6D2, cinnabar #C8341E.
**JS layer:** brushed 硫黃 · 硝石, the warning written down the empty strip, the red seal and ink splatter, then the weapons morph; the strip is the scroll.

### 8. Petrov (1:32–1:42): Russian realist oil
**Prompt** (+ `TEAL` + `GUARD`, 133 words): A Russian realist oil painting in the academic manner, visible impasto: a dark command post at night in 1983, one anonymous duty officer in a plain uniform seated at a long console, a telephone by his hand, his face lit only by a huge wall screen glowing dim red. Umber shadow fills the room. Teal-tips Jade stands half in shadow behind him.
**Refs:** `TEAL_SHEET`. Also make one take without her, for the shots where he is alone.
**Guards:** `GUARD`; the screen is an empty glowing panel with no map or tracks; no badges or shoulder boards; the officer is not a likeness of Petrov.
**Palette:** umber #3B2A1E / #6B4A2E, shadow #120C0A, CRT red #E0301E, warm skin #B07A55.
**JS layer:** the CRT map, the five missile tracks and their ghosts, СТАРТ, and the struck-through protocol; the empty screen is their canvas.

### 9. Near-miss list and coins (1:43–1:53): teletype, newsprint, gold
**Prompt** (+ `TEAL` + `GUARD`, 132 words): Monochrome newsprint photograph, coarse grey halftone: a long ribbon of blank teletype paper feeds up out of a 1960s teletype machine and curls across a dark desk under one lamp. A heavy engraved gold coin lies heads up on the paper, with a fine guilloche border and an empty centre. Teal-tips Jade sits right of centre, three-quarter view, reading the paper.
**Refs:** `TEAL_SHEET`.
**Guards:** `GUARD`; the paper and coin stay blank; no portraits or emblems on the coin.
**Palette:** newsprint #D8D4CC / #A9A59C, ink #1A1A1A, gold #8A6A12 / #C9A227 / #F5D77A.
**JS layer:** nearmiss.js types years and lines on the ribbon, the running total, then coins.js and the branching tree; the coin is their texture reference.

### 10. Chess (2:19–2:38): anime battle
**Prompt** (+ `JADE` + `TEAL+` + `GUARD`, 138 words): Full-colour anime battle key frame: a low camera at board height across a chessboard in a pitch-dark room, the board lit from above, hard rim light, eyes glinting in the dark around them. Jade sits on the left, playing White; teal-tips Jade sits on the right, playing Black, leaning in, hands hovering.
**Refs:** `refs/dot_character_sheet.jpg`, `TEAL_SHEET`.
**Guards:** `GUARD`; no speed lines or motion blur; the board top stays unobstructed.
**Palette:** room #0E0F1A, light squares #E9E2D0, dark squares #3A3A44, jacket white #F5F5F2, orange #FF5A1F, teal #2FB5A8, impact yellow #FFE14D.
**JS layer:** the board and pieces from the PGN, speed lines, impact frames, smash zooms and the chain of captured pieces; the model's board is only a placeholder.

### 11. Chess into Arkhipov (2:37–2:44): Suprematist, poster, halftone
**Prompt** (+ `GUARD`, 89 words): A Soviet constructivist poster printed in coarse newsprint halftone, red, black and cream only: the cramped, hot interior of a submarine, two officers in flat red silhouette with faces in shadow, one pointing toward a dark torpedo hatch. A black square and a red diagonal wedge anchor the composition, and a third man's open hand rises in the foreground between them.
**Refs:** none.
**Guards:** `GUARD`; no stars, hammer and sickle or poster lettering; nobody resembles Arkhipov or Savitsky. No Jade: the poster is the world alone.
**Palette:** red #D3202A, black #111111, cream #F1E6CC, drained grey #8C8C8C.
**JS layer:** the board's squares assembling into the composition, the depth charges as black dots, NO in poster lettering and the red draining to grey; leave the top third for the dots.

### 12. First strike and rewind (2:43–2:55)
Procedural: war.js with a VHS rewind pass. No style frame.

### 13. Mirror (3:03–3:22): white void, two palettes
**Prompt** (+ `JADE` + `TEAL+` + `GUARD`, 138 words): A seamless white void; an infinitely tall pane of glass divides the frame exactly at centre. Left of it the air carries faint Klein-blue and orange risograph grain; to the right, cool teal and silver haze. Jade stands left and teal-tips Jade right, in mirror-image poses, palms meeting on the glass.
**Refs:** `refs/dot_character_sheet.jpg`, `TEAL_SHEET`, `refs/style_board_signal_print.jpg`.
**Guards:** `GUARD`; no ripples and no reflections of anything but the two of them.
**Palette:** void #FAFAF7; left: Klein #1F2BD1, orange #FF5A1F, pale blue #9CCBFF; right: teal #2FB5A8, silver #C0C7CC, ice #DDE7EA.
**JS layer:** ripple rings turning into the phyllotaxis disk, the chain of hands and YOU WERE COUNTING TOO; the glass line stays clean for them.

### 14. Contact graph and outro (3:33–4:07)
Procedural: pure light on black (the Rare Earth finale). No style frame.

## Recurring sets (plates, no people)

**A. Jade's control room.** (+ `GUARD`, 103 words): Premium anime background art, Makoto Shinkai night light, clean line, flat graphic colour: a small, warm radio-observatory control room at 3 a.m. An amber desk-lamp pool, three monitors with blue waterfall spectrograms and one bright vertical line, a rack receiver with small green lights, a mug, a coiled headphone cable. A large window on the right looks onto white radio dishes under the Milky Way. An empty chair at centre faces the screens. No people.
Refs: the NIGHT SHIFT panel cropped from `refs/world_earth_sheet.jpg` (send it alone, so the mug's and sticky notes' lettering do not leak). Palette: night #0B1230, amber #F2A64A, spectrogram blue #1F4FD8, desk umber #3A2A20.

**B. Teal-tips Jade's control room.** Flip set A left to right in code first (free and exact), then send an edit with the flipped plate as the only ref. (+ `GUARD`, 78 words): Relight this control room. Replace the warm desk lamp with cool overhead fluorescent tubes, a slightly green-white light, colder shadows and a blue-grey cast on the desk. Keep the layout, monitors, spectrograms, window and dishes exactly as they are. Add no flag, crest, poster or lettering that names a country.
Palette: fluorescent #DDEFEA, teal #2FB5A8, steel #5E6B73, night #08141A.

**C. Dish field at night.** (+ `GUARD`, 86 words): Premium anime background art, clean line, flat graphic colour: forty-two white 6-metre offset-Gregorian radio dishes in a loose cluster on a dry-grass valley floor at night, all tilted toward one patch of the Milky Way; pine ridges and a snow-streaked volcanic cone far off. A bare patch of ground at centre foreground, where Jade will stand. No people.
Refs: `design/sources/ata_hat_creek_gpt_image_2_5.jpg` from the Rare Earth repo. Make a second plate with the dishes at scattered angles (the 0:51.82 swing runs between the two) and a dawn variant for 3:53. Palette: night #0A1433, Milky Way #C9B8E8, dish white #EEF1F5, grass #8C7A55.

**D. White-void mirror set.** (+ `GUARD`, 78 words): A seamless white void with soft, even light and no horizon, a faint cool floor shadow fading to nothing. An infinitely tall pane of glass stands exactly on the centre line, seen nearly edge-on, with a thin silver-grey edge highlight and a barely visible reflection band. No people, nothing else.
Refs: none. Palette: void #FAFAF7, edge #C0C7CC, shadow #E6EBEE.
