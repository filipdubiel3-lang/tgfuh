// ─── Two Truths & a Lie Server Engine ────────────────────────────────────────
const maxPlayers = 8;

function init(players) {
  return {
    players: players.map(p => ({ id: p.id, name: p.name })),
    phase: 'submit',
    submissions: {},   // playerId -> { statements, lieIdx }
    presenterQueue: players.map(p => p.id),
    currentPresenterIdx: 0,
    guesses: {},       // playerId -> guessIdx (for current round)
    scores: Object.fromEntries(players.map(p => [p.id, 0])),
  };
}

function currentPresenter(gs) {
  return gs.players.find(p => p.id === gs.presenterQueue[gs.currentPresenterIdx]) || null;
}

function getState(gs, playerId) {
  const allSubmitted = gs.players.every(p => gs.submissions[p.id]);
  const hasSubmitted = playerId ? !!gs.submissions[playerId] : false;

  const base = {
    phase: gs.phase,
    players: gs.players,
    scores: gs.scores,
    allSubmitted,
    hasSubmitted,
    currentPresenter: currentPresenter(gs),
  };

  if (gs.phase === 'guess' || gs.phase === 'reveal') {
    const presenter = currentPresenter(gs);
    const sub = presenter ? gs.submissions[presenter.id] : null;
    base.statements = sub?.statements || [];
    base.myGuess = playerId ? (gs.guesses[playerId] ?? null) : null;
    if (gs.phase === 'reveal') {
      base.lieIdx = sub?.lieIdx ?? null;
      base.guesses = gs.guesses;
    }
  }

  return base;
}

function action(gs, playerId, act) {
  // ── Submit statements ──────────────────────────────────────────────────────
  if (act.type === 'submit') {
    if (gs.phase !== 'submit') return { error: 'Not submission phase' };
    if (!Array.isArray(act.statements) || act.statements.length !== 3)
      return { error: 'Need 3 statements' };
    if (act.statements.some(s => !s?.trim())) return { error: 'Fill in all statements' };
    if (![0, 1, 2].includes(act.lieIdx)) return { error: 'Mark which is the lie' };

    gs.submissions[playerId] = {
      statements: act.statements.map(s => s.trim().slice(0, 200)),
      lieIdx: act.lieIdx,
    };

    if (gs.players.every(p => gs.submissions[p.id])) {
      gs.phase = 'guess';
      gs.guesses = {};
    }
    return {};
  }

  // ── Guess ──────────────────────────────────────────────────────────────────
  if (act.type === 'guess') {
    if (gs.phase !== 'guess') return { error: 'Not guessing phase' };
    const presenter = currentPresenter(gs);
    if (playerId === presenter?.id) return { error: 'You are presenting!' };
    if (gs.guesses[playerId] !== undefined) return { error: 'Already guessed' };
    if (![0, 1, 2].includes(act.guessIdx)) return { error: 'Invalid guess' };

    gs.guesses[playerId] = act.guessIdx;

    // Reveal when all non-presenters guessed
    const nonPresenters = gs.players.filter(p => p.id !== presenter?.id);
    if (nonPresenters.every(p => gs.guesses[p.id] !== undefined)) {
      gs.phase = 'reveal';
      const lieIdx = gs.submissions[presenter.id]?.lieIdx;
      // Score: correct guessers +1, presenter +1 per wrong guesser
      nonPresenters.forEach(p => {
        if (gs.guesses[p.id] === lieIdx) gs.scores[p.id]++;
        else gs.scores[presenter.id]++;
      });
    }
    return {};
  }

  // ── Next round (host only) ──────────────────────────────────────────────────
  if (act.type === 'next') {
    if (gs.phase !== 'reveal') return { error: 'Not reveal phase' };
    if (gs.players[0]?.id !== playerId) return { error: 'Only host can advance' };

    gs.currentPresenterIdx++;
    gs.guesses = {};

    if (gs.currentPresenterIdx >= gs.presenterQueue.length) {
      const winner = Object.entries(gs.scores).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
      return { finished: true, winner, scores: gs.scores };
    }
    gs.phase = 'guess';
    return {};
  }

  return { error: 'Unknown action' };
}

module.exports = { init, getState, action, maxPlayers };
