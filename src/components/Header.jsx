import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMic } from '../MicContext';

const MARKETS = [
  { id: 'austin', name: 'Austin, TX' },
  { id: 'new_york', name: 'New York, NY' },
  { id: 'los_angeles', name: 'Los Angeles, CA' },
  { id: 'chicago', name: 'Chicago, IL' },
  { id: 'nashville', name: 'Nashville, TN' }
];

export default function Header() {
  const navigate = useNavigate();
  const { queue, myComicProfile, market, setMarket, isHostClockedIn } = useMic();
  const [showMarketModal, setShowMarketModal] = useState(false);

  // Compute live queue status
  const activeQueue = queue.filter(c => c.status !== 'completed');
  const myQueueIndex = activeQueue.findIndex(c => c.id === myComicProfile?.id);
  const amIOnList = myComicProfile && myQueueIndex !== -1;
  const myPositionNumber = amIOnList ? myQueueIndex + 1 : null;

  return (
    <>
      <header className="sticky top-0 z-40 w-full max-w-md mx-auto px-4 pt-3 pb-2 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/40">
        <div className="flex justify-between items-center bg-slate-900/80 border border-slate-800 p-2.5 px-3.5 rounded-2xl shadow-lg">
          
          {/* BRAND LOGO & MARKET SELECTOR */}
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-1 active:scale-95 transition-transform">
              <span className="text-base font-black tracking-tighter text-white font-display">
                MIC<span className="text-blue-500">MGR</span>
              </span>
            </Link>

            {/* MARKET SELECTOR PILL */}
            <button 
              onClick={() => setShowMarketModal(true)}
              className="flex items-center gap-1.5 bg-slate-950 hover:bg-slate-800 text-slate-200 border border-slate-800/80 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider font-mono-data active:scale-95 transition-all"
            >
              <i className="fa-solid fa-location-dot text-blue-400 text-[9px]"></i>
              <span>{market.replace('_', ' ')}</span>
              <i className="fa-solid fa-chevron-down text-[8px] text-slate-500 ml-0.5"></i>
            </button>
          </div>

          {/* DYNAMIC ACTION ICONS (ONLY SHOW WHEN ACTIVE) */}
          <div className="flex items-center gap-2">
            
            {/* 1. LIVE HOSTING ICON (ONLY VISIBLE WHEN HOST CLOCKED IN) */}
            {isHostClockedIn && (
              <button 
                onClick={() => navigate('/stage')}
                title="Go to Live Stage Controls"
                className="relative w-8 h-8 rounded-xl border border-amber-500/50 bg-amber-950/60 text-amber-400 glow-amber flex items-center justify-center transition-all active:scale-95"
              >
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-amber-400 rounded-full animate-ping"></span>
                <i className="fa-solid fa-shield-halved text-xs"></i>
              </button>
            )}

            {/* 2. TICKET NUMBER ICON (ONLY VISIBLE WHEN SIGNED UP ON LIST) */}
            {amIOnList && (
              <button 
                onClick={() => navigate('/ticket')}
                title="View My Live Ticket"
                className="relative w-8 h-8 rounded-xl border border-blue-500/50 bg-blue-950/60 text-blue-400 glow-blue font-mono-data font-black text-xs flex items-center justify-center transition-all active:scale-95"
              >
                <span>#{myPositionNumber < 10 ? `0${myPositionNumber}` : myPositionNumber}</span>
              </button>
            )}

          </div>
        </div>
      </header>

      {/* MARKET SELECTOR MODAL */}
      {showMarketModal && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowMarketModal(false)}>
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl w-full max-w-xs flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-800">
              <h3 className="text-sm font-black text-white uppercase tracking-tight font-display">Select City Scene</h3>
              <button onClick={() => setShowMarketModal(false)} className="text-slate-500 hover:text-white font-bold p-1">✕</button>
            </div>
            <div className="flex flex-col gap-2">
              {MARKETS.map(m => (
                <button
                  key={m.id}
                  onClick={() => {
                    setMarket(m.id);
                    setShowMarketModal(false);
                  }}
                  className={`p-3 rounded-xl border text-left font-bold text-xs uppercase tracking-wider transition-all active:scale-95 flex justify-between items-center ${
                    market === m.id
                      ? 'bg-blue-950/40 border-blue-500 text-blue-400 glow-blue font-mono-data'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <span>{m.name}</span>
                  {market === m.id && <i className="fa-solid fa-check text-blue-400"></i>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
