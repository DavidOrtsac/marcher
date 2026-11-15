# Text written by Gemini models

Everything in this folder was made during the hackathon, November 14 to 15, 2026. The briefs are kept exactly as they were sent, so they use the names of that hour: MARSWALK was the working name of MARCHER on the first day, "the Mission" and "Step Outside" were the first names of what is now Start Demo, and "earlier versions" in `BRIEF.md` means builds from earlier the same weekend.

## Demo text, written by Gemini 4 Argon

All on-screen words and the voiceover script of the Mission were written by Gemini 4 Argon on Vertex AI.

- `BRIEF.md`: the first brief (the game, the beats, the facts, the limits).
- `copy_v1.txt`: Argon's first answer.
- `ADDENDUM.md`: the second request (separate voiceover and on-screen channels, three factual corrections).
- `copy_v2.txt`: Argon's second answer, the one in use.
- `PACE_BRIEF.md`, `pace_v1.txt`: a later request for one more line (why the walk is slow) and Argon's answer. Its first choice is in use as the `pace` line.
- `run.py`, `run2.py`, `run3.py`: the streaming calls.

The app reads `app/js/mission_copy.js`, which is `copy_v2.txt` plus the `pace` line, with two factual fixes made by hand:

1. Stop 1: "Radio returns {radio_near} metres ahead" became "metres away". The plan data gives a distance to the nearest spot with radio, not a direction.
2. End line: the fixed "17 minutes" became the live value {walkback_max}.

Argon's delivery note: Channel design: 'say' is conversational and paced for breath; 'show' is compressed field-log style (and ALL CAPS when the suit computer is on screen so the machine voice is visually obvious even without audio). On short legs (leg3, leg4, leg5, leg6) 'show' is empty because the waypoint HUD already carries the distance and destination, avoiding screen clutter while walking. In leg1, trigger item 2 around 5s so it finishes right as the radio drops at 9s.

## Project page text, written by Gemini 4 Carbon

The summary and the project details on the Space Apps project page were written by Gemini 4 Carbon on Vertex AI.

- `PAGE_BRIEF.md`: the brief (the job, the rules, and a fact sheet checked line by line).
- `page_v1.txt`: Carbon's answer. `page_v1.log`: the progress log of the call.
- `run5.py`: the streaming call.

The text as submitted is in `research/SUBMISSION.md`. It is `page_v1.txt` with these corrections, made after the check against the fact sheet:

1. Summary: "it proves that the orbital" became "it shows that the orbital". Reason: the fact sheet says "shows".
2. Details: "Every visual layer, safety check and science readout in MARCHER traces directly to a specific NASA dataset, model or standard:" became "The map layers, safety checks and science readouts in MARCHER trace to specific NASA datasets, models and standards:". Reason: not every check is NASA sourced: two routing rules are our own and the walking model is from MIT.
3. Details: "the 8 hour EVA budget at 1200 BTU/hr from ICES-2026-127" became "the 1200 BTU/hr average metabolic rate of the 8 hour EVA budget from ICES-2026-127". Reason: ICES-2026-127 gives the 1200 BTU/hr rate, the 8 hours come from EVA-EXP-0075.
4. Details: "Start Demo is a short guided game built" became "Start Demo is a short guided walk built". Reason: one name for it: the summary calls it a guided walk.
5. Details: "shows the September 2017 RAD dose rise for context" became "shows the September 2017 RAD dose rate rise for context". Reason: RAD measured a rise in dose rate.
6. Details: "under the owner's direction" became "under my direction". Reason: the page is in the first person.

Two layout changes are not counted: a paragraph break after the list of limits, and the placeholder `PAGE_FIXES` (asked for in the brief) became the sentence that gives the count of corrections.
