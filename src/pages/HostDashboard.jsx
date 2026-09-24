import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMic } from '../MicContext';

export default function HostDashboard() {
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [pin, setPin] = useState('');
  const { activateMic, isHostClockedIn, market } = useMic();
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`http://127.0.0.1:8000/events/today?market=${market}`)
      .then(res => res.json())
      .then(data => {
        setEvents(data);
        if (data.length > 0) setSelectedEventId(data[0].id);
      })
      .catch(err => console.error(err));
  }, [market]);

  const handleClockIn = async (e) => {
    e.preventDefault();
    if (!selectedEventId) return;
    const success = await activateMic(selectedEventId, pin);
    if (success) {
      navigate('/live');
    }
  };

  return (
    <div className="p-6 flex flex-col items-center justify-center flex-1">
      <div className="w-full max-w-xs bg-slate-900 border border-slate-800 p-6 rounded-xl text-center shadow-xl">
        <h2 className="text-xl font-black text-slate-100 mb-2 uppercase tracking-tight">HOST CLOCK-IN</h2>
        <p className="text-xs text-slate-400 mb-6">Select a mic and enter Host PIN to activate stage controls.</p>

        {isHostClockedIn ? (
          <div className="space-y-4">
            <p className="text-sm font-bold text-green-400">✓ You are currently clocked in</p>
            <button 
              onClick={() => navigate('/live')}
              className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-lg transition-colors text-sm"
            >
              GO TO LIVE STAGE
            </button>
          </div>
        ) : (
          <form onSubmit={handleClockIn} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Select Mic</label>
              <select 
                value={selectedEventId} 
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-slate-100 focus:outline-none focus:border-indigo-500 text-sm font-medium"
              >
                {events.map(ev => (
                  <option key={ev.id} value={ev.id}>
                    {ev.name} ({ev.status})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Host PIN</label>
              <input 
                type="password" 
                value={pin} 
                onChange={(e) => setPin(e.target.value)} 
                placeholder="PIN" 
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-center text-lg font-mono tracking-widest text-slate-100 focus:outline-none focus:border-indigo-500"
                maxLength={4}
                required
              />
            </div>

            <button 
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-lg transition-colors text-sm uppercase tracking-wider mt-2"
            >
              CLOCK IN
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
