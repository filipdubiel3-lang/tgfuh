// UNO client UI
GAME_ENGINES.uno = (() => {
  let myId, state;
  let selectedCard = null;
  let chosenColor = null;

  const COLOR_EMOJI = { red: '🔴', blue: '🔵', green: '🟢', yellow: '🟡' };

  function start(s, playerId) {
    myId = playerId;
    render(s);
  }

  function update(s) {
    state = s;
    render(s);
  }

  function finish(data, lobby) {
    const names = {};
    lobby.players.forEach(p => names[p.id] = p.name);
    const c = document.getElementById('gameContainer');
    c.innerHTML = `
      <div class="game-over">
        <h2>🃏 GAME OVER</h2>
        <div class="winner-name">🏆 ${names[data.winner] || 'Unknown'} wins!</div>
        <p style="color:var(--muted);font-size:11px">Returning to lobby in 10s...</p>
      </div>`;
  }

  function render(s) {
    state = s;
    const isMyTurn = s.currentPlayer === myId;
    const top = s.top;
    const needColor = (top.value === 'wild' || top.value === 'wild4') && s.phase !== 'chooseColor';

    const c = document.getElementById('gameContainer');

    let html = `<div class="game-title">🃏 UNO</div>`;

    html += `<div class="turn-banner ${isMyTurn ? 'my-turn' : 'wait'}">${isMyTurn ? '⚡ YOUR TURN' : '⏳ Waiting...'}</div>`;

    // Hand counts
    html += `<div class="hand-counts">`;
    Object.entries(s.handCounts).forEach(([id, cnt]) => {
      html += `<div class="hand-count-chip">${cnt} card${cnt !== 1 ? 's' : ''}</div>`;
    });
    html += `</div>`;

    // Active color
    html += `<div style="text-align:center;margin-bottom:8px;font-size:12px;color:var(--muted)">Active color: ${COLOR_EMOJI[s.activeColor] || ''} <strong style="color:var(--text)">${s.activeColor?.toUpperCase()}</strong></div>`;

    // Discard + deck
    html += `<div class="uno-discard">`;
    if (isMyTurn) {
      html += `<button class="uno-deck-btn" onclick="GAME_ENGINES.uno.draw()">🂠<div style="font-size:10px;margin-top:2px">DRAW</div></button>`;
    } else {
      html += `<div class="uno-deck-btn">🂠</div>`;
    }
    html += `<div class="uno-card ${top.color}">${cardLabel(top)}</div>`;
    html += `</div>`;

    // Color picker (if wild played)
    if (isMyTurn && selectedCard !== null && isWild(s.hand[selectedCard])) {
      html += `<div style="text-align:center;font-size:11px;color:var(--muted);margin-bottom:6px">Choose a color:</div>`;
      html += `<div class="color-picker">`;
      ['red', 'blue', 'green', 'yellow'].forEach(col => {
        html += `<div class="color-btn ${col} ${chosenColor === col ? 'sel' : ''}" onclick="GAME_ENGINES.uno.pickColor('${col}')"></div>`;
      });
      html += `</div>`;
      html += `<div style="text-align:center;margin-top:8px">`;
      html += `<button class="btn-primary" style="width:auto;padding:8px 20px;" onclick="GAME_ENGINES.uno.playSelected()">PLAY CARD</button>`;
      html += `</div>`;
    }

    // My hand
    html += `<div class="uno-hand">`;
    (s.hand || []).forEach((card, i) => {
      const disabled = !isMyTurn;
      const sel = selectedCard === i;
      html += `<div class="uno-card ${card.color} ${disabled ? 'disabled' : ''} ${sel ? 'selected' : ''}" onclick="${!disabled ? `GAME_ENGINES.uno.selectCard(${i})` : ''}">${cardLabel(card)}</div>`;
    });
    html += `</div>`;

    // If non-wild card selected and it's my turn, show play button
    if (isMyTurn && selectedCard !== null && !isWild(s.hand[selectedCard])) {
      html += `<div style="text-align:center;margin-top:10px">`;
      html += `<button class="btn-primary" style="width:auto;padding:8px 20px;" onclick="GAME_ENGINES.uno.playSelected()">PLAY CARD</button>`;
      html += `</div>`;
    }

    c.innerHTML = html;
  }

  function selectCard(i) {
    if (selectedCard === i) { selectedCard = null; chosenColor = null; }
    else { selectedCard = i; chosenColor = null; }
    render(state);
  }

  function pickColor(col) {
    chosenColor = col;
    render(state);
  }

  function playSelected() {
    if (selectedCard === null) return;
    const card = state.hand[selectedCard];
    if (!card) return;
    if (isWild(card) && !chosenColor) { App.showToast('Pick a color first'); return; }
    App.sendAction({ type: 'play', cardIdx: selectedCard, chosenColor });
    selectedCard = null;
    chosenColor = null;
  }

  function draw() {
    App.sendAction({ type: 'draw' });
  }

  function cardLabel(card) {
    const icons = { skip: '⊘', reverse: '↺', draw2: '+2', wild: '🌈', wild4: '+4' };
    return icons[card.value] || card.value;
  }

  function isWild(card) {
    return card && (card.value === 'wild' || card.value === 'wild4');
  }

  return { start, update, finish, selectCard, pickColor, playSelected, draw };
})();
