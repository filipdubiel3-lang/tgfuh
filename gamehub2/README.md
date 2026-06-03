# 🎮 GameHub — Setup Guide

## What's included
- **server.js** — Node.js backend (Express + Socket.io)
- **games/** — Server-side logic for all 8 games
- **public/** — All the frontend files (HTML, CSS, JS)
- **data/** — Auto-created folder for passwords

---

## Step 1 — Install Node.js

1. Go to **https://nodejs.org**
2. Download the **LTS** version (the left button)
3. Run the installer, click through all the defaults
4. To confirm it worked, open a terminal and type:
   ```
   node --version
   ```
   You should see something like `v20.11.0`

---

## Step 2 — Set up the project

1. Put the entire `gamehub` folder somewhere on your computer (e.g. your Desktop)
2. Open a **terminal** (Mac: search "Terminal" in Spotlight; Windows: search "Command Prompt" or "PowerShell")
3. Navigate to the folder:
   ```
   cd Desktop/gamehub
   ```
4. Install the dependencies (only need to do this once):
   ```
   npm install
   ```
   This downloads Express, Socket.io, and bcrypt into a `node_modules` folder.

---

## Step 3 — Run the server

```
npm start
```

You'll see:
```
🎮 GameHub running at http://localhost:3000
   Default site password : gamehub
   Default admin password: admin
```

Now open your browser and go to **http://localhost:3000**

---

## Step 4 — Playing with friends

### On the same WiFi network
1. Find your computer's local IP address:
   - **Mac**: System Settings → Network → your IP (e.g. `192.168.1.42`)
   - **Windows**: Run `ipconfig` in Command Prompt, look for "IPv4 Address"
2. Tell your friends to go to `http://192.168.1.42:3000` in their browser
3. Done — everyone on the same WiFi can play!

### Over the internet (free option)
Use **ngrok** to create a public URL:
1. Sign up free at https://ngrok.com
2. Download and install ngrok
3. While your server is running, open a second terminal and run:
   ```
   ngrok http 3000
   ```
4. ngrok gives you a public URL like `https://abc123.ngrok.io` — share that with friends

---

## Default Passwords

| What | Password |
|------|----------|
| Site password (to enter the site) | `gamehub` |
| Admin password (to change site password) | `admin` |

**Change these immediately!** Click the invisible button in the **top-right corner** of the gate screen to open the admin panel.

---

## Folder Structure

```
gamehub/
├── server.js              ← Main server (start here)
├── package.json           ← Dependencies list
├── README.md              ← This file
├── data/
│   └── config.json        ← Auto-created, stores hashed passwords
├── games/                 ← Server-side game logic
│   ├── uno.js
│   ├── connect4.js
│   ├── wordle.js
│   ├── connections.js
│   ├── contexto.js
│   ├── wouldYouRather.js
│   ├── twoTruths.js
│   └── neverHaveIEver.js
└── public/                ← Frontend (served to browsers)
    ├── index.html
    ├── css/
    │   └── main.css
    └── js/
        ├── app.js
        └── games/
            ├── uno.js
            ├── connect4.js
            └── ... (all game UIs)
```

---

## Stopping the server

Press `Ctrl + C` in the terminal.

## Restarting after changes

Stop the server (`Ctrl + C`) then run `npm start` again.

## Development mode (auto-restart on changes)

```
npm run dev
```

This uses `nodemon` which automatically restarts whenever you edit a file.

---

## Troubleshooting

**"Cannot find module 'express'"**
→ Run `npm install` again

**Port 3000 already in use**
→ Either stop whatever is using port 3000, or change the port in `server.js`:
```js
const PORT = process.env.PORT || 4000;  // change 3000 to 4000
```

**Friends can't connect on local network**
→ Make sure your firewall allows connections on port 3000. On Windows, you may get a popup asking to allow Node.js — click Allow.

**Game crashes / error in terminal**
→ The terminal shows error messages. Copy the red text and you'll be able to debug it.
