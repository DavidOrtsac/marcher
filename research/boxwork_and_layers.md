# Boxwork targets and orbital layers: Curiosity, Mount Sharp, Gale crater

Research date: 2026-11-14. Map box: Mars 2000 sphere equirectangular (R = 3396190 m, center lon 0), x 8142400 to 8145600 m, y -286800 to -283600 m (about 137.3666 to 137.4206 E, -4.8385 to -4.7845). Per `msl_wp.json` the rover has been inside this box continuously from sol 4435 to sol 5073 (traverse extent E 8143106 to 8144075 m, N -286061 to -283627 m). Every row below cites a page I opened. Positions come from `msl_wp.json` (rule: last waypoint at or before the sol).

Files in this folder:
- `boxwork_targets.json`: the curated list below (66 entries: 8 drill sites, 52 targets and features, 6 remote landmarks), with both rover positions (see note) and every source URL.
- `blog_named_targets_all.json`: all 472 quoted target names in the 119 Curiosity blog posts for sols 4500 to 5069, each with the sentence that first names it, every post that mentions it, and rover positions. Pulled through the science.nasa.gov WordPress REST API (`/wp-json/wp/v2/posts?search=Sols&after=2025-04-01`). Blog coverage has no gaps except solar conjunction (sols 4763 to 4787).
- `crism_products.json`, `orbital_layers.json`: Part B lists.

Position caveat: a waypoint is the rover's reference point. Arm targets and drill holes sit about 1 to 2 m in front of it, and remote targets (buttes, distant ridges) are far away, so for those the position is only the viewpoint. Within a plan the drive usually comes after the targeted science, so workspace targets for a post covering sols A to B usually sit at the parking spot *before* sol A. The JSON stores that too, as `rover_start_of_plan`.

## Part A1. Drill samples (boxwork campaign and after)

Unless the row says otherwise, "Sol" is the sol the blog's image caption ties to the drill or the new hole.

| Drill target | Sol (UTC date) | Hole # | Setting | WP sol | Lat | Lon E | Easting m | Northing m | Elev m | Sources |
|---|---|---|---|---|---|---|---|---|---|---|
| Altadena | 4564 (2025-06-08), drilled the 2nd sol of the 4563-4565 plan | 43 | Edge of the boxwork unit (JPL calls it the "transitional area" sample). CheMin found phyllosilicates "largely absent from the surrounding" Layered Sulfate unit | 4560 | -4.79985 | 137.38354 | 8143367.9 | -284509.5 | -3647.2 | [4561-4562](https://science.nasa.gov/blog/sols-4561-4562-prepping-to-drill-at-altadena/), [4566-4567](https://science.nasa.gov/blog/sol-4564-front-hazard-avoidance-camera-front-hazcam/), [4568-4569](https://science.nasa.gov/blog/curiosity-blog-sols-4568-4569-a-close-look-at-the-altadena-drill-hole-and-tailings/), [GSA 2025](https://gsameetings.secure-platform.com/connects25/solicitations/103002/sessiongallery/schedule/items/95386/application/10634) |
| Valle de la Luna | 4693 (2025-10-19), Hazcam "caught in the act" plus Mastcam hole image | 44 | Bedrock block in the "Monte Grande" hollow. Hollow sample: carbonate (JPL), siderite (Seeger et al. 2026) | 4687 | -4.80784 | 137.38104 | 8143219.3 | -284983.2 | -3610.4 | [4689-4694](https://science.nasa.gov/blog/curiosity-blog-sols-4689-4694-drill-in-the-boxwork-unit-is-go/), [4695-4701](https://science.nasa.gov/blog/curiosity-blog-sols-4695-4701-searching-for-answers-at-monte-grande/), [4702-4708](https://science.nasa.gov/blog/curiosity-blog-sols-4702-4708-its-only-spooky-here-on-earth-today/) |
| Nevado Sajama | 4718 (2025-11-13): "The drill activity itself completed on Sol 4718" | 45 | Ridge top about 10 m from Valle de la Luna. Ridge sample: clay minerals. A 1.5-gigapixel 360 deg Mastcam panorama was shot here, sols 4714 to 4741 | 4711 | -4.80801 | 137.38100 | 8143217.5 | -284993.2 | -3607.7 | [4709-4715](https://science.nasa.gov/blog/curiosity-blog-sols-4709-4715-drilling-high-and-low-in-the-boxwork-unit/), [4716-4722](https://science.nasa.gov/blog/curiosity-blog-sols-4716-4722-drilling-success-at-nevado-sajama/), [PIA26696](https://www.jpl.nasa.gov/images/pia26696-curiosity-captures-a-360-degree-view-at-nevado-sajama/) |
| Nevado Sajama2 (also written "Nevado Sajama 2") | Drilled the weekend after the Jan 30 2026 plan. Both holes appear side by side on sol 4795 (2026-01-31) | not stated (Campo Marte is later called the "47th successful drill") | A few cm from Nevado Sajama. The 4th boxwork sample, used for SAM's last TMAH wet-chemistry cup (organics) | 4789 | -4.80801 | 137.38099 | 8143216.8 | -284993.1 | -3608.0 | [4788-4797](https://science.nasa.gov/blog/curiosity-blog-sols-4788-4797-welcome-back-from-conjunction/), [4798-4803](https://science.nasa.gov/blog/curiosity-blog-sols-4798-4803-back-for-more-science/), [JPL Feb 2026](https://www.jpl.nasa.gov/news/nasas-curiosity-rover-sees-martian-spiderwebs-up-close/) |
| Atacama | Drill planned for sols 4876-4878 (Apr 2026). Bit freed in the sol 4883-4885 plan | none (attempt) | First layered-sulfate drill above the boxwork. The hole was made, but the detached block came up with the bit. Tailings lost | 4868 | -4.81427 | 137.38171 | 8143259.1 | -285364.2 | -3570.5 | [4867-4872](https://science.nasa.gov/blog/curiosity-blog-sols-4867-4872-sand-fill-in-antofagasta-crater-and-finding-our-next-drill-target/), [4873-4878](https://science.nasa.gov/blog/curiosity-blog-sols-4873-4878-welcome-to-the-atacama-drill-target/), [4879-4885](https://science.nasa.gov/blog/curiosity-blog-sols-4879-4885-struggle-at-atacama/) |
| Campo Marte | First color image of the hole on sol 4897 (2026-05-16) | 47 ("successful") | Same stratum as Atacama. Drilled 28 mm deep (usually 35 mm) | 4893 | -4.81440 | 137.38158 | 8143251.7 | -285371.9 | -3569.6 | [4893-4899](https://science.nasa.gov/blog/curiosity-blog-sols-4893-4899-drilling-at-campo-marte-and-a-visit-from-the-psyche-spacecraft/), [4900-4907](https://science.nasa.gov/blog/curiosity-blog-sols-4900-4907-pasadena-we-have-a-drill-sample/), [4908-4912](https://science.nasa.gov/blog/curiosity-blog-sols-4908-4912-goodbye-campo-marte-its-been-fun/) |
| Basque Lakes | MAHLI after the preload test on sol 5023. Navcam shows the hole on sol 5024 (2026-09-24) | 48 | Cache Creek quad. The first drill above the "erosional supersurface" | 5021 | -4.82514 | 137.38885 | 8143682.4 | -286008.7 | -3479.9 | [5016-5021](https://science.nasa.gov/blog/curiosity-blog-sols-5016-5021-fantastic-minerals-and-how-to-detect-them/), [5022-5028](https://science.nasa.gov/blog/curiosity-blog-sols-5022-5028-cashing-in-at-cache-creek/), [5029-5035](https://science.nasa.gov/blog/curiosity-blog-sols-5029-5035-back-in-the-lab/) |
| Nazca | Mastcam image of the hole on sol 5050 (2026-10-20) | 49 | Block "jam-packed" with disc- and needle-shaped potential crystal forms, next to "Chiu Chiu". The rover drove away in the sol 5063-5069 week | 5045 | -4.82466 | 137.38761 | 8143609.3 | -285980.5 | -3488.0 | [5043-5049](https://science.nasa.gov/blog/curiosity-blog-sols-5043-5049-preparing-to-drill-at-nazca/), [5050-5055](https://science.nasa.gov/blog/curiosity-blog-sols-5050-5055-its-nazca-our-49th-drill-hole/), [5063-5069](https://science.nasa.gov/blog/curiosity-blog-sols-5063-5069-rocks-and-chips/) |

Campaign phases, from Fraeman ([blog 4804-4811](https://science.nasa.gov/blog/curiosity-blog-sols-4804-4811-kicking-off-the-final-phase-of-boxwork-exploration/)):
- Phase 1, first approach: sols 4534-4570.
- Phase 2, regional context, including Volcán Peña Blanca: sols 4571-4599.
- Phase 3, best-expressed ridges and hollows, including the two drills: sols 4600-4805.
- Phase 4, final look at the east and south contacts: sol 4805 onward. The rover left the boxwork when "last weekend's drive took us just over the southernmost contact" into the layered sulfate unit ([blog 4845-4851](https://science.nasa.gov/blog/curiosity-blog-sols-4845-4851-bye-bye-boxwork-bye-bye/)). That is the weekend plan for sols 4842-4844 (Mar 20 2026 planning), which ends at waypoint sol 4844, E 8143257.3 m, N -285143.1 m.

## Part A1 (cont.). Named targets and features

Accents are dropped in names. "Sol" is the post's sol range unless a caption gives an exact sol. Sources are the first link. The other links for each row are in `boxwork_targets.json`.

| Name | Sol (date) | What it is | WP sol | Lat | Lon E | Easting m | Northing m | Source |
|---|---|---|---|---|---|---|---|---|
| Boxwork unit contact (first crossing) | 4534 (2025-05-07) | geologic contact, Layered Sulfate unit to boxwork interval | 4534 | -4.79762 | 137.38644 | 8143539.4 | -284377.3 | [link](https://gsameetings.secure-platform.com/connects25/solicitations/103002/sessiongallery/schedule/items/95386/application/10634) |
| Glendale Peak | 4541-4542 | rugged top of a ridge defining a potential boxwork structure | 4541 | -4.79782 | 137.38593 | 8143509.2 | -284389.1 | [link](https://science.nasa.gov/blog/sols-4541-4542-boxwork-structure-or-just-box-like-structure/) |
| Sisquoc River / Palo Verde Mountains | 4553 | resistant ridge-like features in the boxwork workspace | 4552 | -4.79927 | 137.38357 | 8143369.7 | -284475.3 | [link](https://science.nasa.gov/blog/sol-4553-back-to-the-boxwork/) |
| Camp Williams | 4561-4562 | sandy patches used as wind change-detection targets at the Altadena drill site | 4560 | -4.79985 | 137.38354 | 8143367.9 | -284509.5 | [link](https://science.nasa.gov/blog/sols-4561-4562-prepping-to-drill-at-altadena/) |
| Los Patos | 4573-4574 | depression, maybe a small impact crater or boxwork structure | 4573 | -4.80116 | 137.38252 | 8143307.1 | -284587.5 | [link](https://science.nasa.gov/blog/curiosity-blog-sols-4573-4574-welcome-to-the-uyuni-quad/) |
| Laguna del Bayo | 4575-4576 | potential fracture fill in front of the parking spot | 4575 | -4.80191 | 137.38211 | 8143283.2 | -284631.7 | [link](https://science.nasa.gov/blog/curiosity-blog-sols-4575-4576-perfect-parking-spot/) |
| Copacabana / Ardamarca | 4577-4579 | trough-floor bedrock (Copacabana) and a ridge parallel to the trough walls (Ardamarca) | 4575 | -4.80191 | 137.38211 | 8143283.2 | -284631.7 | [link](https://science.nasa.gov/blog/curiosity-blog-sols-4577-4579-watch-the-skies/) |
| Volcan Pena Blanca | 4593 | prominent raised ridge with side + top view, at least three layers | 4591 | -4.80251 | 137.38045 | 8143184.6 | -284667.3 | [link](https://science.nasa.gov/blog/curiosity-blog-sols-4593-4594-three-layers-and-a-lot-of-structure-at-volcan-pena-blanca/) |
| Ouro | 4595-4596 | displaced block near a circular depression (possible small crater) | 4594 | -4.80296 | 137.38043 | 8143183.5 | -284694.2 | [link](https://science.nasa.gov/blog/curiosity-blog-sols-4595-4596-just-another-beautiful-day-on-mars/) |
| Meson | 4602-4603 | ridge driven onto (15 m drive) | 4602 | -4.80437 | 137.37962 | 8143135.6 | -284777.4 | [link](https://science.nasa.gov/blog/curiosity-blog-sols-4602-4603-on-top-of-the-ridge/) |
| Totoral / Sillar | 4604-4606 | ridge-top parking chosen to compare ridge chemistry and texture with topographic lows | 4602 | -4.80437 | 137.37962 | 8143135.6 | -284777.4 | [link](https://science.nasa.gov/blog/curiosity-blog-sols-4604-4606-taking-a-deep-breath-of-martian-air/) |
| Lake Titicaca | 4607-4608 | nodular rock pillar | 4605 | -4.80443 | 137.37956 | 8143131.7 | -284781.3 | [link](https://science.nasa.gov/blog/curiosity-blog-sols-4607-4608-deep-dip/) |
| Punta de Lobos | 4609-4610 | rock with dendritic-looking texture | 4609 | -4.80474 | 137.37932 | 8143117.7 | -284799.5 | [link](https://science.nasa.gov/blog/curiosity-blog-sols-4609-4610-recharged-and-ready-to-roll-onwards/) |
| Arequipa Airport | 4611-4613 | ridge the rover drove on; strata exposed underneath | 4609 | -4.80474 | 137.37932 | 8143117.7 | -284799.5 | [link](https://science.nasa.gov/blog/curiosity-blog-sols-4611-4613-scenic-overlook/) |
| Canon de Palca | 4614-4615 | bedrock next to a large fracture in the workspace | 4614 | -4.80521 | 137.37945 | 8143125.2 | -284827.1 | [link](https://science.nasa.gov/blog/curiosity-blog-sols-4614-4615-driving-along-the-boxwork/) |
| El Salto | 4616-4617 | target on the central line running along the big ridge (central fracture) | 4616 | -4.80545 | 137.37952 | 8143129.8 | -284841.8 | [link](https://science.nasa.gov/blog/curiosity-blog-sols-4616-4617-standing-tall-on-the-ridge/) |
| Llullaillaco | 4616-4617 | small mound with veins and the hollow around it | 4616 | -4.80545 | 137.37952 | 8143129.8 | -284841.8 | [link](https://science.nasa.gov/blog/curiosity-blog-sols-4616-4617-standing-tall-on-the-ridge/) |
| Salar de Agua Amara | 4618-4619 | delicate branching structures 'likely made by groundwater' | 4618 | -4.80550 | 137.37954 | 8143130.4 | -284844.3 | [link](https://science.nasa.gov/blog/curiosity-blog-sols-4618-4619-the-boxwork-structures-continue-to-call-to-us/) |
| Airport Domes | 4618-4619 | a hollow in the boxworks | 4618 | -4.80550 | 137.37954 | 8143130.4 | -284844.3 | [link](https://science.nasa.gov/blog/curiosity-blog-sols-4618-4619-the-boxwork-structures-continue-to-call-to-us/) |
| Pular / Socompa | 4620-4621 | resistant veins (filled fractures) | 4618 | -4.80550 | 137.37954 | 8143130.4 | -284844.3 | [link](https://science.nasa.gov/blog/curiosity-blog-sols-4620-4621-among-the-hollows-and-the-ridges/) |
| Lago Poopo / Vicguna | 4622-4623 | bright clean vein network (Lago Poopo); protruding vein edge with nodular texture (Vicguna) | 4621 | -4.80541 | 137.37951 | 8143129.1 | -284839.5 | [link](https://science.nasa.gov/blog/curiosity-blog-sols-4622-4623-kicking-off-earth-year-14-with-an-investigation-of-veins/) |
| Ayopaya | 4624-4626 | intersecting 'peace-sign-shaped' ridges | 4623 | -4.80548 | 137.37992 | 8143153.0 | -284843.6 | [link](https://science.nasa.gov/blog/curiosity-blog-sols-4624-4626-a-busy-weekend-at-the-boxwork/) |
| Laguna Miniques | 4627-4628 | potential incipient hollow | 4625 | -4.80586 | 137.37976 | 8143143.6 | -284865.8 | [link](https://science.nasa.gov/blog/curiosity-blog-sols-4627-4628-a-ridge-stop-in-the-boxworks/) |
| Asiruqucha | 4629-4630 | light-toned, small-scale nodular bedrock | 4629 | -4.80617 | 137.37972 | 8143141.5 | -284884.1 | [link](https://science.nasa.gov/blog/curiosity-blog-sols-4629-4630-feeling-hollow/) |
| Rio Frio | 4634-4635 | prominent resistant ridge (wall imaged before arrival) | 4634 | -4.80636 | 137.37912 | 8143105.6 | -284895.3 | [link](https://science.nasa.gov/blog/curiosity-blog-sols-4634-4635-a-waiting-game/) |
| Minimini / El Tapado | 4636 (2025-08-21) | nodule-filled target (APXS) and a vein (LIBS) at the Rio Frio ridge wall | 4636 | -4.80654 | 137.37934 | 8143118.7 | -284906.1 | [link](https://science.nasa.gov/blog/curiosity-blog-sols-4636-4637-up-against-a-wall/) |
| Samaipata / Wallatiri / Mojo | 4638-4640 | boxwork structures around the rover; Mojo = hollow | 4636 | -4.80654 | 137.37934 | 8143118.7 | -284906.1 | [link](https://science.nasa.gov/blog/curiosity-blog-sols-4638-4640-imaging-extravaganza-atop-a-ridge/) |
| Tarapaca | 4641-4648 | regolith target inside a hollow (no bedrock in workspace) | 4641 | -4.80669 | 137.37935 | 8143119.6 | -284915.1 | [link](https://science.nasa.gov/blog/curiosity-blog-sols-4641-4648-thinking-outside-and-inside-the-boxwork/) |
| Laguna Colorada / Jorginho Cove | 4641-4648 | ridge/hollow pair; ridge the rover was parked on plus next hollow south | 4641 | -4.80669 | 137.37935 | 8143119.6 | -284915.1 | [link](https://science.nasa.gov/blog/curiosity-blog-sols-4641-4648-thinking-outside-and-inside-the-boxwork/) |
| Ridge-to-hollow nodular transition | 4650 (2025-09-05) | smooth ridge bedrock grading to nodular bedrock at a shallow hollow edge (unnamed) | 4650 | -4.80689 | 137.37984 | 8143148.6 | -284927.1 | [link](https://science.nasa.gov/blog/curiosity-blog-sols-4649-4654-ridges-hollows-and-nodules-oh-my/) |
| Quechua / Chaco | 4655-4660 | bedrock ridge (Quechua) and a raised resistant bedrock feature (Chaco) | 4655 | -4.80717 | 137.37990 | 8143151.8 | -284943.4 | [link](https://science.nasa.gov/blog/curiosity-blog-sols-4655-4660-boxworks-with-a-view/) |
| Boxwork panorama (PIA26693) | 4671 (2025-09-26) | 179-image Mastcam panorama of ridges and hollows | 4671 | -4.80827 | 137.38127 | 8143233.2 | -285008.8 | [link](https://www.jpl.nasa.gov/images/pia26693-curiosity-surveys-the-boxwork-region/) |
| Autobahn | 4661-4667 | one of the bigger ridges | 4660 | -4.80745 | 137.38006 | 8143161.5 | -284960.3 | [link](https://science.nasa.gov/blog/curiosity-blog-sols-4661-4667-peaking-into-the-hollows/) |
| Laguna Escondida / Laguna Socompa | 4668-4674 | two hollows on either side of the ridge | 4667 | -4.80802 | 137.38051 | 8143188.0 | -284994.1 | [link](https://science.nasa.gov/blog/curiosity-blog-sols-4668-4674-winding-our-way-along/) |
| Monte Grande | 4675-4681 | large hollow; site of the Valle de la Luna drill and later polygon block | 4673 | -4.80872 | 137.38157 | 8143251.0 | -285035.2 | [link](https://science.nasa.gov/blog/curiosity-blog-sols-4675-4681-deciding-where-to-dig-into-the-boxworks/) |
| Pachica | 4702-4708 | block with many nodules | 4687 | -4.80784 | 137.38104 | 8143219.3 | -284983.2 | [link](https://science.nasa.gov/blog/curiosity-blog-sols-4702-4708-its-only-spooky-here-on-earth-today/) |
| Arenas Blancas / Camarones / Exaltacion | 4716-4722 | veins on the ridge near Nevado Sajama | 4711 | -4.80801 | 137.38100 | 8143217.5 | -284993.2 | [link](https://science.nasa.gov/blog/curiosity-blog-sols-4716-4722-drilling-success-at-nevado-sajama/) |
| Monte Grande polygon block | 4743-4749 | polygon-covered, rubbly block on the hollow floor next to Valle de la Luna | 4741 | -4.80776 | 137.38101 | 8143218.0 | -284978.7 | [link](https://science.nasa.gov/blog/curiosity-blog-sols-4743-4749-polygons-in-the-hollow/) |
| Altiplano | 4750-4762 | ridge with a central fracture; ridge-wall transect between the two drill holes | 4748 | -4.80791 | 137.38112 | 8143224.3 | -284987.3 | [link](https://science.nasa.gov/blog/curiosity-blog-sols-4750-4762-see-you-on-the-other-side-of-the-sun/) |
| Tiquipaya | 4798-4803 | rock broken by the wheels, exposing bright white material | 4789 | -4.80801 | 137.38099 | 8143216.8 | -284993.1 | [link](https://science.nasa.gov/blog/curiosity-blog-sols-4798-4803-back-for-more-science/) |
| Los Flamencos | 4804-4811 | narrow ridge with many small branching ridges (and a hollow with interesting floor bedrock seen from orbit) | 4789 | -4.80801 | 137.38099 | 8143216.8 | -284993.1 | [link](https://science.nasa.gov/blog/curiosity-blog-sols-4804-4811-kicking-off-the-final-phase-of-boxwork-exploration/) |
| Tapiche | 4812-4817 | hollow where the rover parked | 4810 | -4.80754 | 137.38150 | 8143247.1 | -284965.4 | [link](https://science.nasa.gov/blog/curiosity-blog-sols-4812-4817-back-into-the-hollows/) |
| Infiernillo / Humahuaca | 4825-4831 | bedrock at the eastern extent of the boxwork unit; nodule-rich bedrock | 4823 | -4.80788 | 137.38263 | 8143313.7 | -284985.8 | [link](https://science.nasa.gov/blog/curiosity-blog-sols-4825-4831-exploring-the-borderlands/) |
| Timboy Chaco | 4827 (2026-03-05) | pitted vertical rock face | 4827 | -4.80813 | 137.38285 | 8143327.1 | -285000.6 | [link](https://science.nasa.gov/blog/curiosity-blog-sols-4825-4831-exploring-the-borderlands/) |
| Thola | 4825-4831 | dark float rock, possible stony meteorite | 4823 | -4.80788 | 137.38263 | 8143313.7 | -284985.8 | [link](https://science.nasa.gov/blog/curiosity-blog-sols-4825-4831-exploring-the-borderlands/) |
| El Misti / Yungas | 4832-4837 | southern contact between boxworks and layered sulfate unit (19x3 mosaic); highly veined area | 4830 | -4.80882 | 137.38265 | 8143315.1 | -285041.5 | [link](https://science.nasa.gov/blog/curiosity-blog-sols-4832-4837-driving-the-contact-line/) |
| Toro Wharku / Sierra Gorda / Santa Laura | 4838-4844 | last boxwork-unit workspaces: brushed bedrock, layered bedrock, dark ridge | 4837 | -4.80972 | 137.38236 | 8143297.7 | -285094.5 | [link](https://science.nasa.gov/blog/curiosity-blog-sols-4838-4844-wrapping-up-the-boxwork-terrain/) |
| Southern contact crossing / Santa Rosa | 4845 | layered sulfate unit bedrock just across the southernmost boxwork contact (third contact crossing) | 4845 | -4.81060 | 137.38165 | 8143255.5 | -285146.9 | [link](https://science.nasa.gov/blog/curiosity-blog-sols-4845-4851-bye-bye-boxwork-bye-bye/) |
| Antofagasta | 4859-4866 | small crater ~10 m across, possibly <50 Myr old | 4857 | -4.81317 | 137.38185 | 8143267.3 | -285299.1 | [link](https://science.nasa.gov/blog/curiosity-blog-sols-4859-4866-one-small-crater-and-thousands-of-polygons/) |
| Erosional supersurface | 4963 (2026-07-23) | possible regional erosional surface: light-toned rocks under dark rocks | 4963 | -4.82018 | 137.38540 | 8143478.3 | -285714.9 | [link](https://science.nasa.gov/blog/curiosity-blog-sols-4961-4967-approaching-a-break-in-the-rock-record/) |
| Chiu Chiu / Salar de Vacas | 5016-5021 | blocks full of disc-shaped lumps 3-4 mm across, ~1 mm thick | 5016 | -4.82460 | 137.38848 | 8143660.4 | -285976.9 | [link](https://science.nasa.gov/blog/curiosity-blog-sols-5016-5021-fantastic-minerals-and-how-to-detect-them/) |
| Toucan | 5043-5049 | crystal-form-rich target near Nazca | 5041 | -4.82459 | 137.38778 | 8143619.0 | -285975.9 | [link](https://science.nasa.gov/blog/curiosity-blog-sols-5043-5049-preparing-to-drill-at-nazca/) |
| Mishe Mokwa | 4500-4501 | butte (remote; imaged throughout the campaign) [remote, viewpoint only] | 4500 | -4.79357 | 137.38958 | 8143725.8 | -284137.3 | [link](https://science.nasa.gov/blog/sols-4500-4501-bedrock-with-a-side-of-sand/) |
| Texoli | 4502-4504 | butte (remote) [remote, viewpoint only] | 4500 | -4.79357 | 137.38958 | 8143725.8 | -284137.3 | [link](https://science.nasa.gov/blog/sols-4502-4504-sneaking-past-devils-gate/) |
| Paniri | 4595-4596 | butte (remote); also an incision filled with another material [remote, viewpoint only] | 4594 | -4.80296 | 137.38043 | 8143183.5 | -284694.2 | [link](https://science.nasa.gov/blog/curiosity-blog-sols-4595-4596-just-another-beautiful-day-on-mars/) |
| Valle Grande | 4804-4811 | named valley the rover climbs after the boxwork (region) [remote, viewpoint only] | 4789 | -4.80801 | 137.38099 | 8143216.8 | -284993.1 | [link](https://science.nasa.gov/blog/curiosity-blog-sols-4804-4811-kicking-off-the-final-phase-of-boxwork-exploration/) |
| Kimsa Chata | 4873-4878 | butte (remote) [remote, viewpoint only] | 4868 | -4.81427 | 137.38171 | 8143259.1 | -285364.2 | [link](https://science.nasa.gov/blog/curiosity-blog-sols-4873-4878-welcome-to-the-atacama-drill-target/) |
| Cordillera | 4934-4940 | mesa (remote) [remote, viewpoint only] | 4932 | -4.81792 | 137.38310 | 8143341.7 | -285580.6 | [link](https://science.nasa.gov/blog/curiosity-blog-sols-4934-4940-in-the-land-of-the-polygons/) |

## Part A2. Boxwork science questions an EVA would try to answer

1. **What cements the ridges, and why only here?** The orbital hypothesis (Siebach & Grotzinger 2014) is cementation in the "subsurface phreatic groundwater zone." The cement needed "a minimum of 0.43 km^3 of water," and the groundwater stood at the "−3620 m level, 1050 m above the current floor of Gale Crater" ([JGR Planets 119:189, doi 10.1002/2013JE004508](https://authors.library.caltech.edu/46110)). Vasavada: "A big mystery is why the ridges were hardened into these big patterns and why only here" ([JPL, Jun 23 2025](https://www.jpl.nasa.gov/news/nasas-curiosity-mars-rover-starts-unpacking-boxwork-formations/)). For comparison, `msl_wp.json` elev_geoid runs from -3658 to -3590 m between sols 4534 and 4848.
2. **Ridge vs hollow mineralogy, not chemistry.** "The X-ray analyses found clay minerals in the ridge and carbonate minerals in the hollow" ([JPL, Feb 23 2026](https://www.jpl.nasa.gov/news/nasas-curiosity-rover-sees-martian-spiderwebs-up-close/)). Seeger et al. 2026 add that "chemical differences are not observed between ridges and hollows." They add: "ridges are phyllosilicate-rich, whereas hollows contain siderite". The ~5 mm nodules increase "in abundance towards ridge walls and down into hollows" ([SEPM Misc. Pub. 26, doi 10.2110/sepmmisc.26.066](https://authors.library.caltech.edu/records/6522c-90325)). An EVA could sample continuously from the ridge centerline, down the wall, to the hollow floor. The rover only managed point samples plus one wall transect ("Altiplano", sols 4750-4762).
3. **Fracture-fed fluid halos.** Siebach et al. (GSA 2025) propose the sequence deposition, lithification, fracturing, then fluid flow "under sufficient pressure to cause the fluid to percolate into ~2-3 meters of rock on either side, creating a cementation or alteration zone around the fracture," and finally "preferential eolian erosion of weaker zones." Ridges "extend up to ~5 meters across," with "10-20-meter diameter hollows between ridges that are often filled with sediment," and "dark lines can be seen in the centers of the resistant ridges" ([abstract, doi 10.1130/abs/2025AM-10634](https://gsameetings.secure-platform.com/connects25/solicitations/103002/sessiongallery/schedule/items/95386/application/10634)). Curiosity confirmed that "these lines are in fact fractures" (JPL Feb 2026). Open question: how wide is the halo, and how sharp is its edge?
4. **Why are the nodules in the wrong place?** "Unexpectedly, these nodules were not found near the central fractures," but "along a ridge's walls and the hollows between them." Seeger: "We can't quite explain yet why the nodules appear where they do... Maybe the ridges were cemented by minerals first, and later episodes of groundwater left nodules around them" (JPL Feb 2026). [PIA26697](https://www.jpl.nasa.gov/images/pia26697-curiosity-studies-nodules-on-boxwork-formations/) shows the MAHLI nodule image from sol 4636.
5. **How high was the water table, and how long did it last?** Seeger: "Seeing boxwork this far up the mountain suggests the groundwater table had to be pretty high... the water needed for sustaining life could have lasted much longer than we thought looking from orbit" (JPL Feb 2026).
6. **Which fluids made the ridges hard?** ChemCam shot bright white and gray vein material on broken bedrock faces at the Nevado Sajama ridge (Arenas Blancas, Camarones, Exaltacion). These targets "will provide more insight into the fluids that penetrated the boxwork ridges, perhaps contributing to their erosion resistance" ([blog 4716-4722](https://science.nasa.gov/blog/curiosity-blog-sols-4716-4722-drilling-success-at-nevado-sajama/)). DAN measured hydrogen "to see how it varies between ridges and hollows" ([blog 4675-4681](https://science.nasa.gov/blog/curiosity-blog-sols-4675-4681-deciding-where-to-dig-into-the-boxworks/)).
7. **What was the host rock?** The hollow drill was meant to sample "bedrock unaffected by the ridge-strengthening event" (GSA 2025). The lower boxwork ridges were found "heavily fractured and shallow, without significant chemical differences" (GSA 2025). The boxwork host is "probably of lacustrine origin," with nearby fluvial and deltaic clinoforms ([EGU26-5639, Caravaca et al.](https://meetingorganizer.copernicus.org/EGU26/EGU26-5639.html)).


## Part B. Orbital layers over the map box (items 1 to 3)

Box: x 8142400 to 8145600 m, y -286800 to -283600 m (Mars 2000 sphere, R 3396190 m, equirectangular, center lon 0), about 137.3666 to 137.4206 E, -4.8385 to -4.7845. Every URL below was checked on 2026-11-14 with `curl -sI` (HTTP status, Content-Length). Machine-readable versions: `orbital_layers.json`, `crism_products.json`, `themis_ti_box_100m.json` (all in this folder).

### B1. Thermal inertia (Mars Odyssey THEMIS)

**Best product: USGS "THEMIS Thermal Inertia Mosaic Quantitative 30S120E 100mpp"** (R. Fergason, USGS Astrogeology / ASU, published 2014-05-30). The tile covers 0 to 30 S, 120 to 180 E, so it contains the whole box.

| File | URL | HTTP | Bytes |
|---|---|---|---|
| ISIS3 cube, 32-bit float | https://asc-astropedia.s3.us-west-2.amazonaws.com/Mars/Odyssey/THEMIS-Global-Thermal-Inertia-Mosaic/Quantitative-32-Bit/THEMIS_TI_Mosaic_Quant_30S120E_100mpp.cub | 200 | 2,532,510,196 |
| GeoTIFF, 32-bit | https://asc-astropedia.s3.us-west-2.amazonaws.com/Mars/Odyssey/THEMIS-Global-Thermal-Inertia-Mosaic/Quantitative-32-Bit/ancillary/THEMIS_TI_Mosaic_Quant_30S120E_100mpp.tif | 200 | 2,613,997,398 |
| World file (.tfw) | https://astrogeology.usgs.gov/ckan/dataset/4675b8b1-1bbc-4c49-9764-3b06af465d6e/resource/2c858bf0-1e0b-4620-8401-6786d29d7e1a/download/themis_ti_mosaic_quant_30s120e_100mpp.tfw | 200 | 91 |
| Product page | https://astrogeology.usgs.gov/search/map/themis_thermal_inertia_mosaic_quantitative_30s120e_100mpp | 200 | |

- **Units:** J m^-2 K^-1 s^-1/2. The absolute accuracy is about 20% (product page).
- **Projection** (from the cube label): ISIS3 SimpleCylindrical, CenterLongitude 0, EquatorialRadius 3396190 m, planetocentric, positive east, 100 m/px, UpperLeftCorner (7112900, 0) m, 35565 x 17782 px. The scale of 592.74697523306 px/deg equals R x pi/180/100, so x = R x lon and y = R x lat. **This is the same grid as the map, and the box edges fall exactly on pixel edges.**
- **Extracted for the box:** the cube is stored in 128 x 128 tiles, and the whole box (columns 10295 to 10327, rows 2836 to 2868) sits in one tile (tile row 22, tile column 80), so a single 64 KB HTTP range read pulls it. The 32 x 32 grid is saved in `themis_ti_box_100m.json`. Values: n = 1024, no nulls, min 255.9, max 450.5, mean 369.5, median 372.6. The 4 x 4 block means change smoothly across the box, which shows the decode is correct.
- An 8-bit qualitative version of the same tile exists (display stretch only): the cube https://asc-astropedia.s3.us-west-2.amazonaws.com/Mars/Odyssey/THEMIS-Global-Thermal-Inertia-Mosaic/Qualitative-8-Bit/THEMIS_TI_Mosaic_Qual_30S120E_100mpp.cub (200, 632,821,977 B) and the GeoTIFF .../Qualitative-8-Bit/ancillary/THEMIS_TI_Mosaic_Qual_30S120E_100mpp.tif (200, 655,055,381 B). Product page: https://astrogeology.usgs.gov/search/map/themis_thermal_inertia_mosaic_qualitative_30s120e_100_mpp

**Gale-specific map (MSL landing-site work):** ASU's THEMIS page for MSL site 42 (Gale), https://themis.asu.edu/landingsites/mslsite_42, contact R. L. Fergason. It offers only a **qualitative 8-bit** thermal inertia map. The `quantTI/` directory was empty on 2026-11-14.

| File | URL | HTTP | Bytes |
|---|---|---|---|
| GeoTIFF, 1779 x 1779 px, 100 m | http://static.mars.asu.edu/themis/landingsites/msl42/qualTI/Gale_crater_THEMIS_qualTI.tif | 200 | 3,170,896 |
| World file | http://static.mars.asu.edu/themis/landingsites/msl42/qualTI/Gale_crater_THEMIS_qualTI.wld | 200 | 96 |
| ISIS cube | http://static.mars.asu.edu/themis/landingsites/msl42/qualTI/Gale_crater_THEMIS_qualTI_ISIS.cub | 200 | 3,196,073 |
| Scale bar (50 to 520 J m^-2 K^-1 s^-1/2) | http://static.mars.asu.edu/themis/landingsites/msl42/qualTI/Gale_crater_THEMIS_TI_scalebar.png | 200 | 8,463 |

- **Projection** (from the aux.xml): Mars2000 sphere, Equidistant Cylindrical, **Central_Meridian 180**. To put it on the map grid, use x_map = x_file + pi x 3396190 (+10,669,347.5 m). y is unchanged.
- **Use the USGS quantitative tile for numbers.** The ASU map is a picture with a scale bar.

Published thermal inertia values in or near this terrain:
- Fergason et al. 2012 (Space Sci. Rev. 170, 739-773, doi:10.1007/s11214-012-9891-3) report Gale at 250 to 410 J m^-2 K^-1 s^-1/2 and layered thermal inertia in the mound.
- Fraeman et al. 2016 report 355 ± 38 for the layered sulfate unit, 460 ± 43 for HTI1 and 422 ± 47 for HTI2. They built their own thermal inertia from THEMIS image I17950012 at 100 m with per-pixel KRC inputs. I found no download of that derived map.

### B2. MRO CRISM targeted observations over the box (PDS Geosciences ODE REST)

- **Queries:** `https://oderest.rsl.wustl.edu/live2/?query=product&results=pmf&output=JSON&target=mars&ihid=MRO&iid=CRISM&pt=MTRDR&westernlon=137.366&easternlon=137.421&minlat=-4.839&maxlat=-4.784` returned 5 MTRDRs. The same query with `pt=TRDR` returned 636 TRDR files. Among them are 26 targeted observations (20 FRT, 3 HRL, 3 ATO) that touch the box with at least one frame, plus multispectral survey strips.
- **Coverage:** I clipped each ODE footprint polygon against the box.
- **Map-projected products (MTRDR):** all are on volume MROCR_4001. Projection from the labels: EQUIRECTANGULAR, sphere 3396.19 km, CENTER_LONGITUDE 0, planetocentric, east-positive. **That is identical to the map projection.**

| Product (MTRDR) | Date (UTC) | Ls | m/px | Box covered | .pgw (A, D, B, E, C, F) |
|---|---|---|---|---|---|
| FRT000058A3_07_IF165J_MTR3 | 2007-04-22 | 223.9 | 18 | 100% | 18, 0, 0, -18, 8139856.9, -277780.17 |
| FRT0000B6F1_07_IF165J_MTR3 | 2008-07-09 | 96.3 | 18 | 100% | 18, 0, 0, -18, 8138487.6, -278204.96 |
| HRL0000BABA_07_IF182J_MTR3 | 2008-07-20 | 101.3 | 36 | 100% | 36, 0, 0, -36, 8138237.9, -272613.15 |
| FRT0001BBA1_07_IF165J_MTR3 | 2010-11-06 | 176.3 | 18 | 10.5% (west edge) | 18, 0, 0, -18, 8130183.7, -279599.98 |
| FRT0001CA91_07_IF165J_MTR3 | 2010-12-31 | 208.6 | 18 | 12.6% (west edge) | 18, 0, 0, -18, 8130318.5, -278985.40 |

Browse PNG URLs for the three full-coverage products. Every one returned 200, and each has a matching `.lbl` (PDS3), `.hdr` (ENVI) and `.img`. Swap the 3-letter code in the name for any other browse.

| Product | Browse PNGs: MAF, HYD, PHY, FAL, IRA (bytes) |
|---|---|
| FRT000058A3 | `https://pds-geosciences.wustl.edu/mro/mro-m-crism-5-rdr-mptargeted-v1/mrocr_4001/browse/2007/2007_112/frt000058a3/frt000058a3_07_br{maf,hyd,phy,fal,ira}j_mtr3.png` (329,446; 492,404; 338,715; 678,391; 398,250) |
| FRT0000B6F1 | `.../browse/2008/2008_191/frt0000b6f1/frt0000b6f1_07_br{maf,hyd,phy,fal,ira}j_mtr3.png` (420,932; 692,339; 429,854; 669,612; 395,965) |
| HRL0000BABA | `.../browse/2008/2008_202/hrl0000baba/hrl0000baba_07_br{maf,hyd,phy,fal,ira}j_mtr3.png` (229,429; 350,652; 244,967; 348,226; 213,697) |

- **Other browse codes in each MTRDR:** TRU, VNA, FEM, FM2, PFM, PAL, HYS, CAR, CR2, CHL, ICE, IC2 and TAN.
- **Summary-parameter cubes:** SU and SR are about 133 to 139 MB each for the FRTs and 67 MB for the HRL. The I/F cube (IF) is 0.55 to 1.13 GB. All of them returned 200. `crism_products.json` lists every URL with its byte size.
- **Georeferencing (verified):** in the ENVI `.hdr`, `map info = {MRO Mars Equirectangular [IAU 2000], 1.0, 1.0, x_UL, y_UL, 18, 18, ...}`, where x_UL, y_UL is the upper-left corner of the first pixel. For example, FRT000058A3 has 8139847.9, -277771.17.
  - The label MIN/MAX lat/lon are pixel centers: the longitude span equals (N-1) x 18 m.
  - The `.pgw` values in the table use the pixel-center convention, so they are the ENVI corner + half a pixel.
  - The PNG has the same dimensions as the IMG (I checked FRT000058A3 MAF: 788 x 735, RGBA, with alpha marking non-scene pixels).
  - None of these PNGs ships with a `.pgw` file. Write the six numbers above to a `.pgw` file, or read the IMG + HDR directly.
- **What the browse colors mean** (label text, after Viviano-Beck et al. 2014):
  - **MAF:** "Olivine and Fe- phyllosilicate ... may appear red ... Low- and high-Ca pyroxene ... green/cyan and blue/magenta".
  - **HYD:** "Polyhydrated sulfates ... may appear magenta ... Monohydrated sulfates ... yellow/green".
  - **PHY:** "Mg/Fe-OH bearing minerals may appear red ... Al/Si-OH bearing minerals may appear green".
  - **IRA:** "I/F variability at 1330 nm as a proxy for IR albedo".
- **Targeted observations without a covering MTRDR:** these exist only as sensor-space TRDR files, which need the matching DDR to geolocate. ODE's TRDR footprints overstate coverage for the 2011-2012 FRTs. I measured real coverage by range-downloading DDR bands 4-5 (latitude, longitude) and counting which of the box's 1024 100-m cells hold a CRISM pixel. As a control, FRT000058A3 scored 1.0.
  - **FRT000248E9 (2012-04-24, Ls 104), 100% coverage.** TRDR https://pds-geosciences.wustl.edu/mro/mro-m-crism-3-rdr-targeted-v1/mrocr_2106/trdr/2012/2012_115/frt000248e9/frt000248e9_07_if164l_trr3.img (200, 470,940,160 B). DDR https://pds-geosciences.wustl.edu/mro/mro-m-crism-6-ddr-v1/mrocr_1004/ddr/2012/2012_115/frt000248e9/frt000248e9_07_de164l_ddr1.img (200, 15,052,800 B).
  - **FRT00021C92 (2011-12-08), 13%, and FRT000233AC (2012-02-23), 10%.**
    - An MTRDR does exist for FRT00021C92, but its label puts it at lat -4.7806 to -4.6864, just north of the box. Fraeman et al. 2016 (Table 1) list this ID as "ATO00021C92".
  - **Survey frames only:** five more observations (FRT000095EE, FRT0000C0EF, FRT00020B9D, HRL00011D43, HRL0001233B) touch the box only with their emission-phase-function (EPF) frames, not their central scan.
  - **ATO observations:** ATO0002BCB1 (2013-10-16) covers 67% by the ODE footprint, not checked against its DDR. ATO00053B2C (2020-07-01) has VNIR data only.

**Minerals mapped from orbit in this part of Mount Sharp (published):**
- **Milliken, Grotzinger & Thomson 2010** (GRL 37, doi:10.1029/2009GL041870): "the Lower formation exhibits a net transition in mineralogy from clay/sulfate to sulfate/oxide assemblages".
- **Fraeman et al. 2016** (JGR Planets 121, 1713-1736, doi:10.1002/2016JE005095), five lower Mount Sharp units:
  - a phyllosilicate-bearing unit;
  - a hematite-capped ridge, whose uppermost layer has "an anhydrous, hematite spectral signature";
  - a spectral-slope unit, likely Fe-bearing;
  - a layered sulfate unit with "monohydrated and polyhydrated Mg sulfates", where "fractures and boxwork structures are abundant throughout";
  - widespread late silica along veins and fractures. They used HRL0000BABA, FRT0000B6F1 and FRT0001BBA1 from the table above.
- **Sheppard, Milliken, Parente & Itoh 2021** (JGR Planets 126, e2020JE006372, doi:10.1029/2020JE006372): "darker-toned strata ... with spectral signatures of monohydrated sulfate. Strata above and below this zone are lighter-toned and contain polyhydrated sulfate and variable distribution of Fe/Mg clay minerals". They call that darker zone the "kieserite zone".
- **Siebach & Grotzinger 2014** (JGR Planets 119, 189-198, doi:10.1002/2013JE004508) mapped the boxwork from orbit: "decameter-scale light-toned polygonal ridges ... parallel-sided ridges with dark central linear depressions", needing "a minimum of 0.43 km3 of water ... at the −3620 m level".
  - For comparison, the msl_wp.json waypoints inside the box run from -3729 to -3472 m (elev_geoid). I did not check that the two use the same vertical datum.

### B3. Orbital rock abundance, dust or thermal products finer than 100 m

- **None found for this box.**
  - Thermal inertia: nothing finer than THEMIS 100 m.
  - Rock abundance: the global TES map (Nowicki & Christensen 2007, JGR 112, doi:10.1029/2006JE002798) is "8 pixels per degree", about 7.4 km/px.
  - HiRISE rock mapping for MSL covered the landing ellipse only. JPL PIA14290 gives that ellipse as "4.5 degrees south latitude, 137.4 degrees east longitude", "20 kilometers by 25 kilometers". The box's north edge (-4.7845) is about 17 km south of that center, outside even the larger pre-landing ellipse.
- **Finer orbital layers that do cover the box:**
  - CRISM MTRDR albedo proxies IRA (R1330) and VNA (R770) at 18 m from FRT000058A3 and FRT0000B6F1, and at 36 m from HRL0000BABA. These show brightness, not dust or rocks.
  - CRISM DDR has a band named "Thermal inertia, J m^-2 K^-1 s^-0.5" on the CRISM pixel grid. Its source map is not stated in the label, so do not treat it as an 18 m measurement.
  - HiRISE DTMs at about 1 m. The parent's ode_dtm.json has two whose bounding boxes contain the box. Slope and roughness from these are the practical stand-in for rockiness at EVA scale.

Sources opened: the USGS Astropedia tile pages and S3 listing; the ISIS cube label (range read); ASU THEMIS MSL site-42 page and its static directory; ODE REST (with doc ODE_REST_V2.1.pdf); PDS Geosciences MTRDR, TRDR and DDR labels and headers; the Fraeman et al. 2016 PDF (https://authors.library.caltech.edu/records/vcdby-34d04/files/JGRE-121-1713.pdf); Crossref abstracts for Milliken 2010, Sheppard 2021, Siebach & Grotzinger 2014 and Nowicki & Christensen 2007; the USGS pub page for Fergason 2012 (https://pubs.usgs.gov/publication/70038495); and JPL PIA14290 (https://www.jpl.nasa.gov/images/pia14290-gale-crater-future-home-of-mars-rover-curiosity/).

## Part B4. Curiosity REMS weather API

URL: `https://mars.nasa.gov/rss/api/?feed=weather&category=msl&feedtype=json`. On 2026-11-14 it returned HTTP 200, `application/json;charset=utf-8`, 1,730,689 bytes, `cache-control: max-age=60`. The file holds 4,745 sols, from sol 1 (2012-08-07) to **sol 4995 (2026-08-25)**, so the public feed lags the rover by about 80 sols. 487 sols fall in 4500-4995. There are 55 gaps in total, for example 4615 and 4754-4755.

Official documentation:
- There is no separate spec. The only field docs are the `descriptions` object inside the JSON, in English and Spanish, written by Centro de Astrobiologia (CAB, CSIC-INTA). Its disclaimer reads: "intended for outreach purposes only... To access REMS scientific data, visit PDS". It also says values are "at REMS location, so MSL rover influences those magnitudes" and that REMS "takes measurements at different times from one day to another".
- NASA's old weather page used this feed: archived [mars.nasa.gov/msl/weather](https://web.archive.org/web/20240112214807/https://mars.nasa.gov/msl/weather/), whose widget code is `msl-weather.js`. The page headers read "Air Temperature ( °F | °C )" and "Pressure (Pa)". The JS reads `max_temp`/`min_temp` as Celsius (`highCelsius = solObject.max_temp`) and turns `ls` into a southern-hemisphere season name. The page also says values "are recalculated, and consequently may change as more data is received on Earth".
- That page now redirects to the [MSL instruments page](https://science.nasa.gov/mission/msl-curiosity/science-instruments/). The CAB REMS site (cab.inta-csic.es/rems) redirects to an unrelated CAB news page.
- Scientific REMS data: [PDS Atmospheres Node, REMS](https://pds-atmospheres.nmsu.edu/data_and_services/atmospheres_data/MARS/curiosity/rems.html) (HTTP 200).

| Field | Meaning (source) | Observed in feed |
|---|---|---|
| `id` | record number | string |
| `terrestrial_date` | "the Earth day on current sol at midday" (descriptions) | YYYY-MM-DD |
| `sol` | mission sol; "sol 0 corresponds with its landing day" (descriptions) | string |
| `ls` | **solar longitude, given for every sol** (4745/4745); "an angle that gives the position of Mars on its orbit" | integer degrees 0-359 |
| `season` | "Month N" of 12 Mars months; S. hemisphere autumn starts month 1, winter 4, spring 7, summer 10 (descriptions) | I checked that Month = floor(Ls/30)+1 on all sols |
| `min_temp`, `max_temp` | air temperature, °C (NASA widget) | e.g. -71 / -5 on sol 4995 |
| `min_gts_temp`, `max_gts_temp` | ground temperature from REMS GTS, °C (descriptions explain ground vs air) | e.g. -84 / 4 |
| `pressure` | Pa (NASA page header). Gale is deep, so pressure runs above the planetary mean (descriptions) | 679-925 Pa across the record |
| `pressure_string` | undocumented | Empirically "Higher" when pressure ≥ ~759 Pa and "Lower" when ≤ 759 Pa. It is **not** the change from the previous sol (49% agreement) |
| `abs_humidity` | descriptions talk about relative humidity | always "--" (no data in any sol) |
| `wind_speed`, `wind_direction` | wind (descriptions) | always "--" |
| `atmo_opacity` | weather description | "Sunny" on 4742 sols, "--" on 3. Not informative |
| `local_uv_irradiance_index` | "intensity of the ultraviolet radiation from the Sun at Curiosity location" | Low / Moderate / High / Very_High / "--" |
| `sunrise`, `sunset` | sunrise and sunset; the time standard is not documented | HH:MM, e.g. 06:46 / 18:51 |

Ls over the campaign (feed values):
- sol 4534 = Ls 80
- sol 4564 = 94
- sol 4693 = 157
- sol 4718 = 170
- sol 4795 = 217
- sol 4848 = 251
- sol 4897 = 283
- sol 4995 = 341

So the boxwork drills spanned southern winter into spring, and the team called the period from Feb 2026 on the "dusty season" ([blog 4812-4817](https://science.nasa.gov/blog/curiosity-blog-sols-4812-4817-back-into-the-hollows/)).
