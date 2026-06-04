// ─── Goon Room — server.js ───────────────────────────────────────────────────
const express   = require('express');
const http      = require('http');
const { Server } = require('socket.io');
const path      = require('path');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server);

const PORT = process.env.PORT || 3000;

// ── Static files ─────────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── In-memory state ───────────────────────────────────────────────────────────
const players = new Map();  // socketId -> { id, name, roomId }
const rooms   = new Map();  // roomId   -> Room

function makeId(len = 6) {
  return Math.random().toString(36).substring(2, 2 + len).toUpperCase();
}

function getRoom(roomId) { return rooms.get(roomId); }

function broadcastLobbyList() {
  const list = [...rooms.values()]
    .filter(r => r.state === 'waiting')
    .map(r => ({
      id: r.id,
      code: r.code,
      game: r.game,
      playerCount: r.players.length,
    }));
  io.emit('lobbyList', list);
}

// ── Room factory ──────────────────────────────────────────────────────────────
function createRoom(hostId, game) {
  const id   = makeId(8);
  const code = makeId(4);
  const room = {
    id,
    code,
    game,
    state: 'waiting',   // 'waiting' | 'playing'
    players: [],        // [{ id, name }]
    hostId,
    gameState: null,
  };
  rooms.set(id, room);
  return room;
}

function removePlayerFromRoom(socketId) {
  const player = players.get(socketId);
  if (!player || !player.roomId) return;
  const room = getRoom(player.roomId);
  if (!room) return;

  room.players = room.players.filter(p => p.id !== socketId);
  player.roomId = null;

  if (room.players.length === 0) {
    rooms.delete(room.id);
    broadcastLobbyList();
    return;
  }

  // Pass host to next player
  if (room.hostId === socketId) {
    room.hostId = room.players[0].id;
  }

  io.to(room.id).emit('roomUpdate', {
    players: room.players,
    hostId: room.hostId,
  });
  io.to(room.id).emit('systemMessage', `${player.name} left the room.`);
  broadcastLobbyList();
}

// ═══════════════════════════════════════════════════════════════════════════════
//  GAME ENGINES
// ═══════════════════════════════════════════════════════════════════════════════

// ── UNO ───────────────────────────────────────────────────────────────────────
const UNO = (() => {
  const COLORS  = ['red','blue','green','yellow'];
  const VALUES  = ['0','1','2','3','4','5','6','7','8','9','skip','reverse','draw2'];
  const WILDS   = ['wild','wild4'];

  function buildDeck() {
    const deck = [];
    COLORS.forEach(c => {
      VALUES.forEach(v => {
        deck.push({ color: c, value: v });
        if (v !== '0') deck.push({ color: c, value: v });
      });
    });
    WILDS.forEach(v => {
      for (let i = 0; i < 4; i++) deck.push({ color: 'wild', value: v });
    });
    return shuffle(deck);
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function init(room) {
    const deck   = buildDeck();
    const hands  = {};
    room.players.forEach(p => {
      hands[p.id] = deck.splice(0, 7);
    });
    // Ensure first discard is a number card
    let firstCard;
    do { firstCard = deck.splice(0, 1)[0]; } while (firstCard.color === 'wild');

    room.gameState = {
      deck,
      hands,
      discard:      [firstCard],
      activeColor:  firstCard.color,
      currentIdx:   0,
      direction:    1,
      drawPending:  0,
    };
    sendState(room);
  }

  function currentPlayerId(room) {
    const gs = room.gameState;
    return room.players[gs.currentIdx]?.id;
  }

  function advance(room) {
    const gs = room.gameState;
    gs.currentIdx = (gs.currentIdx + gs.direction + room.players.length) % room.players.length;
  }

  function sendState(room) {
    const gs = room.gameState;
    const top = gs.discard[gs.discard.length - 1];
    room.players.forEach(p => {
      const handCounts = {};
      room.players.forEach(q => { handCounts[q.id] = gs.hands[q.id].length; });
      io.to(p.id).emit('gameState', {
        top,
        activeColor:   gs.activeColor,
        currentPlayer: currentPlayerId(room),
        hand:          gs.hands[p.id],
        handCounts,
      });
    });
  }

  function draw(room, playerId) {
    const gs = room.gameState;
    if (currentPlayerId(room) !== playerId) return;
    if (gs.deck.length === 0) {
      const top = gs.discard.pop();
      gs.deck = shuffle(gs.discard);
      gs.discard = [top];
    }
    gs.hands[playerId].push(gs.deck.pop());
    advance(room);
    sendState(room);
  }

  function play(room, playerId, { cardIdx, chosenColor }) {
    const gs = room.gameState;
    if (currentPlayerId(room) !== playerId) {
      io.to(playerId).emit('gameError', "It's not your turn.");
      return;
    }
    const hand = gs.hands[playerId];
    const card = hand[cardIdx];
    if (!card) { io.to(playerId).emit('gameError', 'Invalid card.'); return; }

    const top = gs.discard[gs.discard.length - 1];
    const ok  = card.color === 'wild' ||
                card.color === gs.activeColor ||
                card.value === top.value;
    if (!ok) { io.to(playerId).emit('gameError', "Can't play that card."); return; }

    hand.splice(cardIdx, 1);
    gs.discard.push(card);

    if (card.color === 'wild') {
      gs.activeColor = chosenColor || 'red';
    } else {
      gs.activeColor = card.color;
    }

    // Check win
    if (hand.length === 0) {
      const scores = {};
      room.players.forEach(p => {
        scores[p.id] = gs.hands[p.id].reduce((s, c) => {
          const v = parseInt(c.value);
          return s + (isNaN(v) ? (c.value === 'wild' || c.value === 'wild4' ? 50 : 20) : v);
        }, 0);
      });
      io.to(room.id).emit('gameFinished', { winner: playerId, scores });
      room.state = 'waiting';
      return;
    }

    // Special cards
    advance(room);
    if (card.value === 'skip') advance(room);
    if (card.value === 'reverse') {
      gs.direction *= -1;
      if (room.players.length === 2) advance(room);
    }
    if (card.value === 'draw2') {
      const next = currentPlayerId(room);
      for (let i = 0; i < 2; i++) gs.hands[next].push(gs.deck.pop() || { color:'red', value:'0' });
      advance(room);
    }
    if (card.value === 'wild4') {
      const next = currentPlayerId(room);
      for (let i = 0; i < 4; i++) gs.hands[next].push(gs.deck.pop() || { color:'red', value:'0' });
      advance(room);
    }

    sendState(room);
  }

  return { init, play, draw };
})();

// ── WORDLE ────────────────────────────────────────────────────────────────────
const WORDLE = (() => {
  // 200 common 5-letter words
  const WORDS = [
    'CRANE','SLATE','AUDIO','RAISE','ARISE','STARE','SNARE','LEAST','ADORE','IRATE',
    'LEARN','ALONE','STALE','CRATE','TRACE','GRACE','PLACE','BLAZE','BLARE','FLARE',
    'SHARE','SPARE','GLARE','PHASE','CHASE','CEASE','TEASE','LEASE','BEAST','FEAST',
    'YEAST','COAST','TOAST','BOAST','ROAST','BLOAT','FLOAT','GLOAT','TROUT','SHOUT',
    'SCOUT','STOUT','ABOUT','DOUBT','PROUD','CLOUD','ALOUD','COULD','WOULD','SHOULD',
    'BROOD','BLOOD','FLOOD','FLOOR','SNORE','SCORE','STORE','SHORE','ADORN','SWORN',
    'SCORN','THORN','FORAY','BONUS','FOCUS','LOCUS','LOTUS','NOVUS','BONUS','FORUM',
    'WRIST','TWIST','CRISP','BRISK','WHISK','FRISK','FIRST','WORST','BURST','CURSE',
    'PURSE','NURSE','VERSE','TERSE','MERGE','VERGE','SURGE','PURGE','USURP','ULTRA',
    'LUNAR','POLAR','SOLAR','MOLAR','RULER','TUTOR','HUMOR','TUMOR','RUMOR','VIGOR',
    'RIGOR','MANOR','MAJOR','MINOR','VAPOR','FAVOR','VALOR','LABOR','TAPIR','ELIXIR',
    'MAGIC','PANIC','BASIC','TOPIC','STOIC','LYRIC','CIVIC','TOXIC','COMIC','SONIC',
    'TONIC','IONIC','IRONY','AGONY','EBONY','PHONY','CRONY','PEONY','ATONE','OZONE',
    'STONE','PHONE','PRONE','CLONE','DRONE','GROVE','STOVE','GLOVE','SHOVE','DROVE',
    'PROVE','TROVE','ABOVE','OLIVE','ALIVE','DRIVE','STRIVE','THRIVE','NERVE','CURVE',
    'SERVE','CARVE','STARVE','BRAVE','GRAVE','CRAVE','SLAVE','KNAVE','SHAVE','STAVE',
    'PLUME','FLUME','FLUTE','BRUTE','ACUTE','ROUTE','QUOTE','EMOTE','EVOKE','ELBOW',
    'BELOW','ELBOW','MELON','LEMON','DEMON','VENOM','DENIM','CLAIM','REALM','QUALM',
    'PSALM','PRISM','CHASM','SPASM','WHIRL','SWIRL','TWIRL','CHURN','STERN','INFER',
    'INTER','OUTER','INTER','ULTRA','EXTRA','ULTRA','OPERA','ARENA','TIARA','KARMA',
  ].filter((v, i, a) => a.indexOf(v) === i && v.length === 5);

  function pickWord() {
    return WORDS[Math.floor(Math.random() * WORDS.length)];
  }

  function score(guess, answer) {
    const result = Array(5).fill('absent');
    const ansArr = answer.split('');
    const used   = Array(5).fill(false);
    // Correct pass
    for (let i = 0; i < 5; i++) {
      if (guess[i] === ansArr[i]) { result[i] = 'correct'; used[i] = true; }
    }
    // Present pass
    for (let i = 0; i < 5; i++) {
      if (result[i] === 'correct') continue;
      const j = ansArr.findIndex((c, k) => !used[k] && c === guess[i]);
      if (j !== -1) { result[i] = 'present'; used[j] = true; }
    }
    return result;
  }

  function init(room) {
    const answer = pickWord();
    const boards = {};
    room.players.forEach(p => {
      boards[p.id] = { guesses: [], results: [], solved: false, attempts: 0 };
    });
    room.gameState = { answer, boards };
    room.players.forEach(p => sendState(room, p.id));
  }

  function sendState(room, playerId) {
    const gs    = room.gameState;
    const board = gs.boards[playerId];
    const progress = {};
    room.players.forEach(p => {
      const b = gs.boards[p.id];
      progress[p.id] = { solved: b.solved, attempts: b.attempts };
    });
    io.to(playerId).emit('gameState', {
      board,
      progress,
      players: room.players,
    });
  }

  function guess(room, playerId, word) {
    const gs    = room.gameState;
    const board = gs.boards[playerId];
    if (!board || board.solved || board.attempts >= 6) return;
    const w = word.toUpperCase();
    if (w.length !== 5) { io.to(playerId).emit('gameError', 'Must be 5 letters.'); return; }

    const result = score(w.split(''), gs.answer.split(''));
    board.guesses.push(w);
    board.results.push(result);
    board.attempts++;
    if (w === gs.answer) board.solved = true;

    room.players.forEach(p => sendState(room, p.id));

    if (board.solved) {
      io.to(playerId).emit('gameFinished', { winner: playerId, answer: gs.answer });
    } else if (board.attempts >= 6) {
      io.to(playerId).emit('gameFinished', { winner: null, answer: gs.answer });
    }
  }

  return { init, guess };
})();

// ── CONNECTIONS ───────────────────────────────────────────────────────────────
const CONNECTIONS = (() => {
  const PUZZLES = [
    {
      groups: [
        { name: 'Things in a kitchen',  color: 'yellow', words: ['FORK','SPOON','KNIFE','LADLE'] },
        { name: 'Dog breeds',           color: 'green',  words: ['HUSKY','BOXER','POODLE','BEAGLE'] },
        { name: '___ ball',             color: 'blue',   words: ['FIRE','FOOT','BASE','BASKET'] },
        { name: 'Types of music',       color: 'purple', words: ['JAZZ','BLUES','ROCK','SOUL'] },
      ],
    },
    {
      groups: [
        { name: 'Planets',              color: 'yellow', words: ['MARS','VENUS','EARTH','SATURN'] },
        { name: 'Card games',           color: 'green',  words: ['SNAP','POKER','UNO','BRIDGE'] },
        { name: '___ fish',             color: 'blue',   words: ['SWORD','STAR','CAT','BLOW'] },
        { name: 'Dances',               color: 'purple', words: ['TANGO','SALSA','WALTZ','JIVE'] },
      ],
    },
    {
      groups: [
        { name: 'Fruits',               color: 'yellow', words: ['MANGO','PEACH','PLUM','GRAPE'] },
        { name: 'Olympic sports',       color: 'green',  words: ['HURDLE','JAVELIN','DISCUS','VAULT'] },
        { name: '___ board',            color: 'blue',   words: ['CARD','SKATE','SNOW','DART'] },
        { name: 'Things that glow',     color: 'purple', words: ['EMBER','NEON','STAR','LAVA'] },
      ],
    },
  ];

  function init(room) {
    const puzzle  = PUZZLES[Math.floor(Math.random() * PUZZLES.length)];
    const allWords = puzzle.groups.flatMap(g => g.words);
    const shuffled = allWords.sort(() => Math.random() - 0.5);

    const progress = {};
    room.players.forEach(p => { progress[p.id] = { solved: 0, mistakes: 0 }; });

    room.gameState = {
      puzzle,
      shuffled,
      progress,
      solved: [],          // completed groups
    };
    sendState(room);
  }

  function sendState(room, targetId) {
    const gs          = room.gameState;
    const solvedWords = gs.solved.flatMap(g => g.words);
    const remaining   = gs.shuffled.filter(w => !solvedWords.includes(w));

    const send = (playerId) => {
      const prog = gs.progress[playerId] || { solved: 0, mistakes: 0 };
      io.to(playerId).emit('gameState', {
        words:       remaining,
        solved:      gs.solved,
        mistakes:    prog.mistakes,
        maxMistakes: 4,
        progress:    gs.progress,
        players:     room.players,
      });
    };

    if (targetId) { send(targetId); }
    else { room.players.forEach(p => send(p.id)); }
  }

  function guess(room, playerId, words) {
    const gs   = room.gameState;
    const prog = gs.progress[playerId];
    if (!prog) return;
    if (prog.mistakes >= 4) { io.to(playerId).emit('gameError', 'No mistakes remaining.'); return; }

    const match = gs.puzzle.groups.find(g =>
      g.words.every(w => words.includes(w)) && words.every(w => g.words.includes(w))
    );

    if (match) {
      // Check not already solved
      if (gs.solved.find(s => s.name === match.name)) {
        io.to(playerId).emit('gameError', 'Already solved!'); return;
      }
      gs.solved.push(match);
      prog.solved++;
      sendState(room);

      if (gs.solved.length === 4) {
        io.to(room.id).emit('gameFinished', { winner: playerId });
        room.state = 'waiting';
      }
    } else {
      prog.mistakes++;
      io.to(playerId).emit('gameError', 'Not quite — try again.');
      sendState(room, playerId);
    }
  }

  return { init, guess };
})();

// ── CONTEXTO ──────────────────────────────────────────────────────────────────
const CONTEXTO = (() => {
  // Word list with rough semantic neighbours ranked
  const ANSWERS = ['OCEAN','CASTLE','DRAGON','PIANO','JUNGLE','WINTER','COFFEE','MIRROR',
                   'ROCKET','CANDLE','BRIDGE','DESERT','GARDEN','ISLAND','TEMPLE'];

  // Very simple semantic distance: random but consistent per answer session
  function getScore(answer, guess) {
    if (guess === answer) return 0;
    // Deterministic pseudo-score based on string similarity
    let score = 0;
    const a = answer.split(''), g = guess.split('');
    let shared = 0;
    a.forEach(c => { if (g.includes(c)) shared++; });
    score = Math.max(1, 1000 - shared * 80 - (guess.length === answer.length ? 50 : 0));
    // Add some randomness seeded by the words so it's consistent
    const seed = [...answer, ...guess].reduce((s, c) => s + c.charCodeAt(0), 0);
    score = Math.max(1, Math.min(1000, score + (seed % 200) - 100));
    return guess === answer ? 0 : score;
  }

  function init(room) {
    const answer = ANSWERS[Math.floor(Math.random() * ANSWERS.length)];
    const boards = {};
    room.players.forEach(p => {
      boards[p.id] = { guesses: [], solved: false, gaveUp: false };
    });
    room.gameState = { answer, boards };
    room.players.forEach(p => sendState(room, p.id));
  }

  function sendState(room, playerId, revealAnswer) {
    const gs    = room.gameState;
    const board = gs.boards[playerId];
    const state = {
      guesses: board.guesses,
      solved:  board.solved,
      gaveUp:  board.gaveUp,
    };
    if (revealAnswer || board.solved || board.gaveUp) state.answer = gs.answer;
    io.to(playerId).emit('gameState', state);
  }

  function guess(room, playerId, word) {
    const gs    = room.gameState;
    const board = gs.boards[playerId];
    if (board.solved || board.gaveUp) return;
    const w     = word.toUpperCase().trim();
    if (!w)      { io.to(playerId).emit('gameError', 'Enter a word.'); return; }
    const score = getScore(gs.answer, w);
    board.guesses.push({ word: w, score });
    if (score === 0) {
      board.solved = true;
      sendState(room, playerId, true);
      io.to(playerId).emit('gameFinished', { winner: playerId, answer: gs.answer });
    } else {
      sendState(room, playerId);
    }
  }

  function giveUp(room, playerId) {
    const gs    = room.gameState;
    const board = gs.boards[playerId];
    board.gaveUp = true;
    sendState(room, playerId, true);
    io.to(playerId).emit('gameFinished', { winner: null, answer: gs.answer });
  }

  return { init, guess, giveUp };
})();

// ── CONNECT 4 ─────────────────────────────────────────────────────────────────
const CONNECT4 = (() => {
  const ROWS = 6, COLS = 7;

  function emptyBoard() {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  }

  function checkWin(board, playerId) {
    const check = (r, c, dr, dc) => {
      for (let i = 1; i < 4; i++) {
        const nr = r + dr * i, nc = c + dc * i;
        if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) return false;
        if (board[nr][nc] !== playerId) return false;
      }
      return true;
    };
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (board[r][c] !== playerId) continue;
        if ([[0,1],[1,0],[1,1],[1,-1]].some(([dr,dc]) => check(r,c,dr,dc))) return true;
      }
    }
    return false;
  }

  function init(room) {
    if (room.players.length < 2) {
      io.to(room.id).emit('systemMessage', 'Need at least 2 players for Connect 4.');
      return;
    }
    const colors = {};
    colors[room.players[0].id] = 'red';
    colors[room.players[1].id] = 'yellow';
    room.gameState = {
      board:        emptyBoard(),
      playerColors: colors,
      currentIdx:   0,
      winner:       null,
      draw:         false,
    };
    sendState(room);
  }

  function sendState(room) {
    const gs = room.gameState;
    io.to(room.id).emit('gameState', {
      board:        gs.board,
      playerColors: gs.playerColors,
      current:      room.players[gs.currentIdx]?.id,
      winner:       gs.winner,
      draw:         gs.draw,
    });
  }

  function drop(room, playerId, col) {
    const gs = room.gameState;
    if (room.players[gs.currentIdx]?.id !== playerId) {
      io.to(playerId).emit('gameError', "Not your turn."); return;
    }
    if (gs.winner || gs.draw) return;

    // Find lowest empty row
    let row = -1;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (!gs.board[r][col]) { row = r; break; }
    }
    if (row === -1) { io.to(playerId).emit('gameError', 'Column is full.'); return; }

    gs.board[row][col] = playerId;

    if (checkWin(gs.board, playerId)) {
      gs.winner = playerId;
      sendState(room);
      io.to(room.id).emit('gameFinished', { winner: playerId });
      room.state = 'waiting';
      return;
    }

    const full = gs.board[0].every(c => c !== null);
    if (full) {
      gs.draw = true;
      sendState(room);
      io.to(room.id).emit('gameFinished', { winner: null });
      room.state = 'waiting';
      return;
    }

    gs.currentIdx = (gs.currentIdx + 1) % room.players.length;
    sendState(room);
  }

  return { init, drop };
})();

// ── TWO TRUTHS & A LIE ────────────────────────────────────────────────────────
const TWOTRUTHSALIE = (() => {
  function init(room) {
    room.gameState = {
      phase:            'submit',
      submissions:      {},   // playerId -> { statements, lieIdx }
      presenterIdx:     0,
      guesses:          {},   // playerId -> guessIdx
      scores:           Object.fromEntries(room.players.map(p => [p.id, 0])),
      statements:       null,
      lieIdx:           null,
      currentPresenter: null,
      hasSubmitted:     new Set(),
    };
    sendState(room);
  }

  function sendState(room) {
    const gs = room.gameState;
    room.players.forEach(p => {
      io.to(p.id).emit('gameState', {
        phase:            gs.phase,
        hasSubmitted:     gs.hasSubmitted.has(p.id),
        players:          room.players,
        currentPresenter: gs.currentPresenter,
        statements:       gs.phase !== 'submit' ? gs.statements : undefined,
        lieIdx:           gs.phase === 'reveal' ? gs.lieIdx : undefined,
        guesses:          gs.phase === 'reveal' ? gs.guesses : undefined,
        myGuess:          gs.guesses[p.id] ?? null,
        scores:           gs.scores,
      });
    });
  }

  function submit(room, playerId, { statements, lieIdx }) {
    const gs = room.gameState;
    if (gs.phase !== 'submit') return;
    gs.submissions[playerId] = { statements, lieIdx };
    gs.hasSubmitted.add(playerId);

    if (gs.hasSubmitted.size === room.players.length) {
      startRound(room);
    } else {
      sendState(room);
    }
  }

  function startRound(room) {
    const gs        = room.gameState;
    const presenter = room.players[gs.presenterIdx];
    const sub       = gs.submissions[presenter.id];
    gs.phase            = 'guess';
    gs.currentPresenter = presenter;
    gs.statements       = sub.statements;
    gs.lieIdx           = sub.lieIdx;
    gs.guesses          = {};
    sendState(room);
  }

  function guess(room, playerId, guessIdx) {
    const gs = room.gameState;
    if (gs.phase !== 'guess') return;
    if (playerId === gs.currentPresenter?.id) return;
    gs.guesses[playerId] = guessIdx;

    const nonPresenters = room.players.filter(p => p.id !== gs.currentPresenter?.id);
    if (Object.keys(gs.guesses).length >= nonPresenters.length) {
      gs.phase = 'reveal';
      // Score
      nonPresenters.forEach(p => {
        if (gs.guesses[p.id] === gs.lieIdx) gs.scores[p.id] = (gs.scores[p.id] || 0) + 1;
      });
      sendState(room);
    } else {
      sendState(room);
    }
  }

  function next(room, playerId) {
    const gs = room.gameState;
    if (playerId !== room.players[0]?.id) return;
    gs.presenterIdx++;
    if (gs.presenterIdx >= room.players.length) {
      const winner = Object.entries(gs.scores).sort((a,b) => b[1]-a[1])[0]?.[0];
      io.to(room.id).emit('gameFinished', { winner, scores: gs.scores });
      room.state = 'waiting';
      return;
    }
    startRound(room);
  }

  return { init, submit, guess, next };
})();

// ── NEVER HAVE I EVER ─────────────────────────────────────────────────────────
const NEVERHAVEIEVER = (() => {
  function init(room) {
    room.gameState = {
      phase:        'submit',
      submissions:  {},
      questions:    [],
      currentQ:     0,
      answers:      {},
      scores:       Object.fromEntries(room.players.map(p => [p.id, 0])),
      hasSubmitted: new Set(),
      myAnswer:     {},
    };
    sendState(room);
  }

  function sendState(room) {
    const gs = room.gameState;
    const q  = gs.questions[gs.currentQ] || null;
    room.players.forEach(p => {
      io.to(p.id).emit('gameState', {
        phase:        gs.phase,
        hasSubmitted: gs.hasSubmitted.has(p.id),
        players:      room.players,
        question:     q,
        currentQ:     gs.currentQ,
        totalQ:       gs.questions.length,
        answers:      gs.phase === 'reveal' ? gs.answers : undefined,
        myAnswer:     gs.answers[p.id] ?? null,
        scores:       gs.scores,
      });
    });
  }

  function submitQuestions(room, playerId, questions) {
    const gs = room.gameState;
    gs.submissions[playerId] = questions;
    gs.hasSubmitted.add(playerId);
    if (gs.hasSubmitted.size === room.players.length) {
      // Flatten all questions
      gs.questions = Object.values(gs.submissions)
        .flat()
        .map((text, i) => ({ id: i, text }))
        .sort(() => Math.random() - 0.5);
      gs.phase = 'play';
      gs.currentQ = 0;
      gs.answers = {};
    }
    sendState(room);
  }

  function answer(room, playerId, haveI) {
    const gs = room.gameState;
    if (gs.phase !== 'play') return;
    gs.answers[playerId] = haveI;

    if (Object.keys(gs.answers).length >= room.players.length) {
      // Score: players who said "I have" get a point
      room.players.forEach(p => {
        if (gs.answers[p.id]) gs.scores[p.id] = (gs.scores[p.id] || 0) + 1;
      });
      gs.phase = 'reveal';
      sendState(room);
    } else {
      sendState(room);
    }
  }

  function next(room, playerId) {
    const gs = room.gameState;
    if (playerId !== room.players[0]?.id) return;
    gs.currentQ++;
    if (gs.currentQ >= gs.questions.length) {
      const winner = Object.entries(gs.scores).sort((a,b) => b[1]-a[1])[0]?.[0];
      io.to(room.id).emit('gameFinished', { winner, scores: gs.scores });
      room.state = 'waiting';
      return;
    }
    gs.phase   = 'play';
    gs.answers = {};
    sendState(room);
  }

  return { init, submitQuestions, answer, next };
})();

// ── WOULD YOU RATHER ──────────────────────────────────────────────────────────
const WOULDYOURATHER = (() => {
  function init(room) {
    room.gameState = {
      phase:        'submit',
      submissions:  {},
      questions:    [],
      currentQ:     0,
      votes:        {},
      scores:       Object.fromEntries(room.players.map(p => [p.id, 0])),
      hasSubmitted: new Set(),
    };
    sendState(room);
  }

  function sendState(room) {
    const gs = room.gameState;
    const q  = gs.questions[gs.currentQ] || null;
    room.players.forEach(p => {
      io.to(p.id).emit('gameState', {
        phase:        gs.phase,
        hasSubmitted: gs.hasSubmitted.has(p.id),
        players:      room.players,
        question:     q,
        currentQ:     gs.currentQ,
        totalQ:       gs.questions.length,
        votes:        gs.phase === 'results' ? gs.votes : undefined,
        myVote:       gs.votes[p.id] ?? null,
        scores:       gs.scores,
      });
    });
  }

  function submitQuestions(room, playerId, questions) {
    const gs = room.gameState;
    gs.submissions[playerId] = questions;
    gs.hasSubmitted.add(playerId);
    if (gs.hasSubmitted.size === room.players.length) {
      gs.questions = Object.values(gs.submissions)
        .flat()
        .sort(() => Math.random() - 0.5);
      gs.phase   = 'vote';
      gs.currentQ = 0;
      gs.votes   = {};
    }
    sendState(room);
  }

  function vote(room, playerId, choice) {
    const gs = room.gameState;
    if (gs.phase !== 'vote') return;
    gs.votes[playerId] = choice;
    if (Object.keys(gs.votes).length >= room.players.length) {
      // Score majority voters
      const vA = Object.values(gs.votes).filter(v => v === 'A').length;
      const vB = Object.values(gs.votes).filter(v => v === 'B').length;
      const majority = vA > vB ? 'A' : vB > vA ? 'B' : null;
      if (majority) {
        room.players.forEach(p => {
          if (gs.votes[p.id] === majority) gs.scores[p.id] = (gs.scores[p.id] || 0) + 1;
        });
      }
      gs.phase = 'results';
      sendState(room);
    } else {
      sendState(room);
    }
  }

  function nextQuestion(room, playerId) {
    const gs = room.gameState;
    if (playerId !== room.players[0]?.id) return;
    gs.currentQ++;
    if (gs.currentQ >= gs.questions.length) {
      const winner = Object.entries(gs.scores).sort((a,b) => b[1]-a[1])[0]?.[0];
      io.to(room.id).emit('gameFinished', { winner, scores: gs.scores });
      room.state = 'waiting';
      return;
    }
    gs.phase = 'vote';
    gs.votes = {};
    sendState(room);
  }

  return { init, submitQuestions, vote, nextQuestion };
})();

// ═══════════════════════════════════════════════════════════════════════════════
//  GAME ROUTER
// ═══════════════════════════════════════════════════════════════════════════════
function startGame(room) {
  room.state = 'playing';
  io.to(room.id).emit('gameStarted', { game: room.game });

  switch (room.game) {
    case 'uno':             UNO.init(room);           break;
    case 'wordle':          WORDLE.init(room);         break;
    case 'connections':     CONNECTIONS.init(room);    break;
    case 'contexto':        CONTEXTO.init(room);       break;
    case 'connect4':        CONNECT4.init(room);       break;
    case 'twoTruths':       TWOTRUTHSALIE.init(room);  break;
    case 'neverHaveIEver':  NEVERHAVEIEVER.init(room); break;
    case 'wouldYouRather':  WOULDYOURATHER.init(room); break;
    default:
      io.to(room.id).emit('systemMessage', `Game "${room.game}" is not implemented yet.`);
  }
}

function handleGameAction(room, playerId, action) {
  switch (room.game) {
    case 'uno':
      if (action.type === 'play') UNO.play(room, playerId, action);
      if (action.type === 'draw') UNO.draw(room, playerId);
      break;

    case 'wordle':
      if (action.type === 'guess') WORDLE.guess(room, playerId, action.word);
      break;

    case 'connections':
      if (action.type === 'guess') CONNECTIONS.guess(room, playerId, action.words);
      break;

    case 'contexto':
      if (action.type === 'guess')  CONTEXTO.guess(room, playerId, action.word);
      if (action.type === 'giveUp') CONTEXTO.giveUp(room, playerId);
      break;

    case 'connect4':
      if (action.type === 'drop') CONNECT4.drop(room, playerId, action.col);
      break;

    case 'twoTruths':
      if (action.type === 'submit') TWOTRUTHSALIE.submit(room, playerId, action);
      if (action.type === 'guess')  TWOTRUTHSALIE.guess(room, playerId, action.guessIdx);
      if (action.type === 'next')   TWOTRUTHSALIE.next(room, playerId);
      break;

    case 'neverHaveIEver':
      if (action.type === 'submitQuestions') NEVERHAVEIEVER.submitQuestions(room, playerId, action.questions);
      if (action.type === 'answer')          NEVERHAVEIEVER.answer(room, playerId, action.haveI);
      if (action.type === 'next')            NEVERHAVEIEVER.next(room, playerId);
      break;

    case 'wouldYouRather':
      if (action.type === 'submitQuestions') WOULDYOURATHER.submitQuestions(room, playerId, action.questions);
      if (action.type === 'vote')            WOULDYOURATHER.vote(room, playerId, action.choice);
      if (action.type === 'nextQuestion')    WOULDYOURATHER.nextQuestion(room, playerId);
      break;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  SOCKET.IO EVENTS
// ═══════════════════════════════════════════════════════════════════════════════
io.on('connection', (socket) => {
  players.set(socket.id, { id: socket.id, name: '', roomId: null });

  // ── Join lobby ──
  socket.on('joinLobby', ({ name }) => {
    const trimmed = (name || '').trim().substring(0, 16);
    if (!trimmed) { socket.emit('loginError', 'Name cannot be empty.'); return; }
    const player  = players.get(socket.id);
    player.name   = trimmed;
    socket.emit('joinedLobby', { id: socket.id, name: trimmed });
  });

  // ── Lobby list ──
  socket.on('getLobbyList', () => {
    const list = [...rooms.values()]
      .filter(r => r.state === 'waiting')
      .map(r => ({
        id:          r.id,
        code:        r.code,
        game:        r.game,
        playerCount: r.players.length,
      }));
    socket.emit('lobbyList', list);
  });

  // ── Create room ──
  socket.on('createRoom', ({ game }) => {
    const player = players.get(socket.id);
    if (!player?.name) { socket.emit('loginError', 'Please log in first.'); return; }
    removePlayerFromRoom(socket.id);
    const room = createRoom(socket.id, game || 'uno');
    room.players.push({ id: socket.id, name: player.name });
    player.roomId = room.id;
    socket.join(room.id);
    socket.emit('roomJoined', {
      roomId:  room.id,
      code:    room.code,
      game:    room.game,
      players: room.players,
      hostId:  room.hostId,
    });
    broadcastLobbyList();
  });

  // ── Join room ──
  socket.on('joinRoom', ({ roomId }) => {
    const player = players.get(socket.id);
    if (!player?.name) { socket.emit('loginError', 'Please log in first.'); return; }
    const room = getRoom(roomId);
    if (!room)                  { socket.emit('roomError', 'Room not found.'); return; }
    if (room.state !== 'waiting') { socket.emit('roomError', 'Game already in progress.'); return; }
    removePlayerFromRoom(socket.id);
    room.players.push({ id: socket.id, name: player.name });
    player.roomId = room.id;
    socket.join(room.id);
    socket.emit('roomJoined', {
      roomId:  room.id,
      code:    room.code,
      game:    room.game,
      players: room.players,
      hostId:  room.hostId,
    });
    io.to(room.id).emit('roomUpdate', { players: room.players, hostId: room.hostId });
    io.to(room.id).emit('systemMessage', `${player.name} joined the room.`);
    broadcastLobbyList();
  });

  // ── Leave room ──
  socket.on('leaveRoom', () => {
    removePlayerFromRoom(socket.id);
    const player = players.get(socket.id);
    if (player) player.roomId = null;
  });

  // ── Start game ──
  socket.on('startGame', () => {
    const player = players.get(socket.id);
    if (!player?.roomId) return;
    const room = getRoom(player.roomId);
    if (!room || room.hostId !== socket.id) return;
    if (room.state !== 'waiting') return;
    startGame(room);
  });

  // ── Game action ──
  socket.on('gameAction', (action) => {
    const player = players.get(socket.id);
    if (!player?.roomId) return;
    const room = getRoom(player.roomId);
    if (!room || room.state !== 'playing') return;
    handleGameAction(room, socket.id, action);
  });

  // ── Chat ──
  socket.on('chatMessage', ({ text }) => {
    const player = players.get(socket.id);
    if (!player?.name || !player.roomId) return;
    const clean = (text || '').trim().substring(0, 200);
    if (!clean) return;
    io.to(player.roomId).emit('chatMessage', { name: player.name, text: clean });
  });

  // ── Disconnect ──
  socket.on('disconnect', () => {
    removePlayerFromRoom(socket.id);
    players.delete(socket.id);
  });
});

// ── Start server ──────────────────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`Goon Room running on port ${PORT}`);
});
