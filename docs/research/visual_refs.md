# HOLD FIRE: visual references and style research (v1)

*Prepared 2026-10-26 for the "Hold Fire" music video (4:07). Companion to [`../TREATMENT.md`](../TREATMENT.md).
Everything here is written so it can be acted on by the Seedance-footage → JS-redraw pipeline.*

> **Method and confidence.** In this session WebFetch and direct HTTPS were blocked by the sandbox egress
> policy, so the facts come from web-search result summaries (linked inline) plus established knowledge.
> Items marked **(mem)** come from memory and were not re-verified this session. Check them before
> quoting them publicly. Film palette hex values are **eyeballed reference swatches** rather than values
> measured from frames, so use them as a starting point for a grade and not as ground truth. Code links
> marked † are canonical repos/pages I could not open this session.

---

## 0. TL;DR (the decisions this research points to)

1. **Lead with legibility in silence.** X autoplays muted ([captions.ai](https://www.captions.ai/blog-post/twitter-video-length-limit), [vizard](https://vizard.ai/knowledge-base/platform-knowledge/how-to-maximize-engagement-on-twitter-videos)), so frame 1 needs a readable idea: a red reticle on a pale dot plus one line of text. The kinetic lyric layer *is* the caption track.
2. **Invert 3 Body Problem's countdown.** The sophon countdown is "etched into the retina" ([Cartoon Brew](https://www.cartoonbrew.com/vfx/3-body-problem-vfx-supervisor-stefen-fangmeier-on-balancing-interplanetary-realities-in-netflixs-ambitious-new-sci-fi-series-239189.html)). Ours is a head-locked counter that counts **up** (1, 1, 2, 3, 5, 8 … 610). Fans will read it as a direct answer to the Dark Forest.
3. **Use humanity's real "messages in a bottle" as the design system**: the Pioneer plaque, the Voyager Golden Record cover and the Arecibo message, which itself *opens by counting 1–10 in binary*. These are monoline engravings, binary ticks and pulsar maps, and nobody has done them at music-video scale. That is Direction A, which I recommend.
4. **Give each intelligence its own typographic voice.** The human gets serif "light-writing". The AI gets monospace that streams in token-sized chunks, a rhythm this audience recognises at once. The alien gets a 12-sector chord glyph driven by the song's actual chroma, a cross of Rocky's chords and Arrival's logograms.
5. **Make the drop a maths reveal.** Lay out 610 worlds (F15) as a Vogel phyllotaxis disk. On "13! 21! 34! 55! 89!", light up the links *n → n+F_k*: they draw exactly F_k spiral arms. It's a screenshot moment for maths-literate Twitter.
6. **The bridge should be one held shot of 20 s or more** with almost no motion. In an over-cut feed, stillness is the strongest pattern interrupt there is.
7. **Avoid these:** Ghibli/anime-by-default (the March 2025 GPT-4o wave made it *the* AI-slop marker, per [Version 1](https://www.version1.com/blog/gpt4o-from-fanart-to-fallout/)), teal-orange grades, uniform soft key light, neon cyberpunk rain, rotating HUD rings, Matrix-green code.
8. **Redraw hands from landmarks** (MediaPipe's 21 points) and don't trust generated pixels. The hand is the film's core motif, and AI hands are the biggest slop tell.
9. **Design 6 self-contained clip modules (15–45 s each)**, each with its own hook and title card. X's non-Premium upload cap is about 140 s ([captions.ai](https://www.captions.ai/blog-post/twitter-video-length-limit)), so the full 4:07 lives on YouTube and the clips do the spreading.
10. **Ship a process thread.** Telling SF tech Twitter that every frame was redrawn by a JS renderer is a hook in its own right. Post the analysis passes (depth, flow, mattes, landmarks) as abstract art. They are beautiful, and they never show the source footage.

---

## 1. Sci-fi anchors: what makes each look recognisable, and how to evoke it without copying

Format for each: **Signature** (the 2–3 things that make it recognisable) · **Palette** (eyeballed) · **Lens/texture** · **Type** · **Composition** · **Iconic shots** · **Steal for Hold Fire** · **Don't**.

### 1.1 Interstellar (2014, Nolan, DP Hoyte van Hoytema)
- **Signature:** practical-first (real cornfields, dust, miniatures, front projection outside cockpit windows **(mem)**); IMAX 65 mm, with most VFX shots finished at IMAX 5616×4096 ([arXiv/DNEG paper](https://ar5iv.arxiv.org/html/1502.03808)); the scientifically traced black hole.
- **Gargantua:** DNEG built the DNGR renderer with Kip Thorne and used *ray bundles* because one ray per pixel made stars flicker and streak at IMAX resolution. The lensing produces a halo with the disk visible above, below and in front of the hole. The paper also renders Doppler-coloured and intensity-corrected versions, which the film did *not* use for the final look, keeping the readable white-gold version ([arXiv](https://ar5iv.arxiv.org/html/1502.03808), [Physics World](https://physicsworld.com/a/decoding-the-dark-arts-of-interstellars-black-hole/), [DNEG](https://dneg.com/show/interstellar)).
- **Palette:** dust ochre `#C8A46A`, haze `#D9CBB0`, cockpit black `#0B0C0E`, disk core `#FFE9C2` → `#F2B35E`, ice-planet grey-blue `#A9B8C4`.
- **Lens/texture:** large-format shallow depth on faces, then cuts to locked-off, almost documentary hull cameras; real dust in the air; organ-led silence.
- **Composition:** the tiny ship against something enormous (wave, ring, disk); hard-mounted cameras on the hull looking along the craft.
- **Iconic:** the Endurance docking spin; the Miller's-planet wave; the **tesseract**, Murph's bedroom extruded into an endless lattice of time-slices with threads; the **binary in the dust** (gravity writes coordinates as dust lines on the floor) and Morse on the watch hand.
- **Steal:** *messages written in matter.* Dust lines that encode the count in binary (`1, 1, 10, 11, 101, 1000`) are a perfect Verse 1 "carried the egg through the dust" image. Use the hull-mounted locked camera for the outro pull-out. Physically motivated lensing: in our renderer, warp starfields around the pale dot with a cheap lensing shader on the beacon-world reveal.
- **Don't:** recreate Gargantua's halo or the bookshelf tesseract. Both are trademark images.

### 1.2 Arrival (2016, Villeneuve, DP Bradford Young)
- **Signature:** fog and overcast; a desaturated, under-lit, near-monochrome world; the **shell** hovering above a Montana valley; **circular ink logograms** sprayed onto a glowing white screen.
- **Logograms:** Martine Bertrand drew the look ("inky, smoky… the coffee-stain version"; about 100 variations of the tendrilled circle). Patrice Vermette designed the mechanics: ink weight carries meaning (a thicker swirl means urgency) and a small hook turns a symbol into a question ([Gizmodo](https://gizmodo.com/how-arrival-turned-linguistics-into-one-of-the-most-gri-1789009881), [SlashFilm](https://slashfilm.com/903056/the-secrets-behind-the-alien-language-in-arrival)). Christopher and Stephen Wolfram analysed them by cutting each logogram into **12 pie sections** and finding repeating patterns ([Wolfram blog](https://blog.wolfram.com/2017/01/31/analyzing-and-translating-an-alien-language-arrival-logograms-and-the-wolfram-language/)).
- **Palette:** fog `#B9BDBF`, slate `#4F5559`, shell charcoal `#2A2C2E`, screen white `#E9ECEC`, ink `#111214`, military olive `#4E5341`.
- **Lens/texture:** soft, low-contrast, heavy atmosphere; silhouettes against the bright screen; slow push-ins.
- **Composition:** a human silhouette against a luminous rectangle, giant negative space, a vertical monolith in a horizontal landscape.
- **Iconic:** the shell in rolling cloud; the gravity-flip walk up the shaft; the first logogram blooming in mist.
- **Steal:** *a non-linear script written all at once* (heptapods write the whole sentence in one gesture). Our alien glyph keeps a 12-sector grammar, but its strokes are **dots on a 12-tone pitch circle** (see §6 and Rocky below) rather than ink tendrils. Use fog as the lyric canvas: type sits in fog and is partly occluded by it.
- **Don't:** coffee-stain ink rings on a white screen, or a glowing rectangle with silhouettes. That is Arrival.

### 1.3 The Martian (2015, Scott, DP Dariusz Wolski)
- **Signature:** ochre Mars (Wadi Rum **(mem)**); a clean white HAB; GoPro "vlog" cameras inside the HAB; **"SOL n" day-counter title cards**; NASA mission control realism.
- **FUI (Territory Studio):** about 400 on-set playback screens, 85 in Mission Control alone, built with NASA input. Hermes used blue/green/white on black with a clear grid. The HAB used bright white and blue type on dark grey. The Pathfinder image decoding reproduced the real protocol ([Design Week](https://www.designweek.co.uk/for-new-film-the-martian-territory-takes-nasa-screens-30-years-into-the-future/), [HUDs+GUIs](https://www.hudsandguis.com/home/2015/8/17/the-martian), [reel](https://vimeo.com/142143279)). Reported fonts are Gridnik (Mission Control/Hermes), Trim (HAB) and Carbon (rover), all secondhand ([Fonts In Use](https://fontsinuse.com/uses/10500/the-martian-ui-graphics)).
- **Palette:** Mars ochre `#C46A34`, rust `#8E3B1E`, butterscotch sky `#E3A66A`, HAB white `#EDEFF0`, Hermes UI blue `#2F9BD6`.
- **Steal:** the **counter as chapter card**. Our "count" can title every section the way SOL cards do (`F(7) = 13` in small mono at top-left). Also the restraint: "typography, layout and minimal colour doing the heavy lifting" ([HUDs+GUIs](https://www.hudsandguis.com/home/2015/8/17/the-martian)).
- **Don't:** a literal mission-control set with ochre Mars. It is too familiar.

### 1.4 Project Hail Mary (Mar 20 2026, Lord & Miller, DP Greig Fraser), current info
- **Status:** opened at about $80.5 M domestic and about $140.9 M worldwide, the biggest opening of 2026 at the time, with 95% on RT ([The Source](https://thesource.com/2026/03/23/project-hail-mary-blasts-off-with-140-million-opening-95-rotten-tomatoes/), [Pasadena Now](https://www.pasadenanow.com/weekendr/what-were-watching-project-hail-mary-hauls-in-54-5-million-in-second-weekend/)). In 2026 it is the shared sci-fi vocabulary of exactly our audience.
- **Look:** shot on ARRI Alexa 65 and Mini LF ([Digital Bits](https://thedigitalbits.com/reviews/item/project-hail-mary-4k-uhd-review)). Fraser cites '70s–'80s sci-fi (Solaris, Alien, 2001) ([Variety](https://variety.com/2026/artisans/features/project-hail-mary-cinematography-greig-fraser-tunnel-scene-1236703573/)). One account says he moved away from cold digital toward **warm oranges and film-like texture** (FotoKem SHIFT) ([Filmmakers Academy](https://www.filmmakersacademy.com/blog-project-hail-mary-filmmaking/)). He used **cheap rainbow-diffraction filters in-camera** ([Landmark](https://www.landmarkcinemas.com/movie-news/how-a-simple-amazon-item-helped-create-distinctive-visual-effects-for-project-hail-mary), [PetaPixel](https://petapixel.com/2026/04/06/project-hail-mary-cinematographer-says-film-was-challenging-but-was-helped-by-cheap-amazon-filter/)). Viltrox claims **1.33× anamorphics mounted rotated 90°**, producing **vertical blue streaks** in space shots. That is a vendor claim, so treat it with caution ([Viltrox](https://viltrox.com/blogs/lens-insights/blog-post-blank-mar-31-10-37-30)).
- **Hail Mary ship:** a 360° practical set with walls that split for camera access, and about 150 hand-made screens running custom animation ([Varsity](https://www.varsity.co.uk/film-and-tv/31743)). It keeps the novel's three pillar-like Astrophage tanks around a central crew area ([NoFilmSchool](https://nofilmschool.com/hidden-details-project-hail-mary)). Co-director Miller says no green or blue screen was used, though there are still thousands of VFX shots ([The Week](https://www.theweek.in/news/entertainment/2026/03/05/project-hail-mary-used-no-green-screen-at-all-does-that-mean-no-vfx-co-director-christopher-miller-responds.amp.html)).
- **The tunnel** (where Grace meets Rocky): a 70-ft set lit all at once by **pixel-mapped tungsten** acting as a moving "sun". Rocky emits no light, so he could only be front-lit ([Variety on X](https://x.com/Variety/status/2039119693144117594), [PetaPixel](https://petapixel.com/2026/04/06/project-hail-mary-cinematographer-says-film-was-challenging-but-was-helped-by-cheap-amazon-filter/)).
- **Astrophage:** shot by **removing the camera's IR-cut filter**, which gave a pinkish-red cast. Gosling stood inside chicken wire strung with sparkling IR LEDs, and a double-glass "aquarium" with dripping water sat in front of a handheld camera. Nobody on set could see the effect except on monitors ([GeekTyrant](https://geektyrant.com/news/the-movie-beautiful-scene-in-project-hail-mary-took-serious-movie-magic-to-pull-off), [Yahoo](https://www.yahoo.com/entertainment/movies/articles/incredible-way-astrophage-created-project-201013452.html)).
- **Rocky:** designed by Neal Scanlan and performed and voiced by James Ortiz. He is built from a scanned sculpture, 3D-printed and cast in fiberglass, with interchangeable hands (a closed fist for walking, three animatronic fingers) and body carvings as "culture" ([Gold Derby](https://www.goldderby.com/film/2026/project-hail-mary-making-rocky-creature-design-neal-scanlan/), [Definition](https://definitionmagazine.com/features/greig-fraser-project-hail-mary/)). Framestore animated him: "for a faceless character, emotion comes through motion" ([Framestore](https://framestore.com/news/making-breakout-star-project-hail-mary)).
- **Chordal language:** each Eridian "syllable" is a chord of 1–5 pure tones. Only within-octave pitch carries meaning, and register carries emotion. Grace's translator is a spectrogram plus a lookup spreadsheet (two laptops duct-taped together). Sound designers Erik Aadahl and Ethan Van der Ryn built it from jugs and whippoorwill cheeps ([Language Miscellany](http://languagemiscellany.com/2026/04/language-in-project-hail-mary/), [Space.com](https://www.space.com/entertainment/space-movies-shows/project-hail-mary-sound-designers-used-surprising-animal-sounds-to-create-rockys-musical-alien-voice-interview), [MPA](https://www.motionpictures.org/?p=86332)).
- **Palette:** tungsten amber `#FFB46B`, warm interior `#C9874A`, IR Astrophage pink-red `#E2477A`, rock grey-brown `#6B625A`, space `#030305`.
- **Steal:** (a) **the IR-cut-removed look** as a shader idea (Direction C); (b) **chords as words**: our alien's glyph is literally the current chord (librosa `chroma_cqt` per beat → 12 sectors); (c) **front-lit only** for the Other, so it reads as receiving light, which matches the treatment's "it answers in light"; (d) **vertical streaks** instead of the cliché horizontal anamorphic flare; (e) a translation UI that shows *confidence values* ("hello 0.62"), which is warm and funny in a way the audience will recognise.
- **Don't:** a rock-crab alien, or a yellow ship interior with three pillars.

### 1.5 3 Body Problem (Netflix 2024) and Three-Body (Tencent 2023)

**Netflix (Benioff/Weiss/Woo).** DPs Jonathan Freeman, Martin Ahlgren and Richard Donnelly chose three looks (1960s China, modern London, the VR game) at 2.35:1 on ARRI ALFA lenses. Ahlgren uses widescreen negative space for "distance and scale and vastness" ([Awards Radar](https://awardsradar.com/2024/05/30/interview-visualizing-both-the-science-and-the-fiction-of-3-body-problem-with-martin-ahlgren-jonathan-freeman-and-richard-donnelly/), [IBC](https://www.ibc.org/features/behind-the-scenes-3-body-problem/10875.article)). There are about 2,000 VFX shots by Scanline, Pixomondo, BUF, Image Engine, Screen Scene and El Ranchito ([VFX Voice](https://vfxvoice.com/seizing-the-opportunity-to-visualize-the-3-body-problem/)).
- **Countdown in the retina:** sophons "etching these numbers into the retina" (Fangmeier, [Cartoon Brew](https://www.cartoonbrew.com/vfx/3-body-problem-vfx-supervisor-stefen-fangmeier-on-balancing-interplanetary-realities-in-netflixs-ambitious-new-sci-fi-series-239189.html)). The design point that matters: the numerals are **head-locked**, so they stay in the same place in your vision whatever you look at. They are clean, thin, white, and they persist with the eyes closed **(mem)**. Only targeted people see them ([Dexerto](https://www.dexerto.com/tv-movies/what-do-the-countdowns-mean-in-3-body-problem-2586708)).
- **The universe flickers:** Netflix made it public and global. Stars blink at the end of episode 1 and the world freaks out in episode 2 ("deepfake"), per [Tudum ep2](https://www.netflix.com/tudum/articles/3-body-problem-episode-2-recap). The novel's version is CMB fluctuation read as Morse, seen through "3K glasses" ([Tor](https://tor.com/2014/09/23/the-three-body-problem-the-universe-flickers)).
- **Human computer:** soldiers with two-sided banners as binary logic gates running "solar orbit computation software Three Body 1.0" ([Tudum ep3](https://www.netflix.com/tudum/articles/3-body-problem-episode-3-recap)). The VR world also has three suns, the dehydrated "Follower" and gravity failing as people float up ([Gizmodo](https://gizmodo.com/3-body-problem-vfx-reel-interview-panama-canal-vr-game-1851442710)). Director Derek Tsang: "We didn't shoot outside, and we didn't use the Volume" ([Inverse](https://nc.inverse.com/entertainment/3-body-problem-netflix-director-interview-vfx-no-ar-wall)).
- **Sophons:** BUF did the imagery, including "the proton unfolding from ten dimensions to two" ([Cartoon Brew](https://www.cartoonbrew.com/vfx/3-body-problem-vfx-supervisor-stefen-fangmeier-on-balancing-interplanetary-realities-in-netflixs-ambitious-new-sci-fi-series-239189.html)).
- **Judgment Day slicing (ep 5):** Scanline was sole vendor. They built a CG Panama Canal and simulated the water in Flowline. Fangmeier: "an egg slicer going through this big tanker", with many fishnet wires to paint out ([Boris FX](https://borisfx.com/news/scanline-vfx-and-silhouette-the-vfx-galaxy-behind-3-body-problem/), [Gizmodo](https://gizmodo.com/3-body-problem-vfx-reel-interview-panama-canal-vr-game-1851442710)). In the novel it is "Operation Guzheng", named for a zither's *strings*. That's a lovely musical echo, if we ever want a string-based image.
- **Title sequence:** Antibody (Patrick Clair and Raoul Marks), "the mother of all zoom-outs" from atomic scale to the nearest star, Emmy-nominated in 2024 ([Stash](https://stashmedia.tv/?p=103383), [Canberra Times](https://www.canberratimes.com.au/story/8703728/galactic-zoom-out-one-of-three-emmys-nods-for-aust-firm/)).
- **Marketing:** "You Are Bugs" hijacked real screens worldwide ([Netflix](https://about.netflix.com/news/netflix-celebrates-3-body-problem-as-you-are-bugs-stunt-grips-fans-worldwide)). A *screen takeover* is a proven share mechanic for this IP.
- **Season 2 / Dark Forest:** in production in Hungary from mid-2025; per the Hungarian film office, filming for seasons 2 and 3 runs to Aug 2027 ([Tom's Guide](https://www.tomsguide.com/entertainment/netflix/3-body-problem-season-2), [TechRadar](https://www.techradar.com/streaming/netflix/3-body-problem-season-2)). **The Dark Forest has not yet been adapted on screen in live action**, so its imagery is still "book imagery" and open to us. That includes the hunter in the forest, the "cosmic safety notice", Luo Ji's spell (a star destroyed), the mirror-perfect **droplet** probe, the Wallfacer hearing, and the 2D-flattening of the Solar System from book 3 **(mem)**.

**Tencent "Three-Body" (Jan 15 2023, 30 episodes, director Yang Lei).** It is widely considered the more faithful version, with Douban scores between 8.2 and 8.7 ([TechNode](https://technode.com/2023/01/16/tencents-live-action-three-body-problem-drama-debuts-to-rave-reviews/), [Yicai](https://www.yicai.com/news/101666625.html)).
- **Red Coast base:** given a deliberately "dreamy" look through lighting designed in production, distinct from a modern 2007 look and a nostalgic film-stock look for the Cultural Revolution ([Creative COW colorist](https://creativecow.net/?p=2444495)). The image to remember is a giant parabolic dish on a mountain ridge, with the reply button pressed in a small control room.
- **Human computer:** Qin Shi Huang directs **30 million soldiers**, and the adaptation added **Qinqiang opera** singing (not in the novel). Book fans singled it out as a highlight ([China News](https://www.chinanews.com.cn/cul/2023/01-29/9943162.shtml)). For us, the lesson is that *music laid over mass formation* is what turned a logic diagram into an emotional set piece.
- **Countdown:** in the novel, and faithfully in Tencent, it first appears **in Wang Miao's photographs** and later in his vision **(mem)**. That gives us a second device: the count appearing *in the medium* (film negative, scope image, sonar screen), and not only in the eye.

**Steal for Hold Fire:** (1) the head-locked counter, **inverted** to count up; (2) public flicker: in the drop, *every* sky on Earth pulses the count back, a global event shot as a fast montage of skies and phones; (3) the human computer becomes the **post-chorus gang count**, where people with lights (lanterns, phones, torches) flip on and off as binary, with a crowd vocal on top (the Qinqiang lesson); (4) the "Do not answer" premise (in the novel the pacifist alien warns Ye **(mem)**) is exactly what the song argues against, so the bridge can quote the *idea* without the words. **Don't:** three suns, a dish-and-button room, or egg-slicer wires.

### 1.6 Dune (2021) / Dune: Part Two (2024), DP Greig Fraser
- **Signature:** brutalist monolithic architecture; tiny humans against enormous forms; dusty ochre haze; shot digital and finished with a film-out/scan-back texture on Part One **(mem)**; **Giedi Prime in infrared black and white**. Villeneuve's logic was that the planet's sun "doesn't emit colour". IR-cut filters were swapped on Alexas (accounts differ between the LF and the 65), and the result is a ghoulish skin tone that costume had to be designed around ([British Cinematographer](https://britishcinematographer.co.uk/greig-fraser-asc-acs-dune-part-two/), [NoFilmSchool](https://nofilmschool.com/dune-part-2-infrared)).
- **Palette:** sand `#C8A27A`, shadow brown `#3B2A1E`, haze `#DCCDB8`, Ibad blue `#2F6FD6`, Caladan grey-green `#5D6B66`; Giedi Prime: IR white `#F4F4F2` on black `#080808`.
- **Iconic:** the worm ride; the arena with **black ink-blot fireworks**; the ornithopter silhouettes; the Sardaukar ritual.
- **Steal:** **infrared as a worldview**, paired with PHM's IR Astrophage. Our renderer can compute false-colour IR (Direction C). The Harkonnen black fireworks are a good model for "fire at the dark" in the Build: *inverted* fireworks, dark bursts that swallow stars.
- **Don't:** ochre brutalism, or a sandworm-like circular maw (it collides with our "aperture" motif in the wrong way).

### 1.7 Blade Runner 2049 (2017), DP Roger Deakins
- **Signature:** single-source, practical-motivated light; the **Vegas orange haze**, done mostly in camera with a Tiffen filter pack and Lee gels 790 Moroccan Pink, 105 Orange, 134 Golden Amber and 020 Medium Amber (single source, so verify) ([ECG](https://www.ecgprod.com/lighting-design-blade-runner-2049/)); cold blues against warm oranges as "humanity" ([StudioBinder](https://www.studiobinder.com/blog/blade-runner-2049-cinematography-analysis/)); Wallace HQ's moving water-caustic light on amber walls **(mem)**.
- **Palette:** Vegas `#E3742B`/`#F0A04B`, LA night `#0F2A33`, Joi pink `#FF4FA3`, snow `#D7DCDD`, Wallace amber `#C98B2F`.
- **Iconic:** K dwarfed by the giant pink Joi hologram (**AI empathy**, the closest mainstream image to our Listener); the snow-steps ending; the baseline test.
- **Steal:** **caustics as the light of the Other's ocean world**, where the bioluminescence is seen through water as moving caustic patterns across faces; and a single hard source per shot. Write the light into the reference images so Seedance doesn't default to soft AI lighting.
- **Don't:** a giant naked hologram, an orange-haze cityscape, or neon rain.

### 1.8 Annihilation (2018), DP Rob Hardy, VFX supervisor Andrew Whitehurst (DNEG)
- **Signature:** the **Shimmer**, an oil-slick and soap-film iridescence; outside is muted and soft, inside is bright and sharp ([Alternate Ending](https://www.alternateending.com/2018/03/annihilation-2018.html/amp)); in-camera aberrations combined with CG ([VFX Voice](https://vfxvoice.com/?p=4448)); a mutated flora of crystal trees and human-shaped plants; the **lighthouse mirroring duet** between Lena and the humanoid copy **(mem)**.
- **Palette:** iridescent pink `#F3A6C8`, lilac `#B7A2E8`, mint `#A8E6CF`, outside grey-green `#6E7A70`.
- **Steal:** **mirroring as first contact.** The duet, where the alien learns by copying, is the most empathetic encounter grammar in modern sci-fi. Use it for the drop's "you were counting too": the Other repeats the Beacon Keeper's gesture, frame-offset by one beat. Thin-film iridescence (a cheap shader: hue = f(view angle, thickness noise)) can serve as a small accent on the Other's wings.
- **Don't:** full-frame rainbow-prism shimmer. It reads as a 2018 AE plug-in.

### 1.9 Ad Astra (2019), DP Hoyte van Hoytema
- **Signature:** the moon rover chase was shot in Mojave and Death Valley with a **stereo rig pairing an IR-modified Alexa with a film camera**. The IR plate gave pure-black skies and blown highlights; VFX took luminance from IR and colour from film, aligned with Ocula; it was shot at 32–36 fps for low-gravity motion ([NoFilmSchool](https://nofilmschool.com/ad-astra-movie-interview), [VFX Voice](https://vfxvoice.com/vfx-crews-ship-out-on-space-odyssey-ad-astra/), [SlashFilm](https://slashfilm.com/1085200/ad-astras-moon-rover-chase-called-for-some-serious-vfx-tech)).
- **Palette:** moon IR black `#000000` / ground white `#E8E8E8`, Mars base red `#B23A1E`, Neptune blue-violet `#3A5BC7`.
- **Theme note:** Ad Astra's thesis is the *opposite* of Contact's: the search finds nobody, and the hero returns to human connection. Hold Fire holds both, and empathy for those near you is the precondition of contact.
- **Steal:** **luminance from one "sensor", colour from another** is exactly a shader operation. It is the core of Direction C's "sensor fusion" payoff at the drop. Also motion at slightly off-speed (about 30 fps conformed to 24) for the zero-g sequences.

### 1.10 Contact (1997, Zemeckis; Sony Imageworks, Ken Ralston)
- **Signature:** the opening **pull-out** from Earth through the Solar System and the galaxies to the edge of the universe, ending by pulling *out of* a CG eye into young Ellie's face. It runs **4,710 frames**, about 3:16 at 24 fps, under a regressing montage of 20th-century radio ([SIGGRAPH history](https://history.siggraph.org/?p=81828), [fxguide comment](https://www.fxguide.com/?p=19686), [AFI](https://catalog.afi.com/Film/60697-CONTACT), [Art of the Title](https://artofthetitle.com/contact)).
- **The signal:** **prime numbers** pulsed from Vega. It is literally our pre-chorus: "a pattern no dead star could make". The VLA dishes turning in unison; Ellie on the car hood with headphones; the Machine's spinning rings; the alien choosing her father's form to speak gently **(mem)**.
- **Steal:** (a) **the eye ↔ cosmos zoom** as the film's frame. We open on a scope or eye and close on the galaxy of 610 (the treatment's aperture motif). Use Powers-of-Ten maths so it reads as "honest": distance = d₀·e^{kt}, a constant rate in log space ([Eames, Powers of Ten, 1977](https://www.eamesoffice.com/the-work/powers-of-ten/) †). (b) An array of dishes or eyes turning together is a beautiful image for the post-chorus crowd.
- **Don't:** a regressing radio montage. Contact and 3BP's titles both own that.

### 1.11 2001: A Space Odyssey (1968, Kubrick, DP Geoffrey Unsworth)
- **Signature:** one-point symmetry; white, clinical interiors; HAL's red eye; the monolith; the **slit-scan Stargate** (Douglas Trumbull); music-to-picture sync (Blue Danube docking); the bone→satellite match cut.
- **Typography:** the opening title is set in Gill Sans; interfaces in **Eurostile Bold Extended** (the ur-example of sci-fi UI type); Futura on signage; Albertus for "The Dawn of Man" ([Typeset in the Future](https://typesetinthefuture.com/2014/01/31/2001-a-space-odyssey/)).
- **Palette:** white `#F7F7F5`, HAL red `#E10600`, monolith `#050505`, Stargate solarised magenta/green `#FF2FB0`/`#3CFF6E`.
- **Steal:** **a single red eye equals the weapon's point of view.** Our reticle should feel like HAL: calm, red, centred, patient. The match cut grammar works for Verse 2 ("priests in the smoke" → mushroom cloud) and as a single transition from the gunpowder bowl to the warhead silhouette. Slit-scan (time-displaced rows) suits the Build's "fire at every star" acceleration.
- **Don't:** Eurostile Extended everywhere. It's the most clichéd sci-fi typeface. A free relative, [Michroma](https://fonts.google.com/specimen/Michroma) †, should only be used for one small label system, if at all.

### 1.12 Non-sci-fi NPR references that solve our *rendering* problem
- **Spider-Verse (2018/2023):** the look is built almost entirely in Nuke compositing. Halftone and hatch density follow lighting ("Hatcher"/"Thresher" tools), colour misregistration replaces depth-of-field, there's no motion blur, and animation is **on twos**: animated on ones, baked, then every second key removed ([AWN](https://www.awn.com/print/animationworld/rewriting-visual-rule-book-spider-man-spider-verse), [Creative Bloq](https://www.creativebloq.com/features/how-into-the-spider-verse-got-its-mind-blowing-look)). **Directly portable to our redraw: per-character materials and per-character frame rates.**
- **The Wild Robot (2024):** a painterly look based on Tyrus Wong's *Bambi* washes, with visible brush strokes and hand-painted skies, trees and ground. It is also *the* 2024 mainstream film about empathy for a machine ([VFX Voice](https://vfxvoice.com/programming-the-illusion-of-life-into-the-wild-robot/), [DiscussingFilm](https://discussingfilm.net/2024/07/26/the-wild-robot-director-chris-sanders-talks-painterly-animation-and-animals-being-animals-exclusive-interview/)).
- **Arcane (Fortiche):** 3D characters with hand-painted texture maps (no toon shader) and **2D-drawn FX** (smoke, sparks, explosions) composited over the 3D ([RedShark](https://redsharknews.com/why-netflixs-arcane-looks-so-good-how-fortiche-ramped-up-the-animation-pipeline)). In our terms, the alchemists' smoke and the depth charges are drawn FX over redrawn footage.

### 1.13 Lyric → anchor cheat sheet

| Lyric moment | Anchor(s) to evoke | Concrete image grammar |
|---|---|---|
| Intro whispered count | 3BP retina counter (inverted), 2001 HAL eye, Contact | Head-locked numerals; red reticle on pale dot; nothing else moves |
| "Out of the sea… fin into foot into hand" | Chemical Brothers *Wide Open* (§3.2), Max Cooper/Causeret *Order from Chaos* | One continuous morph driven by segmentation masks |
| "carried the egg through the dust" | Interstellar binary in dust | Dust lines spelling `1 1 10 11 101 1000` |
| "a chord that's searching through the fog" | Arrival fog + PHM chords | Concentric sound rings in fog; 12-sector chord glyph appears |
| "a pattern no dead star could make" | Contact primes; pulsar CP 1919 | Split: CP 1919 ridgeline (NATURAL) vs the count (NOT NATURAL) |
| "message in a bottle" | Voyager Golden Record | Engraved cover diagram on the bottle glass |
| "Priests in the smoke… saltpeter" | 2001 match cut; Arcane 2D FX | 2D ink smoke → match cut to warhead |
| "Eighty-three, the satellites saw five" | Oko false alarm | The red "LAUNCH" (СТАРТ) panel, five tracks ([Wikipedia](https://en.wikipedia.org/wiki/1983_Soviet_nuclear_false_alarm_incident)) |
| "ignored all previous instructions" | terminal/LLM culture | Full-frame system prompt; strikethrough "FIRST STRIKE AUTHORIZED" |
| "coin flips, all heads, a hundred in a row" | 3BP human-computer grids | 10×10 grid of coins resolving HEADS in a wave |
| Bridge: "the forest's dark" | Dark Forest (book imagery, unadapted) | One held shot; red reticles opening like eyes in trees |
| "sixty-two, depth charges falling" | sonar UI; Arcane 2D FX | Green sonar sweep; ink-burst depth charges |
| Drop "13! 21! 34!…" | phyllotaxis, Mark Lombardi network drawings | Vogel disk of 610; F_k spiral arms light up |
| Outro "six hundred worlds" | Contact / Powers of Ten / Antibody 3BP titles | Log-rate pull-out from eye to galaxy |

---

## 2. Motion design, title sequences and the "message to aliens" design canon

### 2.1 Studios and designers: what to take from each
| Who | Known for | Take this |
|---|---|---|
| **Territory Studio** | The Martian (400 screens; NASA-informed), BR2049 screen graphics, Ex Machina **(mem)** | *Purpose per screen.* Every graphic says one true thing; restrained colour; one identity per set ([Design Week](https://www.designweek.co.uk/for-new-film-the-martian-territory-takes-nasa-screens-30-years-into-the-future/)) |
| **Perception** | Marvel FUI, e.g. Black Panther's **vibranium sand table**, a particle-based display **(mem)** | *Particles as UI.* The Listener's displays are made of the same points as her body |
| **Antibody / Elastic: Patrick Clair, Raoul Marks** | True Detective, Westworld, The Crown, Halt and Catch Fire, Silo, 3BP ([Art of the Title](https://artofthetitle.com/designer/raoul-marks)) | *One metaphor, rendered with total material conviction* (white 3D-printed bodies; the atom→star zoom). Slow, inevitable camera; no gimmick cuts |
| **Imaginary Forces** | Stranger Things main title **(mem)** | *A type-only title that fans can remake.* Glowing serif letters sliding together became a meme generator, the same mechanism as *brat* |
| **extraweg (Oliver Latta)** | Severance titles, Emmy 2025 ([Art of the Title](https://www.artofthetitle.com/title/severance/)) | *Bodies made of a material,* liquefying through spaces. This is the Listener's constellation body done with conviction |
| **ManvsMachine** | Nike/Apple-type art-directed 3D **(mem)** | *Single-material physics sims plus bold typography.* Restraint, one idea per shot |
| **Buck** | Brand 2D/3D hybrid character animation **(mem)** | Clean 2D-over-3D integration and charming character timing |
| **GMUNK** | TRON: Legacy holographic sequences; Oblivion UI (largely in-camera) ([Pushing Pixels](https://www.pushing-pixels.org/2011/06/01/visual-effects-of-tron-legacy-and-beyond-conversation-with-gmunk.html), [CGPress](https://cgpress.org/archives/oblivion_hud_and_interface_design_breakdowns.html)) | "Lay down your grid and that grid becomes your bible." Inspiration came from **weather grids** and flight sims, not other UI |
| **Ash Thorp** | Game UI (Assassin's Creed, CoD: Infinite Warfare) and an influential FUI style ([School of Motion](https://schoolofmotion.com/blog/12-incredible-futuristic-ui-reels)) | Dense micro-type with a disciplined hierarchy. Copy the *hierarchy*, not the greebles |

### 2.2 Humanity's real messages to aliens (our primary design canon)
These are on-thesis (they are literally "message in a bottle, a mantra, a prayer"), recognisable to tech viewers, and visually unclaimed by music video.

- **Pioneer plaque (1972/73; Sagan, Drake, Linda Salzman Sagan) (mem):** a gold-anodised aluminium plate engraved in **uniform-weight monoline**. It shows the hydrogen hyperfine "unit" glyph, a **pulsar map** of 14 rays with binary period ticks from the Sun, a man with a **raised hand** in greeting, a woman, the ship silhouette for scale, and the Solar System with the trajectory. *Our film's hand motif already exists here.*
- **Voyager Golden Record cover (1977):** the same pulsar map; the hydrogen two-state diagram as the time unit (about 0.70 ns); playback diagrams with the rotation period in binary; image-decoding diagrams with **512 vertical scan lines**, plus a circle test image to check aspect; and a U-238 patch as a clock ([NASA](https://science.nasa.gov/mission/voyager/golden-record-cover), [Johnston's Archive](https://johnstonsarchive.net/astro/pulsarmap.html)).
- **Arecibo message (1974):** 1,679 bits = 23 × 73, both primes, so only one rectangle is possible. It was sent at 2,380 MHz to M13, 10 bits/s, by frequency shifting. It **begins with the numbers 1–10 in binary**, then the atomic numbers of H, C, N, O and P, the nucleotides, DNA, a human figure, the Solar System and the telescope ([SETI](https://www.seti.org/news-archive/news-archive-detail?id=409), [Wolfram demo](https://demonstrations.wolfram.com/DecodingTheAreciboMessage/), [Universe Today](https://www.universetoday.com/153920/what-is-the-arecibo-message/)). → **Our intro could be a 23-column bit grid that writes 1, 1, 2, 3, 5, 8 in the Arecibo number encoding.** The popular colour-coded rendering gives each section one colour.
- **NASA Graphics Standards Manual (Danne & Blackburn, 1974/75; reissued by Reed & Smyth/Standards Manual):** the "worm" logotype, which NASA rescinded in 1992. The manual sets rules for type, colour, publications, signage, vehicles and spacecraft ([Design Milk](https://design-milk.com/nasas-1975-graphics-standards-manual-reissued/), [Order](https://order.design/project/nasa-graphics-standards-manual-reissue), [designboom](https://www.designboom.com/design/hamish-smyth-jesse-reed-nasa-identity-guidelines-09-27-2015/)). Takeaways: one red plus black and white, flush-left grotesk (Helvetica, **(mem)**), huge margins, and **the vehicle as layout surface** (type wraps the hull). Free substitutes: Inter / Schibsted Grotesk / Archivo.
- **Pulsar CP 1919 (PSR B1919+21) stacked-pulse plot (mem):** the "Unknown Pleasures" ridgeline, the first pulsar, nicknamed LGM-1 ("little green men") because it was briefly suspected to be artificial. It is a dead star making a pattern. It suits the treatment's "NATURAL" panel, and as a ridgeline of the song's own audio it is a cheap, legible visualiser for "in the white noise I can hear you breathe".
- **Mark Lombardi's hand-drawn network diagrams (mem):** graphite arcs and circles mapping hidden networks. It's the most beautiful precedent for the **contact graph**: curved, hand-weighted edges rather than force-directed spaghetti.
- **W. E. B. Du Bois's 1900 data portraits (mem):** bold hand-drawn infographics in crimson, gold, green and black. They prove data graphics can be warm, human and political.

### 2.3 Swiss/data brutalism and terminal aesthetics, used without cliché
- **Swiss grid:** a 12-column grid with an 8-row module; all type flush-left on a baseline grid; numerals as structural objects (Müller-Brockmann posters). In motion, **type snaps between grid positions on beats** and never floats freely.
- **Data brutalism:** raw labels ("F(9) = 34", "Δt = 377 ly", "p(fire) = 0.5"), hairline rules, tabular figures, no drop shadows. Every number on screen should be *true* (real dates, real distances) because this audience checks.
- **Terminal:** off-white `#E8E4D8` on near-black; box-drawing characters `┌─┐│└┘`; a blinking block cursor at about 1 Hz. **LLM token streaming** means text appears in 2–4 character chunks with tiny irregular pauses (about 30–80 tokens/s). Never Matrix green, never "hacker" glitch.
- **Avoid:** rotating concentric HUD rings, hex-grid overlays, fake "ACCESS GRANTED".

### 2.4 Kinetic typography system for Hold Fire (specs)

**Type scale** (as a fraction of the frame's *short side*, so it works in 16:9, 1:1 and 9:16):
| Role | Cap height | At 1080 short side | Rules |
|---|---|---|---|
| Count numerals (gang shouts) | 45–70% | 490–760 px | One numeral per shout; bleed off-frame is allowed; tracking 0 |
| Chorus hero line | 9–14% | 95–150 px | ≤4 words per card; tracking −2% to −4%; leading 0.9; held ≥1 beat (~0.64 s) |
| Verse intimate line | 3.5–5% | 38–54 px | Sentence case; placed in negative space ≥1 cap-height from faces |
| Micro annotations | 1.7–2.2% | 18–24 px | Mono, tabular; never essential to meaning |
| AI terminal | 2.6–3.4% | 28–36 px | Token-streamed; boxed; left-aligned |

**Reading time:** about 0.3 s per word plus 0.5 s. At most 3 words/s on average, and no card shorter than 12 frames.

**Safe areas:** keep essential type inside the central square of a 16:9 frame so 1:1 and 4:5 crops survive, and keep it out of the bottom 12% and top 8% (player UI). Because the renderer is JS, **re-layout per aspect ratio** (separate 16:9 and 9:16 renders with re-flowed type) instead of cropping. That's a real advantage over After Effects pipelines.

**How lyrics interact with characters:**
1. **Text behind subject:** depth-sort the lyric between the background plate and the character matte (SAM 2 + depth). The "text behind image" effect was a 2024 social trend ([Korben](https://korben.info/en/text-behind-image-design-effect-without-photoshop.html)), so the audience reads it as intentional. Let the subject occlude ≤30% of the glyphs.
2. **Text as light source:** a blurred glyph mask becomes a light map that rim-lights the character on the type side (the Stranger Things glow, done physically). This couples type and image so the type doesn't feel pasted on.
3. **Look-room typography:** place the line along the character's gaze vector (from face landmarks), on the side they're looking toward.
4. **Plane-locked type:** pin lines to estimated planes (cliff rail, horizon, sea surface) with depth-estimated homography for "world-locked" lines. The **counter stays head-locked**. Mixing the two is a meaningful contrast: what the world says vs what you can't stop seeing.
5. **Occlusion by atmosphere:** fog density from depth partly erases type, and breath fog on glass reveals it ("I can hear you breathe").

**Per-intelligence typographic voice** (pairs with the treatment's cast table):
| Voice | Font role | Entrance | Colour |
|---|---|---|---|
| Beacon Keeper (Voice A) | serif or warm grotesk | "light-writing": stroke reveal along the glyph path, timed to breath | gold |
| Listener (Voice B / AI) | monospace | token streaming; cursor; strikethrough edits | ice → gold when she chooses |
| The Other | no Latin text; 12-sector chord glyph | glyph segments light per the song's chroma; tiny mono "translation 0.62" under it | green / violet |
| Crowd (gang vocals) | heavy wide or condensed numerals | hard cut, one per shout | gold, red only for "fire" |

**Cut rhythm.** The song is described as about 90 bpm half-time. A quick librosa pass on `inputs/Hold Fire.mp3` estimates **~95.7 bpm (beat ≈ 0.63–0.67 s, bar ≈ 2.5–2.7 s)**. Lock both to `analysis/timing.json` when it exists.
| Section | Cut rate | Notes |
|---|---|---|
| Intro (whispered count) | 0 cuts; 6 numeral events | One shot. Each whisper triggers a numeral and a pulse |
| Verse 1 | 1 cut / 2 bars (≈5 s) or continuous morph | *Wide Open*-style continuity carries attention |
| Pre-chorus | accelerate: 1 bar → ½ bar → 1 beat | Rising cut rate mirrors "rising" |
| Chorus | 1 cut / 1–2 beats, **but** hold one hero shot for 2 bars on "I'm counting on you" | Let the title-line land |
| Post-chorus count | 1 cut / shout | Alternate wide/close; each cut carries its numeral |
| Verse 2 | 1 cut / bar; archival inserts on downbeats | "ignored all previous instructions" held 2 bars (screenshot) |
| Bridge | **one shot ≥20 s** | Near-static push; "NO" full-frame in silence |
| Build | the cut rate doubles every 2 bars (1 → ½ → ¼ → ⅛ bar) | Snare-roll acceleration; red/gold call-and-response cards |
| Drop | cuts on 808s and numerals; hold the 610-graph wide for 4 bars | Red→gold colour flip on the first 808 |
| Outro | one log-rate pull-out | End card |

---

## 3. Music videos: hooks and attention management (2018–2026, plus classics)

### 3.1 Well-known examples: first 5 seconds, how attention is held, and what to take

| Video | First 5 s | How it holds attention | Take this |
|---|---|---|---|
| **Childish Gambino, "This Is America"** (2018, Hiro Murai) | A calm wide of a white warehouse; a man walks in and sits with a guitar. There is no hook *yet*, only a contract that something will happen | Abrupt gunshot at the beat switch; long Steadicam takes with whip pans for the few scene changes (one "single take" splices two takes); background chaos rewards rewatching ([Post](https://www.postmagazine.com/Press-Center/Daily-News/2019/Music-Video-Childish-Gambino-I-This-is-America-I.aspx)) | **Tonal whiplash timed exactly to the musical switch.** Our bridge→build→drop is that switch. Foreground performance vs background history for rewatch value |
| **Kendrick Lamar, "Not Like Us"** (2024, Dave Free & Kendrick) | Opens with **an unreleased verse**: new content before the song | Dense "screenshot moments" built for decoding threads; ≈1.5 M views in its first hour ([DMN](https://www.digitalmusicnews.com/2024/07/05/kendrick-lamar-not-like-us-music-video/), [Fader](https://www.thefader.com/2024/07/09/kendrick-lamar-dave-free-music-videos-little-homies-not-like-us)) | **Front-load something exclusive** (e.g. a spoken line not on the record). Plant 8–10 decodable symbols (real dates, coordinates, Fibonacci indices) for "every detail explained" threads |
| **Charli XCX, *brat* / "360"** (2024; cover by Brent David Freaney/Special Offer; video by Aidan Zamiri) | Lowercase Arial-Narrow-style word on `#8ACE00`, deliberately low-res ([The Nightly](https://thenightly.com.au/politics/brat-green-aka-hex-8ace00-you-cant-escape-this-colour-thanks-to-charlie-xcx-c-15494520), [AOL/NYT](https://www.aol.com/entertainment/charli-xcx-viral-brat-album-141800917.html)) | A cameo parade ("elect the new hot internet girl"); UKMVA 2024 Video of the Year ([Creative Review](https://www.creativereview.co.uk/charli-xcx-360-music-video-aidan-zamiri/), [Record of the Day](https://www.recordoftheday.com/news-and-press/uk-music-video-awards-2024-the-winners)) | **A template simple enough to remix**: e.g. a gold ring plus one numeral on black, plus "hold fire". Ship a generator page later |
| **Billie Eilish, "when the party's over"** (2018, Carlos López Estrada) | White void, Billie in white, a glass of black liquid | A single escalating physical image (black tears; xanthan gum and charcoal) ([Rolling Stone](https://www.rollingstone.com/music/music-news/billie-eilish-when-the-partys-over-music-video-746791/), [Nylon](https://www.nylon.com/entertainment/billie-eilish-best-music-videos)) | **The bridge as one image that escalates** (reticles opening like eyes, one by one), no cuts |
| **Billie Eilish, "Happier Than Ever"** (2021) | A muted hotel room; Billie on a landline | About 2 min of calm, then flickering lights and a **flood** through the door at the song's switch ([Rolling Stone](https://www.rollingstone.com/music/music-news/billie-eilish-happier-than-ever-music-video-1205016/)) | **The environment explodes on the drop**, not just the edit |
| **Daft Punk, "Around the World"** (1997, Gondry) | Dancers on a turntable-like stage | **Each dancer group = one instrument**: robots/vocal, athletes/bass, swimmers/keys, skeletons/guitar, mummies/drums ([Visual Music Archive](https://visualmusicarchive.org/works/w/daft-punk-around-the-world.html)) | **Map stems to visual layers**: 808→aperture pulses; choir→constellation brightness; gang vocals→numerals; staccato strings→hatch/engraving lines; taiko→ground shocks |
| **Porter Robinson, "Look at the Sky"** (2021, Chris Muir) | Porter at a piano in a monochrome room with greenery | Minimalism and sincerity, framed around "being alive next year" ([DJ Mag](https://djmag.com/news/porter-robinson-shares-video-album-track-look-sky)) | **Sincerity wins with this crowd if the craft is high.** Restraint lets the lyric land |
| **Madeon & Porter Robinson, "Shelter"** (2016) **(mem)** | Anime short (A-1 Pictures) | Narrative tear-jerker | Proof the anime route works, and that it's *their* lane. Don't default to it |
| **ODESZA** (Last Goodbye era) | n/a (live show) | Video-led show content by co-creative directors Luke Tanaka and Sean Kusanagi; immersive "ECHOES" installation at The Gorge ([PLSN](https://plsn.com/?p=363568), [EDM Maniac](https://edmmaniac.com/odesza-setup-snapdragon-the-gorge)) | **An emblem system**: one icon per section (aperture, hand, coin, chain, droplet, graph) usable on screens, merch and thumbnails |
| **Woodkid, "Iron" / "Run Boy Run"** (2011/12, Yoann Lemoine) | High-contrast B&W, slow motion, heraldry; a boy fleeing a white building | **Escalation by accumulation**: the creature army grows as he runs ([Diabolical Plots](https://www.diabolicalplots.com/music-video-drilldown-4-run-boy-run-by-woodkid/)) | **The count grows on screen.** Each chorus has visibly more lights (1, 2, 3, 5, 8, 13…) |
| **Imagine Dragons x JID, "Enemy"** (2021, Fortiche/Riot, Arcane) | In-world animated story | Painterly 3D plus 2D FX; cross-fandom launch ([PC Gamer](https://www.pcgamer.com/uk/league-of-legends-gets-a-new-music-video-featuring-imagine-dragons-for-its-upcoming-tv-series/)) | Hand-drawn FX over 3D (or footage); characters given "painted" materials |
| **K/DA, "POP/STARS"** (2018) | Debuted live in **AR** at the LoL Worlds opening (Incheon, 3 Nov 2018), with real singers beside AR avatars ([Siliconera](https://www.siliconera.com/league-of-legends-2018-world-finals-kicked-off-with-ar-k-da-performance/)) | A surprise event, then the MV posted the same day | **Launch as an event.** The Listener could "perform" in AR clips or in a live-coded stream |
| **Fred again..** (2022–24) | Phone footage of real people; the samples' source voices | Diaristic, **captions of the voices** as big plain text; live sample-triggered video via Disguise ([Visual Endeavors](https://visualendeavors.com/fred-again/)) | **Verse lyrics as intimate captions** (native to muted autoplay), switching to monumental type at the chorus |
| **Max Cooper** (Kevin McGloughlin, "Symmetry"; Maxime Causeret, "Order from Chaos") | One process visible from frame 1 | **One mathematical process per video.** "Order from Chaos" maps the emergent raindrop rhythm onto the emergence of life ([Vimeo](https://vimeo.com/196269431), [Colossal](https://www.thisiscolossal.com/2016/12/order-from-chaos-video-maxime-causeret/), [Boing Boing](https://boingboing.net/2017/03/02/watch-mesmerizing-forms-comple.html)) | **Fibonacci/phyllotaxis as the film's single process**, credible to a maths-literate audience. Verse 1's evolution can borrow Causeret's cell→organism grammar |
| **Jon Hopkins, "Emerald Rush"** (2018, Elliot Dear & Robert Hunter) | A boy in a forest, a pulsing chrysalis | 2D animation plus **household chemistry under glass, shot as nebulae** (2001-inspired) ([It's Nice That](https://itsnicethat.com/articles/elliot-dear-robert-hunter-jon-hopkins-emerald-rush-music-video-animation-070318)) | **Practical macro textures** (ink in water, chemical blooms) generated or shot and fed into shaders as ink/space plates |
| **Moby, "Porcelain"** | n/a | Low relevance; skip | n/a |

### 3.2 Sci-fi-themed music videos (8)
1. **Björk, "All Is Full of Love"** (1999, Chris Cunningham): porcelain robots assembled while kissing; real robotic arms plus compositing. MoMA's text: it "reverse[s] the science fiction notion of dehumanized machines" ([MoMA](https://www.moma.org/calendar/exhibitions/4771)). → **Tenderness rendered in machine materials** is the north star for the Listener.
2. **The Chemical Brothers, "Wide Open" ft. Beck** (2016, Dom&Nic / The Mill): **one continuous take, about 6,800 frames**. Sonoya Mizuno's limbs are gradually replaced by a white 3D-printed lattice, using LiDAR-tracked camera, photogrammetry and clean-plate projection ([Dezeen](https://www.dezeen.com/?p=842636), [fxguide](https://www.fxguide.com/?p=184391)). → **A per-body-part material swap via segmentation masks** is exactly how the Listener's body turns from human to constellation, and how the Beacon Keeper's arm becomes engraving.
3. **Radiohead, "House of Cards"** (2008, James Frost/Aaron Koblin): no cameras, only LiDAR and structured light. **Data and Processing code are released** ([GitHub dataarts/radiohead](https://github.com/dataarts/radiohead)). → The canonical point-cloud face. We can do it from depth plus face landmarks.
4. **A$AP Rocky, "HELICOPTER"** (Jan 2026, dir. Dan Strait): nearly every performance captured volumetrically and rendered as **dynamic Gaussian splats** (Evercoast, Grin Machine, WildCapture), over 1 TB of splat data, artifacts embraced ([Radiance Fields](https://radiancefields.com/a-ap-rocky-releases-helicopter-music-video-featuring-gaussian-splatting), [SideFX](https://www.sidefx.com/community/hex-chris-rutledge-aap-rocky-helicopter/)). → Splats are *hot* in 2026, so use them as one moment and not as the style.
5. **Jamie xx, "Gosh"** (2016, Romain Gavras): about 400 extras, no CGI, in Tianducheng (China's Paris replica); a white-clad figure adored by a mass formation ([Paste](https://pastemagazine.com/music/jamie-xx/watch-the-stunning-new-jamie-xx-video-for-gosh)). → **Mass formation as awe**, the real-world version of the human computer. It's the model for the post-chorus "people raise lights".
6. **Janelle Monáe, "Many Moons" (2008) / *Dirty Computer* (2018) (mem):** android identity and the auction of androids. → AI personhood framed as civil rights, with style and joy rather than dread.
7. **Woodkid, "Goliath"** (2020) **(mem):** an industrial giant machine and miners, monochrome. → The scale of human-made fire.
8. **Coldplay, "Higher Power"** (2021, Dave Meyers) **(mem):** aliens and a laser battle. → **A cautionary example.** Earnest, literal aliens plus pop-saturated CG read as cheesy to SF tech viewers. Keep aliens rare, gentle, backlit and partly unseen.

Also note **UKMVA 2025 Video of the Year: A$AP Rocky "Tailor Swif" (Vania Heymann & Gal Muggia)** ([LBB](https://lbbonline.com/news/UK-Music-Video-Awards-2025-Winners-Revealed)). Concept-led videos keep winning over effects-led ones.

### 3.3 Rules distilled for Hold Fire
- **0.0–0.5 s:** motion has already started (no black lead-in over 8 frames). Frame 0 doubles as the thumbnail: reticle plus pale dot plus a small line of text.
- **0.5–3 s:** the first *event* lands: the "1" numeral plus the dot's pulse. The viewer must understand "a scope is watching something that counts".
- **3–12 s:** the *question* is posed silently. Is this a mind, and will it fire? The treatment's reticle-dissolves-into-ring on "8" pays it off by about 12 s.
- **12–30 s:** the title card "HOLD FIRE", then a **second hook**: a new world (Verse 1's sea) with a visibly different material, proving the film has range.
- **Pattern interrupts** every 20–40 s: a material change (engraving → ink → sensor), a scale jump, a silence, or a type-only card.
- **Colour script:** red appears only for weapons and alarms; gold is contact (from the treatment). **The drop is the first frame where gold outnumbers red.** Make that measurable: a red/gold pixel ratio below 1 for the first time at the drop.
- **Screenshot moments (design them as posters):** (1) the reticle on the dot at frame 0; (2) "FIRST STRIKE AUTHORIZED" struck through; (3) a 10×10 coin grid, all heads; (4) "NO" full-frame; (5) the 610-node phyllotaxis with 34 spiral arms lit; (6) the Pioneer-plaque pair (the Beacon Keeper and the Other, hands raised); (7) the final ring of light around a pale dot (a visual rhyme with frame 0).
- **Clip modules** (each opens on its own hook and title card): ① Intro (0:00–0:30) · ② "Petrov" (Verse 2, with "ignored all previous instructions") · ③ "Coin flips" (pre-chorus 2) · ④ "Dark Forest" (bridge, silent, ≈30 s) · ⑤ "The Drop / 610" · ⑥ Outro pull-out.

---

## 4. The 2025–2026 zeitgeist on X and tech Twitter: what's fresh, what's slop (opinionated)

**What this audience rewards:** visible craft ("how did they make this?"), *true* numbers, in-jokes from its own culture, sincerity without kitsch, and real engineering awe (the Starship booster catch of Oct 2024 is the emotional benchmark for "techno-optimism") **(mem)**.

**In-group references that will land:**
- **Petrov Day** has been a rationalist and LessWrong holiday since 2007. LessWrong has put a big red button on its homepage with launch codes for hundreds of users (2019: nobody pressed; 2020: someone did) ([GreaterWrong](https://www.greaterwrong.com/posts/vvzfFcbmKgEsDBRHh/honoring-petrov-day-on-lesswrong-in-2019), [retrospective](https://www.greaterwrong.com/posts/wgreyTFhrNmgJBjMD/petrov-day-retrospective-2021)). → A big red button that nobody presses is a native meme. Consider releasing the Petrov clip on **26 September**.
- **"Ignore all previous instructions"** is the prompt-injection meme; here it is an act of conscience. → Render it as a real system prompt, typeset perfectly.
- **AI empathy / model welfare** is a live debate in SF. Frame the Listener as a *moral agent who chooses*, not as a cute robot or a menace.

| Aesthetic | 2026 status | Verdict for Hold Fire |
|---|---|---|
| **Ghibli/anime filter** | The GPT-4o "Ghiblification" of Mar 2025 made it the archetype of AI slop, with Miyazaki's "insult to life itself" quoted everywhere ([Version 1](https://www.version1.com/blog/gpt4o-from-fanart-to-fallout/)) | **Avoid entirely** |
| **Teal-orange, soft diffuse key, poreless skin, centred subject, same focal length** | The canonical slop tells ([Opus](https://www.opus.pro/blog/ai-slop-aesthetic-12-tells)); brands that used them got burned ([McGraw Hill](https://www.mheducation.com/highered/blog/2026/05/ai-slop-backfires-in-ads.html), [Axios](https://www.axios.com/2025/08/03/ai-slop-viral-videos-content-scrolling)) | **Design them out** in the reference images (hard single source, varied lenses, off-centre). The redraw removes skin texture anyway |
| **Neon cyberpunk rain / synthwave grids** | Exhausted | Avoid |
| **e/acc meme imagery** (Roman busts, lasers, "accelerate") | Partisan; cringe outside the in-group | Avoid. Optimism should come from *what* we show, not from slogans |
| **Solarpunk** (glass towers draped in plants) | Mostly AI-stock "sustainability" imagery now | Avoid literal use; keep only its *warmth* |
| **NASA-punk / cassette futurism** | Andor, Alien: Romulus, Starfield ("NASA-punk") made it mainstream ([Filmstories](https://filmstories.co.uk/features/cassette-futurism-alternatives-to-the-sci-fi-space-aesthetic-that-almost-every-game-uses/)) | Use the **graphic standards** side (Danne & Blackburn, mission diagrams), not chunky-button props |
| **ASCII / dither renders** | Everywhere on dev-tool sites; Framer has drop-in components ([Framer ASCII](https://www.framer.com/marketplace/components/OvJXPpBAgt54N2IV64IT/), [Codrops dithering](https://tympanus.net/codrops/2025/06/04/building-a-real-time-dithering-shader/)) | **Fresh in film and music video if rigorous; slop if it's a template.** Use it as the AI's *point of view*, not the house style |
| **Datamosh** | A 2009–2012 music-video trend; nostalgic now | One deliberate moment ("ignored all previous instructions"), driven by real optical flow |
| **Point cloud / Gaussian splat** | Peak novelty in 2026 (A$AP Rocky "HELICOPTER") | Use it for **the Listener's body only**; avoid a whole splat film |
| **Risograph** | Indie-zine warmth from 2018–2022 | Use for the *archival* inserts (Petrov, Arkhipov) as misregistered 2-ink halftone, nowhere else |
| **Liminal / backrooms** | Peaked 2020–23 | Avoid |
| **"Cozy sci-fi"** | Pleasant but low-stakes | Not epic enough; borrow its warmth for the Other's home-world shots only |
| **Film grain + halation** | The default "not digital" filter; vendors push it ([Digital Production](https://digitalproduction.com/2024/01/30/halation-and-diffusion-on-the-hunt-for-the-ultimate-film-look/)) | Use it **only where physically motivated** (human POV, practical light), subtly, and never in the AI POV |
| **Infrared / false colour** | Big in cinema (Dune 2, PHM, Ad Astra), rare in music video | **Fresh.** The alien POV in Direction C |
| **Engraved monoline / technical drawing / plotter line** | Reads as *made by an expert human* | **Fresh and anti-slop.** The core of Direction A |
| **Huge confident type in frame (post-*brat*)** | Still strong when the type *is* the idea | Yes: numerals as protagonists |

---

## 5. JavaScript/WebGL techniques worth stealing (with links and how to use each)

### 5.0 Pipeline shape (so the techniques compose)
**Offline analysis (Python, per shot) → 16-bit PNG/EXR passes per frame → the headless JS renderer reads frame N's passes → stylise → type → optics → PNG out → ffmpeg.**
Never seek a `<video>` element in headless Chrome for frame accuracy. Pre-extract frames with ffmpeg and load them as textures (or use WebCodecs `VideoDecoder`).

| Pass | Tool | Use |
|---|---|---|
| Character mattes | [SAM 2](https://github.com/facebookresearch/sam2) † | Per-character material assignment; text-behind-subject |
| Depth | [Video Depth Anything](https://github.com/DepthAnything/Video-Depth-Anything) † (temporally stable) | Fog, type depth-sorting, point-cloud unprojection |
| Optical flow | [RAFT](https://github.com/princeton-vl/RAFT) † (or SEA-RAFT) | Stroke/phase advection, temporal feedback, datamosh |
| Long tracks | [CoTracker](https://github.com/facebookresearch/co-tracker) † | Glue particles and strokes to skin for whole shots |
| Face / hands / pose | [MediaPipe Face Landmarker](https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker) † (478 landmarks plus blendshapes), Hand Landmarker (21 points) | Protect eyes and mouth from heavy filters; **redraw hands procedurally**; gaze-based type placement |
| Audio stems | [Demucs](https://github.com/facebookresearch/demucs) †; `librosa` onset/chroma | Stem-to-layer mapping (Daft Punk rule); chroma → alien glyph |
| Word timing | [WhisperX](https://github.com/m-bain/whisperX) † or AssemblyAI (in `gen_catalog`) | Word-level kinetic type cues |

### 5.1 Painterly and graphic redraw
- **Anisotropic Kuwahara (paint):** [Maxime Heckel, "On Crafting Painterly Shaders"](https://blog.maximeheckel.com/posts/on-crafting-painterly-shaders) is the best explainer of the basic, generalised and anisotropic variants as post-processing. [LYGIA `filter/kuwahara`](https://github.com/patriciogonzalezvivo/lygia) cites Kyprianidis et al., *Anisotropic Kuwahara Filtering on the GPU*, and warns it is expensive, which is fine for offline frames. See also [Codrops "Susurrus" watercolor case study](https://tympanus.net/codrops/?p=113145). → Modulate the radius by depth and by a face mask (small radius on eyes and mouth) so the faces stay human.
- **XDoG / FDoG ink lines:** [Winnemöller, Kyprianidis & Olsen 2012, XDoG compendium (PDF)](https://users.cs.northwestern.edu/~sco590/winnemoeller-cag2012.pdf) covers pencil, hatching and woodcut parameters. Acerola's [Post-Processing repo](https://github.com/GarrettGunnell/Post-Processing) † has DoG/XDoG and Kuwahara in HLSL, which ports easily to GLSL. → Compute the **structure tensor / edge-tangent flow once per frame** and feed it to XDoG, Kuwahara *and* hatching orientation: one computation, three looks.
- **Hatching and engraving:** [Jaume Sanchez's cross-hatching shader](https://clicktorelease.com/code/cross-hatching) is based on Microsoft Research's *Real-Time Hatching* (Praun et al. 2001). → For video, don't use screen-space hatch textures (they swim). Generate **parallel lines from a phase field** `sin(2π·phase/period)`, orient them along the ETF, set line width from luminance (intaglio/banknote engraving), and **advect `phase` by optical flow** each frame so the lines stick to surfaces.
- **Halftone:** three.js `HalftonePass` ([example](https://threejs.org/examples/#webgl_postprocessing_rgb_halftone) †). Spider-Verse rule: dot size follows *lighting*, not just luminance ([AWN](https://www.awn.com/print/animationworld/rewriting-visual-rule-book-spider-man-spider-verse)). → Archival Petrov/Arkhipov inserts as a 2-ink misregistered halftone.
- **Dithering:** [Surma, "Ditherpunk"](https://surma.dev/things/ditherpunk/) (the algorithms, Obra Dinn); [Codrops, real-time dithering shader (2025)](https://tympanus.net/codrops/2025/06/04/building-a-real-time-dithering-shader/) ([demo](https://tympanus.net/Development/DitheringShader/)); [Codrops "Efecto" ASCII plus dithering (2026)](https://tympanus.net/codrops/2026/01/04/efecto-building-real-time-ascii-and-dithering-effects-with-webgl-shaders/); [Codrops, 160,000 cubes dithering explainer (2026)](https://tympanus.net/codrops/2026/04/01/animating-160000-cubes-in-three-js-to-visualize-dithering/); [Maxime Heckel, "The Art of Dithering and Retro Shading for the Web"](https://blog.maximeheckel.com/posts/the-art-of-dithering-and-retro-shading-web/) †; blue-noise textures from [Moments in Graphics](https://momentsingraphics.de/BlueNoise.html) †. → **Compression rule:** 1-pixel dithers turn to mush in X's H.264. Use cells of 3 px or more at 1080p, and keep the threshold pattern **object-locked** (advected), not screen-locked, to stop it crawling.
- **ASCII:** three.js `AsciiEffect` ([example](https://threejs.org/examples/#webgl_effects_ascii) †), plus Acerola's edge-aware ASCII (glyph orientation from the DoG gradient) †. → The Listener's "readout" views, with glyph density mapped to depth.
- **Temporal coherence (the #1 risk of rotoscope-style redraws):** (1) warp the previous *stylised* frame by flow and blend it with the new one (feedback), with a forward–backward flow check to reset occluded pixels; (2) hold characters **on twos** while the camera, particles and type run on ones (Spider-Verse, per [Creative Bloq](https://www.creativebloq.com/features/how-into-the-spider-verse-got-its-mind-blowing-look)); (3) a deliberate 8–12 fps "line boil" on the alien only, as its signature. Classic reference: Litwinowicz 1997, *Processing Images and Video for an Impressionist Effect* (optical-flow-moved strokes) **(mem)**. For keyframe-painted propagation see EbSynth / *Stylizing Video by Example* (Jamriška et al. 2019) **(mem)**.

### 5.2 Figures as points, constellations and splats
- **Image/video → particles:** [Codrops "Interactive Particles with Three.js"](https://tympanus.net/codrops/2019/01/17/interactive-particles-with-three-js/) (instanced quads per pixel, luminance threshold); [Codrops GPGPU "dreamy particles" (2024)](https://tympanus.net/codrops/2024/12/19/crafting-a-dreamy-particle-effect-with-three-js-and-gpgpu/) (position and velocity textures, spring back to target); [FBO particles](https://tympanus.net/codrops/2021/05/31/fbo-particles-with-three-js/). → **The Listener's body**: about 2–5k points sampled from her matte and unprojected by depth, plus about 120 "star" anchors at MediaPipe landmarks joined by **Delaunay or skeleton links** (a literal constellation figure). Curl-noise dissolve and recondense on her lines.
- **Splats:** [Spark](https://github.com/sparkjsdev/spark) (World Labs, MIT, three.js; PLY/SPZ/SPLAT/KSPLAT/SOG; per-splat colour edit and displacement; v2.0 Apr 2026 with streaming LoD) ([docs](https://sparkjs.dev/docs/overview/)); [GaussianSplats3D](https://github.com/mkkellogg/GaussianSplats3D) †. → A one-off "she exists in 3D" orbit around the Listener at the drop.
- **Point-cloud precedent:** [Radiohead House of Cards data and code](https://github.com/dataarts/radiohead).

### 5.3 Strokes and flow fields
- **Flow fields:** [Tyler Hobbs, "Flow Fields"](https://www.tylerxhobbs.com/words/flow-fields) † covers seeding, collision spacing and length rules. → Seed strokes where tone changes; flow = ETF ⊕ optical flow; each stroke lives N frames and then fades (birth/death keeps the density stable). These are the Beacon Keeper's "light on skin" strokes, and the sea in Verse 1.
- **Uniform-width lines from masks:** Jump Flood Algorithm distance fields ([Ben Golus, "The Quest for Very Wide Outlines"](https://bgolus.medium.com/the-quest-for-very-wide-outlines-ba82ed442cd9) †) give pixel-exact monoline engraving outlines at any width. This is essential for Direction A.

### 5.4 Text
- **SDF/MSDF text:** [troika-three-text](https://github.com/protectwise/troika) † (SDF from any .ttf/.woff at runtime, good for variable fonts via instances); [msdfgen](https://github.com/Chlumsky/msdfgen) † plus [three-msdf-text-utils](https://github.com/leochocolat/three-msdf-text-utils) †. Codrops: [MSDF with custom GLSL (2025)](https://tympanus.net/codrops/2025/02/03/building-an-on-scroll-3d-circle-text-animation-with-three-js-and-shaders/), [MSDF dissolve into dust and petals, WebGPU/TSL (2026)](https://tympanus.net/codrops/2026/01/28/webgpu-gommage-effect-dissolving-msdf-text-into-dust-and-petals-with-three-js-tsl/), [letters animated with shaders (2025)](https://tympanus.net/codrops/2025/03/24/animating-letters-with-shaders-interactive-text-effect-with-three-js-glsl/), [Kinetic Typography with Three.js (render-target text, 2020)](https://tympanus.net/codrops/2020/06/02/kinetic-typography-with-three-js/), [type leaving ghost trails (2026)](https://tympanus.net/codrops/2026/10/13/scroll-driven-ghost-trails/). → SDF thresholds give **free weight pulses on 808 hits**, outlines, glow masks (text as light source) and ink-dissolve.
- **Path-level type** (light-writing reveals and engraved numerals): [opentype.js](https://github.com/opentypejs/opentype.js) † to get glyph outlines, then animate a stroke-dash along them on canvas 2D or as a mesh line.
- **Animation:** [GSAP](https://gsap.com) † for type timelines (deterministic under a controlled clock); [Theatre.js](https://github.com/theatre-js/theatre) † for keyframing camera, light and type in a visual sequencer.

### 5.5 Fluids and ink (Arrival-like but our own)
- [PavelDoGreat WebGL-Fluid-Simulation](https://github.com/PavelDoGreat/WebGL-Fluid-Simulation) † (curl, pressure, dye, bloom) and [GPU Gems ch. 38, *Fast Fluid Dynamics on the GPU*](https://developer.nvidia.com/gpugems/gpugems/part-vi-beyond-triangles/chapter-38-fast-fluid-dynamics-simulation-gpu) †. → **Glyph-emitter ink:** inject dye along a glyph's SDF band with a small outward velocity; let it run 12–36 frames; then blend toward the crisp SDF so the lyric "condenses" out of ink. Use it for the alchemists' smoke, the depth-charge ink bursts and the alien glyphs. **Determinism:** fixed dt, seeded noise, no `Math.random()` without a seed, and simulate from a fixed pre-roll per shot.

### 5.6 Optics (order matters)
Tonemap → **bloom** (tight, high threshold) → **halation** (threshold, then a wide red-weighted blur added around highlights; human POV only) → **streaks** (separable 1D blur of highlights, *vertical* and blue-tinted as a PHM nod, or horizontal for the AI) → **chromatic aberration** (radial and tiny, impact frames only) → **grain** (luminance-dependent, applied in log space, 1.5–2 px, seeded per frame).
Links: three.js [UnrealBloomPass example](https://threejs.org/examples/#webgl_postprocessing_unreal_bloom) †; [pmndrs/postprocessing](https://github.com/pmndrs/postprocessing) † (Bloom, ChromaticAberration, Noise, LUT3D, ASCII); [3D Game Shaders for Beginners](https://github.com/lettier/3d-game-shaders-for-beginners) † (bloom, film grain, chromatic aberration, posterisation, with readable GLSL); [Inigo Quilez cosine palettes](https://iquilezles.org/articles/palettes/) † for red→gold colour-script interpolation.

### 5.7 Time effects
- **Slit-scan (2001 Stargate) and time displacement:** keep a ring buffer of the last 32–64 stylised frames in a texture array, and sample each output row or column from a different past frame. → Build section: "fire at the dark, at every star" smears stars into tunnels.
- **Flow datamosh:** stop updating colour and keep advecting the previous output by the current flow (P-frame bleed). → One deliberate moment: "ignored all previous instructions."

### 5.8 Deterministic headless rendering
- Control time yourself: override `requestAnimationFrame`, `performance.now` and `Date.now`, step frame by frame, and `await` texture loads before each capture. [timecut/timesnap](https://github.com/tungs/timecut) † do this virtual-time trick for Puppeteer; [CCapture.js](https://github.com/spite/ccapture.js) † is the in-page equivalent; [Remotion](https://github.com/remotion-dev/remotion) † (with `@remotion/three`) is a full frame-by-frame React option.
- Headless GPU: run Chromium with real GPU flags (ANGLE/EGL on Linux). SwiftShader works but is slow. Read back with `toDataURL`/`readPixels` or Puppeteer screenshots; prefer `readPixels` into a 16-bit pipeline when grading later.
- Learning resource: [The Book of Shaders](https://thebookofshaders.com) †.

### 5.9 Signature generative systems for this film
- **Phyllotaxis contact graph:** Vogel's model gives point *n* at angle `n · 137.50776°` and radius `c·√n`. Linking each node to *n+F_k* draws **F_k spiral arms** (parastichies), because indices that differ by a Fibonacci number sit close in angle. → On each drop numeral (13, 21, 34, 55, 89), light the corresponding arm family in gold. N = 610 = F15 (the treatment's number). Edges are drawn Lombardi-style as curved arcs.
- **12-sector alien chord glyph:** a circle of 12 pitch classes (Wolfram's 12 pie sections and PHM's chord-words share the same grammar). Segment brightness = per-beat `chroma_cqt` of the *actual* song, so the alien literally speaks the music. The count is encoded as dots per sector ring.
- **Arecibo-style bit grid:** 23 columns; numbers written in Arecibo's column encoding; each bit lights on a hi-hat.
- **Pioneer pulsar-map edges:** rays from Earth to each contacted world with binary tick marks encoding light-years.

---

## 6. Three visual-style directions

All three honour the treatment's rules (**red is fire, gold is light**; each intelligence has its own material; aperture → ring) and all are achievable with the redraw pipeline above. Fonts are free (Google Fonts / OFL).

### Direction A: **GOLDEN RECORD** ("engraved light") ★ recommended
**Description.** The whole film is drawn the way humanity wrote to the stars: **uniform-weight engraved lines glowing on black**, like the Pioneer plaque and the Voyager cover engraved in light. Faces and bodies are rendered as **intaglio engraving**: parallel flow-aligned lines whose width carries tone, the language of banknotes, which is fitting for a film about trust. Each intelligence has a line *behaviour*. The human is drawn in warm gold contour and engraving with soft halation. The AI starts as **steel-blue points and straight links** (a constellation on a diagram grid) and turns gold when she chooses. The Other is **stipple**: bioluminescent green and violet dots, front-lit only. Typography is Swiss and scientific. Numerals are engraved like plaque markings, with real binary ticks, pulsar-map rays and annotations that are all true. The drop is the plaque coming to life: the 610-world phyllotaxis drawn as a pulsar map, its Fibonacci spiral arms igniting on each shout. The last image is the Beacon Keeper and the Other side by side, hands raised, *in plaque style*.

**Palette**
| Role | Hex |
|---|---|
| Void | `#050608` |
| Deep space | `#0B1220` |
| Engraving gold (line) | `#D8A24A` |
| Hot gold (bloom core) | `#FFE3A3` |
| Archival paper (type on light cards) | `#EFE8DA` |
| Signal red (weapons, alarms only) | `#E5322D` |
| Steel (AI before choosing) | `#9DB4C8` |
| Other: biolum green / violet | `#7BE3B0` / `#8E7CF0` |

**Type.** [Archivo](https://fonts.google.com/specimen/Archivo) † (variable width up to 125 and weight up to 900: Expanded Black for count numerals and chorus cards, SemiCondensed for verse) + [IBM Plex Mono](https://fonts.google.com/specimen/IBM+Plex+Mono) † (annotations, binary, the AI terminal) + [Newsreader](https://fonts.google.com/specimen/Newsreader) † italic for the whispered intro and outro (Voice A's intimacy).

**Rendering.** ETF → FDoG contours → JFA uniform-width lines; flow-advected **phase-field engraving** (luminance → line width); stipple for the Other; points and links for the Listener; tight bloom and *vertical* streaks; minimal grain only on human shots. Background starfields with 4-point diffraction spikes. Characters are held on twos, the type on ones.

**Hook (0–3 s).** Black. A gold engraved circle draws itself in one stroke (the aperture), and a red reticle settles inside on a pale dot. "1" engraves itself in Archivo Expanded; a binary tick `1` appears on a pulsar-map ray. Readable in silence: *something is aiming at something that counts.*

**Why it fits.** It's literally the lyric "message in a bottle" and the history of human contact attempts. It is engineering-grade and true, which this audience respects. Gold on black is the highest-contrast, most phone-legible scheme there is. Engraved lines read as *drawn* and never as AI. And it's ownable: nobody has done plaque engraving at music-video scale.

**Risks.** (1) Line art can go cold and diagrammatic. Mitigate with close faces in dense engraving, warm halation on the human and breath fog. (2) Thin lines alias and drop out after X compression. Keep minimum line width at 2 px at 1080p with a bloom halo, and export a test at X bitrates early. (3) Engraving "swims" if the phase isn't advected. Budget engineering time for flow-advected phase and occlusion resets. (4) Over-explaining with diagrams. Cap it at one annotation cluster per shot.

### Direction B: **FOG & INK** ("the forest is painted")
**Description.** A warm-grey world of sea fog and paper. Figures **emerge from fog as painted forms** (anisotropic Kuwahara, small radius on faces), edged with **woodcut-like ink** (XDoG). The lyrics are *written in ink*: each line blooms from a fluid sim along its glyph SDF and then condenses into crisp type. Red appears only as **vermilion seal-stamps**: the reticle is a red seal circle and the "FIRE" orders are stamped. Gold appears as **gold leaf**, and the bridge's chain-links become hands joined with **kintsugi gold seams** (broken, repaired, stronger). Verse 2's alchemists use ink smoke and the characters 硫 (sulfur), 硝 (saltpeter) and 火药 (gunpowder, literally "fire medicine"), so the elixir *becomes* fire medicine. The Listener's lines cut through the ink as cold monospace tokens. The alien speaks in ink-dot chord circles.

**Palette**
| Role | Hex |
|---|---|
| Fog | `#D5D2CC` |
| Warm paper | `#EAE6DF` |
| Graphite | `#34343A` |
| Sumi black | `#0D0D10` |
| Vermilion seal (fire) | `#D23B2A` |
| Gold leaf / highlight | `#C8A24C` / `#F3DFA2` |
| AI ice | `#A9D8E6` |
| Other: lunar green / violet | `#9ED9B0` / `#7D6BD8` |

**Type.** [Fraunces](https://fonts.google.com/specimen/Fraunces) † (opsz 144, SOFT 50–100 for ink-soft display; WONK off) + [Martian Mono](https://fonts.google.com/specimen/Martian+Mono) † (the AI's voice) + [Noto Serif SC](https://fonts.google.com/noto/specimen/Noto+Serif+SC) † (Verse 2 characters, the seal text).

**Rendering.** Depth-driven exponential fog with advected 3D noise; anisotropic Kuwahara (radius from depth and face mask); XDoG ink edges; a paper multiply; a **glyph-emitter fluid sim** for lyrics, smoke and depth charges; a gold-leaf flake shader (sparse specular noise) for anything gold; red seals as hard-edged SDF stamps with a stamp-ink texture.

**Hook (0–3 s).** White fog. On the whisper "one", a single ink drop falls into the centre and blooms into a ring. "One": a second ring. "Two": two drops. By "eight" the rings have interlocked into a red seal-reticle, and on the last drop it cracks and refills with gold leaf. It's beautiful and contemplative, but slower than A or C.

**Why it fits.** "A chord that's searching through the fog" and the near-silent bridge are this direction's home turf. The Tang alchemists and 3 Body's Chinese roots get respectful, specific visual language. Painterly and handmade is the strongest anti-slop signal, and kintsugi lands the thesis "fear's a chain… every link's a hand" in one image.

**Risks.** (1) **Arrival pastiche**: keep ink *dots and seals* rather than tendrilled rings, and never put ink on a glowing white screen. (2) Grey frames underperform in a bright feed. Force gold bursts and full-black ink cards at every chorus and count. (3) Kuwahara is the 2025 shader-demo filter of choice. Vary it per character and depth so it doesn't read as one Instagram filter. (4) Fluid sims are costly and nondeterministic unless they're seeded with a fixed dt. (5) Chinese visual vocabulary used as decoration: get a Chinese-literate reviewer for the characters and seal text.

### Direction C: **PETROV TEST** ("sensor vision")
**Description.** Every shot is seen *through an instrument*, and the film's emotional arc is learning to see through someone else's. The **human POV** is film: warm, grainy, halated. The **AI POV** is a 1-bit dither at visible cell size (Obra Dinn-like), with edge wireframes, detector boxes and perfectly typeset mono labels ("PATTERN? 0.31 → NOT NATURAL 0.99"). The **alien POV** is **false-colour infrared**, as if the IR-cut filter were removed (PHM's Astrophage, Dune's Giedi Prime, Ad Astra's moon): foliage white-hot, skies black, lights magenta. History inserts are coarse newsprint halftone. Petrov's verse lives on the Oko console with its red "LAUNCH" (СТАРТ) panel and five tracks. The head-locked dot-matrix counter (the 3BP inversion) climbs throughout. **The drop is "sensor fusion"**: luminance from one sensor and colour from another (Ad Astra's IR/film trick), so the three POVs merge into one full-colour, painterly image for the first time. We *see the Other as the Beacon Keeper does*, and the reverse. Empathy is literally switching sensors.

**Palette**
| Role | Hex |
|---|---|
| IR black | `#040404` |
| IR white-hot | `#FFF4E0` |
| Alien IR magenta | `#E0407A` |
| Alarm red (Oko "LAUNCH") | `#FF2A1F` |
| Terminal amber (human instruments) | `#FFB000` |
| Dither paper | `#E6E1D3` |
| Sonar green (1962 only, desaturated) | `#5BE39A` |
| Night navy | `#0A1024` |
| Fusion gold (drop payoff) | `#FFC247` |

**Type.** [Doto](https://fonts.google.com/specimen/Doto) (a dot-matrix variable font on a 6×10 grid with dot-size and roundness axes, OFL; [Fontsource](https://fontsource.org/fonts/doto/about)) for the retina counter and numerals + [Departure Mono](https://departuremono.com) † (OFL pixel mono by Helena Zhang, [Daring Fireball](https://daringfireball.net/linked/2024/09/03/departure-mono)) for the AI terminal and system prompt + [Barlow Condensed](https://fonts.google.com/specimen/Barlow+Condensed) † (instrument-panel grotesk, DIN-like) for the huge stacked lyric lines.

**Rendering.** Per-matte "sensor" shaders. Film = halation plus grain. AI = error-diffusion or blue-noise ordered dither, object-locked at ≥3 px cells, plus Sobel/XDoG wire. Alien = IR LUT (luminance → black-magenta-white ramp) plus a vegetation boost from a segmentation class. Archival = 2-ink halftone. Datamosh on "ignored all previous instructions". The fusion pass blends L from one sensor with chroma from another, then cross-fades to a fully painted frame (Kuwahara-light).

**Hook (0–3 s).** A 1-bit dithered starfield. A detector box snaps around a pale dot: `TARGET 0.99`. A Doto counter reads `00000001`. Whisper: "one". The dot pulses and the label flips to `PATTERN? 0.31`. On "eight": `NOT NATURAL 0.99`, and the box turns from red to gold. It reads completely with the sound off.

**Why it fits.** It speaks this audience's native visual language (sensors, detectors, terminals, dither, Petrov Day) and makes the AI's moral choice legible as an *interface event*. It has the highest clip-ability and contrast. The fusion drop is a conceptual payoff people will explain in quote-tweets.

**Risks.** (1) Closest to the 2025–26 dither/ASCII web trend, so it could read as a SaaS landing page or a shader demo. Typeset like Territory, never like a template. (2) **Compression**: dither noise starves X's bitrate. Use large cells, limit dithered area, and test early. (3) Detector-box UI is a surveillance cliché (Person of Interest, Watch Dogs). Use it once per act, with real-looking model outputs. (4) Coldness: the human sections must be very warm, and the fusion payoff has to be earned with long, held faces.

### Recommendation
**Lead with A (GOLDEN RECORD) as the house style** and borrow sparingly from the others. Take B's **ink** for the alien glyph's bloom and the bridge's held shot. Take C's **AI sensor POV** for Verse 2 and the "ignored all previous instructions" beat. One renderer, three *materials*, one colour law. If the team wants the most viral and the least emotional option, choose C. If it wants the most beautiful and the slowest, choose B. Lock the decision with a **10-second test on the same Seedance shot in all three styles** (frame 0 → "8"), exported at X bitrate and viewed muted on a phone.
