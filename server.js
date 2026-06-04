// ─── Goon Room — server.js ───────────────────────────────────────────────────
const express   = require('express');
const http      = require('http');
const { Server } = require('socket.io');
const path      = require('path');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server);

const PORT = process.env.PORT || 3000;

// ── Serve HTML inline ────────────────────────────────────────────────────────
const HTML = "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n<meta charset=\"UTF-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n<title>Goon Room</title>\n<link rel=\"preconnect\" href=\"https://fonts.googleapis.com\">\n<link rel=\"preconnect\" href=\"https://fonts.gstatic.com\" crossorigin>\n<link href=\"https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Josefin+Sans:wght@100;300;400&display=swap\" rel=\"stylesheet\">\n\n<style>\n/* \u2500\u2500\u2500 Reset & Base \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }\n\n:root {\n  --bg:        #0a0906;\n  --bg2:       #111009;\n  --surface:   #16140f;\n  --border:    rgba(200,180,130,0.15);\n  --gold:      #c8a96e;\n  --gold-dim:  #8a7249;\n  --cream:     #e8dfc8;\n  --text:      #d4c9b0;\n  --text-dim:  #7a7060;\n  --red:       #c0392b;\n  --green:     #27ae60;\n  --yellow:    #d4a017;\n  --blue:      #2980b9;\n  --purple:    #8e44ad;\n  --font-serif: 'Cormorant Garamond', Georgia, serif;\n  --font-sans:  'Josefin Sans', 'Helvetica Neue', sans-serif;\n}\n\nhtml, body {\n  height: 100%;\n  background: var(--bg);\n  color: var(--text);\n  font-family: var(--font-sans);\n  font-weight: 300;\n  letter-spacing: 0.04em;\n  overflow: hidden;\n}\n\n/* \u2500\u2500\u2500 Screen system \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n.screen {\n  position: fixed;\n  inset: 0;\n  opacity: 0;\n  pointer-events: none;\n  transition: opacity 0.6s ease;\n  overflow-y: auto;\n}\n.screen.active {\n  opacity: 1;\n  pointer-events: all;\n}\n\n/* \u2500\u2500\u2500 Gate Background \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n#gate {\n  background: linear-gradient(135deg, #1a0a2e 0%, #16213e 40%, #0f3460 70%, #1a0a2e 100%);\n}\n\n/* Floating game cards in the background */\n.bg-cards {\n  position: fixed;\n  inset: 0;\n  pointer-events: none;\n  z-index: 0;\n  overflow: hidden;\n}\n\n.bg-card {\n  position: absolute;\n  width: 70px;\n  height: 100px;\n  border-radius: 10px;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  font-size: 1.6rem;\n  font-weight: bold;\n  box-shadow: 0 8px 32px rgba(0,0,0,0.4);\n  animation: cardFloat linear infinite;\n  opacity: 0.18;\n  border: 2px solid rgba(255,255,255,0.15);\n}\n\n.bg-card.red    { background: linear-gradient(145deg, #e74c3c, #c0392b); color: white; }\n.bg-card.blue   { background: linear-gradient(145deg, #3498db, #2980b9); color: white; }\n.bg-card.green  { background: linear-gradient(145deg, #2ecc71, #27ae60); color: white; }\n.bg-card.yellow { background: linear-gradient(145deg, #f1c40f, #d4a017); color: #333; }\n.bg-card.purple { background: linear-gradient(145deg, #9b59b6, #8e44ad); color: white; }\n\n@keyframes cardFloat {\n  0%   { transform: translateY(110vh) rotate(-15deg); opacity: 0; }\n  5%   { opacity: 0.18; }\n  95%  { opacity: 0.18; }\n  100% { transform: translateY(-20vh) rotate(15deg); opacity: 0; }\n}\n\n/* Colorful glow blobs */\n.gate-blob {\n  position: fixed;\n  border-radius: 50%;\n  pointer-events: none;\n  z-index: 0;\n  filter: blur(80px);\n  animation: blobPulse ease-in-out infinite;\n}\n.gate-blob-1 { width:400px;height:400px; background:rgba(231,76,60,0.25);  top:-100px;left:-100px; animation-duration:8s; }\n.gate-blob-2 { width:350px;height:350px; background:rgba(52,152,219,0.2);  bottom:-80px;right:-80px; animation-duration:11s; animation-delay:-4s; }\n.gate-blob-3 { width:280px;height:280px; background:rgba(155,89,182,0.2);  top:40%;left:60%; animation-duration:9s; animation-delay:-2s; }\n.gate-blob-4 { width:220px;height:220px; background:rgba(46,204,113,0.18); bottom:20%;left:5%; animation-duration:13s; animation-delay:-6s; }\n\n@keyframes blobPulse {\n  0%,100% { transform: scale(1); }\n  50%      { transform: scale(1.15); }\n}\n\n/* Admin screen background */\n#adminScreen {\n  background: linear-gradient(135deg, #1a0a2e 0%, #16213e 40%, #0f3460 70%, #1a0a2e 100%);\n}\n\n/* Login screen background */\n#login {\n  background: linear-gradient(135deg, #1a0a2e 0%, #16213e 40%, #0f3460 70%, #1a0a2e 100%);\n}\n\n/* \u2500\u2500\u2500 Gate / Login Screen \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n.gate-content {\n  position: relative;\n  z-index: 10;\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  justify-content: center;\n  min-height: 100vh;\n  padding: 2rem;\n  text-align: center;\n  animation: fadeUp 0.8s ease both;\n}\n\n@keyframes fadeUp {\n  from { opacity: 0; transform: translateY(24px); }\n  to   { opacity: 1; transform: translateY(0); }\n}\n\n/* Game icons row above title */\n.gate-icons {\n  display: flex;\n  gap: 1rem;\n  margin-bottom: 1.5rem;\n  font-size: 2rem;\n  animation: fadeUp 0.8s ease 0.1s both;\n}\n.gate-icons span {\n  display: inline-block;\n  animation: iconBounce 1.8s ease-in-out infinite;\n}\n.gate-icons span:nth-child(2) { animation-delay: 0.2s; }\n.gate-icons span:nth-child(3) { animation-delay: 0.4s; }\n.gate-icons span:nth-child(4) { animation-delay: 0.6s; }\n.gate-icons span:nth-child(5) { animation-delay: 0.8s; }\n@keyframes iconBounce {\n  0%,100% { transform: translateY(0); }\n  50%      { transform: translateY(-8px); }\n}\n\n.gate-eyebrow {\n  font-family: var(--font-sans);\n  font-size: 0.65rem;\n  font-weight: 400;\n  letter-spacing: 0.35em;\n  text-transform: uppercase;\n  color: rgba(255,255,255,0.45);\n  margin-bottom: 0.6rem;\n  animation: fadeUp 0.8s ease 0.15s both;\n}\n\n.gate-title {\n  font-family: var(--font-serif);\n  font-size: clamp(3.5rem, 9vw, 7.5rem);\n  font-weight: 600;\n  line-height: 1;\n  letter-spacing: 0.02em;\n  animation: fadeUp 0.8s ease 0.2s both;\n  background: linear-gradient(135deg, #fff 0%, #f1c40f 40%, #e74c3c 70%, #9b59b6 100%);\n  -webkit-background-clip: text;\n  -webkit-text-fill-color: transparent;\n  background-clip: text;\n  filter: drop-shadow(0 0 30px rgba(241,196,15,0.3));\n}\n\n.gate-sub {\n  font-family: var(--font-sans);\n  font-size: 0.8rem;\n  letter-spacing: 0.2em;\n  text-transform: uppercase;\n  color: rgba(255,255,255,0.4);\n  margin-top: 0.8rem;\n  animation: fadeUp 0.8s ease 0.3s both;\n}\n\n.gate-divider {\n  width: 80px;\n  height: 2px;\n  background: linear-gradient(90deg, #e74c3c, #f1c40f, #2ecc71, #3498db, #9b59b6);\n  margin: 2rem auto;\n  border-radius: 2px;\n  animation: fadeUp 0.8s ease 0.35s both;\n}\n\n/* The card panel */\n.gate-panel {\n  background: rgba(255,255,255,0.06);\n  border: 1px solid rgba(255,255,255,0.12);\n  border-radius: 20px;\n  padding: 2.5rem 2.5rem 2rem;\n  backdrop-filter: blur(20px);\n  width: 100%;\n  max-width: 360px;\n  animation: fadeUp 0.8s ease 0.4s both;\n  box-shadow: 0 20px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1);\n}\n\n.gate-form {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  gap: 1rem;\n  width: 100%;\n}\n\n.cin-input {\n  width: 100%;\n  background: rgba(255,255,255,0.08);\n  border: 1.5px solid rgba(255,255,255,0.15);\n  border-radius: 10px;\n  color: #fff;\n  font-family: var(--font-sans);\n  font-size: 1rem;\n  font-weight: 300;\n  letter-spacing: 0.1em;\n  padding: 0.9rem 1.2rem;\n  outline: none;\n  transition: border-color 0.25s, background 0.25s, box-shadow 0.25s;\n  text-align: center;\n}\n.cin-input::placeholder { color: rgba(255,255,255,0.3); letter-spacing: 0.08em; }\n.cin-input:focus {\n  border-color: #f1c40f;\n  background: rgba(255,255,255,0.12);\n  box-shadow: 0 0 0 3px rgba(241,196,15,0.15);\n}\n\n.cin-btn {\n  width: 100%;\n  background: linear-gradient(135deg, #e74c3c, #9b59b6);\n  border: none;\n  border-radius: 10px;\n  color: #fff;\n  font-family: var(--font-sans);\n  font-size: 0.8rem;\n  font-weight: 400;\n  letter-spacing: 0.25em;\n  text-transform: uppercase;\n  padding: 1rem 2rem;\n  cursor: pointer;\n  transition: all 0.25s ease;\n  box-shadow: 0 4px 20px rgba(231,76,60,0.35);\n}\n.cin-btn:hover {\n  transform: translateY(-2px);\n  box-shadow: 0 8px 28px rgba(231,76,60,0.5);\n  filter: brightness(1.1);\n}\n.cin-btn:active { transform: translateY(0); }\n\n.cin-error {\n  color: #ff6b6b;\n  font-size: 0.75rem;\n  letter-spacing: 0.05em;\n  min-height: 1.2rem;\n  text-align: center;\n  margin-top: 0.25rem;\n}\n\n.cin-msg {\n  font-size: 0.75rem;\n  letter-spacing: 0.08em;\n  min-height: 1.2rem;\n  text-align: center;\n  margin-top: 0.5rem;\n}\n.cin-msg.success { color: #2ecc71; }\n.cin-msg.error   { color: #ff6b6b; }\n\n.gate-footer {\n  position: fixed;\n  bottom: 1.5rem;\n  left: 0;\n  right: 0;\n  text-align: center;\n  font-size: 0.6rem;\n  letter-spacing: 0.25em;\n  color: rgba(255,255,255,0.2);\n  z-index: 10;\n}\n\n/* Secret admin button \u2014 top right, invisible */\n#secretAdminBtn {\n  position: fixed;\n  top: 0; right: 0;\n  width: 60px; height: 60px;\n  background: transparent;\n  border: none;\n  cursor: default;\n  z-index: 100;\n  opacity: 0;\n}\n\n/* \u2500\u2500\u2500 Admin Panel \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n.admin-content {\n  position: relative;\n  z-index: 10;\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  justify-content: center;\n  min-height: 100vh;\n  padding: 2rem;\n}\n\n.cin-back {\n  position: fixed;\n  top: 2rem; left: 2rem;\n  background: rgba(255,255,255,0.08);\n  border: 1px solid rgba(255,255,255,0.15);\n  border-radius: 8px;\n  color: rgba(255,255,255,0.6);\n  font-family: var(--font-sans);\n  font-size: 0.7rem;\n  letter-spacing: 0.15em;\n  text-transform: uppercase;\n  cursor: pointer;\n  transition: all 0.2s;\n  padding: 0.5rem 1rem;\n}\n.cin-back:hover { color: #fff; background: rgba(255,255,255,0.15); }\n\n.admin-card {\n  width: 100%;\n  max-width: 400px;\n  padding: 2.5rem;\n  border: 1px solid rgba(255,255,255,0.12);\n  border-radius: 20px;\n  background: rgba(255,255,255,0.06);\n  backdrop-filter: blur(20px);\n  box-shadow: 0 20px 60px rgba(0,0,0,0.4);\n  text-align: center;\n  animation: fadeUp 0.5s ease;\n}\n\n.admin-title {\n  font-family: var(--font-serif);\n  font-size: 2.2rem;\n  font-weight: 600;\n  background: linear-gradient(135deg, #fff, #f1c40f);\n  -webkit-background-clip: text;\n  -webkit-text-fill-color: transparent;\n  background-clip: text;\n  margin: 0.5rem 0;\n}\n\n.admin-desc {\n  font-family: var(--font-sans);\n  color: rgba(255,255,255,0.4);\n  font-size: 0.8rem;\n  letter-spacing: 0.1em;\n  margin-bottom: 2rem;\n}\n\n.admin-form {\n  display: flex;\n  flex-direction: column;\n  gap: 1.2rem;\n  text-align: left;\n}\n\n.field-group { display: flex; flex-direction: column; gap: 0.5rem; }\n.cin-label {\n  font-size: 0.6rem;\n  letter-spacing: 0.25em;\n  text-transform: uppercase;\n  color: rgba(255,255,255,0.4);\n}\n\n/* \u2500\u2500\u2500 App Header \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n.app-header {\n  position: sticky;\n  top: 0;\n  z-index: 50;\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  padding: 1rem 2rem;\n  border-bottom: 1px solid var(--border);\n  background: rgba(10,9,6,0.9);\n  backdrop-filter: blur(20px);\n}\n\n.app-logo {\n  font-family: var(--font-serif);\n  font-size: 1.1rem;\n  font-weight: 300;\n  color: var(--cream);\n  letter-spacing: 0.1em;\n}\n\n.room-title {\n  font-family: var(--font-sans);\n  font-size: 0.65rem;\n  letter-spacing: 0.2em;\n  text-transform: uppercase;\n  color: var(--gold-dim);\n}\n\n.user-chip {\n  font-size: 0.65rem;\n  letter-spacing: 0.2em;\n  text-transform: uppercase;\n  color: var(--text-dim);\n  border: 1px solid var(--border);\n  padding: 0.3rem 0.8rem;\n}\n\n.hdr-right {\n  display: flex;\n  align-items: center;\n  gap: 1rem;\n}\n\n.leave-btn {\n  background: transparent;\n  border: 1px solid rgba(192,57,43,0.4);\n  color: #c0392b;\n  font-family: var(--font-sans);\n  font-size: 0.6rem;\n  letter-spacing: 0.2em;\n  text-transform: uppercase;\n  padding: 0.4rem 1rem;\n  cursor: pointer;\n  transition: all 0.2s;\n}\n.leave-btn:hover { background: rgba(192,57,43,0.1); }\n\n/* \u2500\u2500\u2500 Lobby Layout \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n.lobby-layout {\n  position: relative;\n  z-index: 10;\n  display: grid;\n  grid-template-columns: 1fr 360px;\n  gap: 2rem;\n  padding: 2rem;\n  max-width: 1200px;\n  margin: 0 auto;\n  min-height: calc(100vh - 65px);\n}\n\n.section-label {\n  font-size: 0.6rem;\n  letter-spacing: 0.3em;\n  text-transform: uppercase;\n  color: var(--gold-dim);\n  margin-bottom: 1.2rem;\n  display: flex;\n  align-items: center;\n  gap: 1rem;\n}\n\n.game-grid {\n  display: grid;\n  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));\n  gap: 0.75rem;\n  margin-bottom: 1.5rem;\n}\n\n.game-card {\n  border: 1px solid var(--border);\n  padding: 1.2rem 1rem;\n  cursor: pointer;\n  transition: all 0.25s ease;\n  background: rgba(16,14,9,0.5);\n  text-align: center;\n}\n.game-card:hover { border-color: var(--gold-dim); background: rgba(200,169,110,0.05); }\n.game-card.selected { border-color: var(--gold); background: rgba(200,169,110,0.08); }\n\n.game-card-icon { font-size: 1.8rem; display: block; margin-bottom: 0.6rem; }\n.game-card-name {\n  font-size: 0.65rem;\n  letter-spacing: 0.2em;\n  text-transform: uppercase;\n  color: var(--cream);\n}\n.game-card-players {\n  font-family: var(--font-serif);\n  font-style: italic;\n  font-size: 0.8rem;\n  color: var(--text-dim);\n  margin-top: 0.3rem;\n}\n\n.room-list { display: flex; flex-direction: column; gap: 0.5rem; }\n\n.room-item {\n  border: 1px solid var(--border);\n  padding: 0.9rem 1rem;\n  cursor: pointer;\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  transition: border-color 0.2s;\n  background: rgba(16,14,9,0.4);\n}\n.room-item:hover { border-color: var(--gold-dim); }\n\n.room-item-name {\n  font-size: 0.8rem;\n  color: var(--cream);\n  letter-spacing: 0.05em;\n}\n.room-item-code {\n  font-family: var(--font-serif);\n  font-style: italic;\n  font-size: 0.75rem;\n  color: var(--text-dim);\n}\n.room-item-count {\n  font-size: 0.65rem;\n  letter-spacing: 0.15em;\n  color: var(--gold-dim);\n}\n\n.empty-rooms {\n  font-family: var(--font-serif);\n  font-style: italic;\n  color: var(--text-dim);\n  text-align: center;\n  padding: 2rem 0;\n  font-size: 0.95rem;\n}\n\n.mt1 { margin-top: 1rem; }\n.mt2 { margin-top: 1.5rem; }\n.refresh-btn {\n  background: transparent;\n  border: none;\n  color: var(--text-dim);\n  cursor: pointer;\n  font-size: 1rem;\n  transition: color 0.2s;\n  padding: 0;\n  margin-left: auto;\n}\n.refresh-btn:hover { color: var(--gold); }\n\n/* \u2500\u2500\u2500 Room Layout \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n.room-layout {\n  position: relative;\n  z-index: 10;\n  display: grid;\n  grid-template-columns: 260px 1fr;\n  height: calc(100vh - 65px);\n}\n\n.sidebar {\n  border-right: 1px solid var(--border);\n  display: flex;\n  flex-direction: column;\n  background: rgba(10,9,6,0.6);\n  backdrop-filter: blur(10px);\n}\n\n.sidebar-section {\n  padding: 1.2rem;\n  border-bottom: 1px solid var(--border);\n}\n\n.sidebar-chat {\n  flex: 1;\n  display: flex;\n  flex-direction: column;\n  overflow: hidden;\n  border-bottom: none;\n}\n\n.player-list {\n  list-style: none;\n  display: flex;\n  flex-direction: column;\n  gap: 0.4rem;\n}\n\n.player-list li {\n  font-size: 0.8rem;\n  padding: 0.4rem 0.5rem;\n  color: var(--text);\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n}\n.player-list li::before {\n  content: '\u25e6';\n  color: var(--gold-dim);\n}\n.player-list li.is-host::before { content: '\u25c8'; color: var(--gold); }\n.player-score {\n  margin-left: auto;\n  font-size: 0.7rem;\n  color: var(--gold-dim);\n}\n\n.chat-log {\n  flex: 1;\n  overflow-y: auto;\n  padding: 0.8rem;\n  font-size: 0.78rem;\n  display: flex;\n  flex-direction: column;\n  gap: 0.3rem;\n}\n.chat-log::-webkit-scrollbar { width: 3px; }\n.chat-log::-webkit-scrollbar-track { background: transparent; }\n.chat-log::-webkit-scrollbar-thumb { background: var(--border); }\n\n.chat-msg { line-height: 1.5; }\n.chat-msg .chat-from { color: var(--gold); font-weight: 400; }\n.chat-msg.sys { font-style: italic; color: var(--text-dim); font-size: 0.72rem; }\n\n.chat-row {\n  display: flex;\n  border-top: 1px solid var(--border);\n  padding: 0.5rem;\n  gap: 0.4rem;\n}\n.chat-field {\n  flex: 1;\n  background: transparent;\n  border: none;\n  color: var(--text);\n  font-family: var(--font-sans);\n  font-size: 0.78rem;\n  outline: none;\n  padding: 0.3rem;\n}\n.chat-field::placeholder { color: var(--text-dim); }\n.chat-send {\n  background: transparent;\n  border: none;\n  color: var(--gold-dim);\n  cursor: pointer;\n  font-size: 0.9rem;\n  transition: color 0.2s;\n}\n.chat-send:hover { color: var(--gold); }\n\n/* \u2500\u2500\u2500 Game Area \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n.game-area {\n  overflow-y: auto;\n  position: relative;\n  display: flex;\n  flex-direction: column;\n}\n\n.waiting-msg {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  justify-content: center;\n  height: 100%;\n  padding: 3rem;\n  text-align: center;\n  gap: 1rem;\n}\n\n.waiting-icon {\n  font-size: 3rem;\n  color: var(--gold-dim);\n  animation: pulse 2s ease-in-out infinite;\n}\n@keyframes pulse {\n  0%, 100% { opacity: 0.4; }\n  50%       { opacity: 1; }\n}\n\n.waiting-msg h2 {\n  font-family: var(--font-serif);\n  font-weight: 300;\n  font-size: 2rem;\n  color: var(--cream);\n}\n\n.waiting-msg p {\n  font-family: var(--font-serif);\n  font-style: italic;\n  color: var(--text-dim);\n}\n\n.room-code {\n  font-family: var(--font-sans);\n  font-size: 2.5rem;\n  font-weight: 100;\n  letter-spacing: 0.4em;\n  color: var(--gold);\n  border: 1px solid var(--border);\n  padding: 1rem 2rem;\n}\n\n.room-hint {\n  font-size: 0.7rem;\n  letter-spacing: 0.15em;\n  color: var(--text-dim) !important;\n}\n\n.hidden { display: none !important; }\n\n/* \u2500\u2500\u2500 Game Container \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n#gameContainer {\n  padding: 2rem;\n  flex: 1;\n}\n\n/* \u2500\u2500\u2500 Generic Game UI \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n.game-title {\n  font-family: var(--font-serif);\n  font-size: 1.8rem;\n  font-weight: 300;\n  color: var(--cream);\n  letter-spacing: 0.05em;\n  margin-bottom: 0.3rem;\n}\n.game-subtitle {\n  font-family: var(--font-serif);\n  font-style: italic;\n  color: var(--text-dim);\n  font-size: 0.9rem;\n  margin-bottom: 2rem;\n}\n\n.game-btn {\n  background: transparent;\n  border: 1px solid var(--gold-dim);\n  color: var(--gold);\n  font-family: var(--font-sans);\n  font-size: 0.65rem;\n  letter-spacing: 0.25em;\n  text-transform: uppercase;\n  padding: 0.7rem 1.8rem;\n  cursor: pointer;\n  transition: all 0.25s;\n}\n.game-btn:hover { background: var(--gold); color: var(--bg); border-color: var(--gold); }\n.game-btn:disabled { opacity: 0.35; cursor: not-allowed; pointer-events: none; }\n\n.game-btn-sm {\n  font-size: 0.6rem;\n  padding: 0.5rem 1.2rem;\n}\n\n.game-status {\n  font-size: 0.7rem;\n  letter-spacing: 0.15em;\n  text-transform: uppercase;\n  color: var(--text-dim);\n  margin-bottom: 1.5rem;\n}\n\n.game-status.highlight { color: var(--gold); }\n\n/* \u2500\u2500\u2500 WORDLE \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n.wordle-wrap {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  gap: 2rem;\n  max-width: 500px;\n  margin: 0 auto;\n}\n\n.wordle-board {\n  display: flex;\n  flex-direction: column;\n  gap: 5px;\n}\n\n.wordle-row {\n  display: flex;\n  gap: 5px;\n}\n\n.wordle-cell {\n  width: 58px;\n  height: 58px;\n  border: 1px solid var(--border);\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  font-family: var(--font-sans);\n  font-size: 1.4rem;\n  font-weight: 400;\n  letter-spacing: 0;\n  color: var(--cream);\n  text-transform: uppercase;\n  transition: transform 0.1s;\n  position: relative;\n  background: transparent;\n}\n\n.wordle-cell.filled {\n  border-color: rgba(200,180,130,0.4);\n  animation: pop 0.1s ease;\n}\n\n@keyframes pop {\n  0%   { transform: scale(1); }\n  50%  { transform: scale(1.1); }\n  100% { transform: scale(1); }\n}\n\n.wordle-cell.reveal {\n  animation: flip 0.4s ease forwards;\n}\n\n@keyframes flip {\n  0%   { transform: rotateX(0deg); }\n  50%  { transform: rotateX(90deg); background: transparent; }\n  100% { transform: rotateX(0deg); }\n}\n\n.wordle-cell.correct {\n  background: var(--green);\n  border-color: var(--green);\n  color: #fff;\n}\n.wordle-cell.present {\n  background: var(--yellow);\n  border-color: var(--yellow);\n  color: #fff;\n}\n.wordle-cell.absent {\n  background: #2a2a2a;\n  border-color: #2a2a2a;\n  color: #777;\n}\n\n.wordle-keyboard {\n  display: flex;\n  flex-direction: column;\n  gap: 6px;\n  width: 100%;\n  max-width: 480px;\n}\n\n.wordle-kb-row {\n  display: flex;\n  justify-content: center;\n  gap: 5px;\n}\n\n.wordle-key {\n  min-width: 36px;\n  height: 48px;\n  padding: 0 6px;\n  background: rgba(40,36,28,0.8);\n  border: 1px solid var(--border);\n  color: var(--cream);\n  font-family: var(--font-sans);\n  font-size: 0.7rem;\n  letter-spacing: 0.05em;\n  cursor: pointer;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  transition: all 0.15s;\n  text-transform: uppercase;\n  border-radius: 3px;\n}\n.wordle-key:hover { border-color: var(--gold-dim); }\n.wordle-key.wide { min-width: 56px; font-size: 0.6rem; }\n\n.wordle-key.correct { background: var(--green); border-color: var(--green); color: #fff; }\n.wordle-key.present { background: var(--yellow); border-color: var(--yellow); color: #fff; }\n.wordle-key.absent  { background: #1a1a1a; border-color: #1a1a1a; color: #555; }\n\n.wordle-msg {\n  font-family: var(--font-serif);\n  font-size: 1.1rem;\n  color: var(--cream);\n  min-height: 1.5rem;\n  text-align: center;\n}\n\n.wordle-progress {\n  display: flex;\n  gap: 1rem;\n  font-size: 0.7rem;\n  letter-spacing: 0.1em;\n  color: var(--text-dim);\n  text-transform: uppercase;\n}\n\n/* \u2500\u2500\u2500 CONNECTIONS \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n.connections-wrap {\n  max-width: 580px;\n  margin: 0 auto;\n}\n\n.connections-solved {\n  display: flex;\n  flex-direction: column;\n  gap: 6px;\n  margin-bottom: 1rem;\n}\n\n.conn-solved-row {\n  padding: 1rem;\n  text-align: center;\n  border-radius: 4px;\n  animation: slideDown 0.4s ease;\n}\n@keyframes slideDown {\n  from { opacity: 0; transform: translateY(-10px); }\n  to   { opacity: 1; transform: translateY(0); }\n}\n\n.conn-solved-row.red    { background: #c0392b; }\n.conn-solved-row.blue   { background: #2980b9; }\n.conn-solved-row.yellow { background: #d4a017; }\n.conn-solved-row.green  { background: #27ae60; }\n.conn-solved-row.purple { background: #8e44ad; }\n\n.conn-solved-label {\n  font-size: 0.6rem;\n  letter-spacing: 0.25em;\n  text-transform: uppercase;\n  color: rgba(255,255,255,0.8);\n  margin-bottom: 0.4rem;\n}\n.conn-solved-words {\n  font-family: var(--font-sans);\n  font-size: 0.85rem;\n  font-weight: 400;\n  letter-spacing: 0.1em;\n  color: #fff;\n}\n\n.connections-grid {\n  display: grid;\n  grid-template-columns: repeat(4, 1fr);\n  gap: 6px;\n  margin-bottom: 1.5rem;\n}\n\n.conn-word {\n  border: 1px solid var(--border);\n  padding: 1rem 0.5rem;\n  text-align: center;\n  cursor: pointer;\n  font-size: 0.75rem;\n  letter-spacing: 0.12em;\n  text-transform: uppercase;\n  color: var(--cream);\n  background: rgba(22,20,15,0.8);\n  transition: all 0.2s;\n  user-select: none;\n}\n.conn-word:hover { border-color: var(--gold-dim); background: rgba(200,169,110,0.08); }\n.conn-word.selected { border-color: var(--gold); background: rgba(200,169,110,0.15); color: var(--gold); }\n.conn-word.shake { animation: shake 0.4s ease; }\n@keyframes shake {\n  0%,100% { transform: translateX(0); }\n  20%      { transform: translateX(-6px); }\n  40%      { transform: translateX(6px); }\n  60%      { transform: translateX(-4px); }\n  80%      { transform: translateX(4px); }\n}\n\n.conn-controls {\n  display: flex;\n  gap: 1rem;\n  align-items: center;\n  margin-bottom: 1rem;\n}\n\n.conn-mistakes {\n  display: flex;\n  gap: 6px;\n  align-items: center;\n}\n\n.conn-dot {\n  width: 10px;\n  height: 10px;\n  border-radius: 50%;\n  background: var(--gold);\n  transition: background 0.3s;\n}\n.conn-dot.used { background: var(--border); }\n\n.conn-status {\n  font-size: 0.7rem;\n  letter-spacing: 0.1em;\n  color: var(--text-dim);\n}\n\n/* \u2500\u2500\u2500 CONTEXTO \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n.contexto-wrap {\n  display: flex;\n  flex-direction: column;\n  gap: 1.5rem;\n  max-width: 560px;\n  margin: 0 auto;\n}\n\n.ctx-input-row {\n  display: flex;\n  gap: 1rem;\n  align-items: flex-end;\n}\n\n.ctx-input {\n  flex: 1;\n  background: transparent;\n  border: none;\n  border-bottom: 1px solid var(--border);\n  color: var(--cream);\n  font-family: var(--font-sans);\n  font-size: 1rem;\n  font-weight: 300;\n  letter-spacing: 0.1em;\n  padding: 0.6rem 0.2rem;\n  outline: none;\n  text-transform: uppercase;\n  transition: border-color 0.3s;\n}\n.ctx-input:focus { border-bottom-color: var(--gold); }\n\n.ctx-guess-count {\n  font-size: 0.65rem;\n  letter-spacing: 0.2em;\n  color: var(--text-dim);\n  text-transform: uppercase;\n}\n\n.ctx-guess-list {\n  display: flex;\n  flex-direction: column;\n  gap: 6px;\n  max-height: 400px;\n  overflow-y: auto;\n}\n.ctx-guess-list::-webkit-scrollbar { width: 3px; }\n.ctx-guess-list::-webkit-scrollbar-thumb { background: var(--border); }\n\n.ctx-guess-item {\n  display: flex;\n  align-items: center;\n  gap: 1rem;\n  padding: 0.5rem 0.8rem;\n  border: 1px solid var(--border);\n  background: rgba(16,14,9,0.5);\n  animation: slideIn 0.3s ease;\n}\n@keyframes slideIn {\n  from { opacity: 0; transform: translateX(-10px); }\n  to   { opacity: 1; transform: translateX(0); }\n}\n\n.ctx-rank {\n  font-family: var(--font-serif);\n  font-size: 1.1rem;\n  font-weight: 600;\n  min-width: 48px;\n  text-align: right;\n}\n\n.ctx-word {\n  font-size: 0.8rem;\n  letter-spacing: 0.15em;\n  text-transform: uppercase;\n  color: var(--cream);\n  min-width: 100px;\n}\n\n.ctx-bar-wrap {\n  flex: 1;\n  height: 8px;\n  background: rgba(255,255,255,0.05);\n  border-radius: 2px;\n  overflow: hidden;\n}\n\n.ctx-bar {\n  height: 100%;\n  border-radius: 2px;\n  transition: width 0.6s ease;\n}\n\n.ctx-bar.rank-answer  { background: var(--gold); }\n.ctx-bar.rank-hot     { background: #27ae60; }\n.ctx-bar.rank-warm    { background: #f39c12; }\n.ctx-bar.rank-cool    { background: #e67e22; }\n.ctx-bar.rank-cold    { background: #c0392b; }\n.ctx-bar.rank-frozen  { background: #2c3e50; }\n\n.ctx-rank-label {\n  font-size: 0.65rem;\n  letter-spacing: 0.1em;\n  min-width: 60px;\n  text-align: right;\n}\n\n/* \u2500\u2500\u2500 CONNECT 4 \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n.c4-wrap {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  gap: 1.5rem;\n}\n\n.c4-status {\n  font-family: var(--font-serif);\n  font-size: 1.2rem;\n  color: var(--cream);\n  text-align: center;\n}\n\n.c4-board {\n  background: rgba(20,50,120,0.3);\n  border: 1px solid rgba(50,80,180,0.3);\n  padding: 8px;\n  display: flex;\n  flex-direction: column;\n  gap: 5px;\n}\n\n.c4-col-btns {\n  display: flex;\n  gap: 5px;\n  padding: 0 8px;\n  margin-bottom: 4px;\n}\n\n.c4-drop-btn {\n  width: 52px;\n  height: 24px;\n  background: transparent;\n  border: 1px solid transparent;\n  color: var(--gold-dim);\n  cursor: pointer;\n  font-size: 0.7rem;\n  transition: all 0.15s;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n}\n.c4-drop-btn:hover { color: var(--gold); border-color: var(--gold-dim); }\n\n.c4-row { display: flex; gap: 5px; }\n\n.c4-cell {\n  width: 52px;\n  height: 52px;\n  border-radius: 50%;\n  background: rgba(10,9,6,0.7);\n  border: 1px solid rgba(50,80,180,0.2);\n  transition: background 0.2s;\n}\n.c4-cell.red    { background: #c0392b; border-color: #c0392b; box-shadow: 0 0 12px rgba(192,57,43,0.4); }\n.c4-cell.yellow { background: #d4a017; border-color: #d4a017; box-shadow: 0 0 12px rgba(212,160,23,0.4); }\n\n/* \u2500\u2500\u2500 UNO \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n.uno-wrap {\n  display: flex;\n  flex-direction: column;\n  gap: 1.5rem;\n  max-width: 700px;\n  margin: 0 auto;\n}\n\n.uno-center {\n  display: flex;\n  gap: 2rem;\n  align-items: center;\n  justify-content: center;\n}\n\n.uno-pile {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  gap: 0.5rem;\n}\n\n.uno-pile-label {\n  font-size: 0.6rem;\n  letter-spacing: 0.2em;\n  text-transform: uppercase;\n  color: var(--text-dim);\n}\n\n.uno-card {\n  width: 70px;\n  height: 100px;\n  border-radius: 8px;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  font-family: var(--font-sans);\n  font-size: 1.3rem;\n  font-weight: 400;\n  cursor: pointer;\n  transition: transform 0.2s, box-shadow 0.2s;\n  position: relative;\n  overflow: hidden;\n  border: 2px solid transparent;\n  user-select: none;\n}\n\n.uno-card.red    { background: #c0392b; color: #fff; }\n.uno-card.blue   { background: #2980b9; color: #fff; }\n.uno-card.green  { background: #27ae60; color: #fff; }\n.uno-card.yellow { background: #d4a017; color: #000; }\n.uno-card.wild   { background: linear-gradient(135deg, #c0392b 25%, #2980b9 25% 50%, #27ae60 50% 75%, #d4a017 75%); color: #fff; }\n\n.uno-card:hover  { transform: translateY(-8px); box-shadow: 0 8px 24px rgba(0,0,0,0.5); }\n.uno-card.playable { border-color: rgba(255,255,255,0.6); }\n.uno-card.selected { transform: translateY(-12px); border-color: var(--gold); }\n.uno-card.back   { background: #1a2a4a; cursor: default; }\n.uno-card.back:hover { transform: none; }\n\n.uno-hand {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 8px;\n  justify-content: center;\n  padding: 1rem;\n  border: 1px solid var(--border);\n  min-height: 120px;\n  align-items: flex-end;\n}\n\n.hand-counts {\n  display: flex;\n  gap: 1rem;\n  flex-wrap: wrap;\n  justify-content: center;\n}\n\n.hand-count-item {\n  font-size: 0.7rem;\n  letter-spacing: 0.1em;\n  color: var(--text-dim);\n}\n\n.color-picker {\n  display: flex;\n  gap: 0.5rem;\n  padding: 1rem;\n  border: 1px solid var(--border);\n  background: rgba(16,14,9,0.8);\n  justify-content: center;\n}\n\n.color-btn {\n  width: 44px;\n  height: 44px;\n  border: 2px solid transparent;\n  cursor: pointer;\n  transition: transform 0.15s, border-color 0.15s;\n  border-radius: 50%;\n}\n.color-btn:hover  { transform: scale(1.15); }\n.color-btn.red    { background: #c0392b; }\n.color-btn.blue   { background: #2980b9; }\n.color-btn.green  { background: #27ae60; }\n.color-btn.yellow { background: #d4a017; }\n\n/* \u2500\u2500\u2500 Social Games \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n.social-wrap {\n  max-width: 600px;\n  margin: 0 auto;\n  display: flex;\n  flex-direction: column;\n  gap: 1.5rem;\n}\n\n.social-card {\n  border: 1px solid var(--border);\n  padding: 2rem;\n  background: rgba(16,14,9,0.5);\n}\n\n.social-question {\n  font-family: var(--font-serif);\n  font-size: 1.5rem;\n  font-weight: 300;\n  color: var(--cream);\n  line-height: 1.5;\n  margin-bottom: 1.5rem;\n}\n\n.social-options {\n  display: flex;\n  flex-direction: column;\n  gap: 0.75rem;\n}\n\n.social-option {\n  border: 1px solid var(--border);\n  padding: 1rem 1.2rem;\n  cursor: pointer;\n  font-size: 0.85rem;\n  color: var(--text);\n  background: transparent;\n  text-align: left;\n  transition: all 0.2s;\n  font-family: var(--font-sans);\n  font-weight: 300;\n  letter-spacing: 0.05em;\n}\n.social-option:hover { border-color: var(--gold-dim); color: var(--cream); }\n.social-option.voted { border-color: var(--gold); color: var(--gold); background: rgba(200,169,110,0.08); }\n.social-option.majority { border-color: var(--green); color: var(--green); background: rgba(39,174,96,0.08); }\n\n.social-textarea {\n  width: 100%;\n  background: transparent;\n  border: none;\n  border-bottom: 1px solid var(--border);\n  color: var(--cream);\n  font-family: var(--font-serif);\n  font-size: 1rem;\n  padding: 0.6rem 0.2rem;\n  outline: none;\n  resize: none;\n  transition: border-color 0.3s;\n  line-height: 1.6;\n}\n.social-textarea:focus { border-bottom-color: var(--gold); }\n\n.players-grid {\n  display: grid;\n  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));\n  gap: 0.5rem;\n}\n\n.player-tile {\n  border: 1px solid var(--border);\n  padding: 0.6rem;\n  text-align: center;\n  font-size: 0.7rem;\n  letter-spacing: 0.1em;\n  text-transform: uppercase;\n  color: var(--text-dim);\n}\n.player-tile.answered { border-color: var(--gold-dim); color: var(--cream); }\n\n.scoreboard {\n  display: flex;\n  flex-direction: column;\n  gap: 0.4rem;\n}\n\n.score-row {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  padding: 0.5rem 0.8rem;\n  border: 1px solid var(--border);\n  font-size: 0.8rem;\n}\n.score-name { color: var(--cream); letter-spacing: 0.05em; }\n.score-pts  { color: var(--gold); font-family: var(--font-serif); font-size: 1rem; }\n.score-row.winner { border-color: var(--gold); background: rgba(200,169,110,0.08); }\n\n/* \u2500\u2500\u2500 Two Truths \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n.tt-statement {\n  border: 1px solid var(--border);\n  padding: 1rem 1.2rem;\n  cursor: pointer;\n  transition: all 0.2s;\n  font-family: var(--font-serif);\n  font-size: 1rem;\n  color: var(--text);\n  display: flex;\n  align-items: center;\n  gap: 1rem;\n}\n.tt-statement:hover { border-color: var(--gold-dim); }\n.tt-statement.guessed { border-color: var(--gold); background: rgba(200,169,110,0.08); }\n.tt-statement.correct-lie { border-color: var(--green); background: rgba(39,174,96,0.1); }\n.tt-statement.wrong-lie { border-color: var(--red); background: rgba(192,57,43,0.1); }\n.tt-num {\n  font-size: 0.65rem;\n  color: var(--gold-dim);\n  letter-spacing: 0.1em;\n  min-width: 20px;\n}\n\n/* \u2500\u2500\u2500 Finish Screen \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n.finish-screen {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  justify-content: center;\n  gap: 1.5rem;\n  padding: 3rem;\n  text-align: center;\n}\n\n.finish-label {\n  font-size: 0.65rem;\n  letter-spacing: 0.3em;\n  text-transform: uppercase;\n  color: var(--gold-dim);\n}\n\n.finish-title {\n  font-family: var(--font-serif);\n  font-size: 3rem;\n  font-weight: 300;\n  color: var(--cream);\n}\n\n.finish-subtitle {\n  font-family: var(--font-serif);\n  font-style: italic;\n  color: var(--text-dim);\n  font-size: 1.1rem;\n}\n\n/* \u2500\u2500\u2500 Scrollbar \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n::-webkit-scrollbar { width: 4px; }\n::-webkit-scrollbar-track { background: transparent; }\n::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }\n</style>\n</head>\n<body>\n\n<!-- \u2500\u2500 Password Gate \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 -->\n<div id=\"gate\" class=\"screen active\">\n  <button id=\"secretAdminBtn\" tabindex=\"-1\" aria-hidden=\"true\" title=\"\"></button>\n\n  <!-- Colorful background blobs -->\n  <div class=\"gate-blob gate-blob-1\"></div>\n  <div class=\"gate-blob gate-blob-2\"></div>\n  <div class=\"gate-blob gate-blob-3\"></div>\n  <div class=\"gate-blob gate-blob-4\"></div>\n\n  <!-- Floating cards background -->\n  <div class=\"bg-cards\" id=\"bgCards\"></div>\n\n  <div class=\"gate-content\">\n    <div class=\"gate-icons\">\n      <span>\ud83c\udccf</span><span>\ud83c\udfb2</span><span>\ud83c\udfae</span><span>\ud83c\udfaf</span><span>\ud83c\udccf</span>\n    </div>\n    <div class=\"gate-eyebrow\">Let the games begin</div>\n    <h1 class=\"gate-title\">Goon Room</h1>\n    <p class=\"gate-sub\">gather your goons</p>\n    <div class=\"gate-divider\"></div>\n    <div class=\"gate-panel\">\n      <div class=\"gate-form\">\n        <input id=\"gatePass\" type=\"password\" placeholder=\"Enter password\" autocomplete=\"current-password\" class=\"cin-input\" />\n        <button id=\"gateBtn\" class=\"cin-btn\">Enter the Goon Room \u2192</button>\n      </div>\n      <div id=\"gateError\" class=\"cin-error\"></div>\n    </div>\n  </div>\n\n  <div class=\"gate-footer\">\n    <span>\u00a9 Goon Room</span>\n  </div>\n</div>\n\n<!-- \u2500\u2500 Admin Panel \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 -->\n<div id=\"adminScreen\" class=\"screen\">\n  <div class=\"gate-blob gate-blob-1\"></div>\n  <div class=\"gate-blob gate-blob-2\"></div>\n  <div class=\"admin-content\">\n    <button class=\"cin-back\" id=\"adminBackBtn\">\u2190 Return</button>\n    <div class=\"admin-card\">\n      <div class=\"gate-eyebrow\">Administrative</div>\n      <h2 class=\"admin-title\">Access Control</h2>\n      <p class=\"admin-desc\">Manage site entry credentials.</p>\n      <div class=\"admin-form\">\n        <div class=\"field-group\">\n          <label class=\"cin-label\">Admin Password</label>\n          <input id=\"adminPass\" type=\"password\" placeholder=\"\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\" autocomplete=\"off\" class=\"cin-input\" />\n        </div>\n        <div class=\"field-group\">\n          <label class=\"cin-label\">New Site Password</label>\n          <input id=\"newPass\" type=\"password\" placeholder=\"Minimum 4 characters\" autocomplete=\"new-password\" class=\"cin-input\" />\n        </div>\n        <button class=\"cin-btn\" id=\"changePassBtn\">Update Password</button>\n        <div id=\"adminMsg\" class=\"cin-msg\"></div>\n      </div>\n    </div>\n  </div>\n</div>\n\n<!-- \u2500\u2500 Login \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 -->\n<div id=\"login\" class=\"screen\">\n  <div class=\"gate-blob gate-blob-1\"></div>\n  <div class=\"gate-blob gate-blob-3\"></div>\n  <div class=\"gate-content\">\n    <div class=\"gate-icons\"><span>\u2728</span><span>\ud83c\udfae</span><span>\u2728</span></div>\n    <div class=\"gate-eyebrow\">Almost there</div>\n    <h1 class=\"gate-title\" style=\"font-size:clamp(2.5rem,6vw,5rem)\">Who are you?</h1>\n    <p class=\"gate-sub\">Choose your name</p>\n    <div class=\"gate-divider\"></div>\n    <div class=\"gate-panel\">\n      <div class=\"gate-form\">\n        <input id=\"usernameInput\" type=\"text\" placeholder=\"Your name\" maxlength=\"16\" autocomplete=\"off\" class=\"cin-input\" />\n        <button id=\"loginBtn\" class=\"cin-btn\">Join the Game \u2192</button>\n      </div>\n      <div id=\"loginError\" class=\"cin-error\"></div>\n    </div>\n  </div>\n</div>\n\n<!-- \u2500\u2500 Lobby \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 -->\n<div id=\"lobby\" class=\"screen\">\n  <header class=\"app-header\">\n    <div class=\"app-logo\">Goon Room</div>\n    <div class=\"user-chip\" id=\"userBadge\"></div>\n  </header>\n\n  <div class=\"lobby-layout\">\n    <div class=\"lobby-left\">\n      <div class=\"section-label\">Choose your game</div>\n      <div class=\"game-grid\" id=\"gameGrid\"></div>\n      <button id=\"createBtn\" class=\"cin-btn mt2\">Open a Room \u2192</button>\n    </div>\n\n    <div class=\"lobby-right\">\n      <div class=\"section-label\">\n        Open rooms\n        <button class=\"refresh-btn\" onclick=\"App.getLobbyList()\">\u21bb</button>\n      </div>\n      <div id=\"lobbyList\" class=\"room-list\"></div>\n    </div>\n  </div>\n</div>\n\n<!-- \u2500\u2500 Game Room \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 -->\n<div id=\"gameRoom\" class=\"screen\">\n  <header class=\"app-header\">\n    <div class=\"app-logo\">Goon Room</div>\n    <div class=\"room-title\" id=\"roomInfo\"></div>\n    <div class=\"hdr-right\">\n      <span class=\"user-chip\" id=\"userBadge2\"></span>\n      <button class=\"leave-btn\" onclick=\"App.leaveLobby()\">Leave</button>\n    </div>\n  </header>\n\n  <div class=\"room-layout\">\n    <aside class=\"sidebar\">\n      <div class=\"sidebar-section\">\n        <div class=\"section-label\">Players</div>\n        <ul id=\"playerList\" class=\"player-list\"></ul>\n        <button id=\"startBtn\" class=\"cin-btn mt1 hidden\">\u25b6 Start Game</button>\n      </div>\n      <div class=\"sidebar-section sidebar-chat\">\n        <div class=\"section-label\">Chat</div>\n        <div id=\"chatLog\" class=\"chat-log\"></div>\n        <div class=\"chat-row\">\n          <input id=\"chatInput\" placeholder=\"Say something\u2026\" maxlength=\"200\" class=\"chat-field\" />\n          <button id=\"chatSendBtn\" class=\"chat-send\">\u27a4</button>\n        </div>\n      </div>\n    </aside>\n\n    <main class=\"game-area\" id=\"gameArea\">\n      <div id=\"waitingMsg\" class=\"waiting-msg\">\n        <div class=\"waiting-icon\">\u25c8</div>\n        <h2>Waiting for guests\u2026</h2>\n        <p>Share your room code</p>\n        <div class=\"room-code\" id=\"lobbyCode\"></div>\n        <p class=\"room-hint\">The host starts when everyone is in.</p>\n      </div>\n      <div id=\"gameContainer\" class=\"hidden\"></div>\n    </main>\n  </div>\n</div>\n\n<script src=\"/socket.io/socket.io.js\"></script>\n\n<script>\n// \u2500\u2500\u2500 PASSWORD GATE + ADMIN \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n(function() {\n  const SITE_PASS_KEY  = 'goonroom_site_pass';\n  const ADMIN_PASS_KEY = 'goonroom_admin_pass';\n  const DEFAULT_SITE_PASS  = 'goonroom2025';\n  const DEFAULT_ADMIN_PASS = 'hostmaster';\n\n  function getSitePass()  { return localStorage.getItem(SITE_PASS_KEY)  || DEFAULT_SITE_PASS; }\n  function getAdminPass() { return localStorage.getItem(ADMIN_PASS_KEY) || DEFAULT_ADMIN_PASS; }\n\n  function showScreen(id) {\n    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));\n    document.getElementById(id).classList.add('active');\n  }\n  window.showScreen = showScreen;\n\n  // Gate\n  const gatePassInput = document.getElementById('gatePass');\n  const gateBtn       = document.getElementById('gateBtn');\n  const gateError     = document.getElementById('gateError');\n\n  function tryGate() {\n    if ((gatePassInput.value || '').trim() === getSitePass()) {\n      gateError.textContent = '';\n      showScreen('login');\n    } else {\n      gateError.textContent = 'Incorrect password \u2014 try again.';\n      gatePassInput.value = '';\n      gatePassInput.style.animation = 'none';\n      requestAnimationFrame(() => { gatePassInput.style.animation = 'shakeInput 0.4s ease'; });\n    }\n  }\n\n  gateBtn.addEventListener('click', tryGate);\n  gatePassInput.addEventListener('keydown', e => { if (e.key === 'Enter') tryGate(); });\n\n  // Secret admin button\n  document.getElementById('secretAdminBtn').addEventListener('click', () => showScreen('adminScreen'));\n  document.getElementById('adminBackBtn').addEventListener('click', () => showScreen('gate'));\n\n  document.getElementById('changePassBtn').addEventListener('click', () => {\n    const adminVal   = (document.getElementById('adminPass').value || '').trim();\n    const newPassVal = (document.getElementById('newPass').value  || '').trim();\n    const msgEl      = document.getElementById('adminMsg');\n    if (adminVal !== getAdminPass()) {\n      msgEl.className = 'cin-msg error'; msgEl.textContent = 'Wrong admin password.'; return;\n    }\n    if (newPassVal.length < 4) {\n      msgEl.className = 'cin-msg error'; msgEl.textContent = 'Min 4 characters.'; return;\n    }\n    localStorage.setItem(SITE_PASS_KEY, newPassVal);\n    msgEl.className = 'cin-msg success';\n    msgEl.textContent = `\u2713 Password updated to \"${newPassVal}\"`;\n    document.getElementById('adminPass').value = '';\n    document.getElementById('newPass').value   = '';\n  });\n\n  // Spawn floating bg cards\n  const bgCards = document.getElementById('bgCards');\n  const CARD_COLORS = ['red','blue','green','yellow','purple'];\n  const CARD_SYMBOLS = ['\ud83c\udca1','A','K','Q','J','7','UNO','\u2605','\u2660','\u2665','\u2666','\u2663'];\n  if (bgCards) {\n    for (let i = 0; i < 14; i++) {\n      const card = document.createElement('div');\n      const color = CARD_COLORS[i % CARD_COLORS.length];\n      card.className = `bg-card ${color}`;\n      card.textContent = CARD_SYMBOLS[i % CARD_SYMBOLS.length];\n      const leftPct   = 3 + Math.random() * 92;\n      const duration  = 12 + Math.random() * 16;\n      const delay     = -(Math.random() * duration);\n      const rotation  = (Math.random() - 0.5) * 40;\n      card.style.cssText = `left:${leftPct}%;animation-duration:${duration}s;animation-delay:${delay}s;transform:rotate(${rotation}deg)`;\n      bgCards.appendChild(card);\n    }\n  }\n\n  // Shake keyframe\n  const s = document.createElement('style');\n  s.textContent = `@keyframes shakeInput{0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-5px)}80%{transform:translateX(5px)}}`;\n  document.head.appendChild(s);\n})();\n</script>\n\n<script>\n// \u2500\u2500\u2500 UNO UI \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\nwindow.UnoUI = (() => {\n  let container, socket, myId;\n  let pendingWild = null;\n\n  function init(c, s, id) {\n    container = c; socket = s; myId = id;\n    render();\n    return { onState, onFinish, onError };\n  }\n\n  function render() {\n    container.innerHTML = `\n      <div class=\"uno-wrap\">\n        <div>\n          <div class=\"game-title\">UNO</div>\n          <div class=\"game-subtitle\" id=\"uno-status\">Game in progress\u2026</div>\n        </div>\n        <div id=\"uno-hand-counts\" class=\"hand-counts\"></div>\n        <div class=\"uno-center\">\n          <div class=\"uno-pile\">\n            <div class=\"uno-pile-label\">Discard</div>\n            <div id=\"uno-top\" class=\"uno-card back\">?</div>\n          </div>\n          <div class=\"uno-pile\">\n            <div class=\"uno-pile-label\">Draw pile</div>\n            <div id=\"uno-draw\" class=\"uno-card back\" style=\"cursor:pointer\">Draw</div>\n          </div>\n        </div>\n        <div id=\"uno-color-picker\" class=\"color-picker hidden\"></div>\n        <div class=\"uno-pile-label\" style=\"text-align:center;margin-top:1rem;\">Your Hand</div>\n        <div id=\"uno-hand\" class=\"uno-hand\"></div>\n        <div class=\"wordle-msg\" id=\"uno-msg\"></div>\n      </div>`;\n\n    document.getElementById('uno-draw').addEventListener('click', () => {\n      if (!isMyTurn()) return;\n      socket.emit('gameAction', { type: 'draw' });\n    });\n  }\n\n  let _currentPlayer = null;\n  function isMyTurn() { return _currentPlayer === myId; }\n\n  function onState(state) {\n    const { top, activeColor, currentPlayer, hand, handCounts } = state;\n    _currentPlayer = currentPlayer;\n\n    const status = document.getElementById('uno-status');\n    if (status) {\n      if (currentPlayer === myId) {\n        status.innerHTML = `<span style=\"color:var(--gold)\">Your turn!</span> Active color: <span style=\"color:${colorHex(activeColor)}\">${activeColor}</span>`;\n      } else {\n        status.textContent = `Waiting for other player\u2026 Active color: ${activeColor}`;\n      }\n    }\n\n    const topEl = document.getElementById('uno-top');\n    if (topEl && top) {\n      topEl.className = `uno-card ${top.color === 'wild' ? 'wild' : top.color}`;\n      topEl.textContent = fmtValue(top.value);\n    }\n\n    const hcEl = document.getElementById('uno-hand-counts');\n    if (hcEl) {\n      hcEl.innerHTML = Object.entries(handCounts || {}).map(([id, count]) =>\n        `<div class=\"hand-count-item\">${id === myId ? 'You' : 'Opp'}: ${count} cards</div>`\n      ).join('');\n    }\n\n    const handEl = document.getElementById('uno-hand');\n    if (handEl && hand) {\n      handEl.innerHTML = '';\n      hand.forEach((card, idx) => {\n        const div = document.createElement('div');\n        div.className = `uno-card ${card.color === 'wild' ? 'wild' : card.color}`;\n        div.textContent = fmtValue(card.value);\n        const playable = isMyTurn() && canPlay(card, top, activeColor);\n        if (playable) div.classList.add('playable');\n        div.addEventListener('click', () => {\n          if (!isMyTurn() || !playable) return;\n          if (card.value === 'wild' || card.value === 'wild4') {\n            pendingWild = idx; showColorPicker();\n          } else {\n            socket.emit('gameAction', { type: 'play', cardIdx: idx });\n          }\n        });\n        handEl.appendChild(div);\n      });\n    }\n  }\n\n  function canPlay(card, top, activeColor) {\n    if (card.value === 'wild' || card.value === 'wild4') return true;\n    return card.color === activeColor || card.value === top?.value;\n  }\n\n  function showColorPicker() {\n    const el = document.getElementById('uno-color-picker');\n    if (!el) return;\n    el.innerHTML = '';\n    el.classList.remove('hidden');\n    ['red','blue','green','yellow'].forEach(c => {\n      const btn = document.createElement('button');\n      btn.className = `color-btn ${c}`;\n      btn.addEventListener('click', () => {\n        el.classList.add('hidden');\n        socket.emit('gameAction', { type: 'play', cardIdx: pendingWild, chosenColor: c });\n        pendingWild = null;\n      });\n      el.appendChild(btn);\n    });\n  }\n\n  function fmtValue(v) {\n    if (v === 'skip') return '\u2298';\n    if (v === 'reverse') return '\u21ba';\n    if (v === 'draw2') return '+2';\n    if (v === 'wild4') return 'W+4';\n    if (v === 'wild') return 'W';\n    return v;\n  }\n\n  function colorHex(c) {\n    return { red:'#c0392b', blue:'#2980b9', green:'#27ae60', yellow:'#d4a017', wild:'#fff' }[c] || '#fff';\n  }\n\n  function onFinish(result) {\n    const s = document.getElementById('uno-status');\n    if (s) s.innerHTML = result.winner === myId\n      ? `<span style=\"color:var(--gold)\">\ud83c\udfc6 You win! +${(result.scores||{})[myId]||0} pts</span>`\n      : `Round over. ${result.winner ? 'Another player won.' : 'No winner.'}`;\n  }\n\n  function onError(msg) {\n    const el = document.getElementById('uno-msg');\n    if (el) { el.textContent = msg; setTimeout(() => { if(el) el.textContent=''; }, 2000); }\n  }\n\n  return { init };\n})();\n</script>\n\n<script>\n// \u2500\u2500\u2500 Would You Rather UI \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\nwindow.WouldYouRatherUI = (() => {\n  let container, socket, myId;\n\n  function init(c, s, id) {\n    container = c; socket = s; myId = id;\n    render();\n    return { onState, onFinish, onError };\n  }\n\n  function render() {\n    container.innerHTML = `\n      <div class=\"social-wrap\">\n        <div class=\"game-title\">Would You Rather</div>\n        <div id=\"wyr-content\"></div>\n        <div class=\"wordle-msg\" id=\"wyr-msg\"></div>\n      </div>`;\n  }\n\n  function onState(state) {\n    const el = document.getElementById('wyr-content');\n    if (!el) return;\n    if (state.phase === 'submit') {\n      if (state.hasSubmitted) {\n        el.innerHTML = `<div class=\"social-card\">\n          <div class=\"game-subtitle\">Your questions are submitted!</div>\n          <div style=\"font-family:var(--font-serif);font-style:italic;color:var(--text-dim);\">Waiting for everyone else\u2026</div>\n          ${renderPlayers(state)}\n        </div>`;\n      } else { renderSubmit(el, state); }\n    } else if (state.phase === 'vote') { renderVote(el, state); }\n    else if (state.phase === 'results') { renderResults(el, state); }\n  }\n\n  function renderSubmit(el, state) {\n    el.innerHTML = `<div class=\"social-card\">\n      <div class=\"game-subtitle\">Write 4 \"Would You Rather\" questions for the group.</div>\n      ${[0,1,2,3].map(i => `\n        <div style=\"margin-bottom:1.5rem;\">\n          <div class=\"cin-label\" style=\"margin-bottom:0.5rem;\">Question ${i+1}</div>\n          <input class=\"cin-input wyr-a\" data-q=\"${i}\" placeholder=\"Option A\u2026\" style=\"margin-bottom:0.5rem;text-align:left;\" />\n          <input class=\"cin-input wyr-b\" data-q=\"${i}\" placeholder=\"Option B\u2026\" style=\"text-align:left;\" />\n        </div>`).join('')}\n      <button class=\"game-btn\" id=\"wyr-submit-btn\">Submit Questions</button>\n    </div>`;\n\n    document.getElementById('wyr-submit-btn').addEventListener('click', () => {\n      const questions = [0,1,2,3].map(i => ({\n        optionA: el.querySelector(`.wyr-a[data-q=\"${i}\"]`).value.trim(),\n        optionB: el.querySelector(`.wyr-b[data-q=\"${i}\"]`).value.trim(),\n      }));\n      if (questions.some(q => !q.optionA || !q.optionB)) { showMsg('Fill in all options.'); return; }\n      socket.emit('gameAction', { type: 'submitQuestions', questions });\n    });\n  }\n\n  function renderVote(el, state) {\n    const q = state.question;\n    el.innerHTML = `<div class=\"social-card\">\n      <div class=\"game-subtitle\">Question ${state.currentQ + 1} of ${state.totalQ}</div>\n      <div class=\"social-question\">Would you rather\u2026</div>\n      <div class=\"social-options\">\n        <button class=\"social-option${state.myVote === 'A' ? ' voted' : ''}\" id=\"wyr-a\"><strong>A:</strong> ${q?.optionA || '\u2026'}</button>\n        <button class=\"social-option${state.myVote === 'B' ? ' voted' : ''}\" id=\"wyr-b\"><strong>B:</strong> ${q?.optionB || '\u2026'}</button>\n      </div>\n      ${state.myVote ? `<div style=\"margin-top:1rem;font-family:var(--font-serif);font-style:italic;color:var(--text-dim);\">Vote cast! Waiting for others\u2026</div>` : ''}\n    </div>\n    ${renderScoreboard(state)}`;\n\n    if (!state.myVote) {\n      document.getElementById('wyr-a')?.addEventListener('click', () => socket.emit('gameAction', { type: 'vote', choice: 'A' }));\n      document.getElementById('wyr-b')?.addEventListener('click', () => socket.emit('gameAction', { type: 'vote', choice: 'B' }));\n    }\n  }\n\n  function renderResults(el, state) {\n    const q = state.question;\n    const votes = state.votes || {};\n    const vA = Object.values(votes).filter(v => v === 'A').length;\n    const vB = Object.values(votes).filter(v => v === 'B').length;\n    const majority = vA > vB ? 'A' : vB > vA ? 'B' : null;\n    const isHost = (state.players || [])[0]?.id === myId;\n\n    el.innerHTML = `<div class=\"social-card\">\n      <div class=\"game-subtitle\">Results \u2014 Question ${state.currentQ + 1} of ${state.totalQ}</div>\n      <div class=\"social-question\">Would you rather\u2026</div>\n      <div class=\"social-options\">\n        <div class=\"social-option${majority === 'A' ? ' majority' : ''}\"><strong>A:</strong> ${q?.optionA || '\u2026'} <em style=\"float:right\">${vA} vote${vA!==1?'s':''}</em></div>\n        <div class=\"social-option${majority === 'B' ? ' majority' : ''}\"><strong>B:</strong> ${q?.optionB || '\u2026'} <em style=\"float:right\">${vB} vote${vB!==1?'s':''}</em></div>\n      </div>\n      ${isHost ? `<button class=\"game-btn\" id=\"wyr-next\" style=\"margin-top:1rem;\">Next \u2192</button>` : `<div style=\"font-family:var(--font-serif);font-style:italic;color:var(--text-dim);margin-top:1rem;\">Waiting for host\u2026</div>`}\n    </div>\n    ${renderScoreboard(state)}`;\n\n    if (isHost) document.getElementById('wyr-next')?.addEventListener('click', () => socket.emit('gameAction', { type: 'nextQuestion' }));\n  }\n\n  function renderScoreboard(state) {\n    const scores = state.scores || {};\n    const players = state.players || [];\n    const sorted = [...players].sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0));\n    return `<div class=\"scoreboard\">${sorted.map((p, i) => `\n      <div class=\"score-row${i === 0 ? ' winner' : ''}\">\n        <span class=\"score-name\">${p.name}</span>\n        <span class=\"score-pts\">${scores[p.id] || 0}</span>\n      </div>`).join('')}</div>`;\n  }\n\n  function renderPlayers(state) {\n    return `<div class=\"players-grid\" style=\"margin-top:1rem;\">${(state.players||[]).map(p =>\n      `<div class=\"player-tile${state.allSubmitted || p.id === myId ? ' answered' : ''}\">${p.name}</div>`\n    ).join('')}</div>`;\n  }\n\n  function onFinish(result) {\n    const el = document.getElementById('wyr-content');\n    if (el) el.innerHTML = `<div class=\"finish-screen\">\n      <div class=\"finish-label\">Game Over</div>\n      <div class=\"finish-title\">${result.winner ? 'Winner!' : 'Tie!'}</div>\n      <div class=\"finish-subtitle\">Next round starting soon\u2026</div>\n    </div>`;\n  }\n\n  function showMsg(text) {\n    const el = document.getElementById('wyr-msg');\n    if (el) { el.textContent = text; setTimeout(() => { if(el) el.textContent=''; }, 2500); }\n  }\n\n  function onError(msg) { showMsg(msg); }\n  return { init };\n})();\n</script>\n\n<script>\n// \u2500\u2500\u2500 Connect 4 UI \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\nwindow.Connect4UI = (() => {\n  let container, socket, myId;\n  let myColor = null;\n\n  function init(c, s, id) {\n    container = c; socket = s; myId = id;\n    render();\n    return { onState, onFinish, onError };\n  }\n\n  function render() {\n    container.innerHTML = `\n      <div class=\"c4-wrap\">\n        <div>\n          <div class=\"game-title\">Connect 4</div>\n          <div class=\"game-subtitle\" id=\"c4-status\">Waiting for game state\u2026</div>\n        </div>\n        <div id=\"c4-board-wrap\"></div>\n        <div class=\"wordle-msg\" id=\"c4-msg\"></div>\n      </div>`;\n  }\n\n  function onState(state) {\n    const { board, playerColors, current, winner, draw } = state;\n    myColor = playerColors?.[myId];\n    const isMyTurn = current === myId && !winner && !draw;\n\n    const status = document.getElementById('c4-status');\n    if (status) {\n      if (winner) {\n        status.textContent = winner === myId ? '\ud83c\udfc6 You win!' : 'You lose.';\n      } else if (draw) {\n        status.textContent = \"It's a draw!\";\n      } else {\n        const turnColor = playerColors?.[current];\n        status.innerHTML = isMyTurn\n          ? `<span style=\"color:var(--gold)\">Your turn</span> \u2014 you are <span style=\"color:${getColor(myColor)}\">${myColor}</span>`\n          : `<span style=\"color:${getColor(turnColor)}\">${turnColor}</span>'s turn\u2026`;\n      }\n    }\n\n    const wrap = document.getElementById('c4-board-wrap');\n    if (!wrap || !board) return;\n    const ROWS = board.length;\n    const COLS = board[0]?.length || 7;\n    wrap.innerHTML = '';\n\n    const btnRow = document.createElement('div');\n    btnRow.className = 'c4-col-btns';\n    for (let c = 0; c < COLS; c++) {\n      const btn = document.createElement('button');\n      btn.className = 'c4-drop-btn';\n      btn.textContent = '\u25bc';\n      btn.disabled = !isMyTurn;\n      btn.style.opacity = isMyTurn ? '1' : '0.2';\n      const col = c;\n      btn.addEventListener('click', () => socket.emit('gameAction', { type: 'drop', col }));\n      btnRow.appendChild(btn);\n    }\n\n    const boardEl = document.createElement('div');\n    boardEl.className = 'c4-board';\n    boardEl.appendChild(btnRow);\n\n    for (let r = 0; r < ROWS; r++) {\n      const rowEl = document.createElement('div');\n      rowEl.className = 'c4-row';\n      for (let c = 0; c < COLS; c++) {\n        const cell = document.createElement('div');\n        cell.className = 'c4-cell';\n        const occupant = board[r][c];\n        if (occupant) cell.classList.add(playerColors?.[occupant] || '');\n        rowEl.appendChild(cell);\n      }\n      boardEl.appendChild(rowEl);\n    }\n    wrap.appendChild(boardEl);\n  }\n\n  function getColor(name) {\n    return name === 'red' ? '#c0392b' : name === 'yellow' ? '#d4a017' : '#fff';\n  }\n\n  function onFinish(result) {\n    const s = document.getElementById('c4-status');\n    if (s) s.textContent = result.winner === myId ? '\ud83c\udfc6 You win!' : result.winner ? 'You lose.' : \"Draw!\";\n  }\n\n  function onError(msg) {\n    const el = document.getElementById('c4-msg');\n    if (el) { el.textContent = msg; setTimeout(() => { if(el) el.textContent=''; }, 2000); }\n  }\n\n  return { init };\n})();\n</script>\n\n<script>\n// \u2500\u2500\u2500 Two Truths & a Lie UI \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\nwindow.TwoTruthsUI = (() => {\n  let container, socket, myId;\n\n  function init(c, s, id) {\n    container = c; socket = s; myId = id;\n    render();\n    return { onState, onFinish, onError };\n  }\n\n  function render() {\n    container.innerHTML = `\n      <div class=\"social-wrap\">\n        <div class=\"game-title\">Two Truths & a Lie</div>\n        <div id=\"tt-content\"></div>\n        <div class=\"wordle-msg\" id=\"tt-msg\"></div>\n      </div>`;\n  }\n\n  function onState(state) {\n    const el = document.getElementById('tt-content');\n    if (!el) return;\n    if (state.phase === 'submit') {\n      if (state.hasSubmitted) {\n        el.innerHTML = `<div class=\"social-card\">\n          <div class=\"game-subtitle\">Submitted! Waiting for everyone else\u2026</div>\n          ${renderPlayers(state)}\n        </div>`;\n      } else { renderSubmit(el); }\n    } else if (state.phase === 'guess') { renderGuess(el, state); }\n    else if (state.phase === 'reveal') { renderReveal(el, state); }\n  }\n\n  function renderSubmit(el) {\n    el.innerHTML = `<div class=\"social-card\">\n      <div class=\"game-subtitle\">Write 2 truths and 1 lie about yourself. Mark which is the lie.</div>\n      ${[0,1,2].map(i => `\n        <div style=\"display:flex;align-items:center;gap:1rem;margin-bottom:1rem;\">\n          <input type=\"radio\" name=\"tt-lie\" value=\"${i}\" id=\"tt-lie-${i}\" style=\"accent-color:var(--gold);width:16px;height:16px;\">\n          <input class=\"cin-input tt-stmt\" data-idx=\"${i}\" placeholder=\"Statement ${i+1}\u2026\" style=\"text-align:left;\" />\n        </div>`).join('')}\n      <div style=\"font-size:0.7rem;letter-spacing:0.1em;color:var(--text-dim);margin-bottom:1rem;\">The radio button marks which is the lie.</div>\n      <button class=\"game-btn\" id=\"tt-submit-btn\">Submit</button>\n    </div>`;\n\n    document.getElementById('tt-submit-btn').addEventListener('click', () => {\n      const stmts = Array.from(el.querySelectorAll('.tt-stmt')).map(i => i.value.trim());\n      const lieRadio = el.querySelector('input[name=\"tt-lie\"]:checked');\n      if (stmts.some(s => !s)) { showMsg('Fill in all statements.'); return; }\n      if (!lieRadio) { showMsg('Mark which is the lie.'); return; }\n      socket.emit('gameAction', { type: 'submit', statements: stmts, lieIdx: parseInt(lieRadio.value) });\n    });\n  }\n\n  function renderGuess(el, state) {\n    const presenter = state.currentPresenter;\n    const isPresenting = presenter?.id === myId;\n    el.innerHTML = `<div class=\"social-card\">\n      <div class=\"game-subtitle\">Whose lie can you spot?</div>\n      <div class=\"social-question\" style=\"font-size:1.1rem;margin-bottom:1rem;\">${presenter?.name || '?'} says\u2026</div>\n      <div class=\"social-options\" id=\"tt-stmts\">\n        ${(state.statements || []).map((s, i) => `\n          <div class=\"tt-statement${state.myGuess === i ? ' guessed' : ''}\" data-idx=\"${i}\">\n            <span class=\"tt-num\">${i+1}</span> ${s}\n          </div>`).join('')}\n      </div>\n      ${isPresenting ? '<div style=\"margin-top:1rem;font-family:var(--font-serif);font-style:italic;color:var(--text-dim);\">You are presenting!</div>' : ''}\n      ${state.myGuess !== null && !isPresenting ? '<div style=\"margin-top:1rem;font-family:var(--font-serif);font-style:italic;color:var(--text-dim);\">Guess locked in! Waiting for others\u2026</div>' : ''}\n    </div>\n    ${renderScoreboard(state)}`;\n\n    if (!isPresenting && state.myGuess === null) {\n      el.querySelectorAll('.tt-statement').forEach(div => {\n        div.addEventListener('click', () => socket.emit('gameAction', { type: 'guess', guessIdx: parseInt(div.dataset.idx) }));\n      });\n    }\n  }\n\n  function renderReveal(el, state) {\n    const presenter = state.currentPresenter;\n    const lieIdx = state.lieIdx;\n    const isHost = (state.players || [])[0]?.id === myId;\n    el.innerHTML = `<div class=\"social-card\">\n      <div class=\"game-subtitle\">Reveal! The lie was\u2026</div>\n      <div class=\"social-question\" style=\"font-size:1.1rem;margin-bottom:1rem;\">${presenter?.name || '?'}'s statements:</div>\n      <div class=\"social-options\">\n        ${(state.statements || []).map((s, i) => `\n          <div class=\"tt-statement ${i === lieIdx ? 'wrong-lie' : 'correct-lie'}\">\n            <span class=\"tt-num\">${i === lieIdx ? '\ud83e\udd25' : '\u2713'}</span> ${s}\n          </div>`).join('')}\n      </div>\n      ${renderGuessResults(state)}\n      ${isHost ? `<button class=\"game-btn\" id=\"tt-next\" style=\"margin-top:1rem;\">Next \u2192</button>` : '<div style=\"font-family:var(--font-serif);font-style:italic;color:var(--text-dim);margin-top:1rem;\">Waiting for host\u2026</div>'}\n    </div>\n    ${renderScoreboard(state)}`;\n\n    if (isHost) document.getElementById('tt-next')?.addEventListener('click', () => socket.emit('gameAction', { type: 'next' }));\n  }\n\n  function renderGuessResults(state) {\n    const guesses = state.guesses || {};\n    const players = state.players || [];\n    const presenter = state.currentPresenter;\n    const lieIdx = state.lieIdx;\n    const nonPresenters = players.filter(p => p.id !== presenter?.id);\n    return `<div style=\"margin-top:1rem;font-size:0.8rem;\">\n      ${nonPresenters.map(p => {\n        const g = guesses[p.id];\n        const correct = g === lieIdx;\n        return `<div style=\"color:${correct ? '#27ae60' : '#c0392b'};margin:0.2rem 0;\">${p.name}: ${correct ? '\u2713 Correct!' : '\u2717 Fooled!'}</div>`;\n      }).join('')}\n    </div>`;\n  }\n\n  function renderScoreboard(state) {\n    const scores = state.scores || {};\n    const players = state.players || [];\n    const sorted = [...players].sort((a, b) => (scores[b.id]||0)-(scores[a.id]||0));\n    return `<div class=\"scoreboard\">${sorted.map((p, i) => `\n      <div class=\"score-row${i===0?' winner':''}\">\n        <span class=\"score-name\">${p.name}</span>\n        <span class=\"score-pts\">${scores[p.id]||0}</span>\n      </div>`).join('')}</div>`;\n  }\n\n  function renderPlayers(state) {\n    return `<div class=\"players-grid\" style=\"margin-top:1rem;\">${(state.players||[]).map(p =>\n      `<div class=\"player-tile${state.hasSubmitted ? ' answered' : ''}\">${p.name}</div>`\n    ).join('')}</div>`;\n  }\n\n  function onFinish(result) {\n    const el = document.getElementById('tt-content');\n    if (el) el.innerHTML = `<div class=\"finish-screen\"><div class=\"finish-label\">Game Over</div><div class=\"finish-title\">Round complete!</div></div>`;\n  }\n\n  function showMsg(text) {\n    const el = document.getElementById('tt-msg');\n    if (el) { el.textContent = text; setTimeout(() => { if(el) el.textContent=''; }, 2500); }\n  }\n\n  function onError(msg) { showMsg(msg); }\n  return { init };\n})();\n</script>\n\n<script>\n// \u2500\u2500\u2500 Never Have I Ever UI \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\nwindow.NeverHaveIEverUI = (() => {\n  let container, socket, myId;\n\n  function init(c, s, id) {\n    container = c; socket = s; myId = id;\n    render();\n    return { onState, onFinish, onError };\n  }\n\n  function render() {\n    container.innerHTML = `\n      <div class=\"social-wrap\">\n        <div class=\"game-title\">Never Have I Ever</div>\n        <div id=\"nhie-content\"></div>\n        <div class=\"wordle-msg\" id=\"nhie-msg\"></div>\n      </div>`;\n  }\n\n  function onState(state) {\n    const el = document.getElementById('nhie-content');\n    if (!el) return;\n    if (state.phase === 'submit') {\n      if (state.hasSubmitted) {\n        el.innerHTML = `<div class=\"social-card\">\n          <div class=\"game-subtitle\">Submitted! Waiting for everyone\u2026</div>\n          ${renderPlayers(state)}\n        </div>`;\n      } else { renderSubmit(el); }\n    } else if (state.phase === 'play') { renderPlay(el, state); }\n    else if (state.phase === 'reveal') { renderReveal(el, state); }\n  }\n\n  function renderSubmit(el) {\n    el.innerHTML = `<div class=\"social-card\">\n      <div class=\"game-subtitle\">Write 4 \"Never Have I Ever\u2026\" statements.</div>\n      ${[0,1,2,3].map(i => `\n        <div style=\"margin-bottom:1rem;\">\n          <input class=\"cin-input nhie-q\" data-idx=\"${i}\" placeholder=\"Never have I ever\u2026\" style=\"text-align:left;\" />\n        </div>`).join('')}\n      <button class=\"game-btn\" id=\"nhie-submit-btn\">Submit</button>\n    </div>`;\n\n    document.getElementById('nhie-submit-btn').addEventListener('click', () => {\n      const questions = Array.from(el.querySelectorAll('.nhie-q')).map(i => i.value.trim());\n      if (questions.some(q => !q)) { showMsg('Fill in all statements.'); return; }\n      socket.emit('gameAction', { type: 'submitQuestions', questions });\n    });\n  }\n\n  function renderPlay(el, state) {\n    const q = state.question;\n    el.innerHTML = `<div class=\"social-card\">\n      <div class=\"game-subtitle\">Statement ${state.currentQ + 1} of ${state.totalQ}</div>\n      <div class=\"social-question\">Never have I ever\u2026<br><strong>${q?.text || '\u2026'}</strong></div>\n      <div class=\"social-options\" style=\"flex-direction:row;justify-content:center;gap:1rem;margin-top:1.5rem;\">\n        ${state.myAnswer !== null\n          ? `<div style=\"font-family:var(--font-serif);font-style:italic;color:var(--text-dim);\">Answer submitted! Waiting for others\u2026</div>`\n          : `<button class=\"social-option\" id=\"nhie-have\" style=\"max-width:180px;text-align:center;\">\n              <div style=\"font-size:1.5rem;margin-bottom:0.4rem;\">\u270b</div>I Have\n            </button>\n            <button class=\"social-option\" id=\"nhie-havent\" style=\"max-width:180px;text-align:center;\">\n              <div style=\"font-size:1.5rem;margin-bottom:0.4rem;\">\ud83d\ude45</div>I Have Not\n            </button>`}\n      </div>\n      ${renderWaiting(state)}\n    </div>\n    ${renderScoreboard(state)}`;\n\n    document.getElementById('nhie-have')?.addEventListener('click', () => socket.emit('gameAction', { type: 'answer', haveI: true }));\n    document.getElementById('nhie-havent')?.addEventListener('click', () => socket.emit('gameAction', { type: 'answer', haveI: false }));\n  }\n\n  function renderReveal(el, state) {\n    const q = state.question;\n    const answers = state.answers || {};\n    const isHost = (state.players || [])[0]?.id === myId;\n    const players = state.players || [];\n\n    el.innerHTML = `<div class=\"social-card\">\n      <div class=\"game-subtitle\">Reveal!</div>\n      <div class=\"social-question\">Never have I ever\u2026<br><strong>${q?.text || '\u2026'}</strong></div>\n      <div class=\"players-grid\" style=\"margin-top:1.5rem;\">\n        ${players.map(p => {\n          const had = answers[p.id];\n          return `<div class=\"player-tile answered\" style=\"border-color:${had ? '#27ae60' : '#c0392b'};color:${had ? '#27ae60' : '#c0392b'}\">\n            ${p.name}<br><span style=\"font-size:1.2rem\">${had ? '\u270b' : '\ud83d\ude45'}</span>\n          </div>`;\n        }).join('')}\n      </div>\n      ${isHost ? `<button class=\"game-btn\" id=\"nhie-next\" style=\"margin-top:1rem;\">Next \u2192</button>` : '<div style=\"font-family:var(--font-serif);font-style:italic;color:var(--text-dim);margin-top:1rem;\">Waiting for host\u2026</div>'}\n    </div>\n    ${renderScoreboard(state)}`;\n\n    if (isHost) document.getElementById('nhie-next')?.addEventListener('click', () => socket.emit('gameAction', { type: 'next' }));\n  }\n\n  function renderWaiting(state) {\n    if (state.myAnswer === null) return '';\n    const answered = (state.players || []).filter(p => state.answers?.[p.id] !== undefined).length;\n    const total = (state.players || []).length;\n    return `<div style=\"margin-top:1rem;font-size:0.7rem;letter-spacing:0.1em;color:var(--text-dim);text-align:center;\">${answered}/${total} answered</div>`;\n  }\n\n  function renderScoreboard(state) {\n    const scores = state.scores || {};\n    const players = state.players || [];\n    const sorted = [...players].sort((a, b) => (scores[b.id]||0)-(scores[a.id]||0));\n    return `<div class=\"scoreboard\">${sorted.map((p, i) => `\n      <div class=\"score-row${i===0?' winner':''}\">\n        <span class=\"score-name\">${p.name}</span>\n        <span class=\"score-pts\">${scores[p.id]||0}</span>\n      </div>`).join('')}</div>`;\n  }\n\n  function renderPlayers(state) {\n    return `<div class=\"players-grid\" style=\"margin-top:1rem;\">${(state.players||[]).map(p =>\n      `<div class=\"player-tile answered\">${p.name}</div>`\n    ).join('')}</div>`;\n  }\n\n  function onFinish(result) {\n    const el = document.getElementById('nhie-content');\n    if (el) el.innerHTML = `<div class=\"finish-screen\"><div class=\"finish-label\">Game Over</div><div class=\"finish-title\">Round complete!</div></div>`;\n  }\n\n  function showMsg(text) {\n    const el = document.getElementById('nhie-msg');\n    if (el) { el.textContent = text; setTimeout(() => { if(el) el.textContent=''; }, 2500); }\n  }\n\n  function onError(msg) { showMsg(msg); }\n  return { init };\n})();\n</script>\n\n<script>\n// \u2500\u2500\u2500 Wordle Client UI \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\nwindow.WordleUI = (() => {\n  let container, socket, myId;\n  let currentGuess = '';\n  let gameOver = false;\n  let keyStates = {}; // letter -> 'correct'|'present'|'absent'\n\n  const MAX_GUESSES = 6;\n  const WORD_LENGTH = 5;\n\n  const KEYBOARD_ROWS = [\n    ['Q','W','E','R','T','Y','U','I','O','P'],\n    ['A','S','D','F','G','H','J','K','L'],\n    ['ENTER','Z','X','C','V','B','N','M','\u232b'],\n  ];\n\n  function init(c, s, id) {\n    container = c; socket = s; myId = id;\n    render();\n    bindKeys();\n    return { onState, onFinish, onError };\n  }\n\n  function render() {\n    container.innerHTML = `\n      <div class=\"wordle-wrap\">\n        <div style=\"text-align:center;\">\n          <div class=\"game-title\">Wordle</div>\n          <div class=\"game-subtitle\" id=\"wl-subtitle\">Guess the 5-letter word in 6 tries.</div>\n        </div>\n        <div class=\"wordle-board\" id=\"wl-board\"></div>\n        <div class=\"wordle-msg\" id=\"wl-msg\"></div>\n        <div class=\"wordle-progress\" id=\"wl-progress\"></div>\n        <div class=\"wordle-keyboard\" id=\"wl-keyboard\"></div>\n      </div>`;\n\n    renderBoard([], []);\n    renderKeyboard();\n  }\n\n  function renderBoard(guesses, results) {\n    const boardEl = document.getElementById('wl-board');\n    if (!boardEl) return;\n    boardEl.innerHTML = '';\n\n    for (let r = 0; r < MAX_GUESSES; r++) {\n      const rowEl = document.createElement('div');\n      rowEl.className = 'wordle-row';\n      rowEl.id = `wl-row-${r}`;\n\n      for (let c = 0; c < WORD_LENGTH; c++) {\n        const cell = document.createElement('div');\n        cell.className = 'wordle-cell';\n        cell.id = `wl-cell-${r}-${c}`;\n\n        if (r < guesses.length) {\n          const letter = guesses[r][c] || '';\n          const result = results[r]?.[c] || 'absent';\n          cell.textContent = letter;\n          cell.classList.add('filled', result);\n          cell.style.animationDelay = `${c * 80}ms`;\n          cell.classList.add('reveal');\n        }\n        rowEl.appendChild(cell);\n      }\n      boardEl.appendChild(rowEl);\n    }\n\n    // Render current in-progress guess on the next empty row\n    if (!gameOver && guesses.length < MAX_GUESSES) {\n      updateCurrentRow(guesses.length);\n    }\n  }\n\n  function updateCurrentRow(rowIdx) {\n    for (let c = 0; c < WORD_LENGTH; c++) {\n      const cell = document.getElementById(`wl-cell-${rowIdx}-${c}`);\n      if (!cell) continue;\n      const letter = currentGuess[c] || '';\n      cell.textContent = letter;\n      if (letter) {\n        cell.classList.add('filled');\n      } else {\n        cell.classList.remove('filled');\n      }\n    }\n  }\n\n  function renderKeyboard() {\n    const kbEl = document.getElementById('wl-keyboard');\n    if (!kbEl) return;\n    kbEl.innerHTML = '';\n\n    KEYBOARD_ROWS.forEach(row => {\n      const rowEl = document.createElement('div');\n      rowEl.className = 'wordle-kb-row';\n      row.forEach(key => {\n        const btn = document.createElement('button');\n        btn.className = 'wordle-key' + (key.length > 1 ? ' wide' : '');\n        btn.textContent = key;\n        btn.dataset.key = key;\n\n        const state = keyStates[key];\n        if (state) btn.classList.add(state);\n\n        btn.addEventListener('click', () => handleKey(key));\n        rowEl.appendChild(btn);\n      });\n      kbEl.appendChild(rowEl);\n    });\n  }\n\n  function bindKeys() {\n    const handler = (e) => {\n      if (gameOver) return;\n      const k = e.key.toUpperCase();\n      if (k === 'ENTER') handleKey('ENTER');\n      else if (k === 'BACKSPACE') handleKey('\u232b');\n      else if (/^[A-Z]$/.test(k)) handleKey(k);\n    };\n    document.addEventListener('keydown', handler);\n    // Store reference so we can clean up if needed\n    container._keyHandler = handler;\n  }\n\n  function handleKey(key) {\n    if (gameOver) return;\n    if (key === 'ENTER') {\n      if (currentGuess.length !== WORD_LENGTH) {\n        flashMsg('Not enough letters');\n        return;\n      }\n      socket.emit('gameAction', { type: 'guess', word: currentGuess });\n      currentGuess = '';\n    } else if (key === '\u232b') {\n      currentGuess = currentGuess.slice(0, -1);\n      // Re-render current row (need guesses length from state)\n      const rows = document.querySelectorAll('.wordle-row');\n      // Find first row with no result class\n      let currentRowIdx = 0;\n      rows.forEach((row, i) => {\n        const firstCell = row.querySelector('.wordle-cell');\n        if (firstCell && (firstCell.classList.contains('correct') || firstCell.classList.contains('absent') || firstCell.classList.contains('present'))) {\n          currentRowIdx = i + 1;\n        }\n      });\n      updateCurrentRow(currentRowIdx);\n    } else if (/^[A-Z]$/.test(key)) {\n      if (currentGuess.length < WORD_LENGTH) {\n        currentGuess += key;\n        const rows = document.querySelectorAll('.wordle-row');\n        let currentRowIdx = 0;\n        rows.forEach((row, i) => {\n          const firstCell = row.querySelector('.wordle-cell');\n          if (firstCell && (firstCell.classList.contains('correct') || firstCell.classList.contains('absent') || firstCell.classList.contains('present'))) {\n            currentRowIdx = i + 1;\n          }\n        });\n        updateCurrentRow(currentRowIdx);\n      }\n    }\n  }\n\n  function onState(state) {\n    const { board, progress, players, finished } = state;\n    if (!board) return;\n\n    const { guesses, results, solved, attempts } = board;\n\n    // Update key states from all guesses so far\n    guesses.forEach((guess, ri) => {\n      const res = results[ri] || [];\n      guess.split('').forEach((letter, ci) => {\n        const r = res[ci];\n        if (!r) return;\n        const current = keyStates[letter];\n        // Priority: correct > present > absent\n        if (current === 'correct') return;\n        if (r === 'correct') keyStates[letter] = 'correct';\n        else if (r === 'present' && current !== 'correct') keyStates[letter] = 'present';\n        else if (!current) keyStates[letter] = 'absent';\n      });\n    });\n\n    renderBoard(guesses.map(g => g.split('')), results);\n    renderKeyboard();\n\n    // Subtitle / status\n    const sub = document.getElementById('wl-subtitle');\n    if (sub) {\n      if (solved) {\n        sub.innerHTML = `<span style=\"color:var(--gold)\">Solved in ${attempts} guess${attempts !== 1 ? 'es' : ''}! \ud83c\udf89</span>`;\n        gameOver = true;\n      } else if (attempts >= MAX_GUESSES) {\n        sub.textContent = 'No more guesses.';\n        gameOver = true;\n      } else {\n        sub.textContent = `${attempts} of ${MAX_GUESSES} guesses used`;\n      }\n    }\n\n    // Progress from other players\n    if (progress && players) {\n      const progEl = document.getElementById('wl-progress');\n      if (progEl) {\n        const lines = players.map(p => {\n          const pInfo = progress[p.id];\n          if (!pInfo) return null;\n          const icon = pInfo.solved ? '\u2713' : pInfo.attempts >= MAX_GUESSES ? '\u2717' : `${pInfo.attempts}/${MAX_GUESSES}`;\n          return `<span>${p.name}: ${icon}</span>`;\n        }).filter(Boolean);\n        progEl.innerHTML = lines.join('');\n      }\n    }\n\n    if (finished) gameOver = true;\n  }\n\n  function onFinish(result) {\n    gameOver = true;\n    const sub = document.getElementById('wl-subtitle');\n    if (sub) {\n      if (result.winner === myId) {\n        sub.innerHTML = `<span style=\"color:var(--gold)\">\ud83c\udfc6 You win!</span>`;\n      } else if (result.winner) {\n        sub.textContent = 'Game over.';\n      }\n      if (result.answer) {\n        const msg = document.getElementById('wl-msg');\n        if (msg) msg.innerHTML = `The word was <strong style=\"color:var(--cream)\">${result.answer}</strong>`;\n      }\n    }\n  }\n\n  function onError(msg) {\n    flashMsg(msg);\n    // Shake current row\n    const rows = document.querySelectorAll('.wordle-row');\n    let currentRowEl = null;\n    rows.forEach((row) => {\n      const firstCell = row.querySelector('.wordle-cell');\n      if (firstCell && !firstCell.classList.contains('correct') && !firstCell.classList.contains('absent') && !firstCell.classList.contains('present') && firstCell.textContent) {\n        currentRowEl = row;\n      }\n    });\n    if (currentRowEl) {\n      currentRowEl.style.animation = 'shake 0.4s ease';\n      setTimeout(() => { if (currentRowEl) currentRowEl.style.animation = ''; }, 500);\n    }\n  }\n\n  function flashMsg(text) {\n    const el = document.getElementById('wl-msg');\n    if (!el) return;\n    el.textContent = text;\n    setTimeout(() => { if (el) el.textContent = ''; }, 2000);\n  }\n\n  return { init };\n})();\n</script>\n\n<script>\n// \u2500\u2500\u2500 Connections UI \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\nwindow.ConnectionsUI = (() => {\n  let container, socket, myId;\n  let selectedWords = [];\n  let availableWords = [];\n  let mistakes = 0;\n  let maxMistakes = 4;\n  let solved = [];\n  let gameOver = false;\n\n  function init(c, s, id) {\n    container = c; socket = s; myId = id;\n    render();\n    return { onState, onFinish, onError };\n  }\n\n  function render() {\n    container.innerHTML = `\n      <div class=\"connections-wrap\">\n        <div class=\"game-title\">Connections</div>\n        <div class=\"game-subtitle\">Find four groups of four related words.</div>\n        <div id=\"conn-solved\" class=\"connections-solved\"></div>\n        <div id=\"conn-grid\" class=\"connections-grid\"></div>\n        <div class=\"conn-controls\">\n          <div class=\"conn-mistakes\">\n            ${Array(4).fill(0).map((_, i) => `<div class=\"conn-dot\" id=\"conn-dot-${i}\"></div>`).join('')}\n            <span class=\"conn-status\" id=\"conn-mistake-label\">Mistakes remaining: 4</span>\n          </div>\n          <button class=\"game-btn game-btn-sm\" id=\"conn-submit\">Submit</button>\n          <button class=\"game-btn game-btn-sm\" id=\"conn-deselect\" style=\"border-color:var(--border);color:var(--text-dim)\">Deselect All</button>\n        </div>\n        <div class=\"wordle-msg\" id=\"conn-msg\"></div>\n        <div id=\"conn-progress\" style=\"font-size:0.7rem;letter-spacing:0.1em;color:var(--text-dim);margin-top:0.5rem;\"></div>\n      </div>`;\n\n    document.getElementById('conn-submit').addEventListener('click', submitGuess);\n    document.getElementById('conn-deselect').addEventListener('click', () => {\n      selectedWords = [];\n      renderGrid();\n    });\n  }\n\n  function onState(state) {\n    availableWords = state.words || [];\n    solved         = state.solved || [];\n    mistakes       = state.mistakes || 0;\n    maxMistakes    = state.maxMistakes || 4;\n\n    renderSolved();\n    renderGrid();\n    renderMistakes();\n\n    const prog = state.progress || {};\n    const lines = Object.entries(prog).map(([id, p]) => {\n      const player = (state.players || []).find(pl => pl.id === id);\n      return `${player?.name || id}: ${p.solved}/4`;\n    });\n    const el = document.getElementById('conn-progress');\n    if (el) el.textContent = lines.join(' \u00b7 ');\n  }\n\n  function renderSolved() {\n    const el = document.getElementById('conn-solved');\n    if (!el) return;\n    el.innerHTML = '';\n    solved.forEach(group => {\n      const row = document.createElement('div');\n      row.className = `conn-solved-row ${group.color}`;\n      row.innerHTML = `<div class=\"conn-solved-label\">${group.name}</div>\n        <div class=\"conn-solved-words\">${group.words.join('  \u00b7  ')}</div>`;\n      el.appendChild(row);\n    });\n  }\n\n  function renderGrid() {\n    const el = document.getElementById('conn-grid');\n    if (!el || gameOver) return;\n    el.innerHTML = '';\n    availableWords.forEach(word => {\n      const cell = document.createElement('div');\n      cell.className = 'conn-word' + (selectedWords.includes(word) ? ' selected' : '');\n      cell.textContent = word;\n      cell.addEventListener('click', () => toggleWord(word, cell));\n      el.appendChild(cell);\n    });\n  }\n\n  function toggleWord(word, el) {\n    if (gameOver) return;\n    if (selectedWords.includes(word)) {\n      selectedWords = selectedWords.filter(w => w !== word);\n      el.classList.remove('selected');\n    } else {\n      if (selectedWords.length >= 4) return;\n      selectedWords.push(word);\n      el.classList.add('selected');\n    }\n  }\n\n  function submitGuess() {\n    if (gameOver) return;\n    if (selectedWords.length !== 4) { flashMsg('Select exactly 4 words.'); return; }\n    socket.emit('gameAction', { type: 'guess', words: [...selectedWords] });\n    selectedWords = [];\n  }\n\n  function renderMistakes() {\n    const remaining = maxMistakes - mistakes;\n    for (let i = 0; i < maxMistakes; i++) {\n      const dot = document.getElementById(`conn-dot-${i}`);\n      if (dot) dot.classList.toggle('used', i >= remaining);\n    }\n    const label = document.getElementById('conn-mistake-label');\n    if (label) label.textContent = `Mistakes remaining: ${remaining}`;\n  }\n\n  function onFinish(result) {\n    gameOver = true;\n    const container2 = container.querySelector('#conn-msg');\n    const won = result.winner === myId;\n    if (container2) {\n      container2.innerHTML = `<div style=\"margin-top:1rem;\">\n        <div class=\"finish-label\">${won ? 'Well done!' : 'Round Over'}</div>\n        <div style=\"font-family:var(--font-serif);font-size:1.4rem;color:var(--cream);margin-top:0.5rem;\">\n          ${result.winner ? `Winner: ${result.winner}` : 'No winner this round.'}\n        </div>\n      </div>`;\n    }\n    const ctrl = document.getElementById('conn-submit');\n    if (ctrl) ctrl.disabled = true;\n  }\n\n  function onError(msg) {\n    flashMsg(msg);\n    const cells = document.querySelectorAll('.conn-word.selected');\n    cells.forEach(c => {\n      c.classList.add('shake');\n      setTimeout(() => c.classList.remove('shake'), 500);\n    });\n  }\n\n  function flashMsg(text) {\n    const el = document.getElementById('conn-msg');\n    if (!el) return;\n    el.textContent = text;\n    setTimeout(() => { if (el) el.textContent = ''; }, 2500);\n  }\n\n  return { init };\n})();\n</script>\n\n<script>\n// \u2500\u2500\u2500 Contexto UI \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\nwindow.ContextoUI = (() => {\n  let container, socket, myId;\n  let guesses = [];\n  let solved = false;\n  let gameOver = false;\n\n  function init(c, s, id) {\n    container = c; socket = s; myId = id;\n    render();\n    return { onState, onFinish, onError };\n  }\n\n  function render() {\n    container.innerHTML = `\n      <div class=\"contexto-wrap\">\n        <div>\n          <div class=\"game-title\">Contexto</div>\n          <div class=\"game-subtitle\">Find the secret word. Closer words score lower ranks.</div>\n        </div>\n        <div class=\"ctx-input-row\">\n          <input id=\"ctx-input\" class=\"ctx-input\" type=\"text\" placeholder=\"TYPE A WORD\u2026\" maxlength=\"30\" autocomplete=\"off\" />\n          <button class=\"game-btn\" id=\"ctx-guess-btn\">Guess</button>\n          <button class=\"game-btn game-btn-sm\" id=\"ctx-giveup-btn\" style=\"border-color:var(--border);color:var(--text-dim)\">Give Up</button>\n        </div>\n        <div class=\"ctx-guess-count\" id=\"ctx-count\">0 guesses</div>\n        <div class=\"wordle-msg\" id=\"ctx-msg\"></div>\n        <div class=\"ctx-guess-list\" id=\"ctx-list\"></div>\n      </div>`;\n\n    const input = document.getElementById('ctx-input');\n    document.getElementById('ctx-guess-btn').addEventListener('click', submitGuess);\n    document.getElementById('ctx-giveup-btn').addEventListener('click', () => {\n      if (gameOver) return;\n      socket.emit('gameAction', { type: 'giveUp' });\n    });\n    input.addEventListener('keydown', e => { if (e.key === 'Enter') submitGuess(); });\n  }\n\n  function submitGuess() {\n    if (gameOver) return;\n    const input = document.getElementById('ctx-input');\n    const word = (input.value || '').trim().toUpperCase();\n    if (!word) return;\n    socket.emit('gameAction', { type: 'guess', word });\n    input.value = '';\n    input.focus();\n  }\n\n  function onState(state) {\n    solved   = state.solved;\n    guesses  = state.guesses || [];\n    gameOver = solved || state.gaveUp;\n\n    const countEl = document.getElementById('ctx-count');\n    if (countEl) countEl.textContent = `${guesses.length} guess${guesses.length !== 1 ? 'es' : ''}`;\n\n    renderList();\n\n    if (solved && state.answer) showAnswer(state.answer, true);\n    else if (state.answer && !solved) showAnswer(state.answer, false);\n  }\n\n  function renderList() {\n    const listEl = document.getElementById('ctx-list');\n    if (!listEl) return;\n    listEl.innerHTML = '';\n\n    const sorted = [...guesses].sort((a, b) => a.score - b.score);\n    sorted.forEach(g => {\n      const item = document.createElement('div');\n      item.className = 'ctx-guess-item';\n      const rankClass = getRankClass(g.score);\n      const barWidth  = getBarWidth(g.score);\n      const rankLabel = getRankLabel(g.score);\n\n      item.innerHTML = `\n        <div class=\"ctx-rank\" style=\"color:${getRankColor(g.score)}\">${g.score === 0 ? '\u2605' : g.score}</div>\n        <div class=\"ctx-word\">${g.word}</div>\n        <div class=\"ctx-bar-wrap\"><div class=\"ctx-bar ${rankClass}\" style=\"width:${barWidth}%\"></div></div>\n        <div class=\"ctx-rank-label\" style=\"color:${getRankColor(g.score)}\">${rankLabel}</div>`;\n      listEl.appendChild(item);\n    });\n  }\n\n  function getRankClass(rank) {\n    if (rank === 0)   return 'rank-answer';\n    if (rank <= 10)   return 'rank-hot';\n    if (rank <= 50)   return 'rank-warm';\n    if (rank <= 150)  return 'rank-cool';\n    if (rank <= 500)  return 'rank-cold';\n    return 'rank-frozen';\n  }\n\n  function getRankColor(rank) {\n    if (rank === 0)   return 'var(--gold)';\n    if (rank <= 10)   return '#27ae60';\n    if (rank <= 50)   return '#f39c12';\n    if (rank <= 150)  return '#e67e22';\n    if (rank <= 500)  return '#c0392b';\n    return '#4a5568';\n  }\n\n  function getRankLabel(rank) {\n    if (rank === 0)   return '\ud83c\udfaf Answer!';\n    if (rank <= 10)   return 'Very close';\n    if (rank <= 50)   return 'Warm';\n    if (rank <= 150)  return 'Getting there';\n    if (rank <= 500)  return 'Cold';\n    return 'Far away';\n  }\n\n  function getBarWidth(rank) {\n    if (rank === 0)   return 100;\n    if (rank <= 10)   return 90;\n    if (rank <= 50)   return 65;\n    if (rank <= 150)  return 40;\n    if (rank <= 500)  return 20;\n    return 8;\n  }\n\n  function showAnswer(answer, won) {\n    gameOver = true;\n    const msg = document.getElementById('ctx-msg');\n    if (msg) {\n      msg.innerHTML = won\n        ? `<span style=\"color:var(--gold)\">\u2713 You found it! The word was <strong>${answer}</strong></span>`\n        : `<span style=\"color:var(--text-dim)\">The word was <strong style=\"color:var(--cream)\">${answer}</strong></span>`;\n    }\n  }\n\n  function onFinish(result) {\n    gameOver = true;\n    if (result.answer) showAnswer(result.answer, result.winner === myId);\n  }\n\n  function onError(msg) {\n    const msgEl = document.getElementById('ctx-msg');\n    if (msgEl) {\n      msgEl.textContent = msg;\n      setTimeout(() => { if (msgEl) msgEl.textContent = ''; }, 2000);\n    }\n  }\n\n  return { init };\n})();\n</script>\n\n<script src=\"js/app.js\"></script>\n\n</body>\n</html>\n";
app.get('/', (req, res) => { res.setHeader('Content-Type','text/html'); res.send(HTML); });
app.get('*', (req, res) => { res.setHeader('Content-Type','text/html'); res.send(HTML); });

// ── In-memory state ───────────────────────────────────────────────────────────
const players = new Map();  // socketId -> { id, name, roomId }
const rooms   = new Map();  // roomId   -> Room

function makeId(len = 6) {
  return Math.random().toString(36).substring(2, 2 + len).toUpperCase();
}

function getRoom(roomId) { return rooms.get(roomId); }

function broadcastLobbyList() {
  const list = [...rooms.values()]
    .filter(r => r.state === 'waiting')
    .map(r => ({
      id: r.id,
      code: r.code,
      game: r.game,
      playerCount: r.players.length,
    }));
  io.emit('lobbyList', list);
}

// ── Room factory ──────────────────────────────────────────────────────────────
function createRoom(hostId, game) {
  const id   = makeId(8);
  const code = makeId(4);
  const room = {
    id,
    code,
    game,
    state: 'waiting',   // 'waiting' | 'playing'
    players: [],        // [{ id, name }]
    hostId,
    gameState: null,
  };
  rooms.set(id, room);
  return room;
}

function removePlayerFromRoom(socketId) {
  const player = players.get(socketId);
  if (!player || !player.roomId) return;
  const room = getRoom(player.roomId);
  if (!room) return;

  room.players = room.players.filter(p => p.id !== socketId);
  player.roomId = null;

  if (room.players.length === 0) {
    rooms.delete(room.id);
    broadcastLobbyList();
    return;
  }

  // Pass host to next player
  if (room.hostId === socketId) {
    room.hostId = room.players[0].id;
  }

  io.to(room.id).emit('roomUpdate', {
    players: room.players,
    hostId: room.hostId,
  });
  io.to(room.id).emit('systemMessage', `${player.name} left the room.`);
  broadcastLobbyList();
}

// ═══════════════════════════════════════════════════════════════════════════════
//  GAME ENGINES
// ═══════════════════════════════════════════════════════════════════════════════

// ── UNO ───────────────────────────────────────────────────────────────────────
const UNO = (() => {
  const COLORS  = ['red','blue','green','yellow'];
  const VALUES  = ['0','1','2','3','4','5','6','7','8','9','skip','reverse','draw2'];
  const WILDS   = ['wild','wild4'];

  function buildDeck() {
    const deck = [];
    COLORS.forEach(c => {
      VALUES.forEach(v => {
        deck.push({ color: c, value: v });
        if (v !== '0') deck.push({ color: c, value: v });
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

  function init(room) {
    const deck   = buildDeck();
    const hands  = {};
    room.players.forEach(p => {
      hands[p.id] = deck.splice(0, 7);
    });
    // Ensure first discard is a number card
    let firstCard;
    do { firstCard = deck.splice(0, 1)[0]; } while (firstCard.color === 'wild');

    room.gameState = {
      deck,
      hands,
      discard:      [firstCard],
      activeColor:  firstCard.color,
      currentIdx:   0,
      direction:    1,
      drawPending:  0,
    };
    sendState(room);
  }

  function currentPlayerId(room) {
    const gs = room.gameState;
    return room.players[gs.currentIdx]?.id;
  }

  function advance(room) {
    const gs = room.gameState;
    gs.currentIdx = (gs.currentIdx + gs.direction + room.players.length) % room.players.length;
  }

  function sendState(room) {
    const gs = room.gameState;
    const top = gs.discard[gs.discard.length - 1];
    room.players.forEach(p => {
      const handCounts = {};
      room.players.forEach(q => { handCounts[q.id] = gs.hands[q.id].length; });
      io.to(p.id).emit('gameState', {
        top,
        activeColor:   gs.activeColor,
        currentPlayer: currentPlayerId(room),
        hand:          gs.hands[p.id],
        handCounts,
      });
    });
  }

  function draw(room, playerId) {
    const gs = room.gameState;
    if (currentPlayerId(room) !== playerId) return;
    if (gs.deck.length === 0) {
      const top = gs.discard.pop();
      gs.deck = shuffle(gs.discard);
      gs.discard = [top];
    }
    gs.hands[playerId].push(gs.deck.pop());
    advance(room);
    sendState(room);
  }

  function play(room, playerId, { cardIdx, chosenColor }) {
    const gs = room.gameState;
    if (currentPlayerId(room) !== playerId) {
      io.to(playerId).emit('gameError', "It's not your turn.");
      return;
    }
    const hand = gs.hands[playerId];
    const card = hand[cardIdx];
    if (!card) { io.to(playerId).emit('gameError', 'Invalid card.'); return; }

    const top = gs.discard[gs.discard.length - 1];
    const ok  = card.color === 'wild' ||
                card.color === gs.activeColor ||
                card.value === top.value;
    if (!ok) { io.to(playerId).emit('gameError', "Can't play that card."); return; }

    hand.splice(cardIdx, 1);
    gs.discard.push(card);

    if (card.color === 'wild') {
      gs.activeColor = chosenColor || 'red';
    } else {
      gs.activeColor = card.color;
    }

    // Check win
    if (hand.length === 0) {
      const scores = {};
      room.players.forEach(p => {
        scores[p.id] = gs.hands[p.id].reduce((s, c) => {
          const v = parseInt(c.value);
          return s + (isNaN(v) ? (c.value === 'wild' || c.value === 'wild4' ? 50 : 20) : v);
        }, 0);
      });
      io.to(room.id).emit('gameFinished', { winner: playerId, scores });
      room.state = 'waiting';
      return;
    }

    // Special cards
    advance(room);
    if (card.value === 'skip') advance(room);
    if (card.value === 'reverse') {
      gs.direction *= -1;
      if (room.players.length === 2) advance(room);
    }
    if (card.value === 'draw2') {
      const next = currentPlayerId(room);
      for (let i = 0; i < 2; i++) gs.hands[next].push(gs.deck.pop() || { color:'red', value:'0' });
      advance(room);
    }
    if (card.value === 'wild4') {
      const next = currentPlayerId(room);
      for (let i = 0; i < 4; i++) gs.hands[next].push(gs.deck.pop() || { color:'red', value:'0' });
      advance(room);
    }

    sendState(room);
  }

  return { init, play, draw };
})();

// ── WORDLE ────────────────────────────────────────────────────────────────────
const WORDLE = (() => {
  // 200 common 5-letter words
  const WORDS = [
    'CRANE','SLATE','AUDIO','RAISE','ARISE','STARE','SNARE','LEAST','ADORE','IRATE',
    'LEARN','ALONE','STALE','CRATE','TRACE','GRACE','PLACE','BLAZE','BLARE','FLARE',
    'SHARE','SPARE','GLARE','PHASE','CHASE','CEASE','TEASE','LEASE','BEAST','FEAST',
    'YEAST','COAST','TOAST','BOAST','ROAST','BLOAT','FLOAT','GLOAT','TROUT','SHOUT',
    'SCOUT','STOUT','ABOUT','DOUBT','PROUD','CLOUD','ALOUD','COULD','WOULD','SHOULD',
    'BROOD','BLOOD','FLOOD','FLOOR','SNORE','SCORE','STORE','SHORE','ADORN','SWORN',
    'SCORN','THORN','FORAY','BONUS','FOCUS','LOCUS','LOTUS','NOVUS','BONUS','FORUM',
    'WRIST','TWIST','CRISP','BRISK','WHISK','FRISK','FIRST','WORST','BURST','CURSE',
    'PURSE','NURSE','VERSE','TERSE','MERGE','VERGE','SURGE','PURGE','USURP','ULTRA',
    'LUNAR','POLAR','SOLAR','MOLAR','RULER','TUTOR','HUMOR','TUMOR','RUMOR','VIGOR',
    'RIGOR','MANOR','MAJOR','MINOR','VAPOR','FAVOR','VALOR','LABOR','TAPIR','ELIXIR',
    'MAGIC','PANIC','BASIC','TOPIC','STOIC','LYRIC','CIVIC','TOXIC','COMIC','SONIC',
    'TONIC','IONIC','IRONY','AGONY','EBONY','PHONY','CRONY','PEONY','ATONE','OZONE',
    'STONE','PHONE','PRONE','CLONE','DRONE','GROVE','STOVE','GLOVE','SHOVE','DROVE',
    'PROVE','TROVE','ABOVE','OLIVE','ALIVE','DRIVE','STRIVE','THRIVE','NERVE','CURVE',
    'SERVE','CARVE','STARVE','BRAVE','GRAVE','CRAVE','SLAVE','KNAVE','SHAVE','STAVE',
    'PLUME','FLUME','FLUTE','BRUTE','ACUTE','ROUTE','QUOTE','EMOTE','EVOKE','ELBOW',
    'BELOW','ELBOW','MELON','LEMON','DEMON','VENOM','DENIM','CLAIM','REALM','QUALM',
    'PSALM','PRISM','CHASM','SPASM','WHIRL','SWIRL','TWIRL','CHURN','STERN','INFER',
    'INTER','OUTER','INTER','ULTRA','EXTRA','ULTRA','OPERA','ARENA','TIARA','KARMA',
  ].filter((v, i, a) => a.indexOf(v) === i && v.length === 5);

  function pickWord() {
    return WORDS[Math.floor(Math.random() * WORDS.length)];
  }

  function score(guess, answer) {
    const result = Array(5).fill('absent');
    const ansArr = answer.split('');
    const used   = Array(5).fill(false);
    // Correct pass
    for (let i = 0; i < 5; i++) {
      if (guess[i] === ansArr[i]) { result[i] = 'correct'; used[i] = true; }
    }
    // Present pass
    for (let i = 0; i < 5; i++) {
      if (result[i] === 'correct') continue;
      const j = ansArr.findIndex((c, k) => !used[k] && c === guess[i]);
      if (j !== -1) { result[i] = 'present'; used[j] = true; }
    }
    return result;
  }

  function init(room) {
    const answer = pickWord();
    const boards = {};
    room.players.forEach(p => {
      boards[p.id] = { guesses: [], results: [], solved: false, attempts: 0 };
    });
    room.gameState = { answer, boards };
    room.players.forEach(p => sendState(room, p.id));
  }

  function sendState(room, playerId) {
    const gs    = room.gameState;
    const board = gs.boards[playerId];
    const progress = {};
    room.players.forEach(p => {
      const b = gs.boards[p.id];
      progress[p.id] = { solved: b.solved, attempts: b.attempts };
    });
    io.to(playerId).emit('gameState', {
      board,
      progress,
      players: room.players,
    });
  }

  function guess(room, playerId, word) {
    const gs    = room.gameState;
    const board = gs.boards[playerId];
    if (!board || board.solved || board.attempts >= 6) return;
    const w = word.toUpperCase();
    if (w.length !== 5) { io.to(playerId).emit('gameError', 'Must be 5 letters.'); return; }

    const result = score(w.split(''), gs.answer.split(''));
    board.guesses.push(w);
    board.results.push(result);
    board.attempts++;
    if (w === gs.answer) board.solved = true;

    room.players.forEach(p => sendState(room, p.id));

    if (board.solved) {
      io.to(playerId).emit('gameFinished', { winner: playerId, answer: gs.answer });
    } else if (board.attempts >= 6) {
      io.to(playerId).emit('gameFinished', { winner: null, answer: gs.answer });
    }
  }

  return { init, guess };
})();

// ── CONNECTIONS ───────────────────────────────────────────────────────────────
const CONNECTIONS = (() => {
  const PUZZLES = [
    {
      groups: [
        { name: 'Things in a kitchen',  color: 'yellow', words: ['FORK','SPOON','KNIFE','LADLE'] },
        { name: 'Dog breeds',           color: 'green',  words: ['HUSKY','BOXER','POODLE','BEAGLE'] },
        { name: '___ ball',             color: 'blue',   words: ['FIRE','FOOT','BASE','BASKET'] },
        { name: 'Types of music',       color: 'purple', words: ['JAZZ','BLUES','ROCK','SOUL'] },
      ],
    },
    {
      groups: [
        { name: 'Planets',              color: 'yellow', words: ['MARS','VENUS','EARTH','SATURN'] },
        { name: 'Card games',           color: 'green',  words: ['SNAP','POKER','UNO','BRIDGE'] },
        { name: '___ fish',             color: 'blue',   words: ['SWORD','STAR','CAT','BLOW'] },
        { name: 'Dances',               color: 'purple', words: ['TANGO','SALSA','WALTZ','JIVE'] },
      ],
    },
    {
      groups: [
        { name: 'Fruits',               color: 'yellow', words: ['MANGO','PEACH','PLUM','GRAPE'] },
        { name: 'Olympic sports',       color: 'green',  words: ['HURDLE','JAVELIN','DISCUS','VAULT'] },
        { name: '___ board',            color: 'blue',   words: ['CARD','SKATE','SNOW','DART'] },
        { name: 'Things that glow',     color: 'purple', words: ['EMBER','NEON','STAR','LAVA'] },
      ],
    },
  ];

  function init(room) {
    const puzzle  = PUZZLES[Math.floor(Math.random() * PUZZLES.length)];
    const allWords = puzzle.groups.flatMap(g => g.words);
    const shuffled = allWords.sort(() => Math.random() - 0.5);

    const progress = {};
    room.players.forEach(p => { progress[p.id] = { solved: 0, mistakes: 0 }; });

    room.gameState = {
      puzzle,
      shuffled,
      progress,
      solved: [],          // completed groups
    };
    sendState(room);
  }

  function sendState(room, targetId) {
    const gs          = room.gameState;
    const solvedWords = gs.solved.flatMap(g => g.words);
    const remaining   = gs.shuffled.filter(w => !solvedWords.includes(w));

    const send = (playerId) => {
      const prog = gs.progress[playerId] || { solved: 0, mistakes: 0 };
      io.to(playerId).emit('gameState', {
        words:       remaining,
        solved:      gs.solved,
        mistakes:    prog.mistakes,
        maxMistakes: 4,
        progress:    gs.progress,
        players:     room.players,
      });
    };

    if (targetId) { send(targetId); }
    else { room.players.forEach(p => send(p.id)); }
  }

  function guess(room, playerId, words) {
    const gs   = room.gameState;
    const prog = gs.progress[playerId];
    if (!prog) return;
    if (prog.mistakes >= 4) { io.to(playerId).emit('gameError', 'No mistakes remaining.'); return; }

    const match = gs.puzzle.groups.find(g =>
      g.words.every(w => words.includes(w)) && words.every(w => g.words.includes(w))
    );

    if (match) {
      // Check not already solved
      if (gs.solved.find(s => s.name === match.name)) {
        io.to(playerId).emit('gameError', 'Already solved!'); return;
      }
      gs.solved.push(match);
      prog.solved++;
      sendState(room);

      if (gs.solved.length === 4) {
        io.to(room.id).emit('gameFinished', { winner: playerId });
        room.state = 'waiting';
      }
    } else {
      prog.mistakes++;
      io.to(playerId).emit('gameError', 'Not quite — try again.');
      sendState(room, playerId);
    }
  }

  return { init, guess };
})();

// ── CONTEXTO ──────────────────────────────────────────────────────────────────
const CONTEXTO = (() => {
  // Word list with rough semantic neighbours ranked
  const ANSWERS = ['OCEAN','CASTLE','DRAGON','PIANO','JUNGLE','WINTER','COFFEE','MIRROR',
                   'ROCKET','CANDLE','BRIDGE','DESERT','GARDEN','ISLAND','TEMPLE'];

  // Very simple semantic distance: random but consistent per answer session
  function getScore(answer, guess) {
    if (guess === answer) return 0;
    // Deterministic pseudo-score based on string similarity
    let score = 0;
    const a = answer.split(''), g = guess.split('');
    let shared = 0;
    a.forEach(c => { if (g.includes(c)) shared++; });
    score = Math.max(1, 1000 - shared * 80 - (guess.length === answer.length ? 50 : 0));
    // Add some randomness seeded by the words so it's consistent
    const seed = [...answer, ...guess].reduce((s, c) => s + c.charCodeAt(0), 0);
    score = Math.max(1, Math.min(1000, score + (seed % 200) - 100));
    return guess === answer ? 0 : score;
  }

  function init(room) {
    const answer = ANSWERS[Math.floor(Math.random() * ANSWERS.length)];
    const boards = {};
    room.players.forEach(p => {
      boards[p.id] = { guesses: [], solved: false, gaveUp: false };
    });
    room.gameState = { answer, boards };
    room.players.forEach(p => sendState(room, p.id));
  }

  function sendState(room, playerId, revealAnswer) {
    const gs    = room.gameState;
    const board = gs.boards[playerId];
    const state = {
      guesses: board.guesses,
      solved:  board.solved,
      gaveUp:  board.gaveUp,
    };
    if (revealAnswer || board.solved || board.gaveUp) state.answer = gs.answer;
    io.to(playerId).emit('gameState', state);
  }

  function guess(room, playerId, word) {
    const gs    = room.gameState;
    const board = gs.boards[playerId];
    if (board.solved || board.gaveUp) return;
    const w     = word.toUpperCase().trim();
    if (!w)      { io.to(playerId).emit('gameError', 'Enter a word.'); return; }
    const score = getScore(gs.answer, w);
    board.guesses.push({ word: w, score });
    if (score === 0) {
      board.solved = true;
      sendState(room, playerId, true);
      io.to(playerId).emit('gameFinished', { winner: playerId, answer: gs.answer });
    } else {
      sendState(room, playerId);
    }
  }

  function giveUp(room, playerId) {
    const gs    = room.gameState;
    const board = gs.boards[playerId];
    board.gaveUp = true;
    sendState(room, playerId, true);
    io.to(playerId).emit('gameFinished', { winner: null, answer: gs.answer });
  }

  return { init, guess, giveUp };
})();

// ── CONNECT 4 ─────────────────────────────────────────────────────────────────
const CONNECT4 = (() => {
  const ROWS = 6, COLS = 7;

  function emptyBoard() {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  }

  function checkWin(board, playerId) {
    const check = (r, c, dr, dc) => {
      for (let i = 1; i < 4; i++) {
        const nr = r + dr * i, nc = c + dc * i;
        if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) return false;
        if (board[nr][nc] !== playerId) return false;
      }
      return true;
    };
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (board[r][c] !== playerId) continue;
        if ([[0,1],[1,0],[1,1],[1,-1]].some(([dr,dc]) => check(r,c,dr,dc))) return true;
      }
    }
    return false;
  }

  function init(room) {
    if (room.players.length < 2) {
      io.to(room.id).emit('systemMessage', 'Need at least 2 players for Connect 4.');
      return;
    }
    const colors = {};
    colors[room.players[0].id] = 'red';
    colors[room.players[1].id] = 'yellow';
    room.gameState = {
      board:        emptyBoard(),
      playerColors: colors,
      currentIdx:   0,
      winner:       null,
      draw:         false,
    };
    sendState(room);
  }

  function sendState(room) {
    const gs = room.gameState;
    io.to(room.id).emit('gameState', {
      board:        gs.board,
      playerColors: gs.playerColors,
      current:      room.players[gs.currentIdx]?.id,
      winner:       gs.winner,
      draw:         gs.draw,
    });
  }

  function drop(room, playerId, col) {
    const gs = room.gameState;
    if (room.players[gs.currentIdx]?.id !== playerId) {
      io.to(playerId).emit('gameError', "Not your turn."); return;
    }
    if (gs.winner || gs.draw) return;

    // Find lowest empty row
    let row = -1;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (!gs.board[r][col]) { row = r; break; }
    }
    if (row === -1) { io.to(playerId).emit('gameError', 'Column is full.'); return; }

    gs.board[row][col] = playerId;

    if (checkWin(gs.board, playerId)) {
      gs.winner = playerId;
      sendState(room);
      io.to(room.id).emit('gameFinished', { winner: playerId });
      room.state = 'waiting';
      return;
    }

    const full = gs.board[0].every(c => c !== null);
    if (full) {
      gs.draw = true;
      sendState(room);
      io.to(room.id).emit('gameFinished', { winner: null });
      room.state = 'waiting';
      return;
    }

    gs.currentIdx = (gs.currentIdx + 1) % room.players.length;
    sendState(room);
  }

  return { init, drop };
})();

// ── TWO TRUTHS & A LIE ────────────────────────────────────────────────────────
const TWOTRUTHSALIE = (() => {
  function init(room) {
    room.gameState = {
      phase:            'submit',
      submissions:      {},   // playerId -> { statements, lieIdx }
      presenterIdx:     0,
      guesses:          {},   // playerId -> guessIdx
      scores:           Object.fromEntries(room.players.map(p => [p.id, 0])),
      statements:       null,
      lieIdx:           null,
      currentPresenter: null,
      hasSubmitted:     new Set(),
    };
    sendState(room);
  }

  function sendState(room) {
    const gs = room.gameState;
    room.players.forEach(p => {
      io.to(p.id).emit('gameState', {
        phase:            gs.phase,
        hasSubmitted:     gs.hasSubmitted.has(p.id),
        players:          room.players,
        currentPresenter: gs.currentPresenter,
        statements:       gs.phase !== 'submit' ? gs.statements : undefined,
        lieIdx:           gs.phase === 'reveal' ? gs.lieIdx : undefined,
        guesses:          gs.phase === 'reveal' ? gs.guesses : undefined,
        myGuess:          gs.guesses[p.id] ?? null,
        scores:           gs.scores,
      });
    });
  }

  function submit(room, playerId, { statements, lieIdx }) {
    const gs = room.gameState;
    if (gs.phase !== 'submit') return;
    gs.submissions[playerId] = { statements, lieIdx };
    gs.hasSubmitted.add(playerId);

    if (gs.hasSubmitted.size === room.players.length) {
      startRound(room);
    } else {
      sendState(room);
    }
  }

  function startRound(room) {
    const gs        = room.gameState;
    const presenter = room.players[gs.presenterIdx];
    const sub       = gs.submissions[presenter.id];
    gs.phase            = 'guess';
    gs.currentPresenter = presenter;
    gs.statements       = sub.statements;
    gs.lieIdx           = sub.lieIdx;
    gs.guesses          = {};
    sendState(room);
  }

  function guess(room, playerId, guessIdx) {
    const gs = room.gameState;
    if (gs.phase !== 'guess') return;
    if (playerId === gs.currentPresenter?.id) return;
    gs.guesses[playerId] = guessIdx;

    const nonPresenters = room.players.filter(p => p.id !== gs.currentPresenter?.id);
    if (Object.keys(gs.guesses).length >= nonPresenters.length) {
      gs.phase = 'reveal';
      // Score
      nonPresenters.forEach(p => {
        if (gs.guesses[p.id] === gs.lieIdx) gs.scores[p.id] = (gs.scores[p.id] || 0) + 1;
      });
      sendState(room);
    } else {
      sendState(room);
    }
  }

  function next(room, playerId) {
    const gs = room.gameState;
    if (playerId !== room.players[0]?.id) return;
    gs.presenterIdx++;
    if (gs.presenterIdx >= room.players.length) {
      const winner = Object.entries(gs.scores).sort((a,b) => b[1]-a[1])[0]?.[0];
      io.to(room.id).emit('gameFinished', { winner, scores: gs.scores });
      room.state = 'waiting';
      return;
    }
    startRound(room);
  }

  return { init, submit, guess, next };
})();

// ── NEVER HAVE I EVER ─────────────────────────────────────────────────────────
const NEVERHAVEIEVER = (() => {
  function init(room) {
    room.gameState = {
      phase:        'submit',
      submissions:  {},
      questions:    [],
      currentQ:     0,
      answers:      {},
      scores:       Object.fromEntries(room.players.map(p => [p.id, 0])),
      hasSubmitted: new Set(),
      myAnswer:     {},
    };
    sendState(room);
  }

  function sendState(room) {
    const gs = room.gameState;
    const q  = gs.questions[gs.currentQ] || null;
    room.players.forEach(p => {
      io.to(p.id).emit('gameState', {
        phase:        gs.phase,
        hasSubmitted: gs.hasSubmitted.has(p.id),
        players:      room.players,
        question:     q,
        currentQ:     gs.currentQ,
        totalQ:       gs.questions.length,
        answers:      gs.phase === 'reveal' ? gs.answers : undefined,
        myAnswer:     gs.answers[p.id] ?? null,
        scores:       gs.scores,
      });
    });
  }

  function submitQuestions(room, playerId, questions) {
    const gs = room.gameState;
    gs.submissions[playerId] = questions;
    gs.hasSubmitted.add(playerId);
    if (gs.hasSubmitted.size === room.players.length) {
      // Flatten all questions
      gs.questions = Object.values(gs.submissions)
        .flat()
        .map((text, i) => ({ id: i, text }))
        .sort(() => Math.random() - 0.5);
      gs.phase = 'play';
      gs.currentQ = 0;
      gs.answers = {};
    }
    sendState(room);
  }

  function answer(room, playerId, haveI) {
    const gs = room.gameState;
    if (gs.phase !== 'play') return;
    gs.answers[playerId] = haveI;

    if (Object.keys(gs.answers).length >= room.players.length) {
      // Score: players who said "I have" get a point
      room.players.forEach(p => {
        if (gs.answers[p.id]) gs.scores[p.id] = (gs.scores[p.id] || 0) + 1;
      });
      gs.phase = 'reveal';
      sendState(room);
    } else {
      sendState(room);
    }
  }

  function next(room, playerId) {
    const gs = room.gameState;
    if (playerId !== room.players[0]?.id) return;
    gs.currentQ++;
    if (gs.currentQ >= gs.questions.length) {
      const winner = Object.entries(gs.scores).sort((a,b) => b[1]-a[1])[0]?.[0];
      io.to(room.id).emit('gameFinished', { winner, scores: gs.scores });
      room.state = 'waiting';
      return;
    }
    gs.phase   = 'play';
    gs.answers = {};
    sendState(room);
  }

  return { init, submitQuestions, answer, next };
})();

// ── WOULD YOU RATHER ──────────────────────────────────────────────────────────
const WOULDYOURATHER = (() => {
  function init(room) {
    room.gameState = {
      phase:        'submit',
      submissions:  {},
      questions:    [],
      currentQ:     0,
      votes:        {},
      scores:       Object.fromEntries(room.players.map(p => [p.id, 0])),
      hasSubmitted: new Set(),
    };
    sendState(room);
  }

  function sendState(room) {
    const gs = room.gameState;
    const q  = gs.questions[gs.currentQ] || null;
    room.players.forEach(p => {
      io.to(p.id).emit('gameState', {
        phase:        gs.phase,
        hasSubmitted: gs.hasSubmitted.has(p.id),
        players:      room.players,
        question:     q,
        currentQ:     gs.currentQ,
        totalQ:       gs.questions.length,
        votes:        gs.phase === 'results' ? gs.votes : undefined,
        myVote:       gs.votes[p.id] ?? null,
        scores:       gs.scores,
      });
    });
  }

  function submitQuestions(room, playerId, questions) {
    const gs = room.gameState;
    gs.submissions[playerId] = questions;
    gs.hasSubmitted.add(playerId);
    if (gs.hasSubmitted.size === room.players.length) {
      gs.questions = Object.values(gs.submissions)
        .flat()
        .sort(() => Math.random() - 0.5);
      gs.phase   = 'vote';
      gs.currentQ = 0;
      gs.votes   = {};
    }
    sendState(room);
  }

  function vote(room, playerId, choice) {
    const gs = room.gameState;
    if (gs.phase !== 'vote') return;
    gs.votes[playerId] = choice;
    if (Object.keys(gs.votes).length >= room.players.length) {
      // Score majority voters
      const vA = Object.values(gs.votes).filter(v => v === 'A').length;
      const vB = Object.values(gs.votes).filter(v => v === 'B').length;
      const majority = vA > vB ? 'A' : vB > vA ? 'B' : null;
      if (majority) {
        room.players.forEach(p => {
          if (gs.votes[p.id] === majority) gs.scores[p.id] = (gs.scores[p.id] || 0) + 1;
        });
      }
      gs.phase = 'results';
      sendState(room);
    } else {
      sendState(room);
    }
  }

  function nextQuestion(room, playerId) {
    const gs = room.gameState;
    if (playerId !== room.players[0]?.id) return;
    gs.currentQ++;
    if (gs.currentQ >= gs.questions.length) {
      const winner = Object.entries(gs.scores).sort((a,b) => b[1]-a[1])[0]?.[0];
      io.to(room.id).emit('gameFinished', { winner, scores: gs.scores });
      room.state = 'waiting';
      return;
    }
    gs.phase = 'vote';
    gs.votes = {};
    sendState(room);
  }

  return { init, submitQuestions, vote, nextQuestion };
})();

// ═══════════════════════════════════════════════════════════════════════════════
//  GAME ROUTER
// ═══════════════════════════════════════════════════════════════════════════════
function startGame(room) {
  room.state = 'playing';
  io.to(room.id).emit('gameStarted', { game: room.game });

  switch (room.game) {
    case 'uno':             UNO.init(room);           break;
    case 'wordle':          WORDLE.init(room);         break;
    case 'connections':     CONNECTIONS.init(room);    break;
    case 'contexto':        CONTEXTO.init(room);       break;
    case 'connect4':        CONNECT4.init(room);       break;
    case 'twoTruths':       TWOTRUTHSALIE.init(room);  break;
    case 'neverHaveIEver':  NEVERHAVEIEVER.init(room); break;
    case 'wouldYouRather':  WOULDYOURATHER.init(room); break;
    default:
      io.to(room.id).emit('systemMessage', `Game "${room.game}" is not implemented yet.`);
  }
}

function handleGameAction(room, playerId, action) {
  switch (room.game) {
    case 'uno':
      if (action.type === 'play') UNO.play(room, playerId, action);
      if (action.type === 'draw') UNO.draw(room, playerId);
      break;

    case 'wordle':
      if (action.type === 'guess') WORDLE.guess(room, playerId, action.word);
      break;

    case 'connections':
      if (action.type === 'guess') CONNECTIONS.guess(room, playerId, action.words);
      break;

    case 'contexto':
      if (action.type === 'guess')  CONTEXTO.guess(room, playerId, action.word);
      if (action.type === 'giveUp') CONTEXTO.giveUp(room, playerId);
      break;

    case 'connect4':
      if (action.type === 'drop') CONNECT4.drop(room, playerId, action.col);
      break;

    case 'twoTruths':
      if (action.type === 'submit') TWOTRUTHSALIE.submit(room, playerId, action);
      if (action.type === 'guess')  TWOTRUTHSALIE.guess(room, playerId, action.guessIdx);
      if (action.type === 'next')   TWOTRUTHSALIE.next(room, playerId);
      break;

    case 'neverHaveIEver':
      if (action.type === 'submitQuestions') NEVERHAVEIEVER.submitQuestions(room, playerId, action.questions);
      if (action.type === 'answer')          NEVERHAVEIEVER.answer(room, playerId, action.haveI);
      if (action.type === 'next')            NEVERHAVEIEVER.next(room, playerId);
      break;

    case 'wouldYouRather':
      if (action.type === 'submitQuestions') WOULDYOURATHER.submitQuestions(room, playerId, action.questions);
      if (action.type === 'vote')            WOULDYOURATHER.vote(room, playerId, action.choice);
      if (action.type === 'nextQuestion')    WOULDYOURATHER.nextQuestion(room, playerId);
      break;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  SOCKET.IO EVENTS
// ═══════════════════════════════════════════════════════════════════════════════
io.on('connection', (socket) => {
  players.set(socket.id, { id: socket.id, name: '', roomId: null });

  // ── Join lobby ──
  socket.on('joinLobby', ({ name }) => {
    const trimmed = (name || '').trim().substring(0, 16);
    if (!trimmed) { socket.emit('loginError', 'Name cannot be empty.'); return; }
    const player  = players.get(socket.id);
    player.name   = trimmed;
    socket.emit('joinedLobby', { id: socket.id, name: trimmed });
  });

  // ── Lobby list ──
  socket.on('getLobbyList', () => {
    const list = [...rooms.values()]
      .filter(r => r.state === 'waiting')
      .map(r => ({
        id:          r.id,
        code:        r.code,
        game:        r.game,
        playerCount: r.players.length,
      }));
    socket.emit('lobbyList', list);
  });

  // ── Create room ──
  socket.on('createRoom', ({ game }) => {
    const player = players.get(socket.id);
    if (!player?.name) { socket.emit('loginError', 'Please log in first.'); return; }
    removePlayerFromRoom(socket.id);
    const room = createRoom(socket.id, game || 'uno');
    room.players.push({ id: socket.id, name: player.name });
    player.roomId = room.id;
    socket.join(room.id);
    socket.emit('roomJoined', {
      roomId:  room.id,
      code:    room.code,
      game:    room.game,
      players: room.players,
      hostId:  room.hostId,
    });
    broadcastLobbyList();
  });

  // ── Join room ──
  socket.on('joinRoom', ({ roomId }) => {
    const player = players.get(socket.id);
    if (!player?.name) { socket.emit('loginError', 'Please log in first.'); return; }
    const room = getRoom(roomId);
    if (!room)                  { socket.emit('roomError', 'Room not found.'); return; }
    if (room.state !== 'waiting') { socket.emit('roomError', 'Game already in progress.'); return; }
    removePlayerFromRoom(socket.id);
    room.players.push({ id: socket.id, name: player.name });
    player.roomId = room.id;
    socket.join(room.id);
    socket.emit('roomJoined', {
      roomId:  room.id,
      code:    room.code,
      game:    room.game,
      players: room.players,
      hostId:  room.hostId,
    });
    io.to(room.id).emit('roomUpdate', { players: room.players, hostId: room.hostId });
    io.to(room.id).emit('systemMessage', `${player.name} joined the room.`);
    broadcastLobbyList();
  });

  // ── Leave room ──
  socket.on('leaveRoom', () => {
    removePlayerFromRoom(socket.id);
    const player = players.get(socket.id);
    if (player) player.roomId = null;
  });

  // ── Start game ──
  socket.on('startGame', () => {
    const player = players.get(socket.id);
    if (!player?.roomId) return;
    const room = getRoom(player.roomId);
    if (!room || room.hostId !== socket.id) return;
    if (room.state !== 'waiting') return;
    startGame(room);
  });

  // ── Game action ──
  socket.on('gameAction', (action) => {
    const player = players.get(socket.id);
    if (!player?.roomId) return;
    const room = getRoom(player.roomId);
    if (!room || room.state !== 'playing') return;
    handleGameAction(room, socket.id, action);
  });

  // ── Chat ──
  socket.on('chatMessage', ({ text }) => {
    const player = players.get(socket.id);
    if (!player?.name || !player.roomId) return;
    const clean = (text || '').trim().substring(0, 200);
    if (!clean) return;
    io.to(player.roomId).emit('chatMessage', { name: player.name, text: clean });
  });

  // ── Disconnect ──
  socket.on('disconnect', () => {
    removePlayerFromRoom(socket.id);
    players.delete(socket.id);
  });
});

// ── Start server ──────────────────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`Goon Room running on port ${PORT}`);
});
