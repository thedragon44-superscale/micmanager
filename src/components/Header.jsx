import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMic } from '../MicContext';

const MARKETS = [
  { id: 'austin', name: 'Austin, TX' },
  { id: 'dallas', name: 'Dallas, TX' },
  { id: 'fort_worth', name: 'Fort Worth, TX' },
  { id: 'houston', name: 'Houston, TX' },
  { id: 'san_antonio', name: 'San Antonio, TX' }
];

export default function Header() {
  const navigate = useNavigate();
  // Wiring in your exact backend state parameters from MicContext
  const { queue, myComicProfile, market, setMarket, isHostClockedIn, isTimerRunning, timeLeft } = useMic();
  const [showMarketModal, setShowMarketModal] = useState(false);

  // Compute live dynamic queue position from your WebSocket-fed queue array
  const activeQueue = queue.filter(c => c.status !== 'completed' && c.status !== 'dropped');
  const myEntry = activeQueue.find(c => c.id === myComicProfile?.id);
  const amIOnList = !!myEntry;
  
  // Uses your backend position if available, falling back to array index calculation
  const myQueueIndex = activeQueue.findIndex(c => c.id === myComicProfile?.id);
  const myPositionNumber = amIOnList ? (myEntry.position || myQueueIndex + 1) : null;

  const formatTime = (sec) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const activeMarketName = MARKETS.find(m => m.id === market)?.name.split(',')[0] || 'Austin';

  return (
    <>
      <header className="sticky top-0 z-40 w-full max-w-md mx-auto px-4 py-3.5 bg-[#242526] border-b border-[#3e4042] flex justify-between items-center shadow-sm shrink-0">
        <div className="flex items-center gap-2.5">
          <Link to="/" className="text-lg font-black tracking-tighter text-white font-display">
            MIC<span className="text-[#2d88ff]">MGR</span>
          </Link>
          
          <button 
            onClick={() => setShowMarketModal(true)}
            className="flex items-center gap-1 bg-[#18191a] border border-[#3e4042] px-2 py-1 rounded text-[10px] font-bold uppercase font-mono-data text-[#b0b3b8] hover:text-white transition-colors"
          >
            <i className="fa-solid fa-location-dot text-[#2d88ff]"></i>
            <span>{activeMarketName}</span>
            <i className="fa-solid fa-chevron-down text-[8px] ml-0.5"></i>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Dynamic Global HUD Lifeline: Host View */}
          {isHostClockedIn && (
            <button 
              onClick={() => navigate('/stage')}
              title="Live Host Stage HUD"
              className="flex items-center justify-center gap-1.5 px-2.5 h-8 bg-[#18191a] border border-emerald-500/50 rounded-full hover:bg-gray-800 transition-all shadow-[0_0_10px_rgba(16,185,129,0.2)]"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs font-mono-data font-bold text-emerald-400">
                {isTimerRunning ? formatTime(timeLeft) : 'LIVE'}
              </span>
            </button>
          )}

          {/* Dynamic Global HUD Lifeline: Performer View */}
          {amIOnList && (
            <button 
              onClick={() => navigate('/ticket')}
              title="View My Live Ticket"
              className="w-8 h-8 rounded-full bg-[#18191a] border border-[#2d88ff] flex items-center justify-center font-bold font-mono-data text-xs text-[#2d88ff] hover:bg-gray-800 transition-colors shadow-[0_0_10px_rgba(45,136,255,0.3)]"
            >
              #{myPositionNumber < 10 ? `0${myPositionNumber}` : myPositionNumber}
            </button>
          )}
        </div>
      </header>

      {/* MARKET SELECTOR MODAL */}
      {showMarketModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowMarketModal(false)}>
          <div className="bg-[#242526] border border-[#3e4042] rounded-2xl p-4 w-full max-w-xs flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-xs font-bold text-white font-mono-data uppercase mb-3 border-b border-[#3e4042] pb-2">Select Active Scene</h3>
            {MARKETS.map((m) => (
              <button
                key={m.id}
                onClick={() => {
                  setMarket(m.id);
                  setShowMarketModal(false);
                }}
                className={`p-2.5 rounded-lg border text-left text-xs font-mono-data uppercase mb-1.5 flex justify-between transition-colors ${
                  market === m.id
                    ? 'bg-[#2d88ff]/20 border-[#2d88ff] text-[#2d88ff] font-bold'
                    : 'bg-[#18191a] border-[#3e4042] text-white hover:bg-gray-800'
                }`}
              >
                <span>{m.name}</span>
                {market === m.id && <i className="fa-solid fa-check"></i>}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
