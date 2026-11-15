# Writing brief: all on-screen words for the Mission in MARSWALK

You are the only writer on this. Every word a player reads in the Mission comes from you. I am the programmer. I will not edit your lines for style. I will only check them against the fact sheet below and against the length limits.

## What MARSWALK is

A browser 3D experience built for NASA Space Apps 2026 (challenge: "Interplanetary Survival Guide: Martian Map"). It rebuilds a real place on Mars from real NASA data: the "boxwork" ridges on Mount Sharp in Gale crater, where the Curiosity rover worked in 2025 and 2026. The player is one astronaut of an imagined future crew, on foot, walking between six real spots that Curiosity studied. A crewmate stays in a parked crew rover.

The site has two doors on its title screen:
1. The Mission. A short game, about three to four minutes. This is what you are writing.
2. Mission Control. A dense planning tool with maps, layers and numbers. Not your job. The player must not see or hear about it until the Mission is over.

## Who plays

Anyone. A hackathon judge with two minutes, a curious teenager, somebody's mum on a phone. Assume they know nothing about Mars, geology or spaceflight. They did not come to read.

## What the owner said about earlier versions (his words, they are the design goal)

- "An understandable flow for the layman."
- "Wtf are we seeing? What's the goal? What's this website for? DONT BOMBARD ME WITH ALL THESE NUMBERS"
- "MAKE IT FEEL LIKE A STORY ... LIKE A MISSION"
- "THIS FEELS LIKE A SALES PITCH" (about a version whose text described the product)
- "THIS LOOKS LIKE A SLIDESHOW ... MAKE IT SEEM LIKE A GAME ... BE MORE CREATIVE" (about a version made of cards with headings and Next buttons)
- "MINIMALISM FOR THE CROWD (without sacrificing details) is better. YOU HAVE TOO MANY LABELS"

How you solve that in words is your call. Voice, rhythm, attitude, how much the characters say and when they stay silent: all yours. I am deliberately not giving you sample lines or a tone to copy.

## How the game plays (so you know where words appear)

There are no cards, no headings, no paragraphs, no Next buttons. The screen is the Mars terrain in 3D with the astronaut seen from behind. The only places words can appear:

- **Subtitles.** One line at a time at the bottom of the screen, typed out, each visible about three seconds. Spoken over the radio. This is where almost everything you write goes.
- **A hold button.** The player holds one button (Space on a keyboard, a round button on a phone) to walk along the planned route, to take a sample, and to confirm during the alarm. The button carries one word.
- **A waypoint** in the world: the name of the next spot and the metres left. The program writes this, not you.
- **A photo card.** After each sample, one real Curiosity photo taken at that spot slides in with a short caption.
- **An opening card** on black before the walk starts.
- **An end screen** with four numbers and two buttons.
- **The title screen**: the name MARSWALK and two menu items.

Two voices exist. Nothing on screen says who is speaking except the colour of the line, so the words themselves must make it clear when it matters.
- `rover`: the crewmate who stayed in the crew rover. Heard only while the astronaut has a radio link.
- `suit`: the suit's own computer. Speaks when the radio is blocked and during the alarm. It is a machine.

Do not name any person. Do not invent call signs, mission names, crew sizes, agencies, dates or years for this imagined crew.

## The beats, in order, with the true facts for each

Everything below is real data from the app. Do not add facts, numbers, science or history that are not written here. Where a number changes with live data, use the placeholder in braces exactly as written and the program fills it in. Current values are shown so you know the size.

**Setting.** Gale crater, Mars. Lower slopes of Mount Sharp. The ground here is covered with boxwork: low ridges crossing each other in a pattern like a web, seen from orbit. Scientists think the ridges formed where groundwater ran through cracks in the rock long ago and left minerals behind that hardened the rock. Softer rock between the ridges wore away, leaving hollows. Curiosity is the only thing that has ever been here. It took Curiosity {curiosity_sols} (now 267) Mars days to work its way through the six spots on this walk. On foot the round trip takes about {hours} (now "4 hours").

**Goal of the walk (official wording in the app):** "Ridge and hollow transect. Sample a boxwork ridge and the hollow beside it to test how groundwater cemented the ridges." Six spots, one sample at each, then back to the rover. A "sol" is one Mars day. The walk happens on sol {sol} (now 5076) and starts at {start_clock} (now 08:00) local Mars time.

**The route was planned before anyone stepped out.** It avoids steep ground, it fits inside daylight, and the astronaut is never more than a {walkback_max} (now 17) minute walk from the rover. The player should feel these things happen rather than be told about a planner. The route is drawn on the ground as a pale line.

**Beat `open`. Opening card on black.** Before the 3D view fades in. Place and time.

**Beat `intro`. At the rover.** The astronaut stands beside the crew rover, which is parked at Altadena, the place where Curiosity drilled its first hole in the boxwork. Radio link is good. The player needs to learn, fast: where they are, what the job is, and that they hold the button to walk the pale line. The first waypoint appears: Volcán Peña Blanca, 248 m.

**Beat `leg1`. Walking to Volcán Peña Blanca (248 m).** Radio link holds for roughly the first third.

**Beat `radio_lost`. During leg 1.** The astronaut walks behind a ridge and the radio link to the rover is cut by the terrain. This is real: radio needs a line of sight to the rover. The plan knew about it before the walk. The suit takes over the talking. The gap lasts through the whole first stop.

**Beat `site1`. Volcán Peña Blanca. No radio here.** A raised ridge whose wall shows at least three layers. Task: sample each layer from bottom to top. Only the suit can speak. A point with radio contact is {radio_near} (now 26) metres away, the plan flagged that. The player holds the button to sample. While they hold, the mission clock runs through the real time the job takes ({dwell1}, now 35 minutes) and the Sun and shadows move.

**Beat `leg2`. Walking to Salar de Agua Amara (219 m).** Still no radio at the start.

**Beat `radio_back`. Early in leg 2.** Line of sight to the rover returns and the crewmate is heard again.

**Beat `site2`. Salar de Agua Amara.** Delicate branching structures in the rock, likely made by groundwater. Task: photograph them in place, then take a core beside them (not through them). {dwell2}, now 30 minutes.

**Beat `leg3`. Walking to the Río Frío wall (79 m, short).**

**Beat `site3`. Río Frío wall.** A ridge wall full of pea-sized nodules (small round lumps), and a vein (a thin band of mineral that filled a crack). Task: sample both so their chemistry can be compared. {dwell3}, now 35 minutes.

**Beat `leg4`. Walking to Monte Grande hollow (191 m).**

**Beat `drill`. Halfway along leg 4. An alarm.** The suit sounds a solar storm warning. It is a drill, a practice run, but the player should not know that in the first second. Fact behind it: in September 2017 a solar storm reached Gale crater and Curiosity's radiation instrument measured the radiation at the surface roughly doubling. A person outside would need to get to shelter, and the only shelter is the rover. The screen goes red at the edges, a red line appears on the ground showing the fastest safe way back to the rover from this exact spot, and the camera turns to look along it. Walk time back from here: {drill_min} (now 16) minutes. The player holds the button to confirm they see the way home. Then it is revealed as a drill, the red line goes away and the walk goes on.
I need three groups of lines: `drill_alarm` (the alarm itself), `drill_explain` (what the red line is and what to do, ends with the player needing to hold to confirm), `drill_clear` (it was a drill, carry on).

**Beat `site4`. Monte Grande hollow.** A large hollow between ridges. Bare bedrock on its floor, broken into blocks with a polygon pattern. Task: take the hollow sample. This is one half of the comparison the whole walk is for. {dwell4}, now 40 minutes.

**Beat `leg5`. Walking to Nevado Sajama ridge (53 m, very short).**

**Beat `site5`. Nevado Sajama ridge.** The top of a ridge, where Curiosity drilled. Curiosity's ridge sample here contained clay minerals. Curiosity also drilled the hollow about 10 metres to the north. Task: take the matching ridge sample. With this, the player holds both halves: hollow and ridge. {dwell5}, now 30 minutes.

**Beat `leg6`. Walking to Timboy Chaco (112 m).**

**Beat `site6`. Timboy Chaco.** A vertical rock face covered in pits, at the eastern edge of the boxwork. Last sample. {dwell6}, now 20 minutes.

**Beat `home`. Walking back to the rover (500 m, the longest leg).** All six samples are in the bag. The route home was part of the plan from the start.

**Beat `arrive`. At the rover.** Walk over. About {hours} outside. {daylight} (now "6 hours") of daylight still left, which was the safety margin.

**Beat `end`. End screen.** The view lifts up to show the whole route from above. Four numbers appear: samples collected ({samples}, 6), distance walked ({km}, 1.4 km), time outside ({hours}), daylight left ({daylight}). Then two buttons. One opens Mission Control, where the player can see the planning that sat behind every step they just took and change it. One replays the walk. This is the only place Mission Control may be mentioned, and it must not read like an advert.

## Hard rules

1. Facts only from this brief. No invented numbers, names, science or history. When unsure, say less.
2. No em dashes, no en dashes, no semicolons, no emojis, no exclamation marks in a row, no ellipsis character (three plain dots are allowed if you want them).
3. Never use the word "honest" or "honestly".
4. Never talk about a website, an app, a tool, a planner, a feature, a demo, the player, or NASA Space Apps. Stay inside the world. The end screen is the single exception and only for the button that opens Mission Control.
5. No acronyms or jargon without the plain meaning in the same line. (EVA, LMST, SPE, comms, LOS are out. "Sol" is fine once it has been made clear it is a Mars day.)
6. A subtitle line is at most 78 characters including spaces. One thought per line.
7. Line budgets are maximums, not targets. Fewer lines is better if nothing is lost. Silence is allowed: any leg may have zero lines.
8. The place names keep their accents exactly: Volcán Peña Blanca, Salar de Agua Amara, Río Frío, Monte Grande, Nevado Sajama, Timboy Chaco, Altadena.
9. Placeholders must appear exactly as given, braces included: {sol} {start_clock} {hours} {daylight} {km} {samples} {drill_min} {radio_near} {walkback_max} {curiosity_sols} {dwell} {n} {total} {camera} {photo_sol}. Use a placeholder only where its beat makes sense. {dwell} means the minutes of the current stop.

## What to deliver

Return one JSON object and nothing else. No code fence, no commentary before or after. Use exactly these keys. Every subtitle is an object {"who": "rover" or "suit", "text": "..."}.

{
  "title_tagline": "at most 6 words under the name MARSWALK, or an empty string if the name is enough",
  "menu_mission": "1 to 3 words, the menu item that starts the walk",
  "menu_control": "must be exactly: Mission Control",
  "open_card": ["1 to 3 very short lines for the black opening card, each at most 34 characters, may use {sol} and {start_clock}"],
  "hint_key": "at most 5 words, shown once, tells a keyboard player to hold Space to walk",
  "hint_touch": "at most 5 words, shown once, tells a phone player to hold the button to walk",
  "button_walk": "one word on the hold button while walking",
  "button_sample": "one word on the hold button at a stop",
  "button_confirm": "one word on the hold button during the alarm",
  "intro": [at most 4 subtitles],
  "leg1": [at most 2 subtitles, rover, spoken before the radio drops],
  "radio_lost": [at most 2 subtitles, the last may be the rover cutting out, then suit],
  "site1_arrive": [at most 2 subtitles, suit only],
  "site1_done": [at most 1 subtitle, suit only],
  "leg2": [at most 1 subtitle, suit only, may be empty],
  "radio_back": [at most 2 subtitles, rover],
  "site2_arrive": [at most 2], "site2_done": [at most 1],
  "leg3": [at most 1, may be empty],
  "site3_arrive": [at most 2], "site3_done": [at most 1],
  "leg4": [at most 1, spoken before the alarm, may be empty],
  "drill_alarm": [at most 2, suit],
  "drill_explain": [at most 3, suit or rover],
  "drill_clear": [at most 2],
  "site4_arrive": [at most 2], "site4_done": [at most 1],
  "leg5": [at most 1, may be empty],
  "site5_arrive": [at most 2], "site5_done": [at most 2],
  "leg6": [at most 1, may be empty],
  "site6_arrive": [at most 2], "site6_done": [at most 1],
  "home": [at most 3, spread along a long walk],
  "arrive": [at most 2],
  "sample_toast": "at most 4 words, small confirmation after each sample, may use {n} and {total}",
  "photo_caption": "at most 9 words under the real photo, makes clear Curiosity took it right here, may use {camera} and {photo_sol}",
  "end_heading": "at most 4 words",
  "end_labels": {"samples": "1 or 2 words", "distance": "1 or 2 words", "outside": "1 or 2 words", "daylight": "1 or 2 words"},
  "end_line": "one sentence, at most 90 characters, the thought the player leaves with",
  "end_control": "at most 4 words, the button that opens Mission Control",
  "end_replay": "at most 3 words, the button that replays the walk",
  "notes": "anything you want the programmer to know about timing or delivery of specific lines, plain text, or empty"
}
