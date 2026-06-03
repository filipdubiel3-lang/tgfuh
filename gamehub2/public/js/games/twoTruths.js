// Two Truths and a Lie client UI
GAME_ENGINES.twoTruths = (() => {
  let myId, state;

  function start(s, playerId) { myId = playerId; render(s); }
  function update(s) { state = s; render(s); }

  function finish(data, lobby) {
    const names = {};
    lobby.players.forEach(p => names[p.id] = p.name);
    const c = document.getElementById('gameContainer');
    c.innerHTML = `<div class="game-over">
      <h2>🤥 GAME OVER</h2>
      <div class="winner-name">🏆 ${names[data.winner]||'?'} wins!</div>
      <div class="final-scores">${Object.entries(data.scores||{}).sort((a,b)=>b[1]-a[1]).map(([id,s])=>`<div class="final-score-row"><span>${names[id]||id}</span><span>${s}pt</span></div>`).join('')}</div>
      <p style="color:var(--muted);font-size:11px">Returning to lobby in 10s...</p>
    </div>`;
  }

  function render(s) {
    state = s;
    const c = document.getElementById('gameContainer');
    let html = `<div class="game-title">🤥 Two Truths & a Lie</div>`;

    if (s.phase === 'submit') {
      if (s.hasSubmitted) {
        html += `<div class="question-card"><p style="color:var(--green)">✓ Submitted!</p><p class="q-author">Waiting for others... (${s.allSubmitted?'All ready!':'Not all submitted'})</p></div>`;
      } else {
        const isMe = s.players[0]?.id === myId;
        html += `<p style="color:var(--muted);font-size:11px;margin-bottom:12px">Write 3 statements about yourself — 2 truths and 1 lie. Mark which is the lie.</p>
          <div class="question-form">`;
        for (let i = 0; i < 3; i++) {
          html += `<div style="display:flex;gap:6px;align-items:center;margin-bottom:6px">
            <input id="stmt${i}" placeholder="Statement ${i+1}..." style="flex:1" />
            <label style="font-size:11px;color:var(--muted);white-space:nowrap;cursor:pointer">
              <input type="radio" name="lieIdx" value="${i}" style="margin-right:4px" />🤥 Lie
            </label>
          </div>`;
        }
        html += `</div><button class="btn-primary mt1" onclick="GAME_ENGINES.twoTruths.submitStmts()">SUBMIT</button>`;
      }
    } else if (s.phase === 'guess') {
      const presenter = s.currentPresenter;
      const isPresenter = presenter?.id === myId;
      html += `<div class="question-card"><div class="q-author">👤 ${App.escHtml(presenter?.name||'?')}'s statements:</div></div>`;
      (s.statements || []).forEach((stmt, i) => {
        if (isPresenter) {
          html += `<div class="truth-stmt">${App.escHtml(stmt)}</div>`;
        } else {
          const myGuess = s.myGuess;
          html += `<div class="truth-stmt ${myGuess===i?'guessed':''}" onclick="GAME_ENGINES.twoTruths.guess(${i})">${App.escHtml(stmt)}</div>`;
        }
      });
      if (isPresenter) {
        html += `<p style="color:var(--muted);font-size:11px;margin-top:8px">Others are guessing which is your lie...</p>`;
      } else if (s.myGuess !== null && s.myGuess !== undefined) {
        html += `<p style="color:var(--muted);font-size:11px;margin-top:8px">Guessed! Waiting for others...</p>`;
      }
    } else if (s.phase === 'reveal') {
      const presenter = s.currentPresenter;
      const lieIdx = s.lieIdx;
      html += `<div class="question-card"><div class="q-author">👤 ${App.escHtml(presenter?.name||'?')}'s statements:</div></div>`;
      (s.statements || []).forEach((stmt, i) => {
        html += `<div class="truth-stmt ${i===lieIdx?'lie':'truth'}">
          ${i===lieIdx?'🤥':'✓'} ${App.escHtml(stmt)}
        </div>`;
      });
      if (s.guesses) {
        html += `<div class="answer-grid">`;
        Object.entries(s.guesses).forEach(([pid, g]) => {
          const pname = s.players.find(p=>p.id===pid)?.name || pid;
          html += `<div class="answer-chip ${g===lieIdx?'have':'not'}">${App.escHtml(pname)}: ${g===lieIdx?'✓ Correct':'✗ Wrong'}</div>`;
        });
        html += `</div>`;
      }
      const isHost = s.players[0]?.id === myId;
      if (isHost) {
        html += `<button class="btn-primary mt1" onclick="GAME_ENGINES.twoTruths.next()">NEXT →</button>`;
      } else {
        html += `<p style="color:var(--muted);font-size:11px;margin-top:8px">Waiting for host...</p>`;
      }
    }

    // Scores
    html += `<div class="score-board" style="margin-top:16px">`;
    s.players.forEach(p => {
      html += `<div class="score-chip"><span class="s-name">${App.escHtml(p.name)}</span> <span class="s-val">${s.scores[p.id]||0}pt</span></div>`;
    });
    html += `</div>`;

    c.innerHTML = html;
  }

  function submitStmts() {
    const statements = [0,1,2].map(i => document.getElementById(`stmt${i}`)?.value.trim() || '');
    if (statements.some(s => !s)) { App.showToast('Fill in all 3 statements'); return; }
    const lieEl = document.querySelector('input[name="lieIdx"]:checked');
    if (!lieEl) { App.showToast('Mark which statement is the lie'); return; }
    App.sendAction({ type: 'submit', statements, lieIdx: parseInt(lieEl.value) });
  }

  function guess(idx) {
    App.sendAction({ type: 'guess', guessIdx: idx });
  }

  function next() {
    App.sendAction({ type: 'next' });
  }

  return { start, update, finish, submitStmts, guess, next };
})();
