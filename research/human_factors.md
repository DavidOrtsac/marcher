# MARCHER human factors: sourced numbers

Compiled 2026-11-14 for the Space Apps 2026 "Martian Map" MARCHER planner (working name on the first day: MARSWALK) (Curiosity boxwork region, Mount Sharp, Gale crater).

Rules used in this file:
- Every number has a verbatim quote and the URL or DOI that was opened. All PDFs were downloaded and searched as text.
- **UNVERIFIED** = seen only in a search snippet or press account, or the source could not be opened. Do not show these in the app.
- **Derived** = our own arithmetic on sourced numbers. The inputs are sourced. The result is ours.
- PDF text extraction drops the Greek "μ" in the two 2018 RAD papers ("244 Gy/day" in the extracted text is 244 μGy/day). We confirmed the glyph is the Symbol-font μ (U+F06D) in the PDF.

## Summary table

| # | Quantity | Value for the app | Source |
|---|---|---|---|
| 1 | Walking metabolic rate | M [W] = (3.28m + 71.1)(0.661 v cos α + 0.115) + slope term with g (3.5 m g v sin α uphill, 2.4 m g v sin α · 0.3^(abs α/7.65) downhill) | Johnson 2010 MIT thesis (SEXTANT), after Santee et al. 2001 |
| 2 | Slope capability, planning pace | Walk up/down/across up to 20°. Apollo 15 walked ~17°. Level pace ~2 km/h | NASA EVA-EXP-0075 (2020) |
| 3 | Mass on Mars | xEMU 170 kg (376 lbm). Mars suit target max 104 kg (229 lbm). Tools/samples 50 lbm (22.7 kg). Crew 82 kg | Ogilvie et al., ICES-2026-127 (NASA JSC) |
| 4 | EVA length, metabolic load | Up to 8 h (6±2 h). Plan at 1200 BTU/hr (352 W) average. Suit thermal design 500 to 2100 BTU/hr | EVA-EXP-0075, ICES-2026-127, NASA-STD-3001 Vol 2 Rev F |
| 5 | Oxygen use | 0.075 kg O2/h at 293 W (RQ 0.9), which is 0.071 kg O2 per MJ (derived) | NASA BVAD, NASA/TP-2015-218570/REV1, Table 4-76 |
| 6 | Apollo lunar EVA average | 980 kJ/h (234 kcal/h) = 272 W (derived) over 158.74 h of surface EVA | Waligora & Horrigan, NASA SP-368 Table 2 |
| 7 | Walkback limits | Walking range 2 km. Unpressurized rover 10 km (~5 h walk back). Mars DRA: ~15 km radial. Lunar walkback assumption 10 km, Mars gravity untested (2014) | EVA-EXP-0075, Mars DRA 5.0 Add. 2 |
| 8 | Gale surface radiation | 0.210 ± 0.040 mGy/day absorbed, 0.64 ± 0.12 mSv/day dose equivalent | Hassler et al. 2014, Science 343, 1244797 |
| 9 | Sept 2017 SEP at Gale | Dose rate rose 2 to 3x (B: 240 to 718 μGy/day peak). Doubled within ~7 h. SEP added 544 μGy. Exposure ≈ 2 days of GCR | Zeitlin et al. 2018 GRL, Hassler et al. 2018 Space Weather |
| 10 | Limits, terrain shielding | Career 600 mSv. SPE design limit 250 mSv. 30-day BFO 250 mGy-Eq. Cliffs/buttes cut RAD dose 4% (butte) up to 19.4% (narrow valley by a cliff) | NASA-STD-3001 Vol 1 Rev C, Ehresmann et al. 2021, Guo et al. 2026 |

---

## 1. Walking metabolic cost (speed, slope, gravity)

### Implementable equation (SEXTANT traverse planner model)

```
M [W]    = W_level + W_slope
W_level  = (3.28*m + 71.1) * (0.661*v*cos(a) + 0.115)
W_slope  = 0                                          if a = 0
         = 3.5 * m * g * v * sin(a)                   if a > 0  (uphill)
         = 2.4 * m * g * v * sin(a) * 0.3^(|a|/7.65)  if a < 0  (downhill, sin(a) < 0)
```

- m = total explorer mass in kg (crew + suit + carried tools and samples)
- v = walking speed along the surface, m/s
- a = terrain slope in degrees (code converts with pi*a/180 inside sin and cos)
- g = local gravity, m/s². Use 3.71 per the challenge. NASA's fact sheet lists 3.73 mean and 3.69 equatorial (see note below).
- Energy for a leg = M × (distance / v), in J.

Speed vs slope used with this model (Márquez, from Apollo 14 data), v in m/s, a in degrees:

| Slope a | v (m/s) |
|---|---|
| -20° ≤ a < -10° | 0.095a + 1.95 |
| -10° ≤ a < 0° | 0.06a + 1.6 |
| 0° ≤ a < 6° | -0.2a + 1.6 |
| 6° ≤ a < 15° | -0.039a + 0.634 |
| 15° ≤ a ≤ 20° (code: a ≥ 15° or a ≤ -20°) | 0.05 |

Sources and quotes:
- Johnson, A. W. (2010), *SEXTANT* S.M. thesis, MIT. https://dspace.mit.edu/handle/1721.1/59560
  - Table 3.2, "Metabolic rate equations for suited astronaut (Santee 2001)": "Metabolic Rate (W) = Wlevel + Wslope", "Wlevel = [3.28 • m + 71.1] • [0.661 • v • cos(α) + 0.115]", "α > 0° 3.5 • m • g • v • sin(α)", "α < 0° 2.4 • m • g • v • sin(α) • 0.3^|α|/7.65".
  - "m is the explorer mass, v is the explorer velocity, g is the planetary gravity, and α is the terrain slope."
  - "The explorer mass is the astronaut's suited mass, along with any extra equipment or samples being carried."
  - Appendix MATLAB (confirms sign and abs()): "power(f) = (2.4*mass*gravity*V(f).*sin(pi*slope(f)/180).*(0.3.^(abs(slope(f))/7.65)))+((3.28*mass+71.1)*Rfactor(f));" and "Rfactor = 0.661*V.*cos(pi*slope/180)+0.115;"
  - Table 3.1: "The relation for human astronauts was developed by Márquez from data on the Apollo 14 mission compiled by Waligoria and Horrigan". Code: "a = (slope<=-20 | slope>=15); V(a) = 0.05;"
- NASA still uses this as the baseline. Kim, Hoffmann, Estep, Marshall-Goebel, Buckland (2024), IEEE EMBC, NASA JSC Crew State and Risk Model. https://ntrs.nasa.gov/api/citations/20240001423/downloads/IEEE%20EMBC%202024.pdf
  - "Decision support tools for planning EVA traverses utilize path information, metabolic expenditure, etc. [1]. The model employed for estimating metabolic rate builds upon an equation derived from laboratory treadmill data [2]." ([1] = Johnson et al. 2010 AIAA SPACE, labelled "Conventional" in their Table I. [2] = Santee et al. 2001.)
  - Their field alternative (modified Pandolf, Santee 2003, **no gravity term**): "MP = 1.5·W+2.0·(W+L)·(L/W)2+ƞ·(W+L)·(1.5V2 +0.35·V·G)", with "body weight (W), external load (L) in kg, walking speed (V), slope grade (G) as a percentage, terrain coefficient (η)".

### Valid range and known limits
- Base data: 1 g, unsuited, ±12% grade (≈ ±6.8°), one speed. Santee et al. (2001), Aviat Space Environ Med 72(6):562-6, PMID 11396562 (abstract opened at https://pubmed.ncbi.nlm.nih.gov/11396562): "walking at 1.34 m x s(-1) on a single grade (-12%, -10%, -8%, -4%, -2%, 0%, +4%, +4%, +8% and +12%) with a 0, 9.1- or 18.1-kg load." and "The minimum VO2 values occurred at -8% grade."
- Gravity enters only the slope term. The level term does not scale with g, so it overstates level walking cost at reduced gravity. Carr & Newman (2007), Aviat Space Environ Med 78(11):1013-22, doi:10.3357/asem.1952.2007 (abstract, PMID 18018432): "the metabolic cost of locomoting at a given velocity changing in proportion to gravity for running and less than in proportion for walking."
- The Márquez speeds are lunar (Apollo 14). At Mars mass they give unrealistically high metabolic rates on level ground (see derived numbers below). Use a speed cap.
- NASA suited treadmill data exist but coefficients were withheld. Norcross et al. (2010), NASA/TP-2010-216125, https://ntrs.nasa.gov/citations/20110003409
  - Model form: "MR = b0 + b1·(Vlocomotion×Glocomotion) + b2· Lshank + b3·(Lshoulder) + b4·Psuit + b5·Msuit"
  - "This is why equation coefficients were not reported at this time per the current data set."
  - Range: "Speeds used for this testing ranged from 0.56 to 0.97 m•s-1, and inclines ranged from 0% to 30%." Gravity in Table 7 spans 0.12-g to 0.32-g (below Mars 0.38 g).
  - Slope dominates at reduced gravity: "At 0% and 10% grade, the mean difference between the highest and the lowest weight conditions was 1.9 mL•kg-1•min-1and 3.5 mL•kg-1•min-1, respectively ... as the grade increased to 20% and 30%, this difference increased to 8.7 and 17.0 mL•kg-1•min-1, respectively."

### Mars anchor for calibration (NASA JSC, 2026)
Ogilvie, Swartout, Hoffmann, McFarland, Hickox, "Mars Spacesuit Mass Requirements," ICES-2026-127 (slides). https://ntrs.nasa.gov/api/citations/20260005410/downloads/Mars_Mass_ICES2026_Presentation_Final.pdf
- "Based on the 10km walkback study, it is estimated approximately 14 VO2 (ml/min/kg) is added against baseline unsuited walking due to the pressurized suit restrictions"
- "at 2.2mph this would be 19ml/min/kg based on the walkback study" (slide context is Mars. The bullet itself does not restate gravity.)
- Walkback metabolic rate: "Average crewmember would have 1700 BTU/hr" and "Large (95th percentile mass) crewmember would be 2300 BTU/hr"
- VO2 to metabolic rate: "MetRate(BTU/hr) = (0.961 + (0.275 ∗ RER)) ∗ VO2(ml/(min∗kg)) ∗ mass(kg)" (RER 0.85 used on the slide)

### Derived numbers (our arithmetic, inputs sourced above)
- Mars explorer mass: 82 kg crew + 104 kg Mars suit target + 22.7 kg tools = 208.7 kg.
- Level walking at 0.56 m/s (2 km/h ConOps pace): M = 755.6 × 0.485 = 367 W (1251 BTU/hr).
- Speed that gives the 1200 BTU/hr (352 W) planning average on level ground: v = 0.53 m/s (1.9 km/h). This matches the 2 km/h ConOps pace.
- Speed that reaches the 2100 BTU/hr (615 W) suit thermal bound: v = 1.06 m/s (3.8 km/h).
- Márquez level speed 1.6 m/s gives 886 W (3023 BTU/hr), above that bound. So cap v.
- Comparison with the Mars walkback anchor: walkback suit 265 lbm (120.2 kg) + 82 kg, v = 2.2 mph (0.98 m/s), model gives 562 W (1917 BTU/hr). NASA slide gives 1700 BTU/hr (average crewmember) and 19 mL/min/kg, which their formula turns into 1862 BTU/hr for 82 kg. The model sits 3% to 13% high.
- 10° uphill at 0.56 m/s, g = 3.71: slope term adds 264 W, level term (with cos 10°) 362 W. Total 626 W (2135 BTU/hr), just above the 2100 BTU/hr bound.
- Suggested app rule (design choice, not from a source): pick v on each leg so M stays at or below the planning rate, and never above the Márquez v(a).

---

## 2. Slope limits and suited walking speeds

### Numbers for the app
- Design slope: walk up, down and across up to **20°**.
- Demonstrated: Apollo 15 walked slopes of **~17°**.
- Speed model collapses to 0.05 m/s at **≥15° uphill** and **≤ -20° downhill** (Márquez/SEXTANT, section 1). Treat these as practical no-go limits in the cost model.
- No opened NASA source gives a separate "maximum sustained" vs "maximum short" slope. That split is **not found** (see UNVERIFIED list).
- Level planning pace: **~2 km/h** (0.56 m/s, derived conversion).

Sources and quotes:
- NASA EVA-EXP-0075, "Exploration EVA System Concept of Operations Summary" (Coan, Feb 2020). https://ntrs.nasa.gov/api/citations/20200001071/downloads/20200001071.pdf
  - "Walking up/down/across a slope of up to 20° and on traverses of up to 2 km away from the lander"
  - Walking range: "Assumes ~2 km/hr walking pace on relatively level regolith", "Does not account for slope or obstacles (boulders)"
- Same briefing, nasa.gov version: https://www.nasa.gov/wp-content/uploads/2020/01/topic_1-_eva_lunar_surface_concept_of_operations.pdf
  - "[Note: Apollo 14 walked ~1.45 km from the lander, and Apollo 15 traversed on slopes of ~17°]"
- Scoville, Artemis III EVA landing-site study (NTRS 20210026296). https://ntrs.nasa.gov/api/citations/20210026296/downloads/Scoville%20Final%20presentation%20-%20compressed.pptx.pdf
  - "Astronaut in suit must be able to walk up, down, across a 20-degree slope [2]"
  - "Yellow = max walking range 1.38 km radius"
- Suited lab data at steep grade: Schlotman et al. (2023), IEEE Aerospace, ARGOS lunar offload, Mark III suit. https://ntrs.nasa.gov/api/citations/20220009964/downloads/IEEE_aerospace2023_met%20rate%20study_schlotman%20v3.pdf
  - "subjects reached maximum MR and HR values during a 500m traverse at 30% grade in the E2E block (subject 1: 1747 BTU/hr, 150 BPM; subject 2: 1656 BTU/hr, 177 BPM)."

### Walking speeds (sourced)
| Context | Speed | Quote and source |
|---|---|---|
| Earth average | 3.1 mph (1.39 m/s) | "Average walking speed on earth is 3.1 mph" (ICES-2026-127, URL above) |
| Apollo max nominal / walkback | 2.2 mph (0.98 m/s), 1.7 mph (0.76 m/s) beyond 1 h | "Failed rover walkback assumption: 2.2 mph <1hour (1.7mph for >1hour)" and "2.2mph was considered maximum nominal speed for Apollo" (ICES-2026-127) |
| Apollo 15 measured | 0.7 to 1.4 mph (0.31 to 0.63 m/s) | "Apollo 15: 0.7-1 mph (first EVA), 1-1.4mph (second EVA)" (ICES-2026-127) |
| Artemis ConOps planning | ~2 km/h | EVA-EXP-0075 (above) |
| 10 km treadmill walkback, lunar g, MKIII | 3.94 mph average, 95.8 min | "The average time to completion was 95.8 minutes at an average velocity of 3.94 mph with an average metabolic rate of 2374 BTU/hr" (Gernhardt, Lee, Vos 2007, https://ntrs.nasa.gov/api/citations/20070016007/downloads/20070016007.pdf) |
| Mars g suited | 3.4 mph tested, up to 45 mL/(kg·min) | "unpublished suited metabolic rates collected during ambulation in a simulated Martian gravity environment at 3.4 mph (1.5 m/s) ranged up to 45 mL/(kg·min)" (APACHE, ICES-2022-209, https://ntrs.nasa.gov/api/citations/20220003008/downloads/v3%20ICES%20Paper%202022%20-%20APACHE%20Physical%20Workload%20Approximation_2022-02-22.pdf) |
| Mars g limit | VO2max reached at 3.5 mph | Chart label: "Hits VO2max at 3.5mph on Mars" (ICES-2026-127) |

Uphill speeds: use the Márquez v(a) table in section 1. No Mars-gravity uphill speed data were found in opened sources.

---

## 3. Suit mass, carried mass, weight on Mars

### Numbers for the app
| Item | Mass | Source |
|---|---|---|
| Crew (reference male) | 82 kg (180 lbm) | ICES-2026-127 |
| xEMU (government reference design) | 170 kg (376 lbm) | ICES-2026-127 |
| xEMU PLSS | 209 lbm dry + 16.3 lbm consumables + 7.6 lbm DCU | ICES-2026-127 |
| Mars suit maximum (proposed) | 104 kg (229 lbm): PLSS 62 kg, PGS 42 kg | ICES-2026-127 |
| Tools and samples carried | 50 lbm (22.7 kg) | ICES-2026-127 |
| Apollo A7LB suit + -7 PLSS | 90.7 kg | BVAD Table 4-73 |
| Shuttle/ISS EMU | 135 kg | BVAD Table 4-73 |

Quotes (ICES-2026-127, URL in section 1):
- "Human weight assumes an average male at 180lbm (82kg)"
- "xEMU PLSS mass – 209lbm dry + 16.3lbm consumables + DCU 7.6lbm"
- "The current government reference design (xEMU) is 376lbm (170kg)"
- "Mars suits are estimated to have a maximum of 229lbm (104kg)"
- "137 lbm (62kg) for the PLSS and 92lbm (42kg) for the PGS"
- "A 50 lbm of tool/sample weight is assumed in estimations"
- "NIOSH max carry weight limit is 51 lbf for lifting loads"
- Pressure offload while walking: "During walking this is approximately 48lbf based on testing"
- Table "Suit Relative Weight Comparison": xEMU "Mars equivalent 141 (627)" lbf (N) and "Mars equivalent (with human) 208 (927)" lbf (N).

BVAD: Anderson, Ewert, Keener (2018), Life Support Baseline Values and Assumptions Document, NASA/TP-2015-218570/REV1. https://ntrs.nasa.gov/api/citations/20180001338/downloads/20180001338.pdf
- Table 4-73: "Apollo Program Spacesuit, A7LB 90.7", "Shuttle/ISS Program Spacesuit 135" (kg)
- Table 4-74: "Martian Surface with Apollo A7LB EMU 160.7 [kg] 601 [N] 87.5 [%]" (BVAD uses Mars g = 3.740 m/s²)

### Derived weight on Mars at g = 3.71 m/s² (our arithmetic)
| Configuration | Total mass | Weight on Mars | Feels like on Earth |
|---|---|---|---|
| xEMU + 82 kg crew + 22.7 kg tools | 274.7 kg | 1019 N | 103.9 kg |
| Mars suit max + 82 kg crew + 22.7 kg tools | 208.7 kg | 774 N | 79.0 kg |
| Unsuited 82 kg crew | 82 kg | 304 N | 31.0 kg |

The suit's pressure offload (~48 lbf = 214 N, quote above) reduces the load felt at the shoulders. It does not change the mass m in the section 1 equation.

---

## 4. EVA consumables, duration, metabolic limits, walkback

### Duration
- Up to **8 h** (6 ± 2 h). EVA-EXP-0075 (URL section 2): "Supports EVAs of up to 8 hours in duration (6±2 hours)"
- Mars option: two **4 h** sorties per day. BVAD section 4.6.2: "A likely mission design to mitigate this problem is to reduce the standard EVA duration to 4 hours and plan to recharge the spacesuit consumables at midday."
- Mars DRA 5.0 Addendum #2, NASA/SP-2009-566-ADD2 (March 2014). https://ntrs.nasa.gov/api/citations/20160003093/downloads/20160003093.pdf
  - "Suit design to minimize crew injury and fatigue levels during an 8-hour EVA"
  - "Each crew is limited to no more than 12 hours of EVA in a 48-hour period and 24 hours of EVA per 7-day period with at least one full non-EVA day of rest within that same 7-day period. [TBR]"
  - "Crew will perform up to three 6.5-hour EVAs each week for habitat maintenance, trash ops, local exploration, etc."
- Backup oxygen: EVA-EXP-0075: "Secondary O2 on suit provides an additional hour of breathing gas"

### Oxygen use vs metabolic rate
- **0.075 kg O2 per hour at 293 W** (respiratory quotient 0.9). BVAD Table 4-76: "Oxygen Consumption kg/CM-h 0.075" with note "McBarron, et al. (1993); metabolic rate of 293 W/CM and a respiratory quotient of 0.9."
- Closed-loop PLSS (metabolic + leak): "oxygen usage is 0.3 kg per 4-hour EVA sortie, or 0.076 kg/h" (BVAD 4.6.2)
- Derived: 0.075 kg/h ÷ 1.055 MJ/h = **0.071 kg O2 per MJ**, or **2.56 × 10⁻⁴ kg/h per W**. At 1200 BTU/hr (352 W): 0.090 kg/h, 0.72 kg for 8 h. 293 W equals 1000 BTU/hr, so 0.075 kg O2 per 1000 BTU.

### Metabolic rate: averages
- Apollo lunar surface EVAs, all missions: **980 × 10³ J/hr (234 kcal/hr) = 272 W = 929 BTU/hr** (derived conversion). Waligora & Horrigan, "Metabolism and Heat Dissipation During Apollo EVA Periods," Biomedical Results of Apollo, NASA SP-368 (1975), Table 2. https://ntrs.nasa.gov/api/citations/19760005580/downloads/19760005580.pdf
  - Table 2 "Mean" row: ALSEP deployment "1018 (244)", geological station "1018 (244)", overhead "1123 (270)", Lunar Roving Vehicle "518 (123)", total "980 (234)" J/hr × 10³ (kcal/hr). "Total time (hr) ... 158.74".
  - "Several crewmen experienced the minimum average metabolic rate of approximately 837 x 103 J/hr (200 kcal/hr) on different missions."
  - Apollo 14 walking: "These data indicate a very poor correlation between traverse rate and metabolic rate."
- Gernhardt et al., "Extravehicular Activities," chapter 5.4 (2013). https://nasa.gov/wp-content/uploads/2023/03/gernhardt-eva-ops-chp-5.4-2013.pdf : "Metabolic rates during those EVAs averaged 1000 BTU/hour, with peaks of up to 2200 BTU/hour."
- Apollo PLSS design point: "designed for a 4-hr lunar exploration mission and an average crewman metabolic rate of 1200 Btu/hr." (Carson, Apollo PLSS Performance Report, https://ntrs.nasa.gov/api/citations/19720019460/downloads/19720019460.pdf)
- Future planetary sizing: **1200 BTU/hr (352 W)**. ICES-2026-127: "future missions will be in a planetary gravity field (either Lunar or Mars) leading to an expected 1200 BTU/hr for future mission sizing"
- BVAD lunar EVA value: "Human Metabolic Rate During EVA ... 1.06 MJ/CM-h ... 300 W/CM" (Table 4-75)

### Metabolic rate: limits and peaks
- Suit thermal design range **500 to 2100 BTU/hr**. NASA-STD-3001 Vol 2 Rev F (approved 2026-07-14), [V2 11011] rationale. https://standards.nasa.gov/system/files/tmp/NASA-STD-3001%20Vol%202%20Rev%20F.pdf : "allow nominal suited operations with crewmember metabolic rates of 528 to 2220 kJ/hr (500 to 2100 Btu/hr) without undue heat discomfort."
- Same standard requires the app-like display: "[V2 11037] The system shall measure or calculate metabolic rates of suited EVA crewmembers." and "[V2 11038] The system shall display metabolic data of suited EVA crewmembers to the crew."
- Water: "240 mL (8.1 fl oz)/hour is the minimum recommendation", with "water available for contingency scenarios such as a 10-km walk-back in case of surface transport vehicle failure." (Vol 2 Rev F)
- Fitness: NASA-STD-3001 Vol 1 Rev C, [V1 4002]: "Crewmembers shall maintain an in-mission VO2max at or above 36.5 ml⁄min/kg for missions with extraterrestrial surface EVAs" https://standards.nasa.gov/sites/default/files/standards/NASA/C//nasa-std-3001-vol-1-rev-c-signature.pdf
- Workload guidance (ICES-2026-127): "Nominal VO2 should not exceed 35% VO2max for an 8-hour workday, or 50% if trained for aerobic" and "Crewmembers may be expected to handle ~43% VO2max for an EVA"
- Apollo cooling: the liquid cooling garment "could suppress sweating at work rates as high as 1670x 103J/hr (= 400 kcal/hr) and allowed sustained operation at rates as high as 2090 x 103 J/hr (_ 500 kcal/hr)" (SP-368, extraction shows "_" for "≈")
- Apollo 15 to 17 PLSS capacity: "7530 x 103 J (_1800 kcal). This system provided for EVAs of seven hours at 1050 x 103 J/hr (_250 kcal/hr) or eight hours at 942 x 103 J/hr (=225 kcal/hr)." (SP-368)
- Lunar 10 km walkback peak: "The maximum 15 minute average metabolic rate was 2617 BTU/hr." Test stop rule: "Subject's heart rate or measured VO2 at level > 85% VO2pk for 2 min or more" (Gernhardt, Lee, Vos 2007, URL section 2)

### Walkback and maximum distance from habitat or rover
| Rule | Value | Quote and source |
|---|---|---|
| Walking-only range (Artemis) | 2 km | EVA-EXP-0075: "Walking Range 2 km", "Apollo 14 walked 1.45 km from lander" |
| Unpressurized rover (Artemis) | 10 km (~5 h walk back) | EVA-EXP-0075: "Unpressurized Rover Range 10 km (~5 hr walk back)", "Distance must be balanced with suit consumables remaining" |
| Single pressurized rover (Artemis) | 12 km (< 8 h walk back) | EVA-EXP-0075: "Single Pressurized Rover Range 12 km (< 8-hr walk back)" |
| Mars DRA 5.0, unpressurized rovers only | ~15 km radial | ADD2: "This implies traverses by the crew of no more than walk-back distances (approximately 15 kilometers radial distance)." |
| Mars DRA 5.0, gravity caveat | lunar 10 km, Mars untested (as of 2014) | ADD2: "Note: Under Lunar 1/6-g conditions, the walk back assumption is 10 km. Testing has not been performed with Martian gravity conditions." |
| Mars DRA 5.0, one PLSS charge | ~20 km total | Drake, Hoffman, Beaty, IEEE Aerospace 2010 (https://ntrs.nasa.gov/api/citations/20090040343/downloads/20090040343.pdf): "determined by the distance a crew member could walk during one charge of power and breathing gases in his/her Portable Life Support System (PLSS) – roughly 20 km total" |
| Mars suit mass study (2026) | 1.1 mi (30 min) or 2.2 mi (1 h) radius | ICES-2026-127: "Assuming either 30 minute or 1-hour walkback and 2.2mph walkback this is a maximum radius away from the craft of 1.1 miles (30 minute) or 2.2 miles (1 hour)" and "the 30-minute walkback may be preferred so the design will close" |

Note on dates: ADD2 (2014) says Mars-gravity walkback was untested. ICES-2026-127 says the 10-km walkback study "tested suited performance for a 10km walkback at both lunar and Mars gravity offloads for a fixed suit mass". The Mars-gravity walkback report itself was not opened.

---

## 5. Surface radiation at Gale (MSL RAD) and limits

### Numbers for the app
- GCR baseline (Aug 2012 to mid 2013, solar max): **0.210 ± 0.040 mGy/day** absorbed, **0.64 ± 0.12 mSv/day** dose equivalent, <Q> = 3.05 ± 0.3.
- Near solar minimum (5 days before Sept 2017 SEP): **240 μGy/day** (B detector, water), dose equivalent **543 μSv/day**, <Q> = 2.26.
- Derived: one 8 h EVA at 0.64 mSv/day = 0.21 mSv of GCR (EVA share of a sol, not an increment over habitat dose, since the habitat is also shielded).

Hassler et al. (2014), "Mars' Surface Radiation Environment Measured with the Mars Science Laboratory's Curiosity Rover," Science 343, 1244797. doi:10.1126/science.1244797. science.org returned HTTP 403. Quotes taken from the Science in the Classroom annotated reproduction: https://www.scienceintheclassroom.org/research-papers/curiosity-tells-all-about-mars-radiation-environment
- "an average total GCR dose rate at Gale crater (–4.4 km MOLA) of 0.210 ± 0.040 mGy/day"
- "an average GCR dose-equivalent rate on the Mars surface of 0.64 ± 0.12 millisieverts (mSv)/day"
- <Q> "on the martian surface to be 3.05 ± 0.3, compared with 3.82 ± 0.3 measured during cruise"
- Cruise: "compared with 0.48 ± 0.08 mGy/day measured during cruise inside the MSL spacecraft"
- Mission: "we estimate a total mission dose equivalent of ~1.01 Sv for a round trip Mars surface mission" (180 days each way + 500 days on the surface)
- April 2013 SEP on the surface: dose "was found to be 50 μGy in the less-shielded of the two detectors used for dosimetry", and "the dose equivalent from this event was ~50 μSv."

### September 2017 SEP event at Gale
Zeitlin et al. (2018), GRL 45, doi:10.1029/2018GL077760. Opened via DLR eLib: https://elib.dlr.de/120101/1/ME-SBA-2018-Zeitlin_et_al-2018-Geophysical_Research_Letters.pdf
- "dose rates rose above background galactic cosmic ray levels by factors of two to three over the course of several hours and leveled off at sustained peak rates for about 12 hours before declining over the following 36 hours"
- Onset and peak: "A steady, statistically-significant increase in the E dose rate started around 19:50 UTC September 10. By 03:00 UTC September 11, both B and E dose rates had reached about 90% of the eventual peak dose rates, which came a few hours later at about 07:00."
- "The event as seen on Mars was unambiguously underway by about 21:00 UTC on 10 September, and dose rates doubled within about 7 hours."
- "the exposure incurred by being away from shelter for the duration would have been comparable to adding about two days of GCR exposure."
- Event dose: "the SPE contributed 544 μGy of dose in water as measured by the B detector, and 369 μGy of dose as measured by E."
- Table I (μGy/day, μSv/day): B "240" pre-SPE, "718" peak, "464" average during SPE, "208" post-SPE. Dose equivalent (B) "543" pre, "841" peak. 30-day totals "16.5" mSv before vs "16.6" mSv starting 9/11/17.
- Quality factor: "For the most intense portion of the SPE, <Q> was 1.17, compared to values of 2.3 found for GCR-only periods before and after the event."
- Shock after: "caused a sudden drop of about 15% in instantaneous dose rates" (abstract)
- "Multiplying the SPE doses quoted above ... by the proton RBE of 1.5 yields exposures far below even the smallest of the 30-day exposure limits, which is 250 mGy-Eq for the heart and blood-forming organs."
- Elevation matters: "At the mean Martian elevation, the vertical column depth of atmosphere is 16 g cm-2" vs "23 g cm-2 during the event" above RAD.

Hassler, Zeitlin, Ehresmann et al. (2018), Space Weather 16, 1702-1708, doi:10.1029/2018SW001959. Opened via DLR eLib: https://elib.dlr.de/121538/1/ME-SBA-2018-Hassler...%20Berger%20Matthi%C3%A4%20MSL-RAD%20SPE%20September%202017-Space_Weather.pdf
- "In the days leading up to September 10, 2017, Active Region (AR) 2673 produced several X-class flares, including an X8.2 flare on September 10. Several hours after this flare activity, at approximately 19:50 UTC, RAD began to detect an increase in the surface radiation environment"
- "the dose rate is approximately 15-20% larger at the mean Martian (MOLA) elevation compared to Gale crater under the same atmospheric and heliospheric conditions."
- JPL release, 29 Sept 2017 (https://www.jpl.nasa.gov/news/large-solar-storm-sparks-global-aurora-and-doubles-radiation-levels-on-the-martian-surface/): "It produced radiation levels on the surface more than double any previously measured" and "The high readings lasted more than two days."

### NASA limits
NASA-STD-3001 Vol 1 **Rev C** (approved 2023-09-15, current per standards.nasa.gov node 238). https://standards.nasa.gov/sites/default/files/standards/NASA/C//nasa-std-3001-vol-1-rev-c-signature.pdf . Rev B (2022-01-05) has the same values: https://www.nasa.gov/wp-content/uploads/2020/10/2022-01-05_nasa-std-3001_vol.1_rev._b_final_draft_with_signature_010522.pdf
- Career: "[V1 4030] An individual crewmember's total career effective radiation dose due to spaceflight radiation exposure shall be less than 600 mSv. This limit is universal for all ages and sexes."
- SPE: "[V1 4031] The program shall protect crewmembers from exposure to the design reference Solar Particle Event (SPE) environment proton energy spectrum (sum of the October 1989 events) to less than an effective dose of 250 mSv."
- 30-day / 1-year limits (Table 4.8-1, Rev C):

| Organ | 30-day | 1-year | Career |
|---|---|---|---|
| Lens | 1,000 mGy-Eq | 2,000 mGy-Eq | 4,000 mGy-Eq |
| Skin | 1,500 mGy-Eq | 3,000 mGy-Eq | 6,000 mGy-Eq |
| Blood-forming organs | 250 mGy-Eq | 500 mGy-Eq | Not applicable |
| Circulatory system | 250 mGy-Eq | 500 mGy-Eq | 1000 mGy-Eq |
| CNS | 500 mGy | 1,000 mGy | 1,500 mGy |
| CNS (Z≥10) | - | 100 mGy | 250 mGy |

Caution: Hassler's ~1.01 Sv is a RAD dose equivalent for a full round trip. The 600 mSv limit is NASA effective dose. They are different quantities. Do not subtract one from the other in the app.

### SEP warning and onset times
- Sun to Earth travel for energetic protons: NOAA SWPC, https://www.spaceweather.gov/phenomena/solar-radiation-storm : "At these velocities, the protons can traverse the 150 million km from sun to Earth in just 10's of minutes or less." and "A Solar Radiation Storm can persist for time periods ranging from hours to days."
- Electron-based early warning: Posner (2007), "Up to 1-hour forecasting of radiation hazards from solar energetic ion events with relativistic electrons," Space Weather 5, S05001, doi:10.1029/2006SW000268 (abstract via Crossref): "relativistic electrons always arrive at 1 AU ahead of nonrelativistic SPEs allowing their forecasting". The "up to 1 hour" figure is from the title.
- Mars, Sept 2017: X8.2 flare on Sept 10, surface rise at ~19:50 UTC "several hours" later, dose doubled within ~7 h, peak ~07:00 UTC Sept 11 (quotes above). Earth GLE started "at about 16:15 UTC September 10" (Zeitlin 2018).
- NASA M2M Space Weather Analysis Office (https://science.gsfc.nasa.gov/m2m-swao): "Real-time space weather notification emails", "Mars conjunction campaign coordination", coverage "Weekday coverage 7 AM - 10 PM ET, weekends 8 AM - 10 PM ET", with 24/7 "during critical missions (Artemis, launches)". The page states no lead time.
- App rule suggestion (design choice): on an SEP alert, route to the nearest shelter that keeps the return under the observed ~7 h doubling time, with the 1 h secondary-O2 margin from section 4.

---

## 6. Terrain shielding measured by RAD at Gale

### Numbers for the app
| Site (date) | Setting | Sky blocked during parking (ROS) | Measured dose-rate drop |
|---|---|---|---|
| Murray Buttes, Butte M12 (sols 1456-1467, Sept 2016) | next to a butte | 19% | 4% (neutrals 7.5%) |
| Tower Buttes P1 (Feb 2020) | near a butte | 13.7% (background 7.9%) | 4.0% |
| Tower Buttes P2 | near another butte | 14.8% (background 5.4%) | 7.1% |
| Bloodstone Hill P3 (June 2020) | near a boulder | 12.7% (background 7.2%) | 6.5% |
| Mt Mercou P4 / P5 (Mar 2021) | near a boulder | 14.4% / 11.4% (background 11.8%) | 3.8% / 2.1% |
| **Maria Gordon Notch P6 (Dec 2021)** | **very narrow valley near a cliff** | **37.9% (background 18.0%)** | **19.4%** |
| Paraitepuy P7 / P8 (Aug 2022) | near a small hill | 32.8% / 29.6% (background 22.1% / 17.8%) | 9.8% / 9.9% |

Implementable model (Guo et al. 2026, Eq. 2-3): downward dose = Σ over zenith angle θ of (1 − ROS(θ)) · d(θ) · δθ, where ROS(θ) is the blocked fraction of sky at that zenith angle (from a DEM horizon scan) and d(θ) is the modeled dose per degree. Then add the terrain albedo, which is about 18% to 24% of the flat-ground total. The paper's d(θ) curves are plotted (its Figure 2), not tabulated, so the app needs a digitized d(θ) or the measured table above.

Sources and quotes:
- Ehresmann, Hassler, Zeitlin, Guo, Wimmer-Schweingruber, Khaksarighiri, Löffler (2021), "Natural Radiation Shielding on Mars Measured With the MSL/RAD Instrument," JGR Planets, doi:10.1029/2021JE006851 (abstract via Crossref API): "We show measurements from when Curiosity was parked close to Butte M12 in the Murray Buttes formation, which blocked out 19% of the surrounding sky view. During this time, from Mars Science Laboratory (MSL) sol 1456–1467, we find a decrease of 4% in the expected dose rate, and a decrease of 7.5% in the neutral particle environment."
- Guo, Tian, Charpentier, Wimmer-Schweingruber, et al. (2026), "Influence of Mars Topography on Radiation Dose Detected by the Mars Science Laboratory and Assessment of Mars Surface Albedo Radiation," JGR Planets 131, e2026JE009704, doi:10.1029/2026JE009704 (open access, opened via DLR eLib): https://elib.dlr.de/224554/1/ME-SBA-2026-Guo...Matth%C3%A4_Berger_Reitz%20Influence%20of%20Mars%20Topography%20on%20Radiation%20Dose%20Detected%20by%20the%20Mars%20Science%20Laboratory_JGR%20Planets.pdf
  - "After parking near Murray Buttes in September 2016 where it first detected a ∼5% decrease in dose rate, the rover has passed a series of other interesting terrains where we find decreases in the dose rate reaching 19%."
  - "we found a decrease of about 4%–7% for Tower Buttes (Figure 4a), ∼7% for Bloodstone Hill (Figure 4b), 2%–4% for Mt Mercou (Figure 4c), 19% for Maria Gordon Notch (Figure 4d) and ∼10% for Paraitepuy (Figure 4e)."
  - "Between sol 3324.6 and sol 3326.6 (P6), the rover parked in a very narrow valley near a cliff. ... Compared to BG6, we find a dose rate drop of 19% in P6"
  - "We finally estimate that on a flat surface the albedo radiation is between ∼18% and 24% of the total surface dose."
  - Why low horizons matter: "protons arriving at θ ∼ 80° make the greatest contribution to the surface dose per degree of zenith angle while for helium ions this peak is around 55°."
  - Albedo offsets part of the gain at Murray Buttes: Guo et al. (2021) "derived a ∼12% reduction in the dose from downward directed particles due to obstruction, higher than the observed decrease of 5%."
  - Table 1 background dose rates (RAD E detector, plastic) at these sites ranged "215.5" to "323.5" μGy/d (2020 to 2022).

No RAD shielding result specific to the boxwork region was found.

---

## UNVERIFIED or not found (do not show in the app)
- **DONKI SEP notification latency** (search snippet said notifications came ~8 to 12 min after GOES threshold crossings). DONKI servers refused connections and the api.nasa.gov DEMO_KEY was rate-limited. Not opened.
- **Posner method warning times of 7 to 74 minutes** for 2003 events: press account only, not the paper. UNVERIFIED.
- **Separate "maximum sustained" vs "maximum short" suited slope**: not found in EVA-EXP-0075, NASA-STD-3001 Vol 2 Rev F, or Mars DRA 5.0. Constellation EVA slope requirements and HIDH slope text were not located or opened.
- **NASA/TP-2009-214796** (final 10-km walkback report) and the Mars-gravity walkback data: not opened. Mars-gravity walkback numbers above come only from the ICES-2026-127 slides.
- **Norcross IST-2 regression coefficients**: withheld by the authors (quote in section 1).
- **Guo et al. 2021 A&ARv review** (long-term RAD averages through 2020): Springer blocked download. Not opened.
- **Márquez & Cummings 2008 (J. Aerosp. Comput. Inf. Commun.)** original speed model paper: not opened. The speed table is taken from Johnson 2010, which reproduces it.
- **Mars gravity value**: the challenge uses 3.71 m/s². NASA's fact sheet (https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html) lists "Surface gravity (mean) (m/s2)" 3.73 and "Surface acceleration (eq) (m/s2)" 3.69. BVAD uses 3.740. The spread is under 1.5%.
- Dose increase per km of elevation along the Mount Sharp route: Hassler 2018 cites Guo et al. 2015b Eq. 6, not opened.
