/* app.js — GENERATED from app.src.jsx (compiled with @babel/preset-react).
   Do not edit by hand; edit app.src.jsx and recompile. React 18 classic runtime. */
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
   scale (uniform pixel density). Without it, CSS controls the size. */
function PixelGlyph({
  name,
  px
}) {
  const map = PIXEL_SPRITES[name];
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
    const centerPx = isReveal ? 6.5 : isThumb ? 1.6 : 3.4;
    const cornerPx = isReveal ? 1.6 : 1.0;
    return /*#__PURE__*/React.createElement("div", {
      className: cls.join(' '),
      onClick: onClick
    }, !isThumb && /*#__PURE__*/React.createElement("span", {
      className: "corner tl"
    }, /*#__PURE__*/React.createElement("span", {
      className: "r"
    }, card.rank), /*#__PURE__*/React.createElement(PixelGlyph, {
      name: card.suit,
      px: cornerPx
    })), /*#__PURE__*/React.createElement("span", {
      className: "center-glyph"
    }, /*#__PURE__*/React.createElement(PixelGlyph, {
      name: card.suit,
      px: centerPx
    })), !isThumb && /*#__PURE__*/React.createElement("span", {
      className: "corner br"
    }, /*#__PURE__*/React.createElement("span", {
      className: "r"
    }, card.rank), /*#__PURE__*/React.createElement(PixelGlyph, {
      name: card.suit,
      px: cornerPx
    })));
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

/* Title-screen build stamp, temporarily doubling as a live layout probe:
   shows the build plus the values the DEVICE actually computed — the
   screen's applied top/bottom padding, the real safe-area insets, the
   viewport height, and where the title landed. Diagnoses layout issues
   that emulation cannot reproduce. */
function BuildTag() {
  const [txt, setTxt] = useState('v30');
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        const scr = document.querySelector('.screen');
        const cs = getComputedStyle(scr);
        const probe = document.createElement('div');
        probe.style.cssText = 'position:fixed;left:0;width:1px;top:env(safe-area-inset-top);bottom:env(safe-area-inset-bottom);pointer-events:none;visibility:hidden;';
        document.body.appendChild(probe);
        const r = probe.getBoundingClientRect();
        const st = Math.round(r.top);
        const sb = Math.round(window.innerHeight - r.bottom);
        probe.remove();
        const h1 = document.querySelector('h1').getBoundingClientRect();
        setTxt(`v30 · pt${Math.round(parseFloat(cs.paddingTop))} pb${Math.round(parseFloat(cs.paddingBottom))} · st${st} sb${sb} · ih${window.innerHeight} · h1@${Math.round(h1.top)}`);
      } catch (e) {
        setTxt('v30 · probe failed');
      }
    }, 150);
    return () => clearTimeout(t);
  }, []);
  return /*#__PURE__*/React.createElement("span", {
    className: "build-tag",
    "aria-hidden": "true"
  }, txt);
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
  const [toast, setToast] = useState(false);
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
    setToast(true);
    setScreen('archive');
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
      className: "screen with-chrome fade-in"
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
        setToast(false);
        setScreen('archive');
      }
    }, "Archive"))), /*#__PURE__*/React.createElement(Chrome, {
      onHelp: () => setOverlay('help')
    }), /*#__PURE__*/React.createElement(BuildTag, null));
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
    }, "No journeys yet. Embark to find your first planet.")) : /*#__PURE__*/React.createElement("div", {
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
    }, fmtDate(p.createdAt))))), toast && /*#__PURE__*/React.createElement("div", {
      className: "toast"
    }, /*#__PURE__*/React.createElement("span", null, "Journal published."), /*#__PURE__*/React.createElement("button", {
      "aria-label": "Dismiss",
      onClick: () => setToast(false)
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
        setToast(false);
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
      className: "btn-stack",
      style: {
        paddingTop: '24px'
      }
    }, /*#__PURE__*/React.createElement("button", {
      className: "btn danger",
      onClick: () => setOverlay('burn')
    }, "Burn journal")));
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

