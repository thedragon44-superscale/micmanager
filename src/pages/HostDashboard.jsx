import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMic } from '../MicContext';
import toast from 'react-hot-toast';

export default function HostDashboard() {
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [pin, setPin] = useState('');
  
  // Wiring in your exact backend state logic
  const { activateMic, isHostClockedIn, endSession, market, myComicProfile } = useMic();
  const navigate = useNavigate();

  // Fetch today's mics for the active market
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
    <div className="flex-1 min-h-0 overflow-y-auto p-3 flex flex-col gap-3 animate-fade-in max-w-md mx-auto w-full pb-6">
      
      {/* HEADER */}
      <div className="pt-2 px-1">
        <h1 className="text-2xl font-black text-white uppercase tracking-wide font-display">Host Portal</h1>
        <p className="text-[10px] text-[#b0b3b8] font-mono-data mt-0.5 uppercase tracking-widest">Manage stage controls & clock in.</p>
      </div>

      {/* LOGIN GUARD WARNING IF NOT LOGGED IN */}
      {!myComicProfile && (
        <div className="bg-[#242526] border border-[#3e4042] rounded-xl p-5 text-center shadow-sm">
          <div className="w-10 h-10 rounded-full bg-[#18191a] border border-[#3e4042] flex items-center justify-center text-amber-500 text-sm mx-auto mb-3">
            <i className="fa-solid fa-lock"></i>
          </div>
          <h3 className="text-xs font-bold text-white uppercase font-mono-data">Sign In Required</h3>
          <p className="text-[10px] text-[#b0b3b8] mt-1 mb-4 leading-relaxed">
            You must be logged into a verified comic account before clocking in as host or opening stage controls.
          </p>
          <button
            onClick={() => navigate('/profile')}
            className="w-full bg-[#2d88ff] hover:bg-[#1b74e4] text-white font-bold py-2.5 rounded-lg text-[10px] uppercase font-mono-data transition-colors"
          >
            Go to Sign In
          </button>
        </div>
      )}

      {/* QUICK ACTION: CREATE NEW MIC */}
      <div className="bg-[#242526] border border-[#3e4042] rounded-xl p-4 shadow-sm flex justify-between items-center">
        <div>
          <h3 className="font-bold text-sm text-white flex items-center gap-2">
            <i className="fa-solid fa-plus-circle text-[#2d88ff]"></i> List New Mic
          </h3>
          <p className="text-[10px] text-[#b0b3b8] mt-0.5">Set up a recurring or one-time open mic event.</p>
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
          className="bg-[#18191a] hover:bg-gray-800 border border-[#3e4042] text-white font-bold text-[10px] uppercase font-mono-data px-3.5 py-2 rounded-lg transition-colors shrink-0"
        >
          Create
        </button>
      </div>

      {/* CLOCK-IN / ACTIVE HOST SECTION */}
      {myComicProfile && (
        <div className="bg-[#242526] border border-[#3e4042] rounded-xl p-4 shadow-sm flex flex-col gap-3">
          <h3 className="text-xs font-bold text-white uppercase font-mono-data flex items-center gap-2 border-b border-[#3e4042] pb-2.5">
            <i className="fa-solid fa-key text-[#2d88ff]"></i> Stage Clock-In
          </h3>

          {isHostClockedIn ? (
            <div className="space-y-3 pt-1">
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 text-center">
                <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest font-mono-data flex items-center justify-center gap-1.5">
                  <i className="fa-solid fa-circle-check"></i> Host Active & Clocked In
                </p>
              </div>
              <button 
                onClick={() => navigate('/stage')}
                className="w-full bg-[#2d88ff] hover:bg-[#1b74e4] text-white font-bold py-3 rounded-lg transition-colors text-[10px] uppercase font-mono-data"
              >
                Go to Stage Controls
              </button>
              <button 
                onClick={handleManualClockOut}
                className="w-full bg-[#18191a] hover:bg-gray-800 text-[#b0b3b8] hover:text-white border border-[#3e4042] py-2.5 rounded-lg font-bold text-[10px] uppercase font-mono-data transition-colors"
              >
                Clock Out
              </button>
            </div>
          ) : (
            <form onSubmit={handleClockIn} className="space-y-3 pt-1">
              <div>
                <label className="block text-[10px] font-bold text-[#b0b3b8] uppercase tracking-widest font-mono-data mb-1.5">Select Mic</label>
                {events.length === 0 ? (
                  <div className="text-[10px] font-mono-data text-[#b0b3b8] bg-[#18191a] p-3 rounded-lg border border-[#3e4042]">
                    No scheduled mics found for today.
                  </div>
                ) : (
                  <select 
                    value={selectedEventId} 
                    onChange={(e) => setSelectedEventId(e.target.value)}
                    className="w-full bg-[#18191a] border border-[#3e4042] rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-[#2d88ff] text-xs font-bold transition-colors"
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
                <label className="block text-[10px] font-bold text-[#b0b3b8] uppercase tracking-widest font-mono-data mb-1.5">Host PIN</label>
                <input 
                  type="password" 
                  value={pin} 
                  onChange={(e) => setPin(e.target.value)} 
                  placeholder="••••" 
                  className="w-full bg-[#18191a] border border-[#3e4042] rounded-lg px-4 py-2.5 text-center text-xl font-mono-data tracking-[0.5em] text-[#2d88ff] focus:outline-none focus:border-[#2d88ff] transition-colors"
                  maxLength={4}
                  required
                />
              </div>

              <button 
                type="submit"
                disabled={events.length === 0}
                className="w-full bg-[#2d88ff] hover:bg-[#1b74e4] disabled:opacity-40 text-white font-bold py-3 rounded-lg transition-colors text-[10px] uppercase font-mono-data mt-1"
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
