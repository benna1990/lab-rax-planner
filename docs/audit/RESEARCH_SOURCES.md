# Research sources for Mini Rack Planner

Date: 2026-10-15. Branch: redesign/guided-builder. Output of a source-research pass; no app files were changed.

## Method and limits

- About 35 web searches plus about 55 page fetches. Findings are paraphrased, not copied; numbers are as the source gives them.
- Confidence labels used below:
  - **V** = verified: the number or statement was in the page or PDF text that I fetched. WebFetch answers come from a small summarising model, so "V" means that model reported it from the page, not that I read raw HTML. Two PDFs (Noctua white paper, WS2812B datasheet) were saved and read locally as text, which is stronger.
  - **S** = seen only in a search-result snippet; the page itself was not opened or was blocked.
  - **I** = inferred or my own arithmetic; the source does not state it.
- Blocked or unreadable: MakerWorld (HTTP 403 for model pages), Printables (403), Noctua web pages (429 rate limit; the white paper PDF did load), the Intel 4-wire PWM spec (403), Delock (401), apc.com FAQ (redirected to a 404), Racksolutions (403). For these I used search snippets or mirrors and say so.
- Many MakerWorld facts below come from the DIY Life blog (the Lab Rax author's own site), which is more reliable than snippets.
- Nothing here is a primary standard document (IEEE 802.3, USB-IF, EIA-310 were not available). Standards numbers come from Wikipedia, vendor docs and engineering blogs.

---

## 1. Rack systems

### 1.1 Lab Rax (Michael Klements, "The DIY Life" and MakerWorld)

**F1.1 Original Lab Rax article (7 Apr 2025)** — V
- Source: https://www.the-diy-life.com/introducing-lab-rax-a-3d-printable-modular-10-rack-system/
- Supports: 44.45 mm unit; mounting holes 236.525 mm apart; usable width between posts 222 mm; M6 hardware. Posts and side panels come in 1U to 5U; two sections combine to 10U (the author warns about strength with a full rack beyond that). A 3U rack is made by reprinting the posts shorter; 3U + 5U with joiners gives 8U.
- Printed parts per rack: 4 posts, 4 edge pieces (solid or vented), 4 horizontal pieces (printed diagonally, about 1.5 h each), 2 handles, 4 feet (TPU optional), 2 side panels, top and bottom panels (top can carry a 120 mm fan cut-out). Side, top and bottom panels may instead be 3 mm acrylic or plywood. PETG; the 5U frame is about 580 g, side panels about 360 g, about 10 plates and 26 h on a 256 x 256 mm bed. Designed for beds of about 250 mm.
- Fasteners, heat-set version: 24 x M6x10 button head screws and 24 x M6 brass inserts (8 mm OD, 4 or 5 mm long) for the frame. For mounting panels: about 4 screws and inserts per U per side, up to 12 per U per side if all six holes are used; the BOM lists 6 inserts per U. Bolted version: 16 x M6x12 screws and 16 M6 nuts (or #10-32 x 1/2).
- Assembly order: base (two side edges and two horizontals around the base panel), vertical posts, side panels, top horizontals, top panel and last edges, handles on top, feet on the bottom. One screw per joint. Edge and post pieces take two inserts each.
- Accessories listed: 1/2U and 1U vent panels; 1U fan panel (5 x 40 mm, a 2 x 80 mm option is mentioned); 1U open shelf, 1U QNAP and TP-Link switch shelves; 1 to 2U 12-port keystone patch panel; 1U D-type panel; 1U tray for three Pi 5; 2U tray for seven Pis (Pi trays use M2.5x6 screws and M2.5 nuts, M3x8 to the faceplate).
- Comments on the page: the author powered the bottom fans from "a small 5 V adaptor and some dupont connectors"; a reader says 6 mm long inserts will not fit because the hole is 5.5 mm deep; the author says the main cross member does not fit a 220 mm bed (split version in progress at the time).
- Limits: "per U per side" is ambiguous (see Gaps). No overall external dimensions on the page.
- Planner: confirms the constants already in parts.js (236.525, 222, U = 44.45). The BOM could state "M6 heat-set insert, 8 mm OD, 4-5 mm long, not 6 mm" and 6 inserts per U for a front-mounted panel (I).

**F1.2 Upgrades article (listed 24 Aug 2026)** — V
- Source: https://the-diy-life.com/lab-rax-upgrades-design-improvements-new-accessories-for-my-3d-printed-homelab/
- Supports: overall design unchanged so older prints stay compatible; stiffer structure, tighter tolerances, larger handles; insert holes now take M6 x 8 mm OD inserts in 4 mm or 5 mm length (5 mm more common); nut version now has retaining pockets so nuts are pressed in and held without glue; a 1U Extension Module works with original posts and side panels (the original "domino" connectors need special side panels).
- Accessories with MakerWorld ids: wall cleats 3212268, 1U extension 3211714, stackable handles 2317435, bottom drawer 3212362 (replaces bottom panel, two bottom horizontals, two bottom edges), cable guide 3215912 (one U high), cable combs 3215942. Fasteners: extension 8 x M6x10; cleats 8 for the rack side; handles 2 each; drawer 4.
- Limits: the fetch summary did not mention hex or fan panels in this article. The listing date comes from a site search result.
- Planner: catalog ids/links for these exist to be checked; the bottom drawer replaces three frame parts, which matters for BOM counts.

**F1.3 NAS shelves article (30 Sep 2025)** — V
- Source: https://www.the-diy-life.com/turn-your-10″-homelab-into-a-nas-with-3d-printable-shelves
- Supports: four 1U shelves (2 x 3.5", 4 x 2.5", Pi 5 + Penta SATA HAT, Zimaboard 2) at MakerWorld ids 1838737, 1838721, 1838701, 1838709. Shelves use M3 brass inserts, M3x8 button head screws; the Pi shelf uses 18 mm standoffs. The article also says the bolted 5U (id 1464819) takes M6 or #10-32, per the author's reply.
- Planner: shows that shelf parts add their own small-fastener BOM lines (M3 inserts + M3x8, standoffs).

**F1.4 MakerWorld model pages** — S (all 403)
- Seen only in search snippets: 1294480 (5U, heat-set), 1464819 (bolted 5U; snippet says licence BY-NC-SA and that the 4 mm M6 insert is hard to source), 1294478 (1-5U posts and panels), 1585859 (6U bolted), 2791796 (4U Lab Rax remix, brass insert edition), 2452007 (A1 Mini remix with cut-in-half parts and alignment pins), 2202743 (upper corner for a MAX7219 LED matrix, fully compatible per its listing). A wall-mount system recommends up to 5U for the 10" variant (snippet, depends on weight).
- Limits: licence and stated sizes are from snippets; check each page before showing them in the planner.

**F1.5 Independent build write-ups** — V
- https://readthemanual.co.uk/homelab-rack-build/ : 5U Lab Rax, about 25.8 h print; PETG for frame, PLA for panels; 0.2 mm layers, 2 walls, 15 % infill "as per the model". The build table says M6 inserts 8 mm OD x 4 mm, but the shopping list buys M6x6 mm inserts: an inconsistency a beginner could trip over. Fitted: UniFi gateway, USW 8 PoE switch, two Raspberry Pis, hubs, a mini PC. Tips: list gear first, plan ventilation and cable routes, heavy and hot gear where airflow is best, leave spare space.
- https://core-electronics.com.au/projects/home-lab-testing-rack/ : 403, not read (seen in snippet only; S).

### 1.2 Jeff Geerling "Project MINI RACK"

**F1.6 Index of 10" racks** — V
- Sources: https://mini-rack.jeffgeerling.com and https://github.com/geerlingguy/mini-rack (GPL-3.0 or later).
- Lists 26 commercial 10" racks, 18 3D-printable rack systems and a showcase of well over 100 builds as GitHub issues (2021 to 2026). Commercial entries with heights: Delock 4/6/8U, Digitus 6/9/12U, DeskPi RackMate TT 3U, T0 4U, T1 8U, TL1 10U, T2 12U, KENUCO 4/6/9U, L-com 8U half rack, Middle Atlantic 12U, MikroTik SolidRACK 5 mini 5U, NavePoint 6/6/9U, Rack Magic 3-12U, Stalflex 1-4U, Triton RKA 10/19 10U, Waveshare HomeRack 8U, Penn Elcom 4U rail kit.
- Printable systems named (all with links on the site): JaredC01 LabStack, monkizzle MiniRax, bwees (Printables 1170708), Open Node 3U, Kev's Robots, MandicReally Mod10 (Printables 1225275), Klements Lab Rax (MakerWorld 1294480), DeskPi 3DPrint-Models, Uptime Lab Pi server Mk III, Mauker 10" mounts, dalovering half-width rack (Printables 358304), jazwa rackstack, Paul Grove cube rack (Printables 688952), axiopaladin ButterflyRack, Mauker1 Tiny-Rack, MRP 10" (Printables 1173672), kellervater HomeRacker, ilanKushnir KWS Rack.
- Limits: no authors or sizes for commercial racks on the index; entries not checked individually.
- Planner: a ready-made list of rack families to support as "frame" choices; the showcase issues are real-world layouts to test the planner against.

**F1.7 "Standard" figures on the index and README** — V (two pages agree)
- There is no worldwide published standard for a mini rack. Height 1U = 44.45 mm. Width between screw holes 236.525 mm (9.312 in). Maximum clearance about 220 mm (8.75 in); gear should fit in about 210 mm. Square cage-nut holes, or 10/32 or 12/24 threaded; hole spacing vertically follows the 19" pattern.
- Limits: 8.75 in is 222.25 mm and 210 mm is 8.27 in, not 8.45 in (= 214.6 mm); the summariser may have mangled this, so read the README text itself before copying any "usable width" number.

**F1.8 Geerling's blog post on mini racks** — V
- Source: https://www.jeffgeerling.com/blog/2025/project-mini-rack-compact-and-portable-homelabs/
- Supports: PDUs and UPSes for 10" are scarce and pricey; not all gear that fits in 10" makes sense in a mini rack; Mini ITX cases can stick out the back; Rack 001 is all-PoE with a bottom UPS giving 3-4 h and recharging in 2 h; Rack 002 uses USB-C PD for a 4-node Pi cluster; Rack 003 uses a PicoPSU or 12 V-input boards because ITX cases lack room for a PSU; one builder adapted a Noctua fan grill to two 80 mm fans on USB 5 V; stacking racks raises stability concerns.
- Planner: depth overhang warnings for Mini ITX; "power path" choices (PoE, USB-C PD, DC) as first-class options.

### 1.3 Numbers that are documented (10" rack)

| Value | Figure | Source | Conf. |
|---|---|---|---|
| Front plate / panel width | 254.00 mm (10 in) | Micropolis FAQ https://www.micropolis.com/support/kb/rack-mounting-faq ; MakerWorld printable-panel listing (254.0 x 44.45) | V / S |
| Clear opening between rails | 8.75 in = 222.25 mm (Lab Rax says 222 mm) | Micropolis FAQ; Lab Rax article | V |
| Rail width | 0.625 in = 15.875 mm | Micropolis FAQ | V |
| Hole spacing (centre to centre, horizontal) | 236.525 mm | Lab Rax article; Geerling README | V |
| Same, other figure | about 235 mm | MakerWorld 1913011 and other printable rack listings | S |
| 1U | 44.45 mm (1.75 in) | all of the above | V |
| Vertical hole pattern | 1/2 - 5/8 - 5/8 in = 12.7 / 15.875 / 15.875 mm per U; sum 44.45; U boundary falls in the middle of the 12.7 gap | search results quoting EIA-310 summaries (racksolutions.com, digital-loggers.com) | S |
| 19" horizontal hole spacing (for contrast) | 18.312 in = 465.1 mm | Micropolis FAQ | V |
| 10.5" racks exist | front plate about 264-275 mm, hole spacing about 249 mm | Micropolis FAQ | V (hole spacing line S) |
| 9.5" half-rack audio gear | typically 8.2-8.7 in wide; fits a 10" rack | Micropolis FAQ | V |

- The planner's parts.js already uses hole rows at 6.35 / 22.225 / 38.1 mm inside each U. That matches the 15.875 / 15.875 / 12.7 pattern with the boundary in the 12.7 gap (I).
- Conflict to resolve: 236.525 versus 235 mm. The first appears in two authoritative-for-this-ecosystem pages; the second only in snippets. Keep 236.525 and treat the 1.5 mm difference as slot tolerance.
- The Micropolis page gives no 10"-specific hole spacing; it says the standard text is for 19". EIA-310 itself defines 19" only, so every 10" number is a de facto convention.

### 1.4 Commercial 10" racks

**F1.9 DeskPi / GeeekPi / 52Pi RackMate**
- T0 (4U), https://thepihut.com/products/deskpi-rackmate-t0-10-4u-mini-server-rack — V: width 10 in, depth 200 mm, external 280 x 200 x 274 mm, internal 222 x 200 x 241 mm, maximum installation depth 20 cm, 3.12 kg, aluminium/steel/acrylic; box has the frame, one 1U shelf, one 1U panel. Internal height 241 mm is far above 4U = 177.8 mm (I), so it is the cavity, not the rail height. Hole type is not stated.
- T1 (8U), https://www.cnx-software.com/2024/08/22/deskpi-rackmate-t1-u8-desktop-rack-designed-for-raspberry-pi-nvidia-jetson-mini-itx-motherboards/ — V: "406 x 280 x 200 mm (H x L x W)". Another retailer lists 7.87 in depth (200 mm), so CNX's labels are probably swapped (width 280, depth 200). Rail specs, usable depth and load are not stated. A T1 Plus with 260 mm depth exists (S, a buying guide). A 52Pi T0 Plus is "suited to NAS devices of 260 mm depth" (S).
- T2 (12U), https://52pi.com/collections/sales/products/deskpi-rackmate-10-inch-12u-server-cabinet-t2-rackmount-for-network-servers-audio-and-video-equipment — V: 12U, width 10 in, 9.5 kg, aluminium alloy + acrylic. No dimensions. A Newegg snippet gives 11.02 x 10.23 x 23.22 in (= 280 x 260 x 590 mm, my conversion; axes unlabeled) — S/I.
- 0.5U shelf, https://thepihut.com/products/0-5u-10-rack-shelf-for-deskpi-rackmate — V: 214 x 200 x 21 mm, for T0 and T1, not T2.
- Official files: https://github.com/DeskPi-Team/3DPrint-Models (MIT) holds printable accessories (fan shelf, NUC holder, KVM, switch plates, 1U blank panel, Pi 5 tray, HDD tray) and a `DeskPi_Official_Mechanical_Drawings` folder with PDFs for T0 (DP-0047), T1 (DP-0022), T2 (DP-0048), 0.5U/1U shelves, 1U/2U blank panels, a 2U drawer, a DC PDU. The PDFs were not opened (V for the file list; contents unknown).
- Planner: RackMate frames as selectable "commercial frame" presets would need those PDFs for depth, hole positions and the 0.5U/1U shelf families. T0 internal 222 x 200 mm is the best verified number set.

**F1.10 Other commercial 10" cabinets** — mixed
- Rack Magic ER 10, https://www.rack-magic.com/en/p/10-wall-or-desktop-cabinet-5u-250mm-depth-network-server-studio-laboratory — V: 5U, 250 mm depth, 20 kg evenly distributed, four adjustable feet, vent openings sides/top/bottom. No inner width, rail or hole data.
- Digitus DN-10-05U-1: snippet gives "6U ... 330x312x300 mm" with 254 mm profile rails; the model code says 05U, so the snippet is internally inconsistent (S).
- Intellinet 711708: 6U, 300 mm deep, usable depth 265 mm, 60 kg (S, retailer titles). Delock 43422: mounting depth max 240 mm, two depth-adjustable front rails (S).
- Conclusion: commercial pages publish usable depth and load but almost never hole pitch or inner width. Usable depth (about 200-265 mm) is the number that decides what fits.

### 1.5 Other 3D-printed 10" frames

| System | What I could verify | Source | Conf. |
|---|---|---|---|
| HomeRacker (kellervater) | 15 mm base unit, tool-free printed supports + connectors + lock pins, 10" rackmount kit, airflow kit with 80/92/120 mm fan bores, Pi 5 mount; code MIT, models CC BY-SA 4.0; has a Configurator that counts parts and copies a BOM (page itself empty when fetched) | https://github.com/kellervater/homeracker | V (README), configurator S |
| Kev's Robots mini rack | 4U, 10" wide, shelves 200 mm deep, 20x20 mm aluminium extrusion, M6 rack nuts and bolts, printed corners; BOM GBP 172.32; STL names for Pi 4/5 trays are swapped on the page | https://www.kevsrobots.com/projects/mini-rack/ | V |
| rackstack (jazwa) | OpenSCAD parametric frames about 200/180/100 mm cubes, M3 hardware, MIT; not stated as 10" | https://github.com/jazwa/rackstack | V |
| LabStack (JaredC01) | Pi and mini-rack mounts, GPL-3.0; no Mini dimensions on page | https://github.com/JaredC01/LabStack | V |
| Mod10 (Printables 1225275) | modular from 2U, no supports, updated Apr 2026 with M6 hex-nut inserts instead of cage nuts | search snippet of the Printables page | S |
| bwees modular 10" (Printables 1170708) | fully printed; M6x12 bolts and M6 square nuts | search snippet | S |
| Skilleton (MakerWorld 2936394) | 1U-grid modular frame; 6U about 700 g PETG, about 26 h; DIN 934 nut slots | search snippet | S |
| MakerWorld 1913011 | 5U enclosure following EIA-310 hole pattern; 235 mm hole spacing; "inner width 254 mm" (likely means panel width, I) | search snippet | S |
| Metal 10-inch desktop rack (MakerWorld 3260989) | printed brackets plus commercial steel rack rails; M3/M5 inserts, M5 screws | search snippet | S |

- Limits: Printables and MakerWorld pages were not fetchable; do not copy sizes or licences from this table without opening the pages.
- Planner: the "frame" concept could cover rail-based hybrids (printed ends plus steel Penn Elcom rails) where height = rail length.

---

## 2. Rack planners, compatibility checkers, assembly guides

**F2.1 Rackula (web, MIT)** — V
- Sources: https://gigazine.net/gsc_news/en/20260222-rackula/ and https://raw.githubusercontent.com/RackulaLives/Rackula/main/docs/reference/SPEC.md ; repo github.com/RackulaLives/Rackula; hosted at count.racku.la (a community page noted a three-week outage, S).
- Does: drag devices from a library into a rack; widths 10" (called Half-width), 19", 21", 23"; heights 1-100U; bayed layouts; front/rear faces with half-depth devices sharing a U; share by URL or QR; save as `.Rackula.zip` (YAML + assets); import custom devices and NetBox device types; export image; self-host with Docker.
- Data model worth knowing (SPEC): `u_height` (min 0.5), `slot_width` (1 = half width), optional `width_mm`/`height_mm`, `face` front/rear/both, `is_full_depth`, `container_id` for carriers, `position`. Rules: devices under 1U, non-integer, or narrower than full width must sit inside a carrier; collisions are decided by U-range overlap plus face (front vs rear do not collide); children collide only with siblings in their container.
- Limits: no port or power handling was found in the article or spec excerpt; export format list is not given in the fetched text (a snippet says PNG, PDF, SVG).
- Planner: copy the face-based collision rule for the new Back view, a carrier concept for ½U and multi-slot parts, and NetBox-style device import. The planner already differs by being 10"-only and catalog-driven.

**F2.2 Lanberg rack configurator (vendor)** — V
- Source: https://lanberg.eu/configurator
- Steps: pick a cabinet, filter compatible products, drag to place, preview, output a PDF with quote. Checks products against the enclosure in real time (panel depth, load against capacity) and suggests replacements for parts that fail.
- Limits: 19" cabinets up to 42U/47U, vendor catalog only.
- Planner: "swap suggestion" wording and a PDF with a shopping list are already close to what the planner does; depth and load checks are the model to follow.

**F2.3 Other tools** — S
- PATCHBOX rack planner (free, 19", patch-panel oriented), Penn Elcom Panel Designer (drag-and-drop front panels 1U-6U), RackX and The Rack Builder (paid iOS apps). Only the search tool's summary; no pages opened.

**F2.4 PCPartPicker compatibility approach** — V for messages, S for everything else
- Source: https://www.cgdirector.com/pcpartpicker-compatibility-warnings-explained/ (third-party article; the official FAQ URL I tried returned 404).
- Observed pattern: every message is a warning; wording is a count of what is missing ("X additional SATA power connectors are needed", "X additional M.2 slots are needed"), a pair mismatch ("A and B are not compatible"), or a capacity limit ("may not provide sufficient Wattage"). A Compatibility Filter hides incompatible parts by default but still lets you add them, and the warning then shows. The article rates the size checks as incomplete.
- Wattage estimate: formula not published in what I found; forum advice is to add component TDPs plus 100-150 W margin and stay under about 80 % of PSU rating (S, forums).
- Planner: use "N more X needed" phrasing; hide-by-default but never block; always show the reason; keep a line saying what is not checked. The planner's power.js already has short/tight levels.

**F2.5 Assembly-guide research (IKEA style)** — V
- Source: https://graphics.stanford.edu/papers/assembly_instructions_study/ (Heiser, Phan, Agrawala, Tversky, Hanrahan, Stanford, 2004 per search snippet).
- Computer-generated furniture instructions built on experimentally derived principles cut assembly time by an average of 35 % (mean 10.2 vs 16.04 for factory instructions and 18.9 for the top hand-designed ones, TV stand; units not given) and errors by 50 %. The page does not list the principles.
- Snippet-level (S): IKEA's booklets follow a fixed sequence (finished product, tools checklist, numbered steps); their instruction designer names clarity and continuity as the two principles (UX Planet case study); critics say wordless style can leave complex steps unclear.
- Limits: one product, one study; the principles list was not on the page.
- Planner: build steps that show the part being added in context, group steps by sub-assembly, one action per step, tools and parts checklist first. Lab Rax's own order (F1.1) is already a good step sequence.

**F2.6 What to copy, in short**
1. Rackula: face-aware collisions, carrier/slot rules, URL/QR share, NetBox import.
2. Lanberg: live depth/load check against the chosen frame, replacement suggestions, PDF with quote.
3. PCPartPicker: counted shortage messages; incompatible items hidden by default but addable.
4. HomeRacker configurator: BOM copy button (page not readable; S).
5. IKEA/Stanford: numbered, one-action, context-showing steps.

---

## 3. Power and network

**F3.1 PoE types (802.3af / at / bt)** — V (Wikipedia, via fetch)
- Source: https://en.wikipedia.org/wiki/Power_over_Ethernet

| Type | Name | Max at PSE | Available at PD |
|---|---|---|---|
| 1 (802.3af) | PoE | 15.40 W | 12.95 W |
| 2 (802.3at) | PoE+ | 30.0 W | 25.50 W |
| 3 (802.3bt) | PoE++ / 4PPoE | 60 W | 51 W |
| 4 (802.3bt) | PoE++ / 4PPoE | 90 W | 71.3 W |

- Classes: class 0 default (0.44-12.94 W at PD; PSE 15.4); class 1 (to 3.84 W; PSE 4.00); class 2 (to 6.49 W; PSE 7.00); class 3 (to 12.95 W; PSE 15.4); class 4, type 2 only (to 25.50 W; PSE 30). Classes 5-8 (type 3 and 4) came back as PSE 45 / 60 / 75 / 90 W and PD 40 / 51 / 62 / 71.3 W, but the fetch summary worded them oddly ("at 4-pair"), so check them before use.
- Type 2 and later can negotiate in 0.1 W steps over LLDP; a PSE may deny a PD that draws more than it was allowed.
- Planner: power.js already holds 15.4/12.95, 30/25.5, 60/51 (matches). Missing: 802.3bt type 4 (90/71.3) and the class steps below type ceilings.

**F3.2 PoE budget accounting (allocated vs consumed)** — V
- Source: https://docs.westermo.com/weos/5/General/PoE (Westermo industrial switches).
- Class allocation table: class 0 allocated 15.4 W for 12.94 W maximum unit draw; class 1 4.0 / 3.84; class 2 7.0 / 6.49; class 3 15.4 / 12.95; class 4 30.0 / 25.50. The allocation is higher than the device figure to cover cable loss.
- The switch shows Maximum power (example 80 W), Allocated power (reserved for admitted ports, 76 W), Consumed power (actually drawn, 65 W); new devices are admitted against allocation, not consumption.
- Snippet-level (S): Meraki says its budgeting follows device classification; an IPVM user saw a Cisco switch reserve 15.4 W for a camera drawing about 9.6 W; a camera-vendor guide says steady-state draw is often 50-80 % of class maximum and to size on class maximums plus headroom; unmanaged switches generally do no budgeting.
- Limits: behaviour differs by vendor and by whether a port limit or LLDP is set.
- Planner: show two numbers per PoE switch, "reserved by class" (what stops new devices) and "typical draw" (what the UPS sees). A device with an unknown class should be budgeted at the standard's PSE-side ceiling (15.4 / 30 / 60 / 90 W), not its measured draw.

**F3.3 USB-C power basics** — V (Wikipedia), flow S/V
- Source: https://en.wikipedia.org/wiki/USB_hardware and https://en.wikipedia.org/wiki/USB_Power_Delivery
- USB-C baseline is 900 mA at 5 V, with 1.5 A and 3.0 A advertised over the configuration line; USB PD fixed voltages are 5, 9, 15 and 20 V (EPR adds 28, 36, 48 V up to 240 W); more than 3 A (above 60 W) needs an e-marked cable rated 5 A, so 5 A at 20 V is 100 W; the table lists 3.0 A at each SPR voltage.
- Negotiation (https://acroname.com/blog/basics-usb-power-delivery-negotiations, V): the source sends its capabilities as a list of power data objects, the sink replies with a request naming one of them, the source accepts or rejects, changes voltage, then sends "PS Ready". 5 V is the legacy fixed object. The "source starts at 5 V" statement came from a search snippet (S), not from the fetched page.
- Planner: a "USB-C / PD supply" line should record voltage and current per profile, not just watts, and a cable needs 5 A rating above 3 A. A 5 V / 5 A profile is not among the standard fixed ones in the Wikipedia table (I), which is why the Pi 5 is special (F3.4).

**F3.4 Raspberry Pi 5 power** — V
- Sources: https://www.raspberrypi.com/documentation/computers/raspberry-pi.html (power section) and https://www.raspberrypi.com/products/27w-power-supply/
- Recommended: the 27 W USB-C supply (5.1 V, 5.0 A = 25.5 W; also 9 V 3 A, 12 V 2.25 A, 15 V 1.8 A, each capped at 27 W). With a 5 A supply the Pi gives 1.6 A to downstream USB; with any other compatible supply it limits USB to 600 mA. It needs a good supply capable of 3 A at 5 V (15 W) to boot, warns on first boot if 5 A is unavailable, and by default disables USB boot when on a 3 A supply (`usb_max_current_enable=1` to override). Bare-board active draw about 800 mA (table); off-state about 1-1.4 W. The power budget is shared by the USB ports and the fan header.
- Limits: retailer listings give 18 AWG for the cable, the Pi page says 17 AWG; 5 V vs 5.1 V wording varies.
- Planner: the 5 V / 5 A requirement in tips.json is supported. Rule for the planner: Pi 5 plus USB SSD on a generic 65 W PD charger (5 V 3 A) means the 600 mA cap; flag it. Per-Pi budget: 5 V x 5 A = 25 W at worst case (I).

**F3.5 Pi 5 over PoE** — S
- Source: Waveshare PoE HAT (F) snippets (https://www.waveshare.com/wiki/PoE_HAT_(F)): input 37-57 V (802.3af/at), outputs 5 V up to 4.5 A on the GPIO header and 12 V 2 A on a separate header, 25 W maximum combined (one vendor note). The official Raspberry Pi PoE+ HAT is listed as 5 V 4 A and for Pi 3B+/4B only.
- Planner: a Pi 5 on PoE needs at least an 802.3at (30 W) port in practice (I, from 25 W HAT limit and the 25.5 W type 2 PD figure).

**F3.6 UPS runtime** — mixed
- https://www.ankersolix.com/blogs/battery/battery-backup-calculator-for-ups (V): runtime (h) = usable battery Wh x UPS efficiency / load W; VA = W / power factor; a 1000 VA unit may carry only 600-800 W; example 24 V x 40 Ah = 960 Wh, 80 % usable, 85 % efficiency, 400 W gives 1.63 h; check the maker's runtime chart.
- APC FAQ (S; official pages appear in search under apc.com/se.com FAQ FA157485, fetch failed): watts is real power, VA apparent; the old convention is a UPS watt rating about 60 % of VA, newer units are closer; neither rating may be exceeded; sizing by VA alone can overload the watt rating.
- Other search snippets (S): UPS efficiency typically 90-96 % (other calculators 85-95 %); heavy discharge can cost 15-30 % of nameplate capacity; end-of-life derate about 0.8; reserve time for shutdown.
- Geerling Rack 001 (V): UPS gave 3-4 h of backup.
- power.js (read, not a source): 0.6 W per VA, 0.125 Wh per VA, 85 % inverter, 5 W idle, Peukert exponent 1.2. The 0.6 and 0.85 figures agree with the sources above; the 0.125 Wh/VA and Peukert 1.2 are not covered by any source I found and should stay marked as estimates. The planner should accept an entered watt rating, since modern UPS may be 0.9-1.0 PF (S).

---

## 4. Fans

**F4.1 Noctua PWM white paper** — V (PDF read as text)
- Source: https://cdn.noctua.at/media/Noctua_PWM_specifications_white_paper.pdf
- Applies to Noctua 5 V, 12 V and 24 V 4-pin fans. PWM input is pin 4: target 25 kHz (21-28 kHz), logic low max 0.8 V, source current max 5 mA, open-circuit max 5.25 V, duty 0-100 %, not inverted (100 % = full speed), pulled up inside the fan. Warning: 12 V or 24 V on pin 4 destroys the fan instantly.
- Speed is roughly linear from 100 % down to the minimum speed at 20 % duty; below 20 % the Intel spec is undefined, most Noctua fans keep dropping and stop at 0 %. With no PWM signal the fan runs at full speed.
- Tachometer: open collector, two pulses per revolution, max 5 mA for 5 V and 12 V fans (2 mA for 24 V); rpm = Hz x 60 / 2; a locked rotor leaves the line stuck high or low.
- Drive from a CMOS-inverter-type output (a normal microcontroller GPIO); open-collector drive is discouraged. A 4-pin female connector fits a 3-pin male header; a Y-cable (NA-YC1) can run two fans on one header; NA-FC1 is a manual controller for 5 V and 12 V PWM fans.
- Limits: the pin/colour table is an image and was not in the extracted text.
- Planner: PWM and tach facts support the beginner checklist (F4.6); the 5 mA limits matter if the planner ever suggests wiring a PWM line straight to a GPIO.

**F4.2 Noctua FAQs: 3-pin vs 4-pin, 5 V vs 12 V** — S (pages returned 429)
- Search summary of noctua.at FAQs: a 3-pin fan works on a 4-pin header with pin 4 left empty (BIOS may need voltage mode); a 4-pin PWM fan on a 3-pin header runs at full speed unless the board does voltage control; some 4-pin headers do voltage control on pin 2 rather than PWM on pin 4; 5 V fans use the same pin layout as 12 V (blue PWM, green tach, yellow power, black ground); a 5 V fan "cannot be run at 12 V" and is damaged on motherboard headers. Forum posts agree with the colours but are not Noctua documentation.
- Planner: wording for the beginner warning; a hard rule "5 V fans never on a 12 V header" is supported by the maker's own FAQ text (S).

**F4.3 NF-A8 5V PWM as the example USB-style fan** — S
- Source: https://www.noctua.at/en/products/nf-a8-5v-pwm/specifications (snippet): 80 x 80 x 25 mm, 5 V, 4-pin, about 0.74 W typical, ships with a USB power adaptor cable. At 5 V that is about 0.15 A (I). The snippet notes Noctua's own text and pin table disagree about which wire is PWM on this model; read the manual before wiring.
- Planner: catalog already lists Noctua NF-A8 5V and NF-A4x10 5V as search keywords; each fan entry could carry volts and amps so the fan total goes into the 5 V budget.

**F4.4 Raspberry Pi 5 fan header** — V
- Source: https://www.raspberrypi.com/documentation/computers/raspberry-pi.html
- 4-pin JST-SH, 1 mm pitch socket. Pins: 1 +5 V (red), 2 PWM (blue), 3 GND (black), 4 tach (yellow). Official case fan draws about 60 mA at 5 V. The fan is off below 50 C and reaches 100 % at 75 C. The connector draws from the same current limit as the USB peripherals. The docs say to use the official fans.
- Hazard (I): this pin order differs from the usual PC 4-pin order (GND, +12 V, tach, PWM; pinout pages in search results, S), so a PC fan must never be crimped onto this header without checking each wire.
- Planner: "fan on the Pi header" needs 5 V, 4-pin JST-SH, and counts against the 600 mA / 1.6 A USB budget.

**F4.5 Other 5 V fan sources** — S unless noted
- Lab Rax (V): bottom side-panel fans on a 5 V adaptor with Dupont connectors; top cut-out for a 120 mm fan; fan panel 5 x 40 mm or 2 x 80 mm.
- Solarbotics 40 x 40 x 10 mm 5 V fan rated 140 mA, advised to use a separate supply (https://www.solarbotics.com/product/14060/).
- Pimoroni Pi 4 case fan: 5 V from header pin 4, ground pin 6, PWM on GPIO 14 (snippet).
- Noctua NA-FH1 hub (https://noctua.at/en/na-fh1): 8 channels for 12 V and 5 V fans; SATA input 12 V fans only (54 W); 4-pin PWM input can feed 5 V and 12 V fans (24 W); auto-resetting fuses (snippet; retailer text).
- Geerling blog (V): a builder adapted a Noctua fan grill to two 80 mm fans powered from USB 5 V.

**F4.6 Beginner check list (my synthesis from F4.1-F4.5, flagged I)**
1. Voltage printed on the fan (5 V or 12 V) must match the supply or header; 5 V fan on 12 V is destroyed (Noctua FAQ, S).
2. Wires: 2-wire = power only, always full speed; 3-wire adds tach; 4-wire adds PWM (Noctua white paper, V).
3. Current: use the number printed on the fan; add all fans, then compare with the supply or port (Pi header shares the USB limit, V).
4. Connector and pin order: 3-pin and 4-pin PC connectors, Dupont, JST-SH on the Pi 5; confirm pin 1 and polarity before power.
5. PWM fans: 25 kHz signal, 5 V logic, never 12 V on the control pin (V).
6. USB chargers carry about 1-2.4 A per port; a hub of 5 V fans should have its own supply. (Per-port figure is general knowledge, not sourced here.)

---

## 5. Lighting

**F5.1 NeoPixel Light-Up Lab Rax Logo, MakerWorld 3212396** — V (via author's blog)
- Sources: https://the-diy-life.com/lab-rax-upgrades-design-improvements-new-accessories-for-my-3d-printed-homelab/ ; model link https://makerworld.com/en/models/3212396-neopixel-light-up-lab-rax-logo (403, not opened); example code https://github.com/mklements/LabRaxLogoIllumination
- Replaces one standard horizontal front piece (can also go at the bottom or rear). Two 8-pixel NeoPixel bars soldered end to end give 16 addressable LEDs: power and ground bridged, bar 1 OUT to bar 2 IN, jumpers to bar 1 IN for power, ground and data. Controller: ESP32, Arduino or Raspberry Pi; the author suggests an ESP32. Mount with screws or glue; rear cover glued or held by 2 x M3 inserts and M3x8 screws. Controller sits on the rear of the cover plate or on a tray in the rack.
- Example code (V, GitHub fetch): Adafruit_NeoPixel library, GRB at 800 kHz, data pin D1, 16 LEDs, brightness 60 of 255.
- Worst case at full white is 16 x 60 mA = 0.96 A; at brightness 60/255 roughly a quarter of that, about 0.23 A (I, assuming roughly linear scaling).
- Limits: the blog does not state the supply voltage or a wiring diagram; the page says "power" only.

**F5.2 Models 3232859 and 3272376 (LED hex bar)** — not found
- Two targeted searches and the direct MakerWorld URLs returned nothing usable (403 or no index entry). I cannot say what either model is. The planner has a `hexbar` logo mode in app.js; where its numbers came from was not checked, so re-read those model pages before trusting them.
- A "raised hex panel set" for Lab Rax was mentioned in a search summary (S); its model id was not given.

**F5.3 Lab Rax upper corner for MAX7219 LED matrix, MakerWorld 2202743** — S
- Search snippet only: remix by Lajoix, fully compatible with standard Lab Rax parts, aimed at Conway's Game of Life; the board is released by prying the holder clamps open.

**F5.4 WS2812B datasheet** — V (PDF read as text; vendor copy hosted at https://www.cl.cam.ac.uk/teaching/1516/ECAD+Arch/files/pcb/WS2812B.pdf)
- Pins: 1 VDD, 2 DOUT, 3 VSS (ground), 4 DIN. Data flows DIN to DOUT, to the next LED's DIN. Absolute maximum supply 3.5-5.3 V; electrical figures at 4.5-5.5 V. Input high threshold 0.7 x VDD (3.5 V at a 5 V supply), input low 0.3 x VDD. 800 kbps, 24 bits per LED in G-R-B order, high bit first; bit timings 0.4 / 0.85 us (0) and 0.8 / 0.45 us (1), each +/-150 ns; reset is low for more than 50 us. At 30 fps cascades of 1024 or more LEDs are possible. Typical circuit uses a 0.1 uF (104) capacitor near each LED. Reverse-connection protection is claimed.
- Not in this copy: per-LED current. The 60 mA full-white figure is in F5.5. The datasheet text is a vendor translation with garbled passages.

**F5.5 Adafruit NeoPixel Uberguide, powering** — V
- Source: https://learn.adafruit.com/adafruit-neopixel-uberguide/powering-neopixels
- Up to 60 mA per pixel at full white, 20 mA per pixel is the rule of thumb for mixed colours; supply amps = pixels x 20 / 1000 minimum, x 60 for worst case (60 pixels: 1.2 A or 3.6 A). Nominal 5 V; too much voltage kills the LEDs, less dims them. A 3.3 V data signal may be too weak for 5 V pixels (the maker wants at least 70 % of the supply); fix with a level shifter on the first pixel or a lower pixel supply. Put 500-1000 uF (6.3 V or more) across the supply, ground first, common ground for everything, each supply's +5 V feeds only one section, keep every pixel within about 1 m of a power feed.
- Series data resistor 300-500 ohm appears in search snippets (S); the page I fetched did not mention one.

**F5.6 WLED (ESP32 controller firmware)** — V (two kno.wled.ge pages)
- https://kno.wled.ge/basics/getting-started/ : ESP32 preferred (ESP8266 support ending); ESP32 data pins GPIO 4, 13 and 16-33 (16 as the example); keep the data wire short or add a level shifter; join the controller and strip grounds.
- https://kno.wled.ge/basics/compatible-hardware/ : the recommended level shifter is SN74AHCT125; bidirectional shifters only for lines under 50 cm; I2C shifters are too slow.
- https://kno.wled.ge/advanced/wiring/ : built-in current limit defaults to 850 mA; never draw more than 1 A through a board's USB port; size the supply to the strip (30 LEDs on 2 A / 5 V is better than a 100 W supply); inject power if the far end is dim or beyond about 150 LEDs; fuse each injection line just above its expected current (example: 5 A for 4.5 A); never join the positive rails of two supplies on one strip, joining grounds is fine; wire no thinner than 22 AWG; oversize wire and amp ratings 2-3 x.
- Planner: LED entries could store LED count; the lights then add count x 20-60 mA at 5 V to the supply total, and the planner can warn above the USB 1 A line.

---

## Gaps: what could not be verified

1. **MakerWorld model pages** (all 403): exact print profiles, licences, stated sizes and fastener counts for 1294480, 1464819, 1585859, 1294478, 2791796, 2452007, 2202743 are from the author's blog or snippets only.
2. **MakerWorld 3232859 and 3272376**: could not be identified at all. The Lab Rax LED hex bar is unconfirmed; only 3212396 is confirmed (as the NeoPixel logo).
3. **"Per U per side" insert count**: the Lab Rax article says about 4 per U per side, up to 12 per U per side with all six holes, and lists 6 per U in the BOM. Three holes per U per rail times two rails would be 6 per front panel, so 12 probably means front and back. Needs a check against the model.
4. **Hole spacing 236.525 vs about 235 mm**: no standard text exists; only convention. Geerling's "usable width" line (210 mm, 8.45 in) is internally inconsistent in the fetch summary.
5. **Commercial frames**: no verified hole pitch, hole type or inner width for T1, T2, GeeekPi, Rack Magic, Delock, Digitus, Lanberg. The DeskPi PDF drawings (T0 DP-0047, T1 DP-0022, T2 DP-0048) were listed but not opened. T1 axis labels are contradictory.
6. **EIA-310 text**: the 15.875 / 15.875 / 12.7 pattern is from secondary pages (search summaries of racksolutions.com and others), not the standard.
7. **PCPartPicker**: the official FAQ was not reachable; the message catalogue comes from a third-party article. Their wattage formula is unknown.
8. **Existing planners**: Rackula's port, power and export-format handling not confirmed; HomeRacker's configurator page returned no content; PATCHBOX, Penn Elcom and the iOS apps are snippet-only.
9. **PoE**: standards come from Wikipedia and a switch vendor manual; classes 5-8 values and the Imax row were not recorded. Behaviour of consumer PoE switches (budget shown, per-port limits) was not checked.
10. **USB-C PD**: the "starts at 5 V before negotiation" statement and the Pi 5's non-standard 5 V / 5 A object are only in snippets or are my inference; no USB-IF text was read.
11. **UPS**: the VA/W convention and efficiency ranges are snippet-level (APC pages did not load). Nothing found supports the planner's 0.125 Wh per VA or Peukert exponent 1.2; they should stay labelled as estimates.
12. **Noctua web FAQs and the NF-A8 5V PWM spec** (429): FAQ statements come from search summaries. The white paper is solid for PWM and tach numbers but its pin/colour table was an image.
13. **Fans and USB**: the per-port USB current for typical chargers and the "12 V fan needs 6-7 V to start" tip in tips.json were not checked against any source here.
14. **LED current**: the WS2812B vendor copy has no per-LED current; the 60 mA figure is Adafruit's. Real draw of the two-bar logo at brightness 60 was not measured.
15. **Claims not checked at all**: fan airflow figures, heat per device, the tips.json GPIO "16 mA" statement, and any price data.
