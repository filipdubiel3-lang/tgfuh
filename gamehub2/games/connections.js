// ─── Connections Server Engine ────────────────────────────────────────────────
const maxPlayers = 4;

// Puzzle bank — each puzzle has 4 groups of 4 words
const PUZZLES = [
  {
    groups: [
      { name: 'Things that are RED', color: 'red',    words: ['APPLE', 'RUBY', 'TOMATO', 'FIRE'] },
      { name: 'Ocean animals',        color: 'blue',   words: ['SHARK', 'WHALE', 'CRAB', 'SQUID'] },
      { name: '___ BALL',             color: 'yellow', words: ['BASKET', 'FOOT', 'TENNIS', 'BASE'] },
      { name: 'Cat breeds',           color: 'purple', words: ['SIAMESE', 'TABBY', 'BENGAL', 'MAINE'] },
    ]
  },
  {
    groups: [
      { name: 'Pizza toppings',       color: 'yellow', words: ['PEPPERONI', 'MUSHROOM', 'OLIVE', 'ANCHOVY'] },
      { name: 'Types of music',       color: 'green',  words: ['JAZZ', 'BLUES', 'PUNK', 'SOUL'] },
      { name: 'Famous Elon ___',      color: 'purple', words: ['MUSK', 'TESLA', 'SPACEX', 'TWITTER'] },
      { name: 'Board games',          color: 'blue',   words: ['CHESS', 'RISK', 'CLUE', 'SORRY'] },
    ]
  },
  {
    groups: [
      { name: 'Things in space',      color: 'blue',   words: ['COMET', 'NEBULA', 'PULSAR', 'QUASAR'] },
      { name: 'Cooking methods',      color: 'yellow', words: ['BRAISE', 'SAUTÉ', 'POACH', 'BROIL'] },
      { name: 'Dog breeds',           color: 'green',  words: ['POODLE', 'BEAGLE', 'BOXER', 'COLLIE'] },
      { name: '___ STONE',            color: 'purple', words: ['LIME', 'SAND', 'COBBLE', 'FLINT'] },
    ]
  },
  {
    groups: [
      { name: 'Shakespeare plays',    color: 'purple', words: ['HAMLET', 'OTHELLO', 'MACBETH', 'TEMPEST'] },
      { name: 'Types of pasta',       color: 'yellow', words: ['PENNE', 'RIGATONI', 'FUSILLI', 'ORZO'] },
      { name: 'Greek letters',        color: 'blue',   words: ['ALPHA', 'DELTA', 'SIGMA', 'OMEGA'] },
      { name: 'James Bond films',     color: 'green',  words: ['GOLDFINGER', 'SKYFALL', 'CASINO', 'SPECTRE'] },
    ]
  },
  {
    groups: [
      { name: 'Superhero powers',     color: 'blue',   words: ['FLIGHT', 'TELEPATHY', 'SPEED', 'INVISIBILITY'] },
      { name: 'Card games',           color: 'green',  words: ['POKER', 'RUMMY', 'SNAP', 'SOLITAIRE'] },
      { name: 'Fonts',                color: 'yellow', words: ['ARIAL', 'COURIER', 'VERDANA', 'IMPACT'] },
      { name: 'Mountain ranges',      color: 'purple', words: ['ALPS', 'ANDES', 'ROCKIES', 'URALS'] },
    ]
  },
];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function init(players) {
  const puzzle = PUZZLES[Math.floor(Math.random() * PUZZLES.length)];
  const allWords = shuffle(puzzle.groups.flatMap(g => g.words));
  const wordToGroup = {};
  puzzle.groups.forEach(g => g.words.forEach(w => { wordToGroup[w] = g; }));

  // Per-player state
  const playerStates = {};
  players.forEach(p => {
    playerStates[p.id] = {
      solved: [],
      mistakes: 0,
      finished: false,
    };
  });

  return {
    puzzle,
    allWords,
    wordToGroup,
    playerStates,
    players: players.map(p => ({ id: p.id, name: p.name })),
    scores: Object.fromEntries(players.map(p => [p.id, 0])),
    finishedCount: 0,
    maxMistakes: 4,
  };
}

function getState(gs, playerId) {
  const ps = playerId ? gs.playerStates[playerId] : null;
  const solvedGroupNames = ps ? ps.solved.map(g => g.name) : [];
  const remainingWords = gs.allWords.filter(w => {
    if (!ps) return true;
    return !ps.solved.some(g => g.words.includes(w));
  });

  const progress = {};
  gs.players.forEach(p => {
    progress[p.id] = {
      solved: gs.playerStates[p.id]?.solved.length || 0,
      mistakes: gs.playerStates[p.id]?.mistakes || 0,
    };
  });

  return {
    words: remainingWords,
    solved: ps?.solved || [],
    mistakes: ps?.mistakes || 0,
    maxMistakes: gs.maxMistakes,
    players: gs.players,
    progress,
    scores: gs.scores,
  };
}

function action(gs, playerId, act) {
  if (act.type !== 'guess') return { error: 'Unknown action' };
  const ps = gs.playerStates[playerId];
  if (!ps) return { error: 'Not in game' };
  if (ps.finished) return { error: 'Already finished' };

  const words = act.words;
  if (!Array.isArray(words) || words.length !== 4) return { error: 'Select exactly 4 words' };

  // Check if all belong to same group
  const groups = words.map(w => gs.wordToGroup[w]?.name).filter(Boolean);
  const allSame = groups.length === 4 && groups.every(g => g === groups[0]);

  if (allSame) {
    const group = gs.wordToGroup[words[0]];
    ps.solved.push(group);
    gs.scores[playerId] += 10;

    if (ps.solved.length === gs.puzzle.groups.length) {
      ps.finished = true;
      gs.finishedCount++;
      gs.scores[playerId] += Math.max(0, (gs.maxMistakes - ps.mistakes)) * 5;
    }
  } else {
    // Check if one away
    ps.mistakes++;
    if (ps.mistakes >= gs.maxMistakes) {
      ps.finished = true;
      gs.finishedCount++;
    }
  }

  if (gs.finishedCount >= gs.players.length) {
    const winner = Object.entries(gs.scores).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
    return { finished: true, winner, scores: gs.scores };
  }

  return {};
}

module.exports = { init, getState, action, maxPlayers };
