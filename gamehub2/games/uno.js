// ─── UNO Server Engine ────────────────────────────────────────────────────────
const maxPlayers = 6;

const COLORS  = ['red','blue','green','yellow'];
const VALUES  = ['0','1','2','3','4','5','6','7','8','9','skip','reverse','draw2'];
const WILDS   = ['wild','wild4'];

function buildDeck() {
  const deck = [];
  COLORS.forEach(c => {
    VALUES.forEach(v => {
      deck.push({ color: c, value: v });
      if (v !== '0') deck.push({ color: c, value: v }); // doubles except 0
    });
  });
  WILDS.forEach(v => {
    for (let i = 0; i < 4; i++) deck.push({ color: 'wild', value: v });
  });
  return shuffle(deck);
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function init(players) {
  const deck = buildDeck();
  const hands = {};
  players.forEach(p => { hands[p.id] = deck.splice(0, 7); });

  // Find a non-wild starting card
  let topIdx = deck.findIndex(c => c.color !== 'wild');
  const top = deck.splice(topIdx, 1)[0];

  return {
    deck,
    discard: [top],
    hands,
    playerOrder: players.map(p => p.id),
    currentIdx: 0,
    direction: 1,
    activeColor: top.color,
    phase: 'play',
    drawStack: 0, // for chained draw2/wild4
  };
}

function getState(gs, playerId) {
  const top = gs.discard[gs.discard.length - 1];
  const handCounts = {};
  Object.entries(gs.hands).forEach(([id, h]) => { handCounts[id] = h.length; });

  return {
    top,
    activeColor: gs.activeColor,
    currentPlayer: gs.playerOrder[gs.currentIdx],
    hand: playerId ? (gs.hands[playerId] || []) : [],
    handCounts,
    phase: gs.phase,
    direction: gs.direction,
  };
}

function canPlay(card, top, activeColor) {
  if (card.value === 'wild' || card.value === 'wild4') return true;
  return card.color === activeColor || card.value === top.value;
}

function action(gs, playerId, act) {
  const currentPlayer = gs.playerOrder[gs.currentIdx];
  if (playerId !== currentPlayer) return { error: 'Not your turn' };

  const top = gs.discard[gs.discard.length - 1];

  // ── DRAW ──────────────────────────────────────────────────────────────────
  if (act.type === 'draw') {
    const drawCount = gs.drawStack > 0 ? gs.drawStack : 1;
    gs.drawStack = 0;
    for (let i = 0; i < drawCount; i++) {
      if (gs.deck.length === 0) reshuffleDeck(gs);
      if (gs.deck.length > 0) gs.hands[playerId].push(gs.deck.pop());
    }
    advanceTurn(gs);
    return checkWin(gs);
  }

  // ── PLAY ──────────────────────────────────────────────────────────────────
  if (act.type === 'play') {
    const hand = gs.hands[playerId];
    const card = hand[act.cardIdx];
    if (!card) return { error: 'Invalid card' };
    if (!canPlay(card, top, gs.activeColor)) return { error: 'Cannot play that card' };

    // Remove card from hand
    hand.splice(act.cardIdx, 1);
    gs.discard.push(card);

    // Set active color
    if (card.value === 'wild' || card.value === 'wild4') {
      gs.activeColor = act.chosenColor || 'red';
    } else {
      gs.activeColor = card.color;
    }

    // Apply card effects
    applyEffect(gs, card);

    // Check win
    if (hand.length === 0) {
      const scores = buildScores(gs, playerId);
      return { finished: true, winner: playerId, scores };
    }

    return checkWin(gs);
  }

  return { error: 'Unknown action' };
}

function applyEffect(gs, card) {
  const nextIdx = (gs.currentIdx + gs.direction + gs.playerOrder.length) % gs.playerOrder.length;

  switch (card.value) {
    case 'skip':
      advanceTurn(gs); // skip next
      advanceTurn(gs);
      break;
    case 'reverse':
      gs.direction *= -1;
      if (gs.playerOrder.length === 2) { advanceTurn(gs); advanceTurn(gs); } // reverse = skip in 2p
      else advanceTurn(gs);
      break;
    case 'draw2':
      gs.drawStack += 2;
      advanceTurn(gs);
      break;
    case 'wild4':
      gs.drawStack += 4;
      advanceTurn(gs);
      break;
    default:
      advanceTurn(gs);
  }
}

function advanceTurn(gs) {
  gs.currentIdx = (gs.currentIdx + gs.direction + gs.playerOrder.length) % gs.playerOrder.length;
}

function reshuffleDeck(gs) {
  const top = gs.discard.pop();
  gs.deck = shuffle(gs.discard);
  gs.discard = [top];
}

function buildScores(gs, winnerId) {
  const scores = {};
  gs.playerOrder.forEach(id => { scores[id] = 0; });
  // Winner gets points equal to sum of opponents' hand values
  let pts = 0;
  gs.playerOrder.forEach(id => {
    if (id !== winnerId) {
      gs.hands[id].forEach(c => {
        if (['wild','wild4'].includes(c.value)) pts += 50;
        else if (['skip','reverse','draw2'].includes(c.value)) pts += 20;
        else pts += parseInt(c.value) || 0;
      });
    }
  });
  scores[winnerId] = pts;
  return scores;
}

function checkWin(gs) {
  // Check if someone ran out (shouldn't happen mid-turn but safety)
  for (const [id, hand] of Object.entries(gs.hands)) {
    if (hand.length === 0) {
      return { finished: true, winner: id, scores: buildScores(gs, id) };
    }
  }
  return {};
}

module.exports = { init, getState, action, maxPlayers };
