# ⚔️ CP Mania

A competitive programming companion app for tracking contests and competing head-to-head with friends in **Battle Mania** — a two-player points duel system.

🌐 **Live:** [cp-mania.vercel.app](https://cp-mania.vercel.app)

---

## 🚀 Features

### 🏆 Contest Tracker
- Automatically fetches upcoming contests from **Codeforces**, **LeetCode**, **CodeChef**, and **AtCoder** via a public API
- Interactive **Calendar View** — see which contests land on which dates at a glance
- **List View** — a clean card-based upcoming contest feed
- Add your own **Manual Contests** with name, platform, date, and duration
- Click any contest for a detailed modal with a direct link to the contest page

### ⚔️ Battle Mania (Rules & Leaderboard)
- A **two-player duel system** where you and a friend log daily CP points
- Tracks an **Overall Leaderboard** and a **Current Session Leaderboard** (resets every 2 weeks based on an anchor date)
- Fully configurable **scoring rules** set during setup
- Secure **JWT-authenticated** point submissions — only you can submit your own scores
- Detailed **Points History** to review past performance

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React (Vite), React Router, Axios, date-fns, Lucide Icons |
| **Backend** | Node.js, Express.js |
| **Database** | MongoDB (via Mongoose) |
| **Auth** | JSON Web Tokens (JWT), bcryptjs |
| **Deployment** | Vercel (Frontend + Backend) |
| **Public Contest API** | [cp-contest-tracker](https://github.com/Siddharthbadal/cp-contest-tracker) (via Render) |

---

## 📁 Project Structure

```
CP-Mania/
├── frontend/               # React + Vite frontend
│   ├── src/
│   │   ├── pages/
│   │   │   ├── ContestTracker.jsx   # Contest calendar & list view
│   │   │   └── RulesLeaderboard.jsx # Battle Mania duel system
│   │   ├── App.jsx                  # Routing & layout
│   │   ├── App.css
│   │   └── index.css                # Global styles & design tokens
│   ├── vercel.json                  # Vercel rewrites (API proxy)
│   └── vite.config.js               # Dev server proxy config
│
├── backend/                # Express.js API
│   ├── server.js           # All routes (auth, points, contests, leaderboard)
│   ├── vercel.json         # Vercel serverless config
│   ├── .env.example        # Environment variable template
│   └── package.json
│
└── README.md
```

---

## ⚙️ Local Development

### Prerequisites
- Node.js v18+
- A [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cluster (or local MongoDB)

### 1. Clone the repository
```bash
git clone https://github.com/ranbeer06052009/CP-Mania.git
cd CP-Mania
```

### 2. Set up the Backend
```bash
cd backend
npm install
```

Create a `.env` file based on `.env.example`:
```env
MONGODB_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_super_secret_jwt_key
PORT=3001
```

Start the backend server:
```bash
node server.js
```
The API will be live at `http://localhost:3001`.

### 3. Set up the Frontend
```bash
cd ../frontend
npm install
npm run dev
```
The app will be live at `http://localhost:5173`.

> **Note:** The Vite dev server is already configured to proxy `/api/public-contests` to the Render-hosted public contests API and all other `/api/*` calls to the local backend at `localhost:3001`.

---

## 🌍 Deployment (Vercel)

This project uses two separate Vercel deployments.

### Backend Deployment (`cp-mania-xfc1.vercel.app`)
1. Import the `backend/` folder as a Vercel project.
2. Add the following **Environment Variables** in Vercel project settings:
   - `MONGODB_URI` — Your MongoDB Atlas connection string
   - `JWT_SECRET` — A strong secret key
3. In MongoDB Atlas **Network Access**, allow connections from `0.0.0.0/0` (required for Vercel's dynamic IPs).

### Frontend Deployment (`cp-mania.vercel.app`)
1. Import the `frontend/` folder as a Vercel project.
2. No extra environment variables are needed — the `vercel.json` rewrites handle all API routing automatically.

The `frontend/vercel.json` rewrites work like this:
- `/api/public-contests/*` → proxied to the Render public contest API (avoids CORS)
- `/api/*` → proxied to the Vercel backend
- All other routes → served by `index.html` (SPA fallback)

---

## 🔑 API Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/status` | No | Check if setup is complete |
| `POST` | `/api/setup` | No | Initialize players, rules & anchor date |
| `POST` | `/api/login` | No | Login and receive JWT token |
| `GET` | `/api/users` | No | Get list of all players |
| `GET` | `/api/contests` | No | Get all manual contests |
| `POST` | `/api/contests` | ✅ Yes | Add a new manual contest |
| `POST` | `/api/points` | ✅ Yes | Submit daily points for the logged-in user |
| `GET` | `/api/points/history` | No | Get full points history |
| `GET` | `/api/leaderboard` | No | Get overall & current session leaderboard |

---

## 📄 License

This project is open source. Feel free to fork and build your own CP duel system!
