// ─── GameHub App ──────────────────────────────────────────────────────────────
const GAMES = [
  { id: 'uno',            name: 'UNO',               icon: '🃏', players: '2–6' },
  { id: 'wouldYouRather', name: 'Would You Rather',  icon: '🤔', players: '2–8' },
  { id: 'connect4',       name: 'Connect 4',         icon: '🔴', players: '2'   },
  { id: 'twoTruths',      name: '2 Truths & a Lie',  icon: '🤥', players: '2–8' },
  { id: 'neverHaveIEver', name: 'Never Have I Ever', icon: '✋', players: '2–8' },
  { id: 'wordle',         name: 'Wordle',            icon: '🟩', players: '1–4' },
  { id: 'connections',    name: 'Connections',       icon: '🔗', players: '1–4' },
  { id: 'contexto',       name: 'Contexto',          icon: '🧠', players: '1–4' },
];

const GAME_ENGINES = {}; // populated by game JS files

// ── App module ──────────────────────────────────────────────────────────────
const App = (() => {
  let socket;
  let me = null;
  let currentLobby = null;
  let isHost = false;
  let sitePassword = '';
  let currentGame = null;
  let selectedGame = null;

  // ── Init ──────────────────────────────────────────────────────────────────
  function init() {
    buildGameGrid();
    bindUI();
    connectSocket();
  }

  // ── Socket ────────────────────────────────────────────────────────────────
  function connectSocket() {
    socket = io();

    socket.on('loginResult', ({ success, username, error }) => {
      if (success) {
        me = { username };
        showScreen('lobby');
        document.getElementById('userBadge').textContent = '👤 ' + username;
        getLobbyList();
      } else {
        document.getElementById('loginError').textContent = error || 'Something went wrong.';
      }
    });

    socket.on('lobbyList', renderLobbyList);

    socket.on('lobbyJoined', (lobby) => {
      currentLobby = lobby;
      isHost = lobby.players[0]?.id === socket.id;
      showScreen('gameRoom');
      updateRoomUI();
    });

    socket.on('lobbyUpdate', (lobby) => {
      currentLobby = lobby;
      isHost = currentLobby.players[0]?.id === socket.id;
      updateRoomUI();
    });

    socket.on('gameStarted', ({ gameType, state }) => {
      currentGame = gameType;
      document.getElementById('waitingMsg').classList.add('hidden');
      document.getElementById('gameContainer').classList.remove('hidden');
      const engine = GAME_ENGINES[gameType];
      if (engine) engine.start(state, socket.id, me.username);
    });

    socket.on('gameState', (state) => {
      if (currentGame && GAME_ENGINES[currentGame]) {
        GAME_ENGINES[currentGame].update(state, socket.id);
      }
    });

    socket.on('gameFinished', (data) => {
      if (currentGame && GAME_ENGINES[currentGame]) {
        GAME_ENGINES[currentGame].finish(data, currentLobby);
      }
    });

    socket.on('gameError', (msg) => showToast(msg, 'error'));
    socket.on('error', (msg) => showToast(msg, 'error'));

    socket.on('chat', (msg) => appendChat(msg));

    socket.on('passwordChanged', () => {
      showToast('Password changed — please log in again.');
      sitePassword = '';
      me = null;
      showScreen('gate');
    });
  }

  // ── Auth ──────────────────────────────────────────────────────────────────
  function tryGate() {
    const pass = document.getElementById('gatePass').value;
    const errEl = document.getElementById('gateError');
    if (!pass.trim()) { errEl.textContent = 'Enter a password.'; return; }
    errEl.textContent = '';

    const btn = document.getElementById('gateBtn');
    btn.disabled = true;
    btn.textContent = 'Checking...';

    fetch('/api/verify-password?password=' + encodeURIComponent(pass))
      .then(r => r.json())
      .then(({ valid }) => {
        if (valid) {
          sitePassword = pass;
          showScreen('login');
          document.getElementById('usernameInput').focus();
        } else {
          errEl.textContent = 'Wrong password.';
          document.getElementById('gatePass').value = '';
          document.getElementById('gatePass').focus();
        }
      })
      .catch(() => { errEl.textContent = 'Could not reach server.'; })
      .finally(() => { btn.disabled = false; btn.textContent = 'Enter →'; });
  }

  function tryLogin() {
    const username = document.getElementById('usernameInput').value.trim();
    const errEl = document.getElementById('loginError');
    if (!username) { errEl.textContent = 'Enter a username.'; return; }
    if (username.length < 2) { errEl.textContent = 'At least 2 characters.'; return; }
    errEl.textContent = '';
    socket.emit('login', { username, password: sitePassword });
  }

  // ── Lobby ──────────────────────────────────────────────────────────────────
  function getLobbyList() {
    socket.emit('getLobbyList');
  }

  function createLobby() {
    if (!selectedGame) { showToast('Pick a game first.'); return; }
    socket.emit('createLobby', { gameType: selectedGame });
  }

  function joinLobby(lobbyId) {
    socket.emit('joinLobby', { lobbyId });
  }

  function leaveLobby() {
    socket.emit('leaveLobby');
    currentLobby = null;
    currentGame = null;
    document.getElementById('gameContainer').classList.add('hidden');
    document.getElementById('gameContainer').innerHTML = '';
    document.getElementById('waitingMsg').classList.remove('hidden');
    document.getElementById('chatLog').innerHTML = '';
    showScreen('lobby');
    getLobbyList();
  }

  function startGame() {
    socket.emit('startGame');
  }

  function sendAction(action) {
    socket.emit('gameAction', action);
  }

  function sendChat() {
    const inp = document.getElementById('chatInput');
    const msg = inp.value.trim();
    if (!msg) return;
    socket.emit('chat', msg);
    inp.value = '';
  }

  // ── UI ─────────────────────────────────────────────────────────────────────
  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
  }

  function buildGameGrid() {
    const grid = document.getElementById('gameGrid');
    GAMES.forEach(g => {
      const card = document.createElement('div');
      card.className = 'game-card';
      card.dataset.id = g.id;
      card.innerHTML = `<span class="gc-icon">${g.icon}</span><div class="gc-name">${g.name}</div><div class="gc-players">${g.players} players</div>`;
      card.onclick = () => {
        document.querySelectorAll('.game-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        selectedGame = g.id;
      };
      grid.appendChild(card);
    });
  }

  function renderLobbyList(list) {
    const el = document.getElementById('lobbyList');
    const waiting = list.filter(l => l.state === 'waiting');
    if (!waiting.length) {
      el.innerHTML = '<div class="lobby-empty">No open lobbies yet. Create one!</div>';
      return;
    }
    el.innerHTML = waiting.map(l => `
      <div class="lobby-item">
        <div>
          <div class="li-name">${getGameIcon(l.gameType)} ${escHtml(getGameName(l.gameType))}</div>
          <div class="li-meta">${l.playerCount}/${l.maxPlayers} players · ${l.id}</div>
        </div>
        <button class="btn-sm" onclick="App.joinLobby('${l.id}')">Join</button>
      </div>
    `).join('');
  }

  function updateRoomUI() {
    if (!currentLobby) return;
    const gameInfo = GAMES.find(g => g.id === currentLobby.gameType);
    document.getElementById('roomInfo').textContent = `${gameInfo?.icon || ''} ${gameInfo?.name || currentLobby.gameType} · Room ${currentLobby.id}`;
    document.getElementById('lobbyCode').textContent = currentLobby.id;
    document.getElementById('userBadge2').textContent = me ? '👤 ' + me.username : '';

    const pl = document.getElementById('playerList');
    pl.innerHTML = currentLobby.players.map((p, i) => `
      <li>
        ${i === 0 ? '<span class="crown">👑</span>' : ''}
        <span>${escHtml(p.name)}</span>
        ${p.id === socket.id ? '<span style="color:var(--text2);font-size:10px">(you)</span>' : ''}
        <span class="score">${p.score || 0}pt</span>
      </li>
    `).join('');

    isHost = currentLobby.players[0]?.id === socket.id;
    const startBtn = document.getElementById('startBtn');
    if (isHost && currentLobby.state === 'waiting') {
      startBtn.classList.remove('hidden');
    } else {
      startBtn.classList.add('hidden');
    }
  }

  function appendChat(msg) {
    const log = document.getElementById('chatLog');
    const div = document.createElement('div');
    div.className = 'chat-msg';
    if (msg.sys) {
      div.innerHTML = `<span class="sys">${escHtml(msg.text)}</span>`;
    } else {
      div.innerHTML = `<span class="from">${escHtml(msg.from)}:</span> ${escHtml(msg.text)}`;
    }
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
  }

  function showToast(msg, type = 'info') {
    let t = document.getElementById('toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'toast';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.style.borderColor = type === 'error' ? 'var(--accent2)' : 'var(--accent)';
    t.style.opacity = '1';
    t.style.transform = 'translateY(0)';
    clearTimeout(t._to);
    t._to = setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateY(6px)'; }, 2800);
  }

  function getGameName(id) { return GAMES.find(g => g.id === id)?.name || id; }
  function getGameIcon(id) { return GAMES.find(g => g.id === id)?.icon || '🎮'; }
  function escHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ── Bind UI ────────────────────────────────────────────────────────────────
  function bindUI() {
    // Gate
    document.getElementById('gateBtn').onclick = tryGate;
    document.getElementById('gatePass').addEventListener('keydown', e => { if (e.key === 'Enter') tryGate(); });

    // Login
    document.getElementById('loginBtn').onclick = tryLogin;
    document.getElementById('usernameInput').addEventListener('keydown', e => { if (e.key === 'Enter') tryLogin(); });

    // Lobby
    document.getElementById('createBtn').onclick = createLobby;
    document.getElementById('startBtn').onclick = startGame;

    // Chat
    document.getElementById('chatInput').addEventListener('keydown', e => { if (e.key === 'Enter') sendChat(); });
    document.getElementById('chatSendBtn').onclick = sendChat;

    // Admin panel — secret button in top-right corner
    // Enable pointer-events on hover via JS to avoid blocking clicks elsewhere
    const adminBtn = document.getElementById('secretAdminBtn');
    adminBtn.addEventListener('mouseenter', () => adminBtn.classList.add('enabled'));
    adminBtn.addEventListener('mouseleave', () => adminBtn.classList.remove('enabled'));
    adminBtn.onclick = openAdminPanel;

    // Admin panel buttons
    document.getElementById('adminBackBtn').onclick = closeAdminPanel;
    document.getElementById('changePassBtn').onclick = changePassword;
    document.getElementById('adminPass').addEventListener('keydown', e => { if (e.key === 'Enter') changePassword(); });
    document.getElementById('newPass').addEventListener('keydown', e => { if (e.key === 'Enter') changePassword(); });
  }

  return { init, getLobbyList, joinLobby, leaveLobby, sendAction, sendChat, showToast, escHtml, appendChat };
})();

// ── Admin Panel ───────────────────────────────────────────────────────────────
function openAdminPanel() {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('adminScreen').classList.add('active');
  // Clear fields on open
  document.getElementById('adminPass').value = '';
  document.getElementById('newPass').value = '';
  document.getElementById('adminMsg').textContent = '';
}

function closeAdminPanel() {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('gate').classList.add('active');
}

function changePassword() {
  const adminPassword = document.getElementById('adminPass').value;
  const newPassword = document.getElementById('newPass').value;
  const msg = document.getElementById('adminMsg');
  const btn = document.getElementById('changePassBtn');

  if (!adminPassword || !newPassword) {
    msg.className = 'admin-msg error';
    msg.textContent = 'Fill in both fields.';
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Updating...';
  msg.textContent = '';

  fetch('/api/change-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ adminPassword, newPassword }),
  })
    .then(r => r.json())
    .then(data => {
      if (data.success) {
        msg.className = 'admin-msg success';
        msg.textContent = '✓ Password updated!';
        document.getElementById('adminPass').value = '';
        document.getElementById('newPass').value = '';
      } else {
        msg.className = 'admin-msg error';
        msg.textContent = data.error || 'Failed.';
      }
    })
    .catch(() => {
      msg.className = 'admin-msg error';
      msg.textContent = 'Could not reach server.';
    })
    .finally(() => {
      btn.disabled = false;
      btn.textContent = 'Update Password';
    });
}

// ── Boot ──────────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  showScreen('gate');
  App.init();
});

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}
