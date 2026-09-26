import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';

const BADGE_CATEGORIES = [
  { id: 'tight_5', label: 'Tight 5' },
  { id: 'tight_15', label: 'Tight 15' },
  { id: 'can_host', label: 'Can Host' },
  { id: 'feature_material', label: 'Feature Material' }
];

export default function ProfileCard({ userId, currentUserId, onClose }) {
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showEndorseModal, setShowEndorseModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    fetchProfile();
  }, [userId]);

  const fetchProfile = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/users/${userId}/profile`);
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
      } else {
        toast.error('Failed to load profile');
      }
    } catch (err) {
      toast.error('Network error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEndorse = async (categoryId) => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/users/${userId}/vote?voter_id=${currentUserId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: categoryId })
      });
      
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || 'Endorsement recorded!');
        setShowEndorseModal(false);
        fetchProfile();
      } else {
        toast.error(data.detail || 'Failed to endorse');
      }
    } catch (err) {
      toast.error('Network error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMessageClick = () => {
    if (onClose) onClose();
    navigate('/inbox', { state: { startChatWith: profile } });
  };

  const isOwnProfile = String(userId) === String(currentUserId);
  const pct = profile?.attendance_percentage ?? 100;
  const pctColor = pct >= 90 ? 'text-emerald-400 border-emerald-500/30 bg-emerald-950/20' : pct >= 70 ? 'text-amber-400 border-amber-500/30 bg-amber-950/20' : 'text-red-500 border-red-500/30 bg-red-950/20';

  // Render the modal into document.body to escape CSS stacking contexts
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fade-in">
      
      <div className="bg-slate-950 border-2 border-slate-800 rounded-3xl overflow-hidden max-w-xs w-full shadow-2xl relative my-auto">
        
        {/* Close Button */}
        {onClose && (
          <button 
            onClick={onClose} 
            className="absolute top-3 right-3 z-20 w-7 h-7 rounded-full bg-slate-900 border border-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-all active:scale-95"
          >
            <i className="fa-solid fa-xmark text-xs"></i>
          </button>
        )}

        {isLoading ? (
          <div className="p-8 text-center text-slate-400 font-mono-data font-black tracking-widest text-xs uppercase animate-pulse">
            <i className="fa-solid fa-id-card text-indigo-400 text-2xl mb-2 block"></i>
            Loading ID...
          </div>
        ) : profile ? (
          <>
            {/* Identity Header */}
            <div className="flex flex-col items-center p-4 bg-slate-900/90 border-b border-slate-800 relative">
              <div className="relative mb-2">
                <img 
                  src={profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.username)}&background=0f172a&color=fff`} 
                  alt={profile.username}
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-indigo-500 shadow-md"
                />
                {profile.is_host && (
                  <span className="absolute -bottom-1 -right-1 bg-indigo-600 text-white text-[8px] font-mono-data font-black px-1.5 py-0.2 rounded uppercase border border-indigo-400">
                    Host
                  </span>
                )}
              </div>

              <h2 className="text-2xl font-black text-white uppercase tracking-tight font-display text-center leading-tight">
                {profile.username}
              </h2>
              
              <div className="flex items-center gap-1.5 mt-0.5 text-[9px] font-mono-data font-bold text-slate-400 uppercase tracking-wider">
                <span>{profile.home_market ? profile.home_market.replace('_', ' ') : 'Texas'}</span>
                <span>•</span>
                <span>Est. {new Date(profile.registered_date).getFullYear()}</span>
              </div>

              {profile.ig_handle && (
                <a 
                  href={`https://instagram.com/${profile.ig_handle.replace('@', '')}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="mt-2 bg-slate-950/80 border border-slate-800 hover:border-indigo-500/50 text-indigo-400 px-2.5 py-1 rounded-lg text-[10px] font-mono-data font-bold flex items-center gap-1.5 transition-all"
                >
                  <i className="fa-brands fa-instagram text-xs"></i>
                  @{profile.ig_handle.replace('@', '')}
                </a>
              )}
            </div>

            {/* Compact Stats & Badges */}
            <div className="p-3.5 space-y-3">
              <div className={`p-2.5 rounded-xl border flex items-center justify-between ${pctColor}`}>
                <div>
                  <span className="block text-[8px] font-mono-data font-black uppercase tracking-widest text-slate-400">
                    Attendance Rating
                  </span>
                  <span className="text-[9px] font-mono-data text-slate-400 block">
                    {pct >= 90 ? 'Reliable' : pct >= 70 ? 'Regular' : 'Low Attendance'}
                  </span>
                </div>
                <span className="text-2xl font-black font-mono-data tracking-tighter">
                  {pct}%
                </span>
              </div>

              {profile.badges && profile.badges.length > 0 ? (
                <div className="border-t border-slate-800/80 pt-2.5">
                  <span className="block text-[8px] font-mono-data font-black text-slate-500 uppercase tracking-widest mb-1.5 text-center">
                    Verified Badges
                  </span>
                  <div className="flex flex-wrap justify-center gap-1">
                    {profile.badges.map(badgeId => {
                      const b = BADGE_CATEGORIES.find(c => c.id === badgeId);
                      return (
                        <span key={badgeId} className="px-2 py-0.5 bg-indigo-950/60 text-indigo-300 border border-indigo-500/40 rounded-lg text-[9px] font-mono-data font-bold uppercase tracking-wider flex items-center gap-1">
                          <i className="fa-solid fa-circle-check text-indigo-400 text-[8px]"></i>
                          {b ? b.label : badgeId}
                        </span>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>

            {/* Action Bar */}
            {!isOwnProfile && (
              <div className="flex border-t border-slate-800 bg-slate-900">
                <button 
                  onClick={() => setShowEndorseModal(true)}
                  className="flex-1 py-3 flex justify-center items-center gap-1.5 text-[11px] font-mono-data font-bold text-slate-300 hover:text-white hover:bg-slate-800 border-r border-slate-800 transition-colors uppercase tracking-wider"
                >
                  <i className="fa-solid fa-award text-amber-400 text-xs"></i> Endorse
                </button>
                <button 
                  onClick={handleMessageClick}
                  className="flex-1 py-3 flex justify-center items-center gap-1.5 text-[11px] font-mono-data font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors uppercase tracking-wider"
                >
                  <i className="fa-solid fa-paper-plane text-indigo-400 text-xs"></i> Message
                </button>
              </div>
            )}

            {/* Endorse Modal Overlay */}
            {showEndorseModal && (
              <div className="absolute inset-0 bg-slate-950/95 flex flex-col justify-center items-center p-4 z-30 backdrop-blur-md">
                <h3 className="text-white font-black font-display text-xl uppercase tracking-wide mb-1">
                  Endorse {profile.username}
                </h3>
                <p className="text-slate-400 text-[9px] font-mono-data text-center mb-4 px-1">
                  Host votes carry a 3.34x multiplier.
                </p>
                
                <div className="w-full space-y-1.5 mb-4">
                  {BADGE_CATEGORIES.map(badge => (
                    <button 
                      key={badge.id}
                      onClick={() => handleEndorse(badge.id)}
                      disabled={isSubmitting}
                      className="w-full py-2 bg-slate-900 border border-slate-800 rounded-xl text-[10px] font-mono-data font-bold text-slate-200 hover:bg-indigo-950 hover:border-indigo-500 hover:text-white transition-all uppercase tracking-wider disabled:opacity-50"
                    >
                      + Endorse "{badge.label}"
                    </button>
                  ))}
                </div>

                <button 
                  onClick={() => setShowEndorseModal(false)}
                  className="text-[10px] font-mono-data font-bold text-slate-500 hover:text-white uppercase tracking-widest px-3 py-1"
                >
                  Cancel
                </button>
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>,
    document.body
  );
}
