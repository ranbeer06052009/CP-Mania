import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  format, parseISO, startOfMonth, endOfMonth, startOfWeek, endOfWeek, 
  eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, formatDistanceToNow
} from 'date-fns';
import { Calendar, Clock, Plus, ChevronLeft, ChevronRight, LayoutList, CalendarDays, ExternalLink, Trophy } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '';

const ContestTracker = () => {
  const [contests, setContests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('calendar'); // 'calendar' or 'list'
  
  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // Modals state
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedContest, setSelectedContest] = useState(null);
  
  const [newContest, setNewContest] = useState({ name: '', platform: '', start_time: '', duration: '' });

  useEffect(() => {
    fetchContests();
  }, []);

  const fetchContests = async () => {
    setLoading(true);
    try {
      let publicContests = [];
      try {
        const response = await axios.get('/api/public-contests?upcoming=true', { timeout: 10000 });
        const allowedPlatforms = ['codeforces', 'leetcode', 'codechef', 'atcoder'];
        publicContests = response.data.filter(c => allowedPlatforms.includes(c.platform.toLowerCase()));
      } catch (err) {
        console.warn("Public API failed or timed out, skipping...", err.message);
      }
      
      const formattedPublic = publicContests.map(c => ({
        id: c.id || c.name + c.start_time,
        name: c.name,
        platform: c.platform.toLowerCase(),
        start_time: c.start_time,
        duration: c.duration_minutes * 60,
        url: c.url
      }));

      // Fetch Manual Contests from backend
      const manualRes = await axios.get(`${API_URL}/api/contests`);
      const manualContests = manualRes.data.map(c => ({
        ...c,
        id: `manual-${c.id}`,
        platform: c.platform.toLowerCase() || 'manual',
        duration: c.duration * 3600, // DB has hours, convert to seconds
        url: '#'
      }));

      // Merge and sort
      const merged = [...formattedPublic, ...manualContests].sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
      
      setContests(merged);
    } catch (error) {
      console.error('Failed to fetch contests', error);
    }
    setLoading(false);
  };

  const handleAddManual = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/api/contests`, newContest);
      setManualModalOpen(false);
      setNewContest({ name: '', platform: '', start_time: '', duration: '' });
      fetchContests();
    } catch (error) {
      console.error('Error adding contest', error);
    }
  };

  const getPlatformColor = (platform) => {
    const p = platform.toLowerCase();
    if (p.includes('codeforces')) return 'var(--codeforces)';
    if (p.includes('leetcode')) return 'var(--leetcode)';
    if (p.includes('codechef')) return 'var(--codechef)';
    if (p.includes('atcoder')) return 'var(--atcoder)';
    return 'var(--manual)';
  };

  const openDetails = (contest) => {
    setSelectedContest(contest);
    setDetailsModalOpen(true);
  };

  // Calendar Logic
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  const dateFormat = "d";
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const upcomingContests = contests.filter(c => new Date(c.start_time) >= new Date()).slice(0, 10);

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2>Contest Tracker</h2>
        <div className="flex gap-4">
          <button onClick={() => setManualModalOpen(true)} className="flex items-center gap-2">
            <Plus size={18} /> Add Manual
          </button>
          
          <div className="flex" style={{ background: 'var(--border)', borderRadius: '6px', padding: '2px' }}>
            <button 
              className={viewMode === 'calendar' ? 'active' : ''} 
              style={{ border: 'none', background: viewMode === 'calendar' ? 'rgba(255,255,255,0.1)' : 'transparent' }}
              onClick={() => setViewMode('calendar')}
            >
              <CalendarDays size={18} />
            </button>
            <button 
              className={viewMode === 'list' ? 'active' : ''} 
              style={{ border: 'none', background: viewMode === 'list' ? 'rgba(255,255,255,0.1)' : 'transparent' }}
              onClick={() => setViewMode('list')}
            >
              <LayoutList size={18} />
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <p>Loading contests...</p>
      ) : (
        <>
          {viewMode === 'calendar' ? (
            <div className="tracker-layout">
              {/* Left: Full Calendar */}
              <div className="calendar-container">
                <div className="calendar-header">
                  <h3 style={{ margin: 0 }}>{format(currentMonth, 'MMMM yyyy')}</h3>
                  <div className="flex gap-2">
                    <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} style={{ padding: '0.25rem 0.5rem' }}><ChevronLeft size={20}/></button>
                    <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} style={{ padding: '0.25rem 0.5rem' }}><ChevronRight size={20}/></button>
                  </div>
                </div>

                <div className="calendar-grid">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="calendar-day-header">{day}</div>
                  ))}
                  
                  {days.map((day, i) => {
                    const dayContests = contests.filter(c => isSameDay(new Date(c.start_time), day));
                    
                    return (
                      <div 
                        key={i} 
                        className={`calendar-cell ${!isSameMonth(day, monthStart) ? 'different-month' : ''} ${isSameDay(day, new Date()) ? 'today' : ''}`}
                      >
                        <div className="date-number">{format(day, dateFormat)}</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          {dayContests.map(c => (
                            <div 
                              key={c.id} 
                              className="contest-badge" 
                              style={{ backgroundColor: getPlatformColor(c.platform) }}
                              onClick={() => openDetails(c)}
                            >
                              <Trophy size={10} /> {c.name}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right: Upcoming Sidebar */}
              <div className="upcoming-sidebar">
                <div className="upcoming-header">
                  Upcoming Contests
                </div>
                <div className="upcoming-list">
                  {upcomingContests.map(c => {
                    const date = new Date(c.start_time);
                    return (
                      <div key={c.id} className="upcoming-item" style={{ cursor: 'pointer' }} onClick={() => openDetails(c)}>
                        <div className="upcoming-date-box">
                          <div className="month">{format(date, 'MMM')}</div>
                          <div className="day">{format(date, 'd')}</div>
                        </div>
                        <div className="upcoming-info">
                          <h4 style={{ margin: 0, fontSize: '0.85rem' }}>{c.name}</h4>
                          <p>
                            <span className="platform-dot" style={{ backgroundColor: getPlatformColor(c.platform) }}></span>
                            <span style={{ textTransform: 'capitalize' }}>{c.platform}</span> • {formatDistanceToNow(date, { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* List View */
            <div className="grid-2">
              {upcomingContests.map((contest, idx) => (
                <div key={idx} className="card glass glass-hover" onClick={() => openDetails(contest)} style={{ cursor: 'pointer' }}>
                  <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>{contest.name}</h3>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="platform-dot" style={{ backgroundColor: getPlatformColor(contest.platform) }}></span>
                    <span style={{ color: 'var(--text-bright)', fontWeight: '600', textTransform: 'capitalize' }}>{contest.platform}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', color: 'var(--text-main)', fontSize: '0.9rem' }}>
                    <div className="flex items-center gap-2">
                      <Calendar size={16} />
                      <span>{new Date(contest.start_time).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock size={16} />
                      <span>{Math.floor(contest.duration / 3600)} hours</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Manual Add Modal */}
      {manualModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="glass" style={{ padding: '2rem', width: '400px' }}>
            <h3 className="mb-4">Add Manual Contest</h3>
            <form onSubmit={handleAddManual}>
              <div className="form-group">
                <label>Contest Name</label>
                <input type="text" value={newContest.name} onChange={e => setNewContest({...newContest, name: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Platform</label>
                <input type="text" value={newContest.platform} onChange={e => setNewContest({...newContest, platform: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Start Time</label>
                <input type="datetime-local" value={newContest.start_time} onChange={e => setNewContest({...newContest, start_time: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Duration (in hours)</label>
                <input type="number" step="0.5" value={newContest.duration} onChange={e => setNewContest({...newContest, duration: e.target.value})} required />
              </div>
              <div className="flex gap-4 mt-4">
                <button type="submit" style={{ flex: 1, backgroundColor: 'var(--accent-dark)', color: 'white' }}>Add</button>
                <button type="button" onClick={() => setManualModalOpen(false)} style={{ flex: 1 }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Contest Details Modal */}
      {detailsModalOpen && selectedContest && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="glass" style={{ padding: '2rem', width: '450px', position: 'relative' }}>
            <button 
              onClick={() => setDetailsModalOpen(false)} 
              style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', fontSize: '1.5rem', padding: 0 }}
            >
              &times;
            </button>
            
            <div className="flex items-center gap-2 mb-4">
               <span className="platform-dot" style={{ backgroundColor: getPlatformColor(selectedContest.platform), width: '12px', height: '12px' }}></span>
               <h3 style={{ margin: 0 }}>{selectedContest.platform.toUpperCase()}</h3>
            </div>
            
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', color: '#fff' }}>{selectedContest.name}</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
              <div className="flex items-center gap-3">
                <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                  <Calendar size={24} color="var(--accent)" />
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-main)' }}>Start Time</div>
                  <div style={{ fontWeight: '500', color: '#fff' }}>{new Date(selectedContest.start_time).toLocaleString()}</div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                  <Clock size={24} color="var(--accent)" />
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-main)' }}>Duration</div>
                  <div style={{ fontWeight: '500', color: '#fff' }}>{Math.floor(selectedContest.duration / 3600)} hours</div>
                </div>
              </div>
            </div>

            {selectedContest.url && selectedContest.url !== '#' && (
              <a 
                href={selectedContest.url} 
                target="_blank" 
                rel="noreferrer" 
                style={{ 
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', 
                  width: '100%', padding: '1rem', background: 'var(--accent-dark)', 
                  color: 'white', borderRadius: '8px', fontWeight: '600' 
                }}
              >
                Go to Contest <ExternalLink size={18} />
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ContestTracker;
