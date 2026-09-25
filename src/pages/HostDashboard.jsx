import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMic } from '../MicContext';
import toast from 'react-hot-toast';

export default function HostDashboard() {
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [pin, setPin] = useState('');
  const { activateMic, isHostClockedIn, endSession, market, myComicProfile } = useMic();
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/events/today?market=${market}`)
      .then(res => res.json())
      .then(data => {
        const evList = data || [];
        setEvents(evList);
        if (evList.length > 0) setSelectedEventId(evList[0].id);
      })
      .catch(err => console.error(err));
  }, [market]);

  const handleClockIn = async (e) => {
    e.preventDefault();
    if (!myComicProfile) {
      toast.error("You must be logged in to clock in as host");
      navigate('/profile');
      return;
    }
    if (!selectedEventId) return;

    const success = await activateMic(selectedEventId, pin);
    if (success) {
      toast.success("Clocked in as Host");
      navigate('/stage');
    }
  };

  const handleManualClockOut = () => {
    if (endSession) endSession();
    toast.success("Clocked out as host");
  };

  return (
    <div className="p-4 sm:p-6 flex flex-col gap-6 animate-fade-in flex-1 max-w-md mx-auto w-full">
      
      {/* HEADER */}
      <div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
          <h2 className="text-2xl font-black text-slate-100 uppercase tracking-tight font-display">Host Portal</h2>
        </div>
        <p className="text-xs text-slate-400 font-medium mt-1">Manage stage controls, clock into live mics, or list new events.</p>
      </div>

      {/* LOGIN GUARD WARNING IF NOT LOGGED IN */}
      {!myComicProfile && (
        <div className="bg-amber-950/40 border border-amber-500/40 rounded-2xl p-5 text-center shadow-lg">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 text-sm mx-auto mb-3">
            <i className="fa-solid fa-lock"></i>
          </div>
          <h3 className="text-sm font-black text-amber-400 uppercase tracking-wide font-display">Sign In Required</h3>
          <p className="text-xs text-slate-300 font-medium mt-1 mb-4">
            You must be logged into a verified comic account before clocking in as host or opening stage controls.
          </p>
          <button
            onClick={() => navigate('/profile')}
            className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-3 rounded-xl text-xs uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-amber-950/50"
          >
            Go to Sign In
          </button>
        </div>
      )}

      {/* QUICK ACTION: CREATE NEW MIC */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 relative overflow-hidden group shadow-lg">
        <div className="flex justify-between items-center relative z-10">
          <div>
            <h3 className="font-bold text-base text-white flex items-center gap-2">
              <i className="fa-solid fa-plus-circle text-indigo-400"></i> List New Mic
            </h3>
            <p className="text-xs text-slate-400 mt-1">Set up a recurring or one-time open mic event.</p>
          </div>
          <button 
            onClick={() => {
              if (!myComicProfile) {
                toast.error("Please log in first");
                navigate('/profile');
              } else {
                navigate('/list-mic');
              }
            }}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all active:scale-95 shrink-0"
          >
            Create
          </button>
        </div>
      </div>

      {/* CLOCK-IN / ACTIVE HOST SECTION */}
      {myComicProfile && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <h3 className="text-sm font-black text-slate-200 uppercase tracking-widest mb-1 flex items-center gap-2">
            <i className="fa-solid fa-key text-amber-400"></i> Stage Clock-In
          </h3>
          <p className="text-xs text-slate-400 mb-6">Select tonight's session and enter your Host PIN to run the stage queue.</p>

          {isHostClockedIn ? (
            <div className="space-y-3">
              <div className="bg-emerald-950/40 border border-emerald-800/50 rounded-xl p-4 text-center">
                <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center justify-center gap-2">
                  <i className="fa-solid fa-circle-check"></i> Host Active & Clocked In
                </p>
              </div>
              <button 
                onClick={() => navigate('/stage')}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3.5 rounded-xl transition-all text-xs uppercase tracking-widest shadow-lg shadow-emerald-950/50 active:scale-95"
              >
                Go to Stage Controls
              </button>
              <button 
                onClick={handleManualClockOut}
                className="w-full bg-slate-950 hover:bg-red-950/40 text-slate-400 hover:text-red-400 border border-slate-800 hover:border-red-900/40 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-95"
              >
                Clock Out
              </button>
            </div>
          ) : (
            <form onSubmit={handleClockIn} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Select Mic</label>
                {events.length === 0 ? (
                  <div className="text-xs font-mono-data text-slate-500 bg-slate-950 p-3 rounded-xl border border-slate-800">
                    No scheduled mics found for today.
                  </div>
                ) : (
                  <select 
                    value={selectedEventId} 
                    onChange={(e) => setSelectedEventId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-3 text-slate-100 focus:outline-none focus:border-amber-500 text-xs font-bold"
                  >
                    {events.map(ev => (
                      <option key={ev.id} value={ev.id}>
                        {ev.name} ({ev.status.toUpperCase()})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Host PIN</label>
                <input 
                  type="password" 
                  value={pin} 
                  onChange={(e) => setPin(e.target.value)} 
                  placeholder="••••" 
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-center text-xl font-mono-data tracking-[0.5em] text-amber-400 focus:outline-none focus:border-amber-500"
                  maxLength={4}
                  required
                />
              </div>

              <button 
                type="submit"
                disabled={events.length === 0}
                className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black py-3.5 rounded-xl transition-all text-xs uppercase tracking-widest shadow-lg shadow-amber-950/50 active:scale-95 mt-2"
              >
                Clock In & Open Stage
              </button>
            </form>
          )}
        </div>
      )}

    </div>
  );
}
