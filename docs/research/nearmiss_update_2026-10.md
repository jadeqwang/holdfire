# Near-miss list: update check, 11 May 2025 to 27 Oct 2026

Researched 27 Oct 2026 for the "Hold Fire" near-miss list (docs/PLAN_TAKE_TWO.md, render/data/t2/nearmisses.json).

## Read this first: nothing below is verified yet

**I could not open a single source page.** WebFetch failed on every host (`getaddrinfo ENOTFOUND`: cnn.com, techcrunch.com, wikipedia.org, armscontrol.org), and curl through the session proxy got `403 CONNECT tunnel failed` for reuters.com, apnews.com, bbc.com, thebulletin.org and web.archive.org. The environment's network policy blocks these hosts. Only WebSearch worked. WebSearch returns titles, URLs and a summary its own model wrote, not the article text.

So everything below comes from **search-result summaries only**. The URLs are the ones the search returned; I have not read them. The brief says every claim needs a source I actually opened, so **no entry here is ready for the list**. Treat each one as a lead to check before anything goes on screen. To finish the job, allow the news hosts (cnn.com, en.wikipedia.org, armscontrol.org, thebulletin.org, reuters.com, apnews.com) in the environment's network settings, then open the sources and re-run this check.

Confidence labels below describe how consistent the search summaries were. They are not verification.

## The "Strait of Hormuz / hallucinated target" story

**What the party story most likely is: two separate 2026 stories blended together.**

1. **The AI "hallucination" near-miss (candidate 1 below).** CNN reported an exclusive on 18 Sep 2026: an AI chatbot made up a nuclear-weapons-program cargo for a Chinese ship, and US forces nearly boarded it. The reporting places this "in the Middle East" during the US–Israel war with Iran, in spring 2026. **None of the summaries say Strait of Hormuz.** The reports give no exact date and no location more precise than "Middle East".
2. **The Minab school strike (candidate 3).** On 28 Feb 2026 a US missile hit a girls' school in Minab, Hormozgan province, the province on the Strait of Hormuz. Bloomberg and others reported that the site went into the Maven AI targeting system under an outdated IRGC classification. That makes it a "mistaken target" story with an AI angle, right next to Hormuz.

The 2026 Strait of Hormuz crisis and campaign were real, according to many summaries (Iran closed the strait after the US–Israeli strikes began on 28 Feb 2026). The searches turned up **no report of an AI or automated system "hallucinating" a target in the Strait of Hormuz itself.** "Hallucinated target in Hormuz" as a single event is **not confirmed**.

---

## Candidates

### 1. AI-invented nuclear cargo: US nearly boards a Chinese ship (spring 2026)

- **Date:** "spring 2026" (exact day not reported). CNN published on 18 Sep 2026.
- **Place:** "the Middle East" (reported). Strait of Hormuz **not** stated.
- **On-screen line (55 chars):** `2026 · Middle East · AI fakes nuke cargo on Chinese ship`
- **What the summaries say:** An analyst at US Special Operations Command Pacific used an AI chatbot on intelligence about a Chinese ship's manifest. The chatbot wrongly concluded that the ship was carrying parts for a nuclear weapons program (some summaries say bound for Iran). A second AI pass turned this into a standard intelligence report, which circulated in military channels. Per CNN's four anonymous sources, armed personnel were preparing to board and military aircraft were already airborne before officials found the error and called the operation off. One source said it "almost started a war". The ship's real cargo is unknown. SOCPAC, the Pentagon and CENTCOM did not respond to CNN, and I found no official confirmation.
- **Sources (search results, not opened):**
  - CNN, 18 Sep 2026: https://www.cnn.com/2026/09/18/politics/us-military-ai-false-intelligence-china-ship
  - gCaptain (CNN republication), 18 Sep 2026: https://gcaptain.com/ai-error-nearly-triggered-u-s-intercept-of-chinese-ship-cnn-reports/
  - Maritime Executive: https://maritime-executive.com/article/report-ai-mistake-nearly-led-u-s-military-to-board-a-chinese-ship
  - The Defense Post, 21 Sep 2026: https://thedefensepost.com/2026/09/21/us-ai-error-chinese-ship/
  - TechCrunch, 18 Sep 2026: https://techcrunch.com/2026/09/18/ai-hallucination-nearly-triggers-us-military-operation/
  - Democracy Now, 21 Sep 2026: https://www.democracynow.org/2026/9/21/headlines/cnn_ai_agent_provides_us_military_with_false_intel_report_on_chinese_ship_in_the_middle_east
- **Confidence:** Medium that CNN published this (many outlets repeat it consistently). Low on the details: one outlet, anonymous sources, no official statement, no date, no exact place.
- **Recommendation: strongest fit, but don't add yet.** It involves two nuclear-armed states (US and China), a claimed nuclear-weapons cargo, and a false alarm caused by automation, which is the same family as the 1979 training-tape and 1980 chip entries. Before adding it: (a) open the CNN piece, (b) look for an official comment or follow-up reporting, and (c) get a date. The counter needs a day, and "spring 2026" would be the first entry without one. If no day can be found, it can't serve as a counter reset unless you accept a season-level date.

### 2. Indian and Pakistani warships collide (15 Sep 2026)

- **Date:** 15 Sep 2026.
- **Place:** North Arabian Sea, about 120 nmi from the Gulf of Oman (per one summary).
- **On-screen line (58 chars):** `2026 · Arabian Sea · Indian and Pakistani warships collide`
- **What the summaries say:** The Pakistani offshore patrol vessel PNS Hunain collided with an Indian destroyer, which media name as INS Kolkata (India has not confirmed the ship's identity). Pakistan says it happened during its Seaspark-26 exercise and inside its exclusive economic zone. India says it was in international waters and that Pakistan breached the 1991 agreement's three-nautical-mile separation rule. Damage was minor. Each side summoned the other's diplomats. Summaries call it the first physical military incident between the two since May 2025. No shots were reported, and no video or AIS tracks have been released.
- **Sources (search results, not opened):**
  - CFR Global Conflict Tracker: https://www.cfr.org/global-conflict-tracker/conflict/conflict-between-india-and-pakistan
  - Asian Military Review, Sep 2026: https://www.asianmilitaryreview.com/2026/09/indian-and-pakistani-warships-collide-in-arabian-sea-foc/
  - ThePrint: https://theprint.in/diplomacy/india-rejects-pakistans-allegations-on-ship-collision-in-high-seas-underlines-pns-hunain-was-at-fault/3046775/
  - EurAsian Times: https://www.eurasiantimes.com/why-ins-kolkata-held-fire/
- **Confidence:** Medium that the collision happened (consistent across Indian, Pakistani-sourced and trade press, plus CFR). It is low-severity.
- **Recommendation: lean don't add.** The states are nuclear-armed rivals, but this was a non-firing collision with minor damage. It is weaker than the U-2 or Duluth entries, which involved nuclear forces. If you want the list to end on the newest friction between nuclear-armed states, verify it first. It would then become the last reset (see counter below).

### 3. Minab school strike: stale target data fed through AI (28 Feb 2026)

- **Date:** 28 Feb 2026 (first day of the US–Israeli campaign).
- **Place:** Minab, Hormozgan province, Iran (near the Strait of Hormuz).
- **On-screen line (58 chars):** `2026 · Minab · Stale AI-fed target; US missile hits school`
- **What the summaries say:** Amnesty and Bellingcat linked the strike to a US Tomahawk. A preliminary US military investigation reportedly found the US responsible, working from outdated targeting information. Bloomberg reported that the site went into Maven still classed as an IRGC facility and came out as a recommended day-one target. Death tolls vary: at least 123 children (Bloomberg), 156 (Wikipedia), at least 170 (Amnesty). The Pentagon had not published its findings.
- **Sources (search results, not opened):**
  - Bloomberg: https://www.bloomberg.com/graphics/2026-iran-school-attack/
  - Al Jazeera, 16 Mar 2026: https://www.aljazeera.com/news/2026/3/16/us-responsible-for-deadly-attack-on-iranian-school-amnesty-international
  - Wikipedia: https://en.wikipedia.org/wiki/2026_Minab_school_attack
  - Lawfare: https://www.lawfaremedia.org/article/blame-the-pentagon--not-ai--for-preventable-targeting-mistakes
- **Confidence:** Medium that the strike and US responsibility are real. Low to medium on the AI's exact role.
- **Recommendation: don't add.** It was a conventional strike on a non-nuclear state in an ongoing war. No nuclear weapons and no clash between nuclear-armed states were involved, so it is a wartime atrocity rather than a near-miss. It is also likely the source of the "Hormuz + AI target" part of the rumour.

### 4. Iranian missiles land near Israel's Dimona nuclear centre (21 Mar 2026)

- **On-screen line (56 chars):** `2026 · Dimona · Iranian missiles land 14 km from reactor`
- **What the summaries say:** On 21 Mar 2026, after US–Israeli strikes on Natanz, Iranian missiles hit Dimona and Arad. Summaries report about 14 km from the reactor and 34 to 180 wounded. The IAEA said it had no indication of damage to the Negev Nuclear Research Center.
- **Sources (not opened):** https://www.aljazeera.com/news/2026/3/21/iran-strikes-towns-near-israels-nuclear-site-in-escalating-tit-for-tat ; https://www.military.com/feature/2026/03/22/strikes-near-israels-nuclear-research-center-mark-new-phase-of-war.html
- **Confidence:** Medium.
- **Recommendation: don't add.** This was a war strike by a non-nuclear state near a nuclear site. There was no weapons accident and no clash between nuclear-armed states.

### 5. US strikes Iranian nuclear sites; Iran fires at Al Udeid (22–23 Jun 2025)

- **On-screen line (59 chars):** `2025 · Iran · US bombs nuclear sites; Iran fires at US base`
- **What the summaries say:** On the night of 21/22 Jun 2025, B-2s struck Fordow, Natanz and Isfahan (Operation Midnight Hammer). On 23 Jun, Iran fired 19 ballistic missiles at Al Udeid, Qatar.
- **Sources (not opened):** https://en.wikipedia.org/wiki/2025_United_States_strikes_on_Iranian_nuclear_sites ; https://www.safia.hq.af.mil/IA-News/Article/4228301/historically-successful-strike-on-iranian-nuclear-site-was-15-years-in-the-maki
- **Confidence:** High that it happened (well known).
- **Recommendation: don't add.** It was deliberate conventional action against a non-nuclear state. It was not a near-miss of nuclear use or war between nuclear-armed states.

### 6. NATO jets shoot down Russian drones over Poland (10 Sep 2025)

- **On-screen line (45 chars):** `2025 · Poland · NATO jets down Russian drones`
- **What the summaries say:** On the night of 9/10 Sep 2025, about 19 to 21 or more drones entered Polish airspace, and Polish and Dutch jets shot down at least three. NATO called it the first time its planes had engaged potential threats in allied airspace. Poland invoked Article 4. Further shoot-downs followed in 2026 over Latvia, Romania and Lithuania.
- **Sources (not opened):** https://www.armscontrol.org/act/2025-10/news/nato-downs-russian-drones-over-poland ; https://en.wikipedia.org/wiki/2025_Russian_drone_incursion_into_Poland
- **Confidence:** Medium to high.
- **Recommendation: don't add.** It is the closest Russia–NATO case, but it involved unmanned drones over a non-nuclear ally with no nuclear forces engaged. If you want a Russia–NATO entry, this is the one to verify.

### 7. Russian ICBM test fails after launch (28 Nov 2025)

- **On-screen line (57 chars):** `2025 · Orenburg · ICBM test missile explodes after launch`
- **What the summaries say:** A missile failed shortly after launch at Yasny, Orenburg region. Analysts disagree whether it was a Sarmat or a UR-100N/Avangard. Russia did not comment.
- **Sources (not opened):** https://united24media.com/latest-news/purple-plume-over-yasny-after-suspected-rs-28-launch-failure-13868 ; https://newsukraine.rbc.ua/news/mysterious-explosion-occurs-at-russian-cosmodrome-1764354490.html
- **Confidence:** Low to medium (Ukrainian-aligned sources, no official statement).
- **Recommendation: don't add.** It was an unarmed test failure. Unlike the 1980 Titan II, no warhead was involved.

### Also checked, not candidates

- **Iranian missiles at Diego Garcia (about 20 Mar 2026).** Iran denies firing them. It was a non-nuclear state firing at a US/UK base. https://www.nbcnews.com/world/iran/iran-fires-missiles-remote-uk-us-base-claiming-long-range-capabilities-rcna264547
- **US–China maritime friction near Sabina Shoal and Pratas (20–21 Oct 2026).** No collision or shots. https://dailycaller.com/2026/10/20/china-sends-navy-after-us-warship-taiwan-maritime-standoff/
- **US–Iran naval clashes around Hormuz (Sep 2026).** Disputed Iranian claims of hits on US vessels, which CENTCOM called "a total lie". Iran is not nuclear-armed. https://www.euronews.com/2026/09/06/iranian-forces-target-us-naval-drone-attempting-to-enter-strait-of-hormuz
- **Searches for 2026 nuclear-weapon accidents or launch false alarms** (including Bulletin and ACA coverage) found none. The January 2026 Doomsday Clock statement (85 s) cites no specific incident.

## Re-check: the May 2025 India–Pakistan entry

**No change recommended** to `2025 · India–Pakistan · Nuclear-armed rivals trade strikes` (7–10 May 2025, reset on 10 May). The summaries agree on the following:

- The ceasefire took effect on 10 May 2025 (one op-ed says 17:00 IST, after Pakistan's DGMO asked for it).
- Operation Sindoor was announced on the night of 6/7 May, which is consistent with "7 May" as the first day of strikes.
- Nur Khan airbase near Rawalpindi was struck early on 10 May. Stimson notes the SPD (Pakistan's nuclear command) offices are more than 1 km away.
- Claims of a strike at Kirana Hills (suspected nuclear storage) are still contested. One summary says former CDS Anil Chauhan later said an Indian loitering munition hit the site but not deliberately. This is unverified and should not go on screen.

Sources (not opened): https://www.stimson.org/2025/four-days-in-may-the-india-pakistan-crisis-of-2025/ ; https://panda.substack.com/p/india-pakistan-may-2025-redux-more ; https://www.globalguardian.com/newsroom/india-pakistan-ceasefire

## Counter ("DAYS SINCE LAST RESET")

| Newest entry (last day) | to 26 Oct 2026 | to 27 Oct 2026 |
|---|---|---|
| **Current:** India–Pakistan, 10 May 2025 (no change recommended) | **534** | **535** |
| If candidate 2 is verified and added: 15 Sep 2026 | 41 | 42 |
| If candidate 1 is added: no day known ("spring 2026") | n/a | n/a |

Since Nagasaki (9 Aug 1945): day 29,663 on 26 Oct 2026, and day 29,664 on 27 Oct 2026.

If the release slips to 27 Oct with no new entry, the counter should read 535, not 534.
