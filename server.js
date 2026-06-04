// ─── server.js — Goon Room ────────────────────────────────────────────────────
// Deploy: push to GitHub → connect to Railway → done
// Local:  npm install && npm start → http://localhost:3000

const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const path       = require('path');
const crypto     = require('crypto');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: { origin: '*' },
  pingTimeout: 60000,
});

// Railway injects PORT automatically; fallback to 3000 locally
const PORT = process.env.PORT || 3000;

// ── Serve static files from /public ──────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// ── In-memory state ───────────────────────────────────────────────────────────
const players = new Map();   // socketId → { id, name }
const rooms   = new Map();   // code     → Room

function makeCode() {
  return crypto.randomBytes(3).toString('hex').toUpperCase();
}

function roomSnapshot(room) {
  return {
    code:    room.code,
    game:    room.game,
    host:    room.host,
    started: room.started,
    players: room.players.map(p => ({ id: p.id, name: p.name })),
  };
}

function broadcastRoom(code) {
  const room = rooms.get(code);
  if (room) io.to(code).emit('roomUpdate', roomSnapshot(room));
}

function broadcastLobby() {
  const list = [...rooms.values()]
    .filter(r => !r.started)
    .map(r => ({ code: r.code, game: r.game, playerCount: r.players.length }));
  io.emit('lobbyList', list);
}

// ── Word + puzzle data ────────────────────────────────────────────────────────
const WORDS = [
  'ABOUT','ABOVE','ACTOR','ACUTE','ADMIT','ADULT','AFTER','AGAIN','AGENT','AGREE',
  'AHEAD','ALARM','ALBUM','ANGEL','ANGLE','ANGRY','APART','APPLE','APPLY','ARENA',
  'AROSE','ASIDE','AUDIO','AVOID','BADGE','BAKER','BEACH','BEGIN','BEING','BELOW',
  'BENCH','BIBLE','BIRTH','BLADE','BLAME','BLANK','BLAST','BLOOD','BLOOM','BOARD',
  'BOOST','BRAVE','BREAD','BREAK','BRICK','BRING','BROAD','BROKE','BROWN','BUILD',
  'BUILT','BURST','CABIN','CANDY','CARGO','CARRY','CATCH','CAUSE','CHAIN','CHAOS',
  'CHART','CHASE','CHEAP','CHECK','CHESS','CHEST','CHILD','CLAIM','CLASH','CLASS',
  'CLEAN','CLEAR','CLICK','CLIFF','CLIMB','CLOCK','CLONE','CLOSE','CLOTH','CLOUD',
  'COACH','COAST','CORAL','COULD','COURT','COVER','CRAFT','CRANE','CRASH','CRAZY',
  'CREAM','CRIME','CROSS','CROWD','CROWN','CYCLE','DAILY','DANCE','DIARY','DISCO',
  'DIZZY','DOUBT','DRAFT','DRAIN','DREAM','DRESS','DRINK','DRIVE','DROWN','DYING',
  'EAGLE','EARTH','EIGHT','EMPTY','ENJOY','ENTER','ERROR','EVADE','EVENT','EXTRA',
  'FAINT','FAITH','FALSE','FANCY','FEAST','FEVER','FEWER','FIELD','FIGHT','FINAL',
  'FIRST','FLAME','FLASH','FLOAT','FLOOR','FOCUS','FORCE','FORTH','FORUM','FOUND',
  'FRAME','FRANK','FRESH','FRONT','FROST','FRUIT','GHOST','GIVEN','GLASS','GLOBE',
  'GLORY','GRACE','GRADE','GRAIN','GRAND','GRANT','GRASP','GRASS','GRAVE','GREAT',
  'GREEN','GREET','GUIDE','GUILT','HAPPY','HARSH','HEAVY','HEDGE','HENCE','HONOR',
  'HORSE','HOTEL','HOUSE','HUMAN','HURRY','IMAGE','INDEX','INNER','INPUT','ISSUE',
  'IVORY','JUDGE','JUICE','KARMA','KNIFE','KNOCK','LARGE','LASER','LAUGH','LAYER',
  'LEARN','LIGHT','LIMIT','LOCAL','LOGIC','LOOSE','LUCKY','LUNAR','LUNCH','MAGIC',
  'MAJOR','MAKER','MARCH','MATCH','MAYOR','MERCY','MERIT','METAL','MIGHT','MIXED',
  'MODEL','MONEY','MONTH','MORAL','MOTOR','MOUNT','MOUSE','MOUTH','MOVIE','MUSIC',
  'NAIVE','NOVEL','OCEAN','OFFER','OLIVE','OPERA','ORDER','OTHER','OUTER','PANIC',
  'PASTE','PATCH','PAUSE','PEACE','PEARL','PENNY','PHOTO','PIANO','PILOT','PIZZA',
  'PLACE','PLAIN','PLANE','PLANT','POINT','POLAR','POWER','PRESS','PRICE','PRIDE',
  'PRIME','PRINT','PRIZE','PROOF','PROUD','PROVE','PULSE','PUNCH','PURSE','QUEEN',
  'QUERY','QUICK','QUIET','RADIO','RAISE','RANGE','RAPID','REACH','READY','REBEL',
  'REFER','REPLY','RIDER','RIGHT','RISKY','ROBIN','ROBOT','ROUGH','ROUND','ROUTE',
  'ROYAL','RULER','SADLY','SAINT','SAUCE','SCALE','SCARE','SCENE','SCORE','SCOUT',
  'SERVE','SEVEN','SHADE','SHALL','SHAME','SHARE','SHARP','SHELF','SHELL','SHIFT',
  'SHINE','SHIRT','SHORE','SHORT','SHOUT','SILLY','SINCE','SIXTH','SKILL','SLICE',
  'SLIDE','SMART','SMELL','SMILE','SMOKE','SNAKE','SOLAR','SOLVE','SOUTH','SPACE',
  'SPARK','SPEAK','SPEED','SPEND','SPOKE','SPORT','STAGE','STAIN','STALE','STAND',
  'START','STEAL','STEAM','STEEL','STICK','STILL','STOCK','STORE','STORM','STORY',
  'STUDY','STYLE','SUGAR','SUNNY','SURGE','SWEAR','SWEET','SWIFT','TABLE','TASTE',
  'TEACH','TEETH','THERE','THESE','THICK','THING','THINK','THIRD','THOSE','THREE',
  'THROW','TIGER','TIGHT','TIMER','TIRED','TITLE','TOAST','TOKEN','TOPIC','TORCH',
  'TOUCH','TOUGH','TOWER','TOXIC','TRACK','TRADE','TRAIL','TRAIN','TRAIT','TREAT',
  'TREND','TRIAL','TRIBE','TROUT','TRUCK','TRULY','TRUST','TRUTH','TULIP','TWICE',
  'ULTRA','UNDER','UNION','UNITE','UNTIL','UPSET','URBAN','VALID','VALUE','VAPOR',
  'VAULT','VIRAL','VISIT','VITAL','VOICE','VOTER','WASTE','WATER','WEIRD','WHALE',
  'WHERE','WHICH','WHILE','WHITE','WHOLE','WOMAN','WORLD','WORRY','WORSE','WORST',
  'WORTH','WOULD','WRIST','WRITE','YACHT','YIELD','YOUNG','YOUTH',
];

const CONNECTIONS_PUZZLES = [
  [
    { name:'ANIMALS',  color:'green',  words:['TIGER','LION','BEAR','WOLF']       },
    { name:'COLORS',   color:'yellow', words:['AZURE','IVORY','CORAL','TEAL']     },
    { name:'PLANETS',  color:'blue',   words:['EARTH','VENUS','MARS','SATURN']    },
    { name:'SPORTS',   color:'red',    words:['RUGBY','POLO','SUMO','FENCING']    },
  ],
  [
    { name:'FRUITS',   color:'green',  words:['MANGO','GUAVA','LYCHEE','PAPAYA']  },
    { name:'TOOLS',    color:'yellow', words:['DRILL','LATHE','CHISEL','PLANE']   },
    { name:'DANCES',   color:'blue',   words:['WALTZ','TANGO','POLKA','SAMBA']    },
    { name:'GEMS',     color:'red',    words:['TOPAZ','GARNET','OPAL','JASPER']   },
  ],
  [
    { name:'DOGS',     color:'green',  words:['HUSKY','BOXER','POODLE','BEAGLE']  },
    { name:'PASTA',    color:'yellow', words:['PENNE','RIGATONI','ORZO','ZITI']   },
    { name:'CAPITALS', color:'blue',   words:['OSLO','LIMA','CAIRO','SEOUL']      },
    { name:'TREES',    color:'red',    words:['OAK','MAPLE','BIRCH','CEDAR']      },
  ],
  [
    { name:'OCEANS',   color:'green',  words:['PACIFIC','ATLANTIC','INDIAN','ARCTIC'] },
    { name:'CHEESES',  color:'yellow', words:['BRIE','GOUDA','FETA','EDAM']       },
    { name:'RIVERS',   color:'blue',   words:['NILE','THAMES','AMAZON','GANGES']  },
    { name:'INSECTS',  color:'red',    words:['MOTH','WASP','APHID','MIDGE']      },
  ],
];

const CONTEXTO_DATA = [
  { word:'OCEAN',  related:['SEA','WAVE','TIDE','FISH','CORAL','BEACH','WATER','DEEP','SALT','BLUE','SHARK','WHALE','SHELL','SAND','SURF','BOAT','SWIM','DIVE','REEF','CURRENT','DOLPHIN','COAST','ABYSS','STORM','MARINE','ISLAND','PORT','SHIP','ANCHOR','LAKE'] },
  { word:'MUSIC',  related:['SONG','BEAT','TUNE','NOTE','CHORD','MELODY','RHYTHM','LYRIC','BAND','DRUM','PIANO','GUITAR','SOUND','DANCE','PLAY','VOICE','ARTIST','ALBUM','STAGE','RADIO','CONCERT','SCALE','TEMPO','JAZZ','ROCK','POP','BASS','CLAP','SING','LISTEN'] },
  { word:'FIRE',   related:['FLAME','BURN','HEAT','SMOKE','ASH','EMBER','SPARK','GLOW','TORCH','OVEN','MATCH','WOOD','COAL','BLAZE','HOT','LIGHT','WARM','COOK','CAMPFIRE','LAVA','DANGER','ALARM','RAGE','PASSION','ENERGY','FORGE','KILN','CANDLE','BEACON','SCORCH'] },
  { word:'SPACE',  related:['STAR','MOON','PLANET','ORBIT','GALAXY','ROCKET','NASA','VOID','COSMOS','COMET','NEBULA','SUN','EARTH','MARS','DARK','VACUUM','ZERO','GRAVITY','SHUTTLE','ASTEROID','TELESCOPE','ALIEN','LAUNCH','FLOAT','SATELLITE','EXPLORE','VOID','LAUNCH','PROBE','MISSION'] },
  { word:'GARDEN', related:['FLOWER','PLANT','SOIL','SEED','WATER','GROW','TREE','LEAF','ROOT','GRASS','PRUNE','WEED','FENCE','TOOL','SPADE','HOSE','BEE','BUG','PETAL','BLOOM','SHRUB','MULCH','COMPOST','RAKE','MOWER','PORCH','PATH','GATE','HEDGE','POND'] },
  { word:'KITCHEN', related:['COOK','OVEN','PAN','POT','STOVE','KNIFE','BOWL','SPOON','FORK','PLATE','SINK','FRIDGE','FREEZER','MIXER','BLENDER','WHISK','TRAY','TIMER','STEAM','BOIL','CHOP','SLICE','BAKE','FRY','GRILL','RECIPE','INGREDIENT','TASTE','PREP','DISH'] },
];

// ── Game initializers ─────────────────────────────────────────────────────────
const GameInit = {
  wordle(room) {
    const word = WORDS[Math.floor(Math.random() * WORDS.length)];
    const boards = {};
    room.players.forEach(p => {
      boards[p.id] = { guesses: [], results: [], solved: false };
    });
    return { word, boards };
  },

  connections(room) {
    const puzzle = CONNECTIONS_PUZZLES[Math.floor(Math.random() * CONNECTIONS_PUZZLES.length)];
    const words  = puzzle.flatMap(g => g.words).sort(() => Math.random() - 0.5);
    return { groups: puzzle, words, solved: {}, mistakes: {}, maxMistakes: 4 };
  },

  contexto(room) {
    const entry = CONTEXTO_DATA[Math.floor(Math.random() * CONTEXTO_DATA.length)];
    return { answer: entry.word, related: entry.related, guesses: {}, solved: {} };
  },

  connect4(room) {
    return {
      board:   Array.from({ length: 6 }, () => Array(7).fill(null)),
      players: room.players.map(p => p.id),
      colors:  { [room.players[0]?.id]: 'red', [room.players[1]?.id]: 'yellow' },
      current: room.players[0]?.id,
      winner:  null,
      draw:    false,
    };
  },

  uno(room) {
    const deck = makeUnoDeck();
    shuffleArr(deck);
    const hands = {};
    room.players.forEach(p => { hands[p.id] = deck.splice(0, 7); });
    let topIdx = deck.findIndex(c => c.color !== 'wild');
    if (topIdx === -1) topIdx = 0;
    const [top] = deck.splice(topIdx, 1);
    return { deck, discard: [top], hands, activeColor: top.color, currentIdx: 0, direction: 1 };
  },

  wouldyourather(room) {
    return {
      phase: 'submit', submissions: {}, questions: [], currentQ: 0,
      votes: {}, scores: Object.fromEntries(room.players.map(p => [p.id, 0])),
    };
  },

  twotruthslielie(room) {
    return {
      phase: 'submit', submissions: {}, currentSubjectIdx: 0,
      guesses: {}, scores: Object.fromEntries(room.players.map(p => [p.id, 0])),
    };
  },

  neverever(room) {
    return {
      phase: 'submit', submissions: {}, questions: [], currentQ: 0,
      answers: {}, scores: Object.fromEntries(room.players.map(p => [p.id, 0])),
    };
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function makeUnoDeck() {
  const colors = ['red', 'blue', 'green', 'yellow'];
  const cards = [];
  for (const c of colors) {
    for (const v of [0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,'skip','skip','reverse','reverse','draw2','draw2'])
      cards.push({ color: c, value: String(v) });
  }
  for (let i = 0; i < 4; i++) {
    cards.push({ color: 'wild', value: 'wild' }, { color: 'wild', value: 'wild4' });
  }
  return cards;
}

function shuffleArr(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function wordleScore(guess, target) {
  const result    = Array(5).fill('absent');
  const remaining = target.split('');
  for (let i = 0; i < 5; i++) {
    if (guess[i] === target[i]) { result[i] = 'correct'; remaining[i] = null; }
  }
  for (let i = 0; i < 5; i++) {
    if (result[i] === 'correct') continue;
    const idx = remaining.indexOf(guess[i]);
    if (idx !== -1) { result[i] = 'present'; remaining[idx] = null; }
  }
  return result;
}

function contextoRank(word, answer, related) {
  if (word === answer) return 0;
  const idx = related.indexOf(word);
  if (idx !== -1) return idx + 1;
  let h = 0;
  for (const c of word) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return 50 + (h % 900);
}

// ── Per-player state views ────────────────────────────────────────────────────
function stateFor(room, pid) {
  const gs = room.gameState;
  const players = room.players.map(p => ({ id: p.id, name: p.name }));

  switch (room.game) {
    case 'wordle': {
      const b = gs.boards[pid] || { guesses: [], results: [], solved: false };
      const progress = {};
      room.players.forEach(p => {
        const pb = gs.boards[p.id] || {};
        progress[p.id] = { solved: pb.solved, attempts: (pb.guesses||[]).length };
      });
      const finished = room.players.every(p => {
        const pb = gs.boards[p.id] || {};
        return pb.solved || (pb.guesses||[]).length >= 6;
      });
      return { board: { ...b, attempts: b.guesses.length }, progress, players, finished };
    }

    case 'connections': {
      const mySolved = gs.solved[pid] || [];
      const usedWords = mySolved.flatMap(g => g.words);
      return {
        words:       gs.words.filter(w => !usedWords.includes(w)),
        solved:      mySolved,
        mistakes:    gs.mistakes[pid] || 0,
        maxMistakes: gs.maxMistakes,
        progress:    Object.fromEntries(room.players.map(p => [p.id, { solved: (gs.solved[p.id]||[]).length }])),
        players,
      };
    }

    case 'contexto':
      return { guesses: gs.guesses[pid] || [], solved: !!(gs.solved[pid]) };

    case 'connect4':
      return {
        board: gs.board, playerColors: gs.colors,
        current: gs.winner || gs.draw ? null : gs.current,
        winner: gs.winner, draw: gs.draw,
      };

    case 'uno': {
      const order = room.players.map(p => p.id);
      const currentId = order[gs.currentIdx % order.length];
      return {
        top: gs.discard[gs.discard.length - 1],
        activeColor: gs.activeColor,
        currentPlayer: currentId,
        hand: gs.hands[pid] || [],
        handCounts: Object.fromEntries(room.players.map(p => [p.id, (gs.hands[p.id]||[]).length])),
      };
    }

    case 'wouldyourather':
      return {
        phase:        gs.phase,
        question:     gs.questions[gs.currentQ],
        currentQ:     gs.currentQ,
        totalQ:       gs.questions.length,
        myVote:       (gs.votes[gs.currentQ] || {})[pid] || null,
        votes:        gs.phase === 'results' ? (gs.votes[gs.currentQ] || {}) : {},
        players,
        scores:       gs.scores,
        hasSubmitted: !!(gs.submissions[pid]),
      };

    case 'twotruthslielie': {
      const subjectId = room.players[gs.currentSubjectIdx]?.id;
      const sub = gs.submissions[subjectId];
      const lieIdx = sub ? sub.findIndex(s => s.isLie) : -1;
      const myG = (gs.guesses[gs.currentSubjectIdx] || {})[pid];
      return {
        phase:        gs.phase,
        hasSubmitted: !!(gs.submissions[pid]),
        players,
        currentPlayer: subjectId,
        statements:   (gs.phase !== 'submit' && sub) ? sub.map(s => s.text) : [],
        lieIdx:       gs.phase === 'reveal' ? lieIdx : null,
        myGuess:      myG ?? null,
        correct:      gs.phase === 'reveal' ? (myG === lieIdx) : null,
        scores:       gs.scores,
      };
    }

    case 'neverever':
      return {
        phase:    gs.phase,
        question: gs.questions[gs.currentQ],
        currentQ: gs.currentQ,
        totalQ:   gs.questions.length,
        myAnswer: (gs.answers[gs.currentQ] || {})[pid] ?? null,
        answers:  gs.phase === 'reveal' ? (gs.answers[gs.currentQ] || {}) : {},
        players,
        scores:   gs.scores,
        hasSubmitted: !!(gs.submissions[pid]),
      };

    default:
      return {};
  }
}

function sendStateToAll(room) {
  room.players.forEach(p => io.to(p.id).emit('gameState', stateFor(room, p.id)));
}

// ── Action handlers ───────────────────────────────────────────────────────────
const GameAction = {

  wordle(room, pid, action, socket) {
    const gs = room.gameState;
    const board = gs.boards[pid];
    if (!board) return;
    if (board.solved || board.guesses.length >= 6) {
      socket.emit('gameError', 'Your game is already finished');
      return;
    }
    const word = (action.word || '').toUpperCase().trim();
    if (word.length !== 5)      { socket.emit('gameError', 'Word must be 5 letters'); return; }
    if (!/^[A-Z]+$/.test(word)) { socket.emit('gameError', 'Letters only'); return; }

    const result = wordleScore(word, gs.word);
    board.guesses.push(word);
    board.results.push(result);
    board.solved = result.every(r => r === 'correct');

    socket.emit('gameState', stateFor(room, pid));

    const allDone = room.players.every(p => {
      const b = gs.boards[p.id] || {};
      return b.solved || (b.guesses||[]).length >= 6;
    });

    if (allDone) {
      const winner = room.players.find(p => gs.boards[p.id]?.solved)?.id || null;
      io.to(room.code).emit('gameFinish', { winner, answer: gs.word });
    } else if (board.solved || board.guesses.length >= 6) {
      socket.emit('gameFinish', {
        winner: board.solved ? pid : null,
        answer: board.solved || board.guesses.length >= 6 ? gs.word : undefined,
      });
    }
  },

  connections(room, pid, action, socket) {
    const gs = room.gameState;
    if (action.type !== 'guess') return;
    const sel = action.words || [];
    if (sel.length !== 4) { socket.emit('gameError', 'Select exactly 4 words'); return; }

    const mySolved   = gs.solved[pid] || [];
    const usedWords  = mySolved.flatMap(g => g.words);
    const validWords = gs.words.filter(w => !usedWords.includes(w));
    if (!sel.every(w => validWords.includes(w))) {
      socket.emit('gameError', 'Invalid selection');
      return;
    }
    if (mySolved.find(s => sel.every(w => s.words.includes(w)))) {
      socket.emit('gameError', 'Already solved!');
      return;
    }

    const match = gs.groups.find(g =>
      g.words.every(w => sel.includes(w)) && sel.every(w => g.words.includes(w))
    );
    if (!match) {
      gs.mistakes[pid] = (gs.mistakes[pid] || 0) + 1;
      const best = gs.groups.map(g => ({ g, hits: g.words.filter(w => sel.includes(w)).length })).sort((a,b) => b.hits - a.hits)[0];
      const msg = (gs.mistakes[pid] >= gs.maxMistakes) ? 'Out of guesses!'
                : (best?.hits === 3) ? 'One away!'
                : 'Not a group!';
      socket.emit('gameError', msg);
      socket.emit('gameState', stateFor(room, pid));
      return;
    }

    if (!gs.solved[pid]) gs.solved[pid] = [];
    gs.solved[pid].push(match);
    socket.emit('gameState', stateFor(room, pid));

    if (gs.solved[pid].length === gs.groups.length) {
      socket.emit('gameFinish', { winner: pid });
    }
  },

  contexto(room, pid, action, socket) {
    const gs = room.gameState;
    if (action.type === 'giveUp') {
      gs.solved[pid] = false;
      socket.emit('gameState', { ...stateFor(room, pid), gaveUp: true, answer: gs.answer });
      socket.emit('gameFinish', { winner: null, answer: gs.answer });
      return;
    }
    if (action.type !== 'guess') return;
    const word = (action.word || '').toUpperCase().trim();
    if (!word) { socket.emit('gameError', 'Enter a word'); return; }
    if (!gs.guesses[pid]) gs.guesses[pid] = [];
    if (gs.guesses[pid].find(g => g.word === word)) {
      socket.emit('gameError', 'Already guessed that');
      return;
    }

    const score = contextoRank(word, gs.answer, gs.related);
    gs.guesses[pid].push({ word, score });

    if (score === 0) {
      gs.solved[pid] = true;
      socket.emit('gameState', { ...stateFor(room, pid), answer: gs.answer });
      socket.emit('gameFinish', { winner: pid, answer: gs.answer });
    } else {
      socket.emit('gameState', stateFor(room, pid));
    }
  },

  connect4(room, pid, action, socket) {
    const gs = room.gameState;
    if (action.type !== 'drop') return;
    if (gs.winner || gs.draw)   { socket.emit('gameError', 'Game is over'); return; }
    if (gs.current !== pid)     { socket.emit('gameError', 'Not your turn'); return; }

    const col = action.col;
    let row = -1;
    for (let r = 5; r >= 0; r--) {
      if (!gs.board[r][col]) { gs.board[r][col] = pid; row = r; break; }
    }
    if (row === -1) { socket.emit('gameError', 'Column is full'); return; }

    // Check win
    const dirs = [[0,1],[1,0],[1,1],[1,-1]];
    let won = false;
    for (const [dr, dc] of dirs) {
      let count = 1;
      for (const d of [-1, 1]) {
        let r = row + d*dr, c = col + d*dc;
        while (r>=0 && r<6 && c>=0 && c<7 && gs.board[r][c] === pid) {
          count++; r += d*dr; c += d*dc;
        }
      }
      if (count >= 4) { won = true; break; }
    }

    if (won) {
      gs.winner = pid;
      sendStateToAll(room);
      io.to(room.code).emit('gameFinish', { winner: pid });
      return;
    }
    if (gs.board.every(r => r.every(c => c !== null))) {
      gs.draw = true;
      sendStateToAll(room);
      io.to(room.code).emit('gameFinish', { winner: null });
      return;
    }

    // Next player
    const idx = gs.players.indexOf(pid);
    gs.current = gs.players[(idx + 1) % gs.players.length];
    sendStateToAll(room);
  },

  uno(room, pid, action, socket) {
    const gs    = room.gameState;
    const order = room.players.map(p => p.id);
    const currentId = order[gs.currentIdx % order.length];
    if (currentId !== pid) { socket.emit('gameError', 'Not your turn'); return; }

    function advanceTurn(skip = 0) {
      gs.currentIdx = (gs.currentIdx + gs.direction * (1 + skip) + order.length * 10) % order.length;
    }

    if (action.type === 'draw') {
      const card = gs.deck.pop() || { color: 'red', value: '5' };
      gs.hands[pid].push(card);
      advanceTurn();
      sendStateToAll(room);
      return;
    }

    if (action.type !== 'play') return;
    const card = gs.hands[pid]?.[action.cardIdx];
    if (!card) { socket.emit('gameError', 'Invalid card'); return; }

    const top = gs.discard[gs.discard.length - 1];
    if (card.color !== 'wild' && card.color !== gs.activeColor && card.value !== top.value) {
      socket.emit('gameError', 'Card not playable');
      return;
    }

    gs.hands[pid].splice(action.cardIdx, 1);
    gs.discard.push(card);
    gs.activeColor = action.chosenColor || card.color;

    if (gs.hands[pid].length === 0) {
      const pts = Object.entries(gs.hands)
        .filter(([id]) => id !== pid)
        .reduce((s, [, h]) => s + h.reduce((a, c) => {
          if (c.value === 'wild' || c.value === 'wild4') return a + 50;
          if (['skip','reverse','draw2'].includes(c.value)) return a + 20;
          return a + (parseInt(c.value) || 0);
        }, 0), 0);
      io.to(room.code).emit('gameFinish', { winner: pid, scores: { [pid]: pts } });
      return;
    }

    const nextIdx = (gs.currentIdx + gs.direction + order.length) % order.length;
    const nextId  = order[nextIdx];
    let skip = 0;

    if (card.value === 'draw2') {
      for (let i = 0; i < 2; i++) gs.hands[nextId].push(gs.deck.pop() || { color: 'red', value: '0' });
      skip = 1;
    }
    if (card.value === 'wild4') {
      for (let i = 0; i < 4; i++) gs.hands[nextId].push(gs.deck.pop() || { color: 'red', value: '0' });
      skip = 1;
    }
    if (card.value === 'skip') { skip = 1; }
    if (card.value === 'reverse') {
      gs.direction *= -1;
      if (room.players.length === 2) skip = 1;
    }

    advanceTurn(skip);
    sendStateToAll(room);
  },

  wouldyourather(room, pid, action, socket) {
    const gs = room.gameState;

    if (gs.phase === 'submit' && action.type === 'submitQuestions') {
      gs.submissions[pid] = action.questions;
      if (room.players.every(p => gs.submissions[p.id])) {
        gs.questions = Object.values(gs.submissions).flat().sort(() => Math.random() - 0.5);
        gs.phase = 'vote';
        gs.currentQ = 0;
        gs.votes = {};
        sendStateToAll(room);
      } else {
        socket.emit('gameState', stateFor(room, pid));
      }
      return;
    }

    if (gs.phase === 'vote' && action.type === 'vote') {
      if (!gs.votes[gs.currentQ]) gs.votes[gs.currentQ] = {};
      gs.votes[gs.currentQ][pid] = action.choice;
      if (room.players.every(p => gs.votes[gs.currentQ]?.[p.id])) {
        gs.phase = 'results';
        const vA = Object.values(gs.votes[gs.currentQ]).filter(v => v === 'A').length;
        const vB = Object.values(gs.votes[gs.currentQ]).filter(v => v === 'B').length;
        const maj = vA > vB ? 'A' : vB > vA ? 'B' : null;
        if (maj) {
          room.players.forEach(p => {
            if (gs.votes[gs.currentQ][p.id] === maj) gs.scores[p.id]++;
          });
        }
        sendStateToAll(room);
      } else {
        socket.emit('gameState', stateFor(room, pid));
      }
      return;
    }

    if (gs.phase === 'results' && action.type === 'nextQuestion' && pid === room.host) {
      gs.currentQ++;
      if (gs.currentQ >= gs.questions.length) {
        const winner = Object.entries(gs.scores).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
        io.to(room.code).emit('gameFinish', { winner });
        return;
      }
      gs.phase = 'vote';
      sendStateToAll(room);
    }
  },

  twotruthslielie(room, pid, action, socket) {
    const gs = room.gameState;

    if (gs.phase === 'submit' && action.type === 'submit') {
      gs.submissions[pid] = action.statements; // array of {text, isLie}
      if (room.players.every(p => gs.submissions[p.id])) {
        gs.phase = 'guess';
        gs.currentSubjectIdx = 0;
        gs.guesses = {};
        sendStateToAll(room);
      } else {
        socket.emit('gameState', stateFor(room, pid));
      }
      return;
    }

    if (gs.phase === 'guess' && action.type === 'guess') {
      const subjectId  = room.players[gs.currentSubjectIdx]?.id;
      if (pid === subjectId) { socket.emit('gameError', "You can't guess your own statements"); return; }
      if (!gs.guesses[gs.currentSubjectIdx]) gs.guesses[gs.currentSubjectIdx] = {};
      gs.guesses[gs.currentSubjectIdx][pid] = action.lieIndex;

      const guessers = room.players.filter(p => p.id !== subjectId);
      if (guessers.every(p => gs.guesses[gs.currentSubjectIdx]?.[p.id] !== undefined)) {
        const sub     = gs.submissions[subjectId];
        const lieIdx  = sub ? sub.findIndex(s => s.isLie) : -1;
        guessers.forEach(p => {
          if (gs.guesses[gs.currentSubjectIdx][p.id] === lieIdx) gs.scores[p.id]++;
        });
        gs.phase = 'reveal';
        sendStateToAll(room);
      } else {
        socket.emit('gameState', stateFor(room, pid));
      }
      return;
    }

    if (gs.phase === 'reveal' && action.type === 'next' && pid === room.host) {
      gs.currentSubjectIdx++;
      if (gs.currentSubjectIdx >= room.players.length) {
        const winner = Object.entries(gs.scores).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
        io.to(room.code).emit('gameFinish', { winner });
        return;
      }
      gs.phase = 'guess';
      sendStateToAll(room);
    }
  },

  neverever(room, pid, action, socket) {
    const gs = room.gameState;

    if (gs.phase === 'submit' && action.type === 'submitQuestions') {
      gs.submissions[pid] = action.questions;
      if (room.players.every(p => gs.submissions[p.id])) {
        gs.questions = Object.values(gs.submissions).flat()
          .map(t => ({ text: t }))
          .sort(() => Math.random() - 0.5);
        gs.phase = 'play';
        gs.currentQ = 0;
        gs.answers  = {};
        sendStateToAll(room);
      } else {
        socket.emit('gameState', stateFor(room, pid));
      }
      return;
    }

    if (gs.phase === 'play' && action.type === 'answer') {
      if (!gs.answers[gs.currentQ]) gs.answers[gs.currentQ] = {};
      gs.answers[gs.currentQ][pid] = action.haveI;
      if (room.players.every(p => gs.answers[gs.currentQ]?.[p.id] !== undefined)) {
        const vals     = Object.values(gs.answers[gs.currentQ]);
        const hadCount = vals.filter(Boolean).length;
        const majority = hadCount > vals.length / 2;
        room.players.forEach(p => {
          if (gs.answers[gs.currentQ][p.id] === majority) gs.scores[p.id]++;
        });
        gs.phase = 'reveal';
        sendStateToAll(room);
      } else {
        socket.emit('gameState', stateFor(room, pid));
      }
      return;
    }

    if (gs.phase === 'reveal' && action.type === 'next' && pid === room.host) {
      gs.currentQ++;
      if (gs.currentQ >= gs.questions.length) {
        io.to(room.code).emit('gameFinish', { winner: null });
        return;
      }
      gs.phase = 'play';
      sendStateToAll(room);
    }
  },
};

// ── Socket.IO connection handling ─────────────────────────────────────────────
io.on('connection', socket => {
  let pid  = null;
  let name = null;
  let code = null;

  socket.on('login', ({ name: n }) => {
    const clean = (n || '').trim().slice(0, 16);
    if (!clean) { socket.emit('loginError', 'Name is required'); return; }
    pid  = socket.id;
    name = clean;
    players.set(pid, { id: pid, name: clean });
    socket.emit('loginOk', { id: pid, name: clean });
  });

  socket.on('getLobbyList', () => {
    const list = [...rooms.values()]
      .filter(r => !r.started)
      .map(r => ({ code: r.code, game: r.game, playerCount: r.players.length }));
    socket.emit('lobbyList', list);
  });

  socket.on('createRoom', ({ game }) => {
    if (!pid) return;
    code = makeCode();
    const room = {
      code, game: game || 'wordle', host: pid,
      players: [{ id: pid, name }], started: false, gameState: null,
    };
    rooms.set(code, room);
    socket.join(code);
    socket.emit('roomJoined', roomSnapshot(room));
    broadcastLobby();
  });

  socket.on('joinRoom', ({ code: c }) => {
    if (!pid) return;
    const room = rooms.get((c || '').toUpperCase());
    if (!room || room.started) return;
    if (!room.players.find(p => p.id === pid)) {
      room.players.push({ id: pid, name });
    }
    code = room.code;
    socket.join(code);
    socket.emit('roomJoined', roomSnapshot(room));
    socket.to(code).emit('roomUpdate', roomSnapshot(room));
  });

  socket.on('leaveRoom', () => {
    if (!code) return;
    const room = rooms.get(code);
    if (room) {
      room.players = room.players.filter(p => p.id !== pid);
      if (room.players.length === 0) {
        rooms.delete(code);
      } else {
        if (room.host === pid) room.host = room.players[0].id;
        broadcastRoom(code);
        io.to(code).emit('chat', { from: name, msg: 'left the room.', system: true });
      }
      broadcastLobby();
    }
    socket.leave(code);
    code = null;
  });

  socket.on('startGame', () => {
    if (!code || !pid) return;
    const room = rooms.get(code);
    if (!room || room.host !== pid) return;
    room.started = true;
    const initFn = GameInit[room.game];
    room.gameState = initFn ? initFn(room) : {};
    io.to(code).emit('gameStarted', { game: room.game });
    setTimeout(() => sendStateToAll(room), 120);
    broadcastLobby();
  });

  socket.on('gameAction', action => {
    if (!code || !pid) return;
    const room = rooms.get(code);
    if (!room || !room.started) return;
    const handler = GameAction[room.game];
    if (handler) handler(room, pid, action, socket);
  });

  socket.on('chat', ({ msg }) => {
    if (!code || !msg) return;
    io.to(code).emit('chat', { from: name, msg: String(msg).slice(0, 300) });
  });

  socket.on('disconnect', () => {
    if (code) {
      const room = rooms.get(code);
      if (room) {
        room.players = room.players.filter(p => p.id !== pid);
        if (room.players.length === 0) {
          rooms.delete(code);
        } else {
          if (room.host === pid) room.host = room.players[0].id;
          broadcastRoom(code);
          io.to(code).emit('chat', { from: name, msg: 'disconnected.', system: true });
        }
        broadcastLobby();
      }
    }
    if (pid) players.delete(pid);
  });
});

// ── Start ─────────────────────────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`\n🎮  Goon Room is live on port ${PORT}`);
  console.log(`    Password : goonroom2025`);
  console.log(`    Admin pw : hostmaster\n`);
});
