import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMic } from '../MicContext';

export default function Signup() {
  const [name, setName] = useState('');
  const [pushEnabled, setPushEnabled] = useState(false);
  const navigate = useNavigate();
  const { registerComic, activeMic } = useMic();

  const handlePushRequest = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') setPushEnabled(true);
    } else {
      alert("Browser does not support Push Notifications.");
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    registerComic(name, pushEnabled);
    navigate('/ticket');
  };

  return (
    <div className="flex flex-col p-3 gap-3 pb-24 animate-fade-in max-w-md mx-auto w-full">
      <button onClick={() => navigate('/')} className="text-[#2d88ff] text-xs font-bold self-start flex items-center gap-1 hover:underline">
        <i className="fa-solid fa-arrow-left"></i> Cancel
      </button>

      {/* VERIFIED CHECK-IN BANNER */}
      <div className="bg-[#242526] border border-[#2d88ff]/40 rounded-xl p-3.5 shadow-sm">
        <span className="text-[9px] font-mono-data text-[#2d88ff] uppercase font-bold block mb-0.5">Venue Check-In Verified</span>
        <h2 className="text-lg font-bold text-white font-display">{activeMic?.name || 'Live Comedy Mic'}</h2>
      </div>

      <form onSubmit={handleSubmit} className="bg-[#242526] border border-[#3e4042] rounded-xl p-4 flex flex-col gap-4 shadow-sm">
        {/* NAME INPUT */}
        <div>
          <label className="block text-[10px] font-mono-data font-bold text-[#b0b3b8] uppercase mb-1.5">Stage Name</label>
          <input 
            type="text" 
            required 
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Richard Pryor" 
            className="w-full bg-[#18191a] border border-[#3e4042] rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#2d88ff] transition-colors font-sans"
          />
        </div>

        {/* PUSH NOTIFICATIONS OPT-IN */}
        <div className="bg-[#18191a] border border-[#3e4042] rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-xs text-white font-mono-data">Smoking Patio Pager</span>
            <span className="text-[8px] bg-[#2d88ff]/10 text-[#2d88ff] px-1.5 py-0.5 rounded uppercase font-bold tracking-widest border border-[#2d88ff]/30">Free</span>
          </div>
          <p className="text-[10px] text-[#b0b3b8] leading-relaxed">
            Get lock-screen notifications when you are 2 spots away ("In the Hole") so you don't miss your set.
          </p>
          
          {!pushEnabled ? (
            <button type="button" onClick={handlePushRequest} className="w-full bg-[#242526] hover:bg-gray-800 border border-[#3e4042] text-xs font-bold py-2.5 rounded-lg text-white transition-colors uppercase font-mono-data flex items-center justify-center gap-1.5 mt-1">
              <i className="fa-regular fa-bell"></i> Enable Push Alerts
            </button>
          ) : (
            <p className="text-[10px] text-emerald-400 font-bold text-center uppercase font-mono-data bg-emerald-500/10 py-2.5 rounded-lg border border-emerald-500/30 mt-1">
              <i className="fa-solid fa-check mr-1"></i> Notifications Enabled
            </p>
          )}
        </div>

        {/* SUBMIT */}
        <button type="submit" className="w-full bg-[#2d88ff] hover:bg-[#1b74e4] text-white font-bold py-3 rounded-lg uppercase tracking-widest text-[10px] font-mono-data mt-1 transition-colors">
          Confirm Sign Up
        </button>
      </form>
    </div>
  );
}
