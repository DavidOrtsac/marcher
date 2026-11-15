# Writing brief: the NASA Space Apps 2026 project page for MARCHER

You are the only writer of this page. I am the programmer's assistant. I will not edit your text for style. I will only check it against the fact sheet below and against the limits, and fix factual errors.

## The job

Write two fields of the NASA Space Apps Challenge 2026 project form for the project MARCHER. The challenge is "Interplanetary Survival Guide: Martian Map". The team is one person, Transcendiant Labs, Manila.

1. SUMMARY. One paragraph of plain text, at most 1400 characters with spaces. The form calls it a high-level summary: what the project is, how it answers the challenge, and why it matters.
2. DETAILS. The "Project Details" field. Between 1500 and 2300 words. It must cover what the project does and how it works, what benefit it has, what it hopes to achieve, which tools, languages, hardware and software built it, and the use of SI (the form's word for AI tools). The reader must be able to see which NASA data does which job.

## Who reads it

Space Apps judges: scientists and engineers from NASA and partner agencies, and local volunteers. They read many pages fast. They score five criteria from 1 to 5:

- Impact: how much the project matters, how big a problem it solves.
- Creativity: how new the approach is.
- Validity: is it scientifically sound, does it do what it says, can it work in the real world.
- Relevance: does it answer this challenge.
- Presentation: how well the team tells the story of the project, the problem and the solution.

"The majority of judges' evaluation will be based on your project submission."

## Hard rules

- Use only facts from the fact sheet. Do not add a number, a name, a source, a feature, a date or a claim that is not in it. Do not round, convert or change a number. If you are not sure something is in the fact sheet, leave it out.
- Say nothing about the future of the project beyond what the fact sheet says. Do not call anything finished that the fact sheet marks as not built.
- State plainly that the software is new and was built during the hackathon, with the dates the fact sheet gives.
- The use of SI must be told in full. Every fact in the "Use of SI" part of the fact sheet must appear in DETAILS, including the sentence about who wrote this page.
- One word per meaning. Keep these words exactly as written: MARCHER, Mission Control, Start Demo, walk mode, crew rover, Curiosity, rock sample, solar storm, solar storm drill, GO, CAUTION, NO-GO, EVA.
- No em dashes, no en dashes, no semicolons. No emojis. Do not use the word "honest". No exclamation marks. No marketing words (revolutionary, cutting-edge, seamless, game-changing and the like).
- Plain words. Short sentences. A judge who is not a native English speaker must follow it on one read.
- Format of DETAILS: paragraphs, a bold lead-in at the start of a paragraph written `**Like this.**`, and bullet lines that start with `- `. Nothing else. No headings, no tables, no numbered lists, no link markup (a bare URL is fine).

The fact sheet is a plain draft that I checked line by line. Its order, its sentences and its emphasis are not a template. What to lead with, what to cut, how to tell it: your call.

## Output format (exact)

```
===SUMMARY===
(the summary)
===DETAILS===
(the details)
===NOTE===
(optional: one or two lines to me, for example a fact you wanted but could not find in the fact sheet)
```

# FACT SHEET

## Use of SI (every fact must appear)

- The code and the data processing scripts were generated with Claude (Anthropic), an AI assistant, under the owner's direction during the hackathon (November 14 to 15, 2026). All of the software is new and was written during the hackathon.
- Claude also searched for and checked the sources, and compiled the fact sheet for this project page from the project notes.
- The text of this project page (the summary and the project details) was written by Gemini 4 Carbon (Google) from that fact sheet. Claude then checked it against the fact sheet. (I will add the count of corrections after your answer. Write "PAGE_FIXES" where that sentence goes.)
- The rest of the SI facts are in the last paragraph of the draft below ("Use of SI"). Where that paragraph says Claude "drafted this project page from the project notes", use the two facts above in its place.

## Checked draft: summary

MARCHER is a hyperlocal map for planning and walking one EVA at Curiosity's boxwork on Mount Sharp. It puts HiRISE 1 m terrain and 25 cm imagery, CRISM minerals, THEMIS thermal inertia, Curiosity's stops and photos, REMS weather, RAD radiation and DONKI space weather on one 3.2 km square. The planner routes a suited astronaut between six real science stops on the least energy path that stays under a 20° walking slope. It then gives a GO, CAUTION or NO-GO verdict from energy, oxygen, radiation dose, daylight, walk-back time, radio line of sight, weather and space weather. In walk mode a visor display guides the astronaut along the route, and at each stop Curiosity's own photos hang in 3D where its cameras took them, so the crew sees the real ground before stepping outside. The title screen has two ways in. Start Demo is a short guided walk that explains the place, the goal and the safety checks in plain words. Mission Control is the full planner, laid out like desktop mapping software with menus, a layers panel, a timeline and plan export. It matters because the first crews will plan EVAs around targets that robots have already found, and the data to plan such a walk already sits in NASA archives.

## Checked draft: project details

**What it does.** Mars maps today are built for regional and global views. MARCHER works at the scale of one EVA. It opens on a 3.2 km square of Mount Sharp where Curiosity studied boxwork ridges from mid 2025 to March 2026. The EVA plan, "Ridge and hollow transect", starts from a crew rover parked at Altadena, Curiosity's first boxwork drill site. It visits six places where Curiosity stopped to study the boxwork: Volcán Peña Blanca, Salar de Agua Amara, the Río Frío wall, the Monte Grande hollow, the Nevado Sajama ridge and Timboy Chaco. Two of the six are Curiosity drill sites. The science goal is to sample a ridge and the hollow beside it, the same pair Curiosity drilled (Valle de la Luna in the hollow and Nevado Sajama on the ridge, about 10 m apart), to test how groundwater cemented the ridges.

**Two ways in.** The title screen offers Start Demo, a short game for someone who has never seen a Mars map. You tap once to walk the real route from the crew rover and tap again to stop, seen from behind or through the helmet. The walk starts at the real planned pace of 2 km/h. A speed button shows the current speed and steps through ×1, ×5, ×15 and ×30, and whenever a voice is speaking the walk drops back to ×1, so each line is heard at the place it describes. A list slides open from the side to jump to any place on the route. The walk opens on a globe of Mars that turns to Gale Crater and pins the site. The objective is stated before the walk, and a list of objectives strikes itself out as you go. You take the six rock samples, answer a solar storm drill and walk home. The drill is marked as a drill, and a red ghost astronaut walks the fastest safe line back to the crew rover, which is shorter than the way out. A crewmate in the crew rover talks you through it, and the suit's computer speaks for the first sample and the storm drill. It takes about five and a half minutes at ×30 and it runs on the live planner, so the clock, the distances, the radio link and the escape route are the real numbers for the real route. On arrival at each stop the view moves to where Curiosity's camera stood and a photo it took there hangs in the 3D scene on the camera's own pointing, so it lines up with the terrain. Mission Control, the full planner with every layer, every number and every source, opens from the title screen, from the last row of that list and from the end of the walk.

**The suit display.** While you walk, a head-up display builds itself in the upper right of the view, one instrument at a time, each on the sentence where the crewmate first brings it up. Effort is the suit's metabolic rate in watts, on a bar with a tick at the 615 W cooling limit. Energy is the share of the EVA budget used so far, with a mark where this walk will end (43%). Shelter is the minutes on foot back to the crew rover. A steep stretch brings up the grade in degrees against the 20° limit, and the storm drill adds the radiation dose so far. From the third sample on, a tag pinned to the ground names what you are standing on: a ridge or a hollow with its height from the 1 m terrain, or hydrated minerals from CRISM. The design follows the suit display NASA Johnson prototyped, the Joint Augmented Reality Visual Informatics System (CTSD-ADV-1788 Rev A and ICES-2023-298): one colour, right of centre and above the horizon, with no controls to operate. The characters are not a font file. Each one is drawn as a few straight strokes of one pen width, the way a head-up display writes them, and each instrument is written on stroke by stroke. The display lags a little behind head movement, sways with each step and jolts when the storm alarm sounds, so it reads as part of the helmet and not as a web overlay.

**Mission Control** is the planner, for the habitat. On a desktop it is laid out like the mapping software that planners already use. There is a menu bar (File, Edit, View, Tools, Help), a toolbar, a Layers panel with checkboxes on the left, the plan panel on the right, a timeline along the bottom and a status bar with the map scale, the camera height and the latitude, longitude, elevation and slope under the pointer. A compass, a 2D and 3D switch and zoom buttons sit on the map. You can add a stop by clicking the map, remove the stops you added, plan for the previous or the next sol, start the solar storm drill from the timeline and reset the plan. The plan exports as GeoJSON (the stops and the route line) and the stops export as CSV, so other mapping tools can open them. Four menu items are marked Soon and are not built yet: Import plan, Measure distance, Second astronaut and Crew rover leg. Every other menu item and button works. On a phone the planner uses a simpler touch layout.

The planner shows the route, a timed schedule and a verdict with its reasons. Every number is computed live:
- Route: least metabolic energy on the 2 m terrain grid. No step crosses ground steeper than 20°, the walking slope in NASA's EVA-EXP-0075 concept of operations, which was written for Artemis lunar EVAs and is applied here to Mars. Two more rules are our own: a 1 m step steeper than 30° counts as a wall, and a side slope beyond 8° costs 4% more energy per degree.
- Energy and speed: the walking energy model of MIT's SEXTANT traverse planner (Johnson 2010), which builds on the Santee et al. 2001 load carriage model, with Apollo 14 walking speed against slope. Speed is capped at the 2 km/h planning pace and slowed on climbs to stay under 2100 BTU/hr, the top of the nominal suited range in NASA-STD-3001. The walker is an 82 kg crew member in a 104 kg Mars suit carrying 22.7 kg of tools and samples. The three masses come from ICES-2026-127 and the combination is ours.
- Budget: an 8 hour EVA at the 1200 BTU/hr average metabolic rate in ICES-2026-127. Oxygen follows from metabolic energy (NASA BVAD).
- Radiation dose from the 0.64 mSv per day that Curiosity's RAD measured at Gale.
- Daylight from the Mars24 algorithm for the EVA sol, tested against Curiosity's own clock and the REMS sunrise and sunset times.
- Weather outlook: the median of Curiosity's REMS daily reports from the same season in earlier Mars years.
- Space weather from NASA DONKI, read when the map loads. A CME predicted to reach Mars within a day of the EVA turns the verdict to CAUTION.
- Walk-back minutes to the crew rover from every point, timed with the same walking model as the route, and radio line of sight from the crew rover mast.

For the plan shown, the walk is 1.42 km and the EVA takes 4 h 09 with the time at the stops. It climbs 64 m, the steepest grade is 15.1°, and it uses 43% of the energy budget, 0.31 kg of oxygen and 0.11 mSv. The astronaut is never more than 17 minutes from the crew rover on foot, and 6.3 hours of daylight are left at the end. The crew rover has a radio link along the whole route. The verdict is GO.

Layers can be switched on over the terrain: slope and short walls, walk-back contours, radio line of sight, boxwork ridges and hollows, Curiosity's real drive, THEMIS thermal inertia and CRISM hydrated sulfates. The ridges and hollows are mapped straight from the 1 m terrain (band-pass relief) and agree with the Curiosity team's labels at the stops: the Monte Grande hollow sits about 0.3 m below its surroundings and the Nevado Sajama ridge about 0.3 m above. Clicking any spot reads every layer there, names the nearest opposite feature for a ridge and hollow sample pair, and can add the spot as a new stop. The route and verdict then update.

Curiosity's real drive replays over the same ground. It drove from Altadena to Timboy Chaco over 267 sols (sols 4560 to 4827). The EVA visits the same places on foot in 4 h 09.

**Walk mode** is the visor. The astronaut follows the route at eye level or from behind, where the figure is NASA's own Z-2 suit prototype model. The figure walks with a stride driven by the ground it covers, and its shadow is its own silhouette cast from the real Sun direction. A heading tape marks the stops, the crew rover and the Sun, with readouts for oxygen used, metabolic rate, walk-back time, radio link, grade and Sun elevation. At each stop the view moves to where Curiosity's cameras stood, and its Navcam and Mastcam photos appear in 3D along their real camera rays. Each photo's position and pointing come from its CAHVOR camera model and Curiosity's attitude. As a test, Navcam pointing was matched against the skyline of the HiRISE terrain, and the azimuths agree to 0.3 ± 0.6°. For display only, each photo's brightness is matched to its neighbours and its sky is faded out so the rendered sky shows. The side panel always shows the untouched photo.

A solar storm drill can be triggered mid-walk. The visor switches to the fastest line back to the crew rover and counts down the walk-back time. For context it shows the dose rate rise that RAD measured in the September 2017 event (2 to 3 times).

**Why it matters.** The first crews will plan EVAs around science targets that robots such as Curiosity have already found. MARCHER shows that the data to plan such a walk already sits in NASA archives, and that orbital data and Curiosity's data can be fused into one tool a crew could use before and during an EVA.

**How it was built.** JavaScript (ES modules) with three.js for rendering. Python with GDAL, NumPy and Pillow bakes the terrain and science layers. A web worker runs the routing (A* with 16 directions), the walk-back field (Dijkstra with the same moves and timing) and the radio viewshed. The app is static and runs in any modern browser on a desktop or a phone. 108 automated tests cover the Mars clock and Sun, the weather outlook and the space weather logic. The demo video is a frame by frame capture of the live app, taken with Playwright and encoded with FFmpeg. The code is Apache 2.0 and the source is public at https://github.com/DavidOrtsac/marcher.

**Limits.**
- Orbital terrain at 1 m cannot show rocks, which is why the visor shows Curiosity's ground photos at each stop. Close to the ground the rendered surface is soft, because the imagery is 25 cm per pixel and nothing is added to sharpen it.
- The walking model was fitted to Earth and Apollo data. Suited walking in Mars gravity is untested.
- The 20° slope and the 2 km/h pace come from lunar EVA planning.
- The REMS feed is the public outreach feed and trails Curiosity by about 80 sols. The science record is in the PDS.
- Radio is line of sight from a 3 m crew rover mast to a 1.9 m helmet, with no link budget. Ground that cuts that line by less than the first Fresnel zone of a 415 MHz radio is not counted as a block. 415 MHz is the frequency Report ITU-R SA.2162 lists for the EVA voice links of orbital spacesuits.
- DONKI lists CMEs that have already launched. It cannot forecast a new one, which is why the visor has the solar storm drill.

**Next.** Any site with HiRISE stereo terrain. Live suit telemetry on the visor. Two-person EVAs with a crew rover in reserve.

**Use of SI.** The code and the data processing scripts in this project were generated with Claude (Anthropic), an AI assistant, under my direction during the hackathon (November 14 to 15, 2026). Claude also searched for and checked the sources, and drafted this project page from the project notes. The text of the demo, both the on-screen lines and the spoken lines, was written by Gemini 4 Argon (Google) from a brief of verified facts. Two factual errors in its draft and two leg distances were corrected by hand. The brief and the raw outputs are in research/argon in the source repository. The same acknowledgment is in the repository README, the NOTICE file and the page metadata. The two voices in the demo are synthetic. They were generated from that script with ElevenLabs text to speech (library voices "Jon - Calm Presence" on the model eleven_multilingual_v2 and "Alex - Professional" on the model eleven_v4), and the voices were picked and every clip was checked with listening tests run on Gemini 4 Argon. Each audio file carries that acknowledgment in its metadata and is listed next to the exact sentence it speaks in app/audio/vo/index.json, and the demo plays a clip only when the live plan produces that same sentence. No SI generated images or video are used. All imagery in the app and the demo video is NASA data rendered by the app. The astronaut figure is NASA's Z-2 suit model and the crew rover is NASA's Space Exploration Vehicle model.
