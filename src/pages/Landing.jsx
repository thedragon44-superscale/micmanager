import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMic } from '../MicContext';
import ProfileCard from '../components/ProfileCard';

export default function Landing() {
  const navigate = useNavigate();
  const { queue, myComicProfile, market } = useMic();
  const [showRoster, setShowRoster] = useState(false);
  const [selectedComicId, setSelectedComicId] = useState(null);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/events/today?market=${market}`)
      .then(res => res.json())
      .then(data => setEvents(data))
      .catch(err => console.error(err));
  }, [market]);

  const activeQueue = queue.filter(c => c.status !== 'completed');
  const amIOnList = myComicProfile && activeQueue.some(c => c.id === myComicProfile.id);

  const handleActionClick = () => {
    if (amIOnList) {
      navigate('/ticket');
    } else {
      navigate('/signup');
    }
  };

  return (
    <div className="p-4 sm:p-5 flex flex-col gap-5 animate-fade-in max-w-md mx-auto w-full">
      
      {/* PAGE TITLE */}
      <div className="flex justify-between items-end border-b border-slate-800/80 pb-3 mt-1">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            <span className="text-[10px] font-mono-data uppercase tracking-widest text-blue-400 font-bold">Radar Active</span>
          </div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tight font-display">Tonight's Mics</h1>
        </div>
      </div>

      {/* EVENTS / MICS LIST */}
      <div className="flex flex-col gap-4">
        {events.length === 0 ? (
          <div className="text-center text-slate-500 py-12 font-mono-data text-xs uppercase tracking-widest border border-dashed border-slate-800 rounded-2xl bg-slate-950/50">
            No active mics in {market.replace('_', ' ')} today.
          </div>
        ) : (
          events.map(event => {
            const isActive = event.status === 'active';
            
            return (
              <div 
                key={event.id} 
                className={`relative rounded-2xl p-5 transition-all duration-300 ${
                  isActive 
                    ? 'bg-slate-900/90 border border-blue-500/30 glow-blue' 
                    : 'bg-slate-900/40 border border-slate-800/80 opacity-70'
                }`}
              >
                {isActive && (
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
                )}

                <div className="flex justify-between items-start gap-3 relative z-10 mb-3">
                  <div>
                    <h3 className="font-display text-xl font-bold text-white tracking-wide">{event.name}</h3>
                    <p className="text-xs text-slate-400 font-medium flex items-center gap-1.5 mt-0.5">
                      <i className="fa-solid fa-location-dot text-blue-400 text-[10px]"></i> {event.venue}
                    </p>
                  </div>

                  <span className={`text-[9px] font-mono-data font-black px-2.5 py-1 rounded-md border uppercase tracking-widest shrink-0 ${
                    isActive 
                      ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]' 
                      : 'bg-slate-800/80 text-slate-400 border-slate-700/50'
                  }`}>
                    {isActive ? '● Live Signups' : event.status}
                  </span>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between relative z-10">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-slate-800/80 border border-slate-700/50 flex items-center justify-center text-slate-400">
                      <i className="fa-solid fa-users text-xs"></i>
                    </div>
                    <div>
                      <span className="text-sm font-black font-mono-data text-white">{activeQueue.length}</span>
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block -mt-1">On List</span>
                    </div>
                  </div>

                  {isActive && (
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setShowRoster(true)}
                        className="bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border border-slate-700/60"
                      >
                        Roster
                      </button>
                      <button 
                        onClick={handleActionClick}
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg ${
                          amIOnList 
                            ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-950/50' 
                            : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-950/50 glow-blue'
                        }`}
                      >
                        {amIOnList ? 'My Ticket' : 'Sign Up'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* HOST PORTAL CARD */}
      <div 
        onClick={() => navigate('/host')}
        className="mt-1 bg-slate-900/60 border border-amber-500/20 hover:border-amber-500/40 rounded-2xl p-4 flex justify-between items-center group cursor-pointer active:scale-95 transition-all shadow-lg"
      >
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0 group-hover:bg-amber-500/20 transition-colors">
            <i className="fa-solid fa-key text-amber-400 text-sm"></i>
          </div>
          <div>
            <h3 className="text-xs font-black text-slate-200 uppercase tracking-widest group-hover:text-amber-400 transition-colors font-display">Host Portal</h3>
            <p className="text-[10px] text-slate-500 font-mono-data uppercase tracking-wider mt-0.5">Manage Stage & Clock In</p>
          </div>
        </div>
        <div className="w-7 h-7 rounded-full bg-slate-950 flex items-center justify-center border border-slate-800 group-hover:border-amber-500/40 transition-colors">
          <i className="fa-solid fa-arrow-right text-slate-500 text-[10px] group-hover:text-amber-400 transition-colors"></i>
        </div>
      </div>

      {/* PUBLIC ROSTER MODAL */}
      {showRoster && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowRoster(false)}>
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl w-full max-w-sm flex flex-col max-h-[80vh] shadow-2xl" onClick={e => e.stopPropagation()}>
            
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-black text-white uppercase tracking-tight font-display">Live Roster</h3>
                <p className="text-[10px] text-slate-400 font-mono-data uppercase">{activeQueue.length} Comics Checked In</p>
              </div>
              <button onClick={() => setShowRoster(false)} className="text-slate-500 hover:text-white font-bold text-lg p-1">✕</button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {activeQueue.length === 0 ? (
                <div className="text-center text-slate-500 py-8 font-mono-data text-xs uppercase">The list is empty.</div>
              ) : (
                activeQueue.map((comic, idx) => {
                  const isMe = myComicProfile && myComicProfile.id === comic.id;
                  
                  let badge = null;
                  if (comic.status === 'on_stage') {
                    badge = <span className="text-[9px] bg-red-500/20 text-red-400 border border-red-500/40 font-black px-2 py-0.5 rounded uppercase tracking-widest animate-pulse">On Stage</span>;
                  } else if (comic.status === 'on_deck') {
                    badge = <span className="text-[9px] bg-amber-500/20 text-amber-400 border border-amber-500/40 font-black px-2 py-0.5 rounded uppercase tracking-widest">On Deck</span>;
                  }

                  return (
                    <div key={comic.id} className={`p-3 rounded-xl border flex justify-between items-center transition-all ${isMe ? 'bg-blue-950/30 border-blue-500/50 glow-blue' : 'bg-slate-950 border-slate-800/80'}`}>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono-data font-bold text-slate-600 w-5">{(idx + 1).toString().padStart(2, '0')}</span>
                        <button 
                          onClick={() => setSelectedComicId(comic.id)} 
                          className={`font-bold text-sm hover:text-blue-400 transition-colors text-left ${isMe ? 'text-blue-400 font-extrabold' : 'text-slate-200'}`}
                        >
                          {comic.name} {isMe && '(You)'}
                        </button>
                      </div>
                      {badge}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* PROFILE CARD MODAL */}
      {selectedComicId && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-sm my-auto animate-fade-in flex justify-center">
            <ProfileCard 
              userId={selectedComicId} 
              currentUserId={myComicProfile?.id} 
              onClose={() => setSelectedComicId(null)} 
            />
          </div>
        </div>
      )}
    </div>
  );
}
