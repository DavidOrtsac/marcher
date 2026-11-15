# Writing brief: explain the storm drill to someone who knows nothing

You wrote every word of the Mission (your script, as it ships, is pasted at the end). The owner wants one part rewritten by you.

## What is wrong

Mid-walk a solar storm drill fires. Beat `drill_alarm` plays, then beat `drill_explain`. The first item of `drill_explain` is today:

say: "A twenty seventeen storm here doubled surface radiation. The crew rover is the only shelter."
show: "2017 GALE CRATER STORM DOUBLED RADIATION. CREW ROVER IS ONLY SHELTER."

The owner's reaction, word for word: "I DONT GET IT! YOU ASSUME THEY KNOW ALL THE CONTEXT! BUT THEY DONT! EXPLAIN WHAT HAPPENED AND WHY IT'S IMPORTANT"

The player is a member of the public. They do not know what a solar storm is, that one hit Mars in 2017, who measured it, or why it matters to a person standing outside. The line compresses all of that into a headline.

## What to write

Replace that first item with one to three items that a person with no background can follow. In plain words they must carry:

1. What happened: what a solar storm is in a few words, that one reached Mars in 2017, and what was measured here.
2. Why it matters to the astronaut right now: why being outside in one is a problem and why the crew rover is the answer.

The items that follow yours stay as they are:
- "Red line marks fastest safe walk back. {drill_saved} metres shorter than the way out. {drill_min} minutes from here."
- "Hold to confirm escape route."

The items before yours (beat `drill_alarm`) also stay: "This is a drill. Warning. Solar storm detected. Surface radiation rising." then "Return to crew rover shelter immediately."

## Who speaks

The radio link to the crew rover is good at this point, so you may use either voice per item:
- `rover`: the crewmate in the crew rover, calm, plain, a colleague on the radio. Good for explaining.
- `suit`: the suit computer, terse.

## The true facts you may use

Everything below is real and sourced. Do not add facts, numbers, science or history that are not written here.

- A solar storm here means a burst of fast particles thrown out by the Sun (a solar particle event).
- In September 2017 one reached Mars. Curiosity, the robot whose stops this walk follows, carries a radiation instrument (RAD). In this same crater, Gale Crater, it measured the radiation dose rate on the ground doubling within about seven hours, peaking at two to three times the normal level (Zeitlin et al. 2018, Geophysical Research Letters 45; Hassler et al. 2018).
- Mars has no global magnetic field and only a thin atmosphere, so more of the Sun's radiation reaches the ground than on Earth (Hassler et al. 2014, Science).
- Out on a walk the astronaut has only the suit. The crew rover is the only shelter on this route.
- The app plans the fastest safe walking line from where the astronaut stands back to the crew rover. That is the red line. This drill rehearses it.
- You may NOT state health effects, doses in numbers beyond "doubled" and "two to three times", how much the crew rover shields, or how often storms happen.

## Limits

- **say** channel: written for the ear, read aloud by a synthetic voice at roughly 2.5 words a second. Each item at most about 20 words. All your items together at most about 45 words. Short sentences.
- **show** channel for each item: on-screen text for players with the sound off, at most 78 characters each. The owner's rule for the screen: minimal, no detail lost. Sentence case for `rover` items, capitals for `suit` items, as in the rest of your script.
- Write numbers and years the way they should be spoken in say ("twenty seventeen"). British spelling.
- Terms are fixed: "crew rover" for the vehicle, "Curiosity" or "the Curiosity robot" for the robot, "solar storm" for the event.
- Stay in the fiction. No buttons, game or player. Do not name any person. The alarm lines already say it is a drill, so you do not need to repeat it, but nothing you write may sound as if the storm is real.

## What to deliver

One JSON object and nothing else. No code fence.

{"drill_why": [{"who": "...", "say": "...", "show": "..."}], "alternates": [[...], [...]], "note": "one or two sentences on your choice"}

`drill_why` is the version you want shipped. `alternates` are two other versions you would also stand behind.

## Your script as it ships

