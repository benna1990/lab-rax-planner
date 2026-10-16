# Your first Lab Rax build

[Open the planner](https://benna1990.github.io/lab-rax-planner/) · [Back to the project](../README.md)

## 1. Start a layout

Choose **Set up a rack** to configure your own build. The initial example shows what a layout can look like. Choose your rack height and frame variant; the planner currently supports 1–10U Lab Rax 10″ racks.

## 2. Choose the parts

First pick where on the rack in the **Where** bar: **Front**, **Back**, **Top**, **Bottom**, **Sides** or **Inside**. For the front and the back, search for your device in **Devices**, select a mount and add it; use the alternative-mount selector when several designs are listed, and add vents, blank panels, shelves or patch panels from **Panels**. **Top** holds top panels and access point mounts, **Bottom** the bottom panel (printed, acrylic, mesh or with a fan) and feet, **Sides** the side panels (printed, acrylic or patterned), **Inside** cable management, device holders and wall mounting. Other frame sizes and versions (6U, LowProfile, deeper sides, joining racks) are in step 1, **Rack**.

The planner opens in the **3D view**. Arrange the parts in the **Flat** view (the front or the back, as picked in the Where bar), where you can drag them, and increase the height if needed. Whole-U parts align to U boundaries; half-U parts can occupy either half. Parts that cannot be placed need attention before printing.

A height marked **≈** is estimated. Open the original model page and confirm the height, compatibility and chosen variant. A matching device name alone does not establish that a mount fits your build.

## 3. Make a custom part

Open the custom part maker and select a blank, vent, keystone, label, fan or Neutrik D-type panel, a cable pass-through or a shelf. Adjust the parameters and preview the result. Add it to the rack or use **Download STL**. A fan panel counts as a fan in the cooling estimate.

Check the printer bed size, hole fit and clearances before printing. Slice the exported STL using settings suitable for your material and intended load.

## 4. Review the build

Use **3D view** to inspect the layout. You can load your own downloaded STL/3MF files for a local preview; those files stay in your browser. Catalog illustrations and the frame preview are approximate.

Use **Airflow** to explore heat and fan placement. Set real device heat where known. This is a simplified estimate of surrounding air, not a prediction of internal component temperature or a validated cooling design.

Review the shopping list and assembly guide. Filament quantities are rough estimates; slice the actual parts for reliable grams and print hours. Check hardware against the original model instructions.

For acrylic sides, measure the selected side-panel model before ordering. The planner does not yet provide verified production cutting files or a cheapest delivered quote.

## 5. Download and print

Choose **Download build pack** and extract the ZIP.

1. Open `download-list.html` and visit each community model page.
2. Download the required frame pieces and correct mount variants there. A model page may contain several files; use the quantities and descriptions in your plan.
3. Find generated STL files in `custom-parts/`, when your layout includes generated parts.
4. Read `build-guide.html` and the CSV shopping list before purchasing hardware.
5. Slice the models, check quantities and printer compatibility, then print and assemble following the model makers’ instructions.

The pack also attempts to include a PDF build plan. If it is missing, try **Build plan PDF** in the planner. Internet access is needed when downloading source models or loading external libraries for the first time.

## Save and share

Your layout is saved in this browser. Use **Share link** in **Your build** and keep the link if you want to reopen or share the configuration, or **Save as file** for a small `.rack.json` file you can keep, send or open on another computer with **Open file** (Undo brings back the layout you had). The build pack holds the same file. Clearing browser storage removes the local saved layout. Locally loaded model files need to be loaded again in a new session.

## Check your printer

Pick your printer at the top of the **Print list** (or in **Set up a rack**). Prints with a part too big for its bed are marked, with the part and its size; parts that only fit turned diagonally are noted too. Sizes marked ≈ are estimates, so check the model in your slicer. For 180 mm beds there is a 5U frame with split parts under **Frame & extras**.

## Common questions

**Does the ZIP contain every community model?** No. It includes links to the original pages. Each maker retains ownership and sets their model’s license.

**Will this work with any rack?** The current planner targets the 10″ Lab Rax system. Check compatibility for each community mount, especially designs made for other racks.

**Can I trust the filament and cooling values as exact?** They are planning estimates. Use slicer results for material/time and measurements for real temperatures.

**Can I use a 220 mm printer bed?** Some frame pieces and generated panels are around 250 mm wide. Check each file and its orientation against your printer’s usable bed.

**How do I report a problem or suggest a model?** [Open an issue](https://github.com/benna1990/lab-rax-planner/issues/new/choose), including the model link, relevant dimensions and reproduction steps where possible.
