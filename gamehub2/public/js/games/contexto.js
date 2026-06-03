// Contexto client UI
GAME_ENGINES.contexto = (() => {
  let myId, state;

  function start(s, playerId) { myId = playerId; render(s); }
  function update(s) { state = s; render(s); }

  function finish(data, lobby) {
    const names = {};
    lobby.players.forEach(p => names[p.id] = p.name);
    const c = document.getElementById('gameContainer');
    c.innerHTML = `<div class="game-over">
      <h2>🧠 GAME OVER</h2>
      ${data.winner ? `<div class="winner-name">🏆 ${names[data.winner]||'?'} wins!</div>` : '<div class="winner-name">Game ended!</div>'}
      ${data.answer ? `<p style="color:var(--accent3);margin-bottom:12px">The word was: <strong>${data.answer}</strong></p>` : ''}
      <div class="final-scores">${Object.entries(data.scores||{}).sort((a,b)=>b[1]-a[1]).map(([id,s])=>`<div class="final-score-row"><span>${names[id]||id}</span><span>${s}pt</span></div>`).join('')}</div>
      <p style="color:var(--muted);font-size:11px">Returning to lobby in 10s...</p>
    </div>`;
  }

  function render(s) {
    state = s;
    const c = document.getElementById('gameContainer');
    let html = `<div class="game-title">🧠 Contexto</div>`;
    html += `<p style="color:var(--muted);font-size:11px;margin-bottom:10px">Guess the secret word. Words are ranked by how close they are in meaning.</p>`;

    if (s.solved) {
      html += `<div style="color:var(--green);text-align:center;font-family:var(--display);margin-bottom:8px">✓ SOLVED in ${s.guesses?.length} guess${s.guesses?.length!==1?'es':''}!</div>`;
    } else if (s.answer) {
      html += `<div style="color:var(--accent2);text-align:center;font-family:var(--display);margin-bottom:8px">The word was: <strong>${s.answer}</strong></div>`;
    } else {
      html += `<div class="ctx-input-row">
        <input id="ctxInput" placeholder="Type a word..." maxlength="30" onkeydown="if(event.key==='Enter')GAME_ENGINES.contexto.submitGuess()" />
        <button class="btn-primary" style="width:auto;padding:8px 16px" onclick="GAME_ENGINES.contexto.submitGuess()">GUESS</button>
      </div>`;
      html += `<button class="btn-ghost" style="font-size:10px;padding:4px 10px;margin-bottom:10px" onclick="GAME_ENGINES.contexto.giveUp()">Give Up</button>`;
    }

    // Guesses ranked list
    if (s.guesses?.length) {
      html += `<div class="ctx-guesses">`;
      s.guesses.forEach(g => {
        const cls = g.score <= 20 ? 'hot' : g.score <= 60 ? 'warm' : g.score <= 150 ? 'cool' : 'cold';
        const emoji = g.score <= 20 ? '🔥' : g.score <= 60 ? '☀️' : g.score <= 150 ? '❄️' : '🧊';
        html += `<div class="ctx-guess">
          <span style="font-family:var(--display);font-size:12px">${App.escHtml(g.word)}</span>
          <span class="ctx-rank ${cls}">${emoji} #${g.score}</span>
        </div>`;
      });
      html += `</div>`;
    }

    // Progress
    if (s.players?.length > 1) {
      html += `<div class="progress-row" style="margin-top:10px">`;
      s.players.forEach(p => {
        const prog = s.progress?.[p.id] || { count: 0, solved: false };
        html += `<span>${App.escHtml(p.name)}: ${prog.solved?'✓':prog.count+' guesses'}</span>`;
      });
      html += `</div>`;
    }

    c.innerHTML = html;
    if (!s.solved && !s.answer) {
      setTimeout(() => document.getElementById('ctxInput')?.focus(), 0);
    }
  }

  function submitGuess() {
    const inp = document.getElementById('ctxInput');
    const word = inp?.value.trim();
    if (!word) return;
    App.sendAction({ type: 'guess', word });
    if (inp) inp.value = '';
  }

  function giveUp() {
    App.sendAction({ type: 'giveUp' });
  }

  return { start, update, finish, submitGuess, giveUp };
})();
