import { useState, useEffect } from 'react';
import ProfileCard from '../components/ProfileCard';
import { useMic } from '../MicContext';
import { useAuth } from '../AuthContext';
import toast from 'react-hot-toast';

export default function Scene() {
  const { user } = useAuth();
  const { myComicProfile, market } = useMic();
  const [activeTab, setActiveTab] = useState('feed');
  const [users, setUsers] = useState([]);
  const [feed, setFeed] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [postContent, setPostContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);

  useEffect(() => {
    fetchDirectory();
    fetchFeed();
  }, [market]);

  const fetchDirectory = () => {
    fetch(`http://127.0.0.1:8000/directory?market=${market}`)
      .then(res => res.json())
      .then(data => setUsers(data))
      .catch(err => console.error("Failed to load directory", err));
  };

  const fetchFeed = () => {
    fetch(`http://127.0.0.1:8000/feed?market=${market}`)
      .then(res => res.json())
      .then(data => setFeed(data))
      .catch(err => console.error("Failed to load feed", err));
  };

  const handlePostSubmit = async (e) => {
    e.preventDefault();
    if (!postContent.trim() || !user) return;
    
    setIsPosting(true);
    // Safely extract the ID from the decoded JWT token
    const authUserId = user.user_id || user.id; 
    
    try {
      const res = await fetch(`http://127.0.0.1:8000/users/${authUserId}/feed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: postContent })
      });
      
      if (res.ok) {
        setPostContent('');
        fetchFeed();
        toast.success("Posted to the feed!");
      } else {
        toast.error("Failed to post.");
      }
    } catch (err) {
      toast.error("Network error.");
    } finally {
      setIsPosting(false);
    }
  };

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6 flex flex-col gap-4 animate-fade-in flex-1 h-full relative">
      
      {/* HEADER & TOGGLE */}
      <div className="shrink-0 mb-2">
        <h2 className="text-2xl font-black text-slate-100 uppercase tracking-tight mb-4">The Scene</h2>
        
        <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1">
          <button 
            onClick={() => setActiveTab('feed')}
            className={`flex-1 py-2.5 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${
              activeTab === 'feed' 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' 
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Social Feed
          </button>
          <button 
            onClick={() => setActiveTab('directory')}
            className={`flex-1 py-2.5 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${
              activeTab === 'directory' 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' 
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Directory
          </button>
        </div>
      </div>

      {/* CONTENT AREA */}
      <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-3 pb-20">
        
        {activeTab === 'feed' && (
          <div className="flex flex-col gap-3 mt-2">
            
            {/* POST INPUT */}
            {user ? (
              <form onSubmit={handlePostSubmit} className="bg-slate-900 border border-slate-700 rounded-xl p-3 shadow-md flex gap-2 shrink-0">
                <input 
                  type="text" 
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  placeholder="What's happening in the scene?" 
                  className="flex-1 bg-slate-950 border border-slate-800 text-slate-200 text-xs font-medium rounded-lg py-2 px-3 focus:outline-none focus:border-indigo-500 transition-colors"
                />
                <button 
                  type="submit" 
                  disabled={isPosting || !postContent.trim()}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all disabled:opacity-50"
                >
                  {isPosting ? '...' : 'Post'}
                </button>
              </form>
            ) : (
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3 text-center shrink-0">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Log in to post to the feed</span>
              </div>
            )}

            {/* FEED TIMELINE */}
            <div className="flex flex-col gap-3 pb-4">
              {feed.length === 0 ? (
                <div className="text-center text-slate-500 py-10 font-mono text-xs uppercase tracking-widest border border-slate-800 rounded-2xl bg-slate-900/30">
                  The feed is quiet.
                </div>
              ) : (
                feed.map(post => {
                  const isSystem = post.post_type !== 'user';
                  const dateObj = new Date(post.created_at);
                  
                  return (
                    <div key={post.id} className={`p-4 rounded-xl border ${isSystem ? 'bg-blue-950/10 border-blue-900/30' : 'bg-slate-900 border-slate-800'} shadow-sm`}>
                      {isSystem ? (
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 w-8 h-8 rounded-full bg-blue-900/30 border border-blue-500/50 flex items-center justify-center shrink-0">
                            <i className={`fa-solid ${post.post_type === 'mic_listed' ? 'fa-calendar-plus text-blue-400' : post.post_type === 'mic_started' ? 'fa-bolt text-amber-400' : 'fa-flag-checkered text-emerald-400'} text-xs`}></i>
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-200 leading-relaxed">{post.content}</p>
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mt-1.5">
                              {dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} • System Alert
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          <div 
                            className="flex items-center gap-2 cursor-pointer group w-max"
                            onClick={() => post.author && setSelectedUserId(post.author.id)}
                          >
                            {post.author?.avatar_url ? (
                              <img src={post.author.avatar_url} alt={post.author.username} className="w-6 h-6 rounded-full border border-slate-700 object-cover" />
                            ) : (
                              <div className="w-6 h-6 bg-slate-800 rounded-full flex items-center justify-center text-slate-400 font-black text-[10px]">
                                {post.author?.username?.substring(0, 2).toUpperCase() || '?'}
                              </div>
                            )}
                            <span className="text-xs font-bold text-slate-300 group-hover:text-indigo-400 transition-colors">
                              {post.author?.username || 'Unknown Comic'}
                            </span>
                            {post.author?.is_host && (
                              <span className="bg-amber-950/50 text-amber-400 text-[8px] font-black px-1.5 py-0.5 rounded border border-amber-900/50 uppercase tracking-widest ml-1">
                                Host
                              </span>
                            )}
                            <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-2">
                              {dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </span>
                          </div>
                          <p className="text-sm text-slate-200 pl-8">{post.content}</p>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {activeTab === 'directory' && (
          <>
            <div className="relative mb-2 shrink-0">
              <i className="fa-solid fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"></i>
              <input 
                type="text" 
                placeholder="SEARCH COMICS..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs font-black uppercase tracking-widest rounded-xl py-3 pl-11 pr-4 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            
            {filteredUsers.length === 0 ? (
              <div className="text-center text-slate-500 py-10 font-mono text-xs uppercase tracking-widest">
                No comics found.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                {filteredUsers.map(user => (
                  <div 
                    key={user.id} 
                    onClick={() => setSelectedUserId(user.id)}
                    className="bg-slate-900 border border-slate-800 hover:border-slate-600 rounded-xl p-3 flex items-center justify-between cursor-pointer transition-all active:scale-95 group"
                  >
                    <div className="flex items-center gap-3">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt={user.username} className="w-10 h-10 rounded-full border border-slate-700 object-cover" />
                      ) : (
                        <div className="w-10 h-10 bg-indigo-900/50 border border-indigo-500/30 rounded-full flex items-center justify-center text-indigo-400 font-black text-xs">
                          {user.username.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="font-bold text-sm text-slate-200 group-hover:text-blue-400 transition-colors">{user.username}</div>
                        {user.ig_handle && (
                          <div className="text-[10px] text-slate-500 font-mono">@{user.ig_handle}</div>
                        )}
                      </div>
                    </div>
                    {user.is_host && (
                      <span className="bg-amber-950/50 text-amber-400 text-[8px] font-black px-2 py-1 rounded border border-amber-900/50 uppercase tracking-widest">
                        Host
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* PROFILE CARD MODAL */}
      {selectedUserId && (
        <div className="absolute inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-sm my-auto animate-fade-in flex justify-center">
            <ProfileCard 
              userId={selectedUserId} 
              currentUserId={myComicProfile?.id} 
              onClose={() => setSelectedUserId(null)} 
            />
          </div>
        </div>
      )}
    </div>
  );
}
