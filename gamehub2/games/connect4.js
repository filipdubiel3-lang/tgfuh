// ─── Connect 4 Server Engine ──────────────────────────────────────────────────
const maxPlayers = 2;
const ROWS = 6, COLS = 7;

function init(players) {
  const colors = ['red', 'yellow'];
  const playerColors = {};
  players.forEach((p, i) => { playerColors[p.id] = colors[i]; });

  return {
    board: Array.from({ length: ROWS }, () => Array(COLS).fill(null)),
    playerOrder: players.map(p => p.id),
    playerColors,
    currentIdx: 0,
    winner: null,
    draw: false,
  };
}

function getState(gs) {
  return {
    board: gs.board,
    playerColors: gs.playerColors,
    current: gs.playerOrder[gs.currentIdx],
    winner: gs.winner,
    draw: gs.draw,
  };
}

function action(gs, playerId, act) {
  if (gs.winner || gs.draw) return { error: 'Game over' };
  if (gs.playerOrder[gs.currentIdx] !== playerId) return { error: 'Not your turn' };
  if (act.type !== 'drop') return { error: 'Unknown action' };

  const col = act.col;
  if (col < 0 || col >= COLS) return { error: 'Invalid column' };

  // Find lowest empty row in column
  let row = -1;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (!gs.board[r][col]) { row = r; break; }
  }
  if (row === -1) return { error: 'Column full' };

  gs.board[row][col] = playerId;

  if (checkWinner(gs.board, row, col, playerId)) {
    gs.winner = playerId;
    const scores = {};
    gs.playerOrder.forEach(id => { scores[id] = id === playerId ? 10 : 0; });
    return { finished: true, winner: playerId, scores };
  }

  // Check draw
  if (gs.board[0].every(cell => cell !== null)) {
    gs.draw = true;
    const scores = {};
    gs.playerOrder.forEach(id => { scores[id] = 0; });
    return { finished: true, winner: null, scores };
  }

  gs.currentIdx = (gs.currentIdx + 1) % gs.playerOrder.length;
  return {};
}

function checkWinner(board, row, col, pid) {
  return (
    checkLine(board, row, col, pid, 0, 1)  ||
    checkLine(board, row, col, pid, 1, 0)  ||
    checkLine(board, row, col, pid, 1, 1)  ||
    checkLine(board, row, col, pid, 1, -1)
  );
}

function checkLine(board, row, col, pid, dr, dc) {
  let count = 1;
  for (let d = 1; d < 4; d++) {
    const r = row + dr*d, c = col + dc*d;
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS || board[r][c] !== pid) break;
    count++;
  }
  for (let d = 1; d < 4; d++) {
    const r = row - dr*d, c = col - dc*d;
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS || board[r][c] !== pid) break;
    count++;
  }
  return count >= 4;
}

module.exports = { init, getState, action, maxPlayers };
