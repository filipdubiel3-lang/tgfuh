// ─── Would You Rather Server Engine ──────────────────────────────────────────
const maxPlayers = 8;

function init(players) {
  return {
    players: players.map(p => ({ id: p.id, name: p.name })),
    phase: 'submit',
    submittedQuestions: {}, // playerId -> [{ optionA, optionB }]
    allQuestions: [],       // shuffled flat list
    currentQ: 0,
    votes: {},              // playerId -> 'A' or 'B'
    scores: Object.fromEntries(players.map(p => [p.id, 0])),
    totalQ: 0,
  };
}

function getState(gs, playerId) {
  const allSubmitted = gs.players.every(p => gs.submittedQuestions[p.id]);
  const hasSubmitted = playerId ? !!gs.submittedQuestions[playerId] : false;

  const base = {
    phase: gs.phase,
    players: gs.players,
    scores: gs.scores,
    currentQ: gs.currentQ,
    totalQ: gs.totalQ,
    allSubmitted,
    hasSubmitted,
  };

  if (gs.phase === 'vote' || gs.phase === 'results') {
    base.question = gs.allQuestions[gs.currentQ] || null;
    base.myVote = playerId ? (gs.votes[playerId] || null) : null;
    if (gs.phase === 'results') base.votes = gs.votes;
  }

  return base;
}

function action(gs, playerId, act) {
  // ── Submit questions ───────────────────────────────────────────────────────
  if (act.type === 'submitQuestions') {
    if (gs.phase !== 'submit') return { error: 'Not submission phase' };
    const qs = act.questions;
    if (!Array.isArray(qs) || qs.length !== 4) return { error: 'Need 4 questions' };
    if (qs.some(q => !q.optionA?.trim() || !q.optionB?.trim())) return { error: 'Fill in all options' };
    gs.submittedQuestions[playerId] = qs.map(q => ({
      optionA: q.optionA.trim().slice(0, 120),
      optionB: q.optionB.trim().slice(0, 120),
      submittedBy: playerId,
    }));

    // Start voting once all submitted
    if (gs.players.every(p => gs.submittedQuestions[p.id])) {
      gs.allQuestions = [];
      gs.players.forEach(p => gs.allQuestions.push(...gs.submittedQuestions[p.id]));
      // Shuffle
      for (let i = gs.allQuestions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [gs.allQuestions[i], gs.allQuestions[j]] = [gs.allQuestions[j], gs.allQuestions[i]];
      }
      gs.totalQ = gs.allQuestions.length;
      gs.phase = 'vote';
      gs.votes = {};
    }
    return {};
  }

  // ── Vote ──────────────────────────────────────────────────────────────────
  if (act.type === 'vote') {
    if (gs.phase !== 'vote') return { error: 'Not voting phase' };
    if (!['A', 'B'].includes(act.choice)) return { error: 'Invalid choice' };
    gs.votes[playerId] = act.choice;

    // Move to results when all voted
    if (gs.players.every(p => gs.votes[p.id])) {
      gs.phase = 'results';
      // Score: majority gets a point; submitter gets a point if it's their question
      const q = gs.allQuestions[gs.currentQ];
      const vA = Object.values(gs.votes).filter(v => v === 'A').length;
      const vB = Object.values(gs.votes).filter(v => v === 'B').length;
      const majority = vA > vB ? 'A' : vB > vA ? 'B' : null;
      gs.players.forEach(p => {
        if (majority && gs.votes[p.id] === majority) gs.scores[p.id]++;
        if (q.submittedBy && q.submittedBy !== p.id) {
          // submitter gets +1 per vote on their question
        }
      });
    }
    return {};
  }

  // ── Next question (host only) ──────────────────────────────────────────────
  if (act.type === 'nextQuestion') {
    if (gs.phase !== 'results') return { error: 'Not results phase' };
    if (gs.players[0]?.id !== playerId) return { error: 'Only host can advance' };

    gs.currentQ++;
    gs.votes = {};

    if (gs.currentQ >= gs.totalQ) {
      // Game over
      const winner = Object.entries(gs.scores).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
      return { finished: true, winner, scores: gs.scores };
    }
    gs.phase = 'vote';
    return {};
  }

  return { error: 'Unknown action' };
}

module.exports = { init, getState, action, maxPlayers };
