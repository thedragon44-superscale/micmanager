import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useMic } from '../MicContext';
import toast from 'react-hot-toast';

export default function SceneComments() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { myComicProfile } = useMic();

  const [parentPost, setParentPost] = useState(location.state?.post || null);
  const [comments, setComments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!postId) return;
    
    setIsLoading(true);
    
    if (!parentPost) {
      fetch(`${import.meta.env.VITE_API_URL}/feed/${postId}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => setParentPost(data))
        .catch(err => console.error(err));
    }

    fetch(`${import.meta.env.VITE_API_URL}/feed/${postId}/comments`)
      .then(res => {
        if (!res.ok) throw new Error("Comments array not found");
        return res.json();
      })
      .then(data => setComments(Array.isArray(data) ? data : data.comments || []))
      .catch(err => {
        console.warn("Backend missing comment table for this post:", err);
        setComments([]);
      })
      .finally(() => setIsLoading(false));
  }, [postId]);

  const handleLikeComment = async (commentId) => {
    if (!myComicProfile?.id) return;
    
    const previousComments = [...comments];

    setComments(prev => prev.map(c => {
      if (c.id === commentId) {
        const isLiked = c.user_liked;
        const currentCount = parseInt(c.likes_count) || 0;
        return { ...c, likes_count: currentCount + (isLiked ? -1 : 1), user_liked: !isLiked };
      }
      return c;
    }));

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/comments/${commentId}/like`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: myComicProfile.id })
      });
      if (!res.ok) throw new Error("Like rejected by backend");
    } catch (err) {
      toast.error("Could not like comment.");
      setComments(previousComments);
    }
  };

  const handlePostComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    if (!myComicProfile?.id) {
      toast.error("Must be logged in to comment.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/feed/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          post_id: postId,
          author_id: myComicProfile.id,
          author_name: myComicProfile.name,
          content: newComment,
          timestamp: new Date().toISOString()
        })
      });

      if (res.ok) {
        const postedComment = await res.json();
        setComments(prev => [...prev, postedComment]);
        setNewComment('');
        setParentPost(prev => prev ? { ...prev, comments_count: (parseInt(prev.comments_count) || 0) + 1 } : prev);
      } else {
        // Explicitly catch the 404 shown in the console
        if (res.status === 404) {
          toast.error("This specific post does not support comments.");
        } else {
          toast.error("Failed to save comment to database.");
        }
      }
    } catch (err) {
      toast.error("Network error posting comment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 w-full animate-fade-in">
        <i className="fa-solid fa-spinner animate-spin text-[#2d88ff] text-2xl mb-3"></i>
        <span className="text-[10px] font-mono-data text-[#b0b3b8] uppercase tracking-widest">Loading thread...</span>
      </div>
    );
  }

  if (!parentPost && !isLoading) {
    return (
      <div className="p-4 text-center mt-20">
        <p className="text-[#b0b3b8] text-xs font-mono-data uppercase">Post not found or deleted.</p>
        <button onClick={() => navigate('/scene')} className="text-[#2d88ff] text-xs mt-3 font-bold border border-[#2d88ff]/40 bg-[#2d88ff]/10 px-4 py-2 rounded-lg">Return to Scene</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#18191a] animate-fade-in max-w-md mx-auto w-full pb-20">
      
      <div className="bg-[#242526] border-b border-[#3e4042] p-3 flex items-center gap-3 sticky top-[60px] z-20 shadow-sm">
        <button onClick={() => navigate('/scene')} className="text-[#2d88ff] p-1 hover:text-white transition-colors">
          <i className="fa-solid fa-arrow-left"></i>
        </button>
        <h2 className="font-bold text-xs text-white uppercase font-mono-data tracking-wider flex-1">
          Comment Thread
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <div className="bg-[#242526] border border-[#3e4042] rounded-xl p-4 shadow-sm mb-4">
          <div className="flex items-center justify-between mb-2">
            {parentPost.is_system ? (
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 text-xs shrink-0">
                  <i className="fa-solid fa-robot"></i>
                </div>
                <div>
                  <span className="text-xs font-bold text-white font-mono-data">System Telemetry</span>
                  <span className="text-[9px] text-[#b0b3b8] block font-mono-data">{parentPost.timestamp || 'Just now'}</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#18191a] border border-[#3e4042] flex items-center justify-center font-bold text-[#2d88ff] text-xs shrink-0">
                  {(parentPost.author_name || 'U').charAt(0).toUpperCase()}
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">{parentPost.author_name}</span>
                  <span className="text-[9px] text-[#b0b3b8] block font-mono-data">{parentPost.timestamp}</span>
                </div>
              </div>
            )}
            
            {parentPost.is_system && (
              <span className="text-[9px] font-mono-data text-amber-400 bg-amber-950/60 border border-amber-500/30 px-1.5 py-0.5 rounded uppercase">Alert</span>
            )}
          </div>

          <p className={`text-xs leading-relaxed mt-1 ${parentPost.is_system ? 'text-amber-100 font-mono-data bg-[#18191a] p-2.5 rounded-lg border border-[#3e4042]' : 'text-[#e4e6eb] font-bold'}`}>
            {parentPost.content}
          </p>

          <div className="flex gap-4 border-t border-[#3e4042] pt-2 mt-2 text-[11px] font-mono-data font-bold text-[#b0b3b8]">
            <span className={parentPost.user_liked ? 'text-[#2d88ff]' : ''}><i className="fa-solid fa-bolt mr-1"></i> {parentPost.likes_count || 0} Likes</span>
            <span><i className="fa-solid fa-comment mr-1"></i> {parentPost.comments_count || 0} Comments</span>
          </div>
        </div>

        <div className="space-y-4 pl-2">
          {comments.length === 0 ? (
            <div className="text-center py-6 text-[10px] font-mono-data text-[#b0b3b8] uppercase tracking-widest">
              Be the first to comment.
            </div>
          ) : (
            comments.map((comment, index) => (
              <div key={comment.id || index} className="flex gap-3 relative">
                {index !== comments.length - 1 && (
                  <div className="absolute left-3.5 top-8 bottom-[-16px] w-[1px] bg-[#3e4042]"></div>
                )}
                <div className="w-7 h-7 rounded-full bg-[#242526] border border-[#3e4042] flex items-center justify-center font-bold text-[#b0b3b8] text-[10px] shrink-0 z-10">
                  {(comment.author_name || 'C').charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 pb-1">
                  <div className="flex items-baseline gap-2 mb-0.5">
                    <span className="text-xs font-bold text-white">{comment.author_name}</span>
                    <span className="text-[8px] text-[#b0b3b8] font-mono-data">{comment.timestamp || 'Just now'}</span>
                  </div>
                  <p className="text-xs text-[#e4e6eb] leading-relaxed mb-1">
                    {comment.content}
                  </p>
                  <div className="flex items-center gap-3 text-[10px] font-mono-data font-bold text-[#b0b3b8]">
                    <button 
                      onClick={() => handleLikeComment(comment.id)} 
                      className={`hover:text-white transition-colors ${comment.user_liked ? 'text-[#2d88ff]' : ''}`}
                    >
                      Like {comment.likes_count > 0 && `(${comment.likes_count})`}
                    </button>
                    <button className="hover:text-white transition-colors">Reply</button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="bg-[#242526] border-t border-[#3e4042] p-2.5 fixed bottom-[64px] left-0 right-0 max-w-md mx-auto z-20 shadow-lg">
        <form onSubmit={handlePostComment} className="flex gap-2 items-center relative">
          <input 
            type="text" 
            placeholder="Write a comment..." 
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            disabled={isSubmitting}
            className="flex-1 bg-[#18191a] border border-[#3e4042] rounded-full px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#2d88ff] transition-colors font-sans disabled:opacity-50"
          />
          <button 
            type="submit" 
            disabled={!newComment.trim() || isSubmitting}
            className="text-[#2d88ff] hover:text-[#1b74e4] disabled:opacity-40 font-bold px-2 py-1 transition-colors text-sm"
          >
            {isSubmitting ? <i className="fa-solid fa-spinner animate-spin"></i> : <i className="fa-solid fa-paper-plane"></i>}
          </button>
        </form>
      </div>
    </div>
  );
}
