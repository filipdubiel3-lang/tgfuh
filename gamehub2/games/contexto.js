// ─── Contexto Server Engine ───────────────────────────────────────────────────
// Each puzzle has a secret word and a ranked list of semantically related words
// Rank 1 = most similar, higher = less similar
const maxPlayers = 4;

const PUZZLES = [
  {
    answer: 'OCEAN',
    // rank -> word mapping (top 300 most contextually similar words)
    ranked: buildRanked(['SEA','WATER','WAVE','BEACH','MARINE','DEEP','COAST','TIDE','SALT','FISH',
      'CORAL','REEF','SHORE','ISLAND','ATLANTIC','PACIFIC','GULF','BAY','RIVER','LAKE',
      'WHALE','SHARK','DOLPHIN','KELP','CURRENT','DEPTH','BLUE','VAST','POLAR','TROPICAL',
      'SWIM','SAIL','SURF','DIVE','BOAT','SHIP','HARBOR','PORT','NAVAL','SUBMARINE',
      'STORM','WIND','HORIZON','FLOOR','TRENCH','BASIN','WARM','COLD','PRESSURE','DARK']),
  },
  {
    answer: 'MUSIC',
    ranked: buildRanked(['SONG','BEAT','RHYTHM','MELODY','BAND','GUITAR','PIANO','DRUM','VOICE','SING',
      'ALBUM','CONCERT','ARTIST','JAZZ','ROCK','POP','CLASSIC','LYRICS','NOTE','CHORD',
      'INSTRUMENT','SYMPHONY','OPERA','DANCE','FESTIVAL','RADIO','STUDIO','RECORD','VINYL','STAGE',
      'BASS','TREBLE','TEMPO','HARMONY','TUNE','ACOUSTIC','ELECTRIC','FOLK','HIP','RAP',
      'PRODUCER','SPEAKER','HEADPHONE','PLAYLIST','STREAM','DOWNLOAD','TRACK','MIX','REMIX','LIVE']),
  },
  {
    answer: 'FOREST',
    ranked: buildRanked(['TREE','WOOD','JUNGLE','LEAF','BRANCH','TRUNK','WILDLIFE','NATURE','PINE','OAK',
      'ANIMAL','BIRD','DEER','BEAR','WOLF','FOX','MUSHROOM','MOSS','FERN','CREEK',
      'TRAIL','HIKE','CAMP','FIRE','CANOPY','SHADE','GREEN','DENSE','ANCIENT','RAIN',
      'TIGER','LION','MONKEY','SNAKE','INSECT','SOIL','ROOT','BARK','SAP','RESIN',
      'NATIONAL','PARK','RANGER','PRESERVE','TIMBER','LOG','LUMBER','CLEARING','MEADOW','RIVER']),
  },
  {
    answer: 'KITCHEN',
    ranked: buildRanked(['COOK','FOOD','STOVE','OVEN','FRIDGE','POT','PAN','KNIFE','PLATE','BOWL',
      'CUP','FORK','SPOON','SINK','COUNTER','CABINET','MICROWAVE','TOASTER','BLENDER','MIXER',
      'RECIPE','MEAL','BAKE','FRY','BOIL','STEAM','CHOP','DICE','STIR','WHISK',
      'BREAD','PASTA','SOUP','SAUCE','SPICE','HERB','SALT','BUTTER','OIL','FLOUR',
      'DISH','CLEAN','WASH','TOWEL','APRON','CHEF','RESTAURANT','DINING','TABLE','EAT']),
  },
  {
    answer: 'SCHOOL',
    ranked: buildRanked(['CLASS','STUDENT','TEACHER','LEARN','STUDY','BOOK','DESK','PENCIL','TEST','GRADE',
      'MATH','SCIENCE','ENGLISH','HISTORY','HOMEWORK','EXAM','LIBRARY','GYM','LUNCH','BELL',
      'PRINCIPAL','BOARD','CHALK','LESSON','LECTURE','UNIVERSITY','COLLEGE','DIPLOMA','DEGREE','CAMPUS',
      'HALLWAY','LOCKER','UNIFORM','RECESS','PLAYGROUND','BUS','BACKPACK','NOTEBOOK','RULER','ERASER',
      'SUBJECT','SEMESTER','YEAR','GRADUATION','AWARD','HONOR','CLUB','SPORT','FRIEND','BULLY']),
  },
  {
    answer: 'SPACE',
    ranked: buildRanked(['STAR','PLANET','MOON','SUN','GALAXY','ORBIT','ROCKET','ASTRONAUT','UNIVERSE','COSMOS',
      'NASA','SHUTTLE','SATELLITE','COMET','ASTEROID','METEOR','BLACK','HOLE','NEBULA','VOID',
      'GRAVITY','WEIGHTLESS','LAUNCH','STATION','MISSION','EXPLORATION','MARS','JUPITER','SATURN','VENUS',
      'TELESCOPE','HUBBLE','DARK','MATTER','ENERGY','LIGHT','YEAR','PARSEC','SOLAR','SYSTEM',
      'ALIEN','LIFE','PROBE','CAPSULE','MODULE','LANDING','APOLLO','EARTH','ATMOSPHERE','VACUUM']),
  },
];

function buildRanked(words) {
  const map = {};
  words.forEach((w, i) => { map[w.toUpperCase()] = i + 1; });
  return map;
}

function randomPuzzle() {
  return PUZZLES[Math.floor(Math.random() * PUZZLES.length)];
}

function getScore(puzzle, word) {
  const rank = puzzle.ranked[word.toUpperCase()];
  return rank || 9999; // unknown word = very far
}

function init(players) {
  const puzzle = randomPuzzle();
  const playerStates = {};
  players.forEach(p => {
    playerStates[p.id] = { guesses: [], solved: false, gaveUp: false };
  });

  return {
    puzzle,
    playerStates,
    players: players.map(p => ({ id: p.id, name: p.name })),
    scores: Object.fromEntries(players.map(p => [p.id, 0])),
    finishedCount: 0,
  };
}

function getState(gs, playerId) {
  const ps = playerId ? gs.playerStates[playerId] : null;
  const progress = {};
  gs.players.forEach(p => {
    const pps = gs.playerStates[p.id];
    progress[p.id] = { count: pps.guesses.length, solved: pps.solved };
  });

  const base = {
    players: gs.players,
    scores: gs.scores,
    progress,
    solved: ps?.solved || false,
    answer: (ps?.solved || ps?.gaveUp) ? gs.puzzle.answer : null,
    guesses: ps ? [...ps.guesses].sort((a, b) => a.score - b.score) : [],
  };

  return base;
}

function action(gs, playerId, act) {
  const ps = gs.playerStates[playerId];
  if (!ps) return { error: 'Not in game' };

  if (act.type === 'giveUp') {
    if (ps.solved || ps.gaveUp) return { error: 'Already finished' };
    ps.gaveUp = true;
    gs.finishedCount++;
    return checkAllDone(gs);
  }

  if (act.type === 'guess') {
    if (ps.solved || ps.gaveUp) return { error: 'Already finished' };
    const word = (act.word || '').toUpperCase().trim();
    if (!word || !/^[A-Z]+$/.test(word)) return { error: 'Invalid word' };
    if (ps.guesses.some(g => g.word === word)) return { error: 'Already guessed' };

    if (word === gs.puzzle.answer.toUpperCase()) {
      ps.guesses.push({ word, score: 0 });
      ps.solved = true;
      gs.finishedCount++;
      // Score: 100 minus number of guesses
      gs.scores[playerId] = Math.max(10, 100 - ps.guesses.length * 5);
      return checkAllDone(gs);
    }

    const score = getScore(gs.puzzle, word);
    ps.guesses.push({ word, score });
    return {};
  }

  return { error: 'Unknown action' };
}

function checkAllDone(gs) {
  if (gs.finishedCount >= gs.players.length) {
    const winner = Object.entries(gs.scores).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
    return { finished: true, winner, scores: gs.scores, answer: gs.puzzle.answer };
  }
  return {};
}

module.exports = { init, getState, action, maxPlayers };
