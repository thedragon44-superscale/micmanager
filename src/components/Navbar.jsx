import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { useMic } from '../MicContext';
import AuthModal from './AuthModal';

export default function Navbar({ isOpen, closeNav }) {
  const { user, logout } = useAuth();
  const { market, setMarket } = useMic();
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    closeNav();
    navigate('/');
  };

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity" onClick={closeNav} />
      )}

      <div className={`fixed top-0 left-0 h-full w-64 bg-slate-900 border-r border-slate-800 z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col`}>
        
        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
          <h2 className="text-xl font-black tracking-tight text-slate-100">MENU</h2>
          <button onClick={closeNav} className="text-slate-400 hover:text-slate-100">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {/* MARKET / CITY SELECTOR */}
          <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl mb-3">
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 flex items-center gap-1.5">
              <i className="fa-solid fa-location-dot text-indigo-400"></i> Active Scene
            </label>
            <select 
              value={market} 
              onChange={(e) => setMarket(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs font-bold rounded-lg p-2.5 focus:outline-none focus:border-indigo-500 cursor-pointer transition-colors"
            >
              <option value="austin">Austin, TX</option>
              <option value="dallas">Dallas, TX</option>
              <option value="houston">Houston, TX</option>
              <option value="san_antonio">San Antonio, TX</option>
              <option value="miami">Miami, FL</option>
              <option value="nyc">New York, NY</option>
              <option value="la">Los Angeles, CA</option>
            </select>
          </div>

          <Link to="/" onClick={closeNav} className="block px-4 py-3 text-slate-300 hover:bg-slate-800 hover:text-slate-100 rounded-lg transition-colors font-medium">Home</Link>
          <Link to="/host" onClick={closeNav} className="block px-4 py-3 text-slate-300 hover:bg-slate-800 hover:text-slate-100 rounded-lg transition-colors font-medium">Host Dashboard</Link>
          <Link to="/list-mic" onClick={closeNav} className="block px-4 py-3 text-slate-300 hover:bg-slate-800 hover:text-slate-100 rounded-lg transition-colors font-medium">List a New Mic</Link>
          <Link to="/scene" onClick={closeNav} className="block px-4 py-3 text-slate-300 hover:bg-slate-800 hover:text-slate-100 rounded-lg transition-colors font-medium">The Scene</Link>
          {user && (
            <>
              <Link to="/inbox" onClick={closeNav} className="block px-4 py-3 text-slate-300 hover:bg-slate-800 hover:text-slate-100 rounded-lg transition-colors font-medium flex justify-between items-center">
                Inbox
                <i className="fa-solid fa-envelope text-indigo-400"></i>
              </Link>
              <Link to="/profile" onClick={closeNav} className="block px-4 py-3 text-indigo-300 hover:bg-indigo-900/30 hover:text-indigo-200 rounded-lg transition-colors font-bold flex justify-between items-center border border-transparent hover:border-indigo-500/30">
                My Profile
                <i className="fa-solid fa-id-badge text-lg"></i>
              </Link>
            </>
          )}
        </nav>

        <div className="p-4 border-t border-slate-800">
          {user ? (
            <div className="space-y-3">
              <div className="px-4 py-2 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-center text-center">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Logged in as <br/><span className="text-indigo-400 text-sm">{user.username}</span></span>
              </div>
              <button onClick={handleLogout} className="w-full py-3 bg-slate-800 hover:bg-red-900/50 hover:text-red-400 text-slate-300 font-bold rounded-lg transition-colors text-sm tracking-wide">LOG OUT</button>
            </div>
          ) : (
            <button onClick={() => { setIsAuthOpen(true); closeNav(); }} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-colors text-sm tracking-wide">LOG IN / REGISTER</button>
          )}
        </div>
      </div>

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </>
  );
}
