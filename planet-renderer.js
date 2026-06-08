/* =============================================================================
 * planet-renderer.js  —  Alone Among the Stars: planet image generator
 * -----------------------------------------------------------------------------
 * Self-contained, framework-agnostic. No dependencies, no DOM beyond the
 * <canvas> you hand it. Produces the exact same image as the design playground
 * it was lifted from — the color math, intensity curve, placement RNG and grain
 * algorithm are copied verbatim, and the aesthetic values are LOCKED as the
 * constant AES below.
 *
 * The renderer is the source of truth. Store only the seed data per game
 * (nodeCount, entries, salt) and re-render anywhere — name screen, archive,
 * future export. Re-rendering the same data always yields the same planet.
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
 *     salt:    <integer>            // fixes node placement; see makePlanetSeed()
 *   }
 *
 * nodeCount is simply entries.length (the starting roll → how many nodes).
 * --------------------------------------------------------------------------*/

// ---- fixed vocabulary -------------------------------------------------------
const SUITS = {
  '♦': { name: 'Diamonds', hue: 150 },
  '♣': { name: 'Clubs',    hue: 45  },
  '♥': { name: 'Hearts',   hue: 320 },
  '♠': { name: 'Spades',   hue: 212 },
};
const SUIT_KEYS = Object.keys(SUITS);
const RANKS = ['A','2','3','4','5','6','7','8','9','10','J','Q','K']; // value = index+1

// ---- LOCKED aesthetics ------------------------------------------------------
// These are the same for EVERY planet. Tuned in the playground; do not vary at
// runtime. (If you ever retune, change them here and every planet re-renders to
// match, because nothing stores pixels — only seeds.)
const AES = Object.freeze({
  blur:    64,        // node softness (px at 1024 reference; scaled by size)
  scale:   100,       // node size (%)
  opacity: 90,        // node glow ceiling (%)
  spread:  64,        // how far nodes drift from center (%)
  dark:    12,        // base sphere darkness
  blend:   'screen',  // node blend mode
  atmo:    55,        // atmosphere halo (%)
  grain:   45,        // printed-grain amount (%)
  shade:   60,        // spherical shading (%)
});

// ---- seeded RNG (xmur3 + mulberry32) ---------------------------------------
function xmur3(str){let h=1779033703^str.length;for(let i=0;i<str.length;i++){h=Math.imul(h^str.charCodeAt(i),3432918353);h=h<<13|h>>>19;}return ()=>{h=Math.imul(h^h>>>16,2246822507);h=Math.imul(h^h>>>13,3266489909);return (h^=h>>>16)>>>0;};}
function mulberry32(a){return ()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};}
function rngFrom(str){const s=xmur3(str)();return mulberry32(s);}

// ---- mapping rules ----------------------------------------------------------
// suit  -> hue        (fixed per suit, + a tiny per-rank jitter so same-suit
//                      nodes vary a touch)
// rank  -> intensity  (Ace = faint, King = blazing): scales node opacity,
//                      lightness and saturation together.
// count -> number of nodes (entries.length)
// salt  -> placement  (random per game, independent of suit/rank)
function nodeColor(entry){
  const suit = SUITS[entry.suit];
  const rankVal = RANKS.indexOf(entry.rank) + 1;
  const t = (rankVal - 1) / 12;                 // 0..1 intensity
  const hue = (suit.hue + (rankVal - 7) * 2 + 360) % 360;
  const sat = 52 + 38 * t;                       // 52..90
  const light = 42 + 22 * t;                     // 42..64
  const intensity = 0.68 + 0.50 * t;             // 0.68..1.18 (boosted base)
  return { hue, sat, light, intensity };
}
function sizeFrac(){ return 0.30; }              // uniform node size (× AES.scale)
function circularMeanHue(hues){
  let x = 0, y = 0;
  hues.forEach(h => { x += Math.cos(h * Math.PI/180); y += Math.sin(h * Math.PI/180); });
  return (Math.atan2(y, x) * 180/Math.PI + 360) % 360;
}

/* ----------------------------------------------------------------------------
 * renderPlanet(canvas, planet)
 *   canvas : an HTMLCanvasElement (or OffscreenCanvas). Its width/height define
 *            the render resolution — set them before calling, independent of
 *            on-screen display size (use CSS to size the element on screen).
 *            Use a larger canvas for crisp exports, a smaller one for thumbs.
 *   planet : { entries:[{suit,rank}], salt }
 *
 * Draws on a transparent background (the sphere + halo only). Drop it onto the
 * game's dark backdrop. Resolution-independent: same planet at any size.
 * --------------------------------------------------------------------------*/
function renderPlanet(canvas, planet){
  const entries = planet.entries || [];
  const salt = planet.salt ?? 0;

  const ctx = canvas.getContext('2d');
  // Sphere radius leaves margin around the globe so the atmosphere halo can
  // fade fully to zero before the canvas edge (no hard square cutoff).
  const S = canvas.width, cx = S/2, cy = S/2, R = S * 0.36;
  ctx.clearRect(0, 0, S, S);

  const rng = rngFrom('pos#' + salt);   // placement random per game (salt only)
  const colors = entries.map(nodeColor);
  const baseHue = circularMeanHue(colors.map(c => c.hue));

  // atmosphere halo (behind globe). Outer radius (1.35·R ≈ 0.49·S) stays inside
  // the canvas so the glow fades to zero before the edge instead of being
  // clipped into a square. The falloff curve is sharp — bright at the rim,
  // dropping fast — so the glow reads strong without needing to spill over.
  if (AES.atmo > 0){
    const a = AES.atmo/100;
    const g = ctx.createRadialGradient(cx, cy, R*0.5, cx, cy, R*1.35);
    g.addColorStop(0,    `hsla(${baseHue},85%,64%,${0.85*a})`);
    g.addColorStop(0.55, `hsla(${baseHue},85%,63%,${0.62*a})`);
    g.addColorStop(0.78, `hsla(${baseHue},80%,58%,${0.18*a})`);
    g.addColorStop(1,    `hsla(${baseHue},78%,56%,0)`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
  }

  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.clip();

  // base sphere
  const sh01 = AES.shade/100;
  const bx = cx - R*0.28*sh01, by = cy - R*0.28*sh01;
  const base = ctx.createRadialGradient(bx, by, R*0.1, cx, cy, R*1.05);
  base.addColorStop(0, `hsl(${baseHue},32%,${AES.dark+6}%)`);
  base.addColorStop(1, `hsl(${baseHue},38%,${Math.max(3, AES.dark-5)}%)`);
  ctx.fillStyle = base; ctx.fillRect(cx-R, cy-R, 2*R, 2*R);

  // nodes (blurred blobs, blended). blur scales with resolution so a thumbnail
  // and a large export look identical, not differently-soft.
  const blurPx = AES.blur * (S/1024);
  ctx.globalCompositeOperation = AES.blend;
  entries.forEach((e, i) => {
    const c = colors[i];
    const ang = rng()*Math.PI*2, dist = Math.sqrt(rng())*R*(AES.spread/100);
    const nx = cx + Math.cos(ang)*dist, ny = cy + Math.sin(ang)*dist;
    const baseR = R * sizeFrac() * (AES.scale/100);
    const blobs = 2 + Math.floor(rng()*2);
    const op = Math.min(1, (AES.opacity/100) * c.intensity);  // rank drives strength
    for (let b = 0; b < blobs; b++){
      ctx.save();
      ctx.filter = `blur(${blurPx}px)`;
      const jx = nx + (rng()-0.5)*baseR*0.8, jy = ny + (rng()-0.5)*baseR*0.8;
      const rr = baseR * (0.6 + rng()*0.6);
      const h = c.hue + (rng()-0.5)*16;
      const g = ctx.createRadialGradient(jx, jy, 0, jx, jy, rr);
      g.addColorStop(0,   `hsla(${h},${c.sat}%,${c.light}%,${op})`);
      g.addColorStop(0.6, `hsla(${h},${c.sat}%,${c.light}%,${op/2})`);
      g.addColorStop(1,   `hsla(${h},${c.sat}%,${c.light}%,0)`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(jx, jy, rr, 0, 7); ctx.fill();
      ctx.restore();
    }
  });
  ctx.globalCompositeOperation = 'source-over';

  // sphere shading (terminator + highlight)
  if (AES.shade > 0){
    const s = AES.shade/100;
    const sh = ctx.createRadialGradient(cx-R*0.32, cy-R*0.32, R*0.12, cx+R*0.3, cy+R*0.34, R*1.35);
    sh.addColorStop(0, 'rgba(0,0,0,0)');
    sh.addColorStop(0.5, `rgba(0,0,0,${0.30*s})`);
    sh.addColorStop(1, `rgba(0,0,0,${0.95*s})`);
    ctx.fillStyle = sh; ctx.fillRect(cx-R, cy-R, 2*R, 2*R);
    const hl = ctx.createRadialGradient(cx-R*0.34, cy-R*0.36, 0, cx-R*0.34, cy-R*0.36, R*0.85);
    hl.addColorStop(0, `rgba(255,255,255,${0.30*s})`); hl.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = hl; ctx.fillRect(cx-R, cy-R, 2*R, 2*R);
  }

  // grain — perturbs the ACTUAL rendered pixels with fine tonal noise of the
  // local color (lighter/darker, hue kept) so it reads as the gradients being
  // printed on toothy paper. Densest in shadow/transition, eased in bright cores.
  if (AES.grain > 0){
    const gA = AES.grain/100, gC = Math.pow(gA, 1.5);
    const samp = ctx.getImageData(0, 0, S, S).data;
    const target = Math.floor(R*R*(0.10 + 0.65*gC)), R2 = R*R, unit = S/1024;
    let drawn = 0, guard = target*4;
    while (drawn < target && guard-- > 0){
      const fx = cx + (rng()-0.5)*2*R, fy = cy + (rng()-0.5)*2*R;
      const dx = fx-cx, dy = fy-cy; if (dx*dx + dy*dy > R2) continue;
      const idx = (((fy|0)*S) + (fx|0))*4;
      const r = samp[idx], g = samp[idx+1], b = samp[idx+2];
      const L = (0.299*r + 0.587*g + 0.114*b)/255;
      const tone = 0.25 + 0.95*Math.pow(1-L, 1.2);
      if (rng() > tone) continue;
      const amp = (0.16 + 0.74*gC)*(0.30 + 0.70*(1-L));
      let delta = (rng()*2 - 1)*amp;
      if (L < 0.10) delta = Math.abs(delta);
      const f = 1 + delta;
      const nr = Math.max(0, Math.min(255, r*f)), ng = Math.max(0, Math.min(255, g*f)), nb = Math.max(0, Math.min(255, b*f));
      const sz = (0.6 + rng()*0.9)*unit;
      ctx.globalAlpha = 0.5 + 0.4*rng();
      ctx.fillStyle = `rgb(${nr|0},${ng|0},${nb|0})`;
      ctx.fillRect(fx, fy, sz, sz);
      drawn++;
    }
    ctx.globalAlpha = 1;
  }
  ctx.restore();

  // thin atmospheric rim
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7);
  ctx.strokeStyle = `hsla(${baseHue},60%,75%,0.18)`; ctx.lineWidth = S*0.004; ctx.stroke();

  return canvas;
}

/* ----------------------------------------------------------------------------
 * makePlanetSeed(entries[, salt])
 *   Build the storable seed for a finished game. Pass the game's real entries.
 *   If you omit salt, a random one is generated — call this ONCE when the game
 *   ends and save the returned object; do not regenerate the salt later or the
 *   nodes will move.
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
 *   Handy for <img src> on the archive, or a future "save my planet" export.
 * --------------------------------------------------------------------------*/
function planetToDataURL(planet, size = 512){
  const c = document.createElement('canvas');
  c.width = c.height = size;
  renderPlanet(c, planet);
  return c.toDataURL('image/png');
}

// ---- exports ----------------------------------------------------------------
// ES module exports:
export { renderPlanet, makePlanetSeed, planetToDataURL, SUITS, RANKS, AES };

// Also expose a global for plain <script> usage (harmless under a bundler):
if (typeof window !== 'undefined') {
  window.PlanetRenderer = { renderPlanet, makePlanetSeed, planetToDataURL, SUITS, RANKS, AES };
}
