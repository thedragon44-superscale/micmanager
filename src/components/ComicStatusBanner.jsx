import { useMic } from '../MicContext';
import { Link } from 'react-router-dom';

export default function ComicStatusBanner() {
  const { myComicProfile, queue, activeEventId } = useMic();

  if (!myComicProfile || !activeEventId) return null;

  const myEntry = queue.find(
    c => c.id === myComicProfile.id || c.name === myComicProfile.name
  );

  if (!myEntry || myEntry.status === 'completed') return null;

  let iconStyle = "bg-slate-900 border-indigo-500/50 text-indigo-400 hover:bg-indigo-950 shadow-[0_0_10px_rgba(99,102,241,0.2)]";
  let dotStyle = "hidden"; // Hide the dot while just waiting
  let innerContent = <i className="fa-solid fa-ticket text-xs"></i>;

  if (myEntry.status === 'on_stage') {
    iconStyle = "bg-red-950 border-red-500/70 text-red-400 hover:bg-red-900 shadow-[0_0_10px_rgba(239,68,68,0.4)] animate-pulse";
    dotStyle = "block bg-red-500";
    innerContent = <span className="text-[10px] font-black tracking-tight">LIVE</span>;
  } else if (myEntry.status === 'on_deck') {
    iconStyle = "bg-amber-950 border-amber-500/50 text-amber-400 hover:bg-amber-900 shadow-[0_0_10px_rgba(245,158,11,0.3)]";
    dotStyle = "block bg-amber-500";
    innerContent = <span className="text-[10px] font-black tracking-tight">DECK</span>;
  }

  return (
    <Link 
      to="/ticket" 
      title="View Ticket & Chat"
      className={`relative flex items-center justify-center min-w-[2rem] px-2.5 h-8 border rounded-full transition-colors ${iconStyle}`}
    >
      <span className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-slate-950 ${dotStyle}`}></span>
      {innerContent}
    </Link>
  );
}
