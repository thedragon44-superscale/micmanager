import { useState, useEffect } from 'react';
import { useMic } from '../MicContext';
import ProfileCard from '../components/ProfileCard';
import toast from 'react-hot-toast';

export default function Scene() {
  const { market, myComicProfile } = useMic();
  const [activeTab, setActiveTab] = useState('feed'); // Feed default on left
  const [directory, setDirectory] = useState([]);
  const [feedPosts, setFeedPosts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [newPostText, setNewPostText] = useState('');
  const [selectedComicId, setSelectedComicId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch Directory & Feed Data
  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/directory?market=${market}`)
      .then(res => res.json())
      .then(data => setDirectory(data || []))
      .catch(err => console.error('Directory fetch error:', err));

    fetch(`${import.meta.env.VITE_API_URL}/feed?market=${market}`)
      .then(res => res.json())
      .then(data => setFeedPosts(data || []))
      .catch(err => console.error('Feed fetch error:', err));
  }, [market]);

  // Handle New Feed Post
  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!newPostText.trim() || !myComicProfile) return;

    setIsSubmitting(true);
    const postPayload = {
      author_id: myComicProfile.id,
      author_name: myComicProfile.name,
      content: newPostText.trim(),
      market: market
    };

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/feed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postPayload)
      });

      if (res.ok) {
        const createdPost = await res.json();
        setFeedPosts(prev => [createdPost, ...prev]);
        setNewPostText('');
        toast.success("Post dropped to the scene feed!");
      } else {
        toast.error("Failed to post");
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLikePost = async (postId) => {
    try {
      setFeedPosts(prev => prev.map(p => {
        if (p.id === postId) {
          return { ...p, likes: (p.likes || 0) + 1, userLiked: true };
        }
        return p;
      }));

      await fetch(`${import.meta.env.VITE_API_URL}/feed/${postId}/like`, { method: 'POST' });
    } catch (err) {
      console.error('Like error:', err);
    }
  };

  // Safe Property Resolution for Filter Search
  const filteredDirectory = directory.filter(comic => {
    if (!comic) return false;
    const name = comic.name || comic.comic_name || comic.username || comic.display_name || '';
    const bio = comic.bio || comic.about || '';
    const query = searchQuery.toLowerCase();
    return name.toLowerCase().includes(query) || bio.toLowerCase().includes(query);
  });

  return (
    <div className="p-4 sm:p-5 flex flex-col gap-5 animate-fade-in max-w-md mx-auto w-full flex-1">
      
      {/* PAGE TITLE & SUB-NAV */}
      <div className="flex flex-col gap-3 border-b border-slate-800/80 pb-3 mt-1">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-blue-400"></span>
            <span className="text-[10px] font-mono-data uppercase tracking-widest text-blue-400 font-bold">Local Community</span>
          </div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tight font-display">The Scene</h1>
        </div>

        {/* TAB SWITCHER: FEED ON LEFT, COMICS ON RIGHT */}
        <div className="flex bg-slate-900/90 border border-slate-800 p-1 rounded-2xl">
          <button
            onClick={() => setActiveTab('feed')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
              activeTab === 'feed'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-950/50 font-mono-data'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <i className="fa-solid fa-fire mr-1.5"></i> Feed
          </button>
          <button
            onClick={() => setActiveTab('directory')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
              activeTab === 'directory'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-950/50 font-mono-data'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <i className="fa-solid fa-users mr-1.5"></i> Comics ({directory.length})
          </button>
        </div>
      </div>

      {/* --- TAB 1: SCENE FEED (DEFAULT VIEW) --- */}
      {activeTab === 'feed' && (
        <div className="flex flex-col gap-4 animate-fade-in">
          
          {/* CREATE POST INPUT BOX */}
          {myComicProfile ? (
            <form onSubmit={handleCreatePost} className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl flex flex-col gap-3 shadow-lg">
              <textarea
                value={newPostText}
                onChange={(e) => setNewPostText(e.target.value)}
                placeholder="Share set notes, mic updates, or crowd talk..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none h-20"
                maxLength={280}
              />
              <div className="flex justify-between items-center pt-1">
                <span className="text-[10px] font-mono-data text-slate-500">
                  {280 - newPostText.length} chars left
                </span>
                <button
                  type="submit"
                  disabled={!newPostText.trim() || isSubmitting}
                  className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-black text-xs px-4 py-2 rounded-xl uppercase tracking-wider transition-all active:scale-95 shadow-md shadow-blue-950/50"
                >
                  Post to Scene
                </button>
              </div>
            </form>
          ) : (
            <div className="bg-slate-900/50 border border-dashed border-slate-800 p-4 rounded-2xl text-center">
              <p className="text-xs text-slate-400">Sign up on tonight's mic list to post to the local feed.</p>
            </div>
          )}

          {/* FEED POSTS LIST */}
          <div className="flex flex-col gap-3">
            {feedPosts.length === 0 ? (
              <div className="text-center text-slate-500 py-12 font-mono-data text-xs uppercase tracking-widest border border-dashed border-slate-800 rounded-2xl bg-slate-950/50">
                No scene posts in {market.replace('_', ' ')} yet.
              </div>
            ) : (
              feedPosts.map((post, idx) => {
                const authorName = post.author_name || post.user_name || post.name || post.username || 'System Feed';
                const authorId = post.author_id || post.user_id || post.comic_id;

                return (
                  <div key={post.id || idx} className="bg-slate-900/80 border border-slate-800/80 p-4 rounded-2xl flex flex-col gap-3 shadow-md">
                    
                    {/* Author Header */}
                    <div className="flex justify-between items-center">
                      <button
                        onClick={() => authorId && setSelectedComicId(authorId)}
                        className="font-bold text-xs text-white hover:text-blue-400 transition-colors flex items-center gap-2"
                      >
                        <div className="w-6 h-6 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center font-display font-black text-blue-400 text-xs">
                          {authorName.charAt(0).toUpperCase()}
                        </div>
                        <span>{authorName}</span>
                      </button>
                      <span className="text-[9px] font-mono-data text-slate-500">
                        {post.timestamp || 'Just now'}
                      </span>
                    </div>

                    {/* Post Content */}
                    <p className="text-xs text-slate-200 font-medium leading-relaxed">
                      {post.content || post.text || post.message}
                    </p>

                    {/* Footer Actions */}
                    <div className="flex justify-between items-center pt-2 border-t border-slate-800/60">
                      <button
                        onClick={() => handleLikePost(post.id)}
                        className={`flex items-center gap-1.5 text-xs font-mono-data font-bold transition-all active:scale-95 ${
                          post.userLiked ? 'text-red-400' : 'text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        <i className={`fa-heart ${post.userLiked ? 'fa-solid text-red-400' : 'fa-regular'}`}></i>
                        <span>{post.likes || 0}</span>
                      </button>

                      <span className="text-[9px] font-mono-data uppercase text-slate-600 tracking-wider">
                        {market.replace('_', ' ')}
                      </span>
                    </div>

                  </div>
                );
              })
            )}
          </div>

        </div>
      )}

      {/* --- TAB 2: COMIC DIRECTORY --- */}
      {activeTab === 'directory' && (
        <div className="flex flex-col gap-4 animate-fade-in">
          
          {/* SEARCH BAR */}
          <div className="relative">
            <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs"></i>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search local comics or bios..."
              className="w-full bg-slate-900/80 border border-slate-800 rounded-2xl pl-9 pr-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors font-sans"
            />
          </div>

          {/* COMICS LIST */}
          <div className="flex flex-col gap-3">
            {filteredDirectory.length === 0 ? (
              <div className="text-center text-slate-500 py-12 font-mono-data text-xs uppercase tracking-widest border border-dashed border-slate-800 rounded-2xl bg-slate-950/50">
                {searchQuery ? 'No comics matched search.' : `No comics registered in ${market.replace('_', ' ')}.`}
              </div>
            ) : (
              filteredDirectory.map((comic, idx) => {
                // Key resolution for seed DB format variations
                const name = comic.name || comic.comic_name || comic.username || comic.display_name || `Comic #${idx + 1}`;
                const comicId = comic.id || comic.user_id || comic.comic_id;
                const bio = comic.bio || comic.about || 'Local Standup Performer';
                const isMe = myComicProfile && (myComicProfile.id === comicId);

                return (
                  <div
                    key={comicId || idx}
                    onClick={() => comicId && setSelectedComicId(comicId)}
                    className={`bg-slate-900/80 hover:bg-slate-900 border p-4 rounded-2xl flex items-center justify-between cursor-pointer transition-all active:scale-95 group ${
                      isMe ? 'border-blue-500/50 glow-blue' : 'border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      {/* Avatar Badge */}
                      <div className="w-11 h-11 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center font-display font-black text-blue-400 text-base group-hover:border-blue-500/50 transition-colors shrink-0">
                        {name.charAt(0).toUpperCase()}
                      </div>
                      
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">
                            {name}
                          </h3>
                          {isMe && (
                            <span className="text-[9px] font-mono-data font-black bg-blue-950/80 text-blue-400 border border-blue-500/40 px-1.5 py-0.2 rounded uppercase">
                              YOU
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 font-medium line-clamp-1 mt-0.5">
                          {bio}
                        </p>
                      </div>
                    </div>

                    <div className="w-7 h-7 rounded-full bg-slate-950 flex items-center justify-center border border-slate-800 group-hover:border-blue-500/40 transition-colors shrink-0">
                      <i className="fa-solid fa-chevron-right text-slate-500 text-[10px] group-hover:text-blue-400 transition-colors"></i>
                    </div>
                  </div>
                );
              })
            )}
          </div>

        </div>
      )}

      {/* PROFILE CARD MODAL */}
      {selectedComicId && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-sm my-auto animate-fade-in flex justify-center">
            <ProfileCard 
              userId={selectedComicId} 
              currentUserId={myComicProfile?.id} 
              onClose={() => setSelectedComicId(null)} 
            />
          </div>
        </div>
      )}

    </div>
  );
}
