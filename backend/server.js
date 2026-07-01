require('dotenv').config({ override: true });
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-for-cp-mania';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/battlemania';

// --- Mongoose Setup & Schemas ---
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB Battle Mania.'))
  .catch(err => console.error('MongoDB connection error:', err));

const UserSchema = new mongoose.Schema({
  name: { type: String, unique: true, required: true },
  password: { type: String, required: true }
});
const User = mongoose.model('User', UserSchema);

const SettingSchema = new mongoose.Schema({
  anchor_date: String,
  rules: String
});
const Setting = mongoose.model('Setting', SettingSchema);

const ManualContestSchema = new mongoose.Schema({
  name: String,
  platform: String,
  start_time: String,
  duration: Number
});
const ManualContest = mongoose.model('ManualContest', ManualContestSchema);

const DailyPointSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  user_name: String, // Stored for easy access without population everywhere
  date: String,
  total_points: Number,
  details: mongoose.Schema.Types.Mixed
});
// Ensure uniqueness per user per date
DailyPointSchema.index({ user_id: 1, date: 1 }, { unique: true });
const DailyPoint = mongoose.model('DailyPoint', DailyPointSchema);

// Middleware for JWT Auth
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.sendStatus(401);
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// --- AUTH & SETUP ---

app.get('/api/status', async (req, res) => {
  try {
    const setting = await Setting.findOne();
    if (!setting) return res.json({ setupComplete: false });
    res.json({ setupComplete: true, rules: JSON.parse(setting.rules || "[]"), anchorDate: setting.anchor_date });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/setup', async (req, res) => {
  try {
    const { player1, player2, password, anchorDate, rules } = req.body;
    
    const existing = await Setting.findOne();
    if (existing) return res.status(400).json({ error: 'Already setup' });
    
    const hash = await bcrypt.hash(password, 10);
    
    await Setting.create({ anchor_date: anchorDate, rules: JSON.stringify(rules) });
    await User.create({ name: player1, password: hash });
    await User.create({ name: player2, password: hash });
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { name, password } = req.body;
    const user = await User.findOne({ name });
    if (!user) return res.status(401).json({ error: 'User not found' });
    
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid password' });
    
    const token = jwt.sign({ id: user._id, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, name: user.name } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}, 'name _id');
    const formatted = users.map(u => ({ id: u._id, name: u.name }));
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- POINTS ---

app.post('/api/points', authenticateToken, async (req, res) => {
  try {
    const { date, total_points, details } = req.body;
    const user_id = req.user.id;
    const user_name = req.user.name;
    
    await DailyPoint.findOneAndUpdate(
      { user_id, date },
      { total_points, details, user_name },
      { upsert: true, new: true }
    );
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/points/history', async (req, res) => {
  try {
    const points = await DailyPoint.find().sort({ date: -1 });
    // Transform to match existing frontend expectations
    const formatted = points.map(p => ({
      id: p._id,
      user_id: p.user_id,
      user_name: p.user_name,
      date: p.date,
      total_points: p.total_points,
      details: p.details
    }));
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Calculate Leaderboards (Overall and Current Session)
app.get('/api/leaderboard', async (req, res) => {
  try {
    const setting = await Setting.findOne();
    if (!setting) return res.status(500).json({ error: 'No setup found' });
    
    const pointsData = await DailyPoint.find();
    
    const anchor = new Date(setting.anchor_date); // Should be a Wednesday
    const now = new Date();
    
    const msInWeek = 7 * 24 * 60 * 60 * 1000;
    const msInSession = 2 * msInWeek;
    const diffMs = now.getTime() - anchor.getTime();
    
    let currentSessionStart;
    if (diffMs < 0) {
      currentSessionStart = anchor;
    } else {
      const sessionsPassed = Math.floor(diffMs / msInSession);
      currentSessionStart = new Date(anchor.getTime() + (sessionsPassed * msInSession));
    }
    
    const leaderboard = { overall: {}, current: {} };
    
    pointsData.forEach(p => {
      const name = p.user_name;
      if (!leaderboard.overall[name]) leaderboard.overall[name] = 0;
      if (!leaderboard.current[name]) leaderboard.current[name] = 0;
      
      leaderboard.overall[name] += p.total_points;
      
      const pointDate = new Date(p.date);
      if (pointDate >= currentSessionStart) {
        leaderboard.current[name] += p.total_points;
      }
    });
    
    res.json({
      currentSessionStart: currentSessionStart.toISOString(),
      leaderboard
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- CONTESTS ---
app.get('/api/contests', async (req, res) => {
  try {
    const contests = await ManualContest.find();
    const formatted = contests.map(c => ({
      id: c._id, name: c.name, platform: c.platform, start_time: c.start_time, duration: c.duration
    }));
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/contests', authenticateToken, async (req, res) => {
  try {
    const { name, platform, start_time, duration } = req.body;
    const newContest = await ManualContest.create({ name, platform, start_time, duration });
    res.json({ id: newContest._id, name, platform, start_time, duration });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
