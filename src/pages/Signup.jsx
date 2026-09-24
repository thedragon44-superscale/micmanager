import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMic } from '../MicContext';

export default function Signup() {
  const [name, setName] = useState('');
  const [pushEnabled, setPushEnabled] = useState(false);
  const navigate = useNavigate();
  const { registerComic } = useMic();

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
    <div className="p-4 sm:p-6 flex flex-col gap-6 animate-fade-in">
      <button onClick={() => navigate('/')} className="text-slate-400 font-bold text-xs uppercase tracking-widest self-start hover:text-white transition-colors">
        &larr; Back to Mics
      </button>

      <div className="bg-blue-900/20 border border-blue-800/50 rounded-2xl p-5 shadow-inner">
        <span className="text-[10px] font-black uppercase text-blue-400 tracking-widest block mb-1">Venue Check-In Verified</span>
        <h2 className="text-2xl font-black text-slate-100">Sunset Comedy Mic</h2>
        <p className="text-xs text-slate-400 font-medium mt-1">Vulcan Gas Company • 5 Min Sets</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Stage / Legal Name</label>
          <input 
            type="text" 
            required 
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Richard Pryor" 
            className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all shadow-inner"
          />
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-md">
          <div className="flex items-center justify-between">
            <span className="font-bold text-sm text-slate-200">Smoking Patio Pager</span>
            <span className="text-[10px] bg-blue-950 text-blue-400 px-2.5 py-1 rounded border border-blue-900/50 font-black uppercase tracking-widest">Free</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed font-medium">Get lock-screen notifications when you are 2 spots away ("In the Hole") so you don't miss your set.</p>
          
          {!pushEnabled ? (
            <button type="button" onClick={handlePushRequest} className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold py-3 rounded-xl text-slate-200 transition-colors active:scale-95 shadow-sm">
              <i className="fa-regular fa-bell mr-2"></i> Enable Push Notifications
            </button>
          ) : (
            <p className="text-[10px] text-emerald-400 font-black text-center uppercase tracking-widest bg-emerald-950/30 py-2 rounded-lg border border-emerald-900/50">
              <i className="fa-solid fa-check mr-1"></i> Notifications Enabled
            </p>
          )}
        </div>

        <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-xl text-sm uppercase tracking-widest shadow-lg shadow-blue-900/50 transition-all active:scale-95">
          Sign Up For Stage
        </button>
      </form>
    </div>
  );
}
