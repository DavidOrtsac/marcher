Thank you. Two things changed, so I need a second pass from you. Your first pass is above. Keep what you still stand behind, change what you want.

## 1. The owner will add an AI voiceover

His note, word for word: "Note that I plan to eventually add an AI voiceover. TELL ARGON, TOO. THERE IS A DIFFERENCE BETWEEN VOICEOVERS AND IN-SCREEN TEXT."

So there are now two separate channels, and you write both:

- **say**: what the voice says. Written for the ear. It will be read aloud by a synthetic voice (one voice for the crewmate in the rover, a different one for the suit computer). Nobody reads this channel.
- **show**: what is on the screen at that moment. Written for the eye. It is not a transcript of the voice unless you decide a transcript is the best thing to show.

How the two differ, how much they overlap, and which one carries which detail is your decision as the writer. Two constraints from the build:

- The game ships silent first. The voice is added later with no change to the screen text. So today **show** has to carry the whole experience alone, and later it has to sit well under the voice without feeling like the player is being told everything twice.
- The owner's standing demand for the screen is: minimal, very few labels, no detail lost.

Speech timing, so the voice fits the game. The voice speaks at roughly 2.5 words per second. Holding the button, the walks take about this long:
- leg1 25 s (radio drops about 9 s in)
- leg2 22 s (radio returns about 5 s in)
- leg3 8 s
- leg4 19 s (alarm at about 9 s)
- leg5 8 s
- leg6 11 s
- home 28 s
At a stop the astronaut stands still, so arrival lines have no hard limit, but the player is waiting to act. Sampling is a hold of about 3.5 s. One `say` item should be one breath: at most about 16 words.

A `show` item is at most 78 characters. It may be an empty string when silence on screen is better at that moment, but remember the game is silent today.

## 2. Corrections to the first pass (facts)

These lines said things the fact sheet does not support. Do not repeat them:
- "Notice how the ground flattens out." Nothing in the data says that.
- "Easy grade the whole way." Nothing in the data says that.
- "Softer rock wore away here, leaving polygon blocks." Two facts got merged. The hollows are where softer rock wore away. Separately, the bedrock on the floor of this hollow is broken into blocks with a polygon pattern.
Do not describe what the ground, the slope or the weather looks or feels like beyond what the fact sheet states.

## What to deliver now

One JSON object and nothing else. No code fence. Same keys as before, with one change: every list of subtitles becomes a list of items of this shape:

{"who": "rover" or "suit", "say": "the spoken line", "show": "the on-screen text for that moment, or empty"}

That applies to: intro, leg1, radio_lost, site1_arrive, site1_done, leg2, radio_back, site2_arrive, site2_done, leg3, site3_arrive, site3_done, leg4, drill_alarm, drill_explain, drill_clear, site4_arrive, site4_done, leg5, site5_arrive, site5_done, leg6, site6_arrive, site6_done, home, arrive. Same maximum item counts as before.

All other keys (title_tagline, menu_mission, menu_control, open_card, hint_key, hint_touch, button_walk, button_sample, button_confirm, sample_toast, photo_caption, end_heading, end_labels, end_line, end_control, end_replay, notes) are screen text only and keep their limits. Add one new key:

"end_say": [at most 2 items of {"who", "say"}] spoken over the end screen.

All hard rules from the brief still apply to both channels. Placeholders work in both channels. In `say`, write numbers the way they should be spoken only where a placeholder is not used.
