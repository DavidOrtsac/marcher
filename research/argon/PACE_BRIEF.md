# Writing brief: one new spoken line for the Mission in MARSWALK

You wrote every word of the Mission (your script, as it ships, is pasted at the end). The owner now wants one more line from you.

## What changed in the game

The walk used to play sped up. It now starts at the real planned pace, times one, and the player can press a small speed control to go faster. So the first thing a new player sees after stepping out is an astronaut walking slowly across Mars. They will wonder why.

The owner's request, word for word: "you should add a quick voiceline explaining why the suit is so slow."

## Where the line plays

Beat `pace`. It is the first thing said on the first leg, about five seconds after the player starts walking from the rover toward Volcán Peña Blanca. The radio link is good, so the crewmate in the rover (`rover`) is the speaker.

The line just before it (end of the intro): "Follow the pale line. It keeps you off steep ground."
The line that follows it a few seconds later: "Curiosity took {curiosity_sols} Mars days to work these six spots. We have {hours}."

## The true facts you may use

Everything below is real data in the app, each with its source. Do not add facts, numbers, science or history that are not written here. Do not describe how the suit feels, how tired the astronaut is, or what the ground is like.

- The astronaut walks at about 2 kilometres an hour on level ground (0.56 metres a second). This is the walking pace NASA uses to plan suited walks (NASA EVA-EXP-0075, written for the Artemis Moon walks). NASA has not published a figure for walking on Mars in a suit, so the app uses this one as the nearest.
- What is moving: the crew member 82 kg, the suit 104 kg, tools and samples about 23 kg. About 209 kg together (Ogilvie et al., NASA JSC, "Mars Spacesuit Mass Requirements", ICES-2026-127).
- Mars gravity is 3.71 m/s², about 38 percent of Earth's.
- The app works out the effort (metabolic rate, the heat the body makes) of walking with that mass on every slope of the route. A suit is built to carry away at most about 615 watts of body heat in normal work (2100 BTU per hour, NASA-STD-3001). The pace is held so the effort stays inside that limit, and it drops further on climbs.
- At 2 kilometres an hour on level ground the effort is about 367 watts, close to the 352 watt average that NASA sizes exploration suits for.
- Faster walking was measured on the Moon during Apollo (up to 1.6 metres a second on level ground in the Apollo 14 based table the app uses). With this much mass on Mars those speeds push the effort above the suit's normal range, so the plan does not use them.
- The whole walk is about {hours} outside (now "4 hours"). A suited walk can last up to 8 hours.

## Limits

- This is the **say** channel: written for the ear, read aloud by the same synthetic voice as the crewmate's other lines. Roughly 2.5 words a second.
- The owner asked for quick. One item of at most about 16 words is the target. Two items are allowed only if you judge one cannot carry it.
- Write numbers the way they should be spoken. The script uses British spelling ("metres", "kilometres").
- Also write the **show** channel for each item: the on-screen text for players with the sound off. At most 78 characters. The owner's rule for the screen: minimal, no detail lost.
- Stay in the fiction. The crewmate does not know about buttons, speed controls, a game or a player.
- Do not name any person. Do not invent call signs, mission names, agencies, dates or years.
- Same voice as your other `rover` lines: calm, plain, a colleague on the radio.

## What to deliver

One JSON object and nothing else. No code fence.

{"pace": [{"who": "rover", "say": "...", "show": "..."}], "alternates": [[{"who": "rover", "say": "...", "show": "..."}], [{"who": "rover", "say": "...", "show": "..."}]], "note": "one or two sentences on your choice"}

`pace` is the version you want shipped. `alternates` are two other versions you would also stand behind, in case a fact check removes your first.

## Your script as it ships

