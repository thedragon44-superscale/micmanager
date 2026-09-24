import { useMic } from '../MicContext';
import { Link } from 'react-router-dom';

export default function ActiveMicBanner() {
  const { isHostClockedIn, activeEventId, timeLeft, isTimerRunning } = useMic();

  if (!isHostClockedIn || !activeEventId) return null;

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <Link 
      to="/live" 
      title="Host Console: Live"
      className={`relative flex items-center justify-center gap-1.5 px-3 h-8 bg-slate-900 border rounded-full transition-all shadow-[0_0_12px_rgba(34,197,94,0.25)] ${
        isTimerRunning ? 'border-emerald-500 text-emerald-400' : 'border-slate-700 text-slate-400'
      }`}
    >
      <span className={`w-2 h-2 rounded-full border border-slate-950 ${isTimerRunning ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`}></span>
      <span className="text-xs font-mono font-black tracking-wider">
        {formatTime(timeLeft)}
      </span>
      <i className="fa-solid fa-microphone-lines text-[10px] ml-0.5"></i>
    </Link>
  );
}
