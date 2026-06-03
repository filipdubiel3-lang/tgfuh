// Connect 4 client UI
GAME_ENGINES.connect4 = (() => {
  let myId, state;

  function start(s, playerId) { myId = playerId; render(s); }
  function update(s) { state = s; render(s); }

  function finish(data, lobby) {
    const names = {};
    lobby.players.forEach(p => names[p.id] = p.name);
    const c = document.getElementById('gameContainer');
    c.innerHTML = `<div class="game-over">
      <h2>🔴 GAME OVER</h2>
      <div class="winner-name">${data.winner ? '🏆 ' + (names[data.winner]||'?') + ' wins!' : "🤝 It's a draw!"}</div>
      <p style="color:var(--muted);font-size:11px">Returning to lobby in 10s...</p>
    </div>`;
  }

  function render(s) {
    state = s;
    const isMyTurn = s.current === myId;
    const myColor = s.playerColors?.[myId] || 'red';
    const c = document.getElementById('gameContainer');

    let html = `<div class="game-title">🔴 Connect 4</div>`;
    html += `<div class="turn-banner ${isMyTurn ? 'my-turn' : 'wait'}">${isMyTurn ? '⚡ YOUR TURN' : '⏳ Waiting...'}</div>`;

    html += `<div class="c4-legend">`;
    Object.entries(s.playerColors || {}).forEach(([pid, col]) => {
      html += `<span><span class="c4-dot" style="background:${col==='red'?'#c0392b':'#f39c12'}"></span>${col.toUpperCase()}</span>`;
    });
    html += `</div>`;

    // Column drop buttons
    html += `<div class="c4-board" style="margin-top:8px">`;
    for (let col = 0; col < 7; col++) {
      html += `<button class="c4-col-btn" ${isMyTurn ? '' : 'disabled'} onclick="GAME_ENGINES.connect4.drop(${col})">▼</button>`;
    }

    // Board cells
    for (let row = 0; row < 6; row++) {
      for (let col = 0; col < 7; col++) {
        const cell = s.board?.[row]?.[col];
        const color = cell ? (s.playerColors[cell] || '') : '';
        html += `<div class="c4-cell ${color}"></div>`;
      }
    }
    html += `</div>`;

    c.innerHTML = html;
  }

  function drop(col) {
    App.sendAction({ type: 'drop', col });
  }

  return { start, update, finish, drop };
})();
