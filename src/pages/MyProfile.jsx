import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AvatarUploader from '../components/AvatarUploader';
import { useAuth } from '../AuthContext';
import toast from 'react-hot-toast'; 

export default function MyProfile() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const authUserId = user?.user_id || user?.id || localStorage.getItem('user_id') || 1;
  
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [igInput, setIgInput] = useState('');
  const [isSavingIg, setIsSavingIg] = useState(false);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    if (authUserId) {
      fetchMyProfile();
      fetchMyHistory();
    }
  }, [authUserId]);

  const fetchMyHistory = async () => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/users/${authUserId}/history`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (err) {
      console.error("Failed to fetch mic history.");
    }
  };

  const fetchMyProfile = async () => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/users/${authUserId}/profile`);
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        setIgInput(data.ig_handle || '');
      } else {
        toast.error("Failed to load your profile data.");
      }
    } catch (err) {
      toast.error("Network error fetching profile.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarUpdate = (newUrl) => {
    setProfile(prev => ({ ...prev, avatar_url: newUrl }));
  };

  const handleSaveIg = async () => {
    setIsSavingIg(true);
    try {
      const res = await fetch(`http://127.0.0.1:8000/users/${authUserId}/ig_handle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ig_handle: igInput })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Instagram handle updated!");
        setProfile(prev => ({ ...prev, ig_handle: data.ig_handle }));
        setIgInput(data.ig_handle);
      } else {
        toast.error(data.detail || "Failed to update handle");
      }
    } catch (err) {
      toast.error("Network error");
    } finally {
      setIsSavingIg(false);
    }
  };

  const parseDateString = (dateVal) => {
    if (!dateVal) return new Date();
    if (typeof dateVal === 'string' && !dateVal.includes('T')) {
      return new Date(dateVal + 'T00:00:00');
    }
    return new Date(dateVal);
  };

  if (isLoading) {
    return <div className="p-6 text-center text-slate-400 font-bold tracking-widest text-xs uppercase animate-pulse">Loading Identity...</div>;
  }

  if (!profile) return null;

  const pct = profile.attendance_percentage;
  const pctColor = pct >= 80 ? 'text-emerald-400' : pct >= 50 ? 'text-amber-400' : 'text-red-400';

  // Analytics Crunching
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const micsLast30 = history.filter(h => parseDateString(h.event_date) >= thirtyDaysAgo).length;

  const totalStageTimeSeconds = history.reduce((sum, item) => sum + (item.duration_seconds || 0), 0);
  const stageMinutes = Math.floor(totalStageTimeSeconds / 60);
  const stageSeconds = totalStageTimeSeconds % 60;

  return (
    <div className="p-4 sm:p-6 flex flex-col gap-6 animate-fade-in flex-1">
      {/* Top Nav */}
      <div className="flex justify-between items-center">
        <button onClick={() => navigate('/')} className="text-slate-400 font-bold text-xs uppercase tracking-widest hover:text-white transition-colors">
          &larr; Back to Dashboard
        </button>
        <button className="text-slate-500 hover:text-slate-300 transition-colors">
          <i className="fa-solid fa-gear text-lg"></i>
        </button>
      </div>

      <div className="mb-2">
        <h2 className="text-2xl font-black text-slate-100 uppercase tracking-tight">My Identity</h2>
        <p className="text-xs text-slate-500 font-medium mt-1">Manage your public ID and private ledger.</p>
      </div>

      {/* Avatar & Basic Info */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative">
        <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 rounded-l-2xl"></div>
        
        <div className="flex flex-col items-center">
          <AvatarUploader 
            userId={profile.id} 
            currentAvatar={profile.avatar_url} 
            onUploadSuccess={handleAvatarUpdate} 
          />
          
          <h3 className="text-xl font-black text-white mt-4 tracking-tight">{profile.username}</h3>
          
          <div className="flex items-center gap-2 mt-2">
            <span className="bg-slate-800 text-slate-400 text-[10px] font-black px-2.5 py-1 rounded-md uppercase tracking-widest border border-slate-700">
              {profile.is_host ? 'Host / Comic' : 'Comic'}
            </span>
            <span className="bg-slate-800 text-slate-400 text-[10px] font-black px-2.5 py-1 rounded-md uppercase tracking-widest border border-slate-700">
              Since {parseDateString(profile.registered_date).getFullYear()}
            </span>
          </div>

          {/* IG Handle Setup */}
          <div className="mt-6 w-full relative">
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Instagram Handle</label>
            <div className="flex bg-slate-950 border border-slate-800 rounded-xl overflow-hidden focus-within:border-indigo-500 transition-colors">
              <span className="px-4 py-3 bg-slate-900 text-slate-500 font-bold border-r border-slate-800">@</span>
              <input 
                type="text" 
                value={igInput}
                onChange={(e) => setIgInput(e.target.value)}
                placeholder="your_handle"
                className="w-full bg-transparent px-4 py-3 text-slate-200 focus:outline-none font-bold text-sm"
              />
              <button 
                onClick={handleSaveIg}
                disabled={isSavingIg || igInput === (profile.ig_handle || '')}
                className="px-4 text-xs font-bold text-indigo-400 hover:text-indigo-300 uppercase tracking-widest bg-slate-900 border-l border-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSavingIg ? '...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="flex justify-between items-center bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg">
        <div className="flex flex-col items-center flex-1 border-r border-slate-800">
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Attendance</span>
          <span className={`text-2xl font-black tracking-tighter ${pctColor}`}>{pct}%</span>
        </div>
        <div className="flex flex-col items-center flex-1">
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Badges</span>
          <span className="text-2xl font-black text-indigo-400 tracking-tighter">{profile.badges.length}</span>
        </div>
      </div>

      {/* Personal Analytics */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg flex flex-col items-center justify-center text-center">
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">
            <i className="fa-solid fa-fire text-orange-500 mr-1"></i> 30-Day Hustle
          </span>
          <div className="text-2xl font-black text-slate-200 tracking-tighter flex items-baseline gap-1">
            {micsLast30} <span className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">mics</span>
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg flex flex-col items-center justify-center text-center">
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">
            <i className="fa-solid fa-stopwatch text-blue-500 mr-1"></i> Stage Time
          </span>
          <div className="text-2xl font-black text-slate-200 tracking-tighter flex items-baseline gap-1">
            {stageMinutes}<span className="text-[10px] font-bold text-slate-500 tracking-widest uppercase mr-0.5">m</span> 
            {stageSeconds}<span className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">s</span>
          </div>
        </div>
      </div>

      {/* RECORDING PREFERENCES TOGGLE */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-lg">
        <div>
          <h4 className="text-xs font-bold text-slate-200">Auto-Record Stage Sets</h4>
          <p className="text-[10px] text-slate-500 mt-0.5">Automatically start audio guard when host calls you on stage.</p>
        </div>
        <button
          onClick={() => {
            const current = localStorage.getItem('auto_record_enabled') !== 'false';
            const updated = !current;
            localStorage.setItem('auto_record_enabled', updated);
            window.dispatchEvent(new Event('storage'));
            toast.success(updated ? "Auto-record enabled!" : "Auto-record disabled!");
          }}
          className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
            localStorage.getItem('auto_record_enabled') !== 'false' ? 'bg-indigo-600 justify-end' : 'bg-slate-800 justify-start'
          }`}
        >
          <span className="w-4 h-4 bg-white rounded-full shadow-md"></span>
        </button>
      </div>

      {/* Unified Stage History & Vault Ledger */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-black text-slate-300 uppercase tracking-widest flex items-center gap-2">
            <i className="fa-solid fa-list-check text-indigo-500"></i> Stage History & Vault
          </h3>
          <span className="bg-slate-800 text-slate-400 text-[9px] font-black px-2.5 py-1 rounded border border-slate-700 uppercase tracking-widest">
            {history.length} Mics
          </span>
        </div>

        {history.length === 0 ? (
          <p className="text-xs text-slate-500 font-medium leading-relaxed text-center py-6">
            No mic history found. Hit your first stage to start building your ledger!
          </p>
        ) : (
          <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto pr-1">
            {history.map((entry) => (
              <div key={entry.id} className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col gap-3 hover:border-slate-700 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col overflow-hidden pr-2">
                    <span className="text-sm font-bold text-slate-200 truncate">{entry.mic_name}</span>
                    <span className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">
                      {parseDateString(entry.event_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} • {entry.venue}
                    </span>
                  </div>
                  <div className={`shrink-0 text-[9px] font-black px-2 py-1 rounded uppercase tracking-widest border ${
                    entry.status === 'completed' ? 'bg-emerald-950/50 text-emerald-400 border-emerald-900' :
                    entry.status === 'missed' ? 'bg-red-950/50 text-red-400 border-red-900' :
                    entry.status === 'excused' ? 'bg-amber-950/50 text-amber-400 border-amber-900' :
                    'bg-indigo-950/50 text-indigo-400 border-indigo-900 animate-pulse'
                  }`}>
                    {entry.status === 'completed' ? 'Completed' :
                     entry.status === 'missed' ? 'Missed' :
                     entry.status === 'excused' ? 'Excused' : 'Live'}
                  </div>
                </div>

                {/* EMBEDDED AUDIO PLAYER */}
                {entry.audio_url ? (
                  <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl flex items-center gap-3">
                    <i className="fa-solid fa-file-audio text-indigo-400 text-base"></i>
                    <div className="flex-1 min-w-0">
                      <span className="block text-[9px] font-black uppercase tracking-wider text-emerald-400">
                        Recording Attached
                      </span>
                      <audio controls src={entry.audio_url} className="w-full h-7 mt-1 rounded focus:outline-none" />
                    </div>
                  </div>
                ) : (
                  <div className="text-[9px] font-mono text-slate-600 uppercase tracking-wider text-right">
                    No Audio Recorded
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
