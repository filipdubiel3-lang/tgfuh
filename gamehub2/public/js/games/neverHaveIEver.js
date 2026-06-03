// Never Have I Ever client UI
GAME_ENGINES.neverHaveIEver = (() => {
  let myId, state;

  function start(s, playerId) { myId = playerId; render(s); }
  function update(s) { state = s; render(s); }

  function finish(data, lobby) {
    const names = {};
    lobby.players.forEach(p => names[p.id] = p.name);
    const c = document.getElementById('gameContainer');
    c.innerHTML = `<div class="game-over">
      <h2>✋ GAME OVER</h2>
      <div class="winner-name">🏆 ${names[data.winner]||'?'} wins!</div>
      <div class="final-scores">${Object.entries(data.scores||{}).sort((a,b)=>b[1]-a[1]).map(([id,s])=>`<div class="final-score-row"><span>${names[id]||id}</span><span>${s}pt</span></div>`).join('')}</div>
      <p style="color:var(--muted);font-size:11px">Returning to lobby in 10s...</p>
    </div>`;
  }

  function render(s) {
    state = s;
    const c = document.getElementById('gameContainer');
    let html = `<div class="game-title">✋ Never Have I Ever</div>`;

    if (s.phase === 'submit') {
      if (s.hasSubmitted) {
        html += `<div class="question-card"><p style="color:var(--green)">✓ Questions submitted!</p><p class="q-author">${s.allSubmitted?'All ready!':'Waiting for others...'}</p></div>`;
      } else {
        html += `<p style="color:var(--muted);font-size:11px;margin-bottom:12px">Submit 4 "Never have I ever..." statements. Be creative!</p>`;
        for (let i = 0; i < 4; i++) {
          html += `<div style="margin-bottom:6px;display:flex;gap:6px;align-items:center">
            <span style="color:var(--muted);font-size:11px">${i+1}.</span>
            <input id="nhie${i}" placeholder="Never have I ever..." style="flex:1" />
          </div>`;
        }
        html += `<button class="btn-primary mt1" onclick="GAME_ENGINES.neverHaveIEver.submitQs()">SUBMIT</button>`;
      }
    } else if (s.phase === 'play') {
      const q = s.question;
      html += `<div style="color:var(--muted);font-size:11px;text-align:center;margin-bottom:8px">Question ${s.currentQ+1} of ${s.totalQ}</div>`;
      html += `<div class="question-card">
        <div class="q-author">by ${App.escHtml(getPlayerName(s, q?.author))}</div>
        <div class="q-text">✋ Never have I ever... ${App.escHtml(q?.text||'')}</div>
      </div>`;
      if (s.myAnswer !== undefined && s.myAnswer !== null) {
        html += `<p style="color:var(--muted);font-size:11px;text-align:center">Answered! Waiting for others...</p>`;
      } else {
        html += `<div class="vote-options">
          <button class="vote-btn" onclick="GAME_ENGINES.neverHaveIEver.answer(true)">🙋 I HAVE</button>
          <button class="vote-btn" onclick="GAME_ENGINES.neverHaveIEver.answer(false)">🙅 I HAVEN'T</button>
        </div>`;
      }
    } else if (s.phase === 'reveal') {
      const q = s.question;
      html += `<div class="question-card">
        <div class="q-text">✋ Never have I ever... ${App.escHtml(q?.text||'')}</div>
      </div>`;
      if (s.answers) {
        html += `<div class="answer-grid">`;
        Object.entries(s.answers).forEach(([pid, val]) => {
          const pname = getPlayerName(s, pid);
          html += `<div class="answer-chip ${val?'have':'not'}">${App.escHtml(pname)}: ${val?'I HAVE':'I HAVEN\'T'}</div>`;
        });
        html += `</div>`;
      }
      const isHost = s.players[0]?.id === myId;
      if (isHost) {
        html += `<button class="btn-primary mt1" onclick="GAME_ENGINES.neverHaveIEver.next()">NEXT →</button>`;
      } else {
        html += `<p style="color:var(--muted);font-size:11px;margin-top:8px">Waiting for host...</p>`;
      }
    }

    html += `<div class="score-board" style="margin-top:16px">`;
    s.players.forEach(p => {
      html += `<div class="score-chip"><span class="s-name">${App.escHtml(p.name)}</span> <span class="s-val">${s.scores[p.id]||0}pt</span></div>`;
    });
    html += `</div>`;

    c.innerHTML = html;
  }

  function getPlayerName(s, id) {
    return s.players.find(p => p.id === id)?.name || id;
  }

  function submitQs() {
    const qs = [0,1,2,3].map(i => document.getElementById(`nhie${i}`)?.value.trim() || '');
    if (qs.some(q => !q)) { App.showToast('Fill in all 4 statements'); return; }
    App.sendAction({ type: 'submitQuestions', questions: qs });
  }

  function answer(haveI) {
    App.sendAction({ type: 'answer', haveI });
  }

  function next() {
    App.sendAction({ type: 'next' });
  }

  return { start, update, finish, submitQs, answer, next };
})();
