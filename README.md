# MARCHER

Mars Mission Activity, Route, Consumables, Hazard & EVA Resource planner.

Plan a walk on Mars at Curiosity's boxwork on Mount Sharp, Gale crater. Then walk it.

NASA Space Apps Challenge 2026 · Interplanetary Survival Guide: Martian Map · Team Transcendiant Labs (David Castro)

All of the software in this repository is new. It was written during the hackathon, November 14 to 15, 2026. The third-party parts (three.js, the fonts, NASA's 3D models and the NASA data) are listed in `NOTICE`.

**Live app:** https://storage.googleapis.com/transcendiant-marcher/index.html

**30 s demo:** https://storage.googleapis.com/transcendiant-marcher/media/marcher_demo.mp4

## What it does

MARCHER is a hyperlocal map for one surface EVA: a 3.2 km square of Mount Sharp at 1 m terrain and 25 cm imagery, where Curiosity studied boxwork ridges from mid 2025 to March 2026.

- **Two ways in:** the title screen offers Start Demo, a short guided walk where you tap to walk the planned route (it starts at the real planned pace, a speed button steps through ×1, ×5, ×15 and ×30, the walk drops to ×1 while a voice speaks, a slide-out list jumps to any place, and the view is from behind or through the helmet), take the six rock samples (on arrival the view moves to where Curiosity's camera stood and one of its photos hangs in the 3D scene, lined up with the terrain) and answer a solar storm drill (marked as a drill, with a red ghost astronaut walking the fastest safe line back to the crew rover) while a crewmate talks you through it. The walk opens on a globe of Mars that turns to Gale Crater and pins the site. The objective is stated before the walk and a list of objectives strikes itself out as you go. Mission Control, the full planner, opens from the title screen, from the last row of that slide-out list and from the end screen. Add `?pro` to the address to open the planner directly.
- **Suit display:** in the demo a head-up display builds itself in the upper right of the view as the walk needs it: effort in watts against the 615 W cooling limit, energy used against the EVA budget, minutes on foot back to the crew rover, the grade on a steep stretch and the dose during the storm drill. From the third sample on, a tag on the ground names the ridge, hollow or hydrated minerals under you. The design follows NASA Johnson's Joint AR suit display (CTSD-ADV-1788 Rev A, ICES-2023-298): one colour, right of centre, above the horizon, no controls. Its characters are drawn as strokes, not loaded from a font.
- **Mission Control** (the planner, for the habitat): six science stops at places Curiosity parked to study the boxwork, two of them drill sites. A least-energy route between them that never crosses ground steeper than 20°. A timed EVA with a GO / CAUTION / NO-GO verdict from walking energy, oxygen, radiation dose, daylight, walk-back time, radio line of sight, weather and space weather.
- **Walk** (visor HUD): follow the route at eye level or from behind. The visor shows oxygen used, metabolic rate, walk-back minutes, radio link to the crew rover, ground grade and the Sun. At each stop, Curiosity's own Navcam and Mastcam photos hang in 3D along their real camera rays.
- **Probe:** click anywhere to read every layer at that spot (including whether it is a boxwork ridge or hollow, and the nearest opposite feature for a sample pair), and add it as a stop.
- **Curiosity replay:** Curiosity drove from Altadena to Timboy Chaco over 267 sols (sols 4560 to 4827). The EVA visits the same places on foot in 4 h 09.
- **Solar storm drill:** trigger a solar storm alert mid-walk and the visor routes the fastest way back to the crew rover.

The plan shown: 1.42 km of walking, 4 h 09 with the time at the stops, 64 m of climb, steepest grade 15.1°, 43% of the energy budget, 0.31 kg of oxygen, 0.11 mSv, at most 17 minutes from the crew rover on foot. The crew rover has a radio link along the whole route. Verdict GO.

## NASA data

| Layer | Mission / source |
|---|---|
| 1 m terrain (stereo DTM), slope and steps | MRO HiRISE, USGS MSL Gale Merged DEM 1 m v3 |
| 25 cm imagery and colour | MRO HiRISE, USGS MSL Gale Merged Orthophoto Mosaic with the HiRISE colour basemap |
| Hydrated sulfates | MRO CRISM MTRDR FRT0000B6F1 (HYD browse) |
| Thermal inertia | Mars Odyssey THEMIS quantitative mosaic 30S120E, 100 m |
| Globe of Mars on the opening card | Viking Orbiter MDIM 2.1 colour global mosaic, 232 m (USGS Astrogeology, NASA Mars Trek) |
| Stops, drill sites, photos with camera models | MSL Curiosity waypoints, raw images API, mission blog, PDS Mastcam bundle msl_mmm |
| Weather outlook | MSL REMS daily reports (sols 1 to 4995, outreach feed) |
| Surface radiation | MSL RAD (Hassler et al. 2014, Zeitlin et al. 2018) |
| Space weather | NASA CCMC DONKI (CME WSA-ENLIL arrivals at Mars) |
| Sun, sol clock | NASA GISS Mars24 algorithm, NAIF MSL clock kernels |
| Suit, walking, oxygen | NASA EVA-EXP-0075, NASA-STD-3001, ICES-2026-127, BVAD, SP-368 |
| Suit display design | NASA JSC Joint AR: CTSD-ADV-1788 Rev A, ICES-2023-298 |
| Astronaut figure and crew rover | NASA 3D Resources, Z-2 Spacesuit model and Space Exploration Vehicle model |

Partner contributions inside these products: the REMS daily weather feed is provided by Spain's Centro de Astrobiología (CAB), and the USGS merged terrain includes ESA Mars Express HRSC terrain in its base.

Every number in the app is sourced in `research/human_factors.md` and `research/boxwork_and_layers.md`. The submission text is in `research/SUBMISSION.md`.

## What is modelled and what is our own rule

- Walking energy: the model of MIT's SEXTANT traverse planner (Johnson 2010), which builds on the Santee et al. 2001 load carriage model, with Apollo 14 speed against slope.
- Speed is capped at the 2 km/h planning pace and slowed to stay under 2100 BTU/hr, the top of the nominal suited range in NASA-STD-3001.
- The 20° walking slope and the 2 km walking range come from NASA EVA-EXP-0075, written for Artemis lunar EVAs and applied here to Mars.
- Our own rules: a 1 m step steeper than 30° counts as a wall, and a side slope beyond 8° costs 4% more energy per degree.
- Radio is line of sight from a 3 m crew rover mast to a 1.9 m helmet, with no link budget. Ground that cuts that line by less than the first Fresnel zone of a 415 MHz radio is not counted as a block. 415 MHz is the frequency Report ITU-R SA.2162 lists for the EVA voice links of orbital spacesuits.
- Photos hung in 3D get two display aids from `tools/pov_blend.py`: brightness matched to neighbouring photos, and the sky faded out. The photo files and the side panel are untouched.

## Run it locally

```
python3 tools/serve.py 8480     # then open http://127.0.0.1:8480/
```

The large baked terrain files are not in git. Rebuild them with `tools/cut_site.sh` (GDAL, reads the USGS mosaics by HTTP range) and `tools/bake_site.py`, or copy them from the live site's `data/` folder.

Tests: `for t in tools/tests/*.mjs; do node $t; done`

## Layout

- `app/` the web app (plain ES modules, three.js r170 vendored)
- `app/js/marstime.js` Mars24 clock and Sun, tested in `tools/tests/test_marstime.mjs`
- `app/js/suit.js` suited walking model and limits
- `app/js/route-worker.js` least-energy routes, walk-back field, radio line of sight
- `app/js/film.js` the scripted 30 s demo (load with `?film`)
- `tools/` data bakes, tests, deploy and the demo film capture

## License

Apache License 2.0. See `NOTICE` for third-party credits. NASA data and images: NASA/JPL-Caltech, NASA/JPL-Caltech/MSSS, NASA/JPL/University of Arizona (HiRISE), NASA/JPL/JHUAPL (CRISM), NASA/JPL/ASU (THEMIS), USGS Astrogeology.

## Use of Super Intelligence (SI)

The code and the data processing scripts in this repository were generated with Claude (Anthropic), an AI assistant, under David Castro's direction during the hackathon (November 14 to 15, 2026). Claude also searched for and checked the sources. All of the software is new and was written during the hackathon. The text of the Space Apps project page (the summary and the project details, kept in `research/SUBMISSION.md`) was written by Gemini 4 Carbon (Google) from a fact sheet that Claude compiled from the project notes. Six corrections were made after a check against that fact sheet (listed in `research/argon/README.md`). The text of the demo (on-screen lines and spoken lines) was written by Gemini 4 Argon (Google) from a brief of verified facts, with two factual errors and two leg distances corrected by hand (see `research/argon`). The two voices in the demo are synthetic. They were generated from that script with ElevenLabs text to speech (library voices "Jon - Calm Presence" on the model eleven_multilingual_v2 and "Alex - Professional" on the model eleven_v4), and the voices were picked and every clip was checked with listening tests run on Gemini 4 Argon. Each audio file is listed next to the exact sentence it speaks in `app/audio/vo/index.json`, and the demo plays a clip only when the live plan produces that same sentence. The clips are made by `tools/make_vo.py`. No SI generated images or video are used. All imagery is NASA data rendered by the app.
