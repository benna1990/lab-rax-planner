/* Build readiness: is this rack ready to build, and what is still missing? A pure function of facts that app.js gathers
   (see readyFacts there), so it runs in Node too (tools/test-ready.mjs). Each check says what it is, why it matters and how
   to fix it, and belongs to one of the six steps: 1 rack, 2 hardware, 3 connect, 4 check, 5 print & assemble, 6 export.
   States: 'todo' (a choice still to make), 'warn' (a problem that stops the build), 'info' (true, but unverified), 'ok'. */
(function () {
const plural = (n, one, many) => n + ' ' + (n === 1 ? one : many);

/* facts: {
     parts, unplaced, clashes, clashId, overlaps, overlapId,          counts, and a part to show
     printer: null | { name, bad, turned },                           the chosen printer and the prints too big for it
     cooling: { level: 'none' | 'cool' | 'warm' | 'hot', maxT },      the cooling estimate
     power: [{ level: 'short' | 'tight' | 'info', text }],            from power.js issues()
     estimated, market                                                parts with an estimated height; the shop country's name
   } */
function checks(f) {
  const out = [], add = (id, step, state, title, why, fix) => out.push({ id, step, state, title, why: why || '', fix: fix || null });
  // 2 hardware
  if (!f.parts) add('parts', 2, 'todo', 'Add your hardware', 'The rack is empty. Start with the devices you own; the planner suggests a printed mount for each.', { act: 'go-step', step: 2, label: 'Add hardware' });
  else add('parts', 2, 'ok', plural(f.parts, 'part', 'parts') + ' in the rack');
  if (f.unplaced) add('unplaced', 2, 'warn', plural(f.unplaced, 'part doesn’t fit', 'parts don’t fit'), 'They aren’t in the rack, the print list or the shopping list. Make the rack taller, or remove something.', { act: 'go-unplaced', label: 'Show' });
  if (f.clashes) add('clash', 2, 'warn', plural(f.clashes, 'part runs', 'parts run') + ' into a part on the other side', 'A front and a rear part at the same height are together deeper than the inside of the rack, so they can’t both be mounted there.', { act: 'go-part', id: f.clashId, label: 'Show' });
  if (f.overlaps) add('overlap', 2, 'warn', f.overlaps === 1 ? 'A ½U part overlaps its neighbour' : f.overlaps + ' ½U parts overlap each other', 'A ½U Lab Rax panel is a little taller than half a U (measured from the model), so two of them in one U can’t both be screwed in.', { act: 'go-part', id: f.overlapId, label: 'Show' });
  // 1 rack and 5 print
  if (!f.printer) add('printer', 1, 'todo', 'Pick your 3D printer', 'Then the planner checks that every part fits your print bed.', { act: 'go-printer', label: 'Pick printer' });
  else if (f.printer.bad) add('printer', 5, 'warn', plural(f.printer.bad, 'print is', 'prints are') + ' too big for your ' + f.printer.name, 'Use a variant made for smaller beds, split the part, or print it elsewhere.', { act: 'go-step', step: 5, label: 'Show prints' });
  else add('printer', 1, 'ok', 'Every print fits your ' + f.printer.name + (f.printer.turned ? ' (some only diagonally)' : ''));
  // 3 connect
  const c = f.cooling || { level: 'none' };
  if (c.level === 'hot') add('cooling', 3, 'warn', 'Too hot inside: about ' + Math.round(c.maxT) + ' °C', 'Above what typical electronics are rated for. Add a fan panel, open the back or use a vented top.', { act: 'go-step', step: 3, label: 'See cooling' });
  else if (c.level === 'warm') add('cooling', 3, 'warn', 'Warm inside: about ' + Math.round(c.maxT) + ' °C', 'Within limits but warm. A fan panel or a vented top keeps the parts cooler and longer-lived.', { act: 'go-step', step: 3, label: 'See cooling' });
  else if (c.level === 'cool') add('cooling', 3, 'ok', 'Cooling: about ' + Math.round(c.maxT) + ' °C inside');
  const short = (f.power || []).filter(x => x.level === 'short');
  if (short.length) short.forEach((x, i) => add('power' + i, 3, 'warn', x.text, '', { act: 'go-step', step: 3, label: 'See power' }));
  else if (f.parts) add('power', 3, 'ok', 'Power, PoE and network ports add up');
  // 4 what is still an estimate
  if (f.estimated) add('estimated', 4, 'info', plural(f.estimated, 'part has', 'parts have') + ' an estimated height (≈)', 'Check the height on the model page before you print.');
  add('frame', 4, 'info', 'Frame sizes are estimates', 'The 3D frame comes from photos and a few measured models. A test print of one panel confirms the fit.');
  // 1 where the shopping list links to
  add('country', 1, 'ok', 'Shop links for ' + (f.market || 'your country'), '', { act: 'go-country', label: 'Change' });
  return out;
}
function summary(list) {
  const n = s => list.filter(x => x.state === s).length;
  return { ready: !n('todo') && !n('warn'), todo: n('todo'), warn: n('warn'), info: n('info'), ok: n('ok') };
}
// the worst state among a step's checks, for the dot on the step bar
function stepState(list, step) {
  const s = list.filter(x => x.step === step).map(x => x.state);
  return s.includes('warn') ? 'warn' : s.includes('todo') ? 'todo' : s.length && s.every(x => x === 'ok' || x === 'info') ? 'ok' : '';
}
window.LRReady = { checks, summary, stepState };
})();
