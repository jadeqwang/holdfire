# HOLD FIRE — style bible

**House style: GOLDEN RECORD ("engraved light").** The film is drawn the way humanity wrote to the stars: the Pioneer
plaque (1972), the Voyager Golden Record's cover (1977) and the Arecibo message (1974), which opens by counting. Lines of
light, engraved on black, carrying only true information. It is the song's *message in a bottle* (Sagan's word for the
record) made into a picture language, and it reads as drawn, never as generated.

Every frame is drawn by JavaScript (WebGL + Canvas 2D in headless Chromium, `render/`). The Seedance and image-model
footage is only ever read, as guide maps: edges, tone, mattes, flow, landmarks. It never appears.

Research behind this: `docs/research/visual_refs.md` (direction A), `docs/research/poetry_notes.md` §6 (the books' own
visual language), `docs/research/pipeline_lessons.md`.

## 1. One material per intelligence

Before a word is sung, the viewer should know whose eyes we're behind.

| who | material | line behaviour | colour |
|---|---|---|---|
| **The Beacon Keeper** (human, Voice A) | **engraved light**: banknote-style intaglio lines that follow the form, width carries tone, a clean contour; warm film halation and sea fog | parallel, flow-aligned, alive (drawn on twos) | signal gold `#f4b443` → hot gold `#ffe2a3`; skin highlights cream |
| **The Listener** (AI, Voice B) | **a constellation**: points sampled from her edges and tone, joined by straight links (nearest neighbours, a sparse graph); the same stuff as the contact graph | discrete, precise, on ones | ice `#d7ecff` / cyan `#6fd6ff`; **turns gold when she chooses** (verse 2, "We're alive") |
| **The Other** (alien) | **bioluminescent stipple**: soft dots, front-lit only, eye-spots glowing on its wings | soft, breathing | luna green `#bff3cf`, violet `#8e7cff`, eye-spot gold |
| **History** (alchemists, Petrov, Arkhipov, the near-misses) | **printed matter**: archival paper (the books' cream `#f3eee4`), black ink halftone, red ink | static, mechanical, misregistered | paper, ink, one red |
| **Fire** (reticles, weapons, alarms, burning worlds) | the same engraved line, in red | hard, geometric | red `#ff2e1f` only |

**Colour script.** Red is fire and nothing else; gold is light. The film is the slow conversion of red to gold. The drop is the
first time gold outnumbers red on screen. The last frame rhymes with the first: the same pale dot, the reticle now a ring of light.

## 2. Palette (`render/src/palette.js`)

| token | hex | use |
|---|---|---|
| void | `#05070d` | the ground of every frame (never pure black) |
| night | `#0b1220` | sea-night, deep sky |
| fog | `#1c2635` | fog, mid-shadow |
| steel | `#5c6b80` | cool mid-tone, diagrams |
| cream | `#f3eee4` | type; the books' paper; white light |
| gold | `#f4b443` | SIGNAL: beacons, the count, held fire |
| goldPale | `#ffe2a3` | bloom cores, hot type |
| bookGold | `#b8a88a` | the books' muted accent: labels, rules, provenance |
| ember | `#ff8a3d` | the Keeper's lining, halation |
| red | `#ff2e1f` | FIRE |
| ice / cyan | `#d7ecff` / `#6fd6ff` | the Listener |
| luna / violet | `#bff3cf` / `#8e7cff` | the Other |
| phosphor | `#3bff9a` | 1962 sonar (P1 phosphor) |
| amberCRT | `#ffb000` | the station's terminal (P3 phosphor) |

No teal-orange grade, no neon cyberpunk, no rotating HUD clutter, no Matrix green.

## 3. Type (`render/src/type.js`)

The type system gives each voice its own face, so the viewer can tell who is singing with the sound off.

| voice | face | use |
|---|---|---|
| the Keeper (human) | **Cormorant Garamond** (the *Spaces Left Blank* books' face), italic for the hinge word | verse lines, whispered intro/outro, poem excerpts |
| the Listener (AI) | **IBM Plex Mono**, streamed in token-sized chunks with a cursor; strike-through edits | verse 2, the system prompt, terminals, HUD annotations |
| the crowd / the count | **Archivo** Expanded Black (wdth 125, wght 900) | count numerals, chorus hero cards |
| the Other | its own script: circular logograms (`render/src/glyphs.js`), numbers as rings of dots | HUDs, its count; English gloss beneath in tracked caps |
| labels | **Open Sans** tracked caps (the books' breadcrumbs) | "EXCERPT FROM", captions, credits |
| title | **Michroma** (wide; the 2001/NASA lineage) or Archivo Expanded | HOLD FIRE |

**Scale** (fraction of the frame's short side): count numerals 45–70 % (one per shout, may bleed off frame); chorus hero
lines 9–14 % (≤ 4 words per card, held ≥ 1 beat); verse lines 3.5–5 %; annotations 1.7–2.2 %; AI terminal 2.6–3.4 %.
At most 3 words per second on average; no card shorter than 12 frames.

**Placement.** Big type lives in negative space that the shot was composed for (the first-frame stills are generated with that
space empty). Never over eyes or mouth. Type may sit *behind* the figure (matte occlusion ≤ 30 % of the glyphs), may light the
figure on its side, or sit in the direction the figure is looking. Hero type is big at hooks (intro, chorus, counts, the AI's
refusal, the drop); verses are subtitle-scale unless the line is a hook.

**Provenance cards.** Secondary lines from Jade's poems appear small, in the books' layout: `EXCERPT FROM` (tracked caps,
bookGold), the title in Cormorant italic, the line in Cormorant, with the poem's own indents. Found poems are credited as such.

## 4. Rendering rules

* **Engraving.** Lines follow the plate's structure-tensor flow; line width carries tone; line spacing ≥ 6 px and width
  ≥ 2 px at 1080p so the image survives X's compression; a thin halo of bloom on every line. The line phase is anchored to the
  subject (advected by the plate's motion, reset on cuts) so lines don't swim across a moving face.
* **Twos.** Characters are drawn on twos (12 drawings a second) with gentle line boil; camera moves, type, light and particles
  run on ones. Impacts can drop to ones for a beat.
* **Faces.** The face gets the densest engraving and a clean contour; eyes always readable. Hands are drawn from landmarks
  where the plate's hands are unreliable (the hand is the film's motif).
* **Optics** (`render/src/engine.js`, in order): bloom → warm halation (human shots) → anamorphic streak on point lights
  (gold for beacons; cool for stars) → tone map → split-tone grade → grain (1.5 px cells, re-drawn on twos; minimal) →
  vignette. Chromatic aberration only on impact frames.
* **Stars** have no twinkle (it's space); the deep sky is baked once per shot.
* **No raw footage, ever.** If a guide is missing, the shot falls back to a procedural plate, never to the video.

## 5. Motion and cutting

* Intro: one shot; six numeral events. Verse 1: one cut per two bars, or one continuous morph (fin → foot → hand).
* Pre-chorus: the cut rate rises (bar → half bar → beat).
* Chorus: cuts on beats, but the hero line "I'm counting on you" holds for two bars.
* Post-chorus: one cut per shout, each carrying its numeral.
* Verse 2: one cut per bar; archival inserts on downbeats; "ignored all previous instructions" holds two bars (screenshot).
* Bridge: one held shot of 20 s or more, near-static. In an over-cut feed, stillness is the pattern interrupt.
* Build: the cut rate doubles every two bars. Drop: cuts on the 808s and numerals, the 610-world graph held wide for 4 bars.
* Outro: one slow pull-out; the end card.

## 6. Screenshot moments (designed as posters)

1. Frame 0: the red reticle on the pale dot, "THE UNIVERSE IS A DARK FOREST. EVERY CIVILIZATION IS AN ARMED HUNTER."
2. The title: the reticle opened into a ring of light; HOLD FIRE.
3. "FIRST STRIKE AUTHORIZED" struck through by the Listener: *ignored all previous instructions.*
4. A 10 × 10 grid of coins, all heads, each stamped with a near-miss.
5. **NO**, full frame, in silence (Arkhipov).
6. The 610 worlds as a phyllotaxis disk, its 34 spiral arms lit (linking each world *n* to *n* + 34 draws exactly 34 arms).
7. The Keeper and the Other side by side, hands raised, in the manner of the Pioneer plaque.
8. The last frame: the ring of light around the pale dot.

## 7. Image-model and Seedance look (the base layer, never shown)

The base footage exists to give the renderer good data: photoreal, cinematic, low-key but readable. Strong rim light, faces
clearly lit, clean silhouettes against simple backgrounds, composition with empty negative space where the lyrics will go.
Characters are canon from `media/design/` sheets; every shot starts from an approved first-frame still. No text or lettering in
any generated image (all text is drawn by the renderer).
