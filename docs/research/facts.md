# Hold Fire: fact sheet and sources

Fact-check and data research for the "Hold Fire" music video. Lyrics: `inputs/Hold Fire (lyrics and suno prompt).md`.

Machine-readable companions (all in `render/data/`):

| File | Contents |
|---|---|
| `nearmisses.json` | 39 nuclear close calls and accidents, 1950-2022. Each has a date, place, approximate lat/lon, a description of 90 characters or fewer, a category, a status (documented, disputed or severity debated) and sources. |
| `milkyway.json` | Reid et al. 2019 log-spiral arm model with polylines in kpc, the Sun's position, disk size, the galactic habitable zone, the human radio bubble, and hints for the 610-node contact graph. |
| `hud_captions.json` | 70 screen-ready captions keyed to lyric lines. Each has a confidence grade and its sources. |
| `fibonacci.json` | The sequence, ratios, a check that 610 = F(15), the coin-flip arithmetic and phyllotaxis data. |

## How this was checked (read this first)

- Research date: 2026-10-26. This sandbox's proxy blocked direct page fetches from Wikipedia, arXiv, NSArchive and Britannica. Every fact below was therefore checked against web-search results: titles, URLs and the snippets returned. I did not read the full pages.
- Every link below appeared in those search results, apart from a few long-standing Wikipedia article URLs, which are marked (WP).
- Before a caption is locked, someone should open its source link and confirm the exact wording. This matters most for quotations.
- Confidence grades:
  - **A**: primary sources, or several reliable sources, agree.
  - **B**: one reliable secondary source, or a single chain of sources; the wording may vary.
  - **C**: a recollection, a disputed account or a legend. Label it on screen as such.

---

## 1. Petrov, 26 September 1983

> "Eighty-three, the satellites saw five, every rule said call it first strike; Petrov knew that's not what the end looks like, ignored all previous instructions. We're alive."

### Facts

| Fact | Grade | Source |
|---|---|---|
| Lt. Col. Stanislav Yevgrafovich Petrov was the duty officer at the **Serpukhov-15** command post (about 70-100 km from Moscow; sources differ) of the **Oko** satellite early-warning system. | A | [WP: 1983 false alarm](https://en.wikipedia.org/wiki/1983_Soviet_nuclear_false_alarm_incident), [WP: Petrov](https://en.wikipedia.org/wiki/Stanislav_Petrov) |
| **Time:** the night of 25/26 September 1983, "just after midnight" Moscow time. Russian accounts give **about 00:15**. His shift began at 20:00 on 25 September. | A (night), B (00:15) | [Gulf News / WaPo](https://gulfnews.com/amp/story/world%2Feurope%2Fpetrov-the-soviet-officer-who-averted-a-nuclear-war-dies-1.2092583), [KP.ru](https://www.kp.ru/daily/27559/4828433/) |
| **Sequence:** the system reported **one** Minuteman launch from the USA, then **four more**, for a total of five. | A | [WP](https://en.wikipedia.org/wiki/1983_Soviet_nuclear_false_alarm_incident) |
| **The screen** (Petrov's own account, KP interview): "Сирена орёт как оглашённая. Сверху на стене горят большие красные буквы: «СТАРТ»." ("The siren howls like mad. Up on the wall, big red letters burn: START.") In the BBC 2013 interview: "the big, back-lit, red screen with the word 'launch' on it." | A (СТАРТ) | [KP.ru](https://www.kp.ru/daily/27559/4828433/), [WGBH quoting BBC](https://www.wgbh.org/news/2017-09-18/stanislav-petrov-the-man-who-saved-the-world-dies-at-77), [Aksenov/BBC 2013 abstract](https://stafforini.com/works/aksenov-2013-stanislav-petrov-man/) |
| **Reliability:** "Машина показывает, что достоверность высшая" ("The machine shows that the reliability is highest"). The BBC has: the reliability of the alert was "highest". | B | [KP.ru](https://www.kp.ru/daily/27559/4828433/), [Loop/BBC reprint](https://www.loopinsight.com/2013/09/27/the-man-who-may-have-saved-the-world/) |
| **Second banner:** as further launches appeared, the label changed from «СТАРТ» to «**РАКЕТНОЕ НАПАДЕНИЕ**» ("missile attack"), according to Rodina and Rossiyskaya Gazeta. KP.ru renders it «РАКЕТНАЯ АТАКА». | B | [Rodina](https://rodina-history.ru/2017/09/19/rodina-stanislav-petrov.html), [RG 2024](https://rg.ru/2024/10/02/nakanune-konca-sveta.html), [KP.ru](https://www.kp.ru/daily/27559/4828433/) |
| **Cause:** sunlight reflecting off high-altitude clouds, seen by a satellite in a **Molniya** (highly elliptical) orbit. The satellite is named as **Kosmos 1382**, near apogee (about 32,000 km). The fix was a cross-check against geostationary satellites. | A (cause), B (satellite name) | [WP](https://en.wikipedia.org/wiki/1983_Soviet_nuclear_false_alarm_incident), [Peace Magazine](https://www.peacemagazine.org/archive/v17n2p16.htm) |
| **His reasoning:** a real first strike would use hundreds of missiles, not five. The launch-detection system was new. Ground radar showed no corroboration. Quote: "When people start a war, they don't start it with only five missiles" (Washington Post, 1999). Also: "I had a funny feeling in my gut." | B | [Gulf News (WaPo reprint)](https://gulfnews.com/amp/story/world%2Feurope%2Fpetrov-the-soviet-officer-who-averted-a-nuclear-war-dies-1.2092583), [NPR](https://www.npr.org/transcripts/552181937), [History.com](https://www.history.com/articles/nuclear-attack-warning-cold-war-petrov) |
| **Aftermath:** he was first praised, then interrogated, then reprimanded over incomplete logbook entries. His reply: "I had a phone in one hand and the intercom in the other, and I don't have a third hand." He got no reward. | A | [Smithsonian](https://www.smithsonianmag.com/smart-news/man-who-saved-world-nuclear-annihilation-dies-77-180964934/), [Arms Control Assoc.](https://www.armscontrol.org/act/2017-10/news-briefs/man-saved-world-dies-77) |
| **Later life:** Association of World Citizens award (2004; honoured at the UN in January 2006), Dresden Peace Prize (2013), Future of Life Award (2018). He died on **19 May 2017** in Fryazino, and the death became public in September 2017. | A | [Arms Control Assoc.](https://www.armscontrol.org/act/2017-10/news-briefs/man-saved-world-dies-77), [FLI](https://futureoflife.org/project/future-of-life-award/), [Gazeta.ru](https://www.gazeta.ru/social/2013/02/26/4981721.shtml) |

**On-screen Russian text, summarised:**
- «СТАРТ» is the best-attested word. Petrov himself names it.
- «РАКЕТНОЕ НАПАДЕНИЕ» is attested in secondary Russian accounts. It also matches the system's official name, СПРН (Система предупреждения о ракетном нападении, the missile-attack warning system). One source gives «РАКЕТНАЯ АТАКА» instead.
- "Reliability: highest" is how Petrov paraphrased the display. **The exact layout and field label of the real display are not documented.** «ДОСТОВЕРНОСТЬ: ВЫСШАЯ» is a faithful reconstruction, not a transcription.
- **«ЗАПУСК» does not appear in any account found.** Avoid it, or treat it as invented UI.

### Myths and errors to avoid (Petrov)

- **"He disobeyed orders / ignored his instructions."** Petrov was the officer whose job was to assess the alert and report it. He reported it, as a system malfunction. Sources describe a departure from expected procedure, not defiance of a direct order. The lyric "ignored all previous instructions" is fine as a poetic, prompt-injection-style line, but do not put it in a caption as a fact.
- **"He had his finger on the button" / "he alone prevented World War III."** He had no launch authority. Any decision rested with the General Staff and the political leadership. He said he was "in the right place at the right time" and did not see himself as a hero.
- **"Five missiles at once."** The system reported one launch, then four more.
- **Wrong dates.** Some popular pages give 27 September 1983, or even 1984. The correct date is the night of 25/26 September 1983.
- **"He was fired or punished for it."** He was reprimanded over paperwork, not punished for his decision.

---

## 2. Arkhipov and submarine B-59, 27 October 1962

> "sixty-two, depth charges falling, two said fire. Arkhipov said no."

### Facts

| Fact | Grade | Source |
|---|---|---|
| **B-59** was a Project 641 diesel submarine (NATO name **Foxtrot**) of the 69th Submarine Brigade, Northern Fleet. US forces designated it C-19. | A | [WP: B-59](https://en.wikipedia.org/wiki/Soviet_submarine_B-59), [NSArchive 2022](https://nsarchive.gwu.edu/briefing-book/russia-programs/2022-10-03/soviet-submarines-nuclear-torpedoes-cuban-missile-crisis) |
| B-59 was hunted on 27 October 1962 ("Black Saturday") by the **USS Randolph (CVS-15)** anti-submarine group, Task Group 83.2. **USS Cony (DD-508)** and **USS Beale (DD-471)** dropped **practice depth charges (PDCs)**, about the size of hand grenades, as a signal to surface. The deck logs survive. | A | [Beale deck log, NSArchive](https://nsarchive.gwu.edu/document/28922-13-deck-log-book-excerpts-uss-beale-dd-471-october-1962), [Naval War College Review](https://digital-commons.usnwc.edu/cgi/viewcontent.cgi?article=8349&context=nwc-review), [USNI](https://www.usni.org/magazines/naval-history-magazine/2021/june/black-saturday-declassified) |
| The US had announced the signalling procedure to Moscow, but **the notice never reached the submarines**. | A | [NSArchive 2002 "Submarines of October"](https://nsarchive2.gwu.edu/NSAEBB/NSAEBB75/) |
| **Officers:** Captain 2nd rank **Valentin Grigorievich Savitsky** (commander); **Ivan Semenovich Maslennikov** (deputy for political affairs); Captain 2nd rank **Vasili Aleksandrovich Arkhipov**, brigade chief of staff, who was aboard and equal in rank to the captain. | A | [WP: Arkhipov](https://en.wikipedia.org/wiki/Vasily_Arkhipov), [PBS](https://pbs.org/wnet/secrets/the-man-who-saved-the-world-about-this-episode/871) |
| **Weapon:** one T-5 nuclear torpedo. The commonly cited yield is **about 10 kt**, with published estimates of roughly 5-15 kt. For comparison, Hiroshima was about 15 kt. | B | [WP: B-59](https://en.wikipedia.org/wiki/Soviet_submarine_B-59), [WP: nuclear torpedo](https://en.wikipedia.org/wiki/Nuclear_torpedo) |
| **Conditions aboard:** the air conditioning failed; temperatures in the compartments were above 45 °C (113 °F), and higher in the engine spaces; CO2 was rising; batteries were nearly flat; and there was no contact with Moscow. A crewman said men were "falling like dominoes". | B | [HNN](https://www.historynewsnetwork.org/article/the-day-nuclear-war-almost-broke-out), [NSArchive EBB 399](https://nsarchive2.gwu.edu/NSAEBB/NSAEBB399/) |
| **Vadim Orlov's account (2002):** Orlov was the signals-intelligence (OSNAZ) officer aboard. He recalls that Savitsky ordered the nuclear torpedo readied and shouted: "We're going to blast them now! We will die, but we will sink them all – we will not disgrace our Navy!" Arkhipov calmed him, and B-59 surfaced among the US ships. | C (verbatim quote), A (that the account exists) | [NSArchive EBB 399](https://nsarchive2.gwu.edu/NSAEBB/NSAEBB399/), [National Geographic](https://www.nationalgeographic.com/culture/article/you-and-almost-everyone-you-know-owe-your-life-to-this-man) |
| **Corroboration:** Plokhy (*Nuclear Folly*, 2021) cites navigator Viktor Mikhailov and torpedo officer Anatoly Leonenko, who both say Savitsky did order the torpedo prepared and then changed his mind. Plokhy also argues that B-59 surfaced mainly because its **batteries were exhausted**. | B | [Peace News review](https://peacenews.info/node/10005), [Belfer Center](https://www.belfercenter.org/publication/plokhys-new-cuban-missile-crisis-book-offers-glimpse-minds-rank-and-file-soviet) |
| In 2022 the NSArchive published Arkhipov's own recollection in English for the first time. It "implicitly confirms" that something extraordinary happened that night. | A | [NSArchive 2022](https://nsarchive.gwu.edu/briefing-book/russia-programs/2022-10-03/soviet-submarines-nuclear-torpedoes-cuban-missile-crisis) |
| Arkhipov (1926-1998) received the **first Future of Life Award**, given posthumously on 27 October 2017. | A | [FLI 2017](https://futureoflife.org/fla-award/future-of-life-award-2017/) |

### Well-sourced versus legend (Arkhipov)

- **Well sourced:** the pursuit, the signalling depth charges, the nuclear torpedo aboard, the brutal conditions, B-59 surfacing, Arkhipov's seniority, and Savitsky's order to prepare the torpedo, which three crew accounts support.
- **Legend or reconstruction:**
  - A formal **"two-of-three vote"** in which **Maslennikov voted yes**. This comes from documentaries and later retellings (PBS 2012 and others), not from contemporaneous records. Orlov's memoir does not describe a vote.
  - The rule that "all three senior officers had to consent". No published order says this. Arkhipov's assent mattered because of his rank and post.
  - **Lyric "two said fire":** acceptable as poetry. In a caption, write "the captain ordered the nuclear torpedo readied", not "two officers voted to fire".
- **Other errors to avoid:**
  - "The US was trying to sink it with real depth charges." They were signalling charges, although the crew could not have known that.
  - "Arkhipov was the captain." He was not; Savitsky was.
  - "B-59 was off Cuba." It was in the western Atlantic, hundreds of miles from Cuba.
  - The precise surfacing time and the claim that aircraft fired on it vary between accounts.

---

## 3. Gunpowder: the elixir of life becomes the end of life

> "Priests in the smoke wanted never to die, sulfur and saltpeter, thunder in the sky; looked for a life with no end, and they found an end with no life"

| Fact | Grade | Source |
|---|---|---|
| **火药 huǒyào** literally means "fire medicine" or "fire drug". 药 means medicine. The name records its origin in elixir alchemy. | A | [zdic 火药](https://www.zdic.net/hans/火药), [WP: Gunpowder](https://en.wikipedia.org/wiki/Gunpowder) |
| Taoist alchemists (道士 dàoshì, often translated "Taoist priests") practised **外丹 / 炼丹 liàndān**, external alchemy, in search of an elixir of immortality (**长生不老** chángshēng bùlǎo, "long life, never growing old"; 仙丹/金丹, "immortal" or "golden" elixir). | A | [WP: Zhenyuan Miaodao Yaolue](https://en.wikipedia.org/wiki/Zhenyuan_Miaodao_Yaolue) |
| **《真元妙道要略》** (*Zhenyuan miaodao yaolüe*, "Classified Essentials of the Mysterious Tao of the True Origin of Things"). It is attributed to Zheng Yin; most of it was written in the 9th century, with a compilation date around 950. Its 35 dangerous recipes include three with saltpeter. | A | [WP](https://en.wikipedia.org/wiki/Zhenyuan_Miaodao_Yaolue), [Space Daily](https://spacedaily.com/?p=768664) |
| **The warning, in Needham's translation:** "Some have heated together sulphur, realgar and saltpetre with honey; smoke and flames result, so that their hands and faces have been burnt, and even the whole house where they were working burned down." (Needham, *Science & Civilisation in China* vol. 5 pt 7, 1986, p. 112.) | B (wording) | [WP](https://en.wikipedia.org/wiki/Zhenyuan_Miaodao_Yaolue) |
| **Chinese, in its commonly quoted form:** 有以硫黄、雄黄合硝石并蜜烧之，焰起，烧手面及烬屋舍者。 Check this against a Daozang edition before showing it full-screen. | B | [simplelits full text](https://simplelits.com/books/classical/classical-07788-真元妙道要略), [CUHK sample](https://cup.cuhk.edu.hk/image/data/preview/9789629965686_Sample.pdf) |
| **Ingredients:** 硝石 xiāoshí, saltpeter (potassium nitrate); 硫黄 liúhuáng, sulfur; 木炭 mùtàn, charcoal. In the 9th-century warning: 雄黄 xiónghuáng, realgar (arsenic sulfide), and 蜜 mì, honey (a carbon source). | A | [WP: Gunpowder](https://en.wikipedia.org/wiki/Gunpowder) |
| **《武经总要》 Wujing Zongyao, 1044**, compiled by Zeng Gongliang 曾公亮, Ding Du 丁度 and Yang Weide. It holds the **first written gunpowder formulas**: two incendiary-bomb mixes (about 48-50% saltpeter) and one poison-smoke mix. At no more than 50% saltpeter they were incendiaries, not true explosives. A proportioned formula from about 808 (Qingxuzi: sulfur, saltpeter and birthwort) predates it. | A | [WP timeline](https://en.wikipedia.org/wiki/Timeline_of_the_gunpowder_age), [New World Encyclopedia](https://newworldencyclopedia.org/entry/Black_powder) |
| **"Thunder in the sky":** the Wujing Zongyao lists the 霹雳炮/霹雳火球 **"thunderclap bomb"** (bamboo shell). The Jin dynasty's iron-cased **震天雷 "heaven-shaking thunder"** bomb appears in 1231 and was used in the defence of Kaifeng in 1232. | A | [WP: Thunder crash bomb](https://en.wikipedia.org/wiki/Thunder_crash_bomb), [UW China Civ](https://depts.washington.edu/chinaciv/miltech/tfirearms.htm) |
| **火枪 Fire lance:** painted on a Dunhuang silk banner around 950 (Musée Guimet). The first recorded battle use was at the siege of De'an in 1132 under Chen Gui. | A | [WP: Siege of De'an](https://en.wikipedia.org/wiki/Siege_of_De%27an), [WP: History of the firearm](https://en.wikipedia.org/wiki/History_of_the_firearm) |
| **火箭 huǒjiàn,** literally "fire arrow", is the modern Chinese word for "rocket". | A | [ChinaNews](https://www.chinanews.com.cn/m/cul/2016/10-25/8043023.shtml) |

**From gunpowder to the bomb:**
- Gunpowder led to fire arrows, then true rockets, then European war rockets, then the **V-2** (first combat launch 1944), then the **R-7**, the first ICBM (1957). (WP: [V-2](https://en.wikipedia.org/wiki/V-2_rocket), [R-7](https://en.wikipedia.org/wiki/R-7_Semyorka).)
- Separately, every implosion-type nuclear weapon is set off by **chemical high explosives** that crush its core. ([WP: Nuclear weapon design](https://en.wikipedia.org/wiki/Nuclear_weapon_design).)
- Wording for the caption: "the same chemistry that failed to make us immortal now lights the fuse." Black powder itself is not used in modern warheads or ICBMs.

### Myths and errors to avoid (gunpowder)

- **"The Chinese only used gunpowder for fireworks."** False. It was used in war from at least the 10th century.
- **"Sun Simiao invented gunpowder."** That attribution, through the 伏火 "fire-subduing" recipe, is disputed.
- **"The Zhenyuan text is a gunpowder recipe."** It is a *warning against* heating these ingredients.
- **"Wan Hu, the Ming astronaut on a rocket chair."** This is a 20th-century Western legend: *Scientific American* in 1909 and Zim in 1945. There is no historical record. ([WP: Wan Hu](https://en.wikipedia.org/wiki/Wan_Hu))
- **"Priests":** the alchemists were Taoist adepts or 道士. "Priests" is a fair loose translation.

---

## 4. The near-miss list

> "Secret list of every near-miss and disaster, running total no one ever knew: coin flips, all heads, a hundred in a row"

- **Data:** `render/data/nearmisses.json`, with 39 entries. Breakdown:
  - 13 false alarms, 13 weapon accidents, 7 crisis incidents, 4 submarine incidents, 1 production disaster and 1 civil reactor.
  - 5 are marked `disputed` and 1 is marked `severity_debated`.
- **Overview sources:**
  - [UCS "Close Calls with Nuclear Weapons" (2015)](https://www.ucs.org/sites/default/files/attach/2015/04/Close%20Calls%20with%20Nuclear%20Weapons.pdf)
  - [FLI timeline](https://futureoflife.org/resource/nuclear-close-calls-a-timeline/)
  - [Chatham House "Too Close for Comfort" (2014; 13 cases, 1962-2002)](https://www.chathamhouse.org/2014/04/too-close-comfort-cases-near-nuclear-use-and-options-policy)
  - [A. F. Phillips, "20 Mishaps"](https://pugwashgroup.ca/cnanw/20-mishaps-that-might-have-started-a-nuclear-war/)
  - [AHF Broken Arrows](https://ahf.nuclearmuseum.org/ahf/history/broken-arrow-accidents/)
- **Disputed or caveated entries:**
  - **Okinawa, 28 October 1962:** single-source. John Bordne's account appeared in the [Bulletin, 2015](https://thebulletin.org/2015/10/the-okinawa-missiles-of-october/). Other missileers rejected it in Stars and Stripes in December 2015, and the Air Force has released no records. **Never caption it as fact.**
  - **B-59:** the core event is solid; the details of a "vote" are not.
  - **Suez swans, 1956:** thinly sourced. Popular versions say "NORAD", which did not exist until 1957-58.
  - **Vandenberg, 26 October 1962:** sources disagree on whether the missile was an Atlas (Sagan) or a Titan II.
  - **The August 1991 coup:** who actually controlled launch authority is debated.
  - **Able Archer 83:** how dangerous it really was is debated; see [War on the Rocks](https://warontherocks.com/the-mythical-war-scare-of-1983/).
  - **The 46-cent chip, 1980:** the Pentagon blamed it, but tests could not make the part fail again.
- **Goldsboro:** the bombs were **Mark 39, about 3-4 Mt**. "Twenty megaton" and "24 Mt" figures online are wrong. One bomb completed three of its four arming steps. The quote from Sandia's 1969 "Goldsboro Revisited" memo by Parker F. Jones reads: "One simple, dynamo-technology, low voltage switch stood between the United States and a major catastrophe." ([NSArchive EBB 475](https://nsarchive2.gwu.edu/nukevault/ebb475/))
- **Thule, 1960:** the "99.9% certainty" figure is widely repeated. It helped that Khrushchev was in New York at the time. ([GlobalSecurity](https://www.globalsecurity.org/wmd/ops/1960-moon.htm))
- **The coin flips:**
  - The probability of 100 heads in a row is 2⁻¹⁰⁰ = **7.9 × 10⁻³¹**, or 1 in **1,267,650,600,228,229,401,496,703,205,376**. This is my own arithmetic.
  - Close calls were not literal 50/50 events, so never present the list as a measured probability. "A hundred in a row" is a metaphor; the list has 39 entries, and the true number is unknown.

---

## 5. The count: patterns that do and don't need a mind

> "Snowflake in the boundless night ... counting out in bursts of light, a one-way dialogue: a pattern no dead star could make."

| Fact | Grade | Source |
|---|---|---|
| **Pulsars**, the classic "pattern a dead star CAN make". Jocelyn Bell (with Hewish) found CP 1919, now **PSR B1919+21**, in 1967 and nicknamed it **"LGM-1"** ("Little Green Men 1"). Its period is **1.3373 s**. It was published in *Nature* in February 1968. It is a rotating neutron star, the corpse of a star, ticking with clockwork regularity. | A | [APS](https://www.aps.org/publications/apsnews/200602/history.cfm), [Linda Hall](https://lindahall.org/jocelyn-bell-burnell) |
| **Hydrogen line:** **1420.405751768 MHz** (21.106 cm), the hyperfine spin-flip of neutral hydrogen. Cocconi & Morrison proposed it for SETI in *Nature* 184:844-846 (19 September 1959). The "water hole" lies between the H line (21 cm) and the OH lines (18 cm). | A | [WP: Hydrogen line](https://en.wikipedia.org/wiki/Hydrogen_line), [Linda Hall: Cocconi](https://www.lindahall.org/about/news/scientist-of-the-day/giuseppe-cocconi/) |
| **Wow! signal:** detected 15 August 1977 by Big Ear at Ohio State. Jerry Ehman circled "**6EQUJ5**" a few days later. It lasted about **72 s** (the beam's transit time) at about 1420.4556 MHz, from the direction of Sagittarius, and has never been seen again. 6EQUJ5 is a signal-strength code, **not a message**. A 2024 preprint (Méndez et al., "Arecibo Wow!") proposes a natural maser-like flare of a hydrogen cloud. That is unconfirmed. | A | [WP](https://en.wikipedia.org/wiki/Wow!_signal), [Mental Floss](https://www.mentalfloss.com/article/67295/6equj5-wow-signal), [arXiv 2408.08513](https://arxiv.org/pdf/2408.08513v1) |
| **Arecibo message:** 16 November 1974, at 2,380 MHz and 10 bit/s, lasting under 3 minutes. It is **1,679 bits = 23 × 73** (both prime, so the grid can only be 23 × 73 or 73 × 23). Frank Drake designed it with Carl Sagan and others. Its first row **counts 1-10 in binary**. It was aimed at globular cluster **M13**, about 21,000-25,000 ly away (sources differ). The earliest possible reply would take about 42,000-50,000 years, a "one-way dialogue". | A | [SETI Institute](https://www.seti.org/news-archive/news-archive-detail?id=409), [Universe Today](https://www.universetoday.com/articles/what-is-the-arecibo-message) |
| **Contact** (Sagan's 1985 novel; 1997 film): a signal from Vega (26 ly) counts **prime numbers**. In the film the primes run up to 101, according to fan analyses (grade B). Primes are the textbook "no natural process" pattern. The exact frequency in the film is unverified, so leave it out. | A (primes, Vega) | [WP: Contact (novel)](https://en.wikipedia.org/wiki/Contact_(novel)), [WP: Contact (film)](https://en.wikipedia.org/wiki/Contact_(1997_American_film)) |
| **Lincos** (*lingua cosmica*): Hans Freudenthal, *Lincos: Design of a Language for Cosmic Intercourse* (North-Holland, 1960). It is built up from arithmetic and logic, and influenced the Cosmic Call messages of 1999 and 2003. | A | [WP: Lincos](https://en.wikipedia.org/wiki/Lincos_language) |
| **Voyager Golden Record** (1977): greetings in 55 languages, 115 images (116 counting the calibration image), about 90 minutes of music, and a committee chaired by Sagan. **Sagan:** "...the launching of this 'bottle' into the cosmic 'ocean' says something very hopeful about life on this planet." This matches the lyric "message in a bottle". **Carter's message:** "We are attempting to survive our time so we may live into yours." | A | [NASA Golden Record](https://science.nasa.gov/mission/voyager/golden-record-contents/), [NASA 1977 press kit](https://ntrs.nasa.gov/api/citations/19770079863/downloads/19770079863.pdf), [WP](https://en.wikipedia.org/wiki/Voyager_Golden_Record) |
| **METI** (Messaging Extraterrestrial Intelligence): the term was coined by Alexander Zaitsev (Yevpatoria RT-70 dish; Cosmic Call 1999, 2003). Whether to transmit is a live controversy; the Dark Forest is the fictional extreme of that worry. | A | [WP: Active SETI](https://en.wikipedia.org/wiki/Active_SETI), [Universe Today](https://www.universetoday.com/articles/who-speaks-for-earth-the-controversy-over-interstellar-messaging) |
| **Kepler's snowflake:** *Strena seu de nive sexangula* ("A New Year's Gift, or On the Six-Cornered Snowflake"), Frankfurt, 1611. It was a gift to his patron Wackher von Wackenfels: "a book about nothing", punning on Latin *nix* (snow) and German *nix* (nothing). It is often called the first treatise on crystallography and gave rise to the Kepler conjecture on sphere packing, proved by Hales in 1998. | A | [St Edmund Hall, Oxford](https://www.seh.ox.ac.uk/blog/johannes-kepler-on-snowflakes), [OU Galileo exhibit](https://galileo.ou.edu/exhibits/snowflake-or-six-angled-crystal) |
| **Phyllotaxis:** sunflower spirals usually come in consecutive Fibonacci counts (34/55, 55/89). The golden angle is 137.5°. In the 2016 *Turing's Sunflowers* study of 657 heads, 565 of the 768 reliable spiral counts were Fibonacci and 67 more were Fibonacci-like; about 1 in 5 did not fit. | A | [Swinton et al. 2016, RSOS](https://pmc.ncbi.nlm.nih.gov/articles/PMC4892450), [Manchester](https://www.manchester.ac.uk/discover/news/turings-sunflowers-growing-alan-turings-legacy) |

### The nuance that makes the lyric smarter

- A **snowflake** is exquisite six-fold order from pure physics: the hexagonal ice lattice, with no mind involved.
- A **pulsar** is perfect rhythm from a dead star.
- So "order" and "regularity" are not evidence of a mind.
- **Fibonacci numbers do arise in nature, but only in *living* growth** (phyllotaxis). So "a pattern no dead star could make" is literally true: no known non-living astrophysical source sends a pulse train that counts 1, 1, 2, 3, 5, 8.
- Real message designers prefer primes (*Contact*) or binary counting (Arecibo).
- The video can stage this progression: snowflake (physics), then pulsar (dead star), then Fibonacci bursts (life or mind).

### Myths and errors to avoid (signals)

- "The Wow! signal said something." It did not; 6EQUJ5 is a measure of signal strength.
- "The nautilus shell is a golden spiral." It is a logarithmic spiral, but not the golden one.
- "No two snowflakes are alike." This cannot be proven, and not all snow crystals are six-armed stars.
- "The Arecibo message was a serious attempt at a conversation." Drake called it symbolic. M13 will have moved by the time the message arrives.

---

## 6. The Dark Forest, and the case against it

> "They say the forest's dark, every hunter holds its breath, any world that lights a spark is lighting its own death. But fear's a chain, and chains are links..."

| Fact | Grade | Source |
|---|---|---|
| The idea comes from **Liu Cixin 刘慈欣, 《三体II：黑暗森林》 *The Dark Forest*** (Chongqing Publishing, 2008), book 2 of 《地球往事》 *Remembrance of Earth's Past*. The English translation is by **Joel Martinsen** (Tor, 2015). Ken Liu translated books 1 and 3. | A | [WP: The Dark Forest](https://en.wikipedia.org/wiki/The_Dark_Forest), [SF in Translation](https://sfintranslation.com/?p=241) |
| **"Cosmic sociology" (宇宙社会学) axioms**, given by Ye Wenjie to Luo Ji in the prologue. **1. "Survival is the primary need of civilization."** 生存是文明的第一需要。 **2. "Civilization continuously grows and expands, but the total matter in the universe remains constant."** 文明不断增长和扩张，但宇宙中的物质总量保持不变。 | A (English), B (Chinese) | [LitCharts (p. 13)](https://www.litcharts.com/lit/the-dark-forest/terms/dark-forest-theory), [Big Think](https://bigthink.com/series/the-big-think-interview/dark-forest-hypothesis/), [萌娘百科](https://zh.moegirl.org.cn/%E9%BB%91%E6%9A%97%E6%A3%AE%E6%9E%97) |
| **Two key concepts:** **猜疑链** ("chains of suspicion": A cannot know whether B is benign, nor whether B believes A is benign, and so on without end) and **技术爆炸** ("technological explosion": any civilization might leap ahead suddenly). | A | [萌娘百科](https://zh.moegirl.org.cn/%E9%BB%91%E6%9A%97%E6%A3%AE%E6%9E%97) |
| **The quote**, in Martinsen's English: "The universe is a dark forest. Every civilization is an armed hunter stalking through the trees like a ghost, gently pushing aside branches that block the path and trying to tread without sound. Even breathing is done with care..." It continues: if he finds other life, "there's only one thing he can do: open fire and eliminate them." **Chinese:** 宇宙就是一座黑暗森林，每个文明都是带枪的猎人，像幽灵般潜行于林间，轻轻拨开挡路的树枝，竭力不让脚步发出一点儿声音，连呼吸都小心翼翼……能做的只有一件事：开枪消灭之。……任何暴露自己存在的生命都将很快被消灭。 | B (verify against print) | [Goodreads quotes](https://www.goodreads.com/author/show/5780686.Cixin_Liu), [萌娘百科](https://zh.moegirl.org.cn/%E9%BB%91%E6%A3%AE%E6%89%93%E5%87%BB) |
| **Lyric mapping:** "every hunter holds its breath" corresponds to 连呼吸都小心翼翼 ("even breathing is done with care"). "Any world that lights a spark is lighting its own death" corresponds to 任何暴露自己存在的生命都将很快被消灭 ("any life that exposes its existence will soon be wiped out"). "Fear's a chain" answers 猜疑链. | (analysis) | — |
| **It is fiction, not science.** Liu calls the Dark Forest "an extreme hypothetical model" for cosmic sociology and says applying it to humanity is a misreading. Similar ideas are older: Saberhagen's *Berserker* stories (1963) and Brin's "Great Silence" review (*QJRAS* 24:283, 1983), which catalogued many explanations for the silence. "Dark forest rule" as an academic label: Yu (2015), *JBIS* 68:142. | A | [HKUST Library](https://library.hkust.edu.hk/news-events/news/liu-cixin-at-hkust-library), [Brin](https://davidbrin.com/seti.html), [ResearchGate: Yu 2015](https://www.researchgate.net/publication/283986931_The_Dark_Forest_Rule_One_Solution_to_the_Fermi_Paradox) |

### Counterarguments

- **Repeated games favour cooperation.** In Axelrod's 1980 computer tournaments of the iterated prisoner's dilemma, Anatol Rapoport's **TIT FOR TAT** won both rounds. It cooperates first, then copies the other player's last move. Axelrod & Hamilton, *Science* 211:1390 (1981); the book *The Evolution of Cooperation* followed in 1984. Cooperation evolves when "the shadow of the future" is long, and civilizations that last millions of years have very long futures. ([WP: Tit for tat](https://en.wikipedia.org/wiki/Tit_for_tat), [Axelrod, Citation Classic](https://websites.umich.edu/~axe/research/Software/CC/ECHome/ECCitationClassic.html))
- **Costly signalling (Zahavi/Spence).** A civilization that broadcasts openly is making an expensive, hard-to-fake signal of confidence, not weakness. This is my inference from signalling theory; no single published SETI paper found makes the argument.
- **Vastness and cost.** Over light-years, attacks are slow, costly and uncertain. A strike also reveals the attacker, and you cannot be sure you have destroyed every target, so retaliation remains possible. Commentators note that treating a whole civilization as one actor is a further simplification. ([National Geographic](https://www.nationalgeographic.com/science/article/dark-forest-theory-alien-life), [Noahpinion](https://www.noahpinion.blog/p/the-dark-forest-hypothesis-is-absurd?open=false))
- **Astrobiology view.** Astrobiologist Ian McTier calls it one of the less compelling Fermi-paradox explanations because it rests on anthropocentric assumptions. ([National Geographic](https://www.nationalgeographic.com/science/article/dark-forest-theory-alien-life))
- **The video's thesis (the build section) is a survivorship argument.** "Only the ones who held their fire are out there at all" restates the Drake equation's **L**: civilizations that destroy themselves stop transmitting.
  - **Drake equation (1961, Green Bank):** N = R* · fp · ne · fl · fi · fc · **L**, where L is how long a civilization releases detectable signals. ([WP: Drake equation](https://en.wikipedia.org/wiki/Drake_equation))
  - **Great Filter:** Robin Hanson, "The Great Filter – Are We Almost Past It?". First drafted in August 1996; the web version is dated 15 September 1998. ([Hanson](https://mason.gmu.edu/~rhanson/greatfilter.html), [WP: Great Filter](https://en.wikipedia.org/wiki/Great_Filter))

### Errors to avoid (Dark Forest)

- Calling it "a scientific theory".
- Crediting the axioms to Ken Liu's translation; the translator of this book is Martinsen.
- Dating the Great Filter to 1998 only. Say "1996" for the idea.

---

## 7. "Six hundred worlds across the Milky Way"

| Fact | Grade | Source |
|---|---|---|
| **610 is a Fibonacci number,** F(15) with F(1) = F(2) = 1. The sequence runs 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, **610**. The lyric's counts run F(1)-F(11). | A | arithmetic; [WP: Fibonacci](https://en.wikipedia.org/wiki/Fibonacci_sequence) |
| **Disk diameter:** the conventional figure is **about 100,000 ly** for the bright stellar disk. Disk stars have been found more than 25 kpc from the centre, giving a disk of roughly 200,000 ly (López-Corredoira et al. 2018). There is no sharp edge. | A | [Phys.org](https://m.phys.org/news/2018-05-disc-milky-bigger-thought.html), [Space.com](https://space.com/41047-milky-way-galaxy-size-bigger-than-thought.html) |
| **Sun to centre:** **8.178 kpc, about 26,700 ly** (GRAVITY 2019); 8.275 kpc, about 27,000 ly (GRAVITY 2021). Say "about 26,000-27,000 ly". | A | [arXiv 1904.05721](https://arxiv.org/abs/1904.05721), [A&A 2021](https://www.aanda.org/10.1051/0004-6361/202040208) |
| **Arms** (Reid et al. 2019): Norma-Outer, Scutum-Centaurus(-OSC), Sagittarius-Carina and Perseus are the major arms, with a segment-weighted mean pitch angle of about 10°. Also the 3-kpc arms, and the **Local Arm / Orion Spur, where the Sun is**. The parameters are in `milkyway.json`: the Perseus row and the Sagittarius-Carina kink and pitch angles were independently confirmed; **verify the other rows against Table 2 of arXiv:1910.03357.** | A/B | [ApJ 885:131](https://iopscience.iop.org/article/10.3847/1538-4357/ab4a11), [arXiv:1910.03357](https://arxiv.org/abs/1910.03357), [Perseus 2026](https://arxiv.org/pdf/2603.05896) |
| **Galactic habitable zone:** an annulus **7-9 kpc** from the centre whose stars formed 8-4 billion years ago; about 75% of them are older than the Sun (Lineweaver, Fenner & Gibson, *Science* 303:59, 2004). It is a model, not a measured boundary. | A | [arXiv astro-ph/0401024](https://arxiv.org/abs/astro-ph/0401024) |
| **Human radio bubble:** a radius of **about 100-120 ly**, roughly 0.2% of the disk's width. That counts from regular broadcasting (1920) or Fessenden's 1906 broadcast, which is itself disputed. Leakage is far too weak to detect at that range with human-level receivers. | B | [Planetary Society](https://www.planetary.org/articles/3390), [EarthSky](https://earthsky.org/space/earths-radio-bubble-extent-of-radio-signals/) |

The 610-civilization contact graph is fiction. Label it on screen as "SIMULATION" or "FICTIONAL".

---

## 8. Verse 1: sea, fin, foot, hand, egg, seed

> "Out of the sea with salt in our lungs, fin into foot into hand ... carried the egg through the dust and the mud, seeds in the dark for the waking flood"

| Fact | Grade | Source |
|---|---|---|
| ***Tiktaalik roseae***: about 375 Mya (Late Devonian), Ellesmere Island, Nunavut. Found in 2004 and published in *Nature* in 2006 (Daeschler, Shubin & Jenkins). It had gills, lungs, a neck and wrist-like fin bones. It is a "fishapod", not the first tetrapod. | A | [WP: Tiktaalik](https://en.wikipedia.org/wiki/Tiktaalik), [Phys.org](https://phys.org/news182005810.html) |
| **The oldest tetrapod trackways,** at Zachełmie, Poland, date to about 395 Mya (Niedźwiedzki, Ahlberg et al., *Nature* 2010). That is earlier than Tiktaalik. They were made in a **marine** tidal setting, which supports "out of the sea". | A | [Uppsala Univ.](https://www.uu.se/en/press/press-releases/2009/2010-01-07-fossil-footprints-give-land-vertebrates-a-much-longer-history) |
| **Lungs came before legs.** The earliest bony fishes had lungs, and swim bladders evolved *from* lungs. "Salt in our lungs" is therefore poetically sound. | B | [ASU Ask A Biologist](https://askabiologist.asu.edu/top-questions/test-question), [Cornell Sun](https://cornellsun.com/2013/04/16/solving-an-evolutionary-puzzle/) |
| **The amniotic egg:** the earliest known amniote is ***Hylonomus lyelli***, from Joggins, Nova Scotia, about 312 Mya (often given as 310-315; a 2015 re-dating puts it in the early Langsettian). **No fossil eggs that old exist.** Definite amniote eggs appear only around 195 Mya (Early Jurassic); possible Early Permian mesosaur embryos have no shells. The egg's origin is inferred from the animals. | B | [Joggins](https://jogginsfossilcliffs.net/research/historical/), [Southampton 2015](https://eprints.soton.ac.uk/376442), [Stein et al. 2019](https://pmc.ncbi.nlm.nih.gov/articles/PMC6418122) |
| **Seeds:** the oldest known seed plant is ***Elkinsia polymorpha***, a Late Devonian (Famennian, 372-359 Mya) seed fern from West Virginia. "About 365 Mya" is a midpoint. | B | [UCMP Berkeley](https://ucmp.berkeley.edu/seedplants/seedplantsfr.html) |
| **Pale Blue Dot:** taken by Voyager 1 on 14 February 1990 from about 6 billion km (3.7 billion mi; 40.5 AU). Earth spans **0.12 pixel**. It was one of 60 frames in the "Family Portrait"; the cameras were switched off 34 minutes later. Sagan (1994): "That's here. That's home. That's us." | A | [NASA photojournal](https://science.nasa.gov/photojournal/solar-system-portrait-earth-as-pale-blue-dot), [NASA](https://science.nasa.gov/mission/voyager/voyager-1s-pale-blue-dot), [WP](https://en.wikipedia.org/wiki/Pale_Blue_Dot) |

### Myths and errors to avoid (verse 1)

- **"Our blood is seawater."** Plasma is about 0.9% salt; seawater is about 3.5%. This is Quinton's and Macallum's old idea, now discredited. ([Nature 1931](https://www.nature.com/articles/128066b0.pdf))
- **"Tiktaalik was the first animal on land."**
- **"We know the egg from 312-million-year-old fossil eggs."**
- **"Tiktaalik was found in 2006."** It was found in 2004 and published in 2006.

---

## 9. Lyric-by-lyric verdicts

| Lyric | Verdict |
|---|---|
| "fin into foot into hand" | OK. Digits evolved before limbs were used for walking ([*Acanthostega*](https://en.wikipedia.org/wiki/Acanthostega) had 8 digits). |
| "carried the egg through the dust and the mud" | OK as poetry. The fossil record has no eggs from that period. |
| "a pattern no dead star could make" | **True, and strong**, if paired with the pulsar contrast. |
| "Priests in the smoke wanted never to die" | OK. They were Taoist alchemists seeking immortality elixirs. |
| "sulfur and saltpeter, thunder in the sky" | OK. These are the actual ingredients; the 霹雳 "thunderclap" and 震天雷 "heaven-shaking thunder" bombs fit. |
| "Eighty-three, the satellites saw five" | OK. Strictly, one satellite's sensors produced five false launch reports (one, then four more). |
| "every rule said call it first strike" | Loose. Procedure was to pass the alert up; nobody at his level "called" a first strike. Fine as poetry. |
| "ignored all previous instructions" | Poetic and witty. Not a historical fact. Don't caption it as one. |
| "two said fire. Arkhipov said no." | Popular version. The documented core is that the captain ordered the torpedo readied and Arkhipov opposed. The vote is a reconstruction. |
| "coin flips, all heads, a hundred in a row" | Metaphor. 2⁻¹⁰⁰ ≈ 7.9 × 10⁻³¹. |
| "every hunter holds its breath" | A near-quote of Liu: 连呼吸都小心翼翼. |
| "Six hundred worlds" | 610 = F(15). Fiction; label it. |

---

## 10. Master list of myths and common errors

1. Petrov "disobeyed orders", "had his finger on the button", or saw "five missiles at once". Some sources also give the wrong date: 27 September, or 1984.
2. Petrov's screen said «ЗАПУСК». It is undocumented; use «СТАРТ».
3. Arkhipov's "formal vote" and Maslennikov's "yes" are reconstructions. "Real depth charges" is wrong. Arkhipov was not the captain.
4. B-59 "off Cuba". It was in the western Atlantic.
5. Goldsboro was "20/24 megatons". The Mark 39 was about 3-4 Mt.
6. The Okinawa launch order is presented as fact. It is a disputed single-source account.
7. NORAD in 1956. It did not exist yet.
8. "Chinese used gunpowder only for fireworks", and the Wan Hu rocket chair legend.
9. The Zhenyuan text is called a "gunpowder recipe". It is a warning.
10. 6EQUJ5 is called a message, or the Wow! signal "solved". The 2024 explanation is only a preprint hypothesis.
11. The Dark Forest is called "a scientific theory", or the translation credited to Ken Liu (for book 2).
12. The Great Filter is dated 1998 only. The idea dates from 1996.
13. The Milky Way "is exactly 100,000 ly". The edge is fuzzy; say "about".
14. The Sun is "30,000 ly from the centre". That is an old value; the current figure is about 26,700 ly.
15. "Our radio is detectable 100 ly away." It has *travelled* about 100 ly but is undetectable at that range.
16. "No two snowflakes are alike", and "nautilus = golden spiral".
17. "Fibonacci is everywhere in nature." It is common in phyllotaxis but not universal; about 1 in 5 sunflowers deviate.
18. "Blood = seawater"; "Tiktaalik = first land animal"; "egg fossils from 312 Mya".

---

## Open items before locking captions

- Read Table 2 of Reid 2019 (arXiv:1910.03357) and confirm the arm rows marked `verified:false` in `milkyway.json`.
- Confirm the exact Martinsen wording of the Dark Forest passage in the Tor edition, and the Chinese in the 重庆出版社 edition.
- Confirm the Chinese text of the Zhenyuan passage against a Daozang edition.
- If a Russian-language HUD is used for Petrov, pick «РАКЕТНОЕ НАПАДЕНИЕ» or «РАКЕТНАЯ АТАКА» and note the choice.
