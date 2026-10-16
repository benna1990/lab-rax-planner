/* Connect: how the parts in this build get power, network and air, as cards that appear only when the build needs them.
   Pure (tools/test-connect.mjs). Every fact comes from docs/audit/RESEARCH_SOURCES.md and carries its source; where nothing is
   documented, a card says so and points to the manual instead of guessing a pinout or a voltage. */
(function () {
const SRC = {
  piDocs: ['Raspberry Pi documentation: power supply', 'https://www.raspberrypi.com/documentation/computers/raspberry-pi.html'],
  pi27: ['Raspberry Pi 27 W USB-C power supply', 'https://www.raspberrypi.com/products/27w-power-supply/'],
  noctua: ['Noctua PWM specifications white paper', 'https://cdn.noctua.at/media/Noctua_PWM_specifications_white_paper.pdf'],
  labrax: ['Lab Rax upgrades and accessories (The DIY Life)', 'https://the-diy-life.com/lab-rax-upgrades-design-improvements-new-accessories-for-my-3d-printed-homelab/'],
  poe: ['Power over Ethernet (Wikipedia)', 'https://en.wikipedia.org/wiki/Power_over_Ethernet'],
  poeBudget: ['Westermo: PoE budget, allocated vs consumed', 'https://docs.westermo.com/weos/5/General/PoE'],
  logoCode: ['Lab Rax logo example code (GitHub)', 'https://github.com/mklements/LabRaxLogoIllumination'],
  adafruit: ['Adafruit NeoPixel Überguide: powering', 'https://learn.adafruit.com/adafruit-neopixel-uberguide/powering-neopixels'],
  wled: ['WLED: wiring', 'https://kno.wled.ge/advanced/wiring/'],
  wledHw: ['WLED: compatible hardware', 'https://kno.wled.ge/basics/compatible-hardware/'],
  ups: ['Anker SOLIX: UPS battery backup calculator', 'https://www.ankersolix.com/blogs/battery/battery-backup-calculator-for-ups']
};
const r1 = x => Math.round(x * 10) / 10;

/* facts: {
     devices: [{ name, poe, note }],              powered devices; poe: the name of the PoE source, or null for its own adapter; note overrides both
     fans: [{ name, qty, mm, volt, amp }],        from the parts' hardware (volt and amp as the catalog lists them)
     pi5, boards,                                 Raspberry Pi 5 boards, and all single-board computers
     poe: null | { budget, load, sources: [names] },
     logo: null | 'neopixel' | 'hexbar' | 'matrix',
     ups: null | { size, unit }
   } */
function cards(f) {
  const out = [];
  if ((f.devices || []).length) {
    const own = f.devices.filter(d => !d.poe && !d.note), onPoe = f.devices.filter(d => d.poe), other = f.devices.length - own.length - onPoe.length;
    out.push({ id: 'power', title: 'Power supplies and mains',
      lead: [own.length ? own.length + (own.length > 1 ? ' devices use their own adapter' : ' device uses its own adapter') : '', onPoe.length ? onPoe.length + ' run' + (onPoe.length > 1 ? '' : 's') + ' on PoE' : '', other ? other + ' more as noted' : ''].filter(Boolean).join('; ') + '.',
      items: f.devices.map(d => d.name + ': ' + (d.note || (d.poe ? 'PoE from ' + d.poe : d.own === false ? 'to buy: check what is included in the box; confirm its power input in the manual' : 'have it: use the adapter it came with; check its manual for the voltage and the plug'))),
      steps: ['Use the adapter that came with each device, or a certified replacement with the same voltage, polarity and plug.',
        'Plug everything into one commercially made power strip or PDU, so one switch turns the rack off.',
        'Don’t open, splice or extend mains cables, and don’t build mains wiring into printed parts.'],
      sources: [] });
  }
  if (f.pi5) out.push({ id: 'pi5', title: 'Raspberry Pi 5 power',
    lead: f.pi5 + (f.pi5 > 1 ? ' Pi 5 boards need' : ' Pi 5 needs') + ' ' + f.pi5 + (f.pi5 > 1 ? ' supplies' : ' supply') + ' of 5.1 V, 5 A (USB-C), or PoE through a PoE HAT.',
    steps: ['The official 27 W USB-C supply gives 5.1 V at 5 A. With any other supply the Pi limits its USB ports to 600 mA in total, and with a 3 A supply it doesn’t boot from USB by default.',
      'It needs at least 3 A at 5 V to boot at all.',
      'The fan header shares that USB current limit. Its pins (5 V, PWM, GND, tach on a 1 mm JST-SH) are in a different order than a PC fan’s, so never fit a PC fan plug without checking each wire.',
      'Over PoE: plan a PoE+ (802.3at) port per Pi and check the HAT maker’s figures; the HAT figures were not verified here.'],
    sources: [SRC.piDocs, SRC.pi27] });
  const fans = f.fans || [];
  if (fans.length) {
    const n = fans.reduce((s, x) => s + x.qty, 0), volts = [...new Set(fans.map(x => x.volt).filter(Boolean))], amp = fans.reduce((s, x) => s + x.qty * (x.amp || 0), 0), unknown = fans.some(x => !x.amp || !x.volt);
    out.push({ id: 'fans', title: 'Fans',
      lead: n + (n > 1 ? ' fans' : ' fan') + (volts.length === 1 ? ' at ' + volts[0] + ' V' : volts.length ? ' at ' + volts.join(' and ') + ' V' : '') + (amp ? ', about ' + r1(amp) + ' A together' + (unknown ? ' for the ones with a listed current' : '') : '') + '. Fan → hub or controller (for more than one fan, or speed control) → a supply with the same voltage.',
      items: fans.map(x => x.qty + '× ' + x.mm + ' mm in ' + x.name + (x.volt ? ' · ' + x.volt + ' V' : '') + (x.amp ? ' · ' + x.amp + ' A each' : '')),
      steps: ['Match the voltage printed on the fan to the supply or header: a 5 V fan on 12 V is destroyed.',
        'Wires: 2 = power only (always full speed), 3 adds a speed signal (tach), 4 adds PWM speed control.',
        'Add up the current printed on each fan and size the supply or hub for the total. The Lab Rax fan panels run from a 5 V adapter.',
        'PWM fans take a 25 kHz signal at 5 V logic; never put 12 V on the PWM pin (pin 4).',
        'Check pin 1 and the polarity of every plug before you power up.'],
      sources: [SRC.noctua, SRC.labrax, SRC.piDocs] });
  }
  if (f.poe) out.push({ id: 'poe', title: 'PoE',
    lead: 'This build gives ' + r1(f.poe.budget) + ' W of PoE' + (f.poe.sources.length ? ' from ' + f.poe.sources.join(', ') : '') + (f.poe.load > 0 ? ' and needs about ' + r1(f.poe.load) + ' W at full load.' : '; nothing in this build uses it yet.'),
    items: ['802.3af (PoE): 15.4 W at the switch port, 12.95 W at the device', '802.3at (PoE+): 30 W, 25.5 W at the device', '802.3bt (PoE++): 60 or 90 W, 51 or 71.3 W at the device'],
    steps: ['Switches reserve power by each device’s class, not by what it actually draws, so plan on the class maximum and keep some headroom.',
      'A device whose class you don’t know: plan the standard’s port maximum (15.4, 30, 60 or 90 W).'],
    sources: [SRC.poe, SRC.poeBudget] });
  if (f.logo === 'neopixel') out.push({ id: 'logo', title: 'Light-up logo (NeoPixel)',
    lead: 'Two 8-LED NeoPixel bars (16 LEDs, 5 V), driven by an ESP32 or Arduino. The author’s example code uses data pin D1 at brightness 60 of 255.',
    steps: ['Power: up to 60 mA per LED at full white, so up to about 1 A for 16; about 20 mA each in mixed colours.',
      'An ESP32 sends 3.3 V data, which may be too weak for 5 V LEDs; a level shifter such as the SN74AHCT125 fixes that.',
      'Join the grounds of the controller and the LEDs, and put a 500–1000 µF capacitor across the LED supply.',
      'Don’t draw more than 1 A through a controller board’s USB port; give the LEDs their own 5 V supply if they need more.'],
    sources: [SRC.labrax, SRC.logoCode, SRC.adafruit, SRC.wled, SRC.wledHw] });
  else if (f.logo) out.push({ id: 'logo', title: 'Lighting',
    lead: 'No documented wiring was found for this lighting part. Follow its model page; the planner doesn’t guess a wiring diagram.',
    steps: [], sources: [] });
  if (f.ups && f.ups.size) out.push({ id: 'ups', title: 'UPS',
    lead: 'Runtime is roughly the usable battery energy (Wh) × the UPS efficiency ÷ the load (W). The maker’s runtime chart for your model beats any estimate.',
    steps: ['VA is not watts: a UPS rated in VA carries fewer watts, and neither rating may be exceeded.', 'The planner’s runtime uses assumed battery and efficiency figures; treat it as an estimate.'],
    sources: [SRC.ups] });
  return out;
}
// every card in its general form, for the Guides: what applies to any build, without this build's numbers
function guides() {
  const lead = { power: 'Every device keeps the power adapter it came with, unless it runs on PoE.', pi5: 'Each Raspberry Pi 5 needs a 5.1 V, 5 A USB-C supply, or PoE through a PoE HAT.',
    fans: 'Fan → hub or controller (for more than one fan, or speed control) → a supply with the same voltage.', poe: 'How the PoE standards and a switch’s PoE budget work.' };
  return cards({ devices: [{ name: 'a device', poe: null }], pi5: 1, boards: 1, fans: [{ name: 'a fan panel', qty: 1, mm: 40, volt: 5, amp: 0.1 }], poe: { budget: 0, load: 0, sources: [] }, logo: 'neopixel', ups: { size: 1, unit: 'VA' } })
    .map(x => Object.assign({}, x, { lead: lead[x.id] || x.lead, items: x.id === 'poe' ? x.items : [] }));
}
window.LRConnect = { cards, guides };
})();
