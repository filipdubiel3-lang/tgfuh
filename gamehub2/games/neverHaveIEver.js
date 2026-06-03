// ─── Never Have I Ever Server Engine ─────────────────────────────────────────
const maxPlayers = 8;

function init(players) {
  return {
    players: players.map(p => ({ id: p.id, name: p.name })),
    phase: 'submit',
    submittedQuestions: {},  // playerId -> string[]
    allQuestions: [],        // { text, author }
    currentQ: 0,
    answers: {},             // playerId -> bool
    scores: Object.fromEntries(players.map(p => [p.id, 0])),
    totalQ: 0,
  };
}

function getState(gs, playerId) {
  const allSubmitted = gs.players.every(p => gs.submittedQuestions[p.id]);
  const hasSubmitted  = playerId ? !!gs.submittedQuestions[playerId] : false;

  const base = {
    phase: gs.phase,
    players: gs.players,
    scores: gs.scores,
    allSubmitted,
    hasSubmitted,
    currentQ: gs.currentQ,
    totalQ: gs.totalQ,
  };

  if (gs.phase === 'play' || gs.phase === 'reveal') {
    base.question = gs.allQuestions[gs.currentQ] || null;
    base.myAnswer  = playerId ? (gs.answers[playerId] ?? null) : null;
    if (gs.phase === 'reveal') base.answers = gs.answers;
  }

  return base;
}

function action(gs, playerId, act) {
  // ── Submit questions ───────────────────────────────────────────────────────
  if (act.type === 'submitQuestions') {
    if (gs.phase !== 'submit') return { error: 'Not submission phase' };
    if (!Array.isArray(act.questions) || act.questions.length !== 4)
      return { error: 'Need 4 questions' };
    if (act.questions.some(q => !q?.trim()))
      return { error: 'Fill in all statements' };

    gs.submittedQuestions[playerId] = act.questions.map(q => q.trim().slice(0, 200));

    if (gs.players.every(p => gs.submittedQuestions[p.id])) {
      // Build flat list with author tags
      gs.allQuestions = [];
      gs.players.forEach(p => {
        gs.submittedQuestions[p.id].forEach(text => {
          gs.allQuestions.push({ text, author: p.id });
        });
      });
      // Shuffle
      for (let i = gs.allQuestions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [gs.allQuestions[i], gs.allQuestions[j]] = [gs.allQuestions[j], gs.allQuestions[i]];
      }
      gs.totalQ = gs.allQuestions.length;
      gs.phase = 'play';
      gs.answers = {};
    }
    return {};
  }

  // ── Answer ────────────────────────────────────────────────────────────────
  if (act.type === 'answer') {
    if (gs.phase !== 'play') return { error: 'Not play phase' };
    if (gs.answers[playerId] !== undefined) return { error: 'Already answered' };
    gs.answers[playerId] = !!act.haveI;

    // Reveal when all answered
    if (gs.players.every(p => gs.answers[p.id] !== undefined)) {
      gs.phase = 'reveal';
      // Score: players who HAVE get a point (they lived!)
      gs.players.forEach(p => {
        if (gs.answers[p.id]) gs.scores[p.id]++;
      });
    }
    return {};
  }

  // ── Next (host only) ───────────────────────────────────────────────────────
  if (act.type === 'next') {
    if (gs.phase !== 'reveal') return { error: 'Not reveal phase' };
    if (gs.players[0]?.id !== playerId) return { error: 'Only host can advance' };

    gs.currentQ++;
    gs.answers = {};

    if (gs.currentQ >= gs.totalQ) {
      const winner = Object.entries(gs.scores).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
      return { finished: true, winner, scores: gs.scores };
    }
    gs.phase = 'play';
    return {};
  }

  return { error: 'Unknown action' };
}

module.exports = { init, getState, action, maxPlayers };
