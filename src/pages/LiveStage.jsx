import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMic } from '../MicContext';
import toast from 'react-hot-toast';

export default function LiveStage() {
  const navigate = useNavigate();
  const { 
    queue, 
    isHostClockedIn, 
    advanceQueue, 
    updateComicStatus, 
    endSession,
    activeMic
  } = useMic();

  const [secondsOnStage, setSecondsOnStage] = useState(0);

  // Modals & PIN States
  const [showEndModal, setShowEndModal] = useState(false);
  const [endPin, setEndPin] = useState('');
  const [showHandoffModal, setShowHandoffModal] = useState(false);
  const [handoffPin, setHandoffPin] = useState('');
  const [targetHostId, setTargetHostId] = useState('');

  // Active Queue Breakdown
  const activeQueue = queue.filter(c => c.status !== 'completed');
  const onStageComic = activeQueue.find(c => c.status === 'on_stage');
  const onDeckComic = activeQueue.find(c => c.status === 'on_deck');
  const upcomingComics = activeQueue.filter(c => c.status !== 'on_stage' && c.status !== 'on_deck');

  // Live On-Stage Timer
  useEffect(() => {
    let interval = null;
    if (onStageComic) {
      interval = setInterval(() => {
        setSecondsOnStage(prev => prev + 1);
      }, 1000);
    } else {
      setSecondsOnStage(0);
    }
    return () => clearInterval(interval);
  }, [onStageComic]);

  const formatTimer = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 1. PIN VERIFIED STAGE CLOSE & CLOCK OUT
  const handleConfirmCloseStage = async (e) => {
    e.preventDefault();
    if (!endPin) return;

    try {
      if (activeMic?.id) {
        await fetch(`${import.meta.env.VITE_API_URL}/events/${activeMic.id}/end?pin=${endPin}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        }).catch(() => {});
      }
    } catch (err) {
      console.error("Error closing stage on server:", err);
    } finally {
      if (endSession) await endSession();
      toast.success("Stage closed & host clocked out");
      setShowEndModal(false);
      setEndPin('');
      navigate('/host');
    }
  };

  // 2. HOST HAND-OFF TO ANOTHER COMIC
  const handleConfirmHandoff = async (e) => {
    e.preventDefault();
    if (!handoffPin || !targetHostId) return;

    try {
      const targetComic = activeQueue.find(c => c.id === targetHostId);

      if (activeMic?.id) {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/events/${activeMic.id}/handoff`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ newHostId: targetHostId, pin: handoffPin })
        });

        if (!res.ok) {
          toast.error("Invalid PIN or Hand-off failed");
          return;
        }
      }

      if (endSession) await endSession();

      toast.success(`Host handed off to ${targetComic?.name || 'New Host'}`);
      setShowHandoffModal(false);
      setHandoffPin('');
      navigate('/');
    } catch (err) {
      console.error("Error handing off host:", err);
      toast.error("Hand-off failed");
    }
  };

  if (!isHostClockedIn) {
    return (
      <div className="p-6 text-center animate-fade-in flex flex-col items-center justify-center flex-1 my-auto">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 text-xl mb-4">
          <i className="fa-solid fa-lock"></i>
        </div>
        <h2 className="text-2xl font-black text-white uppercase font-display">Stage Locked</h2>
        <p className="text-xs text-slate-400 font-medium max-w-xs mt-2 mb-6">
          You must clock in with a host PIN to access live stage controls and drive the queue.
        </p>
        <button
          onClick={() => navigate('/host')}
          className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs px-6 py-3.5 rounded-xl uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-amber-950/50"
        >
          Go to Host Clock-In
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-5 flex flex-col gap-5 animate-fade-in max-w-md mx-auto w-full pb-8">
      
      {/* HOST STATUS BANNER */}
      <div className="flex justify-between items-center bg-amber-950/30 border border-amber-500/40 p-3 rounded-2xl glow-amber">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-400"></span>
          </span>
          <div>
            <span className="text-[10px] font-mono-data text-amber-400 font-black uppercase tracking-widest block">Stage Active</span>
            <span className="text-xs font-bold text-slate-200">{activeMic?.name || 'Live Mic Session'}</span>
          </div>
        </div>

        {/* HOST CONTROLS: HAND-OFF & CLOSE */}
        <div className="flex gap-1.5">
          <button 
            onClick={() => setShowHandoffModal(true)}
            className="bg-slate-900 hover:bg-indigo-950/80 text-indigo-300 border border-indigo-500/30 text-[10px] font-mono-data font-black px-2.5 py-1.5 rounded-xl uppercase tracking-wider transition-all active:scale-95"
          >
            Hand Off
          </button>
          <button 
            onClick={() => setShowEndModal(true)}
            className="bg-slate-950 hover:bg-red-950/80 text-slate-300 hover:text-red-400 border border-slate-800 hover:border-red-900/50 text-[10px] font-mono-data font-black px-2.5 py-1.5 rounded-xl uppercase tracking-wider transition-all active:scale-95"
          >
            End Stage
          </button>
        </div>
      </div>

      {/* CURRENT ON-STAGE CARD */}
      <div className="bg-slate-900 border border-red-500/40 rounded-3xl p-5 glow-red relative overflow-hidden">
        <div className="flex justify-between items-center mb-2">
          <span className="text-[10px] font-mono-data font-black text-red-400 uppercase tracking-widest bg-red-950/60 border border-red-500/30 px-2.5 py-1 rounded-md animate-pulse">
            ● ON STAGE NOW
          </span>
          <span className="text-2xl font-black font-mono-data text-red-400 tracking-wider">
            {formatTimer(secondsOnStage)}
          </span>
        </div>

        {onStageComic ? (
          <div className="my-4">
            <h2 className="text-3xl font-black text-white font-display uppercase tracking-tight">{onStageComic.name}</h2>
            <p className="text-xs text-slate-400 font-mono-data mt-1">Recording active on performer's device</p>
          </div>
        ) : (
          <div className="my-6 text-center text-slate-500 font-mono-data text-xs uppercase tracking-widest">
            Stage Empty — Ready for next comic
          </div>
        )}

        <button 
          onClick={advanceQueue}
          className="w-full bg-red-600 hover:bg-red-500 text-white font-black py-4 rounded-2xl uppercase tracking-widest text-xs transition-all active:scale-95 shadow-xl shadow-red-950/60 mt-2"
        >
          Next Comic / End Set <i className="fa-solid fa-forward ml-2"></i>
        </button>
      </div>

      {/* ON DECK CARD */}
      {onDeckComic && (
        <div className="bg-slate-900/90 border border-amber-500/30 rounded-2xl p-4 glow-amber flex justify-between items-center">
          <div>
            <span className="text-[9px] font-mono-data font-black text-amber-400 uppercase tracking-widest block">ON DECK (NEXT)</span>
            <h3 className="text-lg font-bold text-white font-display mt-0.5">{onDeckComic.name}</h3>
          </div>
          <button 
            onClick={() => updateComicStatus(onDeckComic.id, 'on_stage')}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs px-3.5 py-2.5 rounded-xl uppercase tracking-wider transition-all active:scale-95 shadow-md shadow-amber-950/40 shrink-0"
          >
            Bring to Stage
          </button>
        </div>
      )}

      {/* UPCOMING QUEUE LIST */}
      <div className="space-y-2">
        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest font-mono-data mb-1">
          Remaining Queue ({upcomingComics.length})
        </h4>

        {upcomingComics.length === 0 ? (
          <div className="text-center text-slate-600 py-6 font-mono-data text-xs uppercase border border-dashed border-slate-800 rounded-2xl">
            No additional comics checked in.
          </div>
        ) : (
          upcomingComics.map((comic, idx) => (
            <div key={comic.id} className="bg-slate-950 border border-slate-800/80 p-3.5 rounded-xl flex justify-between items-center">
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono-data font-bold text-slate-600 w-5">
                  {(idx + 1).toString().padStart(2, '0')}
                </span>
                <span className="font-bold text-sm text-slate-200">{comic.name}</span>
              </div>
              <button 
                onClick={() => updateComicStatus(comic.id, 'on_deck')}
                className="text-[10px] font-black uppercase tracking-wider text-slate-400 hover:text-amber-400 bg-slate-900 border border-slate-800 hover:border-amber-500/40 px-2.5 py-1.5 rounded-lg transition-all active:scale-95"
              >
                Set On Deck
              </button>
            </div>
          ))
        )}
      </div>

      {/* --- PIN VERIFIED END STAGE MODAL --- */}
      {showEndModal && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowEndModal(false)}>
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl w-full max-w-xs text-center shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-black text-white uppercase font-display mb-1">Clock Out & End Mic</h3>
            <p className="text-xs text-slate-400 mb-5">Enter Host PIN to verify clock-out and close stage controls.</p>

            <form onSubmit={handleConfirmCloseStage} className="space-y-4">
              <input 
                type="password" 
                value={endPin} 
                onChange={(e) => setEndPin(e.target.value)} 
                placeholder="••••" 
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-center text-xl font-mono-data tracking-[0.5em] text-red-400 focus:outline-none focus:border-red-500"
                maxLength={4}
                required
                autoFocus
              />

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowEndModal(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 py-3 rounded-xl font-bold text-xs uppercase tracking-wider active:scale-95 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-red-600 hover:bg-red-500 text-white font-black py-3 rounded-xl uppercase tracking-wider text-xs active:scale-95 transition-all shadow-lg shadow-red-950/50"
                >
                  Confirm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- HOST HAND-OFF MODAL --- */}
      {showHandoffModal && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowHandoffModal(false)}>
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl w-full max-w-xs text-center shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-black text-white uppercase font-display mb-1">Host Hand-Off</h3>
            <p className="text-xs text-slate-400 mb-4">Transfer active stage controls to another performer.</p>

            <form onSubmit={handleConfirmHandoff} className="space-y-4 text-left">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Select New Host</label>
                <select
                  value={targetHostId}
                  onChange={(e) => setTargetHostId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-100 focus:outline-none focus:border-indigo-500 text-xs font-bold"
                  required
                >
                  <option value="">-- Choose Performer --</option>
                  {activeQueue.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Your Host PIN</label>
                <input 
                  type="password" 
                  value={handoffPin} 
                  onChange={(e) => setHandoffPin(e.target.value)} 
                  placeholder="••••" 
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-center text-lg font-mono-data tracking-[0.5em] text-indigo-400 focus:outline-none focus:border-indigo-500"
                  maxLength={4}
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowHandoffModal(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 py-3 rounded-xl font-bold text-xs uppercase tracking-wider active:scale-95 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!targetHostId || !handoffPin}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-black py-3 rounded-xl uppercase tracking-wider text-xs active:scale-95 transition-all shadow-lg shadow-indigo-950/50"
                >
                  Hand Off
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
