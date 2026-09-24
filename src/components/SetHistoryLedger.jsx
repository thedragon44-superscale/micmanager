import { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';

export default function SetHistoryLedger() {
  const { user } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentlyPlayingId, setCurrentlyPlayingId] = useState(null);

  const authUserId = user?.user_id || user?.id;

  useEffect(() => {
    if (authUserId) {
      fetchHistory();
    }
  }, [authUserId]);

  const fetchHistory = async () => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/users/${authUserId}/history`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (err) {
      console.error("Failed to load history ledger", err);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (sec) => {
    if (!sec) return '00:00';
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  if (loading) {
    return (
      <div className="text-center text-slate-500 py-8 font-mono text-xs uppercase animate-pulse">
        Loading stage ledger...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">
          Stage History & Vault Ledger
        </h3>
        <span className="text-[10px] font-mono text-slate-500">{history.length} Total Sets</span>
      </div>

      {history.length === 0 ? (
        <div className="text-center text-slate-500 py-10 font-mono text-xs uppercase border border-slate-800 rounded-2xl bg-slate-900/30">
          No recorded stage history yet.
        </div>
      ) : (
        history.map((item) => (
          <div 
            key={item.id} 
            className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3 shadow-sm hover:border-slate-700 transition-colors"
          >
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-bold text-sm text-slate-100">{item.mic_name}</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  <i className="fa-solid fa-location-dot mr-1 text-slate-500"></i>
                  {item.venue}
                </p>
              </div>
              <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-950 px-2.5 py-1 rounded-md border border-slate-800 uppercase">
                {new Date(item.event_date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>

            {/* AUDIO VAULT PLAYER BAR */}
            {item.audio_url ? (
              <div className="mt-1 p-2.5 bg-slate-950 border border-slate-800/80 rounded-xl flex items-center gap-3">
                <i className="fa-solid fa-file-audio text-indigo-400 text-lg"></i>
                <div className="flex-1 min-w-0">
                  <span className="block text-[10px] font-black uppercase tracking-wider text-emerald-400">
                    Vault Recording Attached
                  </span>
                  <audio 
                    controls 
                    src={item.audio_url} 
                    className="w-full h-7 mt-1 rounded focus:outline-none"
                  />
                </div>
                <span className="text-[10px] font-mono text-slate-500">
                  {formatDuration(item.duration_seconds)}
                </span>
              </div>
            ) : (
              <div className="text-[10px] font-mono text-slate-600 uppercase tracking-wider text-right">
                No Audio Recorded
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
