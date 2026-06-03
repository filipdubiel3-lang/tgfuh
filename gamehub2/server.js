// ─── GameHub Server ────────────────────────────────────────────────────────────
const express   = require('express');
const http      = require('http');
const { Server } = require('socket.io');
const path      = require('path');
const fs        = require('fs');
const bcrypt    = require('bcrypt');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server);

const PORT = process.env.PORT || 3000;

// ── Config / password storage ────────────────────────────────────────────────
const DATA_FILE   = path.join(__dirname, 'data', 'config.json');
const PUBLIC_DIR  = path.join(__dirname, 'public');

function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {
    // Default config on first run
    const defaultCfg = {
      // "password" hashed with bcrypt — default site password is "gamehub"
      sitePasswordHash: bcrypt.hashSync('gamehub', 10),
      // Admin password to change site password — default is "admin"
      adminPasswordHash: bcrypt.hashSync('admin', 10)
    };
    saveConfig(defaultCfg);
    return defaultCfg;
  }
}

function saveConfig(cfg) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(cfg, null, 2));
}

let config = loadConfig();

// ── Static files ─────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.static(PUBLIC_DIR));

// ── REST API ─────────────────────────────────────────────────────────────────
app.get('/api/verify-password', (req, res) => {
  const { password } = req.query;
  const valid = bcrypt.compareSync(password || '', config.sitePasswordHash);
  res.json({ valid });
});

app.post('/api/change-password', (req, res) => {
  const { adminPassword, newPassword } = req.body;
  if (!adminPassword || !newPassword) {
    return res.json({ success: false, error: 'Missing fields' });
  }
  if (!bcrypt.compareSync(adminPassword, config.adminPasswordHash)) {
    return res.json({ success: false, error: 'Wrong admin password' });
  }
  if (newPassword.length < 4) {
    return res.json({ success: false, error: 'Password too short (min 4)' });
  }
  config.sitePasswordHash = bcrypt.hashSync(newPassword, 10);
  saveConfig(config);
  // Notify all connected clients to re-authenticate
  io.emit('passwordChanged');
  res.json({ success: true });
});

// ── In-memory state ───────────────────────────────────────────────────────────
// users:   Map<socketId, { username, lobbyId }>
// lobbies: Map<lobbyId, Lobby>
const users   = new Map();
const lobbies = new Map();

function makeLobbyId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = '';
  for (let i = 0; i < 4; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return lobbies.has(id) ? makeLobbyId() : id;
}

function getLobbyList() {
  return Array.from(lobbies.values()).map(l => ({
    id: l.id,
    gameType: l.gameType,
    playerCount: l.players.length,
    state: l.state,
    maxPlayers: l.maxPlayers,
  }));
}

function getSocket(id) { return io.sockets.sockets.get(id); }

// ── Game engines (server-side) ────────────────────────────────────────────────
const GAME_ENGINES = {
  uno:           require('./games/uno'),
  wouldYouRather:require('./games/wouldYouRather'),
  connect4:      require('./games/connect4'),
  twoTruths:     require('./games/twoTruths'),
  neverHaveIEver:require('./games/neverHaveIEver'),
  wordle:        require('./games/wordle'),
  connections:   require('./games/connections'),
  contexto:      require('./games/contexto'),
};

// ── Socket.io ─────────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`[connect] ${socket.id}`);

  // ── Auth ──────────────────────────────────────────────────────────────────
  socket.on('login', ({ username, password }) => {
    // Verify site password
    if (!bcrypt.compareSync(password || '', config.sitePasswordHash)) {
      return socket.emit('loginResult', { success: false, error: 'Wrong password' });
    }
    // Validate username
    username = (username || '').trim();
    if (username.length < 2 || username.length > 16) {
      return socket.emit('loginResult', { success: false, error: 'Username must be 2–16 chars' });
    }
    // Check duplicate usernames
    for (const u of users.values()) {
      if (u.username.toLowerCase() === username.toLowerCase()) {
        return socket.emit('loginResult', { success: false, error: 'Username taken' });
      }
    }
    users.set(socket.id, { username, lobbyId: null });
    socket.emit('loginResult', { success: true, username });
  });

  // ── Lobby management ───────────────────────────────────────────────────────
  socket.on('getLobbyList', () => {
    socket.emit('lobbyList', getLobbyList());
  });

  socket.on('createLobby', ({ gameType }) => {
    const user = users.get(socket.id);
    if (!user) return socket.emit('error', 'Not logged in');
    if (user.lobbyId) return socket.emit('error', 'Already in a lobby');
    if (!GAME_ENGINES[gameType]) return socket.emit('error', 'Unknown game');

    const id = makeLobbyId();
    const lobby = {
      id,
      gameType,
      state: 'waiting',
      players: [{ id: socket.id, name: user.username, score: 0 }],
      maxPlayers: GAME_ENGINES[gameType].maxPlayers || 8,
      gameState: null,
    };
    lobbies.set(id, lobby);
    user.lobbyId = id;
    socket.join(id);
    socket.emit('lobbyJoined', serializeLobby(lobby));
    // Broadcast updated list to everyone in lobby screen
    io.emit('lobbyList', getLobbyList());
  });

  socket.on('joinLobby', ({ lobbyId }) => {
    const user = users.get(socket.id);
    if (!user) return socket.emit('error', 'Not logged in');
    if (user.lobbyId) return socket.emit('error', 'Already in a lobby');

    const lobby = lobbies.get(lobbyId);
    if (!lobby) return socket.emit('error', 'Lobby not found');
    if (lobby.state !== 'waiting') return socket.emit('error', 'Game already started');
    if (lobby.players.length >= lobby.maxPlayers) return socket.emit('error', 'Lobby full');

    lobby.players.push({ id: socket.id, name: user.username, score: 0 });
    user.lobbyId = lobbyId;
    socket.join(lobbyId);
    socket.emit('lobbyJoined', serializeLobby(lobby));
    io.to(lobbyId).emit('lobbyUpdate', serializeLobby(lobby));
    io.emit('lobbyList', getLobbyList());

    // System chat message
    io.to(lobbyId).emit('chat', { sys: true, text: `${user.username} joined` });
  });

  socket.on('leaveLobby', () => handleLeave(socket));

  socket.on('startGame', () => {
    const user = users.get(socket.id);
    if (!user || !user.lobbyId) return;
    const lobby = lobbies.get(user.lobbyId);
    if (!lobby) return;
    if (lobby.players[0].id !== socket.id) return socket.emit('error', 'Only the host can start');
    if (lobby.players.length < 1) return socket.emit('error', 'Need at least 1 player');

    const engine = GAME_ENGINES[lobby.gameType];
    if (!engine) return socket.emit('error', 'Game engine not found');

    try {
      lobby.gameState = engine.init(lobby.players);
      lobby.state = 'playing';
      io.to(lobby.id).emit('gameStarted', {
        gameType: lobby.gameType,
        state: engine.getState(lobby.gameState, null), // full state for start
      });
      // Send each player their personal view
      lobby.players.forEach(p => {
        const s = getSocket(p.id);
        if (s) s.emit('gameState', engine.getState(lobby.gameState, p.id));
      });
      io.emit('lobbyList', getLobbyList());
    } catch (e) {
      console.error('startGame error:', e);
      socket.emit('error', 'Failed to start game');
    }
  });

  socket.on('gameAction', (action) => {
    const user = users.get(socket.id);
    if (!user || !user.lobbyId) return;
    const lobby = lobbies.get(user.lobbyId);
    if (!lobby || lobby.state !== 'playing') return;

    const engine = GAME_ENGINES[lobby.gameType];
    if (!engine) return;

    try {
      const result = engine.action(lobby.gameState, socket.id, action);
      if (result.error) return socket.emit('gameError', result.error);

      // Send updated state to each player
      lobby.players.forEach(p => {
        const s = getSocket(p.id);
        if (s) s.emit('gameState', engine.getState(lobby.gameState, p.id));
      });

      // Check for game over
      if (result.finished) {
        // Update lobby scores
        if (result.scores) {
          lobby.players.forEach(p => {
            p.score = (p.score || 0) + (result.scores[p.id] || 0);
          });
        }
        lobby.state = 'waiting';
        lobby.gameState = null;
        io.to(lobby.id).emit('gameFinished', {
          winner: result.winner,
          scores: result.scores,
          answer: result.answer,
        });
        // Return to waiting after 10s
        setTimeout(() => {
          if (lobbies.has(lobby.id)) {
            lobby.state = 'waiting';
            io.to(lobby.id).emit('lobbyUpdate', serializeLobby(lobby));
            io.emit('lobbyList', getLobbyList());
          }
        }, 10000);
      }
    } catch (e) {
      console.error('gameAction error:', e);
      socket.emit('gameError', 'Action failed');
    }
  });

  socket.on('chat', (msg) => {
    const user = users.get(socket.id);
    if (!user || !user.lobbyId) return;
    const text = String(msg).trim().slice(0, 200);
    if (!text) return;
    io.to(user.lobbyId).emit('chat', { from: user.username, text });
  });

  socket.on('disconnect', () => {
    console.log(`[disconnect] ${socket.id}`);
    handleLeave(socket);
    users.delete(socket.id);
  });
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function handleLeave(socket) {
  const user = users.get(socket.id);
  if (!user || !user.lobbyId) return;

  const lobby = lobbies.get(user.lobbyId);
  user.lobbyId = null;
  socket.leave(lobby?.id);

  if (!lobby) return;

  lobby.players = lobby.players.filter(p => p.id !== socket.id);
  io.to(lobby.id).emit('chat', { sys: true, text: `${user.username} left` });

  if (lobby.players.length === 0) {
    lobbies.delete(lobby.id);
  } else {
    // If game was in progress, end it
    if (lobby.state === 'playing') {
      lobby.state = 'waiting';
      lobby.gameState = null;
      io.to(lobby.id).emit('gameFinished', { winner: null, scores: {} });
    }
    io.to(lobby.id).emit('lobbyUpdate', serializeLobby(lobby));
  }
  io.emit('lobbyList', getLobbyList());
}

function serializeLobby(lobby) {
  return {
    id: lobby.id,
    gameType: lobby.gameType,
    state: lobby.state,
    players: lobby.players.map(p => ({ id: p.id, name: p.name, score: p.score })),
    maxPlayers: lobby.maxPlayers,
  };
}

// ── Start ─────────────────────────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`\n🎮 GameHub running at http://localhost:${PORT}`);
  console.log(`   Default site password : gamehub`);
  console.log(`   Default admin password: admin`);
  console.log(`   Change these via the admin panel!\n`);
});
