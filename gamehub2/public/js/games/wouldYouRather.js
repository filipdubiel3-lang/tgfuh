// Would You Rather client UI
GAME_ENGINES.wouldYouRather = (() => {
  let myId, state, lobby;

  function start(s, playerId) { myId = playerId; render(s); }
  function update(s) { state = s; render(s); }

  function finish(data, lob) {
    lobby = lob;
    const names = {};
    lob.players.forEach(p => names[p.id] = p.name);
    const c = document.getElementById('gameContainer');
    c.innerHTML = buildFinish(data, names);
  }

  function render(s) {
    state = s;
    const c = document.getElementById('gameContainer');

    if (s.phase === 'submit') {
      c.innerHTML = buildSubmit(s);
    } else if (s.phase === 'vote') {
      c.innerHTML = buildVote(s);
    } else if (s.phase === 'results') {
      c.innerHTML = buildResults(s);
    } else if (s.phase === 'done') {
      // handled by gameFinished
    }
  }

  function buildSubmit(s) {
    if (s.hasSubmitted) {
      return `<div class="game-title">🤔 Would You Rather</div>
        <div class="question-card"><p style="color:var(--green)">✓ Questions submitted!</p><p class="q-author">Waiting for others... (${s.allSubmitted ? 'All ready!' : 'Not all submitted'})</p></div>`;
    }
    let html = `<div class="game-title">🤔 Would You Rather</div>
      <p style="color:var(--muted);font-size:11px;margin-bottom:12px">Submit 4 "Would you rather..." questions. Make them interesting!</p>
      <div class="question-form" id="wyrForm">`;
    for (let i = 0; i < 4; i++) {
      html += `<div style="background:var(--bg3);border:1px solid var(--border);border-radius:6px;padding:10px;margin-bottom:8px">
        <div style="font-size:10px;color:var(--muted);margin-bottom:6px">Question ${i+1}</div>
        <div class="q-row"><span class="q-label">A:</span><input id="wyrA${i}" placeholder="Option A..." /></div>
        <div class="q-row" style="margin-top:4px"><span class="q-label">B:</span><input id="wyrB${i}" placeholder="Option B..." /></div>
      </div>`;
    }
    html += `</div><button class="btn-primary mt1" onclick="GAME_ENGINES.wouldYouRather.submitQs()">SUBMIT QUESTIONS</button>`;
    return html;
  }

  function buildVote(s) {
    const q = s.question;
    if (!q) return '<div class="game-title">🤔 Would You Rather</div><p>Loading...</p>';
    const myVote = s.myVote;
    let html = `<div class="game-title">🤔 Would You Rather</div>`;
    html += `<div style="color:var(--muted);font-size:11px;text-align:center;margin-bottom:8px">Question ${s.currentQ + 1} of ${s.totalQ}</div>`;
    html += `<div class="question-card"><div class="q-text">Would you rather...</div></div>`;
    html += `<div class="vote-options">
      <button class="vote-btn ${myVote === 'A' ? 'voted-A' : ''}" onclick="GAME_ENGINES.wouldYouRather.vote('A')"><strong>A:</strong> ${App.escHtml(q.optionA)}</button>
      <button class="vote-btn ${myVote === 'B' ? 'voted-B' : ''}" onclick="GAME_ENGINES.wouldYouRather.vote('B')"><strong>B:</strong> ${App.escHtml(q.optionB)}</button>
    </div>`;
    if (myVote) html += `<p style="color:var(--muted);font-size:11px;margin-top:8px;text-align:center">Voted! Waiting for others...</p>`;
    return html;
  }

  function buildResults(s) {
    const q = s.question;
    const votes = s.votes || {};
    const vA = Object.values(votes).filter(v => v === 'A').length;
    const vB = Object.values(votes).filter(v => v === 'B').length;
    const total = vA + vB || 1;
    const pA = Math.round(vA / total * 100);
    const pB = 100 - pA;

    let html = `<div class="game-title">🤔 Would You Rather</div>`;
    html += `<div class="question-card">
      <div class="q-text">Would you rather...</div>
    </div>`;
    html += `<div class="vote-options">
      <div class="vote-btn voted-A"><strong>A:</strong> ${App.escHtml(q.optionA)}<br><div class="vote-bar"><div class="vote-bar-fill A" style="width:${pA}%"></div></div><span style="font-size:10px">${vA} vote${vA!==1?'s':''} (${pA}%)</span></div>
      <div class="vote-btn voted-B"><strong>B:</strong> ${App.escHtml(q.optionB)}<br><div class="vote-bar"><div class="vote-bar-fill B" style="width:${pB}%"></div></div><span style="font-size:10px">${vB} vote${vB!==1?'s':''} (${pB}%)</span></div>
    </div>`;

    // Host advances
    const isHost = state.players[0]?.id === myId;
    if (isHost) {
      html += `<button class="btn-primary mt1" onclick="GAME_ENGINES.wouldYouRather.next()">NEXT QUESTION →</button>`;
    } else {
      html += `<p style="color:var(--muted);font-size:11px;margin-top:10px;text-align:center">Waiting for host to advance...</p>`;
    }
    return html;
  }

  function buildFinish(data, names) {
    return `<div class="game-over">
      <h2>🤔 GAME OVER</h2>
      <div class="winner-name">🏆 ${names[data.winner] || 'Unknown'} wins!</div>
      <div class="final-scores">${Object.entries(data.scores || {}).sort((a,b)=>b[1]-a[1]).map(([id,s])=>`<div class="final-score-row"><span>${names[id]||id}</span><span>${s}pt</span></div>`).join('')}</div>
      <p style="color:var(--muted);font-size:11px">Returning to lobby in 10s...</p>
    </div>`;
  }

  function submitQs() {
    const qs = [];
    for (let i = 0; i < 4; i++) {
      const a = document.getElementById(`wyrA${i}`)?.value.trim();
      const b = document.getElementById(`wyrB${i}`)?.value.trim();
      if (!a || !b) { App.showToast(`Fill in all options for question ${i+1}`); return; }
      qs.push({ optionA: a, optionB: b });
    }
    App.sendAction({ type: 'submitQuestions', questions: qs });
  }

  function vote(choice) {
    App.sendAction({ type: 'vote', choice });
  }

  function next() {
    App.sendAction({ type: 'nextQuestion' });
  }

  return { start, update, finish, submitQs, vote, next };
})();
