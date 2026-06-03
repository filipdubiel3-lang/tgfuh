// Wordle client UI
GAME_ENGINES.wordle = (() => {
  let myId, state, currentGuess = '';

  const ROWS = [
    ['Q','W','E','R','T','Y','U','I','O','P'],
    ['A','S','D','F','G','H','J','K','L'],
    ['ENTER','Z','X','C','V','B','N','M','⌫']
  ];

  function start(s, playerId) {
    myId = playerId;
    currentGuess = '';
    render(s);
    document.addEventListener('keydown', onKey);
  }

  function update(s) {
    state = s;
    render(s);
  }

  function finish(data, lobby) {
    document.removeEventListener('keydown', onKey);
    const names = {};
    lobby.players.forEach(p => names[p.id] = p.name);
    const c = document.getElementById('gameContainer');
    c.innerHTML = `<div class="game-over">
      <h2>🟩 GAME OVER</h2>
      <div class="winner-name">${data.winner ? '🏆 '+names[data.winner]+' wins!' : "No winner"}</div>
      <p style="color:var(--accent3);margin-bottom:12px">The word was: <strong>${data.answer||''}</strong></p>
      <div class="final-scores">${Object.entries(data.scores||{}).sort((a,b)=>b[1]-a[1]).map(([id,s])=>`<div class="final-score-row"><span>${names[id]||id}</span><span>${s}pt</span></div>`).join('')}</div>
      <p style="color:var(--muted);font-size:11px">Returning to lobby in 10s...</p>
    </div>`;
  }

  function render(s) {
    state = s;
    const board = s.board;
    const maxGuesses = s.maxGuesses || 6;
    const c = document.getElementById('gameContainer');

    let html = `<div class="game-title">🟩 Wordle</div>`;

    // Progress
    if (s.players?.length > 1) {
      html += `<div class="progress-row">`;
      s.players.forEach(p => {
        const prog = s.progress?.[p.id] || { attempts: 0, solved: false };
        html += `<span>${App.escHtml(p.name)}: ${prog.solved?'✓':prog.attempts+'/'+(s.maxGuesses||6)}</span>`;
      });
      html += `</div>`;
    }

    if (board?.solved) {
      html += `<div style="color:var(--green);text-align:center;margin-bottom:8px;font-family:var(--display)">✓ SOLVED!</div>`;
    }

    // Grid
    html += `<div class="wordle-grid">`;
    for (let row = 0; row < maxGuesses; row++) {
      html += `<div class="wordle-row">`;
      const guess = board?.guesses?.[row] || '';
      const result = board?.results?.[row] || [];
      for (let col = 0; col < 5; col++) {
        const isCurrentRow = row === (board?.attempts || 0) && !board?.solved;
        const letter = isCurrentRow ? (currentGuess[col] || '') : guess[col] || '';
        const cls = result[col] || '';
        html += `<div class="wordle-cell ${cls}"><span>${letter}</span></div>`;
      }
      html += `</div>`;
    }
    html += `</div>`;

    if (!board?.solved && (board?.attempts||0) < maxGuesses) {
      // Keyboard
      html += `<div class="wordle-keyboard">`;
      ROWS.forEach(row => {
        html += `<div class="wordle-kb-row">`;
        row.forEach(key => {
          const cls = getKeyClass(board, key);
          html += `<button class="wk-btn ${cls}" onclick="GAME_ENGINES.wordle.pressKey('${key}')" style="${key.length>1?'padding:7px 6px;font-size:10px':''}">${key}</button>`;
        });
        html += `</div>`;
      });
      html += `</div>`;
    }

    c.innerHTML = html;
  }

  function getKeyClass(board, key) {
    if (key.length > 1) return '';
    const guesses = board?.guesses || [];
    const results = board?.results || [];
    let best = '';
    guesses.forEach((g, gi) => {
      g.split('').forEach((letter, li) => {
        if (letter === key) {
          const r = results[gi]?.[li];
          if (r === 'correct') best = 'correct';
          else if (r === 'present' && best !== 'correct') best = 'present';
          else if (r === 'absent' && !best) best = 'absent';
        }
      });
    });
    return best;
  }

  function pressKey(key) {
    if (!state?.board) return;
    if (state.board.solved) return;
    if ((state.board.attempts||0) >= (state.maxGuesses||6)) return;

    if (key === '⌫' || key === 'Backspace') {
      currentGuess = currentGuess.slice(0, -1);
    } else if (key === 'ENTER' || key === 'Enter') {
      if (currentGuess.length === 5) {
        App.sendAction({ type: 'guess', word: currentGuess });
        currentGuess = '';
      } else {
        App.showToast('Word must be 5 letters');
      }
    } else if (/^[A-Za-z]$/.test(key) && currentGuess.length < 5) {
      currentGuess += key.toUpperCase();
    }
    render(state);
  }

  function onKey(e) {
    if (e.key === 'Enter') pressKey('Enter');
    else if (e.key === 'Backspace') pressKey('Backspace');
    else if (/^[a-zA-Z]$/.test(e.key)) pressKey(e.key);
  }

  return { start, update, finish, pressKey };
})();
