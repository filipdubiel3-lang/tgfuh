// ─── Wordle Server Engine ─────────────────────────────────────────────────────
const maxPlayers = 4;
const MAX_GUESSES = 6;

// 200 common 5-letter words
const WORDS = [
  'about','above','abuse','actor','acute','admit','adopt','adult','after','again',
  'agent','agree','ahead','alarm','album','alert','alike','align','alive','alley',
  'allow','alone','along','alter','angel','anger','angle','angry','anime','ankle',
  'annex','apart','apple','apply','arena','argue','arise','armor','aroma','arose',
  'array','arrow','aside','asset','atlas','attic','audio','audit','avoid','awake',
  'award','awful','basic','basis','beach','beard','beast','began','begin','being',
  'below','bench','bible','birth','black','blade','blame','bland','blast','blaze',
  'bleed','bless','blind','block','blood','bloom','blown','blues','blunt','board',
  'bonus','boost','bound','boxer','brain','brand','brave','bread','break','breed',
  'brick','bride','brief','bring','brisk','broke','brown','brush','buddy','build',
  'built','burst','cabin','cable','candy','carry','catch','cause','cease','chair',
  'chalk','chaos','charm','chase','cheap','check','cheek','chess','chest','child',
  'chill','chunk','civil','claim','class','clean','clear','clerk','click','cliff',
  'climb','cling','clock','clone','close','cloth','cloud','coast','cobra','coded',
  'color','combo','comes','comic','comma','coral','could','count','cover','crack',
  'craft','crane','crash','crazy','cream','creed','crime','crisp','cross','crown',
  'cruel','crush','curve','cycle','daily','dance','dealt','death','debut','delay',
  'dense','depot','depth','derby','devil','digit','dirty','disco','disco','ditch',
  'dodge','doing','doubt','dough','draft','drain','drama','drank','drawn','dream',
];

function randomWord() {
  return WORDS[Math.floor(Math.random() * WORDS.length)].toUpperCase();
}

function init(players) {
  const boards = {};
  const word = randomWord();
  players.forEach(p => {
    boards[p.id] = {
      guesses: [],
      results: [],
      attempts: 0,
      solved: false,
    };
  });

  return {
    word,
    boards,
    players: players.map(p => ({ id: p.id, name: p.name })),
    maxGuesses: MAX_GUESSES,
    finished: false,
    finishedCount: 0,
  };
}

function getState(gs, playerId) {
  const progress = {};
  gs.players.forEach(p => {
    progress[p.id] = {
      attempts: gs.boards[p.id]?.attempts || 0,
      solved: gs.boards[p.id]?.solved || false,
    };
  });

  return {
    board: playerId ? gs.boards[playerId] : null,
    maxGuesses: gs.maxGuesses,
    players: gs.players,
    progress,
    finished: gs.finished,
  };
}

function scoreGuess(guess, word) {
  const result = Array(5).fill('absent');
  const wordArr = word.split('');
  const guessArr = guess.split('');
  const used = Array(5).fill(false);

  // First pass: correct positions
  guessArr.forEach((ch, i) => {
    if (ch === wordArr[i]) { result[i] = 'correct'; used[i] = true; }
  });
  // Second pass: present (wrong position)
  guessArr.forEach((ch, i) => {
    if (result[i] !== 'correct') {
      const wi = wordArr.findIndex((wc, j) => !used[j] && wc === ch);
      if (wi !== -1) { result[i] = 'present'; used[wi] = true; }
    }
  });
  return result;
}

function action(gs, playerId, act) {
  if (act.type !== 'guess') return { error: 'Unknown action' };
  const board = gs.boards[playerId];
  if (!board) return { error: 'Not in game' };
  if (board.solved) return { error: 'Already solved' };
  if (board.attempts >= gs.maxGuesses) return { error: 'No guesses left' };

  const word = (act.word || '').toUpperCase().trim();
  if (word.length !== 5 || !/^[A-Z]+$/.test(word)) return { error: 'Must be a 5-letter word' };

  const result = scoreGuess(word, gs.word);
  board.guesses.push(word);
  board.results.push(result);
  board.attempts++;

  if (word === gs.word) {
    board.solved = true;
    gs.finishedCount++;
  } else if (board.attempts >= gs.maxGuesses) {
    gs.finishedCount++;
  }

  // Game over when all players finished
  if (gs.finishedCount >= gs.players.length) {
    gs.finished = true;
    // Winner = fewest attempts and solved; if tie, first to solve
    let winner = null;
    let bestAttempts = Infinity;
    gs.players.forEach(p => {
      const b = gs.boards[p.id];
      if (b.solved && b.attempts < bestAttempts) {
        bestAttempts = b.attempts;
        winner = p.id;
      }
    });
    const scores = {};
    gs.players.forEach(p => {
      const b = gs.boards[p.id];
      scores[p.id] = b.solved ? Math.max(1, gs.maxGuesses - b.attempts + 1) * 10 : 0;
    });
    return { finished: true, winner, scores, answer: gs.word };
  }

  return {};
}

module.exports = { init, getState, action, maxPlayers };
