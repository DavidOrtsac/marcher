// Every word of the Mission. Written by Gemini 4 Argon (Vertex AI) from research/argon/BRIEF.md and ADDENDUM.md.
// Each line has two channels: "say" is the voiceover script (for the ear, voiced later), "show" is the on-screen text.
// Braces are filled from the live plan by story.js. Two factual fixes were made by hand, see research/argon/README.md.
// The three "tag_" words are the planner's own terms for the ground, shown by the suit display.
// The "pace" line was written by Argon later, from research/argon/PACE_BRIEF.md (answer in pace_v1.txt).
export default {
 "title_tagline": "Six stops on Mount Sharp",
 "menu_mission": "Start Demo",
 "menu_control": "Mission Control",
 "open_card": [
  "Gale Crater, Mars",
  "Mars day {sol}, {start_clock}",
  "Lower Mount Sharp"
 ],
 "open_objective": "Objective: collect a rock sample at each of six sites, then walk back to the crew rover.",
 "objectives_heading": "Objectives",
 "objective_sample": "Rock sample at {place}",
 "objective_drill": "Confirm the escape route",
 "objective_home": "Return to the crew rover",
 "hint_key": "Press Space to walk",
 "hint_touch": "Tap to walk",
 "button_walk": "Walk",
 "button_stop": "Stop",
 "button_sample": "Hold to\nsample",
 "button_confirm": "Hold to\nconfirm",
 "drill_tag": "This is a drill",
 "intro": [
  {
   "who": "rover",
   "say": "Radio check. I have you right outside the crew rover at Altadena.",
   "show": "Crew rover parked at Altadena, where NASA's Curiosity robot first drilled the boxwork."
  },
  {
   "who": "rover",
   "say": "This web of ridges is boxwork, where groundwater once hardened the rock through cracks.",
   "show": "Boxwork ridges: rock hardened by ancient groundwater."
  },
  {
   "who": "rover",
   "say": "Six stops today, to collect a rock sample from the ridges and from the hollows worn away between them.",
   "show": "Goal: collect a rock sample at each of 6 sites across ridges and hollows, then return."
  },
  {
   "who": "rover",
   "say": "Follow the pale line. It keeps you off steep ground.",
   "show": "Follow the pale route line."
  }
 ],
 "pace": [
  {
   "who": "rover",
   "say": "Planned pace is two kilometres an hour. Moving two hundred and nine kilos inside the suit's cooling limit.",
   "show": "Planned pace: 2 km/h. Moves 209 kg total mass within suit cooling limits."
  }
 ],
 "leg1": [
  {
   "who": "rover",
   "say": "Curiosity took {curiosity_sols} Mars days to work these six spots. We have {hours}.",
   "show": "Curiosity robot: {curiosity_sols} Mars days here. On foot: {hours}."
  },
  {
   "who": "rover",
   "say": "You are about to walk behind a ridge. Radio will drop.",
   "show": ""
  }
 ],
 "radio_lost": [
  {
   "who": "rover",
   "say": "See you on the other...",
   "show": "Crew rover signal lost..."
  },
  {
   "who": "suit",
   "say": "Line of sight to crew rover blocked by terrain. Planned gap. Suit audio active.",
   "show": "TERRAIN BLOCKING RADIO. EXPECTED. SUIT GUIDANCE ACTIVE."
  }
 ],
 "site1_arrive": [
  {
   "who": "suit",
   "say": "Stop one, Volcán Peña Blanca. This ridge wall exposes three layers.",
   "show": "SITE 1: RIDGE WALL WITH THREE ROCK LAYERS."
  },
  {
   "who": "suit",
   "say": "Take one rock sample across all three layers, bottom to top.",
   "show": "TASK: TAKE ONE ROCK SAMPLE ACROSS ALL THREE LAYERS, BOTTOM TO TOP."
  }
 ],
 "site1_done": [
  {
   "who": "suit",
   "say": "Rock sample logged. {dwell} minutes elapsed. Proceed to Salar de Agua Amara.",
   "show": "ROCK SAMPLE LOGGED ({dwell} MIN). CONTINUE ALONG ROUTE."
  }
 ],
 "leg2": [],
 "radio_back": [
  {
   "who": "rover",
   "say": "And I have you back. Clear line of sight to the crew rover again.",
   "show": "Line of sight restored. Crew rover radio online."
  }
 ],
 "site2_arrive": [
  {
   "who": "rover",
   "say": "Look at those delicate branching shapes in the rock. Groundwater work again.",
   "show": "Delicate branching rock structures, likely formed by groundwater."
  },
  {
   "who": "rover",
   "say": "Photograph them in place, then drill beside them, not through them.",
   "show": "Task: photograph in place, then drill a rock core sample beside them."
  }
 ],
 "site2_done": [
  {
   "who": "rover",
   "say": "Core is in. That took {dwell} minutes.",
   "show": "Rock core sample stowed ({dwell} min)."
  }
 ],
 "leg3": [
  {
   "who": "rover",
   "say": "Short walk to the Río Frío wall. Just eighty-one metres.",
   "show": ""
  }
 ],
 "site3_arrive": [
  {
   "who": "rover",
   "say": "This ridge wall has pea-sized round lumps, and a mineral band filling a crack.",
   "show": "Pea-sized nodules and a mineral-filled crack (vein)."
  },
  {
   "who": "rover",
   "say": "Take a rock sample with both the nodules and the vein, so we can compare their chemistry.",
   "show": "Task: take a rock sample with both nodules and vein, to compare their chemistry."
  }
 ],
 "site3_done": [
  {
   "who": "rover",
   "say": "Three down, three to go. Head for Monte Grande hollow.",
   "show": "Halfway mark ({dwell} min)."
  }
 ],
 "leg4": [
  {
   "who": "rover",
   "say": "Next stop is down in a hollow between the ridges.",
   "show": ""
  }
 ],
 "drill_alarm": [
  {
   "who": "suit",
   "say": "This is a drill. Warning. Solar storm detected. Surface radiation rising.",
   "show": "THIS IS A DRILL. SOLAR STORM WARNING. RADIATION RISING."
  },
  {
   "who": "suit",
   "say": "Return to crew rover shelter immediately.",
   "show": "SHELTER REQUIRED AT CREW ROVER."
  }
 ],
 "drill_explain": [
  {
   "who": "rover",
   "say": "A solar storm is a burst of fast particles from the Sun. Mars has thin air and no magnetic field to block them.",
   "show": "Solar storm: burst of Sun particles. Thin Mars air and no magnetic field."
  },
  {
   "who": "rover",
   "say": "When one hit in twenty seventeen, Curiosity measured ground radiation here doubling. Outside, you only have your suit, so the crew rover is your shelter.",
   "show": "In 2017, Curiosity measured ground radiation double here. Crew rover is shelter."
  },
  {
   "who": "suit",
   "say": "Red line marks fastest safe walk back. {drill_saved} metres shorter than the way out. {drill_min} minutes from here.",
   "show": "RED LINE: FASTEST SAFE RETURN. {drill_saved} M SHORTER THAN THE WAY OUT. {drill_min} MIN WALK."
  },
  {
   "who": "suit",
   "say": "Hold to confirm escape route.",
   "show": "HOLD TO CONFIRM ESCAPE ROUTE."
  }
 ],
 "drill_explain_plain": [
  {
   "who": "rover",
   "say": "A solar storm is a burst of fast particles from the Sun. Mars has thin air and no magnetic field to block them.",
   "show": "Solar storm: burst of Sun particles. Thin Mars air and no magnetic field."
  },
  {
   "who": "rover",
   "say": "When one hit in twenty seventeen, Curiosity measured ground radiation here doubling. Outside, you only have your suit, so the crew rover is your shelter.",
   "show": "In 2017, Curiosity measured ground radiation double here. Crew rover is shelter."
  },
  {
   "who": "suit",
   "say": "Red line marks fastest safe walk back. {drill_min} minutes from here.",
   "show": "RED LINE: FASTEST SAFE RETURN ({drill_min} MIN WALK)."
  },
  {
   "who": "suit",
   "say": "Hold to confirm escape route.",
   "show": "HOLD TO CONFIRM ESCAPE ROUTE."
  }
 ],
 "drill_clear": [
  {
   "who": "suit",
   "say": "Drill complete. Escape route confirmed. Resuming walk.",
   "show": "DRILL COMPLETE. RESUMING PLANNED WALK."
  },
  {
   "who": "rover",
   "say": "Good check. This route keeps you within a {walkback_max} minute walk of me at all times.",
   "show": "Max walk back to shelter on this route: {walkback_max} min."
  }
 ],
 "site4_arrive": [
  {
   "who": "rover",
   "say": "Monte Grande hollow. Bare bedrock on the floor, broken into polygon blocks.",
   "show": "Hollow floor: bare bedrock broken into polygon blocks."
  },
  {
   "who": "rover",
   "say": "Take a rock sample from the hollow floor here. That gives us the first half of our comparison.",
   "show": "Task: take a rock sample from the hollow floor (half 1 of the ridge and hollow comparison)."
  }
 ],
 "site4_done": [
  {
   "who": "rover",
   "say": "Hollow rock sample bagged. Now let us climb the ridge right next to it.",
   "show": "Hollow rock sample collected ({dwell} min). Next: matching ridge."
  }
 ],
 "leg5": [
  {
   "who": "rover",
   "say": "Fifty-five metres up onto Nevado Sajama ridge.",
   "show": ""
  }
 ],
 "site5_arrive": [
  {
   "who": "rover",
   "say": "Curiosity found clay in this ridge, and also drilled the hollow ten metres north.",
   "show": "Curiosity found clay minerals here and drilled the hollow 10 m north."
  },
  {
   "who": "rover",
   "say": "Take the matching rock sample right on top of the ridge.",
   "show": "Task: take the matching rock sample from the ridge top (half 2 of the comparison)."
  }
 ],
 "site5_done": [
  {
   "who": "rover",
   "say": "Now we hold both halves: the worn hollow and the cemented ridge.",
   "show": "Both rock samples secured: hollow and ridge ({dwell} min)."
  },
  {
   "who": "rover",
   "say": "One last stop at the eastern edge.",
   "show": ""
  }
 ],
 "leg6": [
  {
   "who": "rover",
   "say": "A hundred and twelve metres to Timboy Chaco.",
   "show": ""
  }
 ],
 "site6_arrive": [
  {
   "who": "rover",
   "say": "Timboy Chaco, eastern edge of the boxwork. Vertical rock covered in pits.",
   "show": "Eastern edge of the boxwork: vertical rock face covered in pits."
  },
  {
   "who": "rover",
   "say": "Grab the final rock sample and we are done.",
   "show": "Task: collect the final rock sample."
  }
 ],
 "site6_done": [
  {
   "who": "rover",
   "say": "All six in the bag. Time to walk home.",
   "show": "All 6 rock samples collected ({dwell} min). Return to crew rover."
  }
 ],
 "home": [
  {
   "who": "rover",
   "say": "Five hundred metres back to Altadena. The return leg was built in from the start.",
   "show": "Return leg to Altadena: 500 m."
  },
  {
   "who": "rover",
   "say": "Curiosity was the only thing that ever touched these rocks before today.",
   "show": "Only the Curiosity robot has been here before."
  },
  {
   "who": "rover",
   "say": "I have you in sight. Come on in.",
   "show": ""
  }
 ],
 "arrive": [
  {
   "who": "rover",
   "say": "Welcome back. About {hours} outside, with {daylight} of daylight still left.",
   "show": "Walk complete. {hours} outside, {daylight} of daylight left to spare."
  }
 ],
 "end_say": [
  {
   "who": "rover",
   "say": "Six rock samples, one point four kilometres, and plenty of daylight in the margin."
  }
 ],
 "tag_ridge": "RIDGE",
 "tag_hollow": "HOLLOW",
 "tag_minerals": "HYDRATED MINERALS",
 "sample_toast": "Rock sample {n} of {total} secured",
 "photo_caption": "Taken here by Curiosity ({camera}, Mars day {photo_sol})",
 "end_heading": "Walk Complete",
 "end_labels": {
  "samples": "Rock samples",
  "distance": "Walked",
  "outside": "Time outside",
  "daylight": "Daylight left"
 },
 "end_line": "Every step stayed inside daylight, off steep ground, and within {walkback_max} minutes of shelter.",
 "end_control": "Open Mission Control",
 "end_replay": "Walk Again"
};
