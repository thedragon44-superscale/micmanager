import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { useMic } from '../MicContext';

export default function Inbox() {
  const { user } = useAuth();
  const { market } = useMic();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [directory, setDirectory] = useState([]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const authUserId = user.user_id || user.id;

    // 1. Fetch active inbox partners
    fetch(`http://127.0.0.1:8000/users/${authUserId}/inbox`)
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        setConversations(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load inbox:", err);
        setLoading(false);
      });

    // 2. Fetch market directory for user search
    fetch(`http://127.0.0.1:8000/directory?market=${market}`)
      .then(res => res.ok ? res.json() : [])
      .then(data => setDirectory(data))
      .catch(err => console.error("Failed to load directory search:", err));
  }, [user, market]);

  const searchResults = searchQuery.trim()
    ? directory.filter(u => u.username.toLowerCase().includes(searchQuery.toLowerCase()) && u.id !== user?.id)
    : [];

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto w-full animate-fade-in flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-black text-slate-100 uppercase tracking-tight">Inbox</h1>
        <p className="text-xs text-slate-400 font-medium mt-1">Direct comic-to-comic communications.</p>
      </div>

      {/* USER SEARCH BAR */}
      <div className="relative z-10">
        <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-1.5 shadow-sm focus-within:border-indigo-500 transition-all">
          <i className="fa-solid fa-magnifying-glass text-slate-500 mr-2.5 text-xs"></i>
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search comics to message..."
            className="w-full bg-transparent border-none focus:outline-none py-2 text-xs font-medium text-slate-200 placeholder-slate-500"
          />
        </div>
        
        {/* Search Results Dropdown */}
        {searchQuery.trim().length > 0 && (
          <div className="absolute top-[110%] left-0 right-0 bg-slate-900 rounded-xl shadow-2xl border border-slate-700 overflow-hidden z-50 max-h-60 overflow-y-auto">
            {searchResults.length > 0 ? (
              searchResults.map(u => (
                <Link 
                  key={u.id}
                  to={`/chat/${u.id}`}
                  className="flex items-center gap-3 p-3 hover:bg-slate-800 border-b border-slate-800/50 last:border-0 transition-colors"
                >
                  <img 
                    src={u.avatar_url || `https://ui-avatars.com/api/?name=${u.username}&background=0f172a&color=fff`} 
                    alt={u.username} 
                    className="w-8 h-8 rounded-full object-cover border border-slate-700" 
                  />
                  <span className="font-bold text-xs text-slate-200">@{u.username}</span>
                </Link>
              ))
            ) : (
              <div className="p-4 text-center text-slate-500 text-xs font-mono uppercase">No comics found.</div>
            )}
          </div>
        )}
      </div>

      {/* CONVERSATION LIST */}
      {loading ? (
        <div className="text-center text-slate-500 py-12 font-mono text-xs uppercase animate-pulse">
          Loading messages...
        </div>
      ) : conversations.length === 0 ? (
        <div className="text-center text-slate-500 py-12 font-mono text-xs uppercase border border-slate-800 rounded-2xl bg-slate-900/30">
          <i className="fa-solid fa-comments text-3xl mb-3 block opacity-40"></i>
          Your inbox is empty. Search above to start a chat!
        </div>
      ) : (
        <div className="space-y-2.5">
          {conversations.map((conv) => (
            <Link 
              key={conv.id} 
              to={`/chat/${conv.id}`}
              className="block bg-slate-900 rounded-xl p-4 border border-slate-800 hover:border-indigo-500/50 transition-all group shadow-sm"
            >
              <div className="flex items-center gap-3.5">
                <img 
                  src={conv.avatar_url || `https://ui-avatars.com/api/?name=${conv.username}&background=0f172a&color=fff`} 
                  alt={conv.username} 
                  className="w-10 h-10 rounded-full object-cover border border-slate-700" 
                />
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline">
                    <h3 className="font-bold text-sm text-slate-200 group-hover:text-indigo-400 transition-colors">
                      @{conv.username}
                    </h3>
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                      {conv.home_market}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
