import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMic } from '../MicContext';

export default function Landing() {
  const navigate = useNavigate();
  const { queue, myComicProfile, market, activeEventId } = useMic();
  
  const [todayMics, setTodayMics] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showRosterModal, setShowRosterModal] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    fetch(`${import.meta.env.VITE_API_URL}/events/today?market=${market}`)
      .then(res => res.ok ? res.json() : [])
      .then(data => setTodayMics(data || []))
      .catch(err => console.error("Error fetching today's mics:", err))
      .finally(() => setIsLoading(false));
  }, [market]);

  const activeQueue = queue.filter(c => c.status !== 'completed' && c.status !== 'dropped');
  const amIOnList = myComicProfile && activeQueue.some(c => c.id === myComicProfile.id);
  const activeMicsCount = todayMics.filter(m => m.status === 'active').length;

  // Smart truncation for the map pins (Removes "The " so "The Creek" becomes "Creek")
  const formatVenueName = (name) => {
    if (!name) return 'Venue';
    const cleanName = name.replace(/^(The\s+)/i, '');
    return cleanName.split(' ')[0];
  };

  return (
    <div className="flex flex-col gap-3 p-3 pb-24 animate-fade-in max-w-md mx-auto w-full">
      
      <div className="flex justify-between items-center px-1 pt-1">
        <h1 className="text-2xl font-black text-white uppercase font-display tracking-wide">Tonight's Mics</h1>
        <span className="text-[10px] font-mono-data text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded uppercase font-bold">
          {activeMicsCount} Active
        </span>
      </div>

      {/* DYNAMIC LOGISTICS RADAR MAP */}
      {!isLoading && todayMics.length > 0 && (
        <div className="bg-[#242526] border border-[#3e4042] rounded-xl overflow-hidden shadow-sm flex flex-col">
          <div className="h-28 map-pattern relative w-full border-b border-[#3e4042] flex items-center justify-center">
            {todayMics.slice(0, 2).map((mic, index) => {
              const isFirst = index === 0;
              const positionClass = isFirst ? "top-3 left-1/4" : "bottom-3 right-1/3";
              const pinColor = mic.status === 'active' ? "text-emerald-500" : "text-[#b0b3b8]";
              const badgeColor = mic.status === 'active' ? "bg-emerald-500 text-slate-950" : "bg-[#242526] text-white border border-[#3e4042]";
              
              const displayDistance = mic.distance_miles ? `${mic.distance_miles}m` : isFirst ? '0.2m' : '1.4m';

              return (
                <div key={mic.id} className={`absolute ${positionClass} flex flex-col items-center animate-fade-in`}>
                  <div className={`${badgeColor} text-[9px] font-bold px-1.5 py-0.5 rounded shadow-lg mb-0.5 font-mono-data truncate max-w-[100px]`}>
                    {formatVenueName(mic.venue)} ({displayDistance})
                  </div>
                  <i className={`fa-solid fa-location-pin ${pinColor} text-base drop-shadow-md`}></i>
                </div>
              );
            })}
          </div>
          <div className="p-2.5 flex justify-between items-center">
            <div>
              <h3 className="text-xs font-bold text-white">Logistics Radar Map</h3>
              <p className="text-[10px] text-[#b0b3b8]">Live market routing</p>
            </div>
            <span className="text-[10px] font-mono-data text-[#2d88ff] font-bold uppercase tracking-widest">{market.split('_').join(' ')}</span>
          </div>
        </div>
      )}

      {/* Dynamic Mics Feed based on Database */}
      {isLoading ? (
        <div className="bg-[#242526] border border-[#3e4042] rounded-xl p-8 text-center shadow-sm">
          <i className="fa-solid fa-spinner animate-spin text-[#2d88ff] text-xl mb-2"></i>
          <p className="text-[10px] font-mono-data text-[#b0b3b8] uppercase tracking-widest">Loading scenes...</p>
        </div>
      ) : todayMics.length === 0 ? (
        <div className="bg-[#242526] border border-[#3e4042] rounded-xl p-8 text-center shadow-sm">
          <p className="text-[10px] font-mono-data text-[#b0b3b8] uppercase tracking-widest">No mics scheduled for {market.split('_').join(' ')} today.</p>
        </div>
      ) : (
        todayMics.map(mic => {
          const isActive = mic.status === 'active';
          const isMyActiveMic = isActive && activeEventId === mic.id;

          return (
            <div 
              key={mic.id} 
              className={`bg-[#242526] border border-[#3e4042] rounded-xl p-4 shadow-sm flex flex-col gap-3 ${!isActive ? 'opacity-80' : ''}`}
            >
              <div className="flex justify-between items-start border-b border-[#3e4042] pb-2.5">
                <div>
                  <h3 className="text-lg font-bold text-white font-display tracking-wide">{mic.name}</h3>
                  <p className="text-[11px] text-[#b0b3b8] mt-0.5 truncate">
                    <i className="fa-solid fa-location-dot mr-1 text-[#2d88ff]"></i> 
                    {mic.venue} {mic.address && `• ${mic.address}`}
                  </p>
                </div>
                {isActive ? (
                  <span className="text-[9px] font-bold px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-widest font-mono-data shrink-0 ml-2">
                    ● Live Signups
                  </span>
                ) : (
                  <span className="text-[9px] font-bold px-2 py-1 rounded bg-[#18191a] text-[#b0b3b8] border border-[#3e4042] uppercase tracking-widest font-mono-data shrink-0 ml-2">
                    Scheduled
                  </span>
                )}
              </div>

              {isActive ? (
                <>
                  <div className="flex justify-between items-center">
                    <div className="flex flex-col text-[11px] font-mono-data text-[#b0b3b8]">
                      <span>Day: <strong className="text-white">{mic.day_of_week}</strong></span>
                      <span>Sign Up: <strong className="text-white">{mic.signup_time}</strong> • Start: <strong className="text-white">{mic.start_time}</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-[#18191a] border border-[#3e4042] flex items-center justify-center text-[#b0b3b8]">
                        <i className="fa-solid fa-users text-xs"></i>
                      </div>
                      <div>
                        <span className="text-sm font-bold font-mono-data text-white block leading-none">
                          {isMyActiveMic ? queue.length : '-'}
                        </span>
                        <span className="text-[9px] text-[#b0b3b8] uppercase font-bold">On List</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button 
                      onClick={() => setShowRosterModal(true)} 
                      className="flex-1 bg-[#18191a] border border-[#3e4042] text-white py-2.5 rounded-lg text-[11px] font-bold uppercase tracking-widest hover:bg-gray-800 font-mono-data transition-colors"
                    >
                      Roster
                    </button>
                    <button 
                      onClick={() => navigate(amIOnList && isMyActiveMic ? '/ticket' : '/signup')} 
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-lg text-[11px] font-bold uppercase tracking-widest font-mono-data shadow-md transition-colors"
                    >
                      {amIOnList && isMyActiveMic ? 'My Ticket' : 'Sign Up'}
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex justify-between items-center text-[11px] font-mono-data text-[#b0b3b8]">
                  <span>Day: <strong className="text-white">{mic.day_of_week}</strong></span>
                  <span>Signups open when host clocks in</span>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
