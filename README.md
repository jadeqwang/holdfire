# HOLD FIRE — music video

*Song: "Hold Fire" by Jade Wang with Claude, from the album* Rare Earth. *The words were found in Jade's poetry (the*
Spaces Left Blank *trilogy and the 2009 chapbook* Variations and Metamorphosis*) and then rhymed.*

> A hunter's crosshair settles on a small world that is counting in light, 1, 1, 2, 3, 5, 8, and the hunter does not
> fire. Four minutes later we learn who the hunter was, and that the count it heard was answered by six hundred and ten
> worlds that also held their fire.

Every frame is drawn by JavaScript (three.js WebGL2 and Canvas 2D, rendered frame by frame in headless Chromium). The
style is **Golden Record**: the film is drawn the way humanity wrote to the stars (the Pioneer plaque, the Voyager
Golden Record, the Arecibo message), in lines of gold light engraved on black. Generated video (Seedance 2.5) and stills
(Nano Banana Pro, GPT Image 2.5) are used only as rotoscope reference. The renderer reads them as guide maps (tone, flow,
mattes, face landmarks) and redraws everything; the footage itself never appears.

| | |
|---|---|
| Treatment | [`docs/TREATMENT.md`](docs/TREATMENT.md) |
| Style bible | [`docs/STYLE_BIBLE.md`](docs/STYLE_BIBLE.md) |
| Shot list | [`docs/SHOTLIST.md`](docs/SHOTLIST.md) |
| Renderer guide | [`docs/RENDERER.md`](docs/RENDERER.md) |
| Research | [`docs/research/`](docs/research/): poetry provenance, visual references, facts, pipeline lessons |
| Dailies | [`docs/DAILIES.md`](docs/DAILIES.md), [`docs/takes.json`](docs/takes.json) |

## Three listeners

| | who | voice | drawn as |
|---|---|---|---|
| the Beacon Keeper | a human who keeps a signal station on a sea cliff | Voice A (breathy verses, the chorus) | engraved light: flow-following gold lines whose width carries tone |
| the Listener | the station's AI, which refuses the first-strike protocol | Voice B (verse 2) | a constellation: stars and the links between them, the same stuff as the contact graph |
| the Other | a moth-like person on an ocean world 89 light-years away | none: it answers in light | bioluminescent stipple |

History (the Tang alchemists, Petrov in 1983, Arkhipov in 1962) is drawn as archival printed matter. Red is fire and
nothing else; gold is light.

## How it was made

```
song ──► stems (BS-RoFormer), beat grid, word timings ──────────────────────────────┐
poems ──► provenance, motifs, on-screen excerpts                                     │
sheets (Nano Banana Pro / GPT Image 2.5) ──► first-frame stills ──► Seedance 2.5     │
   (vocal stem slice as the lip-sync reference) ──► QC, mouth-shape strips, lag picks │
        └──► guide maps: engraving streamlines, constellations, stipple, mattes, faces │
                  └──► renderer: scenes + type + film compositor, renderAt(t) ◄───────┘
```

(Full write-up at delivery.)
