import { useLocation, useNavigate } from 'react-router-dom';

export default function BottomNav({ unreadCount = 0 }) {
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { path: '/', label: 'Mics', icon: 'fa-microphone-lines' },
    { path: '/scene', label: 'Scene', icon: 'fa-users-viewfinder' },
    { path: '/inbox', label: 'Inbox', icon: 'fa-comment-dots', tally: unreadCount },
    { path: '/profile', label: 'Profile', icon: 'fa-user-ninja' }
  ];

  return (
    <nav className="fixed bottom-0 left-0 w-full bg-slate-950/80 backdrop-blur-xl border-t border-slate-800/50 z-50 pb-safe">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto px-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="relative flex flex-col items-center justify-center w-full h-full space-y-1 active:scale-95 transition-transform"
            >
              {/* Active Indicator Dot */}
              {isActive && (
                <span className="absolute top-1 w-1 h-1 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.8)]"></span>
              )}
              
              <div className="relative">
                <i className={`fa-solid ${item.icon} text-lg transition-colors ${
                  isActive ? 'text-blue-500' : 'text-slate-500'
                }`}></i>

                {/* Message Tally Badge */}
                {item.tally > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-blue-600 text-white font-mono-data text-[9px] font-black px-1.5 py-0.2 rounded-full border border-slate-950 shadow-md">
                    {item.tally > 99 ? '99+' : item.tally}
                  </span>
                )}
              </div>
              
              <span className={`text-[9px] font-black uppercase tracking-widest transition-colors ${
                isActive ? 'text-slate-200' : 'text-slate-600'
              }`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
