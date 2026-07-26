/* app.src.jsx — editable JSX source for the app (was inline in index.html).
   This is the file to edit. Recompile to app.js (loaded by index.html) with:
     npx @babel/cli@7 --presets @babel/preset-react app.src.jsx > app.js
   React 18 classic runtime; React/ReactDOM are global (vendored UMD builds). */
const { useState, useEffect, useRef, useMemo } = React;

/* ============================================================
   CONTENT / BUILDING BLOCKS  (mirrors content/copy.md)
   ============================================================ */
const SUITS = {
  diamonds: { glyph:'♦', red:true,  phrase:'some kind of living being' },
  clubs:    { glyph:'♣', red:false, phrase:'a plant or other immobile life' },
  hearts:   { glyph:'♥', red:true,  phrase:'mysterious civilizational ruins' },
  spades:   { glyph:'♠', red:false, phrase:'a strange natural phenomenon' },
};
const SUIT_ORDER = ['diamonds','clubs','hearts','spades'];
const RANKS = {
  A:  'in a field taller than you',
  '2':'under the light of the moon(s)',
  '3':'by a gentle river',
  '4':'in a steep canyon',
  '5':'in a treetop',
  '6':'on the snowy peak of a mountain',
  '7':'near a volcano',
  '8':'on a glacier',
  '9':'deep underground',
  '10':'on a cliff face',
  J:  'in the desert',
  Q:  'in deep water',
  K:  'floating in the air',
};
const RANK_ORDER = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];

// Discovery circumstance by the per-card roll (1-2 / 3-4 / 5-6)
function outcomeForRoll(roll){
  if(roll <= 2) return 'arduous';
  if(roll <= 4) return 'sudden';
  return 'resting';
}
// Prepended to the suit + location phrase to open the writing prompt.
const DISCOVERY_INTRO = {
  arduous: 'After a long and arduous journey, you come upon',
  sudden:  'All of the sudden, you come upon',
  resting: "As you're resting, you spot",
};

function seePart(card){
  const intro = DISCOVERY_INTRO[outcomeForRoll(card.roll)];
  return `${intro} ${SUITS[card.suit].phrase} ${RANKS[card.rank]}.`;
}
function fullPrompt(card){
  return `${seePart(card)} Describe it in your journal.`;
}

const ABOUT_TEXT =
`*******************
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
function buildDeck(){
  const deck = [];
  for(const suit of SUIT_ORDER) for(const rank of RANK_ORDER) deck.push({ rank, suit });
  return deck;
}
function deal(n){
  const deck = buildDeck();
  for(let i = deck.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck.slice(0, n).map(c => ({ ...c, body:'', done:false }));
}
function randomPlanetColor(){
  const hue = Math.floor(Math.random() * 360);
  const sat = 60 + Math.floor(Math.random() * 35);   // 60–95
  const light = 45 + Math.floor(Math.random() * 25);  // 45–70
  return `hsl(${hue} ${sat}% ${light}%)`;
}
// Map the app's card shape (suit:'diamonds'…, rank:'A'…) to the planet
// renderer's shape (suit:'♦'…, rank:'A'…). One node per discovered card.
function cardsToEntries(cards){
  return (cards || []).map(c => ({
    suit: (SUITS[c.suit] && SUITS[c.suit].glyph) || c.suit,
    rank: c.rank,
  }));
}
// The planet seed for an archived record. New records carry their own
// `planetSeed`. For older ones (saved before this feature) we rebuild it from
// their stored journal entries, deriving a stable salt from the record id so
// the placement never shifts between renders.
function stableSalt(str){
  let h = 2166136261 >>> 0;
  for(let i = 0; i < str.length; i++){ h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) % 99999;
}
function seedForRecord(p){
  if(p.planetSeed && p.planetSeed.entries) return p.planetSeed;
  return {
    entries: cardsToEntries(p.entries || []),
    salt: stableSalt(String(p.id || p.name || '')),
  };
}
function fmtDate(ms){
  const d = new Date(ms);
  return `${d.getMonth()+1}/${d.getDate()}/${d.getFullYear()}`;
}
function loadArchive(){
  try{ return JSON.parse(localStorage.getItem(STORE_KEY)) || []; }
  catch(e){ return []; }
}
function saveArchive(arr){
  try{ localStorage.setItem(STORE_KEY, JSON.stringify(arr)); }catch(e){}
}

/* ============================================================
   PRESENTATIONAL COMPONENTS
   ============================================================ */
/* 8-bit sprites: one '#' = one on-pixel, drawn as SVG rects with crispEdges
   so they stay sharp at every size (CSS scales them per card variant). */
const PIXEL_SPRITES = {
  hearts: [
    '.##..##.',
    '########',
    '########',
    '########',
    '.######.',
    '..####..',
    '...##...',
    '........',
  ],
  diamonds: [
    '...##...',
    '..####..',
    '.######.',
    '########',
    '########',
    '.######.',
    '..####..',
    '...##...',
  ],
  spades: [
    '...##...',
    '..####..',
    '.######.',
    '########',
    '########',
    '##.##.##',
    '...##...',
    '..####..',
  ],
  clubs: [
    '..####..',
    '.######.',
    '########',
    '########',
    '##.##.##',
    '...##...',
    '..####..',
    '........',
  ],
  star: [
    '...#...',
    '...#...',
    '..###..',
    '#######',
    '..###..',
    '...#...',
    '...#...',
  ],
};

function PixelGlyph({ name }){
  const map = PIXEL_SPRITES[name];
  const w = map[0].length, h = map.length;
  const rects = [];
  map.forEach((row, y) => {
    for(let x = 0; x < w; x++)
      if(row[x] === '#') rects.push(<rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" />);
  });
  return (
    <svg viewBox={`0 0 ${w} ${h}`} shapeRendering="crispEdges" fill="currentColor" aria-hidden="true">
      {rects}
    </svg>
  );
}

function Card({ card, faceUp, variant='', selected=false, onClick }){
  const cls = ['card', variant];
  if(selected) cls.push('selected');
  if(faceUp){
    const s = SUITS[card.suit];
    cls.push('face'); if(s.red) cls.push('red');
    return (
      <div className={cls.join(' ')} onClick={onClick}>
        <span className="corner tl"><span className="r">{card.rank}</span><PixelGlyph name={card.suit} /></span>
        <span className="center-glyph"><PixelGlyph name={card.suit} /></span>
        <span className="corner br"><span className="r">{card.rank}</span><PixelGlyph name={card.suit} /></span>
      </div>
    );
  }
  cls.push('back');
  return <div className={cls.join(' ')} onClick={onClick}><PixelGlyph name="star" /></div>;
}

function Die({ value, rolling, variant='' }){
  // pip layout per face
  const layouts = {
    1:[4], 2:[0,8], 3:[0,4,8], 4:[0,2,6,8], 5:[0,2,4,6,8], 6:[0,2,3,5,6,8],
  };
  const on = new Set(layouts[value] || []);
  return (
    <div className={['die', variant, rolling ? 'rolling' : ''].filter(Boolean).join(' ')}>
      {Array.from({length:9}).map((_,i) =>
        <span key={i}>{ on.has(i) ? <span className="pip" /> : null }</span>
      )}
    </div>
  );
}

function Chrome({ onHome, onHelp }){
  // Always render both slots so the bar's space-between keeps Home pinned left
  // and Help pinned right even when only one of them is present.
  return (
    <div className="chrome-bar">
      {onHome
        ? <button className="chrome home" aria-label="Home" onClick={onHome}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round">
              <path d="M3 11.5 12 4l9 7.5" /><path d="M5 10.5V20h14v-9.5" />
            </svg>
          </button>
        : <span className="chrome-spacer" aria-hidden="true" />}
      {onHelp
        ? <button className="chrome help" aria-label="Help" onClick={onHelp}>?</button>
        : <span className="chrome-spacer" aria-hidden="true" />}
    </div>
  );
}

/* A rendered planet. Draws onto a <canvas> via the planet renderer, sized to
   its CSS box (retina-aware). `seed` is { entries, salt }. If the renderer is
   somehow unavailable, falls back to a flat colored disc. */
function Planet({ seed, size = 256, fallbackColor, style, className = 'planet-canvas' }){
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current;
    if(!c) return;
    const cssW = c.clientWidth || size;
    const px = Math.round(cssW * Math.min(window.devicePixelRatio || 1, 2));
    c.width = c.height = Math.max(64, px);
    if(window.PlanetRenderer && seed){
      window.PlanetRenderer.renderPlanet(c, seed);
    } else if(fallbackColor){
      const ctx = c.getContext('2d'), S = c.width;
      ctx.clearRect(0, 0, S, S);
      ctx.fillStyle = fallbackColor;
      ctx.beginPath(); ctx.arc(S/2, S/2, S*0.42, 0, 7); ctx.fill();
    }
  }, [seed, fallbackColor, size]);
  return <canvas ref={ref} className={className} style={style} />;
}

/* ============================================================
   APP
   ============================================================ */
function App(){
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
  const sessionSeed = useMemo(
    () => session
      ? { entries: cardsToEntries(session.cards.filter(c => c.done)), salt: session.salt }
      : null,
    [session]
  );
  const archiveSeeds = useMemo(() => {
    const m = {};
    for(const p of archive) m[p.id] = seedForRecord(p);
    return m;
  }, [archive]);

  /* ---------- navigation helpers ---------- */
  function startJourney(){
    setSession(null);
    setScreen('intro');
  }
  function goTitle(){
    setSession(null); setActiveIndex(null); setSelectedIndex(null); setDraftText('');
    setOverlay(null); setScreen('title');
  }

  // first roll — only sets how many points of interest the planet holds.
  // jumps straight to the result screen and shakes the die there (same as the
  // card roll) before the final number settles in.
  function rollDice(){
    setScreen('diceResult');
    setRolling(true);
    const spin = setInterval(() => setDieFace(1 + Math.floor(Math.random()*6)), 90);
    setTimeout(() => {
      clearInterval(spin);
      const roll = 1 + Math.floor(Math.random()*6);
      setDieFace(roll);
      setRolling(false);
      setSession({
        roll,
        color: randomPlanetColor(),
        salt: Math.floor(Math.random() * 99999),  // fixes planet node placement
        cards: deal(roll),
      });
    }, 850);
  }

  // tapping a card on cardSelect: revisit finished ones, otherwise pick (toggle) it
  function tapCard(i){
    if(session.cards[i].done){
      setActiveIndex(i); setScreen('revisit');
    }else{
      setSelectedIndex(prev => prev === i ? null : i);
    }
  }

  // second roll — accompanies the picked card and shapes its discovery prompt
  function rollForCard(){
    if(selectedIndex === null) return;
    const idx = selectedIndex;
    setActiveIndex(idx);
    setSelectedIndex(null);
    setScreen('cardReveal');
    setRolling(true);
    const spin = setInterval(() => setDieFace(1 + Math.floor(Math.random()*6)), 90);
    setTimeout(() => {
      clearInterval(spin);
      const roll = 1 + Math.floor(Math.random()*6);
      setDieFace(roll);
      setRolling(false);
      setSession(s => {
        const cards = s.cards.slice();
        cards[idx] = { ...cards[idx], roll };
        return { ...s, cards };
      });
    }, 850);
  }

  function startWriting(){
    setDraftText(session.cards[activeIndex].body || '');
    setEditingExisting(session.cards[activeIndex].done);
    setScreen('journalEntry');
  }

  function saveEntry(){
    setSession(s => {
      const cards = s.cards.slice();
      cards[activeIndex] = { ...cards[activeIndex], body: draftText, done:true };
      return { ...s, cards };
    });
    setActiveIndex(null);
    setScreen('cardSelect');
  }

  // optional sketch screen, between "finished exploring" and "name the planet"
  function finishSketch(dataURL){
    setSession(s => ({ ...s, sketch: dataURL }));
    setScreen('namePlanet');
  }
  function skipSketch(){
    setSession(s => ({ ...s, sketch: null }));
    setScreen('namePlanet');
  }

  function publishPlanet(name){
    const entries = session.cards
      .filter(c => c.done)
      .map(c => ({ rank:c.rank, suit:c.suit, roll:c.roll, prompt:fullPrompt(c), body:c.body }));
    const planet = {
      id: 'p' + Date.now() + Math.floor(Math.random()*1000),
      name: name.trim(),
      color: session.color,
      roll: session.roll,
      createdAt: Date.now(),
      entries,
      // The planet image seed: one node per discovered card, placement fixed by
      // the session salt so the archive shows the same planet as the name screen.
      planetSeed: {
        entries: cardsToEntries(session.cards.filter(c => c.done)),
        salt: session.salt,
      },
      sketch: session.sketch || null,
    };
    const next = [planet, ...archive];
    setArchive(next); saveArchive(next);
    setSession(null); setActiveIndex(null); setSelectedIndex(null); setDraftText('');
    setToast(true);
    setScreen('archive');
  }

  function burnSession(){
    setOverlay(null);
    goTitle();
  }
  function burnPlanet(id){
    const next = archive.filter(p => p.id !== id);
    setArchive(next); saveArchive(next);
    setOverlay(null); setViewId(null);
    setScreen('archive');
  }

  /* ---------- home button behavior ---------- */
  // gameplay screens show home → confirmation; archive/fullJournal handle their own.
  const gameplayScreens = ['intro','diceResult','cardSelect','cardReveal','journalEntry','revisit','sketch','namePlanet'];
  const showChrome = gameplayScreens.includes(screen) || screen==='archive';
  function onHome(){
    if(screen==='archive' || screen==='fullJournal'){ goTitle(); }
    else { setOverlay('home'); }
  }

  /* ============================================================
     SCREEN RENDERERS
     ============================================================ */
  function renderTitle(){
    return (
      <div className="screen fade-in">
        <div className="sky" />
        <div className="center" style={{gap:0}}>
          <h1>Alone<br/>Among<br/>the Stars</h1>
          <div className="byline">By Takuma Okada</div>
          <div className="tagline" style={{marginTop:'48px'}}>A solo journaling RPG about exploring fantastic planets</div>
          <div className="btn-stack" style={{marginTop:'56px'}}>
            <button className="btn primary" onClick={startJourney}>Embark</button>
            <button className="btn" onClick={() => { setToast(false); setScreen('archive'); }}>Archive</button>
          </div>
        </div>
        <Chrome onHelp={() => setOverlay('help')} />
      </div>
    );
  }

  function renderIntro(){
    return (
      <div className="screen with-chrome fade-in">
        <div className="sky" />
        <div className="center">
          <div className="moon" />
          <p className="narration" style={{marginTop:'48px'}}>You're in your ship, drifting peacefully in space…</p>
          <p className="instruction">Roll your dice to look for a planet.</p>
          <div className="btn-stack" style={{marginTop:'40px'}}>
            <button className="btn primary" onClick={rollDice}>Roll</button>
          </div>
        </div>
        <Chrome onHome={onHome} onHelp={() => setOverlay('help')} />
      </div>
    );
  }

  function renderDiceResult(){
    const settled = !rolling && session;
    return (
      <div className="screen with-chrome fade-in">
        <div className="center">
          <Die value={settled ? session.roll : dieFace} rolling={rolling} />
          {settled &&
            <p className="flavor" style={{marginTop:'40px'}}>
              You spot a planet. Ship sensors show {session.roll} {session.roll===1?'point':'points'} of interest.
            </p>}
          {settled &&
            <div className="btn-stack" style={{marginTop:'24px'}}>
              <button className="btn primary" onClick={() => setScreen('cardSelect')}>Explore</button>
            </div>}
        </div>
        <Chrome onHome={onHome} onHelp={() => setOverlay('help')} />
      </div>
    );
  }

  function renderCardSelect(){
    return (
      <div className="screen with-chrome fade-in">
        <div className="center" style={{justifyContent:'center', gap:'32px'}}>
          <div className="card-grid">
            {session.cards.map((c,i) =>
              <Card key={i} card={c} faceUp={c.done} selected={selectedIndex===i} onClick={() => tapCard(i)} />
            )}
          </div>

          {allDone ? (
            <>
              <p className="instruction" style={{marginTop:'4px'}}>
                You're finished exploring this planet. What to do with your journal?
              </p>
              <div className="btn-stack" style={{marginTop:'8px'}}>
                <button className="btn primary" onClick={() => setScreen('sketch')}>Keep it</button>
                <button className="btn danger" onClick={() => setOverlay('burn')}>Burn it</button>
              </div>
            </>
          ) : (
            <>
              <p className="flavor">
                {remaining === session.roll
                  ? `You land. ${remaining} ${remaining===1?'point':'points'} of interest remain${remaining===1?'s':''}.`
                  : `${remaining} ${remaining===1?'point':'points'} of interest remain${remaining===1?'s':''}.`}
              </p>
              <p className="instruction">Pick a card, then roll.</p>
              <div className="btn-stack" style={{marginTop:'8px'}}>
                <button className="btn primary" disabled={selectedIndex===null}
                  style={{opacity: selectedIndex===null ? .4 : 1}}
                  onClick={rollForCard}>Roll</button>
              </div>
            </>
          )}
        </div>
        <Chrome onHome={onHome} onHelp={() => setOverlay('help')} />
      </div>
    );
  }

  function renderCardReveal(){
    const card = session.cards[activeIndex];
    const settled = !rolling && !!card.roll;
    return (
      <div className="screen with-chrome fade-in">
        <div className="center">
          <div className="reveal-row">
            <Die value={settled ? card.roll : dieFace} rolling={rolling} variant="mid" />
            {settled
              ? <Card card={card} faceUp variant="reveal-card" />
              : <div className="card back reveal-card"><PixelGlyph name="star" /></div>}
          </div>
          {settled && <p className="flavor" style={{marginTop:'36px'}}>{seePart(card)}</p>}
          {settled && <p className="instruction">Describe it in your journal.</p>}
          {settled &&
            <div className="btn-stack" style={{marginTop:'24px'}}>
              <button className="btn primary" onClick={startWriting}>Start writing</button>
            </div>}
        </div>
        <Chrome onHome={onHome} onHelp={() => setOverlay('help')} />
      </div>
    );
  }

  function renderJournalEntry(){
    const card = session.cards[activeIndex];
    return (
      <div className="screen fade-in">
        <div className="entry-header">
          <Die value={card.roll} variant="thumb" />
          <Card card={card} faceUp variant="thumb" />
          <div className="htext">{seePart(card)}</div>
        </div>
        <textarea
          className="entry-field"
          placeholder="Start your entry..."
          value={draftText}
          autoFocus
          onChange={e => setDraftText(e.target.value)}
        />
        <div className="entry-actions">
          <button className="btn" onClick={() => {
            const original = card.body || '';
            if(draftText !== original) setOverlay('goback');
            else setScreen(editingExisting ? 'revisit' : 'cardSelect');
          }}>Go back</button>
          <button className="btn primary" onClick={saveEntry}>Save</button>
        </div>
      </div>
    );
  }

  function renderRevisit(){
    const card = session.cards[activeIndex];
    return (
      <div className="screen fade-in">
        <div className="entry-header">
          <Die value={card.roll} variant="thumb" />
          <Card card={card} faceUp variant="thumb" />
          <div className="htext">{seePart(card)}</div>
        </div>
        <div className="grow" style={{marginTop:'18px', overflowY:'auto'}}>
          <p className="fj-body selectable">{card.body}</p>
        </div>
        <div className="entry-actions">
          <button className="btn" onClick={() => { setActiveIndex(null); setScreen('cardSelect'); }}>Go back</button>
          <button className="btn primary" onClick={startWriting}>Edit</button>
        </div>
      </div>
    );
  }

  function renderSketch(){
    return (
      <SketchScreen
        onAdd={finishSketch}
        onSkip={skipSketch}
        onBack={() => setScreen('cardSelect')}
        onHome={onHome}
        onHelp={() => setOverlay('help')}
      />
    );
  }

  function renderNamePlanet(){
    return (
      <NamePlanet
        seed={sessionSeed}
        color={session.color}
        onFinish={publishPlanet}
        onBack={() => setScreen('sketch')}
        onHome={onHome}
        onHelp={() => setOverlay('help')}
      />
    );
  }

  function renderArchive(){
    return (
      <div className="screen with-chrome fade-in">
        <div className="archive-title heading">Journal archive</div>
        {archive.length === 0 ? (
          <div className="center">
            <p className="empty-archive">No journeys yet. Embark to find your first planet.</p>
          </div>
        ) : (
          <div className="archive-grid">
            {archive.map(p =>
              <div key={p.id} className="planet-module" onClick={() => { setViewId(p.id); setScreen('fullJournal'); }}>
                <Planet seed={archiveSeeds[p.id]} fallbackColor={p.color} size={240}
                  style={{ width:'min(34vw,120px)', height:'min(34vw,120px)' }} />
                <div className="pname">{p.name}</div>
                <div className="pdate">{fmtDate(p.createdAt)}</div>
              </div>
            )}
          </div>
        )}
        {toast &&
          <div className="toast">
            <span>Journal published.</span>
            <button aria-label="Dismiss" onClick={() => setToast(false)}>✕</button>
          </div>}
        <Chrome onHome={onHome} onHelp={() => setOverlay('help')} />
      </div>
    );
  }

  function renderFullJournal(){
    const p = archive.find(x => x.id === viewId);
    if(!p){ return renderArchive(); }
    return (
      <div className="screen fade-in">
        <button className="close-x" aria-label="Close" onClick={() => { setToast(false); setScreen('archive'); }}>✕</button>
        <div className="fj-header">
          <Planet seed={seedForRecord(p)} fallbackColor={p.color} size={256}
            style={{ width:96, height:96, flex:'0 0 auto' }} />
          <div className="fj-meta">
            <div className="pn">{p.name}</div>
            <div>Explored {fmtDate(p.createdAt)}</div>
            <div>{p.entries.length} {p.entries.length===1?'entry':'entries'}</div>
          </div>
        </div>
        <div className="grow" style={{overflowY:'auto', paddingTop:'8px'}}>
          {p.entries.map((e,i) =>
            <div key={i} className="fj-entry">
              <div className="fj-entry-head">
                {e.roll ? <Die value={e.roll} variant="thumb" /> : null}
                <Card card={e} faceUp variant="thumb" />
              </div>
              <div className="fj-body selectable">{e.body}</div>
            </div>
          )}
          {p.sketch &&
            <div className="fj-entry">
              <img className="journal-sketch" src={p.sketch} alt="Sketch from the journey" />
            </div>}
        </div>
        <div className="btn-stack" style={{paddingTop:'24px'}}>
          <button className="btn danger" onClick={() => setOverlay('burn')}>Burn journal</button>
        </div>
      </div>
    );
  }

  /* ---------- overlays ---------- */
  function renderOverlay(){
    if(overlay === 'help'){
      return (
        <div className="overlay">
          <button className="close-x" aria-label="Close" onClick={() => setOverlay(null)}>✕</button>
          <div className="help-body selectable">{ABOUT_TEXT}</div>
        </div>
      );
    }
    if(overlay === 'home'){
      return (
        <div className="overlay confirm">
          <div className="confirm-box">
            <p className="confirm-text">Going home already? All of your progress will be lost.</p>
            <div className="btn-stack">
              <button className="btn danger" onClick={() => { setOverlay(null); goTitle(); }}>Go home</button>
              <button className="btn primary" onClick={() => setOverlay(null)}>Nevermind</button>
            </div>
          </div>
        </div>
      );
    }
    if(overlay === 'burn'){
      const fromFull = screen === 'fullJournal';
      return (
        <div className="overlay confirm">
          <div className="confirm-box">
            <p className="confirm-text">Are you sure? It will be lost in the ether forever.</p>
            <div className="btn-stack">
              <button className="btn danger" onClick={() => fromFull ? burnPlanet(viewId) : burnSession()}>Yes, burn it</button>
              <button className="btn primary" onClick={() => setOverlay(null)}>Nevermind</button>
            </div>
          </div>
        </div>
      );
    }
    if(overlay === 'goback'){
      return (
        <div className="overlay confirm">
          <div className="confirm-box">
            <p className="confirm-text">Leave without saving? This entry will be lost.</p>
            <div className="btn-stack">
              <button className="btn danger" onClick={() => {
                setOverlay(null);
                setScreen(editingExisting ? 'revisit' : 'cardSelect');
              }}>Leave</button>
              <button className="btn primary" onClick={() => setOverlay(null)}>Keep writing</button>
            </div>
          </div>
        </div>
      );
    }
    return null;
  }

  /* ---------- screen switch ---------- */
  let body;
  switch(screen){
    case 'title':       body = renderTitle(); break;
    case 'intro':       body = renderIntro(); break;
    case 'diceResult':  body = renderDiceResult(); break;
    case 'cardSelect':  body = renderCardSelect(); break;
    case 'cardReveal':  body = renderCardReveal(); break;
    case 'journalEntry':body = renderJournalEntry(); break;
    case 'revisit':     body = renderRevisit(); break;
    case 'sketch':      body = renderSketch(); break;
    case 'namePlanet':  body = renderNamePlanet(); break;
    case 'archive':     body = renderArchive(); break;
    case 'fullJournal': body = renderFullJournal(); break;
    default:            body = renderTitle();
  }

  return <>{body}{renderOverlay()}</>;
}

/* Optional drawing space. Kept as its own component so the canvas + tool state
   stay isolated from app re-renders. One thin pen, an eraser, and undo. */
const SKETCH_PAPER = '#f5f3ee';
function SketchScreen({ onAdd, onSkip, onBack, onHome, onHelp }){
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const drawing = useRef(false);
  const last = useRef({ x:0, y:0 });
  const history = useRef([]);          // canvas snapshots taken before each stroke
  const toolRef = useRef('pen');
  const dirtyRef = useRef(false);
  const [tool, setTool] = useState('pen');
  const [canUndo, setCanUndo] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => { toolRef.current = tool; }, [tool]);

  // size the canvas to its box (accounting for device pixel ratio) and fill paper
  useEffect(() => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.fillStyle = SKETCH_PAPER; ctx.fillRect(0, 0, rect.width, rect.height);
    ctxRef.current = ctx;
  }, []);

  function point(e){
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }
  function stroke(ctx){
    if(toolRef.current === 'eraser'){ ctx.strokeStyle = SKETCH_PAPER; ctx.lineWidth = 18; }
    else { ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 2; }   // one thin pen
  }
  function down(e){
    e.preventDefault();
    canvasRef.current.setPointerCapture(e.pointerId);
    history.current.push(canvasRef.current.toDataURL());
    if(history.current.length > 40) history.current.shift();
    setCanUndo(true);
    if(!dirtyRef.current){ dirtyRef.current = true; setDirty(true); }
    drawing.current = true;
    const p = point(e); last.current = p;
    const ctx = ctxRef.current; stroke(ctx);
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + 0.01, p.y); ctx.stroke();  // a tap leaves a dot
  }
  function move(e){
    if(!drawing.current) return;
    e.preventDefault();
    const ctx = ctxRef.current; const p = point(e);
    stroke(ctx);
    ctx.beginPath(); ctx.moveTo(last.current.x, last.current.y); ctx.lineTo(p.x, p.y); ctx.stroke();
    last.current = p;
  }
  function up(){ drawing.current = false; }
  function undo(){
    const prev = history.current.pop();
    setCanUndo(history.current.length > 0);
    if(history.current.length === 0){ dirtyRef.current = false; setDirty(false); }
    if(!prev) return;
    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const ctx = ctxRef.current;
      ctx.clearRect(0, 0, rect.width, rect.height);
      ctx.drawImage(img, 0, 0, rect.width, rect.height);
    };
    img.src = prev;
  }

  const Pen = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round">
      <path d="M4 20l4-1L19.5 7.5a2.1 2.1 0 0 0-3-3L5 16l-1 4z" /><path d="M14.5 6.5l3 3" /></svg>);
  const Eraser = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round">
      <path d="M8 20h11" /><path d="M4.5 15.5l5-5 6 6-3.5 3.5H8.5z" /><path d="M9.5 10.5l4-4 6 6-4 4" /></svg>);
  const UndoIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round">
      <path d="M9 7L4 12l5 5" /><path d="M4 12h10a6 6 0 0 1 0 12h-1" /></svg>);

  return (
    <div className="screen with-chrome fade-in">
      <div className="sketch-wrap">
        <div className="sketch-head">
          <p className="heading">Add a sketch to the journal?</p>
        </div>
        <div className="sketch-paper">
          <canvas ref={canvasRef}
            onPointerDown={down} onPointerMove={move} onPointerUp={up}
            onPointerCancel={up} onPointerLeave={up} />
        </div>
        <div className="sketch-tools">
          <button className={'tool-btn' + (tool==='pen' ? ' active' : '')} aria-label="Pen" onClick={() => setTool('pen')}><Pen /></button>
          <button className={'tool-btn' + (tool==='eraser' ? ' active' : '')} aria-label="Eraser" onClick={() => setTool('eraser')}><Eraser /></button>
          <button className="tool-btn" aria-label="Undo" disabled={!canUndo} onClick={undo}><UndoIcon /></button>
        </div>
      </div>
      <div className="entry-actions sketch-actions">
        <button className="btn" onClick={onBack}>Back</button>
        <button className="btn" onClick={onSkip}>Skip</button>
        <button className="btn primary" disabled={!dirty} style={{opacity: dirty ? 1 : .4}}
          onClick={() => dirty && onAdd(canvasRef.current.toDataURL('image/png'))}>Add</button>
      </div>
      <Chrome onHome={onHome} onHelp={onHelp} />
    </div>
  );
}

/* Name-planet kept as its own component so the input has isolated state */
function NamePlanet({ seed, color, onFinish, onBack, onHome, onHelp }){
  const [name, setName] = useState('');
  const valid = name.trim().length > 0;
  return (
    <div className="screen with-chrome fade-in">
      <div className="center">
        <p className="heading" style={{marginBottom:'8px'}}>Give the planet a name.</p>
        <Planet seed={seed} fallbackColor={color} size={320}
          style={{ width:'min(42vw,160px)', height:'min(42vw,160px)', marginTop:'24px' }} />
        <input
          className="name-field"
          style={{marginTop:'40px'}}
          placeholder="Type here..."
          maxLength={NAME_LIMIT}
          value={name}
          onChange={e => setName(e.target.value)}
        />
        <div className="btn-stack" style={{marginTop:'44px'}}>
          <button className="btn primary" disabled={!valid} style={{opacity: valid?1:.4}}
            onClick={() => valid && onFinish(name)}>Finish</button>
          <button className="btn" onClick={onBack}>Go back</button>
        </div>
      </div>
      <Chrome onHome={onHome} onHelp={onHelp} />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
