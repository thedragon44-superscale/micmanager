import { Link } from 'react-router-dom';
import ActiveMicBanner from './ActiveMicBanner';
import ComicStatusBanner from './ComicStatusBanner';

export default function Header({ toggleNav }) {
  return (
    <header className="bg-slate-950 border-b border-slate-900 px-4 py-3 flex justify-between items-center shrink-0 z-30 shadow-md">
      <div className="flex items-center gap-3">
        <button onClick={toggleNav} className="text-slate-300 hover:text-white focus:outline-none transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <Link to="/" className="flex items-center gap-1">
          <span className="text-lg font-black tracking-tighter text-white">MIC<span className="text-indigo-500">MGR</span></span>
        </Link>
      </div>
      
      {/* Dynamic Status Icons */}
      <div className="flex items-center gap-2">
        <ActiveMicBanner />
        <ComicStatusBanner />
      </div>
    </header>
  );
}
