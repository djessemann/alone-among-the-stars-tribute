/* app.src.jsx — editable JSX source for the app (was inline in index.html).
   This is the file to edit. Recompile to app.js (loaded by index.html) with:
     npx @babel/cli@7 --presets @babel/preset-react app.src.jsx > app.js
   React 18 classic runtime; React/ReactDOM are global (vendored UMD builds). */
const {
  useState,
  useEffect,
  useRef,
  useMemo
} = React;

/* ============================================================
   CONTENT / BUILDING BLOCKS  (mirrors content/copy.md)
   ============================================================ */
const SUITS = {
  diamonds: {
    glyph: '♦',
    red: true,
    phrase: 'some kind of living being'
  },
  clubs: {
    glyph: '♣',
    red: false,
    phrase: 'a plant or other immobile life'
  },
  hearts: {
    glyph: '♥',
    red: true,
    phrase: 'mysterious civilizational ruins'
  },
  spades: {
    glyph: '♠',
    red: false,
    phrase: 'a strange natural phenomenon'
  }
};
const SUIT_ORDER = ['diamonds', 'clubs', 'hearts', 'spades'];
const RANKS = {
  A: 'in a field taller than you',
  '2': 'under the light of the moon(s)',
  '3': 'by a gentle river',
  '4': 'in a steep canyon',
  '5': 'in a treetop',
  '6': 'on the snowy peak of a mountain',
  '7': 'near a volcano',
  '8': 'on a glacier',
  '9': 'deep underground',
  '10': 'on a cliff face',
  J: 'in the desert',
  Q: 'in deep water',
  K: 'floating in the air'
};
const RANK_ORDER = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

// Discovery circumstance by the per-card roll (1-2 / 3-4 / 5-6)
function outcomeForRoll(roll) {
  if (roll <= 2) return 'arduous';
  if (roll <= 4) return 'sudden';
  return 'resting';
}
// Prepended to the suit + location phrase to open the writing prompt.
const DISCOVERY_INTRO = {
  arduous: 'After a long and arduous journey, you come upon',
  sudden: 'All of the sudden, you come upon',
  resting: "As you're resting, you spot"
};
function seePart(card) {
  const intro = DISCOVERY_INTRO[outcomeForRoll(card.roll)];
  return `${intro} ${SUITS[card.suit].phrase} ${RANKS[card.rank]}.`;
}
function fullPrompt(card) {
  return `${seePart(card)} Describe it in your journal.`;
}
const ABOUT_TEXT = `*******************
Alone Among the Stars
By Takuma Okada (noroadhome.itch.io)
A solo roleplaying game about exploring fantastic planets

A digital tribute by Jesse Mann
*******************

You are a solitary adventurer, hopping from planet to planet exploring. Each world has unique features for you to discover and record. They are represented by cards from a standard deck, placed face down.

To find a new planet, roll a six-sided die and place cards face down equal to the number rolled.

To flip over a card to discover something, roll a six-sided die:
On a 1-2 it is arduous to get to.
On a 3-4 you come upon it suddenly.
On a 5-6 you spot it as you are resting.

The suit and rank determine the discovery. In your ship's log (this digital journal), record a short description and your reaction in a few sentences, and roll for the next card. Each time you finish exploring a planet, sketch something you saw there (if you want), give the planet a number or a name, and find a new one.

Play until you are tired, and want to return home. If you want to remember your travels, save the journal. If the memories bring you pain, burn it.

What the suits and ranks mean:
♦ Diamonds — living beings: people like or unlike you, fish, dinosaurs, wolves, birds, giant insects, etc.
♣ Clubs — plants and other immobile life: towering trees, carnivorous pitchers, giant ferns, glowing weeds, floating flowers, oozing mushrooms, etc.
♥ Hearts — ruins: mysterious obelisks, vine-covered temples, abandoned dwellings, a wrecked spaceship, etc.
♠ Spades — natural phenomena: huge crystal formations, mirages, vividly colored lightning, strange clouds, eroded rocks, veins of precious metals, etc.

Ace: In a field taller than you.
2: Under the light of the moon(s).
3: By a gentle river.
4: In a steep canyon.
5: In a treetop.
6: On the snowy peak of a mountain.
7: Near a volcano.
8: On a glacier.
9: Deep underground.
10: On a cliff face.
Jack: In the desert.
Queen: In deep water.
King: Floating in the air.`;
const NAME_LIMIT = 20;
const STORE_KEY = 'aats.archive';

/* ============================================================
   HELPERS
   ============================================================ */
function buildDeck() {
  const deck = [];
  for (const suit of SUIT_ORDER) for (const rank of RANK_ORDER) deck.push({
    rank,
    suit
  });
  return deck;
}
function deal(n) {
  const deck = buildDeck();
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck.slice(0, n).map(c => ({
    ...c,
    body: '',
    done: false
  }));
}
function randomPlanetColor() {
  const hue = Math.floor(Math.random() * 360);
  const sat = 60 + Math.floor(Math.random() * 35); // 60–95
  const light = 45 + Math.floor(Math.random() * 25); // 45–70
  return `hsl(${hue} ${sat}% ${light}%)`;
}
// Map the app's card shape (suit:'diamonds'…, rank:'A'…) to the planet
// renderer's shape (suit:'♦'…, rank:'A'…). One node per discovered card.
function cardsToEntries(cards) {
  return (cards || []).map(c => ({
    suit: SUITS[c.suit] && SUITS[c.suit].glyph || c.suit,
    rank: c.rank
  }));
}
// The planet seed for an archived record. New records carry their own
// `planetSeed`. For older ones (saved before this feature) we rebuild it from
// their stored journal entries, deriving a stable salt from the record id so
// the placement never shifts between renders.
function stableSalt(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % 99999;
}
function seedForRecord(p) {
  if (p.planetSeed && p.planetSeed.entries) return p.planetSeed;
  return {
    entries: cardsToEntries(p.entries || []),
    salt: stableSalt(String(p.id || p.name || ''))
  };
}
function fmtDate(ms) {
  const d = new Date(ms);
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}
function loadArchive() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY)) || [];
  } catch (e) {
    return [];
  }
}
function saveArchive(arr) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(arr));
  } catch (e) {}
}
function downloadBlob(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

/* ============================================================
   JOURNAL EXPORT — a shareable "ship's log" PNG for one planet,
   and a versioned .json backup of the whole archive.
   ============================================================ */
const ARCHIVE_FORMAT = 'aats-archive';
const ARCHIVE_VERSION = 1;

/* Export palette/metrics: the app's look at 1080px wide. All sizes are the
   in-app thumbnail sizes scaled ×2.7 (46px card → 124px, etc.). */
const EXP = {
  W: 1080,
  PAD: 92,
  ink: '#f2f0ea',
  dim: '#8a8a8a',
  line: '#2a2a2a',
  card: '#f5f3ee',
  cardInk: '#111',
  cardRed: '#c4322b',
  bevel: '#d9d5c9',
  shadow: '#23231f'
};

// Word-wrap `text` to maxW using the font currently set on ctx.
// Explicit newlines in journal bodies are preserved.
function expWrap(ctx, text, maxW) {
  const lines = [];
  for (const para of String(text || '').split('\n')) {
    let line = '';
    for (const w of para.split(' ')) {
      const t = line ? line + ' ' + w : w;
      if (line && ctx.measureText(t).width > maxW) {
        lines.push(line);
        line = w;
      } else line = t;
    }
    lines.push(line);
  }
  return lines;
}

// The pixel-notched rectangle (the CSS box-shadow trick, on canvas): a w×h
// rect whose edges extend by b, leaving the corner cells uncovered.
function expNotched(ctx, x, y, w, h, b, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x - b, y, w + 2 * b, h);
  ctx.fillRect(x, y - b, w, h + 2 * b);
}
function expDrawDie(ctx, x, y, value) {
  const D = 130,
    b = 5,
    off = 8;
  expNotched(ctx, x + off, y + off, D, D, b, EXP.shadow);
  expNotched(ctx, x, y, D, D, b, EXP.card);
  ctx.fillStyle = EXP.bevel; // bottom-right bevel
  ctx.fillRect(x + D - 8, y, 8, D);
  ctx.fillRect(x, y + D - 8, D, 8);
  const layouts = {
    1: [4],
    2: [0, 8],
    3: [0, 4, 8],
    4: [0, 2, 6, 8],
    5: [0, 2, 4, 6, 8],
    6: [0, 2, 3, 5, 6, 8]
  };
  const on = new Set(layouts[value] || []);
  const pad = 16,
    gap = 5,
    pip = 19;
  const cell = (D - 2 * pad - 2 * gap) / 3;
  ctx.fillStyle = '#111';
  for (let i = 0; i < 9; i++) {
    if (!on.has(i)) continue;
    const cx = x + pad + i % 3 * (cell + gap) + cell / 2;
    const cy = y + pad + Math.floor(i / 3) * (cell + gap) + cell / 2;
    ctx.fillRect(Math.round(cx - pip / 2), Math.round(cy - pip / 2), pip, pip);
  }
}
function expDrawCard(ctx, x, y, rank, suit) {
  const Cw = 124,
    Ch = 178,
    b = 5,
    off = 8;
  expNotched(ctx, x + off, y + off, Cw, Ch, b, EXP.shadow);
  expNotched(ctx, x, y, Cw, Ch, b, EXP.card);
  ctx.fillStyle = SUITS[suit].red ? EXP.cardRed : EXP.cardInk;
  ctx.font = '27px "Press Start 2P", monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(rank, x + 14, y + 14);
  ctx.textBaseline = 'alphabetic';
  const map = PIXEL_SPRITES[suit],
    px = 4;
  const sw = map[0].length * px,
    sh = map.length * px;
  const sx = Math.round(x + (Cw - sw) / 2),
    sy = Math.round(y + (Ch - sh) / 2 + 15);
  map.forEach((row, ry) => {
    for (let rx = 0; rx < row.length; rx++) if (row[rx] === '#') ctx.fillRect(sx + rx * px, sy + ry * px, px, px);
  });
}

// A sparse band of the app's pixel sparkles across the top of the log.
function expDrawStars(ctx, W) {
  const gold = '#e8c98a',
    blue = '#a8c2eb';
  const plot = (x, y, cells, cellPx, color) => {
    ctx.fillStyle = color;
    cells.forEach(([cx, cy, w, h]) => ctx.fillRect(Math.round(x + cx * cellPx), Math.round(y + cy * cellPx), w * cellPx, h * cellPx));
  };
  const big = [[3, 0, 1, 7], [0, 3, 7, 1], [2, 2, 3, 3]]; // 4-arm star with a solid core
  const cross = [[2, 0, 1, 5], [0, 2, 5, 1]];
  const plus = [[1, 0, 1, 3], [0, 1, 3, 1]];
  const dot = [[0, 0, 1, 1]];
  plot(W * 0.16, 52, big, 5, gold);
  plot(W * 0.78, 92, cross, 4, gold);
  plot(W * 0.62, 34, plus, 5, blue);
  plot(W * 0.34, 118, plus, 5, blue);
  plot(W * 0.48, 76, dot, 5, blue);
  plot(W * 0.90, 58, dot, 5, gold);
}

/* One code path, two passes: with measureOnly the same layout runs without
   painting, returning the final height — so the canvas is sized exactly. */
function paintJournalExport(ctx, p, sketchImg, measureOnly) {
  const {
      W,
      PAD
    } = EXP,
    CW = W - 2 * PAD;
  const draw = !measureOnly;
  if (draw) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, ctx.canvas.height);
  }
  if (draw) expDrawStars(ctx, W);
  let y = 150; // star band
  const PSIZE = 560; // the planet, hero of the log
  if (draw) {
    const pc = document.createElement('canvas');
    pc.width = pc.height = 512;
    if (window.PlanetRenderer) window.PlanetRenderer.renderPlanet(pc, seedForRecord(p));
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(pc, (W - PSIZE) / 2, y, PSIZE, PSIZE);
  }
  y += PSIZE + 78;
  ctx.textAlign = 'center';
  ctx.font = '46px "Press Start 2P", monospace';
  if (draw) {
    ctx.fillStyle = EXP.ink;
    ctx.fillText(p.name.toUpperCase(), W / 2, y + 46);
  }
  y += 46 + 40;
  ctx.font = 'italic 30px "Space Mono", monospace';
  const sub = `Explored ${fmtDate(p.createdAt)} · ${p.entries.length} ${p.entries.length === 1 ? 'entry' : 'entries'}`;
  if (draw) {
    ctx.fillStyle = EXP.dim;
    ctx.fillText(sub, W / 2, y + 30);
  }
  y += 30 + 64;
  ctx.textAlign = 'left';
  if (draw) {
    ctx.fillStyle = EXP.line;
    ctx.fillRect(PAD, y, CW, 3);
  }
  y += 3;
  p.entries.forEach((e, i) => {
    if (i > 0) {
      if (draw) {
        ctx.fillStyle = EXP.line;
        ctx.fillRect(PAD, y, CW, 3);
      }
      y += 3;
    }
    y += 56;
    const headH = 178; // die + card, die centered on the card
    if (draw) {
      if (e.roll) expDrawDie(ctx, PAD + 6, y + (headH - 130) / 2, e.roll);
      expDrawCard(ctx, PAD + 6 + 130 + 36, y, e.rank, e.suit);
    }
    y += headH + 40;
    // the discovery prompt, without the "Describe it…" instruction —
    // context the app carries implicitly, needed on a standalone artifact
    const promptText = (e.prompt || '').replace(/\s*Describe it in your journal\.\s*$/, '');
    if (promptText) {
      ctx.font = 'italic 30px "Space Mono", monospace';
      const lines = expWrap(ctx, promptText, CW);
      if (draw) {
        ctx.fillStyle = EXP.dim;
        lines.forEach((ln, k) => ctx.fillText(ln, PAD, y + 30 + k * 46));
      }
      y += lines.length * 46 + 26;
    }
    if (e.body) {
      ctx.font = '32px "Space Mono", monospace';
      const lines = expWrap(ctx, e.body, CW);
      if (draw) {
        ctx.fillStyle = EXP.ink;
        lines.forEach((ln, k) => ctx.fillText(ln, PAD, y + 32 + k * 56));
      }
      y += lines.length * 56;
    }
    y += 48;
  });
  if (sketchImg) {
    y += 24;
    const sh = Math.round(CW * sketchImg.height / sketchImg.width);
    if (draw) {
      ctx.fillStyle = EXP.shadow;
      ctx.fillRect(PAD + 13, y + 13, CW, sh);
      ctx.fillStyle = EXP.card;
      ctx.fillRect(PAD, y, CW, sh);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(sketchImg, PAD, y, CW, sh);
    }
    y += sh + 26;
  }
  return y + 66;
}
async function renderJournalExport(p) {
  if (document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch (e) {}
  }
  const sketchImg = p.sketch ? await new Promise(res => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => res(null);
    img.src = p.sketch;
  }) : null;
  const measure = document.createElement('canvas');
  measure.width = measure.height = 1;
  const H = Math.ceil(paintJournalExport(measure.getContext('2d'), p, sketchImg, true));
  const canvas = document.createElement('canvas');
  canvas.width = EXP.W;
  canvas.height = H;
  paintJournalExport(canvas.getContext('2d'), p, sketchImg, false);
  return canvas;
}

/* ============================================================
   PRESENTATIONAL COMPONENTS
   ============================================================ */
/* 8-bit sprites: one '#' = one on-pixel, drawn as SVG rects with crispEdges
   so they stay sharp at every size (CSS scales them per card variant). */
const PIXEL_SPRITES = {
  hearts: ['.#####..#####.', '##############', '##############', '##############', '##############', '.############.', '..##########..', '...########...', '....######....', '.....####.....', '......##......'],
  diamonds: ['......##......', '.....####.....', '....######....', '...########...', '..##########..', '.############.', '##############', '##############', '.############.', '..##########..', '...########...', '....######....', '.....####.....', '......##......'],
  spades: ['.....##.....', '.....##.....', '....####....', '...######...', '..########..', '..########..', '.##########.', '############', '############', '############', '.###.##.###.', '.....##.....', '.....##.....', '....####....', '...######...'],
  clubs: ['.....####.....', '....######....', '....######....', '....######....', '....######....', '.....####.....', '.####.##.####.', '##############', '##############', '##############', '.####.##.####.', '......##......', '......##......', '.....####.....', '....######....'],
  star: ['...#...', '...#...', '..###..', '#######', '..###..', '...#...', '...#...'],
  home: ['...##...', '..####..', '.######.', '########', '.######.', '.##..##.', '.##..##.', '........'],
  /* sketch tools + help: cream line-art (the button's background shows
     through hollow bodies), reinterpreted from reference pixel art */
  pencil: ['..........##...', '.........#..#..', '........#....#.', '.......#.....#.', '......#.....#..', '.....#.....#...', '....#.....#....', '...#.....#.....', '..#.....#......', '.#.....#.......', '.#....#........', '.##..#.........', '.####..........'],
  eraser: ['......###...', '.....#...#..', '....#.....#.', '...#......##', '..#......###', '.#......####', '###....####.', '####..####..', '#########...', '.#######....', '..#####.....', '...###......'],
  undo: ['.....#####...', '...#########.', '...#########.', '..###.....###', '..###.....###', '#######...###', '######.......', '.####........', '..##.........'],
  qmark: ['..######..', '.########.', '###....###', '###....###', '.......###', '......###.', '.....###..', '....###...', '....###...', '..........', '....###...', '....###...']
};

/* px = size of one sprite cell in CSS pixels. When given, the svg gets
   explicit dimensions so differently-proportioned sprites share one cell
   scale (uniform pixel density). Without it, CSS controls the size.
   flip renders the sprite rotated 180° (for bottom-half card pips). */
function PixelGlyph({
  name,
  px,
  flip
}) {
  let map = PIXEL_SPRITES[name];
  if (flip) map = [...map].reverse().map(r => r.split('').reverse().join(''));
  const w = map[0].length,
    h = map.length;
  const rects = [];
  map.forEach((row, y) => {
    for (let x = 0; x < w; x++) if (row[x] === '#') rects.push(/*#__PURE__*/React.createElement("rect", {
      key: `${x}-${y}`,
      x: x,
      y: y,
      width: "1",
      height: "1"
    }));
  });
  return /*#__PURE__*/React.createElement("svg", {
    viewBox: `0 0 ${w} ${h}`,
    width: px ? w * px : undefined,
    height: px ? h * px : undefined,
    shapeRendering: "crispEdges",
    fill: "currentColor",
    "aria-hidden": "true"
  }, rects);
}

/* Traditional playing-card pip arrangements for 2–10:
   [column 0=left 1=center 2=right, y 0..1 within the pip area, flipped].
   Ace and face cards keep the single large suit sprite instead. */
const PIP_LAYOUTS = {
  '2': [[1, 0], [1, 1, 1]],
  '3': [[1, 0], [1, .5], [1, 1, 1]],
  '4': [[0, 0], [2, 0], [0, 1, 1], [2, 1, 1]],
  '5': [[0, 0], [2, 0], [1, .5], [0, 1, 1], [2, 1, 1]],
  '6': [[0, 0], [2, 0], [0, .5], [2, .5], [0, 1, 1], [2, 1, 1]],
  '7': [[0, 0], [2, 0], [1, .25], [0, .5], [2, .5], [0, 1, 1], [2, 1, 1]],
  '8': [[0, 0], [2, 0], [1, .25], [0, .5], [2, .5], [1, .75, 1], [0, 1, 1], [2, 1, 1]],
  '9': [[0, 0], [2, 0], [0, 1 / 3], [2, 1 / 3], [1, .5], [0, 2 / 3, 1], [2, 2 / 3, 1], [0, 1, 1], [2, 1, 1]],
  '10': [[0, 0], [2, 0], [1, 1 / 6], [0, 1 / 3], [2, 1 / 3], [0, 2 / 3, 1], [2, 2 / 3, 1], [1, 5 / 6, 1], [0, 1, 1], [2, 1, 1]]
};

/* Intro-screen crescent moon: '#' = light-yellow fill, 'x' = olive outline
   and plus-shaped crater pixels. Right-facing crescent, 28x28 grid. */
const MOON_SPRITE = ['............................', '.........xxxxxxx............', '.......xx#####x.............', '......x######x..............', '....xx#######x..............', '....x#######x...............', '...x########x...............', '..x#####x###x...............', '..x####xxx##x...............', '.x######x###x...............', '.x##########x...............', '.x##########x...............', '.x##########x...............', '.x##########x...............', '.x###########x..............', '.x####x######x..............', '.x###xxx######x.............', '.x####x########x............', '.x##############x...........', '..x##############xxx........', '..x#################xxxxxx..', '...x######x#############x...', '....x####xxx###########x....', '....xx####x###########xx....', '......x##############x......', '.......xx##########xx.......', '.........xxxxxxxxxx.........', '............................'];
const MOON_FILL = '#f2e88f',
  MOON_SHADE = '#b3a659';
function PixelMoon({
  size = 120
}) {
  const rects = [];
  MOON_SPRITE.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      if (row[x] === '.') continue;
      rects.push(/*#__PURE__*/React.createElement("rect", {
        key: `${x}-${y}`,
        x: x,
        y: y,
        width: "1",
        height: "1",
        fill: row[x] === '#' ? MOON_FILL : MOON_SHADE
      }));
    }
  });
  return /*#__PURE__*/React.createElement("svg", {
    className: "moon",
    viewBox: `0 0 ${MOON_SPRITE[0].length} ${MOON_SPRITE.length}`,
    width: size,
    height: size,
    shapeRendering: "crispEdges",
    "aria-hidden": "true"
  }, rects);
}
function Card({
  card,
  faceUp,
  variant = '',
  selected = false,
  onClick
}) {
  const cls = ['card', variant];
  if (selected) cls.push('selected');
  if (faceUp) {
    const s = SUITS[card.suit];
    cls.push('face');
    if (s.red) cls.push('red');
    // one shared cell scale per context so all four suits render at the same
    // pixel density despite different sprite proportions
    const isReveal = variant === 'reveal-card',
      isThumb = variant === 'thumb';
    if (isThumb) {
      /* thumbs: rank-only corner (no mini suit) + centered suit sprite */
      return /*#__PURE__*/React.createElement("div", {
        className: cls.join(' '),
        onClick: onClick
      }, /*#__PURE__*/React.createElement("span", {
        className: "corner tl"
      }, /*#__PURE__*/React.createElement("span", {
        className: "r"
      }, card.rank)), /*#__PURE__*/React.createElement("span", {
        className: "center-glyph"
      }, /*#__PURE__*/React.createElement(PixelGlyph, {
        name: card.suit,
        px: 1.35
      })));
    }
    /* One proportional layout for grid + reveal cards: every measurement
       derives from card width, so both sizes are exact scales of one design.
       Corners carry the rank only; the suit lives in the pip spread (2–10)
       or the single large sprite (A/J/Q/K). */
    const W = isReveal ? 188 : 96,
      H = isReveal ? 272 : 140;
    const inset = W * 0.067,
      font = W * 0.0933,
      pipPx = W * 0.009,
      bigPx = W * 0.0307;
    const layout = PIP_LAYOUTS[card.rank];
    let middle;
    if (layout) {
      const map = PIXEL_SPRITES[card.suit];
      const pipW = map[0].length * pipPx,
        pipH = map.length * pipPx;
      const mx = W * 0.25,
        my = H * 0.215,
        areaW = W - 2 * mx,
        areaH = H - 2 * my;
      middle = layout.map(([c, t, f], i) => /*#__PURE__*/React.createElement("span", {
        key: i,
        className: "pip-spot",
        style: {
          position: 'absolute',
          left: mx + c * (areaW / 2) - pipW / 2,
          top: my + t * areaH - pipH / 2
        }
      }, /*#__PURE__*/React.createElement(PixelGlyph, {
        name: card.suit,
        px: pipPx,
        flip: !!f
      })));
    } else {
      middle = /*#__PURE__*/React.createElement("span", {
        className: "center-glyph"
      }, /*#__PURE__*/React.createElement(PixelGlyph, {
        name: card.suit,
        px: bigPx
      }));
    }
    return /*#__PURE__*/React.createElement("div", {
      className: cls.join(' '),
      onClick: onClick
    }, /*#__PURE__*/React.createElement("span", {
      className: "corner tl",
      style: {
        top: inset,
        left: inset,
        fontSize: font
      }
    }, card.rank), middle, /*#__PURE__*/React.createElement("span", {
      className: "corner br",
      style: {
        bottom: inset,
        right: inset,
        fontSize: font
      }
    }, card.rank));
  }
  cls.push('back');
  return /*#__PURE__*/React.createElement("div", {
    className: cls.join(' '),
    onClick: onClick
  }, /*#__PURE__*/React.createElement(PixelGlyph, {
    name: "star"
  }));
}
function Die({
  value,
  rolling,
  variant = ''
}) {
  // pip layout per face
  const layouts = {
    1: [4],
    2: [0, 8],
    3: [0, 4, 8],
    4: [0, 2, 6, 8],
    5: [0, 2, 4, 6, 8],
    6: [0, 2, 3, 5, 6, 8]
  };
  const on = new Set(layouts[value] || []);
  return /*#__PURE__*/React.createElement("div", {
    className: ['die', variant, rolling ? 'rolling' : ''].filter(Boolean).join(' ')
  }, Array.from({
    length: 9
  }).map((_, i) => /*#__PURE__*/React.createElement("span", {
    key: i
  }, on.has(i) ? /*#__PURE__*/React.createElement("span", {
    className: "pip"
  }) : null)));
}
function Chrome({
  onHome,
  onHelp
}) {
  // Always render both slots so the bar's space-between keeps Home pinned left
  // and Help pinned right even when only one of them is present.
  return /*#__PURE__*/React.createElement("div", {
    className: "chrome-bar"
  }, onHome ? /*#__PURE__*/React.createElement("button", {
    className: "chrome home",
    "aria-label": "Home",
    onClick: onHome
  }, /*#__PURE__*/React.createElement(PixelGlyph, {
    name: "home",
    px: 2.4
  })) : /*#__PURE__*/React.createElement("span", {
    className: "chrome-spacer",
    "aria-hidden": "true"
  }), onHelp ? /*#__PURE__*/React.createElement("button", {
    className: "chrome help",
    "aria-label": "Help",
    onClick: onHelp
  }, /*#__PURE__*/React.createElement(PixelGlyph, {
    name: "qmark",
    px: 1.5
  })) : /*#__PURE__*/React.createElement("span", {
    className: "chrome-spacer",
    "aria-hidden": "true"
  }));
}

/* A rendered planet. Draws onto a <canvas> via the planet renderer, sized to
   its CSS box (retina-aware). `seed` is { entries, salt }. If the renderer is
   somehow unavailable, falls back to a flat colored disc. */
function Planet({
  seed,
  size = 256,
  fallbackColor,
  style,
  className = 'planet-canvas'
}) {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const cssW = c.clientWidth || size;
    const px = Math.round(cssW * Math.min(window.devicePixelRatio || 1, 2));
    c.width = c.height = Math.max(64, px);
    if (window.PlanetRenderer && seed) {
      window.PlanetRenderer.renderPlanet(c, seed);
    } else if (fallbackColor) {
      const ctx = c.getContext('2d'),
        S = c.width;
      ctx.clearRect(0, 0, S, S);
      ctx.fillStyle = fallbackColor;
      ctx.beginPath();
      ctx.arc(S / 2, S / 2, S * 0.42, 0, 7);
      ctx.fill();
    }
  }, [seed, fallbackColor, size]);
  return /*#__PURE__*/React.createElement("canvas", {
    ref: ref,
    className: className,
    style: style
  });
}

/* ============================================================
   APP
   ============================================================ */
function App() {
  const [screen, setScreen] = useState('title');
  const [overlay, setOverlay] = useState(null); // 'help' | 'home' | 'burn' | 'goback'
  const [archive, setArchive] = useState(loadArchive);

  // in-progress journey (ephemeral — not persisted)
  const [session, setSession] = useState(null);
  const [activeIndex, setActiveIndex] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(null); // card picked on cardSelect, awaiting roll
  const [draftText, setDraftText] = useState('');
  const [editingExisting, setEditingExisting] = useState(false);

  // dice rolling animation
  const [rolling, setRolling] = useState(false);
  const [dieFace, setDieFace] = useState(1);

  // archive viewing
  const [viewId, setViewId] = useState(null);
  const [toast, setToast] = useState(null); // message string, or null

  // export / share
  const [sharing, setSharing] = useState(false);
  const restoreInputRef = useRef(null);
  const allDone = session && session.cards.every(c => c.done);
  const remaining = session ? session.cards.filter(c => !c.done).length : 0;

  // Planet seeds. The live session's seed (for the name screen) and a stable
  // map of seeds for archived records, so canvases don't re-derive on every
  // render. Placement is fixed by the saved salt → same planet everywhere.
  const sessionSeed = useMemo(() => session ? {
    entries: cardsToEntries(session.cards.filter(c => c.done)),
    salt: session.salt
  } : null, [session]);
  const archiveSeeds = useMemo(() => {
    const m = {};
    for (const p of archive) m[p.id] = seedForRecord(p);
    return m;
  }, [archive]);

  /* ---------- navigation helpers ---------- */
  function startJourney() {
    setSession(null);
    setScreen('intro');
  }
  function goTitle() {
    setSession(null);
    setActiveIndex(null);
    setSelectedIndex(null);
    setDraftText('');
    setOverlay(null);
    setScreen('title');
  }

  // first roll — only sets how many points of interest the planet holds.
  // jumps straight to the result screen and shakes the die there (same as the
  // card roll) before the final number settles in.
  function rollDice() {
    setScreen('diceResult');
    setRolling(true);
    const spin = setInterval(() => setDieFace(1 + Math.floor(Math.random() * 6)), 90);
    setTimeout(() => {
      clearInterval(spin);
      const roll = 1 + Math.floor(Math.random() * 6);
      setDieFace(roll);
      setRolling(false);
      setSession({
        roll,
        color: randomPlanetColor(),
        salt: Math.floor(Math.random() * 99999),
        // fixes planet node placement
        cards: deal(roll)
      });
    }, 850);
  }

  // tapping a card on cardSelect: revisit finished ones, otherwise pick (toggle) it
  function tapCard(i) {
    if (session.cards[i].done) {
      setActiveIndex(i);
      setScreen('revisit');
    } else {
      setSelectedIndex(prev => prev === i ? null : i);
    }
  }

  // second roll — accompanies the picked card and shapes its discovery prompt
  function rollForCard() {
    if (selectedIndex === null) return;
    const idx = selectedIndex;
    setActiveIndex(idx);
    setSelectedIndex(null);
    setScreen('cardReveal');
    setRolling(true);
    const spin = setInterval(() => setDieFace(1 + Math.floor(Math.random() * 6)), 90);
    setTimeout(() => {
      clearInterval(spin);
      const roll = 1 + Math.floor(Math.random() * 6);
      setDieFace(roll);
      setRolling(false);
      setSession(s => {
        const cards = s.cards.slice();
        cards[idx] = {
          ...cards[idx],
          roll
        };
        return {
          ...s,
          cards
        };
      });
    }, 850);
  }
  function startWriting() {
    setDraftText(session.cards[activeIndex].body || '');
    setEditingExisting(session.cards[activeIndex].done);
    setScreen('journalEntry');
  }
  function saveEntry() {
    setSession(s => {
      const cards = s.cards.slice();
      cards[activeIndex] = {
        ...cards[activeIndex],
        body: draftText,
        done: true
      };
      return {
        ...s,
        cards
      };
    });
    setActiveIndex(null);
    setScreen('cardSelect');
  }

  // optional sketch screen, between "finished exploring" and "name the planet"
  function finishSketch(dataURL) {
    setSession(s => ({
      ...s,
      sketch: dataURL
    }));
    setScreen('namePlanet');
  }
  function skipSketch() {
    setSession(s => ({
      ...s,
      sketch: null
    }));
    setScreen('namePlanet');
  }
  function publishPlanet(name) {
    const entries = session.cards.filter(c => c.done).map(c => ({
      rank: c.rank,
      suit: c.suit,
      roll: c.roll,
      prompt: fullPrompt(c),
      body: c.body
    }));
    const planet = {
      id: 'p' + Date.now() + Math.floor(Math.random() * 1000),
      name: name.trim(),
      color: session.color,
      roll: session.roll,
      createdAt: Date.now(),
      entries,
      // The planet image seed: one node per discovered card, placement fixed by
      // the session salt so the archive shows the same planet as the name screen.
      planetSeed: {
        entries: cardsToEntries(session.cards.filter(c => c.done)),
        salt: session.salt
      },
      sketch: session.sketch || null
    };
    const next = [planet, ...archive];
    setArchive(next);
    saveArchive(next);
    setSession(null);
    setActiveIndex(null);
    setSelectedIndex(null);
    setDraftText('');
    setScreen('archive');
  }

  /* ---------- share / save / restore ---------- */
  // Renders the ship's-log PNG and hands it to the native share sheet
  // (mobile); where files can't be shared, downloads it instead.
  async function shareJournal(p) {
    if (sharing) return;
    setSharing(true);
    try {
      const canvas = await renderJournalExport(p);
      const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
      const slug = (p.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'journal';
      const file = new File([blob], slug + '-log.png', {
        type: 'image/png'
      });
      if (navigator.canShare && navigator.canShare({
        files: [file]
      })) {
        try {
          await navigator.share({
            files: [file]
          });
        } catch (err) {
          if (!err || err.name !== 'AbortError') downloadBlob(blob, file.name);
        }
      } else {
        downloadBlob(blob, file.name);
      }
    } catch (e) {/* export failed; leave the journal untouched */} finally {
      setSharing(false);
    }
  }
  function exportArchive() {
    const payload = {
      format: ARCHIVE_FORMAT,
      version: ARCHIVE_VERSION,
      exportedAt: new Date().toISOString(),
      planetCount: archive.length,
      planets: archive
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json'
    });
    const d = new Date(),
      p2 = n => String(n).padStart(2, '0');
    downloadBlob(blob, `alone-among-the-stars-archive-${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}.json`);
  }
  function requestRestore() {
    if (restoreInputRef.current) restoreInputRef.current.click();
  }
  // Merge by planet id: restoring the same file twice is harmless, and a
  // restore never removes journeys already on the device.
  function onRestoreFile(ev) {
    const f = ev.target.files && ev.target.files[0];
    ev.target.value = ''; // allow re-picking the same file
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      let planets = null;
      try {
        const data = JSON.parse(reader.result);
        if (data && data.format === ARCHIVE_FORMAT && Array.isArray(data.planets)) planets = data.planets;else if (Array.isArray(data)) planets = data; // a raw archive array also restores
      } catch (e) {}
      if (!planets) {
        setToast("This doesn't look like a ship's log.");
        return;
      }
      const valid = planets.filter(p => p && p.id && p.name && Array.isArray(p.entries));
      const have = new Set(archive.map(p => p.id));
      const fresh = valid.filter(p => !have.has(p.id));
      if (fresh.length === 0) {
        setToast('Nothing new to restore.');
        return;
      }
      const next = [...fresh, ...archive].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setArchive(next);
      saveArchive(next);
      setToast(`${fresh.length} ${fresh.length === 1 ? 'journey' : 'journeys'} restored.`);
    };
    reader.readAsText(f);
  }
  function burnSession() {
    setOverlay(null);
    goTitle();
  }
  function burnPlanet(id) {
    const next = archive.filter(p => p.id !== id);
    setArchive(next);
    saveArchive(next);
    setOverlay(null);
    setViewId(null);
    setScreen('archive');
  }

  /* ---------- home button behavior ---------- */
  // gameplay screens show home → confirmation; archive/fullJournal handle their own.
  const gameplayScreens = ['intro', 'diceResult', 'cardSelect', 'cardReveal', 'journalEntry', 'revisit', 'sketch', 'namePlanet'];
  const showChrome = gameplayScreens.includes(screen) || screen === 'archive';
  function onHome() {
    if (screen === 'archive' || screen === 'fullJournal') {
      goTitle();
    } else {
      setOverlay('home');
    }
  }

  /* ============================================================
     SCREEN RENDERERS
     ============================================================ */
  function renderTitle() {
    return /*#__PURE__*/React.createElement("div", {
      className: "screen fade-in"
    }, /*#__PURE__*/React.createElement("div", {
      className: "sky"
    }), /*#__PURE__*/React.createElement("div", {
      className: "center",
      style: {
        gap: 0
      }
    }, /*#__PURE__*/React.createElement("h1", null, "Alone", /*#__PURE__*/React.createElement("br", null), "Among", /*#__PURE__*/React.createElement("br", null), "the Stars"), /*#__PURE__*/React.createElement("div", {
      className: "byline"
    }, "By Takuma Okada"), /*#__PURE__*/React.createElement("div", {
      className: "tagline",
      style: {
        marginTop: '48px'
      }
    }, "A solo journaling RPG about exploring fantastic planets"), /*#__PURE__*/React.createElement("div", {
      className: "btn-stack",
      style: {
        marginTop: '56px'
      }
    }, /*#__PURE__*/React.createElement("button", {
      className: "btn primary",
      onClick: startJourney
    }, "Embark"), /*#__PURE__*/React.createElement("button", {
      className: "btn",
      onClick: () => {
        setToast(null);
        setScreen('archive');
      }
    }, "Archive"))), /*#__PURE__*/React.createElement(Chrome, {
      onHelp: () => setOverlay('help')
    }));
  }
  function renderIntro() {
    return /*#__PURE__*/React.createElement("div", {
      className: "screen with-chrome fade-in"
    }, /*#__PURE__*/React.createElement("div", {
      className: "sky"
    }), /*#__PURE__*/React.createElement("div", {
      className: "center"
    }, /*#__PURE__*/React.createElement(PixelMoon, null), /*#__PURE__*/React.createElement("p", {
      className: "narration",
      style: {
        marginTop: '48px'
      }
    }, "You're in your ship, drifting peacefully in space\u2026"), /*#__PURE__*/React.createElement("p", {
      className: "instruction"
    }, "Roll your dice to look for a planet."), /*#__PURE__*/React.createElement("div", {
      className: "btn-stack",
      style: {
        marginTop: '40px'
      }
    }, /*#__PURE__*/React.createElement("button", {
      className: "btn primary",
      onClick: rollDice
    }, "Roll"))), /*#__PURE__*/React.createElement(Chrome, {
      onHome: onHome,
      onHelp: () => setOverlay('help')
    }));
  }
  function renderDiceResult() {
    const settled = !rolling && session;
    return /*#__PURE__*/React.createElement("div", {
      className: "screen with-chrome fade-in"
    }, /*#__PURE__*/React.createElement("div", {
      className: "center anchored"
    }, /*#__PURE__*/React.createElement(Die, {
      value: settled ? session.roll : dieFace,
      rolling: rolling
    }), settled && /*#__PURE__*/React.createElement("p", {
      className: "flavor",
      style: {
        marginTop: '40px'
      }
    }, "You spot a planet. Ship sensors show ", session.roll, " ", session.roll === 1 ? 'point' : 'points', " of interest."), settled && /*#__PURE__*/React.createElement("div", {
      className: "btn-stack",
      style: {
        marginTop: '24px'
      }
    }, /*#__PURE__*/React.createElement("button", {
      className: "btn primary",
      onClick: () => setScreen('cardSelect')
    }, "Explore"))), /*#__PURE__*/React.createElement(Chrome, {
      onHome: onHome,
      onHelp: () => setOverlay('help')
    }));
  }
  function renderCardSelect() {
    return /*#__PURE__*/React.createElement("div", {
      className: "screen with-chrome fade-in"
    }, /*#__PURE__*/React.createElement("div", {
      className: "center",
      style: {
        justifyContent: 'center',
        gap: '32px'
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "card-grid"
    }, session.cards.map((c, i) => /*#__PURE__*/React.createElement(Card, {
      key: i,
      card: c,
      faceUp: c.done,
      selected: selectedIndex === i,
      onClick: () => tapCard(i)
    }))), allDone ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("p", {
      className: "instruction",
      style: {
        marginTop: '4px'
      }
    }, "You're finished exploring this planet. What to do with your journal?"), /*#__PURE__*/React.createElement("div", {
      className: "btn-stack",
      style: {
        marginTop: '8px'
      }
    }, /*#__PURE__*/React.createElement("button", {
      className: "btn primary",
      onClick: () => setScreen('sketch')
    }, "Keep it"), /*#__PURE__*/React.createElement("button", {
      className: "btn danger",
      onClick: () => setOverlay('burn')
    }, "Burn it"))) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("p", {
      className: "flavor"
    }, remaining === session.roll ? `You land. ${remaining} ${remaining === 1 ? 'point' : 'points'} of interest remain${remaining === 1 ? 's' : ''}.` : `${remaining} ${remaining === 1 ? 'point' : 'points'} of interest remain${remaining === 1 ? 's' : ''}.`), /*#__PURE__*/React.createElement("p", {
      className: "instruction"
    }, "Pick a card, then roll."), /*#__PURE__*/React.createElement("div", {
      className: "btn-stack",
      style: {
        marginTop: '8px'
      }
    }, /*#__PURE__*/React.createElement("button", {
      className: "btn primary",
      disabled: selectedIndex === null,
      style: {
        opacity: selectedIndex === null ? .4 : 1
      },
      onClick: rollForCard
    }, "Roll")))), /*#__PURE__*/React.createElement(Chrome, {
      onHome: onHome,
      onHelp: () => setOverlay('help')
    }));
  }
  function renderCardReveal() {
    const card = session.cards[activeIndex];
    const settled = !rolling && !!card.roll;
    return /*#__PURE__*/React.createElement("div", {
      className: "screen with-chrome fade-in"
    }, /*#__PURE__*/React.createElement("div", {
      className: "center anchored"
    }, /*#__PURE__*/React.createElement("div", {
      className: "reveal-row"
    }, /*#__PURE__*/React.createElement(Die, {
      value: settled ? card.roll : dieFace,
      rolling: rolling,
      variant: "mid"
    }), settled ? /*#__PURE__*/React.createElement(Card, {
      card: card,
      faceUp: true,
      variant: "reveal-card"
    }) : /*#__PURE__*/React.createElement("div", {
      className: "card back reveal-card"
    }, /*#__PURE__*/React.createElement(PixelGlyph, {
      name: "star"
    }))), settled && /*#__PURE__*/React.createElement("p", {
      className: "flavor",
      style: {
        marginTop: '36px'
      }
    }, seePart(card)), settled && /*#__PURE__*/React.createElement("p", {
      className: "instruction"
    }, "Describe it in your journal."), settled && /*#__PURE__*/React.createElement("div", {
      className: "btn-stack",
      style: {
        marginTop: '24px'
      }
    }, /*#__PURE__*/React.createElement("button", {
      className: "btn primary",
      onClick: startWriting
    }, "Start writing"))), /*#__PURE__*/React.createElement(Chrome, {
      onHome: onHome,
      onHelp: () => setOverlay('help')
    }));
  }
  function renderJournalEntry() {
    const card = session.cards[activeIndex];
    return /*#__PURE__*/React.createElement("div", {
      className: "screen fade-in"
    }, /*#__PURE__*/React.createElement("div", {
      className: "entry-header"
    }, /*#__PURE__*/React.createElement(Die, {
      value: card.roll,
      variant: "thumb"
    }), /*#__PURE__*/React.createElement(Card, {
      card: card,
      faceUp: true,
      variant: "thumb"
    }), /*#__PURE__*/React.createElement("div", {
      className: "htext"
    }, seePart(card))), /*#__PURE__*/React.createElement("textarea", {
      className: "entry-field",
      placeholder: "Start your entry...",
      value: draftText,
      autoFocus: true,
      onChange: e => setDraftText(e.target.value)
    }), /*#__PURE__*/React.createElement("div", {
      className: "entry-actions"
    }, /*#__PURE__*/React.createElement("button", {
      className: "btn",
      onClick: () => {
        const original = card.body || '';
        if (draftText !== original) setOverlay('goback');else setScreen(editingExisting ? 'revisit' : 'cardSelect');
      }
    }, "Go back"), /*#__PURE__*/React.createElement("button", {
      className: "btn primary",
      onClick: saveEntry
    }, "Save")));
  }
  function renderRevisit() {
    const card = session.cards[activeIndex];
    return /*#__PURE__*/React.createElement("div", {
      className: "screen fade-in"
    }, /*#__PURE__*/React.createElement("div", {
      className: "entry-header"
    }, /*#__PURE__*/React.createElement(Die, {
      value: card.roll,
      variant: "thumb"
    }), /*#__PURE__*/React.createElement(Card, {
      card: card,
      faceUp: true,
      variant: "thumb"
    }), /*#__PURE__*/React.createElement("div", {
      className: "htext"
    }, seePart(card))), /*#__PURE__*/React.createElement("div", {
      className: "grow",
      style: {
        marginTop: '18px',
        overflowY: 'auto'
      }
    }, /*#__PURE__*/React.createElement("p", {
      className: "fj-body selectable"
    }, card.body)), /*#__PURE__*/React.createElement("div", {
      className: "entry-actions"
    }, /*#__PURE__*/React.createElement("button", {
      className: "btn",
      onClick: () => {
        setActiveIndex(null);
        setScreen('cardSelect');
      }
    }, "Go back"), /*#__PURE__*/React.createElement("button", {
      className: "btn primary",
      onClick: startWriting
    }, "Edit")));
  }
  function renderSketch() {
    return /*#__PURE__*/React.createElement(SketchScreen, {
      onAdd: finishSketch,
      onSkip: skipSketch,
      onBack: () => setScreen('cardSelect'),
      onHome: onHome,
      onHelp: () => setOverlay('help')
    });
  }
  function renderNamePlanet() {
    return /*#__PURE__*/React.createElement(NamePlanet, {
      seed: sessionSeed,
      color: session.color,
      onFinish: publishPlanet,
      onBack: () => setScreen('sketch'),
      onHome: onHome,
      onHelp: () => setOverlay('help')
    });
  }
  function renderArchive() {
    return /*#__PURE__*/React.createElement("div", {
      className: "screen with-chrome fade-in"
    }, /*#__PURE__*/React.createElement("div", {
      className: "archive-title heading"
    }, "Journal archive"), archive.length === 0 ? /*#__PURE__*/React.createElement("div", {
      className: "center"
    }, /*#__PURE__*/React.createElement("p", {
      className: "empty-archive"
    }, "No journeys yet. Embark to find your first planet."), /*#__PURE__*/React.createElement("button", {
      className: "btn small",
      style: {
        marginTop: '22px'
      },
      onClick: requestRestore
    }, "Restore archive")) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      className: "archive-grid"
    }, archive.map(p => /*#__PURE__*/React.createElement("div", {
      key: p.id,
      className: "planet-module",
      onClick: () => {
        setViewId(p.id);
        setScreen('fullJournal');
      }
    }, /*#__PURE__*/React.createElement(Planet, {
      seed: archiveSeeds[p.id],
      fallbackColor: p.color,
      size: 240,
      style: {
        width: 'min(34vw,120px)',
        height: 'min(34vw,120px)'
      }
    }), /*#__PURE__*/React.createElement("div", {
      className: "pname"
    }, p.name), /*#__PURE__*/React.createElement("div", {
      className: "pdate"
    }, fmtDate(p.createdAt))))), /*#__PURE__*/React.createElement("div", {
      className: "archive-util"
    }, /*#__PURE__*/React.createElement("button", {
      className: "btn small",
      onClick: exportArchive
    }, "Save archive"), /*#__PURE__*/React.createElement("button", {
      className: "btn small",
      onClick: requestRestore
    }, "Restore"))), /*#__PURE__*/React.createElement("input", {
      ref: restoreInputRef,
      type: "file",
      accept: ".json,application/json",
      style: {
        display: 'none'
      },
      onChange: onRestoreFile
    }), toast && /*#__PURE__*/React.createElement("div", {
      className: "toast"
    }, /*#__PURE__*/React.createElement("span", null, toast), /*#__PURE__*/React.createElement("button", {
      "aria-label": "Dismiss",
      onClick: () => setToast(null)
    }, "\u2715")), /*#__PURE__*/React.createElement(Chrome, {
      onHome: onHome,
      onHelp: () => setOverlay('help')
    }));
  }
  function renderFullJournal() {
    const p = archive.find(x => x.id === viewId);
    if (!p) {
      return renderArchive();
    }
    return /*#__PURE__*/React.createElement("div", {
      className: "screen fade-in"
    }, /*#__PURE__*/React.createElement("button", {
      className: "close-x",
      "aria-label": "Close",
      onClick: () => {
        setToast(null);
        setScreen('archive');
      }
    }, "\u2715"), /*#__PURE__*/React.createElement("div", {
      className: "fj-header"
    }, /*#__PURE__*/React.createElement(Planet, {
      seed: seedForRecord(p),
      fallbackColor: p.color,
      size: 256,
      style: {
        width: 96,
        height: 96,
        flex: '0 0 auto'
      }
    }), /*#__PURE__*/React.createElement("div", {
      className: "fj-meta"
    }, /*#__PURE__*/React.createElement("div", {
      className: "pn"
    }, p.name), /*#__PURE__*/React.createElement("div", null, "Explored ", fmtDate(p.createdAt)), /*#__PURE__*/React.createElement("div", null, p.entries.length, " ", p.entries.length === 1 ? 'entry' : 'entries'))), /*#__PURE__*/React.createElement("div", {
      className: "grow",
      style: {
        overflowY: 'auto',
        paddingTop: '8px'
      }
    }, p.entries.map((e, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      className: "fj-entry"
    }, /*#__PURE__*/React.createElement("div", {
      className: "fj-entry-head"
    }, e.roll ? /*#__PURE__*/React.createElement(Die, {
      value: e.roll,
      variant: "thumb"
    }) : null, /*#__PURE__*/React.createElement(Card, {
      card: e,
      faceUp: true,
      variant: "thumb"
    })), /*#__PURE__*/React.createElement("div", {
      className: "fj-body selectable"
    }, e.body))), p.sketch && /*#__PURE__*/React.createElement("div", {
      className: "fj-entry"
    }, /*#__PURE__*/React.createElement("img", {
      className: "journal-sketch",
      src: p.sketch,
      alt: "Sketch from the journey"
    }))), /*#__PURE__*/React.createElement("div", {
      className: "fj-actions-row"
    }, /*#__PURE__*/React.createElement("button", {
      className: "btn danger",
      onClick: () => setOverlay('burn')
    }, "Burn journal"), /*#__PURE__*/React.createElement("button", {
      className: "btn primary",
      disabled: sharing,
      style: {
        opacity: sharing ? .4 : 1
      },
      onClick: () => shareJournal(p)
    }, "Share")));
  }

  /* ---------- overlays ---------- */
  function renderOverlay() {
    if (overlay === 'help') {
      return /*#__PURE__*/React.createElement("div", {
        className: "overlay"
      }, /*#__PURE__*/React.createElement("button", {
        className: "close-x",
        "aria-label": "Close",
        onClick: () => setOverlay(null)
      }, "\u2715"), /*#__PURE__*/React.createElement("div", {
        className: "help-body selectable"
      }, ABOUT_TEXT));
    }
    if (overlay === 'home') {
      return /*#__PURE__*/React.createElement("div", {
        className: "overlay confirm"
      }, /*#__PURE__*/React.createElement("div", {
        className: "confirm-box"
      }, /*#__PURE__*/React.createElement("p", {
        className: "confirm-text"
      }, "Going home already? All of your progress will be lost."), /*#__PURE__*/React.createElement("div", {
        className: "btn-stack"
      }, /*#__PURE__*/React.createElement("button", {
        className: "btn danger",
        onClick: () => {
          setOverlay(null);
          goTitle();
        }
      }, "Go home"), /*#__PURE__*/React.createElement("button", {
        className: "btn primary",
        onClick: () => setOverlay(null)
      }, "Nevermind"))));
    }
    if (overlay === 'burn') {
      const fromFull = screen === 'fullJournal';
      return /*#__PURE__*/React.createElement("div", {
        className: "overlay confirm"
      }, /*#__PURE__*/React.createElement("div", {
        className: "confirm-box"
      }, /*#__PURE__*/React.createElement("p", {
        className: "confirm-text"
      }, "Are you sure? It will be lost in the ether forever."), /*#__PURE__*/React.createElement("div", {
        className: "btn-stack"
      }, /*#__PURE__*/React.createElement("button", {
        className: "btn danger",
        onClick: () => fromFull ? burnPlanet(viewId) : burnSession()
      }, "Yes, burn it"), /*#__PURE__*/React.createElement("button", {
        className: "btn primary",
        onClick: () => setOverlay(null)
      }, "Nevermind"))));
    }
    if (overlay === 'goback') {
      return /*#__PURE__*/React.createElement("div", {
        className: "overlay confirm"
      }, /*#__PURE__*/React.createElement("div", {
        className: "confirm-box"
      }, /*#__PURE__*/React.createElement("p", {
        className: "confirm-text"
      }, "Leave without saving? This entry will be lost."), /*#__PURE__*/React.createElement("div", {
        className: "btn-stack"
      }, /*#__PURE__*/React.createElement("button", {
        className: "btn danger",
        onClick: () => {
          setOverlay(null);
          setScreen(editingExisting ? 'revisit' : 'cardSelect');
        }
      }, "Leave"), /*#__PURE__*/React.createElement("button", {
        className: "btn primary",
        onClick: () => setOverlay(null)
      }, "Keep writing"))));
    }
    return null;
  }

  /* ---------- screen switch ---------- */
  let body;
  switch (screen) {
    case 'title':
      body = renderTitle();
      break;
    case 'intro':
      body = renderIntro();
      break;
    case 'diceResult':
      body = renderDiceResult();
      break;
    case 'cardSelect':
      body = renderCardSelect();
      break;
    case 'cardReveal':
      body = renderCardReveal();
      break;
    case 'journalEntry':
      body = renderJournalEntry();
      break;
    case 'revisit':
      body = renderRevisit();
      break;
    case 'sketch':
      body = renderSketch();
      break;
    case 'namePlanet':
      body = renderNamePlanet();
      break;
    case 'archive':
      body = renderArchive();
      break;
    case 'fullJournal':
      body = renderFullJournal();
      break;
    default:
      body = renderTitle();
  }
  return /*#__PURE__*/React.createElement(React.Fragment, null, body, renderOverlay());
}

/* Optional drawing space. Kept as its own component so the canvas + tool state
   stay isolated from app re-renders. MS-Paint-style: strokes rasterize onto a
   fixed 96-cell-wide grid (1-cell pencil, square eraser), the canvas upscales
   nearest-neighbor via CSS, and saved sketches store the tiny grid PNG. */
const SKETCH_PAPER = '#f5f3ee';
const SKETCH_GRID = 96; // cells across the paper
const ERASER_CELLS = 7; // eraser block size, in cells
function SketchScreen({
  onAdd,
  onSkip,
  onBack,
  onHome,
  onHelp
}) {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const drawing = useRef(false);
  const last = useRef({
    x: 0,
    y: 0
  }); // last CELL the pointer touched
  const history = useRef([]); // canvas snapshots taken before each stroke
  const toolRef = useRef('pen');
  const dirtyRef = useRef(false);
  const [tool, setTool] = useState('pen');
  const [canUndo, setCanUndo] = useState(false);
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    toolRef.current = tool;
  }, [tool]);

  // canvas resolution = the logical cell grid; CSS scales it up pixelated
  useEffect(() => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    canvas.width = SKETCH_GRID;
    canvas.height = Math.max(1, Math.round(SKETCH_GRID * rect.height / rect.width));
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = SKETCH_PAPER;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctxRef.current = ctx;
  }, []);

  // pointer position -> cell coordinates
  function cellAt(e) {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: Math.floor((e.clientX - rect.left) / rect.width * canvas.width),
      y: Math.floor((e.clientY - rect.top) / rect.height * canvas.height)
    };
  }
  // stamp the tool at one cell
  function stamp(ctx, c) {
    if (toolRef.current === 'eraser') {
      const o = Math.floor(ERASER_CELLS / 2);
      ctx.fillStyle = SKETCH_PAPER;
      ctx.fillRect(c.x - o, c.y - o, ERASER_CELLS, ERASER_CELLS);
    } else {
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(c.x, c.y, 1, 1);
    }
  }
  // Bresenham between cells so fast strokes stay continuous
  function stampLine(ctx, a, b) {
    let x0 = a.x,
      y0 = a.y;
    const dx = Math.abs(b.x - x0),
      dy = -Math.abs(b.y - y0);
    const sx = x0 < b.x ? 1 : -1,
      sy = y0 < b.y ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      stamp(ctx, {
        x: x0,
        y: y0
      });
      if (x0 === b.x && y0 === b.y) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y0 += sy;
      }
    }
  }
  function down(e) {
    e.preventDefault();
    canvasRef.current.setPointerCapture(e.pointerId);
    history.current.push(canvasRef.current.toDataURL());
    if (history.current.length > 40) history.current.shift();
    setCanUndo(true);
    if (!dirtyRef.current) {
      dirtyRef.current = true;
      setDirty(true);
    }
    drawing.current = true;
    const c = cellAt(e);
    last.current = c;
    stamp(ctxRef.current, c); // a tap leaves a cell
  }
  function move(e) {
    if (!drawing.current) return;
    e.preventDefault();
    const c = cellAt(e);
    if (c.x === last.current.x && c.y === last.current.y) return;
    stampLine(ctxRef.current, last.current, c);
    last.current = c;
  }
  function up() {
    drawing.current = false;
  }
  function undo() {
    const prev = history.current.pop();
    setCanUndo(history.current.length > 0);
    if (history.current.length === 0) {
      dirtyRef.current = false;
      setDirty(false);
    }
    if (!prev) return;
    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current;
      const ctx = ctxRef.current;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
    };
    img.src = prev;
  }
  const Pen = () => /*#__PURE__*/React.createElement(PixelGlyph, {
    name: "pencil",
    px: 1.7
  });
  const Eraser = () => /*#__PURE__*/React.createElement(PixelGlyph, {
    name: "eraser",
    px: 1.7
  });
  const UndoIcon = () => /*#__PURE__*/React.createElement(PixelGlyph, {
    name: "undo",
    px: 1.7
  });
  return /*#__PURE__*/React.createElement("div", {
    className: "screen with-chrome fade-in"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sketch-wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sketch-head"
  }, /*#__PURE__*/React.createElement("p", {
    className: "heading"
  }, "Add a sketch to the journal?")), /*#__PURE__*/React.createElement("div", {
    className: "sketch-paper"
  }, /*#__PURE__*/React.createElement("canvas", {
    ref: canvasRef,
    onPointerDown: down,
    onPointerMove: move,
    onPointerUp: up,
    onPointerCancel: up,
    onPointerLeave: up
  })), /*#__PURE__*/React.createElement("div", {
    className: "sketch-tools"
  }, /*#__PURE__*/React.createElement("button", {
    className: 'tool-btn' + (tool === 'pen' ? ' active' : ''),
    "aria-label": "Pen",
    onClick: () => setTool('pen')
  }, /*#__PURE__*/React.createElement(Pen, null)), /*#__PURE__*/React.createElement("button", {
    className: 'tool-btn' + (tool === 'eraser' ? ' active' : ''),
    "aria-label": "Eraser",
    onClick: () => setTool('eraser')
  }, /*#__PURE__*/React.createElement(Eraser, null)), /*#__PURE__*/React.createElement("button", {
    className: "tool-btn",
    "aria-label": "Undo",
    disabled: !canUndo,
    onClick: undo
  }, /*#__PURE__*/React.createElement(UndoIcon, null)))), /*#__PURE__*/React.createElement("div", {
    className: "entry-actions sketch-actions"
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn",
    onClick: onBack
  }, "Back"), /*#__PURE__*/React.createElement("button", {
    className: "btn",
    onClick: onSkip
  }, "Skip"), /*#__PURE__*/React.createElement("button", {
    className: "btn primary",
    disabled: !dirty,
    style: {
      opacity: dirty ? 1 : .4
    },
    onClick: () => dirty && onAdd(canvasRef.current.toDataURL('image/png'))
  }, "Add")), /*#__PURE__*/React.createElement(Chrome, {
    onHome: onHome,
    onHelp: onHelp
  }));
}

/* Name-planet kept as its own component so the input has isolated state */
function NamePlanet({
  seed,
  color,
  onFinish,
  onBack,
  onHome,
  onHelp
}) {
  const [name, setName] = useState('');
  const valid = name.trim().length > 0;
  return /*#__PURE__*/React.createElement("div", {
    className: "screen with-chrome fade-in"
  }, /*#__PURE__*/React.createElement("div", {
    className: "center"
  }, /*#__PURE__*/React.createElement("p", {
    className: "heading",
    style: {
      marginBottom: '8px'
    }
  }, "Give the planet a name."), /*#__PURE__*/React.createElement(Planet, {
    seed: seed,
    fallbackColor: color,
    size: 320,
    style: {
      width: 'min(42vw,160px)',
      height: 'min(42vw,160px)',
      marginTop: '24px'
    }
  }), /*#__PURE__*/React.createElement("input", {
    className: "name-field",
    style: {
      marginTop: '40px'
    },
    placeholder: "Type here...",
    maxLength: NAME_LIMIT,
    value: name,
    onChange: e => setName(e.target.value)
  }), /*#__PURE__*/React.createElement("div", {
    className: "btn-stack",
    style: {
      marginTop: '44px'
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn primary",
    disabled: !valid,
    style: {
      opacity: valid ? 1 : .4
    },
    onClick: () => valid && onFinish(name)
  }, "Finish"), /*#__PURE__*/React.createElement("button", {
    className: "btn",
    onClick: onBack
  }, "Go back"))), /*#__PURE__*/React.createElement(Chrome, {
    onHome: onHome,
    onHelp: onHelp
  }));
}
ReactDOM.createRoot(document.getElementById('root')).render(/*#__PURE__*/React.createElement(App, null));

