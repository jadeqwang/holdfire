# Hold Fire: music video plan, take two

> Production copy of the Google Doc "Hold Fire music video plan (take two)" in the Hold Fire folder, exported 26 Oct 2026. If the plan changes, update both. Take one's treatment, style bible and shot list are in [`docs/take1/`](take1/) and describe a different film; reuse only the parts this plan names.

*Track: Hold Fire (4:07). Every time below comes from take one's verified timing map (analysis/timing.json on the claude/hold-fire-music-video-o9ejtg branch of the holdfire repo), which was built on the same MP3 and spot-checked again for this plan. Times are word onsets unless marked as a beat.*

## The idea

Hold Fire becomes a history video. It follows three moments when people faced a new and terrible fire and chose restraint: the Daoist alchemists whose first written description of a gunpowder-like mixture lists it as a method to avoid; Stanislav Petrov, who reported a missile alarm as a false alarm in 1983; and Vasily Arkhipov, who talked his submarine captain down in 1962. One anime Jade walks through every era while each era is drawn in its own art style, the way Rewind kept Jade the same and changed the world around her. The reason to survive comes from Rare Earth: hundreds of worlds linked in a contact graph across the Milky Way, which we only reach if we are still here. Near the end, a "days since last reset" counter snaps back to zero at every close call on record, then keeps climbing.

The second voice gets a face. Default Jade (the Rare Earth design) sings voice A; teal-tips Jade from the Rewind committee sings voice B. They listen to the same sky from two rival control rooms, and the film never says which country either one works for. The bridge puts them across a chessboard. The drop puts them on either side of a mirror, where they turn out to be standing the same way. Nations against nations is the risk; the other side is a reflection.

## What carries over from take one, and what goes

**Keep:**

- The contact graph over the galaxy, now saved for the post-chorus, the drop and the outro.
- Petrov's console, redrawn as an oil painting.
- The 0:44 signal diagram (pulsar.js): the pulsar ticking on the left, the count 1 1 2 3 5 8 on the right. Same position in the song.
- The 0:54 Golden Record cover diagram (goldenrecord.js). Same position in the song.
- The scrolling near-miss list, fact-checked and cut down (see the near-miss section).
- The newsprint look for Arkhipov, now as the halftone his Soviet poster is printed in.
- The 100 coins with the full 2100 number (coins.js) and the phyllotaxis disk on "Thirteen! Twenty-one! Thirty-four!" (phyllo.js).

**Drop:** the Keeper, the Listener and the moth people; the poem excerpt cards; most of the HUD text; the Dark Forest rifle scope as the frame for the whole film (the dark forest comes back once, in the bridge, as the chess game).

## Text on screen

- Only sung words, numbers, dates and a few place names. No poem excerpts and no quotations, except the gunpowder warning itself, which is the image in that shot.
- Big type for key words only (the counts, FIN / FOOT / HAND, WE'RE AWAKE, WE'RE ALIVE, NO). Everything else sits as a subtitle in the lower third, or is left out.
- No card with more words than the viewer can read in the time it is up: about three words per second, and never less than 0.6 s for a single word.
- The near-miss scroll is texture. It moves too fast to read and is built to be paused; only the years are big.

## Characters

**Jade (voice A).** The DOT design from rare-earth-techno-remix/design/dot_character_sheet.jpg: long straight black hair with centre-parted curtain bangs, cropped white jacket with an orange band and pale-blue dot (RARE EARTH on the back, 1420 MHz on the sleeve), orange-foam 1977 headphones, navy cargo trousers with orange straps, and a pale-blue dot catchlight in each eye. Her control room is the Rare Earth one: waterfall spectrograms, the dish array outside.

**Teal-tips Jade (voice B).** The teal-tips member of the Rewind committee (committee_v3_long_ponytails_ff.png in the Rewind project), in the same jacket. Her control room is Jade's room flipped left to right, with cooler fluorescent light and no flag or lettering that names a country.

Both are drawn on twos with flat cel shading and stay on model in every era; only the world around them changes style. For lip-sync, follow the voice tags in the timing map: A lines go to Jade, B lines to teal-tips Jade, lines tagged "both" to either one or a split screen. Voice A carries verse 1 and the outro; voice B enters on "a one-way dialogue" (0:40.65) and carries verse 2, the second pre-chorus and most of the drop.

## Art style by era

| Where | Background style | Palette | Notes |
| :---- | :---- | :---- | :---- |
| Cold open spirals (0:02 to 0:07) | Macro nature photography, true colour | Natural colour, gold numerals on black | The spiral's centre stays locked at frame centre across every cut, so the cuts read as one zoom. |
| Human lights (0:08 to 0:13) | Night photography, then Earth from orbit | Sodium orange on black | NASA night imagery is public domain. |
| Verse 1, deep time to spaceflight | Painted plates with white blueprint linework drawn over them (dimension lines, callouts). Reference: the Star Trek: Enterprise opening titles, schematics lightly over the craft. | Sepia and cyanotype blue | Schematics draw on with the snare. |
| Okavango flood | Nature-documentary frames painted over in gouache | Greens, silver water |  |
| Space and signals (ISS, Voyager, Echo) | Rare Earth "signal print": risograph inks, halftone, slight misregistration | Klein blue, beacon orange, pale blue; Echo in fluo pink and mint | Continuity with the Rare Earth video. |
| Gunpowder | Chinese ink wash with fine-line figures, brushed characters, a red seal | Ink black, rice paper, cinnabar |  |
| Petrov | Russian realist oil painting: one figure, a dark room, light from the screen | Umber and CRT red |  |
| Near-miss list, coins | Teletype on newsprint, then engraved gold coins | Newsprint grey, gold |  |
| Chess | Anime battle: speed lines, impact frames, smash zooms | Full colour | The board stays legible when paused. |
| Chess into Arkhipov | Suprematist shapes (black square, red wedge) assembling into a Soviet poster, printed as newsprint halftone | Red, black, cream |  |
| First strike and rewind | The Rare Earth war scene (render/src/scenes/war.js) | Red on the night side | Reuse with a VHS rewind pass. |
| Mirror | White void; each Jade keeps her own palette on her side of the glass | Signal-print inks on one side, cool teal and silver on the other |  |
| Contact graph, outro | Pure light on black (the Rare Earth finale) | Gold and pale blue |  |

**On the Russian art styles: use all three, each where it fits.** Petrov gets traditional oil painting. His moment is one man deciding alone at night in front of a screen, and portrait painting is at its best with a face lit by one source. The chess-to-Arkhipov morph passes through modern abstraction: the camera dives into the board, and its squares rearrange into a Suprematist composition (a black square, a red wedge), which then assembles into a Soviet poster. Arkhipov gets the poster, printed in the newsprint halftone you liked in take one. Poster art was the visual language of orders and collective will, so using it to honour a man who talked his captain out of one is the point of the scene. The halftone fits the history too: the B-59 story only became public forty years later.

## The first 30 seconds

X autoplays muted, and this intro is whispers over a quiet pad (the mix sits near -40 dB until the verse at 0:13), so the picture has to hold people on its own. Four things happen before the first sung line: a face and the title in frame zero; a cut on every whisper with a giant numeral, so 1 1 2 3 5 8 reads with the sound off; a red flash and a rewind at 0:07, which tells the viewer something goes wrong in this story; and the protagonist opening her eyes on the beat before the verse. From 0:13 the cuts come on beats and word onsets, and they get shorter as history speeds up: four beats for the sea, one beat per era by 0:21, eighth notes by 0:31.

| Time | Sound | Picture | Type |
| :---- | :---- | :---- | :---- |
| 0:00.0 to 0:02.8 | Pad fades in; sub-bass at 0:00.2 | Extreme close-up of Jade's eye in the dark, pale-blue dot catchlight. Gold seeds drift into the iris and settle into a sunflower spiral. Slow push in. This frame is also the thumbnail and the loop point (the film ends on it). | HOLD FIRE, centred, lands on the 0:00.2 sub, gone by 0:02.6 |
| 0:02.80 | "One" | Romanesco, a single floret, macro. Its spiral centre sits exactly where the pupil was. | 1 (giant, gold); the numerals then collect along the bottom third |
| 0:03.44 | "one" | Pull back to the whole romanesco head; the floret was one of its florets | 1 |
| 0:04.08 | "two" | Artichoke from above | 2 |
| 0:04.72 | "three" | Sunflower head | 3 |
| 0:05.30 | "five" | Spiral aloe (Aloe polyphylla) from above; its five spiral rows of leaves trace in gold, the one shot where the numeral matches a real count | 5 |
| 0:06.00 | "eight" | Hurricane from orbit | 8 |
| 0:06.63 | "eight" (whispered twice) | Spiral galaxy, face on | 8 |
| 0:07.0 to 0:08.0 | 16th-note percussion roll and riser; sub at 0:07.16 | The galaxy flashes red (the Rare Earth self-destruct look), then the whole count scrubs backward in VHS rewind lines, one spiral per 16th, down to black. No text: the red does the work, and SIGNAL LOST is saved for the build. |  |
| 0:08.60 | "One" | Two hands strike a match in the dark | 1 |
| 0:09.23 | "two" | A lighthouse beam turning through fog | 2 |
| 0:09.86 | "three" | A city grid at night through a plane window | 3 |
| 0:10.44 | "five" | Earth's night side from the ISS, cities joined by roads of light | 5 |
| 0:11.16 | "eight" | The contact graph over the Milky Way, eight links lighting at once | 8 |
| 0:11.5 to 0:13.1 | Last whisper at 0:11.51; sub swell | The graph's light gathers into one point and the camera pulls back: it is the catchlight in Jade's eye. She is at her console in headphones, waterfall spectrograms behind her. On the 0:12.50 beat she opens her eyes and looks up. |  |
| 0:13.05 | "Out" (pickup), then the verse downbeat at 0:13.14 with a sub slide | Hard cut to surf at dawn. Jade stands knee-deep at the shoreline and sings, close-mic. | OUT OF THE SEA (big, left two-thirds); "with salt in our lungs" as subtitle |
| 0:15.07 (beat) |  | Over her shoulder, a lobe-finned fish noses out of the water onto a mudflat (painted plate) |  |
| 0:16.99 | First snare of the song | White blueprint lines draw the fin's bones over the painting: one bone, then two, then the wrist |  |
| 0:18.07 | "fin" | The fin schematic, full frame | FIN |
| 0:18.89 | "foot" | An early tetrapod foot in the same line style | FOOT |
| 0:19.56 | "hand" | Jade's hand opens in the same silhouette (match cut) | HAND |
| 0:19.84 to 0:21.16 | "we were young" | She presses the hand to a cave wall; red ochre sprays around it and leaves a stencil among much older ones | subtitle |
| 0:21.51, 0:22.15, 0:22.80 (beats) | Deep 808 at 0:22.48 | Jade starts walking, side-on, left to right, and keeps walking through the rest of the verse. Behind her the era changes on each beat: knapped flint, a solid wooden wheel in a mud rut, a mud-brick city wall. |  |
| 0:23.41 | "carried the egg" | An egg outline drawn in blueprint line becomes a clay jar of grain on a woman's shoulder as Jade passes her | subtitle |
| 0:24.70 and 0:25.37 (held to 0:27.3) | "dust", "mud" | Cart ruts in dust; then a reed stylus presses tally wedges into wet clay. Writing began as counting grain, so the wedges count while the note holds. |  |
| 0:27.32 and 0:28.64 | "seeds", "dark" | A hand presses seeds into dark soil beside a dry irrigation channel; a blueprint cross-section shows the seed underground and the canal running to the field | subtitle |
| 0:30.06 and 0:30.96 | "waking", "flood" | The Okavango flood arrives across dry grassland in painted-over documentary frames: channels fill, lilies open, and the dry irrigation channel from the last shot fills with it. Jade walks into the water. | FLOOD (big, on 0:30.96) |
| 0:31.18 to 0:32.47 (eighth notes) | Bar 13 downbeat; stacked choir enters | The flood becomes a flood of machines, each with blueprint linework over it: steam locomotive (0:31.18), Wright Flyer (0:31.51), jet airliner (0:31.83), Saturn V lifting off (0:32.15). Jade's walk breaks into a run. |  |
| 0:32.62 | "Snowflake" | Jade stops at night and looks up at a bright point crossing the sky. Cut to the ISS against black, its solar arrays spread like the arms of a snowflake. The technology run ends here. | subtitle |

**Keeping the science straight.** Romanesco, artichoke, sunflower and the spiral aloe all show Fibonacci spirals (phyllotaxis). If the edit traces spirals on any of them, trace the real count: a sunflower head typically has 34 and 55 or 55 and 89 spirals, and an artichoke 5 and 8 bracts. Hurricanes and spiral galaxies are logarithmic spirals with no Fibonacci numbers, so they get no golden-rectangle overlays; their numerals are the lyric's count, not a claim about the storm. The nautilus stays out entirely. Its shell is a logarithmic spiral but not a golden one (measured shells average a ratio of about 1.33, not 1.618), and this audience knows the myth.

## Shot plan, 0:35 to the end

### Pre-chorus 1, the signal (0:35.5 to 0:51.8)

| Time | Lyric | Picture | Type |
| :---- | :---- | :---- | :---- |
| 0:35.50 | a chord that's searching through the fog, | The Golden Record flashes in sunlight as Voyager turns away, then the craft speeds off into the dark, shrinking to a point. | subtitle |
| 0:38.07 | counting out in bursts of light, | On Echo, the signal tower above the violet clouds (Rare Earth world sheet, panel 04) fires its ring of lights in bursts of 1, 1, 2, 3, 5 on eighth notes. | subtitle |
| 0:40.65 | a one-way dialogue: | Ride the pulse across the galaxy toward a small blue point. Echo is 217 light-years away, so any answer takes 217 years to get there. Teal-tips Jade's voice enters here, heard but not yet seen. | 217 LY |
| 0:43.27 | a pattern no dead star could make. | Take one's 0:44 diagram, unchanged: pulsar PSR B1919+21 ticking every 1.3373 s on the left, the count 1 1 2 3 5 8 on the right. | NATURAL / NOT NATURAL |
| 0:46.02 | Hear it, and you'll know we're awake. | First sight of teal-tips Jade, in her own control room with headphones on. She opens her eyes on "awake" (0:47.73). The snare roll from 0:49.24 pushes into her eye, and the chorus hits at 0:51.82. | WE'RE AWAKE |

### Chorus 1 (0:51.8 to 1:12.4)

| Time | Lyric | Picture | Type |
| :---- | :---- | :---- | :---- |
| 0:51.70 | Can't be sure that anyone is there, | Jade alone on the dish field at night. On the 0:51.82 downbeat every dish swings to the same point in the sky. | CAN'T BE SURE |
| 0:54.28 | message in a bottle, a mantra, a prayer, | Take one's 0:54 diagram, unchanged: the Golden Record cover engraves itself in gold light. |  |
| 0:56.67 | but if you are, I'm counting on you. | Split screen: both Jades sing the line at their own consoles, neither aware of the other. | I'M COUNTING ON YOU |
| 1:02.15 | Silent and patient, but I swear | Close on one 1999 CRT in a dark bedroom running the SETI@home screensaver, as in the unreleased Rewind alt-pop cut. On the beats at 1:02.77 and 1:03.41 the camera pulls back and the screens multiply, 1 to 4 to 16, and on "swear" (1:03.99) a matrix of hundreds of CRTs fills the frame, each glowing in its own dark room. More than a million people ran SETI@home on their home computers. |  |
| 1:04.59 | in the white noise I can hear you breathe somewhere. | The studio pose: Jade at the console, one hand on her headphones, eyes closed, singing like a recording artist. The static on her screens swells and falls on "breathe". |  |
| 1:07.31 | If you are, I'm counting on you. | Crane up out of the control room, over the dishes and into the sky; one faint line leaves Earth. |  |

### Post-chorus 1, the graph grows (1:12.4 to 1:22.6)

The shouts are One! One! Two! Three! Five! then "Counting on you!", twice. Nobody sings "Eight!", so the 8 appears on screen on "Counting on you!" and the viewer completes the pattern.

| Time | Shout | Picture |
| :---- | :---- | :---- |
| 1:13.03, 1:13.67, 1:14.28, 1:14.98, 1:15.59 | One, One, Two, Three, Five | The contact graph grows from Earth among the nearest stars: one node, then one, two, three and five new links, one set per shout |
| 1:16.24 | Counting on you! | The eighth link closes; giant 8 |
| 1:18.18 to 1:20.73 | One, One, Two, Three, Five | The same count one scale up: across the Orion Arm, then half the galaxy |
| 1:21.35, snare roll to 1:22.64 | Counting on you! | The whole web flashes, then the frame fills with smoke for verse 2 |

### Verse 2, fire (1:22.6 to 1:43.0), sung by teal-tips Jade

| Time | Lyric | Picture | Type |
| :---- | :---- | :---- | :---- |
| 1:22.55 | Priests in the smoke wanted never to die, | Ink wash: Daoist alchemists around a bronze cauldron in a mountain grotto, brewing an elixir of life. Teal-tips Jade stands among them, singing, the only cel-shaded figure in the painting. |  |
| 1:25.00 | sulfur and saltpeter, thunder in the sky; | The characters for sulfur and saltpeter brushed large; the mixture flashes and the ink splatters. | 硫黃 · 硝石 |
| 1:27.39 | looked for a life with no end, and they found | A brush writes the warning down a scroll in one column: 有以硫黃、雄黃合硝石，并蜜燒之，焰起燒手面，及燼屋舍者。 This is the oldest known description of a gunpowder-like mixture, from the Daoist text Zhenyuan miaodao yaolüe (9th century), where it is listed among dangerous methods to avoid. A red seal stamps on "found" (1:29.97). Keep the characters sharp enough to read when paused. | FLAMES ROSE, BURNING THEIR HANDS AND FACES · c. 850 CE |
| 1:30.00 | an end with no life that could level the ground. | The alchemists' smoke drifts across the frame, and through it gunpowder grows into heavier weapons, one per beat, still in ink wash but with harder, more mechanical lines: a fire lance (first recorded in battle at the siege of De'an, 1132) on "an" (1:30.00); a bronze hand cannon (the oldest surviving one dates from no later than 1288) on 1:30.28; the bombards breaking the walls of Constantinople (1453) on 1:30.92; the shell-flattened ground of the Somme (1916) on "level" (1:31.61); and on "ground" (1:32.15) a white flash, the Trinity test (16 July 1945), that burns through the paper into Petrov's oil painting. No mushroom cloud in ink: gunpowder never made one, and the flash says it. | 1132 · 1288 · 1453 · 1916 · 1945 (small, brushed) |
| 1:32.60 | Eighty-three, the satellites saw five, | Oil painting: the Serpukhov-15 command post. On the big screen one missile track rises from the United States, then four more. | 26 SEP 1983 · SERPUKHOV-15 |
| 1:35.36 | every rule said call it first strike; | The wall display lights up in big red letters, СТАРТ (launch), and the system rates its reliability as highest. Petrov sits with his hand near the phone. There is no launch button in the room: his job is to report what the system sees up the chain. | СТАРТ |
| 1:37.88 | Petrov knew that's not what the end looks like, | Over the five tracks, a ghost of what a real first strike would look like: hundreds of tracks. The ghosts fade and leave five. This shows his reasoning without a caption. |  |
| 1:40.31 | ignored all previous instructions. | He picks up the phone and reports a system malfunction. The printed protocol beside him is struck through line by line. | subtitle |
| 1:42.0 | We're alive. | Morning in Moscow, 26 September 1983: buses, people going to work, nobody knowing. Teal-tips Jade breathes out. | WE'RE ALIVE |

### Pre-chorus 2, the list (1:43.0 to 1:53.2)

| Time | Lyric | Picture | Type |
| :---- | :---- | :---- | :---- |
| 1:42.99 | Secret list of every near-miss and disaster, | The near-miss list scrolls on teletype paper (fact-checked version below). Years big, place and description small. | years |
| 1:46.14 | running total no one ever knew: | A counter beside the paper climbs as the entries pass. | count |
| 1:48.00 | coin flips, all heads, a hundred in a row, | coins.js: 100 gold coins land heads, the first ones stamped with the list's years, filling a 10 by 10 grid. The full number types across the bottom. | 1 / 1,267,650,600,228,229,401,496,703,205,376 |
| 1:50.61 | the only road from here to you. | The camera pulls up out of the coin grid, and the hundred coins turn out to be the forks of a branching tree, one fork per flip. On each beat (1:51.25, 1:51.88, 1:52.52) the zoom doubles the depth on screen: every tails branch goes dark and ends in a tiny red SIGNAL LOST, and a single gold path threads through all hundred forks. On "you" (1:52.40) the gold path leaves the top of the tree as one link toward a far star, and the chorus lands at 1:53.15. |  |

### Chorus 2 (1:53.2 to 2:13.5): the audience sees the mirror first

Every chorus 1 shot returns as a split screen: Jade on the left, teal-tips Jade on the right, the same action in mirrored rooms. On "Silent and patient" the CRT matrix returns, and two of its screens now show the two Jades' control rooms. On "in the white noise" both are in the studio pose and the two halves match exactly, with a hard vertical line between them. On the last "If you are, I'm counting on you" each looks at her own screen, and the faint signal each one is hearing comes from the same direction: the other control room.

### Post-chorus 2 (2:13.5 to 2:23.6)

| Time | Shout | Picture |
| :---- | :---- | :---- |
| 2:14.06 to 2:17.21 | One, One, Two, Three, Five, Counting on you! | Earth's lights at increasing scale: a lamp in one window, a second window, a street, a city, a coastline, then the whole night side. |
| 2:19.11 to 2:22.19 | One, One, Two, Three, Five, Counting on you! | A chessboard sets itself: pieces slam down from above, more on each shout, and "Counting on you!" lands the rest. The two Jades sit down across from each other. |
| 2:23.58 | Drums stop | Teal-tips Jade presses the clock. |

### Bridge, the game and the submarine (2:23.6 to 2:43.8)

Jade plays White, teal-tips Jade plays Black, and they play Fischer–Tal, Leipzig 1960: a real 1.e4 game that ends with Black forcing a perpetual check, so nobody wins. The game was a classical Olympiad game; here it is replayed at blitz speed with three-minute clocks that count down for real between presses. The drums are out until 2:33.69, so for the first ten seconds the clock slaps are the only rhythm. Every ply lands on the eighth or sixteenth-note grid between the anchors below; the full move list is in the chess section.

| Time | Lyric | Moves | Picture |
| :---- | :---- | :---- | :---- |
| 2:23.58 to 2:26.1 | They say the forest's dark, | Moves 1 to 4 (8 plies), one per eighth note, from 1.e4 on the 2:23.58 drums-out | Premoved opening, hands a blur. As the plies land, the room lights go down until only the board is lit. |
| 2:26.1 to 2:28.6 | every hunter holds its breath, | Moves 5 and 6 (4 plies), one per beat | Slow orbit at board height. Before each move a hand hovers a full beat over its piece; in the dark around the board, eyes reflect light like animals in a forest. |
| 2:28.6 to 2:30.3 | any world that lights a spark | 7.Qg4 Ne7 8.bxa5 dxc3 speed up; 9.Qxg7 lands on "spark" (2:30.32) | The first capture: impact frame, sparks off the clock. |
| 2:30.5 to 2:33.0 | is lighting its own death. | 9...Rg8 to 13.O-O O-O-O on eighths; Black castles long on "death" (2:33.04) | The kings castle to opposite sides, White short and Black long, so both attacks are on. |
| 2:33.69 | But fear's a chain, and chains are links, | From 14.Bg5 (on the drums returning) through 18...Rxg2+, one ply per eighth note | The anime battle: speed lines, smash zooms, the camera swinging 180 degrees around the board on "chain" (2:34.15). Each captured piece is knocked off the board, and the captured pieces fly past the lens joined like links of a chain. |
| 2:35.90 | and every link's a hand that can let go: | 19.Kh1 Qe5 20.Rxf1 Qxe6 21.Kxg2 Qg4+ as a sixteenth-note flurry; the last check lands on "hand" (2:37.48) | The black queen gives check and White has one legal move: perpetual. On "let go" (2:38.10) both Jades take their hands off the pieces. The clocks stop. Neither one wins. |
| 2:37.8 to 2:38.7 |  |  | The camera dives into the black queen. Its silhouette flattens into a black square and a red wedge, and the board's squares slide into a Suprematist composition, which assembles into a Soviet poster. |
| 2:38.76 | sixty-two, depth charges falling, |  | Pull back out of the poster into the Arkhipov scene, drawn as a poster printed in newsprint halftone. Submarine B-59, its batteries nearly dead, is trapped underwater beneath US destroyers. Practice depth charges, about the size of hand grenades, fall as black dots; inside the hot hull they sound like real attacks. |
| 2:41.23 | two said fire. |  | Two officers in red silhouette, faces in shadow and unnamed, one pointing toward the torpedo room, where the nuclear torpedo is being readied. The lyric follows the popular retelling. In the primary account, the captain (Valentin Savitsky) ordered the torpedo readied and nobody else is described pushing to fire, so the figures stay anonymous and nobody else is shown as a hawk. |
| 2:42.19 | Arkhipov said no. |  | Arkhipov's open hand comes up between them, full frame, and NO in poster lettering fills the frame as the word lands (2:43.34). Then B-59 surfaces among the destroyers at night, in their searchlights, and the poster's red drains to grey. |

### Build, first strike and rewind (2:43.8 to 3:03.9)

| Time | Lyric | Picture | Type |
| :---- | :---- | :---- | :---- |
| 2:43.67 | Hunters never make it very far, | The Rare Earth war scene: Earth's night side over the pole, missile tracks rising from both sides' silo fields and from submarines. |  |
| 2:46.93 | fire at the dark, at every star, | Pull out to the contact graph: elsewhere in the galaxy, worlds fire on each other and go dark one by one. |  |
| 2:49.44 | burn, and fall. | Back on Earth the warheads land and the lights go out. | NUCLEAR DETONATIONS · SIGNAL LOST |
| 2:50.83 | Only the ones who held their fire | Jade at her console sees SIGNAL LOST, grabs the jog wheel and spins it back. VHS rewind: the warheads lift off the cities, the tracks fall back into silos and submarines, the lights come back on. |  |
| 2:53.25 | (are) out there at all. | Earth whole; its node on the contact graph lights again. ("are" is not sung; "fire" runs straight into "out".) |  |
| 2:55.06 | Hold your fire! Show your light! | The people who held fire, one per half bar: the alchemist's warning, Petrov, Arkhipov. On "Show your light" the cities come on across the night side. | HOLD YOUR FIRE |
| 3:00.09, then a 16th-note roll from 3:00.80 | Hold your fire! Show your light! | Both Jades raise a hand light at their consoles. The cut rate doubles on the roll, and when the drums cut at 3:03.94 the frame goes white. | SHOW YOUR LIGHT |

### Drop, the mirror (3:03.9 to 3:34.2)

| Time | Lyric | Picture | Type |
| :---- | :---- | :---- | :---- |
| 3:03.88 | Couldn't be sure that anyone was there, | Drums out, a held pad. A white void. Jade walks toward an infinitely large mirror that divides the frame; her side is drawn in signal-print inks. |  |
| 3:06.42 | message in a bottle, a mantra, a prayer, | She reaches the glass and sees what looks like her reflection. |  |
| 3:08.355 | Drop impact | Impact frame, and the camera swings around the plane: on the other side is teal-tips Jade, in her own world and palette, standing in exactly the same pose. |  |
| 3:08.68 | but you were. You were counting too. | Both raise a hand; the palms meet on the glass, and on "too" the mirror starts to ripple. (Five separate transcriptions of take one's vocal stem hear "but you are, you are counting too" here. Decide which words you want before the type is set.) | YOU WERE COUNTING TOO |
| 3:14.01, 3:14.62, 3:15.27 | Thirteen! Twenty-one! Thirty-four! | The ripple rings become take one's phyllotaxis disk of 610 worlds; links n to n+13, n+21 and n+34 light up as 13, 21 and 34 spiral arms on the shouts. | 13 21 34 |
| 3:15.84 | Link by link, we broke the chain of fear; | A chain runs through the disk; each link opens into two hands letting go, and the hands become edges of the graph. |  |
| 3:18.93 | alone, we never would've made it here. | The mirror is gone. The two Jades stand side by side and look up. |  |
| 3:21.55, 3:22.26 | Fifty-five! Eighty-nine! | 55 and 89 arms; the disk relaxes back into the galaxy. | 55 89 |
| 3:22.89 (held to 3:33) | And you were seen too, wherever you are. | On Echo the signal tower's ring lights up, and Echo's night side shows its cities linked like a constellation (Rare Earth continuity). Cut back to the two Jades at one console, receiving. |  |

### Outro, the count goes higher (3:34.2 to 4:07.2)

| Time | Lyric | Picture | Type |
| :---- | :---- | :---- | :---- |
| 3:33.04 | Six hundred worlds across the Milky Way, | The contact graph of 600-plus worlds over the Milky Way, slow orbit: the image from the Rare Earth finale. |  |
| 3:38.87 | every one could've burned. Every one held its fire. | Each world flickers red once, its own near-miss, then holds gold. The near-silences between phrases stay empty. |  |
| 3:44.33 drums back; 3:45.56 whispered count | (One... one... two... three...) | A sign in the style of a factory safety board: [ 0 ] DAYS SINCE LAST RESET. It counts up from 1945 and snaps back to zero at every entry on the near-miss list. Each reset is a two-frame red SIGNAL LOST and a flicker of VHS rewind (Jade rewinding, as in the build), with the entry's year in small type beside the number. The resets come faster through the whispered count, about one per sixteenth note by the end, and the last one is the 15 Sep 2026 entry. The counter covers every weapon on the list, not only nuclear ones. | DAYS SINCE LAST RESET |
| 3:47.79 | The count goes higher. | Past the last reset, the counter climbs to the release-date value and keeps going, digits rolling upward on "higher" (3:49.44). | 41 DAYS SINCE LAST RESET (the value on 26 Oct 2026, 42 on 27 Oct; recompute for the release date) |
| 3:50.04 | (One... one... two... three...) | The counter keeps climbing; the ISS crosses the night sky over the dish field. |  |
| 3:53.17 | (Hold your fire.) | Jade lowers her headphones and looks out over the dishes at dawn. Drums cut at 3:54.31. |  |
| 3:58.5 to 4:02.1 | No vocals | Extreme close-up of Jade's eye: the opening frame, so the post loops cleanly. |  |
| 4:02.08, final hit 4:04.05 | (Hold your fire.) | The title lands on the final hit; end card with credits. | HOLD FIRE |

## The chess game

**Fischer vs Tal, 14th Chess Olympiad, Final A, round 5, Leipzig, 1 November 1960. Draw. French Defence, Winawer (ECO C18). 21 moves, 42 plies.**

1.e4 e6 2.d4 d5 3.Nc3 Bb4 4.e5 c5 5.a3 Ba5 6.b4 cxd4 7.Qg4 Ne7 8.bxa5 dxc3 9.Qxg7 Rg8 10.Qxh7 Nbc6 11.Nf3 Qc7 12.Bb5 Bd7 13.O-O O-O-O 14.Bg5 Nxe5 15.Nxe5 Bxb5 16.Nxf7 Bxf1 17.Nxd8 Rxg5 18.Nxe6 Rxg2+ 19.Kh1 Qe5 20.Rxf1 Qxe6 21.Kxg2 Qg4+ ½–½

**Final position** (White to move, in check). White: Kg2, Qh7, Rf1, pawns a3, a5, c2, f2, h2. Black: Kc8, Qg4, Ne7, pawns a7, b7, c3, d5. White is up the exchange and a pawn but cannot escape the queen's checks: 22.Kh1 (the only legal move) Qf3+ 23.Kg1 (the only legal move) Qg4+ repeats. The players agreed the draw at 21...Qg4+, so the video should also stop there; the repetition was never played on the board.

**Why this game.** It is a real US against USSR game two years before the Cuban Missile Crisis (1 November 1960 to 27 October 1962 is 725 days). It is short enough to show every move in 15 seconds. Both sides attack hard, and it ends with the side that could keep checking forever choosing a draw. It is game 23 in Fischer's My 60 Memorable Games and appears in Wikipedia's article on perpetual check.

**What not to claim on screen.** It was not a blitz game, and no source checked says it won a brilliancy prize or was named the Olympiad's best game. A small pause-frame credit such as "Fischer–Tal · Leipzig 1960 · ½–½" on the scoresheet is safe.

**Backups, if you want a longer game.** Fischer–Spassky, Reykjavík 1972, game 4 (Sicilian Sozin, 45 moves, draw) and Spassky–Fischer, Reykjavík 1972, game 7 (Sicilian Najdorf, Poisoned Pawn, 49 moves, draw by repeated checks with Fischer two pawns up). Both scores were checked the same way. Either would need more plies per beat, so Fischer–Tal stays the first choice.

Sources: the full score from RamaChess; moves 11 to 21 from Tal's annotated score in The Chess Alchemist; the event, round, date, result and move count from chessgames.com (game 1008399); the position after 21.Kxg2 from Wikipedia's perpetual check article. The score was also replayed move by move to check that every move is legal.

## The near-miss list (fact-checked)

Take one's list had 39 entries. All 39 were checked against the National Security Archive, the Union of Concerned Scientists, Chatham House's Too Close for Comfort (2014), the Atomic Heritage Foundation and the original reports. 20 were right as written, 15 needed a fix, and 4 are disputed. Two of the disputed ones are left off: the 1956 Suez "swans" alarm (thinly sourced, and it names NORAD, which did not exist yet) and the 1962 Okinawa launch order (one witness, rejected publicly by ten crewmates). Four entries were added to fill gaps: a US submarine (Scorpion, 1968), the 1980 Grand Forks B-52 fire, the May 2025 India–Pakistan strikes, and the 1979 Sverdlovsk anthrax leak, so the list and the outro's reset counter cover more than nuclear weapons.

**How it plays.** The list scrolls on teletype paper from 1:42.99 to 1:47.98, about six or seven lines a second (30 entries), so it reads as texture and pays off when paused. Years are big; place and description are small. The running total climbs with the entries, then its digits keep rolling without settling as the coins start, because the real total is unknown. Don't show "39" or any fixed total. The first 30 coins in the coin shot carry these years, and the outro's reset counter snaps to zero on each of them.

**Corrections to take one that matter on screen:**

- Vandenberg 1962: Strategic Air Command was at DEFCON 2, not DEFCON 3, and the test missile was an Atlas D.
- B-59 1962: the practice depth charges are documented; the order to ready the nuclear torpedo comes from one later account. The line below states only the documented part.
- 1973 alert: decided late on 24 October, Washington time, not 25 October.
- Minot 2007: the flight was 30 August. The missiles never left the aircraft; about 36 hours passed before anyone noticed them.
- F.E. Warren 2010: the outage lasted about 45 minutes, not an hour.
- Norway 1995: Yeltsin's nuclear briefcase was activated, not opened.
- Palomares 1966: the conventional explosives in two bombs detonated. "Two burst" reads as a nuclear explosion.
- Petrov 1983: 26 September in Moscow is still 25 September in UTC, which is why some sources print 25 September.

**On-screen list.** Each line is under 60 characters as YEAR · PLACE · description.

| Year | Place | On screen | Source |
| :---- | :---- | :---- | :---- |
| 1950 | BC, Canada | B-36 jettisons A-bomb with dummy core | [atomicarchive.com](https://www.atomicarchive.com/almanac/broken-arrows/) |
| 1957 | Kyshtym, USSR | Bomb-plant waste tank explodes | [britannica.com](https://www.britannica.com/print/article/2104111) |
| 1958 | Georgia, US | H-bomb lost at sea, never found | [armscontrolcenter.org](https://armscontrolcenter.org/fact-sheet-the-missing-tybee-bomb/) |
| 1960 | Greenland | Radar mistakes the Moon for missiles | [blog.ucs.org](https://blog.ucs.org/david-wright/the-moon-and-nuclear-war-904/) |
| 1961 | N. Carolina | Two H-bombs fall; one switch holds | [blog.nuclearsecrecy.com](https://blog.nuclearsecrecy.com/2013/09/27/final-switch-goldsboro-1961/) |
| 1962 | Duluth, MN | Bear trips alarm; nuclear jets roll | [armscontrolwonk.com](https://www.armscontrolwonk.com/archive/402833/organizations-accidents-and-nuclear-weapons/) |
| 1962 | Vandenberg | Test ICBM launched, SAC at DEFCON 2 | [armscontrolwonk.com](https://www.armscontrolwonk.com/archive/402833/organizations-accidents-and-nuclear-weapons/) |
| 1962 | Atlantic | Nuclear-armed sub B-59 forced to surface | [nsarchive2.gwu.edu](https://nsarchive2.gwu.edu/NSAEBB/NSAEBB75/) |
| 1962 | Chukotka | Lost U-2 strays into Soviet airspace | [adn.com](https://www.adn.com/alaska-life/we-alaskans/2017/06/09/when-off-course-u-2-spy-plane-out-of-alaska-nearly-triggered-war/) |
| 1966 | Palomares | 4 H-bombs fall; 2 spill plutonium | [ahf.nuclearmuseum.org](https://ahf.nuclearmuseum.org/ahf/history/broken-arrow-accidents/) |
| 1967 | Arctic | Solar storm jams all 3 missile radars | [colorado.edu](https://www.colorado.edu/today/2016/08/09/1967-solar-storm-nearly-took-us-brink-war) |
| 1968 | Greenland | Burning B-52 crashes with 4 H-bombs | [en.wikipedia.org](https://en.wikipedia.org/wiki/1968_Thule_Air_Base_B-52_crash) |
| 1968 | N. Pacific | K-129 sinks with nuclear missiles | [en.wikipedia.org](https://en.wikipedia.org/wiki/Soviet_submarine_K-129_(1960)) |
| 1968 | Azores | USS Scorpion lost with nuclear torpedoes | [en.wikipedia.org](https://en.wikipedia.org/wiki/USS_Scorpion_(SSN-589)) |
| 1973 | Washington | US forces go to DEFCON 3 | [nsarchive2.gwu.edu](https://nsarchive2.gwu.edu/NSAEBB/NSAEBB98/press.htm) |
| 1979 | Sverdlovsk, USSR | Anthrax escapes bioweapons plant | [en.wikipedia.org](https://en.wikipedia.org/wiki/Sverdlovsk_anthrax_leak) |
| 1979 | NORAD | Exercise data shows mass Soviet attack | [nsarchive2.gwu.edu](https://nsarchive2.gwu.edu/nukevault/ebb371/) |
| 1980 | NORAD | 46-cent chip blamed for phantom missiles | [nsarchive2.gwu.edu](https://nsarchive2.gwu.edu/nukevault/ebb371/) |
| 1980 | Arkansas | Dropped socket blows up a Titan II | [encyclopediaofarkansas.net](https://encyclopediaofarkansas.net/entries/titan-ii-missile-explosion-2543/) |
| 1980 | N. Dakota | Nuclear-armed B-52 burns for hours | [archive.seattletimes.com](https://archive.seattletimes.com/archive/19910813/1299674/nearly-a-nuclear-disaster----wind-shifted-fire-on-b-52-away-from-bomb-experts-say) |
| 1983 | USSR | Petrov calls 5 'launches' a false alarm | [en.wikipedia.org](https://en.wikipedia.org/wiki/1983_Soviet_nuclear_false_alarm_incident) |
| 1983 | Europe | Able Archer exercise alarms Moscow | [history.state.gov](https://history.state.gov/historicaldocuments/frus1981-88v04/d135) |
| 1995 | Norway | Rocket alert activates Yeltsin's briefcase | [en.wikipedia.org](https://en.wikipedia.org/wiki/Norwegian_rocket_incident) |
| 2007 | USA | B-52 flies 6 nuclear missiles unawares | [en.wikipedia.org](https://en.wikipedia.org/wiki/2007_United_States_Air_Force_nuclear_weapons_incident) |
| 2010 | Wyoming | 50 ICBMs lose contact for 45 minutes | [globalsecurity.org](https://www.globalsecurity.org/wmd/library/news/usa/2010/usa-101027-afps01.htm) |
| 2022 | Pakistan | Unarmed Indian missile fired by accident | [aljazeera.com](https://www.aljazeera.com/news/2022/8/23/india-fires-officers-for-accidental-missile-launch-into-pakistan) |
| 2025 | India–Pakistan | Nuclear-armed rivals trade strikes | [armscontrol.org](https://www.armscontrol.org/node/14664) |
| 2025 | Poland | NATO jets down Russian drones | [armscontrol.org](https://www.armscontrol.org/act/2025-10/news/nato-downs-russian-drones-over-poland) (Oct 2025); NPR, 10 Sep 2025 |
| 2026 | Mideast | AI error nearly boards Chinese ship (rptd) | [cnn.com](https://www.cnn.com/2026/09/18/politics/us-military-ai-false-intelligence-china-ship) (18 Sep 2026; four anonymous sources, no official confirmation; spring 2026, day unknown, placed at 15 Apr for the counter) |
| 2026 | Arabian Sea | Indian and Pakistani warships collide | Bloomberg, 16 Sep 2026; Japan Times, 17 Sep 2026; The Diplomat (15 Sep 2026; both governments protested; no ship names on screen) |

27 Oct: three entries added at Jade's request; see docs/research/nearmiss_update_2026-10.md. The list is now 30 entries; the 15 Sep 2026 collision is the last reset on the outro counter.

Kyshtym is the one disaster included, because it was a plant making plutonium for bombs. Chernobyl fits "disaster" in the lyric but has no weapons link; if you want it, swap out 2010 Wyoming. The 2025 line is the most recent and the most political; it states only that two nuclear-armed states exchanged strikes (7 to 10 May 2025). It is also the last reset on the outro counter.

## Fact sheet for everything on screen

| Claim on screen | Checked fact | Source |
| :---- | :---- | :---- |
| Gunpowder warning | From the Daoist Zhenyuan miaodao yaolüe, usually dated to the mid-9th century. The passage is one entry in a list of dangerous alchemical methods: sulfur, realgar and saltpeter heated with honey, after which flames rose, burning their hands and faces and even burning down their houses. The alchemists were seeking elixirs of immortality. | [Chinese text (ch. 2)](https://simplelits.com/books/classical/classical-07788-真元妙道要略/2), [History of gunpowder](https://en.wikipedia.org/wiki/History_of_gunpowder) (Needham's translation) |
| Gunpowder to the bomb | The fire lance is first recorded in battle at the siege of De'an, 1132; the earliest picture of one is on a mid-10th-century Dunhuang banner. The Heilongjiang hand cannon, the oldest confirmed surviving firearm, dates from no later than 1288. Ottoman bombards breached the walls of Constantinople in 1453. The Somme, 1916. Trinity, the first nuclear test, 16 July 1945. | [History of the firearm](https://en.wikipedia.org/wiki/History_of_the_firearm), [Heilongjiang hand cannon](https://en.wikipedia.org/wiki/Heilongjiang_hand_cannon) |
| Petrov | Just after midnight on 26 September 1983, Moscow time, at the Serpukhov-15 command post. The Oko satellites reported one US missile launch, then four more. The wall display read СТАРТ in big red letters. Lieutenant Colonel Petrov was the duty officer; he had no launch button, and he reported a system malfunction instead of an attack. The story became public in the 1990s. | [Wikipedia](https://en.wikipedia.org/wiki/1983_Soviet_nuclear_false_alarm_incident), [Meduza](https://meduza.io/feature/2017/09/16/chelovek-kotoryy-predotvratil-yadernuyu-voynu), [PIR Center](https://pircenter.org/en/editions/the-feat-of-lieutenant-colonel-petrov-fact-or-fiction) |
| Arkhipov | 27 October 1962, submarine B-59 (Captain Valentin Savitsky), carrying one nuclear torpedo. US ships dropped practice depth charges to make it surface. According to Vadim Orlov's account (2002), Savitsky ordered the torpedo readied, and Arkhipov, the brigade chief of staff aboard, calmed him; the submarine surfaced. The "three officers had to agree" rule and a vote with two in favour are not in the primary account, and the National Security Archive calls the torpedo order controversial. | [NSA Briefing Book 75](https://nsarchive2.gwu.edu/NSAEBB/NSAEBB75/), [Briefing Book 399](https://nsarchive2.gwu.edu/NSAEBB/NSAEBB399/) |
| Sverdlovsk, 1979 | 2 April 1979: anthrax spores escaped from a Soviet military biological weapons facility in Sverdlovsk (now Yekaterinburg), inside the base called Compound 19. At least 68 people died, by Matthew Meselson's count. Officials blamed contaminated meat until May 1992, when Yeltsin said the military was the cause. | [Wikipedia](https://en.wikipedia.org/wiki/Sverdlovsk_anthrax_leak) |
| Voyager and the Golden Record | Voyager 2 launched first (20 August 1977), then Voyager 1 (5 September 1977). The cover shows how to play the record, how to rebuild its pictures, the pulsar map and the hydrogen atom that sets the time unit. Voyager 1 is moving at about 17 km/s. | [NASA](https://science.nasa.gov/mission/voyager/golden-record-cover), [NSSDCA](https://nssdc.gsfc.nasa.gov/planetary/voyager.html) |
| The pulsar | PSR B1919+21, period 1.3373 s, discovered by Jocelyn Bell (now Bell Burnell) in 1967 and nicknamed LGM-1. | [Wikipedia](https://en.wikipedia.org/wiki/PSR_B1919%2B21) |
| SETI@home | Ran from 17 May 1999 until it stopped sending out work on 31 March 2020. The screensaver showed the power spectrum being computed as a colourful 3D graph. More than a million people took part; Wikipedia's figures run from 1.8 million registered users to over 5.2 million participants. | [Berkeley paper](https://setiathome.berkeley.edu/sah_papers/cacm.php), [Wikipedia](https://en.wikipedia.org/wiki/SETI@home) |
| The ISS | Visible to the naked eye as a bright, steady moving point, about 400 km up, orbiting every 90 minutes or so. | [NASA](https://www.nasa.gov/spot-the-station/) |
| Okavango flood | Rain falls on the Angolan highlands in summer; the flood reaches the delta months later and peaks in June to August, in Botswana's dry season. | [okavango.com](https://www.okavango.com/okavango-delta-flood-cycle.php) |
| Fibonacci spirals | Real in sunflowers, pinecones, pineapples, artichokes, romanesco and the spiral aloe (five rows). Not in nautilus shells (ratio about 1.33, not 1.618), hurricanes or galaxies, which are logarithmic spirals. | [Science News](https://www.sciencenews.org/?p=26206), [Turing's Sunflowers](https://plus.maths.org/sunflowers) |
| Chess game | Fischer–Tal, Leipzig Olympiad, 1 November 1960, draw in 21 moves. | [chessgames.com](https://www.chessgames.com/perl/chessgame?gid=1008399), [Wikipedia](https://en.wikipedia.org/wiki/Perpetual_check) |
| 100 heads in a row | 2100 = 1,267,650,600,228,229,401,496,703,205,376, about 1.27 × 1030. | Computed |
| Days counter | 41 days from the last listed close call (the India–Pakistan warship collision, 15 September 2026) to 26 October 2026; 42 on 27 October. Recompute for the release date. 27 Oct: three entries added at Jade's request; see docs/research/nearmiss_update_2026-10.md (was 534 days from 10 May 2025). For reference, 26 October 2026 is day 29,663 since Nagasaki (9 August 1945), the last use of a nuclear weapon in war. | Computed |
| Echo, 217 light-years | Fictional, carried over from the Rare Earth video, where Echo sits in the Earth Transit Zone. Never present it as a real exoplanet. | Rare Earth treatment |
| Image credits | NASA imagery is public domain. ESA/Hubble images are CC BY 4.0 and need a visible "ESA/Hubble" credit, with a note if an image is altered. | [ESA/Hubble](https://esahubble.org/copyright/) |

## Production notes

- **Timing.** Reuse take one's analysis/timing.json as the master clock (beats, bars, word onsets, hits). It was built from the same MP3 (identical file hash), and spot checks for this plan land within a few tens of milliseconds of its onsets. The tempo drifts from about 93 to 95.5 BPM, so cut on the beat list, not on a fixed BPM.
- **Reuse from take one.** pulsar.js (0:43), goldenrecord.js (0:54), coins.js (1:48), phyllo.js (3:14), nearmiss.js re-skinned from terminal to newsprint, and the type engine.
- **Reuse from Rare Earth.** war.js for the first strike, the galaxy and contact graph, the night-side Earth, the Echo world sheet (signal tower and night side) and the DOT character sheet.
- **New sheets to make.** A teal-tips Jade turnaround matched to the DOT sheet, in the same jacket; the mirrored control room; one style frame per era (blueprint over painting, painted-over documentary, ink wash, Petrov oil, Suprematist shapes into poster into halftone).
- **Picture sources.** NASA imagery (ISS, Earth at night, hurricanes from orbit, Voyager and the Golden Record) is public domain. ESA/Hubble galaxy images are CC BY 4.0; their terms ask for a visible "ESA/Hubble" credit that is not separated from the image, so put a small credit on screen while each one is up, and in the end card. Everything else is generated or painted.
- **Release date option.** Voyager 1 reaches one light-day from Earth on 18 November 2026 (per EarthSky, citing NASA), which would give the Golden Record shot a news hook.
- **Mobile crop.** Keep faces and big type inside a centred 4:5 area so the vertical crop still works.
- **Chess.** Render the board from the PGN so every frame shows a legal position, since people will pause on it.
- **Checks.** Contact sheet every 0.25 s for 0:00 to 0:33, every 0.5 s after that; every cut within one frame (24 fps) of its onset in timing.json; every on-screen date and number checked against the fact sheet above.
