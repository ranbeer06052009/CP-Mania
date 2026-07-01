import React from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Trophy, Code2, ScrollText, Users } from 'lucide-react';
import ContestTracker from './pages/ContestTracker';
import RulesLeaderboard from './pages/RulesLeaderboard';

const Layout = ({ children }) => {
  const location = useLocation();

  return (
    <div className="app-container">
      <aside className="sidebar glass">
        <div className="sidebar-brand">
          <Code2 size={32} />
          CP Mania
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>
            <Trophy size={20} />
            Contest Tracker
          </Link>
          <Link to="/rules" className={`nav-link ${location.pathname === '/rules' ? 'active' : ''}`}>
            <ScrollText size={20} />
            Rules & Leaderboard
          </Link>
        </nav>
      </aside>
      <main className="main-content">
        {children}
      </main>
    </div>
  );
};

const App = () => {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<ContestTracker />} />
          <Route path="/rules" element={<RulesLeaderboard />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
};

export default App;
