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
    <nav className="fixed bottom-0 left-0 right-0 w-full max-w-md mx-auto bg-[#242526] border-t border-[#3e4042] z-50 pb-safe shadow-[0_-4px_10px_rgba(0,0,0,0.2)]">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto px-2">
        {navItems.map((item) => {
          // Smart Active State Routing: Keeps parent tab highlighted when inside child routes
          const isActive = 
            location.pathname === item.path || 
            (item.path === '/' && (location.pathname === '/ticket' || location.pathname === '/stage')) ||
            (item.path === '/scene' && location.pathname.startsWith('/comments')) ||
            (item.path === '/profile' && (location.pathname === '/list-mic' || location.pathname === '/signup' || location.pathname === '/host'));
          
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center w-full h-full gap-1 active:scale-95 transition-colors relative ${
                isActive ? 'text-[#2d88ff]' : 'text-[#b0b3b8] hover:text-white'
              }`}
            >
              <div className="relative">
                <i className={`fa-solid ${item.icon} text-lg`}></i>

                {item.tally > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 bg-[#2d88ff] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full font-mono-data shadow-md border border-[#242526]">
                    {item.tally > 99 ? '99+' : item.tally}
                  </span>
                )}
              </div>
              
              <span className="text-[10px] font-bold tracking-wide">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
