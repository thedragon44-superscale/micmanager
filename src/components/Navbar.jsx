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
      {/* BACKGROUND OVERLAY */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 transition-opacity" 
          onClick={closeNav} 
        />
      )}

      {/* SLIDING SIDEBAR */}
      <div className={`fixed top-0 left-0 h-full w-64 bg-[#242526] border-r border-[#3e4042] z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col shadow-2xl`}>
        
        {/* HEADER */}
        <div className="p-5 border-b border-[#3e4042] flex justify-between items-center shrink-0">
          <h2 className="text-lg font-black tracking-wide text-white font-display uppercase">Menu</h2>
          <button onClick={closeNav} className="text-[#b0b3b8] hover:text-white transition-colors p-1">
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        {/* SCROLLABLE NAV BODY */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          
          {/* MARKET / CITY SELECTOR */}
          <div className="p-3 bg-[#18191a] border border-[#3e4042] rounded-xl mb-4">
            <label className="block text-[10px] font-bold uppercase tracking-widest text-[#b0b3b8] mb-2 flex items-center gap-1.5 font-mono-data">
              <i className="fa-solid fa-location-dot text-[#2d88ff]"></i> Active Scene
            </label>
            <select 
              value={market} 
              onChange={(e) => {
                setMarket(e.target.value);
                closeNav();
              }}
              className="w-full bg-[#242526] border border-[#3e4042] text-white text-xs font-bold rounded-lg p-2.5 focus:outline-none focus:border-[#2d88ff] cursor-pointer transition-colors uppercase font-mono-data"
            >
              <option value="austin">Austin, TX</option>
              <option value="dallas">Dallas, TX</option>
              <option value="fort_worth">Fort Worth, TX</option>
              <option value="houston">Houston, TX</option>
              <option value="san_antonio">San Antonio, TX</option>
            </select>
          </div>

          <Link to="/" onClick={closeNav} className="block px-4 py-3 text-[#e4e6eb] hover:bg-gray-800 rounded-lg transition-colors font-mono-data text-xs uppercase font-bold tracking-widest">
            Home
          </Link>
          <Link to="/host" onClick={closeNav} className="block px-4 py-3 text-[#e4e6eb] hover:bg-gray-800 rounded-lg transition-colors font-mono-data text-xs uppercase font-bold tracking-widest">
            Host Dashboard
          </Link>
          <Link to="/list-mic" onClick={closeNav} className="block px-4 py-3 text-[#e4e6eb] hover:bg-gray-800 rounded-lg transition-colors font-mono-data text-xs uppercase font-bold tracking-widest">
            List a New Mic
          </Link>
          <Link to="/scene" onClick={closeNav} className="block px-4 py-3 text-[#e4e6eb] hover:bg-gray-800 rounded-lg transition-colors font-mono-data text-xs uppercase font-bold tracking-widest">
            The Scene
          </Link>
          
          {/* AUTHENTICATED ROUTES */}
          {user && (
            <div className="pt-2 mt-2 border-t border-[#3e4042] space-y-2">
              <Link to="/inbox" onClick={closeNav} className="flex justify-between items-center px-4 py-3 text-[#e4e6eb] hover:bg-gray-800 rounded-lg transition-colors font-mono-data text-xs uppercase font-bold tracking-widest">
                Inbox
                <i className="fa-solid fa-envelope text-[#2d88ff]"></i>
              </Link>
              <Link to="/profile" onClick={closeNav} className="flex justify-between items-center px-4 py-3 text-[#2d88ff] bg-[#2d88ff]/10 border border-[#2d88ff]/30 hover:bg-[#2d88ff]/20 rounded-lg transition-colors font-mono-data text-xs uppercase font-bold tracking-widest">
                My Profile
                <i className="fa-solid fa-id-badge text-lg"></i>
              </Link>
            </div>
          )}
        </nav>

        {/* BOTTOM FOOTER SECTION */}
        <div className="p-4 border-t border-[#3e4042] shrink-0 bg-[#242526]">
          {user ? (
            <div className="space-y-3">
              <div className="px-4 py-2.5 bg-[#18191a] rounded-lg border border-[#3e4042] flex items-center justify-center text-center">
                <span className="text-[10px] font-bold text-[#b0b3b8] uppercase tracking-wider font-mono-data">
                  Logged in as <br/>
                  <span className="text-[#2d88ff] text-xs mt-0.5 block">{user.username}</span>
                </span>
              </div>
              <button 
                onClick={handleLogout} 
                className="w-full py-3 bg-[#18191a] hover:bg-red-950/40 text-[#b0b3b8] hover:text-red-400 font-bold rounded-lg transition-colors text-[10px] font-mono-data uppercase tracking-widest border border-[#3e4042] hover:border-red-900/50"
              >
                Log Out
              </button>
            </div>
          ) : (
            <button 
              onClick={() => { setIsAuthOpen(true); closeNav(); }} 
              className="w-full py-3 bg-[#2d88ff] hover:bg-[#1b74e4] text-white font-bold rounded-lg transition-colors text-[10px] font-mono-data uppercase tracking-widest shadow-sm"
            >
              Log In / Register
            </button>
          )}
        </div>
      </div>

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </>
  );
}
