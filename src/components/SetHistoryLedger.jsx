import { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';

export default function SetHistoryLedger() {
  const { user } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const authUserId = user?.user_id || user?.id;

  useEffect(() => {
    if (authUserId) {
      fetchHistory();
    }
  }, [authUserId]);

  const fetchHistory = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/users/${authUserId}/history`);
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
      <div className="text-center text-[#b0b3b8] py-8 font-mono-data text-[10px] uppercase tracking-widest">
        <i className="fa-solid fa-spinner animate-spin text-[#2d88ff] text-xl mb-2 block"></i>
        Loading stage ledger...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center mb-2 px-1">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#b0b3b8] font-mono-data">
          Stage History & Vault Ledger
        </h3>
        <span className="text-[10px] font-mono-data text-[#b0b3b8]">{history.length} Total Sets</span>
      </div>

      {history.length === 0 ? (
        <div className="text-center text-[#b0b3b8] py-10 font-mono-data text-[10px] uppercase tracking-widest border border-[#3e4042] rounded-xl bg-[#18191a]">
          No recorded stage history yet.
        </div>
      ) : (
        history.map((item) => (
          <div 
            key={item.id} 
            className="bg-[#242526] border border-[#3e4042] rounded-xl p-3.5 flex flex-col gap-3 shadow-sm hover:bg-gray-800 transition-colors"
          >
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-bold text-sm text-white">{item.mic_name}</h4>
                <p className="text-[11px] text-[#b0b3b8] mt-0.5 truncate">
                  <i className="fa-solid fa-location-dot mr-1 text-[#2d88ff]"></i>
                  {item.venue}
                </p>
              </div>
              <span className="text-[9px] font-mono-data font-bold text-[#b0b3b8] bg-[#18191a] px-2 py-1 rounded border border-[#3e4042] uppercase shrink-0">
                {new Date(item.event_date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>

            {/* AUDIO VAULT PLAYER BAR */}
            {item.audio_url ? (
              <div className="mt-1 p-2.5 bg-[#18191a] border border-[#3e4042] rounded-lg flex items-center gap-3">
                <i className="fa-solid fa-file-audio text-[#2d88ff] text-lg shrink-0"></i>
                <div className="flex-1 min-w-0">
                  <span className="block text-[9px] font-bold uppercase tracking-widest text-[#2d88ff] font-mono-data mb-1">
                    Vault Recording Attached
                  </span>
                  <audio 
                    controls 
                    src={item.audio_url} 
                    className="w-full h-7 rounded outline-none"
                  />
                </div>
                <span className="text-[10px] font-mono-data text-[#b0b3b8] shrink-0">
                  {formatDuration(item.duration_seconds)}
                </span>
              </div>
            ) : (
              <div className="text-[9px] font-mono-data text-[#b0b3b8] uppercase tracking-widest text-right mt-1">
                No Audio Recorded
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
