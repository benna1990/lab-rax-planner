# Compact build PDF

## Scope and research

The PDF is a workshop reference, not a copy of every UI section. Default target: six pages for an ordinary build. Overflow is allowed for actual selected parts, never hidden or truncated. No generic tool recommendations, optional upsells or imported tip collections.

Prusa's calculator separates filament weight, printing time, energy consumption and material price: https://blog.prusa3d.com/3d-printing-price-calculator_38905/ . Use these inputs independently. Grams divided by a configurable throughput is only a rough planning estimate, not slicing or a validated time prediction. Allow the user to replace grams and hours with slicer totals. No API or cloud upload is required.

## Document order

1. Build brief: compact navigation, filament by colour, machine hours, printing electricity and budget breakdown. Distinguish material consumed from buying whole spools. Exclude existing devices, tools, delivery and tax adjustments; label these exclusions.
2. Technical overview: front, rear, side and top plus placement and frame quantities. Approximate frame envelope clearly marked; no production or load certification implied.
3. Parts to print and buy: concise selected-model links and essential quantities. No full URLs or generic shopping suggestions.
4. Cooling: modern temperature map per U with a fixed room-relative colour scale, values, selected airflow direction and at most two actionable suggestions. Air estimates are not component temperatures.
5–6. Assembly: five or six illustrated phases, at most three per page. One brief instruction and at most one relevant tip per phase. Device placement details stay in the placement table.

Wall mounting adds a compact block only when a wall accessory is selected. Generate a dimensioned hole pattern only from verified bracket measurements. Current wall entries contain no hole positions, so link the selected source and explicitly withhold a drill pattern. Never derive holes from rack envelope estimates.

## Cost policy

Configurable EUR planning allowances are not current supplier quotes. Electricity = hours × average watts / 1000 × tariff. Material consumed = grams / 1000 × kg price. Purchase budget uses whole spools per colour plus whole hardware packs and print electricity. Unknown items remain unknown; show a known subtotal rather than claiming a full total. Preserve zero values and user overrides. Default throughput, power and prices are explicit editable assumptions.

## Acceptance

Generate and visually inspect ordinary, empty, tall, rear-mounted, acrylic and fan builds. Check that links, contents and overflow work, values match the UI, optional shopping rows are absent, and every instruction has a diagram. Verify cost arithmetic including pack rounding, unknown prices and zero overrides. No unverified wall-hole pattern.


## Finalisation and international use

Before exporting, ask for destination and existing stock: hardware in individual pieces and filament in grams per colour. Recalculate missing quantities, then round purchases to whole packs/spools. Preserve print-use cost separately from remaining purchases. A regional shop map includes NL, BE, DE, FR, GB, US, CA, AU and an international fallback. Bol is shown for NL/BE only. Amazon tags remain marketplace-specific. Never reinterpret EUR allowances as USD/GBP/CAD/AUD prices: foreign prices start unknown and are user-entered; currency-specific profiles retain prior prices without conversion. Machine settings, slicer totals and inventory survive currency changes.

Marketplace background: https://www.bol.com/be/nl/sf/wat-betekent-dit-voor-mij/ and https://www.aboutamazon.com/more-from-amazon . Search links do not guarantee a seller ships to the selected address.
