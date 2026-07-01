import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Award, Zap, Crosshair, Calendar, List, ChevronRight, Trophy } from 'lucide-react';

const RulesLeaderboard = () => {
  const [loading, setLoading] = useState(true);
  const [setupComplete, setSetupComplete] = useState(null);
  
  // Setup State
  const [setupData, setSetupData] = useState({
    player1: '', player2: '', password: '', 
    anchorDate: new Date().toISOString().split('T')[0],
    rules: [
      { text: "Series Duration: Every 2 weeks" },
      { text: "Prize: Winner gets 20 rupees from the loser (Draw = no one pays)" },
      { text: "No AI Rule: Use of AI is PROHIBITED. Cross-questioning is expected." },
      { text: "Upsolve Bounds: CodeChef (6), LeetCode (All), AtCoder (E), Codeforces (D/E)" }
    ]
  });

  // Auth State
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loginForm, setLoginForm] = useState({ name: '', password: '' });
  
  // Leaderboard & Points State
  const [leaderboard, setLeaderboard] = useState({ overall: {}, current: {} });
  const [currentSessionStart, setCurrentSessionStart] = useState('');
  const [rules, setRules] = useState([]);
  const [pointsHistory, setPointsHistory] = useState([]);
  
  // Modals
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [dailyForm, setDailyForm] = useState({
    date: new Date().toISOString().split('T')[0],
    gaveContest: 0, // +2
    missedContest: 0, // -2
    solvedWithinBound: 0, // +1
    solvedAboveBound: 0, // +2
    explainedSolution: 0, // +2
    practiceSolves: 0 // +1
  });
  const [allUsers, setAllUsers] = useState([]);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const res = await axios.get('/api/status');
      setSetupComplete(res.data.setupComplete);
      if (res.data.setupComplete) {
        setRules(res.data.rules);
        fetchLeaderboard();
        
        // Fetch users for login dropdown and leaderboard display
        const userRes = await axios.get('/api/users');
        setAllUsers(userRes.data.map(u => u.name));
      } else {
        localStorage.removeItem('cpmania_token');
        localStorage.removeItem('cpmania_user');
      }
      
      const token = localStorage.getItem('cpmania_token');
      const user = localStorage.getItem('cpmania_user');
      if (token && user) {
        setIsLoggedIn(true);
        setCurrentUser(JSON.parse(user));
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const fetchLeaderboard = async () => {
    try {
      const res = await axios.get('/api/leaderboard');
      setLeaderboard(res.data.leaderboard);
      setCurrentSessionStart(res.data.currentSessionStart);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await axios.get('/api/points/history');
      setPointsHistory(res.data);
      setShowHistoryModal(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSetup = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/setup', setupData);
      setSetupComplete(true);
      setRules(setupData.rules);
      fetchLeaderboard();
    } catch (err) {
      alert("Failed to setup: " + err.response?.data?.error);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/login', loginForm);
      localStorage.setItem('cpmania_token', res.data.token);
      localStorage.setItem('cpmania_user', JSON.stringify(res.data.user));
      setIsLoggedIn(true);
      setCurrentUser(res.data.user);
    } catch (err) {
      alert("Login failed: " + err.response?.data?.error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('cpmania_token');
    localStorage.removeItem('cpmania_user');
    setIsLoggedIn(false);
    setCurrentUser(null);
  };

  const calculateDailyPoints = () => {
    return (dailyForm.gaveContest * 2) 
         + (dailyForm.missedContest * -2) 
         + (dailyForm.solvedWithinBound * 1) 
         + (dailyForm.solvedAboveBound * 2) 
         + (dailyForm.explainedSolution * 2) 
         + (dailyForm.practiceSolves * 1);
  };

  const handleSubmitPoints = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('cpmania_token');
    const total_points = calculateDailyPoints();
    const details = { ...dailyForm };
    delete details.date; // Keep details clean
    
    try {
      await axios.post('/api/points', {
        date: dailyForm.date,
        total_points,
        details
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowSubmitModal(false);
      fetchLeaderboard();
    } catch (err) {
      alert("Failed to submit points: " + err.response?.data?.error);
    }
  };

  if (loading) return <p>Loading...</p>;

  // --- SETUP ONBOARDING ---
  if (!setupComplete) {
    return (
      <div className="glass p-8" style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
        <h2 className="mb-4 text-accent">Welcome to Battle Mania!</h2>
        <p className="mb-4">It looks like this is your first time here. Let's set up your group.</p>
        <form onSubmit={handleSetup}>
          <div className="grid-2">
            <div className="form-group">
              <label>Player 1 Name</label>
              <input type="text" required value={setupData.player1} onChange={e => setSetupData({...setupData, player1: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Player 2 Name</label>
              <input type="text" required value={setupData.player2} onChange={e => setSetupData({...setupData, player2: e.target.value})} />
            </div>
          </div>
          <div className="form-group">
            <label>Shared Password (Required to submit points)</label>
            <input type="password" required value={setupData.password} onChange={e => setSetupData({...setupData, password: e.target.value})} />
          </div>
          <div className="form-group">
            <label>Competition Start Date (Anchor Date for 2-week sessions - should be a Wednesday)</label>
            <input type="date" required value={setupData.anchorDate} onChange={e => setSetupData({...setupData, anchorDate: e.target.value})} />
          </div>
          <button type="submit" style={{ width: '100%', marginTop: '1rem', background: 'var(--accent)', color: 'black' }}>Complete Setup</button>
        </form>
      </div>
    );
  }

  // --- MAIN DASHBOARD ---
  const users = allUsers;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2>Battle Mania Leaderboards</h2>
        <div>
          {!isLoggedIn ? (
            <form className="flex gap-2" onSubmit={handleLogin}>
              <select className="form-group" style={{ marginBottom: 0, padding: '0.5rem' }} value={loginForm.name} onChange={e => setLoginForm({...loginForm, name: e.target.value})} required>
                <option value="">Select User</option>
                {users.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
              <input type="password" placeholder="Password" style={{ padding: '0.5rem', background: '#010409', border: '1px solid var(--border)', color: '#fff', borderRadius: '4px' }} value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} required />
              <button type="submit">Login</button>
            </form>
          ) : (
            <div className="flex items-center gap-4">
              <span style={{ color: 'var(--success)' }}>Logged in as <b>{currentUser.name}</b></span>
              <button onClick={() => setShowSubmitModal(true)} className="flex items-center gap-2 bg-accent"><Zap size={16}/> Submit Daily Points</button>
              <button onClick={handleLogout} className="outline">Logout</button>
            </div>
          )}
        </div>
      </div>

      <div className="grid-2 mb-4">
        {/* Current Session Leaderboard */}
        <div className="card glass">
          <h3 className="flex items-center gap-2 mb-4" style={{ color: 'var(--leetcode)' }}>
            <Calendar size={24} /> Current 2-Week Session
          </h3>
          <p className="mb-4" style={{ fontSize: '0.8rem', color: 'var(--text-main)' }}>
            Started: {currentSessionStart ? new Date(currentSessionStart).toLocaleDateString() : 'Loading...'}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {users.map(user => (
              <div key={user} className="flex justify-between items-center" style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                <div className="flex items-center gap-3">
                  <Award color="var(--leetcode)" />
                  <span style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-bright)' }}>{user}</span>
                </div>
                <div className="stat-value" style={{ color: 'var(--leetcode)', fontSize: '2rem' }}>{leaderboard.current[user] || 0}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Overall Leaderboard */}
        <div className="card glass">
          <h3 className="flex justify-between items-center mb-4" style={{ color: 'var(--codeforces)' }}>
            <div className="flex items-center gap-2"><Trophy size={24} /> Overall Standings</div>
            <button onClick={fetchHistory} className="outline" style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <List size={14}/> Points History
            </button>
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '3rem' }}>
            {users.map(user => (
              <div key={user} className="flex justify-between items-center" style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                <div className="flex items-center gap-3">
                  <Award color="var(--codeforces)" />
                  <span style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-bright)' }}>{user}</span>
                </div>
                <div className="stat-value" style={{ color: 'var(--codeforces)', fontSize: '2rem' }}>{leaderboard.overall[user] || 0}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card glass mt-4">
        <h3 className="mb-4 flex items-center gap-2"><Crosshair size={24} color="var(--danger)"/> Group Rules</h3>
        <div style={{ lineHeight: '1.6', color: 'var(--text-main)' }}>
          <ul style={{ paddingLeft: '1.5rem' }}>
            {rules.map((rule, idx) => (
              <li key={idx} className="mb-1">{rule.text}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Submit Daily Points Modal */}
      {showSubmitModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="glass" style={{ padding: '2rem', width: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 className="mb-4">Submit Daily Points - {currentUser.name}</h3>
            <p className="mb-4" style={{ fontSize: '0.85rem', color: 'var(--text-main)' }}>Note: Submitting multiple times for the same date will UPDATE your record for that day.</p>
            <form onSubmit={handleSubmitPoints}>
              <div className="form-group">
                <label>Date</label>
                <input type="date" value={dailyForm.date} onChange={e => setDailyForm({...dailyForm, date: e.target.value})} required />
              </div>
              
              <div className="grid-2">
                <div className="form-group">
                  <label>Gave Contests (+2 each)</label>
                  <input type="number" min="0" value={dailyForm.gaveContest} onChange={e => setDailyForm({...dailyForm, gaveContest: parseInt(e.target.value) || 0})} />
                </div>
                <div className="form-group">
                  <label>Missed Contests (-2 each)</label>
                  <input type="number" min="0" value={dailyForm.missedContest} onChange={e => setDailyForm({...dailyForm, missedContest: parseInt(e.target.value) || 0})} />
                </div>
              </div>
              
              <div className="grid-2">
                <div className="form-group">
                  <label>Solved Within Bounds (+1 each)</label>
                  <input type="number" min="0" value={dailyForm.solvedWithinBound} onChange={e => setDailyForm({...dailyForm, solvedWithinBound: parseInt(e.target.value) || 0})} />
                </div>
                <div className="form-group">
                  <label>Solved Above Bounds (+2 each)</label>
                  <input type="number" min="0" value={dailyForm.solvedAboveBound} onChange={e => setDailyForm({...dailyForm, solvedAboveBound: parseInt(e.target.value) || 0})} />
                </div>
              </div>
              
              <div className="grid-2">
                <div className="form-group">
                  <label>Explained Solution (+2 each)</label>
                  <input type="number" min="0" value={dailyForm.explainedSolution} onChange={e => setDailyForm({...dailyForm, explainedSolution: parseInt(e.target.value) || 0})} />
                </div>
                <div className="form-group">
                  <label>Practice Solves (+1 each)</label>
                  <input type="number" min="0" value={dailyForm.practiceSolves} onChange={e => setDailyForm({...dailyForm, practiceSolves: parseInt(e.target.value) || 0})} />
                </div>
              </div>
              
              <div className="mb-4" style={{ padding: '1rem', background: 'rgba(88, 166, 255, 0.1)', borderRadius: '6px', textAlign: 'center' }}>
                <span style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--accent)' }}>Total Points for Today: {calculateDailyPoints()}</span>
              </div>
              
              <div className="flex gap-4">
                <button type="submit" style={{ flex: 1, backgroundColor: 'var(--accent-dark)', color: 'white' }}>Submit</button>
                <button type="button" className="outline" onClick={() => setShowSubmitModal(false)} style={{ flex: 1 }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Points History Modal */}
      {showHistoryModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="glass" style={{ padding: '2rem', width: '600px', maxHeight: '80vh', overflowY: 'auto', position: 'relative' }}>
            <button onClick={() => setShowHistoryModal(false)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', fontSize: '1.5rem', padding: 0 }}>&times;</button>
            <h3 className="mb-4">Battle Mania Points History</h3>
            
            {pointsHistory.length === 0 ? (
              <p>No points submitted yet!</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {pointsHistory.map(entry => (
                  <details key={entry.id} style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px', cursor: 'pointer' }}>
                    <summary className="flex justify-between items-center" style={{ listStyle: 'none' }}>
                      <div className="flex items-center gap-4">
                        <div style={{ background: 'var(--border)', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.85rem' }}>{new Date(entry.date).toLocaleDateString()}</div>
                        <div style={{ fontWeight: 600, color: 'var(--text-bright)' }}>{entry.user_name}</div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div style={{ color: entry.total_points >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 'bold' }}>
                          {entry.total_points > 0 ? '+' : ''}{entry.total_points} pts
                        </div>
                        <ChevronRight size={16} color="var(--text-main)" />
                      </div>
                    </summary>
                    
                    <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)', fontSize: '0.9rem', color: 'var(--text-main)' }}>
                      <div className="grid-2">
                        <div>Gave Contests: {entry.details.gaveContest || 0}</div>
                        <div>Missed Contests: {entry.details.missedContest || 0}</div>
                        <div>Solved (Within Bounds): {entry.details.solvedWithinBound || 0}</div>
                        <div>Solved (Above Bounds): {entry.details.solvedAboveBound || 0}</div>
                        <div>Explained Solutions: {entry.details.explainedSolution || 0}</div>
                        <div>Practice Solves: {entry.details.practiceSolves || 0}</div>
                      </div>
                    </div>
                  </details>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RulesLeaderboard;
