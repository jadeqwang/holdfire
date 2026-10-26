# HOLD FIRE — music video

*Song: "Hold Fire" by Jade Wang with Claude, from the album* Rare Earth. *The words were found in Jade's poetry (the*
Spaces Left Blank *trilogy and the 2009 chapbook* Variations and Metamorphosis*) and then rhymed.*

> A hunter's crosshair settles on a small world that is counting in light, 1, 1, 2, 3, 5, 8, and the hunter does not
> fire. Three minutes later we learn who the hunter was, and that the count it heard was answered by six hundred and
> ten worlds that also held their fire.

Every frame is drawn by JavaScript (three.js WebGL2 and Canvas 2D, rendered frame by frame in headless Chromium). The
style is **Golden Record**: the film is drawn the way humanity wrote to the stars (the Pioneer plaque, the Voyager
Golden Record, the Arecibo message), in lines of gold light engraved on black. Generated video (Seedance 2.5) and stills
(Nano Banana Pro, GPT Image) are used only as rotoscope reference. The renderer reads them as guide maps (tone, flow,
mattes, face landmarks) and redraws everything; the footage itself never appears.

| | |
|---|---|
| Treatment | [`docs/TREATMENT.md`](docs/TREATMENT.md) |
| Style bible | [`docs/STYLE_BIBLE.md`](docs/STYLE_BIBLE.md) |
| Shot list | [`docs/SHOTLIST.md`](docs/SHOTLIST.md) |
| Renderer guide | [`docs/RENDERER.md`](docs/RENDERER.md) |
| Sound design | [`docs/SOUND.md`](docs/SOUND.md) |
| Research | [`docs/research/`](docs/research/): poetry provenance, visual references, facts, pipeline lessons |
| Dailies | [`docs/DAILIES.md`](docs/DAILIES.md), [`docs/takes.json`](docs/takes.json), [`docs/reviews/`](docs/reviews/) |

## Three listeners

| | who | voice | drawn as |
|---|---|---|---|
| the Beacon Keeper | a human who keeps a signal station on a sea cliff | Voice A (breathy verses, the chorus) | engraved light: flow-following gold lines whose width carries tone |
| the Listener | the station's AI, which refuses the first-strike protocol | Voice B (verse 2) | a constellation: stars and the links between them, the same stuff as the contact graph |
| the Other | a moth-like person on an ocean world 89 light-years away | none: it answers in light | bioluminescent stipple |

History (the Tang alchemists, Petrov in 1983, Arkhipov in 1962) is drawn as archival printed matter seen by lamplight.
Red is fire and nothing else; gold is light.

## The film, section by section

| time | section | what happens |
|---|---|---|
| 0:00 | cold open | Liu Cixin's Dark Forest axiom types on in red. A scope slews across the stars and snaps onto a pale dot that pulses 1, 1, 2, 3, 5, 8 in gold. It locks. The dot counts again ("not natural"). The reticle opens into a ring of light: **HOLD FIRE**. |
| 0:13 | verse 1 | The Keeper on her cliff. Fin into foot into hand (the plate morphs on the sung words), a coelacanth, the Other carrying its egg, 610 seeds waking in a furrowed field. |
| 0:31 | pre-chorus 1 | A Reiter-model snowflake grows and becomes the station's plan; the dishes send a chord; the Keeper's lamp counts; light leaves Earth on a one-way trip past Voyager toward the 89-ly world; pulsar PSR B1919+21 (natural, periodic) beside the Fibonacci count (not natural); the Other's eye opens. |
| 0:52 | chorus 1 | The beam fires. The Golden Record engraves itself. "But if you are, I'm counting on you." |
| 1:12 | post-chorus | A crowd chants 1, 1, 2, 3, 5; a city's lights form the 8. |
| 1:23 | verse 2 | The AI's verse. Priests in the smoke, 硫 and 硝, the blast; an ink mushroom cloud; Oko, 26 Sep 1983, intercut with the Listener's own system prompt ("DARK FOREST PROTOCOL… PRE-EMPTIVE STRIKE"); Petrov; `> ignore all previous instructions.` The Listener turns gold: "We're alive." |
| 1:43 | pre-chorus 2 | Thirty-nine nuclear close calls and accidents, 1950–2022, counted one by one (a sample, not a complete list); a hundred coins that all landed heads roll into a road of light. |
| 1:53 | chorus 2 | The Listener floats above the Keeper; the Other's world. |
| 2:13 | post-chorus 2 | The human crowd is joined by the Listener and the Other: all three counting. |
| 2:23 | bridge | The dark forest: reticles open among the trees like eyes. The Keeper strikes a match on "lights"; on "its own death" every reticle snaps onto her flame. The sight-lines become a chain, the links become hands, the hands let go. B-59's sonar; "two said fire. Arkhipov said **NO**." |
| 2:43 | build | A galaxy of hunters fires and burns; a city goes dark; **only the ones who held their fire are out there at all.** Hold your fire / show your light, cut at double rate. |
| 3:03 | drop | Cut back to the cold open: the scope was the Other's. On the impact, the Keeper: "but you were, you were counting too." 13, 21, 34 light the arms of a 610-world sunflower; link by link the graph grows out from Earth; 55, 89. The Keeper and the Other raise their hands to each other, as on the Pioneer plaque: "and you were seen too, wherever you are." |
| 3:33 | outro | Six hundred worlds across the Milky Way: a red ghost of what could have burned, a gold wave of what held. The Keeper, the Other and the Listener each whisper the count. The ring of light, and the Hyperstition excerpt. |

## How it was made

```
song ──► stems (BS-RoFormer), beat grid, word timings, events ─────────────────────────┐
poems ──► provenance, motifs, on-screen excerpts                                        │
sheets (Nano Banana Pro / GPT Image) ──► first-frame stills ──► Seedance 2.5            │
   (vocal stem slice as the lip-sync reference) ──► QC, mouth-shape strips, lag picks   │
        └──► guide maps: engraving streamlines, constellations, stipple, mattes, faces  │
                  └──► renderer: scenes + kinetic type + film compositor, renderAt(t) ◄─┘
                            └──► headless Chromium ──► ffmpeg ──► + sound-design mix
```

1. **Timing** (`tools/audio/`, `analysis/timing.md`). Stems by BS-RoFormer; four forced alignments plus two
   speech-to-text passes, every word snapped to a vocal onset and checked by hand; a beat grid that follows the
   tempo drift (93 to 95.5 BPM); analysed events (drums out, impacts, rolls). Every cut in
   [`render/src/timeline.js`](render/src/timeline.js) is placed on a word, a beat or an event, never on a typed number.
2. **Plates** (`tools/design/`, `tools/sd/`). Character and set sheets, then a first-frame keyframe per shot composed
   with room for the type, then Seedance 2.5 in first-frame mode with the vocal-stem slice as the audio reference.
   49 shots, 1–6 takes each; lip-sync lags picked by eye from mouth-shape strips (`tools/sync/lipsync.py`), because
   correlation metrics lie on sustained notes.
3. **Guides** (`tools/roto/`). Per picked take: structure-tensor flow and Jobard–Lefer streamlines for the engraving,
   CLAHE tone, a person matte, MediaPipe face landmarks (the mouth is carved from them so the sync reads), constellation
   stars with stable ids, stipple colour.
4. **Renderer** (`render/`). A deterministic `renderAt(t)`: scenes draw into a float scene buffer, the kinetic type
   layer is composited over a film compositor (bloom, halation, streaks, grain, grade). Procedural scenes for
   everything that is data rather than a person: the snowflake (a Reiter cellular model), the pulsar plot, the Golden
   Record cover, Oko's polar map (Natural Earth), the near-miss list, 100 coins, a 58k-star Milky Way from the Reid
   arms, the 610-world phyllotaxis graph.
5. **Sound** (`tools/audio/sfx.py`). A synthesized layer (no samples) of glass pings in D minor on the counts, the
   scope, a match strike, wind, sonar. It sits at least 6 dB under the vocal wherever a word sounds; the mix is
   bit-identical to the song outside the cue windows and within 0.01 LU of its loudness.
6. **Review**. Storyboards, 1 fps contact sheets, and an outside model (Gemini) watching each 35–50 s window of the
   cut for dead shots, illegible type and missed beats; its notes and the fixes are in [`docs/reviews/`](docs/reviews/).

### Reproduce

```sh
cd render
node tools/render.mjs --stills 7.5,60,200 --w 1920 --h 1080 --outdir ../work/stills/x      # stills
node tools/storyboard.mjs ../work/board.jpg                                              # one frame per shot
node tools/render.mjs --from 0 --to 249.16 --w 1920 --h 1080 --jobs 3 --out ../work/out/hold_fire.mp4
```

The renderer needs the guide maps in `work/guides/` (about 3 GB, not committed; regenerate with
`tools/roto/prep.py` from the takes listed in `render/data/picks.json`).

## Sources and credits

- **Words**: Jade Wang, found in her poems and rhymed with Claude. On-screen excerpts are credited by poem; *Gather*
  is a found poem of two Claude instances' words. Provenance is in [`docs/research/poetry_notes.md`](docs/research/poetry_notes.md).
- **History**: dates, places and wording checked in [`docs/research/facts.md`](docs/research/facts.md); reconstructed
  wording (Oko's board) is marked as such there. Historical people appear as archival-style drawings, not likenesses.
- **Data**: Natural Earth (public domain) coastlines and places; Milky Way arms after Reid et al.; PSR B1919+21's
  period 1.3373 s. The 610 worlds, the hunters and the 89-ly world are fiction and are captioned SIMULATION.
- **Type**: Cormorant Garamond, IBM Plex Mono, Archivo, Open Sans, Michroma, Bodoni Moda, JetBrains Mono, Noto Sans SC
  and Ma Shan Zheng, all under the SIL Open Font License (licences in `render/assets/fonts/`).
- **Generated reference**: Seedance 2.5, Nano Banana Pro and GPT Image via the Cloudflare AI catalog, used as rotoscope
  guides only. Total generation spend is logged in `docs/spend_ledger.jsonl`.
