import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMic } from '../MicContext';
import ProfileCard from '../components/ProfileCard';
import toast from 'react-hot-toast';

export default function LiveStage() {
  const navigate = useNavigate();
  const { 
    isHostClockedIn, setIsHostClockedIn, stageSettings, setStageSettings,
    currentComic, queue, advanceQueue,
    timeLeft, setTimeLeft, isTimerRunning, setIsTimerRunning,
    endMic
  } = useMic();
  
  const [showQR, setShowQR] = useState(false);
  const [selectedComicId, setSelectedComicId] = useState(null);

  // Security check: bounce if not clocked in
  useEffect(() => {
    if (!isHostClockedIn) navigate('/host');
  }, [isHostClockedIn, navigate]);

  if (!isHostClockedIn) return null;

  const handleStartNextComic = () => {
    advanceQueue();
  };

  const setStagePreset = (minutes) => {
    setStageSettings(prev => ({ ...prev, minutes }));
    setTimeLeft(minutes * 60);
    toast.success(`Stage time set to ${minutes} minutes!`);
  };

  const handleEndMic = async () => {
    if (window.confirm("End mic and archive roster?")) {
      setIsTimerRunning(false);
      setTimeLeft(0);
      setIsHostClockedIn(false);
      await endMic();
      navigate('/host');
      toast.success("Mic ended. Roster archived.");
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Dynamic status styling for stage clock
  let timerBgClass = 'bg-slate-900 border-slate-800';
  let timerTextClass = 'text-white';
  
  if (isTimerRunning) {
    if (timeLeft <= 60 && timeLeft > 0) {
      timerBgClass = 'bg-amber-950/80 border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.2)]';
      timerTextClass = 'text-amber-400';
    } else if (timeLeft === 0) {
      timerBgClass = 'bg-red-950 border-red-500/80 shadow-[0_0_25px_rgba(239,68,68,0.4)]';
      timerTextClass = 'text-red-500 animate-pulse';
    } else {
      timerBgClass = 'bg-slate-900 border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.15)]';
      timerTextClass = 'text-emerald-400';
    }
  }

  const onDeckComic = queue.find(c => c.status === 'on_deck');
  const waitingQueue = queue.filter(c => c.status !== "completed" && c.status !== "on_stage");

  return (
    <div className="flex flex-col min-h-full animate-fade-in bg-slate-950 pb-8">
      
      {/* 1. MAIN STAGE CLOCK DISPLAY */}
      <div className={`shrink-0 p-6 flex flex-col items-center justify-center transition-all duration-300 border-b relative ${timerBgClass}`}>
        
        <button onClick={() => setShowQR(true)} className="absolute top-4 right-4 bg-slate-950/60 hover:bg-slate-950 text-slate-300 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border border-slate-700 transition-colors flex items-center gap-1.5 shadow-sm">
          <i className="fa-solid fa-qrcode text-indigo-400"></i> QR Code
        </button>

        {/* Ticking Time */}
        <div className={`text-6xl sm:text-7xl font-mono font-black tracking-tighter drop-shadow-xl ${timerTextClass}`}>
          {formatTime(timeLeft)}
        </div>

        {/* Active Stage Indicator */}
        <div className="mt-3 text-slate-200 text-xs font-black uppercase tracking-widest bg-slate-950/80 px-4 py-1.5 rounded-full border border-slate-800 flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isTimerRunning ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`}></span>
          Stage: <span className="text-white">{currentComic ? currentComic.name : 'No Comic On Stage'}</span>
        </div>

        {/* 2. TIMER ENGINE CONTROL BAR */}
        <div className="flex items-center gap-2 mt-5">
          <button 
            onClick={() => setIsTimerRunning(!isTimerRunning)} 
            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all shadow-md active:scale-95 ${
              isTimerRunning 
                ? 'bg-amber-600 hover:bg-amber-500 text-white' 
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            <i className={`fa-solid ${isTimerRunning ? 'fa-pause' : 'fa-play'}`}></i>
            {isTimerRunning ? 'Pause' : 'Start Clock'}
          </button>

          <button 
            onClick={() => { setIsTimerRunning(false); setTimeLeft(stageSettings.minutes * 60); }}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-black uppercase tracking-wider border border-slate-700 transition-colors active:scale-95"
            title="Reset to full stage time"
          >
            <i className="fa-solid fa-rotate-left mr-1"></i> Reset
          </button>

          <button 
            onClick={() => setTimeLeft(prev => prev + 60)}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded-xl text-xs font-black uppercase tracking-wider border border-slate-700 transition-colors active:scale-95"
            title="Add 1 Minute"
          >
            +1 Min
          </button>
        </div>

        {/* 3. STAGE PRESETS */}
        <div className="flex items-center gap-2 mt-4">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mr-1">Presets:</span>
          {[3, 5, 7].map((mins) => (
            <button
              key={mins}
              onClick={() => setStagePreset(mins)}
              className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all ${
                stageSettings.minutes === mins
                  ? 'bg-indigo-600 border-indigo-400 text-white shadow-sm'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {mins}m
            </button>
          ))}
        </div>
      </div>

      {/* 4. PRIMARY ADVANCE STAGE COMMAND */}
      <div className="p-4 bg-slate-900 border-b border-slate-800 grid grid-cols-3 gap-3 shrink-0 shadow-lg">
        <button 
          onClick={handleStartNextComic} 
          className="col-span-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-xl text-sm sm:text-base uppercase tracking-widest shadow-lg shadow-emerald-950 transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          <i className="fa-solid fa-forward-step"></i> Start Next Comic
        </button>

        <button 
          onClick={handleEndMic} 
          className="bg-red-950/40 hover:bg-red-900/60 text-red-400 py-4 rounded-xl font-black text-xs uppercase tracking-widest border border-red-900/50 transition-colors active:scale-95"
        >
          End Mic
        </button>
      </div>

      {/* 5. FOCUS CARDS & ROSTER LIST */}
      <div className="flex-1 overflow-y-auto p-4 bg-slate-950 space-y-4">
        
        {/* On Deck Card */}
        {onDeckComic && (
          <div className="bg-blue-950/30 border border-blue-800/50 p-3.5 rounded-xl flex justify-between items-center">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black uppercase tracking-widest bg-blue-600/20 text-blue-400 border border-blue-500/30 px-2 py-1 rounded">On Deck</span>
              <span className="font-bold text-sm text-slate-100">{onDeckComic.name}</span>
            </div>
            <span className="text-xs text-slate-500 font-mono">Next up</span>
          </div>
        )}

        <div className="flex justify-between items-center text-[10px] font-black text-slate-500 uppercase tracking-widest pt-2">
          <span>Active Queue Roster</span>
          <span>{waitingQueue.length} Waiting</span>
        </div>
        
        {waitingQueue.length === 0 ? (
          <div className="text-center text-slate-600 py-10 font-mono text-xs uppercase border border-slate-900 rounded-xl bg-slate-950/50">
            No comics currently waiting in queue.
          </div>
        ) : (
          <ul className="space-y-2">
            {waitingQueue.map((comic, index) => {
              const isOnDeck = comic.status === "on_deck";
              return (
                <li key={comic.id} className={`flex justify-between items-center p-3.5 rounded-xl border transition-colors ${isOnDeck ? 'bg-blue-900/10 border-blue-800/40' : 'bg-slate-900 border-slate-800'}`}>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-bold text-slate-600 w-5">{(index + 1).toString().padStart(2, '0')}</span>
                    <button onClick={() => setSelectedComicId(comic.id)} className="font-bold text-sm text-slate-200 hover:text-indigo-400 transition-colors text-left">
                      {comic.name}
                    </button>
                    {isOnDeck && <span className="text-[9px] bg-blue-600/20 text-blue-400 border border-blue-500/30 font-black px-2 py-0.5 rounded uppercase tracking-widest">Deck</span>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* QR CODE MODAL */}
      {showQR && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in" onClick={() => setShowQR(false)}>
          <div className="bg-slate-900 border border-slate-700 p-8 rounded-3xl w-full max-w-xs text-center flex flex-col items-center shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-black text-white uppercase tracking-widest mb-1">Venue Check-In</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">Comics scan to join the list</p>
            
            <div className="bg-white p-4 rounded-2xl mb-6 shadow-inner w-48 h-48 flex items-center justify-center">
              <i className="fa-solid fa-qrcode text-9xl text-slate-900"></i>
            </div>
            
            <button onClick={() => setShowQR(false)} className="w-full bg-slate-800 hover:bg-slate-700 text-white font-black py-3 rounded-xl text-xs uppercase tracking-widest transition-colors shadow-sm active:scale-95">
              Close
            </button>
          </div>
        </div>
      )}

      {/* PROFILE CARD MODAL */}
      {selectedComicId && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-sm my-auto animate-fade-in flex justify-center">
            <ProfileCard 
              userId={selectedComicId} 
              currentUserId={null} 
              onClose={() => setSelectedComicId(null)} 
            />
          </div>
        </div>
      )}
    </div>
  );
}
