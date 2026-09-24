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
    fetch(`http://127.0.0.1:8000/events/today?market=${market}`)
      .then(res => res.json())
      .then(data => setEvents(data))
      .catch(err => console.error(err));
  }, [market]);

  // Filter out completed comics to show the true active list length
  const activeQueue = queue.filter(c => c.status !== 'completed');
  
  // Verify the user is actually in the live queue, not just stuck in local storage
  const amIOnList = myComicProfile && activeQueue.some(c => c.id === myComicProfile.id);

  const handleActionClick = () => {
    if (amIOnList) {
      navigate('/ticket');
    } else {
      navigate('/signup');
    }
  };

  return (
    <div className="p-4 sm:p-6 flex flex-col gap-5 animate-fade-in">
      <div className="mb-2">
        <h2 className="text-2xl font-black text-slate-100 uppercase tracking-tight">Tonight's Mics</h2>
        <p className="text-xs text-slate-400 font-medium mt-1 capitalize">{market.replace('_', ' ')} • Radar Active</p>
      </div>

      {/* EVENTS LIST */}
      {events.length === 0 ? (
        <div className="text-center text-slate-500 py-10 font-mono text-xs uppercase tracking-widest border border-slate-800 rounded-2xl bg-slate-900/30">
          No mics scheduled for today.
        </div>
      ) : (
        events.map(event => {
          if (event.status === 'active') {
            return (
              <div key={event.id} className="bg-slate-900 rounded-2xl p-5 border border-slate-700 shadow-xl relative overflow-hidden group mb-4">
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl pointer-events-none transition-all group-hover:bg-blue-500/20" />
                
                <div className="flex justify-between items-start mb-3 relative z-10">
                  <div>
                    <h3 className="font-bold text-lg text-white">{event.name}</h3>
                    <p className="text-xs font-mono text-slate-400 mt-1"><i className="fa-solid fa-location-dot mr-1"></i> {event.venue}</p>
                  </div>
                  <span className="bg-emerald-950 text-emerald-400 text-[10px] font-black px-2.5 py-1 rounded-md border border-emerald-900/50 uppercase tracking-widest shadow-sm">
                    Signups Open
                  </span>
                </div>
                
                <div className="mt-5 flex justify-between items-center border-t border-slate-800 pt-4 relative z-10">
                  <span className="text-xs font-bold text-slate-400">
                    <i className="fa-solid fa-users mr-1"></i> {activeQueue.length} on list
                  </span>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setShowRoster(true)}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-2 rounded-lg text-xs font-bold transition-colors border border-slate-600 shadow-sm"
                    >
                      View List
                    </button>
                    <button 
                      onClick={handleActionClick}
                      className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-lg shadow-blue-900/50 active:scale-95"
                    >
                      {amIOnList ? 'View Ticket' : 'Sign Up'}
                    </button>
                  </div>
                </div>
              </div>
            );
          } else {
            return (
              <div key={event.id} className="bg-slate-900/50 rounded-2xl p-5 border border-slate-800 opacity-60 mb-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-bold text-lg text-slate-300">{event.name}</h3>
                    <p className="text-xs font-mono text-slate-500 mt-1"><i className="fa-solid fa-location-dot mr-1"></i> {event.venue}</p>
                  </div>
                  <span className="bg-slate-800 text-slate-400 text-[10px] font-black px-2.5 py-1 rounded-md uppercase tracking-widest">
                    {event.status === 'scheduled' ? 'Scheduled' : 'Ended'}
                  </span>
                </div>
              </div>
            );
          }
        })
      )}

      {/* PUBLIC ROSTER MODAL */}
      {showRoster && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowRoster(false)}>
          <div className="bg-slate-900 border border-slate-700 p-5 rounded-2xl w-full max-w-sm flex flex-col max-h-[75vh] shadow-2xl" onClick={e => e.stopPropagation()}>
            
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-800">
              <h3 className="text-sm font-black text-slate-200 uppercase tracking-widest">Public Roster</h3>
              <button onClick={() => setShowRoster(false)} className="text-slate-500 hover:text-white font-bold text-lg transition-colors">✕</button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {activeQueue.length === 0 ? (
                <div className="text-center text-slate-500 py-8 font-mono text-xs uppercase">The list is empty.</div>
              ) : (
                activeQueue.map((comic, idx) => {
                  const isMe = myComicProfile && myComicProfile.id === comic.id;
                  
                  let badge = null;
                  if (comic.status === 'on_stage') {
                    badge = <span className="text-[9px] bg-red-600/20 text-red-400 border border-red-500/30 font-black px-2 py-0.5 rounded uppercase tracking-widest">Stage</span>;
                  } else if (comic.status === 'on_deck') {
                    badge = <span className="text-[9px] bg-blue-600/20 text-blue-400 border border-blue-500/30 font-black px-2 py-0.5 rounded uppercase tracking-widest">On Deck</span>;
                  }

                  return (
                    <div key={comic.id} className={`p-3 rounded-xl border flex justify-between items-center transition-colors ${isMe ? 'bg-blue-900/20 border-blue-700/50' : 'bg-slate-950 border-slate-800'}`}>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono font-bold text-slate-600 w-5">{(idx + 1).toString().padStart(2, '0')}</span>
                        <button 
                          onClick={() => setSelectedComicId(comic.id)} 
                          className={`font-bold text-sm hover:text-indigo-400 transition-colors text-left ${isMe ? 'text-blue-400' : 'text-slate-300'}`}
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
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm overflow-y-auto">
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
