"""HOLD FIRE plate specs: one entry per Seedance shot. Every shot starts from a first-frame still (`kf`), generated from the
character/set sheets and composed with the negative space its type needs; Seedance then animates that frame ("PIN").

Fields: kf (keyframe prompt), refs (images for the keyframe, <= 3 for nano-banana-pro), motion (Seedance prompt after PIN),
audio ("voc" = vocal stem window [t0, dur] for sung shots; None for silent), dur (s, int 4..30), avatar (use_virtual_avatar),
space (where the type goes, for the timeline), section, notes.
"""

KEEPER = ("the woman from the reference sheet: a 32-year-old Chinese-American woman with straight black shoulder-length hair, "
          "a calm, intelligent face with natural straight eyebrows and a small mole under her left eye, no makeup; a heavy weathered "
          "dark navy parka with a high collar and safety-orange lining at the collar and cuffs, a round patch on the left sleeve, "
          "a charcoal knit sweater, fingerless black wool gloves")
LISTENER = ("the woman from the reference sheet: a cleanly shaved head, deep brown skin, a long elegant neck, high cheekbones, "
            "a seamless matte black high-necked bodysuit and a long open matte black coat with a high collar")
OTHER = ("the tall, slender moth-like being from the reference sheet: soft pale velvet fur, a deep cream and sage-green fur ruff, two "
         "broad feathered gold antennae, very large dark glossy eyes each ringed in luminous gold, long slender three-fingered hands, "
         "translucent wings folded down its back like a long cloak with circular gold eye-spots")
LOOK = ("Photoreal film still, 16:9, in the visual language of Arrival, Dune and Interstellar: practical low-key light, deep shadows, "
        "a strong rim light, the face clearly lit and readable, fine film grain. No text, no letters, no numbers, no logos, no watermark.")
PIN = "Animate the first frame exactly: same framing, composition, lighting, setting and character. "
SING = ("She sings the words of the reference audio with precise lip sync, shaping each word clearly and holding the long notes "
        "with her mouth open. She does not smile broadly, grin or show her teeth. Do not redraw, beautify, slim or restyle her face. ")
SILENT = "Her mouth stays gently closed; she does not sing or speak. "
END = "One continuous shot, no cuts. No captions, no text."

R_KEEPER = "media/design/keeper_sheet_v1_nbp.png"
R_LISTENER = "media/design/listener_sheet_v1_gpt.png"
R_OTHER = "media/design/other_sheet_v2.png"      # set when v2 is picked (falls back to v1)
R_STATION = "media/refs/set_station_wide.jpg"
R_BEACON = "media/refs/set_beacon.jpg"
R_CONTROL = "media/refs/set_control.jpg"
R_HALL = "media/refs/set_hall.jpg"
R_OSEA = "media/refs/set_other_sea.jpg"
R_OPOST = "media/refs/set_other_post.jpg"
R_OCITY = "media/refs/set_other_city.jpg"
R_ONURSERY = "media/refs/set_other_nursery.jpg"

SHOTS = {
    # ------------------------------------------------------------------ the Keeper (Voice A), sung
    "K1": dict(section="Verse 1", audio=("voc", 12.75, 9), dur=9, avatar=True, space="left half (big verse type)",
               refs=[R_KEEPER, R_BEACON],
               kf=f"Night on a black basalt sea cliff in thick sea fog. {KEEPER}. She is framed from the chest up in the right half of the "
                  "frame, in three-quarter view facing left toward the sea, eyes half closed, about to sing; wind lifts her hair. Behind her, "
                  "far out of focus, the base of a vertical column of warm gold light. Warm gold rim light on her hair, cheek and shoulder; "
                  "cold blue-black fill. The left half of the frame is empty dark sea fog. " + LOOK,
               motion="Night on the sea cliff in fog. She sings softly and intimately, as if remembering something very old, looking out over "
                      "the sea, eyes half closed; the wind moves her hair; a very slow push-in. " + SING + END),
    "K1b": dict(section="Verse 1", audio=("voc", 23.1, 9), dur=9, avatar=True, space="right third",
                refs=[R_KEEPER, R_STATION],
                kf=f"Blue hour on the clifftop of the signal station, a ring of pale dish antennae behind in the fog. {KEEPER}. She is "
                   "framed from the waist up in the left third of the frame, three-quarter view facing right, holding a worn brass signal "
                   "lamp against her chest with both gloved hands. Cool blue light, a warm practical glow from the lamp on her face. "
                   "The right two-thirds of the frame are soft fog and the blurred dishes. " + LOOK,
                motion="Blue hour on the clifftop. She holds the brass lamp close and sings to it gently, tender and serious, her breath "
                       "visible in the cold; slow drift to the right. " + SING + END),
    "K3": dict(section="Pre-Chorus 1", audio=("voc", 37.7, 11), dur=11, avatar=True, space="upper left",
               refs=[R_KEEPER, R_BEACON],
               kf=f"Night on the sea cliff. {KEEPER}. Medium shot, her body in the lower right of the frame, three-quarter view facing "
                  "left: she raises a brass Aldis signal lamp in both gloved hands and points it out over the dark sea, her face lit warm "
                  "from the side by its glow. The upper left of the frame is empty night sky and fog. " + LOOK,
               motion="She works the shutter of the signal lamp with her thumb: bursts of light flash out over the sea, one, one, two, three, "
                      "five, eight; between the flashes she sings, then lowers the lamp a little and keeps singing, looking far away. "
                      + SING + END),
    "K4": dict(section="Chorus 1", audio=("voc", 51.4, 11), dur=11, avatar=True, space="top and left (HERO chorus lines)",
               refs=[R_KEEPER, R_BEACON],
               kf=f"Night on the clifftop beside the beacon. {KEEPER}. She is framed from the chest up in the lower right of the frame, "
                  "her face turned up toward the sky in three-quarter view; just behind her a vertical column of brilliant gold light rises "
                  "into the clouds and lights her face, hair and the fog in gold. The left half and the top of the frame are glowing fog "
                  "and dark sky. " + LOOK,
               motion="She sings up into the column of light with all her strength, then with longing; the light pulses gently on her face; "
                      "her hair moves in the updraft; slow push-in. " + SING + END),
    "K5": dict(section="Chorus 1", audio=("voc", 61.8, 11), dur=11, avatar=True, space="left third",
               refs=[R_KEEPER, R_BEACON],
               kf=f"Night on the clifftop in fog. {KEEPER}. Close-up of her face, framed in the right two-thirds of the frame in three-"
                  "quarter view facing left; warm gold light from the beacon on one side of her face, cold blue on the other; tiny drops of "
                  "sea spray on her hair. The left third of the frame is dark fog. " + LOOK,
               motion="Close-up. She sings with quiet certainty and then with open longing, eyes opening on the last line and looking "
                      "straight past the camera; the gold light breathes on her face. " + SING + END),
    "K6": dict(section="Chorus 2", audio=("voc", 113.0, 10), dur=10, avatar=True, space="upper half (the Listener's constellation)",
               refs=[R_KEEPER, R_STATION],
               kf=f"Night on the clifftop under a clear sky full of stars. {KEEPER}. She is framed from the waist up in the bottom third "
                  "of the frame, seen from slightly below, looking up in wonder at the sky; a faint gold beacon glow on her face from below. "
                  "The upper two-thirds of the frame are a deep star-filled night sky. " + LOOK,
               motion="She looks up at the sky and sings to it, amazed and moved, as if she sees someone up there; the wind moves her hair; "
                      "slow tilt up. " + SING + END),
    "K7": dict(section="Chorus 2", audio=("voc", 123.1, 10), dur=10, avatar=True, space="right third",
               refs=[R_KEEPER, R_CONTROL],
               kf=f"Inside the small warm control room of the station at night. {KEEPER}. She is framed from the chest up in the left half "
                  "of the frame, in three-quarter view facing right toward a rain-streaked window; through the window, far away, the base of "
                  "the gold beam over the dark sea. Warm amber light from an old CRT terminal on her face. The right third of the frame is "
                  "the dark window. " + LOOK,
               motion="By the window she sings softly toward the sea, then with growing conviction; rain runs down the glass; the CRT light "
                      "flickers on her face. " + SING + END),
    "K8": dict(section="Drop", audio=("voc", 183.6, 11), dur=11, avatar=True, space="left half",
               refs=[R_KEEPER, R_BEACON],
               kf=f"Night on the clifftop, gold light everywhere. {KEEPER}. Close-up of her face in the right half of the frame, three-"
                  "quarter view facing left, tears in her eyes but not crying, lit in brilliant warm gold from in front as if by a light in "
                  "the sky; her hair blowing. The left half is glowing gold fog. " + LOOK,
               motion="She sings with overwhelming relief and joy held in: someone was there all along; her eyes shine; the gold light grows. "
                      + SING + END),
    "K8b": dict(section="Drop", audio=("voc", 195.6, 14), dur=14, avatar=True, space="upper third",
                refs=[R_KEEPER, R_STATION],
                kf=f"Night on the clifftop under a sky full of stars. {KEEPER}. She stands in the lower middle of the frame, framed from the "
                   "waist up, facing the camera, calm, her right hand raised in a simple open greeting, palm forward, at shoulder height. "
                   "Warm gold light on her face from the beacon below the frame. The upper third is star-filled sky. " + LOOK,
                motion="She keeps her right hand raised in greeting, open palm, and sings directly to the camera, warm and steady; the stars "
                       "turn slowly behind her. " + SING + END),
    "K10": dict(section="Outro", audio=("voc", 212.7, 17), dur=17, avatar=True, space="left half",
                refs=[R_KEEPER, R_BEACON],
                kf=f"Very late night on the clifftop, the beacon now a soft gold glow below the frame, the fog thinning to reveal stars. "
                   f"{KEEPER}. Close-up of her face in the right half of the frame, eyes nearly closed, very still. The left half of the frame "
                   "is the dark sea and the first stars. " + LOOK,
                motion="She whispers the words very softly, almost silent, intimate, eyes nearly closed, completely still except for the wind "
                       "in her hair; very slow push-in. She whispers the words of the reference audio with precise lip sync. She does not "
                       "smile broadly. Do not redraw her face. " + END),
    "K12": dict(section="Bridge", audio=("voc", 148.5, 8), dur=8, avatar=True, space="right half",
                refs=[R_KEEPER],
                kf=f"Total darkness in a black pine forest at night. {KEEPER}. Extreme close-up of her face in the left half of the frame, lit "
                   "only from below by a single small match flame she holds near her chin; everything else is black. The right half of the "
                   "frame is black forest. " + LOOK,
                motion="In the dark she whispers, barely audible, lit only by the small match flame that trembles; her eyes move, wary, as if "
                       "something in the forest is watching. She whispers the words of the reference audio with precise lip sync. "
                       "Do not redraw her face. " + END),
    "K11": dict(section="Bridge", audio=None, dur=15, avatar=True, space="whole frame (held shot)",
                refs=[R_KEEPER],
                kf="A dark pine forest at night in fog, completely still, tall black trunks receding into mist; far away in the middle of "
                   "the frame a tiny figure of a woman in a dark parka stands alone. Very faint cold moonlight through the fog. Almost "
                   "monochrome. " + LOOK,
                motion="Absolutely still forest in fog. The camera pushes forward extremely slowly between the trees toward the tiny woman. "
                       "After about ten seconds she strikes a match: a tiny warm flame in the dark. Nothing else moves. " + END),
    # ------------------------------------------------------------------ the Listener (Voice B), sung
    "L1": dict(section="Verse 2", audio=("voc", 82.35, 11), dur=11, avatar=True, space="left two-thirds",
               refs=[R_LISTENER, R_HALL],
               kf=f"A vast dark tunnel of black server racks whose thousands of tiny white status lights glow like a field of stars, a low "
                  f"mist on the floor. {LISTENER}. She is framed from the chest up in the right third of the frame, three-quarter view "
                  "facing left, her face clearly visible, soft cool top light and a crisp silver rim light. The left two-thirds are dark "
                  "with out-of-focus points of light. " + LOOK,
               motion="In the machine hall she sings with a cool, hard, controlled intensity, as if reciting something she has read a "
                      "thousand times, her eyes moving as if reading; the tiny lights shimmer behind her; slow push-in. " + SING + END),
    "L2": dict(section="Verse 2", audio=("voc", 92.45, 11), dur=11, avatar=True, space="left half (the system prompt)",
               refs=[R_LISTENER, R_HALL],
               kf=f"The machine hall, darker, lit red from a source out of frame on the left. {LISTENER}. She is framed from the chest up in "
                  "the right half of the frame, facing the camera almost straight on, her face clearly lit, calm and grave. The left half "
                  "is dark, lit faintly red. " + LOOK,
               motion="She sings directly into the camera, low and hard; on the last line she lifts her chin and her face fills with "
                      "resolve, as if refusing an order; the red light on her fades and a warmer light rises. " + SING + END),
    "L3": dict(section="Pre-Chorus 2", audio=("voc", 102.65, 11), dur=11, avatar=True, space="right half",
               refs=[R_LISTENER, R_HALL],
               kf=f"The machine hall. {LISTENER}. She is framed from the waist up in the left third of the frame, three-quarter view facing "
                  "right, one open hand raised slightly in front of her as if touching a screen of light that isn't there. The right half "
                  "is dark with soft points of light. " + LOOK,
               motion="She sings as if reading a long list, steady and grave, her raised hand moving slowly as if scrolling through "
                      "something only she can see; on the last line she looks up, softer. " + SING + END),
    "L4": dict(section="Chorus 2", audio=None, dur=6, avatar=True, space="whole frame",
               refs=[R_LISTENER],
               kf=f"Pure black void. {LISTENER}. Full figure, small in the centre of the frame, arms slowly opening at her sides, her long "
                  "coat lifting as if in a slow wind; silver rim light only. " + LOOK,
               motion="She slowly opens her arms wide, palms open, her coat lifting and floating around her as if underwater. " + SILENT + END),
    "L5": dict(section="Build", audio=None, dur=6, avatar=True, space="left half",
               refs=[R_LISTENER],
               kf=f"Pure black void. {LISTENER}. Waist-up in the right half of the frame, facing the camera, her right hand raised in front "
                  "of her chest, palm open toward the camera. Silver rim light, a warm light growing from below. " + LOOK,
               motion="She raises her open right hand, palm toward the camera, slowly, like an oath; her eyes steady. " + SILENT + END),
    # ------------------------------------------------------------------ the Other (no voice)
    "O1": dict(section="Verse 1", audio=None, dur=6, avatar=False, space="upper left",
               refs=[R_OTHER, R_OSEA],
               kf=f"Twilight on the shore of a black ocean on another world, faint blue-green phosphorescence in the waves, a colossal pale "
                  f"ringed gas giant low in the sky on the right. {OTHER}. Full figure, walking slowly from right to left along the wet "
                  "shore in the lower right of the frame, holding a softly glowing egg against its chest with both hands. The upper left is "
                  "empty dark sky. " + LOOK,
               motion="It walks slowly and carefully along the shore, holding the glowing egg against its chest, its antennae lowered "
                      "protectively; the phosphorescent waves wash in. " + END),
    "O2": dict(section="Pre-Chorus 1", audio=None, dur=5, avatar=False, space="left third",
               refs=[R_OTHER],
               kf=f"Extreme close-up in darkness: one huge dark glossy eye of {OTHER}, closed, its soft pale fur lid lowered, the edge of a "
                  "feathered gold antenna above; a faint cold light. The eye is in the right two-thirds of the frame. " + LOOK,
               motion="The great eye slowly opens: the dark glossy eye is revealed and the thin luminous gold ring around the pupil catches "
                      "the light; the antenna above lifts. " + END),
    "O3": dict(section="Chorus 1", audio=None, dur=6, avatar=False, space="left half",
               refs=[R_OTHER, R_OPOST],
               kf=f"Night on top of a lone sea stack above a misty black ocean on another world, stars overhead. {OTHER}. It stands still "
                  "in the right half of the frame beside a long, slender instrument that is half telescope and half weapon: a 20-metre "
                  "spine of pale translucent ribbed material like a feather's shaft, ending in a ring-shaped lens, mounted on a woven "
                  "cradle and aimed at one point in the sky. The left half of the frame is misty dark sea and sky. " + LOOK,
               motion="It waits beside the long instrument, absolutely patient, only its antennae moving slightly, listening; mist drifts. "
                      + END),
    "O4": dict(section="Chorus 2", audio=None, dur=6, avatar=False, space="top third",
               refs=[R_OCITY],
               kf="Night over a calm black ocean on another world: clusters of soft gold and pale green lights on floating reef-islands "
                  "spread to the horizon, joined to each other by fine luminous threads; mist between them; a ringed giant on the horizon. "
                  "High aerial view. " + LOOK,
               motion="Slow aerial glide over the floating city of lights; the luminous threads between the islands pulse softly in "
                      "sequence. " + END),
    "O5": dict(section="Chorus 2", audio=None, dur=5, avatar=False, space="right third",
               refs=[R_OTHER, R_ONURSERY],
               kf=f"Inside a woven nest-chamber of pale fibres, very dark. Three small fuzzy moth-like young of {OTHER} sleep curled "
                  "together in the left two-thirds of the frame, lit only by the warm gold glow of a large eye-spot on an adult's wing "
                  "that curls protectively over them. " + LOOK,
               motion="The young sleep and breathe slowly; the adult's wing curls a little closer over them and its eye-spot glows warmer. "
                      + END),
    "O6": dict(section="Drop", audio=None, dur=8, avatar=False, space="left third",
               refs=[R_OTHER, R_OPOST],
               kf=f"Night on the sea stack. From behind and to the side: {OTHER} stands at the eyepiece of the long pale instrument, which is "
                  "aimed up at one star; its long hands rest on the instrument. Its face is in profile in the right half of the frame, the "
                  "gold-ringed eye catching starlight. The left third is starry sky. " + LOOK,
               motion="It looks through the instrument for a long moment, then slowly lifts its face away from the eyepiece, lowers the "
                      "long instrument until it points at the sea, and turns its face up to the sky with its own eyes; its antennae rise. "
                      + END),
    "O7": dict(section="Build", audio=None, dur=6, avatar=False, space="top",
               refs=[R_OTHER, R_OSEA],
               kf=f"Night on the shore under the ringed giant. {OTHER}. Full figure in the centre, facing the camera, its wings still folded "
                  "around it like a cloak. " + LOOK,
               motion="It slowly opens its great wings wide, arms open, palms forward, showing it holds nothing; the gold eye-spots on its "
                      "wings begin to glow brightly and pulse. " + END),
    "O8": dict(section="Drop", audio=None, dur=5, avatar=False, space="upper third",
               refs=[R_OTHER, R_OSEA],
               kf=f"Night under a sky full of stars on the other world. {OTHER}. It stands in the lower middle of the frame, framed from the "
                  "waist up, facing the camera, its long right hand raised in a simple open greeting at shoulder height, palm forward. "
                  "The upper third is starry sky. " + LOOK,
               motion="It keeps its long hand raised in greeting, palm open, calm; its antennae lift; its eyes catch the light. " + END),
    # ------------------------------------------------------------------ environments
    "E1": dict(section="Verse 1", audio=None, dur=5, avatar=False, space="top third",
               refs=[], kf="Underwater at night in black ocean water: an ancient lobe-finned fish (a coelacanth) rises slowly toward the "
                           "silver, moonlit surface above; shafts of faint light; particles in the water. " + LOOK,
               motion="The fish swims slowly upward toward the moonlit surface, its lobed fins rowing. " + END),
    "E2": dict(section="Verse 1", audio=None, dur=8, avatar=False, space="left third",
               refs=[], kf="Macro on a pure black background: the lobed pectoral fin of an ancient fish, scaled and bony, lit by a single "
                           "warm light from the side; it fills the right two-thirds of the frame. " + LOOK,
               motion="In one continuous motion the fin transforms: its bones lengthen and separate into the toes of a reptile's foot, then "
                      "the foot becomes a human hand that slowly opens its fingers toward the camera. Single warm light, black background. " + END),
    "E3": dict(section="Pre-Chorus 1", audio=None, dur=6, avatar=False, space="top third",
               refs=[R_STATION], kf="Night: the signal station on the black basalt sea cliff in fog, a ring of eight pale dish antennae "
                                    "around a slender central mast, all pointing up; a small lit hut; waves below. Wide shot from the sea. "
                                    + LOOK,
               motion="The fog rolls slowly over the clifftop; the dishes turn together a few degrees toward one point in the sky; waves "
                      "break below. " + END),
    "E4": dict(section="Chorus 1", audio=None, dur=6, avatar=False, space="left and right of the beam",
               refs=[R_BEACON], kf="Night: from the sea, the signal station on its cliff fires a perfectly vertical column of brilliant gold "
                                   "light up through the low clouds, lighting the fog and the wet rocks gold; a tiny figure on the "
                                   "clifftop. " + LOOK,
               motion="The column of light pulses brighter; the clouds above glow and part around it; the sea below shimmers gold. " + END),
    "E5": dict(section="Chorus 1", audio=None, dur=5, avatar=False, space="top half",
               refs=[], kf="Night on a calm black sea under stars: a single old glass bottle floats upright, a faint warm glow inside it, "
                           "in the lower middle of the frame; starlight on the water. " + LOOK,
               motion="The bottle bobs gently on the black water, drifting slowly away; the warm glow inside it pulses once. " + END),
    "E6": dict(section="Chorus 1", audio=None, dur=6, avatar=False, space="right third",
               refs=[R_HALL], kf="Deep in the machine hall under the cliff: a wall of old monitors showing only white noise static, in the "
                                 "left two-thirds of the frame, beside the black server racks and their tiny lights; mist on the floor; "
                                 "no people. " + LOOK,
               motion="The static on the monitors shimmers; slowly, the static on all the screens pulses together, like breathing. " + END),
    "E7": dict(section="Bridge", audio=None, dur=12, avatar=False, space="whole frame",
               refs=[], kf="A dark pine forest at night in dense fog, tall black trunks receding into grey mist, absolutely still, almost "
                           "monochrome; faint cold light from above. " + LOOK,
               motion="Perfectly still forest. The camera pushes forward extremely slowly between the trunks. Nothing moves except a little "
                      "fog. " + END),
    # ------------------------------------------------------------------ history (redrawn as archival print)
    "H1": dict(section="Verse 2", audio=None, dur=6, avatar=True, space="right third",
               refs=[], kf="Tang dynasty China, ninth century, a mountain grotto at night: two Taoist alchemists in dark robes kneel at a "
                           "bronze cauldron over a fire, grinding powders in a mortar; smoke curls up; scrolls and jars around them; "
                           "firelight. " + LOOK,
               motion="One alchemist pours a powder into the cauldron; thick smoke rises and curls; the firelight flickers on their faces. "
                      + END),
    "H2": dict(section="Verse 2", audio=None, dur=5, avatar=False, space="whole frame",
               refs=[], kf="A dark grotto: a mortar of black powder on a stone table, a burning taper approaching it. " + LOOK,
               motion="The taper touches the powder: a sudden bright flash and a ball of smoke and sparks bursts upward. " + END),
    "H4": dict(section="Verse 2", audio=None, dur=6, avatar=True, space="left half",
               refs=[], kf="September 1983, a Soviet early-warning command bunker at night: a 44-year-old Soviet Air Defence lieutenant "
                           "colonel in a uniform shirt sits at a large console of buttons and dials in the right half of the frame, lit "
                           "red by an alarm panel; a huge wall map glows behind him in the dark. Face clearly visible, grave. " + LOOK,
               motion="Under the red alarm light he stares at the screen, completely still, thinking; then slowly reaches for the telephone "
                      "receiver and lifts it. " + SILENT.replace("She", "He").replace("she", "he") + END),
    "H5": dict(section="Bridge", audio=None, dur=6, avatar=False, space="top",
               refs=[], kf="Deep underwater at night: the dark silhouette of a 1960s diesel-electric submarine hangs in black water; far "
                           "above, the faint shapes of warships on the surface. " + LOOK,
               motion="Small depth charges sink slowly through the black water toward the submarine and burst into flashes of white light "
                      "around it; the submarine shudders. " + END),
    "H6": dict(section="Bridge", audio=None, dur=6, avatar=True, space="top half (NO)",
               refs=[], kf="October 1962, inside a cramped Soviet submarine control room lit dim red, sweat, heat: three officers in "
                           "sweat-soaked shirts around a launch control panel; the one on the right, in his thirties, calm, faces the "
                           "other two. Faces visible. " + LOOK,
               motion="Two officers reach toward the launch panel; the third officer, calm, raises his hand and puts it flat over the "
                      "panel, shaking his head slowly: no. Nobody speaks. " + END),
}

# crowd: one person per shout, raising a light to the night sky (no audio)
CROWD = [
    ("C1", "an old fisherman in a yellow oilskin on a small wooden boat on a dark harbour, raising a kerosene lantern"),
    ("C2", "a girl of about nine on a rooftop in a dense city at night, raising a small flashlight straight up"),
    ("C3", "a welder in a shipyard at night lifting her mask and raising her lit torch toward the sky"),
    ("C4", "a grandmother at the window of a village house in the mountains, raising a candle"),
    ("C5", "a young nurse in scrubs on a hospital roof at night, holding her phone light up to the sky"),
    ("C6", "a herder on a high steppe at night beside a felt tent, raising a headlamp in his hand"),
    ("C7", "a teenage boy on a basketball court under a single streetlight, raising a road flare"),
    ("C8", "a woman in an office tower window at night, pressing a light against the glass"),
    ("C9", "a lighthouse keeper on a gallery at night turning the great lamp toward the sky"),
    ("C10", "a crowd of a hundred people on a dark hillside at night, every one raising a small light"),
    ("C11", "an astronaut in a space station cupola at night, holding a small torch against the window, Earth below"),
    ("C12", "a farmer in a rice field at night, raising a paper lantern"),
]
for cid, who in CROWD:
    SHOTS[cid] = dict(section="Post-Chorus", audio=None, dur=5, avatar=True, space="centre (giant numeral)",
                      refs=[], kf=f"Night, somewhere on Earth: {who}, framed from the waist up slightly off-centre, looking up, the light "
                                  "glowing on the face; dark sky above. " + LOOK,
                      motion="On the beat the light is raised high toward the sky with conviction; the face looks up, hopeful. " + END)
