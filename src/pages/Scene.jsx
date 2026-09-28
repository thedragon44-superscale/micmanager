import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMic } from '../MicContext';
import ProfileCard from '../components/ProfileCard';
import toast from 'react-hot-toast';

export default function Scene() {
  const navigate = useNavigate();
  const { market, myComicProfile } = useMic();
  
  const [sceneTab, setSceneTab] = useState('feed');
  const [feed, setFeed] = useState([]);
  const [isLoadingFeed, setIsLoadingFeed] = useState(true);
  const [directory, setDirectory] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingDirectory, setIsLoadingDirectory] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState(null);

  // New Post State
  const [newPostContent, setNewPostContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);

  const handleCreatePost = async () => {
    if (!myComicProfile?.id) {
      toast.error("You must be logged in to post.");
      return;
    }
    if (!newPostContent.trim()) return;

    setIsPosting(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/feed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author_id: myComicProfile.id,
          author_name: myComicProfile.name,
          content: newPostContent.trim(),
          market: market
        })
      });

      if (res.ok) {
        const createdPost = await res.json();
        toast.success("Post published!");
        setNewPostContent('');
        // Add new post to top of feed immediately
        const newPostObj = createdPost.post || createdPost;
        setFeed(prev => [newPostObj, ...prev]);
      } else {
        toast.error("Failed to publish post.");
      }
    } catch (err) {
      console.error("Error creating post:", err);
      toast.error("Network error while publishing post.");
    } finally {
      setIsPosting(false);
    }
  };

  useEffect(() => {
    setIsLoadingFeed(true);
    fetch(`${import.meta.env.VITE_API_URL}/feed?market=${market}`)
      .then(res => res.ok ? res.json() : [])
      .then(data => setFeed(Array.isArray(data) ? data : data.posts || []))
      .catch(err => console.error("Error fetching feed:", err))
      .finally(() => setIsLoadingFeed(false));
  }, [market]);

  useEffect(() => {
    setIsLoadingDirectory(true);
    fetch(`${import.meta.env.VITE_API_URL}/directory?market=${market}`)
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        const parsedData = Array.isArray(data) ? data : data.users || data.comics || [];
        setDirectory(parsedData);
      })
      .catch(err => console.error("Error fetching directory:", err))
      .finally(() => setIsLoadingDirectory(false));
  }, [market]);

  const handleLike = async (postId) => {
    if (!myComicProfile?.id) {
      toast.error("You must be logged in to like posts.");
      return;
    }

    const previousFeed = [...feed];

    setFeed(prevFeed => prevFeed.map(post => {
      if (post.id === postId) {
        const isCurrentlyLiked = post.user_liked;
        const currentLikes = parseInt(post.likes_count) || 0;
        return { 
          ...post, 
          likes_count: currentLikes + (isCurrentlyLiked ? -1 : 1),
          user_liked: !isCurrentlyLiked 
        };
      }
      return post;
    }));

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/feed/${postId}/like`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: myComicProfile.id })
      });
      
      if (!res.ok) {
        throw new Error(`Backend returned ${res.status}`);
      }
    } catch (err) {
      console.error("Like failed to sync:", err);
      toast.error("Like failed. Post may not support interactions.");
      setFeed(previousFeed); 
    }
  };

  const filteredDirectory = directory.filter(c => {
    const searchTarget = c.name || c.username || c.comic_name || '';
    return searchTarget.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="flex flex-col h-full min-h-0 bg-[#18191a] max-w-md mx-auto w-full animate-fade-in">
      
      {/* FIXED TOP HEADER & TABS */}
      <div className="flex-none p-3 pb-0 bg-[#18191a]">
        <h1 className="text-2xl font-black text-white uppercase font-display tracking-wide px-1 mb-2">The Scene</h1>
        
        <div className="border-b border-[#3e4042] px-1 pb-2 flex gap-4">
          <button 
            onClick={() => setSceneTab('feed')} 
            className={`text-xs font-black uppercase tracking-widest font-mono-data pb-1 border-b-2 transition-colors ${sceneTab === 'feed' ? 'border-[#2d88ff] text-[#2d88ff]' : 'border-transparent text-[#b0b3b8] hover:text-[#e4e6eb]'}`}
          >
            Feed
          </button>
          <button 
            onClick={() => setSceneTab('directory')} 
            className={`text-xs font-black uppercase tracking-widest font-mono-data pb-1 border-b-2 transition-colors ${sceneTab === 'directory' ? 'border-[#2d88ff] text-[#2d88ff]' : 'border-transparent text-[#b0b3b8] hover:text-[#e4e6eb]'}`}
          >
            Comics ({directory.length})
          </button>
        </div>
      </div>

      {/* SCROLLABLE FEED & DIRECTORY CONTAINER */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 pb-16">
        {sceneTab === 'feed' && (
          <div className="flex flex-col gap-3">
            
            {/* USER POST CREATION BOX */}
            <div className="bg-[#242526] border border-[#3e4042] rounded-xl p-3 shadow-sm flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-[#18191a] border border-[#3e4042] flex items-center justify-center font-bold text-[#2d88ff] text-xs shrink-0">
                  {(myComicProfile?.name || 'C').charAt(0).toUpperCase()}
                </div>
                <span className="text-xs font-bold text-white font-mono-data">
                  {myComicProfile ? myComicProfile.name : 'Guest Comic'}
                </span>
              </div>

              <textarea
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                placeholder={myComicProfile ? "Share an update, set recap, or stage announcement..." : "Sign in to post updates..."}
                disabled={!myComicProfile || isPosting}
                rows={2}
                className="w-full bg-[#18191a] border border-[#3e4042] rounded-lg p-2.5 text-xs text-white placeholder-[#b0b3b8] focus:outline-none focus:border-[#2d88ff] resize-none font-sans"
              />

              <div className="flex justify-end">
                <button
                  onClick={handleCreatePost}
                  disabled={!myComicProfile || !newPostContent.trim() || isPosting}
                  className="bg-[#2d88ff] hover:bg-[#1b74e4] disabled:opacity-40 text-white font-bold px-3.5 py-1.5 rounded-lg text-[10px] font-mono-data uppercase tracking-wider transition-colors flex items-center gap-1.5"
                >
                  {isPosting ? (
                    <i className="fa-solid fa-spinner animate-spin"></i>
                  ) : (
                    <>
                      <i className="fa-solid fa-paper-plane text-[9px]"></i> Post
                    </>
                  )}
                </button>
              </div>
            </div>

            {isLoadingFeed ? (
              <div className="text-center py-10 text-[10px] font-mono-data text-[#b0b3b8] uppercase tracking-widest">
                <i className="fa-solid fa-spinner animate-spin text-[#2d88ff] text-xl mb-2 block"></i>
                Loading Activity...
              </div>
            ) : feed.length === 0 ? (
              <div className="text-center py-10 text-[10px] font-mono-data text-[#b0b3b8] uppercase tracking-widest bg-[#242526] border border-[#3e4042] rounded-xl shadow-sm">
                No recent posts in {market.split('_').join(' ')}.
              </div>
            ) : (
              feed.map((post) => (
                <div key={post.id} className="bg-[#242526] border border-[#3e4042] rounded-xl p-4 shadow-sm flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    {post.is_system ? (
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 text-xs shrink-0">
                          <i className="fa-solid fa-robot"></i>
                        </div>
                        <div>
                          <span className="text-xs font-bold text-white font-mono-data">System Telemetry</span>
                          <span className="text-[9px] text-[#b0b3b8] block font-mono-data">{post.timestamp || 'Just now'}</span>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => setSelectedUserId(post.author_id)} className="flex items-center gap-2.5 text-left group">
                        <div className="w-8 h-8 rounded-full bg-[#18191a] border border-[#3e4042] flex items-center justify-center font-bold text-[#2d88ff] text-xs shrink-0 group-hover:border-[#2d88ff] transition-colors">
                          {(post.author_name || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <span className="text-xs font-bold text-white block group-hover:underline">{post.author_name}</span>
                          <span className="text-[9px] text-[#b0b3b8] block font-mono-data">{post.timestamp}</span>
                        </div>
                      </button>
                    )}
                    {post.is_system && (
                      <span className="text-[9px] font-mono-data text-amber-400 bg-amber-950/60 border border-amber-500/30 px-1.5 py-0.5 rounded uppercase">Alert</span>
                    )}
                  </div>
                  
                  <p className={`text-xs leading-relaxed mt-1 ${post.is_system ? 'text-amber-100 font-mono-data bg-[#18191a] p-2.5 rounded-lg border border-[#3e4042]' : 'text-[#e4e6eb] font-bold'}`}>
                    {post.content}
                  </p>
                  
                  <div className="flex gap-4 border-t border-[#3e4042] pt-2 mt-1 text-[11px] font-mono-data font-bold text-[#b0b3b8]">
                    <button 
                      onClick={() => handleLike(post.id)}
                      className={`transition-colors flex items-center gap-1 ${post.user_liked ? 'text-[#2d88ff]' : 'hover:text-white'}`}
                    >
                      <i className="fa-solid fa-bolt"></i> {post.likes_count || 0} Likes
                    </button>
                    <button 
                      onClick={() => navigate(`/comments/${post.id}`, { state: { post } })} 
                      className="hover:text-white transition-colors flex items-center gap-1"
                    >
                      <i className="fa-solid fa-comment"></i> {post.comments_count || 0} Comments
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {sceneTab === 'directory' && (
          <div className="flex flex-col gap-2.5 p-3">
            <div className="relative">
              <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-[#b0b3b8] text-xs"></i>
              <input 
                type="text" 
                placeholder="Search local comics..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#242526] border border-[#3e4042] rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#2d88ff] transition-colors" 
              />
            </div>

            {isLoadingDirectory ? (
              <div className="text-center py-10 text-[10px] font-mono-data text-[#b0b3b8] uppercase tracking-widest">
                <i className="fa-solid fa-spinner animate-spin text-[#2d88ff] text-xl mb-2 block"></i>
                Loading Comic Database...
              </div>
            ) : filteredDirectory.length === 0 ? (
              <div className="text-center py-10 text-[10px] font-mono-data text-[#b0b3b8] uppercase tracking-widest bg-[#242526] border border-[#3e4042] rounded-xl shadow-sm">
                No comics found.
              </div>
            ) : (
              filteredDirectory.map(comic => {
                const displayName = comic.name || comic.username || 'Comic User';
                const displayUsername = comic.username || displayName.replace(/\s+/g, '').toLowerCase();

                return (
                  <div 
                    key={comic.id || comic.user_id} 
                    onClick={() => setSelectedUserId(comic.id || comic.user_id)} 
                    className="bg-[#242526] border border-[#3e4042] p-3 rounded-xl flex justify-between items-center cursor-pointer hover:bg-gray-800 transition-colors shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      {comic.avatar_url ? (
                        <img src={comic.avatar_url} alt={displayName} className="w-10 h-10 rounded-full object-cover border border-[#3e4042] shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-[#18191a] border border-[#3e4042] flex items-center justify-center font-bold text-[#2d88ff] text-sm shrink-0">
                          {displayName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <h4 className="text-xs font-bold text-white truncate">{displayName}</h4>
                        <p className="text-[10px] text-[#b0b3b8] font-mono-data truncate">@{displayUsername}</p>
                      </div>
                    </div>
                    <i className="fa-solid fa-chevron-right text-[#b0b3b8] text-xs shrink-0"></i>
                  </div>
                );
              })
            )}
          </div>
        )}

        {selectedUserId && (
          <ProfileCard 
            userId={selectedUserId} 
            currentUserId={myComicProfile?.id} 
            onClose={() => setSelectedUserId(null)} 
          />
        )}
      </div>
    </div>
  );
}
