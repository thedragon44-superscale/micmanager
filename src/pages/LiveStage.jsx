import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMic } from '../MicContext';
import toast from 'react-hot-toast';

export default function LiveStage() {
  const navigate = useNavigate();
  // Wiring in your exact backend state logic
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
  const activeQueue = queue.filter(c => c.status !== 'completed' && c.status !== 'dropped');
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
      const targetComic = activeQueue.find(c => c.id.toString() === targetHostId);

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

  // --- UNAUTHENTICATED GUARD ---
  if (!isHostClockedIn) {
    return (
      <div className="p-4 flex flex-col items-center justify-center flex-1 my-auto max-w-md mx-auto w-full animate-fade-in">
        <div className="bg-[#242526] border border-[#3e4042] rounded-xl p-6 text-center shadow-sm w-full">
          <div className="w-12 h-12 rounded-full bg-[#18191a] border border-[#3e4042] flex items-center justify-center text-amber-500 text-lg mx-auto mb-3">
            <i className="fa-solid fa-lock"></i>
          </div>
          <h2 className="text-xl font-black text-white uppercase font-display">Stage Locked</h2>
          <p className="text-[10px] text-[#b0b3b8] font-medium mt-1 mb-5">
            You must clock in with a host PIN to access live stage controls and drive the queue.
          </p>
          <button
            onClick={() => navigate('/host')}
            className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[10px] py-3 rounded-lg uppercase font-mono-data tracking-widest transition-colors"
          >
            Go to Host Clock-In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-3 flex flex-col animate-fade-in max-w-md mx-auto w-full pb-6">
      
      <button onClick={() => navigate('/host')} className="text-[#2d88ff] text-xs font-bold self-start flex items-center gap-1 mb-3 hover:underline">
        <i className="fa-solid fa-arrow-left"></i> Exit Controls
      </button>

      {/* HOST STATUS BANNER */}
      <div className="flex justify-between items-center bg-[#242526] border border-[#3e4042] p-3 rounded-xl shadow-sm mb-3">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <div>
            <span className="text-[9px] font-mono-data text-emerald-400 font-bold uppercase tracking-widest block">Stage Active</span>
            <span className="text-xs font-bold text-white">{activeMic?.name || 'Live Mic Session'}</span>
          </div>
        </div>

        {/* HOST CONTROLS: HAND-OFF & CLOSE */}
        <div className="flex gap-2">
          <button 
            onClick={() => setShowHandoffModal(true)}
            className="bg-[#18191a] hover:bg-gray-800 text-[#2d88ff] border border-[#3e4042] text-[9px] font-mono-data font-bold px-2.5 py-1.5 rounded uppercase transition-colors"
          >
            Hand Off
          </button>
          <button 
            onClick={() => setShowEndModal(true)}
            className="bg-[#18191a] hover:bg-red-950/40 text-[#b0b3b8] hover:text-red-400 border border-[#3e4042] hover:border-red-900/40 text-[9px] font-mono-data font-bold px-2.5 py-1.5 rounded uppercase transition-colors"
          >
            End Mic
          </button>
        </div>
      </div>

      {/* CURRENT ON-STAGE CARD */}
      <div className="bg-[#242526] border-2 border-red-500/70 rounded-xl p-4 shadow-sm relative">
        <div className="flex justify-between items-center mb-1">
          <span className="text-[10px] font-mono-data font-black text-red-400 uppercase tracking-widest flex items-center gap-1.5">
            <span className="w-2 h-2 bg-red-400 rounded-full animate-ping"></span> ON STAGE (LOCKED)
          </span>
          <span className="text-2xl font-black font-mono-data text-white">
            {formatTimer(secondsOnStage)}
          </span>
        </div>

        {onStageComic ? (
          <div className="my-2">
            <h2 className="text-2xl font-black text-white font-display uppercase tracking-wide">{onStageComic.name}</h2>
            <p className="text-[10px] text-[#b0b3b8] font-mono-data mt-0.5">Recording active on performer's device</p>
          </div>
        ) : (
          <div className="my-4 text-center text-[#b0b3b8] font-mono-data text-[10px] uppercase tracking-widest">
            Stage Empty — Ready for next comic
          </div>
        )}

        <button 
          onClick={advanceQueue}
          className="w-full bg-red-600 hover:bg-red-500 text-white font-black py-3 rounded-lg uppercase text-[10px] font-mono-data transition-colors mt-2 shadow-sm"
        >
          Next Comic / End Set <i className="fa-solid fa-forward ml-1"></i>
        </button>
      </div>

      {/* ON DECK CARD */}
      {onDeckComic && (
        <div className="bg-[#242526] border border-amber-500/50 rounded-xl p-3 flex justify-between items-center shadow-sm mt-3">
          <div>
            <span className="text-[9px] font-mono-data font-black text-amber-400 uppercase tracking-widest block">ON DECK (LOCKED)</span>
            <h3 className="text-base font-bold text-white font-display mt-0.5">{onDeckComic.name}</h3>
          </div>
          <button 
            onClick={() => updateComicStatus(onDeckComic.id, 'on_stage')}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[10px] px-3 py-2 rounded-lg uppercase font-mono-data transition-colors"
          >
            Bring to Stage
          </button>
        </div>
      )}

      {/* UPCOMING QUEUE LIST */}
      <div className="flex flex-col gap-2 mt-3">
        <div className="flex justify-between items-center px-1">
          <span className="text-[10px] font-mono-data font-bold uppercase text-[#b0b3b8]">Remaining Queue ({upcomingComics.length})</span>
        </div>

        <div className="bg-[#242526] border border-[#3e4042] rounded-xl overflow-hidden shadow-sm">
          {upcomingComics.length === 0 ? (
            <div className="text-center text-[#b0b3b8] py-4 font-mono-data text-[10px] uppercase">
              No additional comics checked in.
            </div>
          ) : (
            upcomingComics.map((comic) => (
              <div key={comic.id} className="p-3 border-b border-[#3e4042] last:border-b-0 flex justify-between items-center bg-[#18191a] hover:bg-gray-800 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono-data font-bold text-[#b0b3b8] w-5">
                    {(comic.position || comic.id).toString().padStart(2, '0')}
                  </span>
                  <span className="font-bold text-xs text-white">{comic.name}</span>
                </div>
                <button 
                  onClick={() => updateComicStatus(comic.id, 'on_deck')}
                  className="text-[9px] font-bold uppercase font-mono-data text-[#b0b3b8] hover:text-amber-400 bg-[#242526] border border-[#3e4042] hover:border-amber-500/50 px-2 py-1.5 rounded transition-colors"
                >
                  Set On Deck
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* --- PIN VERIFIED END STAGE MODAL --- */}
      {showEndModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowEndModal(false)}>
          <div className="bg-[#242526] border border-[#3e4042] p-5 rounded-2xl w-full max-w-xs text-center shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-white uppercase font-display mb-1">Clock Out & End Mic</h3>
            <p className="text-[10px] text-[#b0b3b8] font-mono-data mb-4">Enter Host PIN to verify clock-out.</p>

            <form onSubmit={handleConfirmCloseStage} className="space-y-3">
              <input 
                type="password" 
                value={endPin} 
                onChange={(e) => setEndPin(e.target.value)} 
                placeholder="••••" 
                className="w-full bg-[#18191a] border border-[#3e4042] rounded-xl px-4 py-2.5 text-center text-xl font-mono-data tracking-[0.5em] text-red-400 focus:outline-none focus:border-red-500 transition-colors"
                maxLength={4}
                required
                autoFocus
              />

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowEndModal(false)}
                  className="flex-1 bg-[#18191a] hover:bg-gray-800 text-white border border-[#3e4042] py-2.5 rounded-lg font-bold text-[10px] uppercase font-mono-data transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-2.5 rounded-lg uppercase text-[10px] font-mono-data transition-colors"
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowHandoffModal(false)}>
          <div className="bg-[#242526] border border-[#3e4042] p-5 rounded-2xl w-full max-w-xs text-center shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-white uppercase font-display mb-1">Host Hand-Off</h3>
            <p className="text-[10px] text-[#b0b3b8] font-mono-data mb-4">Transfer active stage controls to another performer.</p>

            <form onSubmit={handleConfirmHandoff} className="space-y-3 text-left">
              <div>
                <label className="block text-[10px] font-bold text-[#b0b3b8] uppercase font-mono-data mb-1">Select New Host</label>
                <select
                  value={targetHostId}
                  onChange={(e) => setTargetHostId(e.target.value)}
                  className="w-full bg-[#18191a] border border-[#3e4042] rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-[#2d88ff] text-[10px] font-bold font-mono-data transition-colors"
                  required
                >
                  <option value="">-- Choose Performer --</option>
                  {activeQueue.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#b0b3b8] uppercase font-mono-data mb-1">Your Host PIN</label>
                <input 
                  type="password" 
                  value={handoffPin} 
                  onChange={(e) => setHandoffPin(e.target.value)} 
                  placeholder="••••" 
                  className="w-full bg-[#18191a] border border-[#3e4042] rounded-xl px-4 py-2.5 text-center text-lg font-mono-data tracking-[0.5em] text-[#2d88ff] focus:outline-none focus:border-[#2d88ff] transition-colors"
                  maxLength={4}
                  required
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowHandoffModal(false)}
                  className="flex-1 bg-[#18191a] hover:bg-gray-800 border border-[#3e4042] text-white py-2.5 rounded-lg font-bold text-[10px] uppercase font-mono-data transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!targetHostId || !handoffPin}
                  className="flex-1 bg-[#2d88ff] hover:bg-[#1b74e4] disabled:opacity-40 text-white font-bold py-2.5 rounded-lg uppercase text-[10px] font-mono-data transition-colors"
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
