/* Mini Rack Planner — shared Lab Rax dimensions in millimetres. MIT licensed.
   Geometry values are preserved from the existing planner, not newly verified.
   Clear width/hole spacing: Lab Rax creator article (README sources).
   Outer envelope and decorative frame sizes remain estimates; no cutting template. */
(function () {
'use strict';
const dimensions = Object.freeze({
  u: 44.45, holeSpacing: 236.525, clearWidth: 222, panelWidth: 250,
  panelClearance: 0.79, cutoutSpan: 212, depth: 240, outerWidth: 280,
  sideBeam: 170, topPanel: Object.freeze([228, 171.5]),
  holeY: Object.freeze([6.35, 22.225, 38.1])
});
const frame = Object.freeze({
  clear: dimensions.clearWidth,          // clear width between the posts (10" standard)
  outer: dimensions.outerWidth,          // outer width = 222 + 2·26 posts + 2·3 side panels
  depth: dimensions.depth,          // outer depth front to back
  ring: 32,            // width of the top and bottom rings seen from above (estimate)
  top: 36,             // top ring height (estimate)
  topBevel: 20,        // 45° bevel along the top ring; the front one carries the hex grille and logo (estimate)
  bottom: 14,          // bottom ring height (estimate)
  bottomBevel: 8,      // 45° bevel along the bottom ring (estimate)
  post: 26,            // post width seen from the front; the holes sit 7.26 mm from its inner edge
  postDepth: 20,       // post depth (estimate)
  side: 3,             // side, top and bottom panels: 3 mm acrylic, plywood or print
  handleLen: 0.53,     // handle length as a share of the depth (≈127 mm)
  handleH: 34,         // handle height above the top (estimate)
  handleW: 12,         // handle thickness; it sits on the flat strip of the top ring (estimate)
  foot: 8              // foot height (estimate)
});
window.LRRack = Object.freeze({ dimensions, frame });
})();
