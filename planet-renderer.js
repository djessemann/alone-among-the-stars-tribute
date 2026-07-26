/* =============================================================================
 * planet-renderer.js  —  Alone Among the Stars: 8-bit planet generator
 * -----------------------------------------------------------------------------
 * Self-contained, framework-agnostic. No dependencies, no DOM beyond the
 * <canvas> you hand it. Draws a pixel-art planet: a pixel circle fully covered
 * by flat color regions (one per journal entry), hard 3-tone shading bands
 * with checkerboard-dithered edges, and a 1-cell atmosphere ring.
 *
 * The renderer is the source of truth. Store only the seed data per game
 * (entries, salt) and re-render anywhere — name screen, archive, export.
 * Re-rendering the same data always yields the same planet.
 *
 *   import { renderPlanet, makePlanetSeed, planetToDataURL } from './planet-renderer.js';
 *
 * or, without modules, load this file with a <script> tag and use the global
 *   window.PlanetRenderer.{ renderPlanet, makePlanetSeed, planetToDataURL }
 * ===========================================================================*/

/* ----------------------------------------------------------------------------
 * INPUT SHAPE  (this is what you save per finished game — "the seed")
 * ----------------------------------------------------------------------------
 *   {
 *     entries: [ { suit: '♦'|'♣'|'♥'|'♠', rank: 'A'|'2'|...|'10'|'J'|'Q'|'K' }, ... ],
 *     salt:    <integer>            // fixes region placement; see makePlanetSeed()
 *   }
 * --------------------------------------------------------------------------*/

// ---- fixed vocabulary -------------------------------------------------------
const SUITS = {
  '♦': { name: 'Diamonds', hue: 150 },
  '♣': { name: 'Clubs',    hue: 45  },
  '♥': { name: 'Hearts',   hue: 320 },
  '♠': { name: 'Spades',   hue: 212 },
};
const RANKS = ['A','2','3','4','5','6','7','8','9','10','J','Q','K']; // value = index+1

// ---- LOCKED aesthetics ------------------------------------------------------
// Same for EVERY planet ("direction B — regional worlds"). If you retune,
// change here and every planet re-renders to match — nothing stores pixels.
const PIX = Object.freeze({
  grid:    40,     // cells across the canvas (the pixel resolution)
  radius:  0.42,   // sphere radius as a fraction of the grid
  spread:  0.64,   // how far regions drift from center (kept from old renderer)
  huePull: 0.35,   // how far card hues are pulled toward the planet's mean hue
  satLo:   38,     // saturation at rank A ...
  satHi:   68,     // ... and at rank K
  blend:   0.22,   // width of the dithered blend zone between regions
  toneT1:  0.40,   // light-distance threshold: bright → mid band
  toneT2:  0.66,   // light-distance threshold: mid → shadow band
  toneW:   0.045,  // dither width at each band boundary
});

// ---- seeded RNG (xmur3 + mulberry32) ---------------------------------------
function xmur3(str){let h=1779033703^str.length;for(let i=0;i<str.length;i++){h=Math.imul(h^str.charCodeAt(i),3432918353);h=h<<13|h>>>19;}return ()=>{h=Math.imul(h^h>>>16,2246822507);h=Math.imul(h^h>>>13,3266489909);return (h^=h>>>16)>>>0;};}
function mulberry32(a){return ()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};}
function rngFrom(str){const s=xmur3(str)();return mulberry32(s);}

function circularMeanHue(hues){
  let x = 0, y = 0;
  hues.forEach(h => { x += Math.cos(h * Math.PI/180); y += Math.sin(h * Math.PI/180); });
  return (Math.atan2(y, x) * 180/Math.PI + 360) % 360;
}
const hsl = (h, s, l) => `hsl(${Math.round((h+360)%360)} ${Math.round(s)}% ${Math.round(l)}%)`;

/* ----------------------------------------------------------------------------
 * renderPlanet(canvas, planet)
 *   canvas : an HTMLCanvasElement (or OffscreenCanvas). Its width/height define
 *            the output resolution; the planet is painted as a PIX.grid cell
 *            image and upscaled with nearest-neighbor, so it is crisp at any
 *            size (thumbnail or export) with no extra work.
 *   planet : { entries:[{suit,rank}], salt }
 *
 * Mapping rules (unchanged from the original renderer):
 *   suit → hue, rank → brightness/saturation/region size,
 *   entries.length → number of regions, salt → placement.
 * --------------------------------------------------------------------------*/
function renderPlanet(canvas, planet){
  const entries = planet.entries || [];
  const salt = planet.salt ?? 0;
  const N = PIX.grid;
  const cx = (N-1)/2, cy = (N-1)/2, R = N * PIX.radius;
  const rng = rngFrom('pos#' + salt);   // placement random per game (salt only)

  // one color region per entry: suit → hue, rank → strength/size/brightness
  const raw = entries.map(e => {
    const rankVal = RANKS.indexOf(e.rank) + 1;
    const t = (rankVal - 1) / 12;                       // 0..1 intensity
    const hue = (SUITS[e.suit].hue + (rankVal - 7) * 2 + 360) % 360;
    const ang = rng() * Math.PI * 2, dist = Math.sqrt(rng()) * R * PIX.spread;
    return { hue, t, x: cx + Math.cos(ang)*dist, y: cy + Math.sin(ang)*dist,
             r: R * (0.40 + 0.28*t), str: 0.7 + 0.5*t };
  });
  const baseHue = circularMeanHue(raw.length ? raw.map(n => n.hue) : [212]);
  // harmonize: pull each region's hue toward the planet's mean
  const nodes = raw.map(n => {
    const dh = ((n.hue - baseHue + 540) % 360) - 180;
    return { ...n, hue: baseHue + dh * (1 - PIX.huePull) };
  });
  // 3-tone palette (lit / mid / shadow) per region; rank drives brightness
  const nodePal = nodes.map(n => {
    const sat = PIX.satLo + (PIX.satHi - PIX.satLo) * n.t;
    const L = 34 + 24 * n.t;
    return [hsl(n.hue, sat, Math.min(76, L+15)), hsl(n.hue, sat, L),
            hsl(n.hue, sat+4, Math.max(13, L-15))];
  });
  const basePal = [hsl(baseHue,26,30), hsl(baseHue,28,22), hsl(baseHue,30,14)];
  const haloColor = hsl(baseHue, 38, 17);

  // paint the cell grid at native resolution
  const off = (typeof OffscreenCanvas !== 'undefined')
    ? new OffscreenCanvas(N, N)
    : Object.assign(document.createElement('canvas'), { width: N, height: N });
  const octx = off.getContext('2d');
  const lx = cx - R*0.55, ly = cy - R*0.55;             // light from upper-left

  for (let y = 0; y < N; y++){
    for (let x = 0; x < N; x++){
      const d = Math.hypot(x-cx, y-cy);
      if (d > R){                                        // outside the sphere
        if (d <= R + 1.1){ octx.fillStyle = haloColor; octx.fillRect(x, y, 1, 1); }
        continue;
      }
      // owning region: strongest weight wins; near-ties checker-blend
      let s1 = -1, w1 = 0, s2 = -1, w2 = 0;
      for (let i = 0; i < nodes.length; i++){
        const n = nodes[i];
        const nd = Math.hypot(x-n.x, y-n.y);
        const w = n.str / (1 + Math.pow(nd/n.r, 2));
        if (w > w1){ s2 = s1; w2 = w1; s1 = i; w1 = w; }
        else if (w > w2){ s2 = i; w2 = w; }
      }
      let src = s1;
      if (s2 >= 0 && (w1-w2)/w1 < PIX.blend && (x+y)%2 === 0) src = s2;
      // tone band from light distance, dithered at the boundaries
      const dl = Math.hypot(x-lx, y-ly) / (2.1*R);
      const { toneT1:T1, toneT2:T2, toneW:W } = PIX;
      let tone;
      if (dl < T1-W) tone = 0;
      else if (dl < T1+W) tone = ((x+y)%2===0) ? 0 : 1;
      else if (dl < T2-W) tone = 1;
      else if (dl < T2+W) tone = ((x+y)%2===0) ? 1 : 2;
      else tone = 2;
      octx.fillStyle = (src === -1) ? basePal[tone] : nodePal[src][tone];
      octx.fillRect(x, y, 1, 1);
    }
  }

  // nearest-neighbor upscale to the target canvas
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(off, 0, 0, N, N, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/* ----------------------------------------------------------------------------
 * makePlanetSeed(entries[, salt])
 *   Build the storable seed for a finished game. Pass the game's real entries.
 *   If you omit salt, a random one is generated — call this ONCE when the game
 *   ends and save the returned object; do not regenerate the salt later or the
 *   regions will move.
 * --------------------------------------------------------------------------*/
function makePlanetSeed(entries, salt){
  return {
    entries: entries.map(e => ({ suit: e.suit, rank: e.rank })),
    salt: (salt == null) ? Math.floor(Math.random()*99999) : salt,
  };
}

/* ----------------------------------------------------------------------------
 * planetToDataURL(planet[, size])
 *   Convenience: render off-screen at `size` px and return a PNG data URL.
 *   Flat-color pixel art compresses tiny (a few KB even at 512).
 * --------------------------------------------------------------------------*/
function planetToDataURL(planet, size = 512){
  const c = document.createElement('canvas');
  c.width = c.height = size;
  renderPlanet(c, planet);
  return c.toDataURL('image/png');
}

// ---- exports ----------------------------------------------------------------
export { renderPlanet, makePlanetSeed, planetToDataURL, SUITS, RANKS, PIX };

// Also expose a global for plain <script> usage (harmless under a bundler):
if (typeof window !== 'undefined') {
  window.PlanetRenderer = { renderPlanet, makePlanetSeed, planetToDataURL, SUITS, RANKS, PIX };
}
