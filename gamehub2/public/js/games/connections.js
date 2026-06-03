// Connections client UI
GAME_ENGINES.connections = (() => {
  let myId, state, selected = [];

  function start(s, playerId) { myId = playerId; selected = []; render(s); }
  function update(s) { state = s; render(s); }

  function finish(data, lobby) {
    const names = {};
    lobby.players.forEach(p => names[p.id] = p.name);
    const c = document.getElementById('gameContainer');
    c.innerHTML = `<div class="game-over">
      <h2>🔗 GAME OVER</h2>
      <div class="winner-name">🏆 ${names[data.winner]||'?'} wins!</div>
      <div class="final-scores">${Object.entries(data.scores||{}).sort((a,b)=>b[1]-a[1]).map(([id,s])=>`<div class="final-score-row"><span>${names[id]||id}</span><span>${s}pt</span></div>`).join('')}</div>
      <p style="color:var(--muted);font-size:11px">Returning to lobby in 10s...</p>
    </div>`;
  }

  function render(s) {
    state = s;
    const c = document.getElementById('gameContainer');
    let html = `<div class="game-title">🔗 Connections</div>`;
    html += `<p style="color:var(--muted);font-size:11px;margin-bottom:10px">Find 4 groups of 4 words.</p>`;

    // Solved groups
    (s.solved || []).forEach(g => {
      html += `<div class="conn-solved ${g.color}"><strong>${App.escHtml(g.name)}</strong><br><span style="font-size:10px">${g.words.join(', ')}</span></div>`;
    });

    // Word grid
    if (s.words?.length) {
      html += `<div class="conn-grid">`;
      s.words.forEach(word => {
        const isSel = selected.includes(word);
        html += `<div class="conn-word ${isSel?'selected':''}" onclick="GAME_ENGINES.connections.toggle('${word}')">${App.escHtml(word)}</div>`;
      });
      html += `</div>`;

      html += `<div class="conn-actions">`;
      html += `<button class="btn-ghost" onclick="GAME_ENGINES.connections.shuffle()">🔀 Shuffle</button>`;
      html += `<button class="btn-primary" style="width:auto;padding:8px 16px" onclick="GAME_ENGINES.connections.submitGuess()">SUBMIT (${selected.length}/4)</button>`;
      html += `</div>`;
    }

    // Mistakes
    html += `<div class="mistake-dots" style="margin-top:10px"><span style="font-size:11px;color:var(--muted);margin-right:4px">Mistakes:</span>`;
    for (let i = 0; i < (s.maxMistakes||4); i++) {
      html += `<div class="m-dot ${i < (s.mistakes||0) ? 'used' : ''}"></div>`;
    }
    html += `</div>`;

    // Progress
    if (s.players?.length > 1) {
      html += `<div class="progress-row">`;
      s.players.forEach(p => {
        const prog = s.progress?.[p.id] || { solved: 0, mistakes: 0 };
        html += `<span>${App.escHtml(p.name)}: ${prog.solved}/4 ✗${prog.mistakes}</span>`;
      });
      html += `</div>`;
    }

    c.innerHTML = html;
  }

  function toggle(word) {
    const idx = selected.indexOf(word);
    if (idx >= 0) selected.splice(idx, 1);
    else if (selected.length < 4) selected.push(word);
    render(state);
  }

  function submitGuess() {
    if (selected.length !== 4) { App.showToast('Select exactly 4 words'); return; }
    App.sendAction({ type: 'guess', words: [...selected] });
    selected = [];
  }

  function shuffle() {
    if (state?.words) {
      const w = [...state.words];
      for (let i = w.length-1; i > 0; i--) { const j = Math.floor(Math.random()*(i+1)); [w[i],w[j]]=[w[j],w[i]]; }
      state.words = w;
      render(state);
    }
  }

  return { start, update, finish, toggle, submitGuess, shuffle };
})();
