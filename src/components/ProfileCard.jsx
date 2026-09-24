import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
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

  useEffect(() => {
    fetchProfile();
  }, [userId]);

  const fetchProfile = async () => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/users/${userId}/profile`);
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
      const res = await fetch(`http://127.0.0.1:8000/users/${userId}/vote?voter_id=${currentUserId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: categoryId })
      });
      
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || 'Endorsement recorded!');
        setShowEndorseModal(false);
      } else {
        toast.error(data.detail || 'Failed to endorse');
      }
    } catch (err) {
      toast.error('Network error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const navigate = useNavigate();

  const handleMessageClick = () => {
    if (onClose) onClose();
    navigate(`/chat/${userId}`);
  };

  if (isLoading) {
    return <div className="p-6 text-center text-slate-400 font-bold tracking-widest text-xs uppercase animate-pulse">Loading ID...</div>;
  }

  if (!profile) return null;

  const isOwnProfile = String(userId) === String(currentUserId);
  
  // Brutal attendance styling
  const pct = profile.attendance_percentage;
  const pctColor = pct >= 90 ? 'text-emerald-400' : pct >= 70 ? 'text-amber-400' : 'text-red-500';

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden max-w-sm w-full shadow-2xl relative">
      
      {/* Close Button (if rendered in a modal) */}
      {onClose && (
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors">
          <i className="fa-solid fa-xmark text-lg"></i>
        </button>
      )}

      {/* Identity Header */}
      <div className="flex flex-col items-center p-6 bg-slate-900 border-b border-slate-800/50">
        <img 
          src={profile.avatar_url || `https://ui-avatars.com/api/?name=${profile.username}&background=0f172a&color=fff`} 
          alt={profile.username}
          className="w-24 h-24 rounded-full object-cover border-2 border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.2)] mb-4"
        />
        <h2 className="text-2xl font-black text-white tracking-tight">{profile.username}</h2>
        
        <div className="flex items-center gap-3 mt-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
          <span>{profile.is_host ? 'Host / Comic' : 'Comic'}</span>
          <span>•</span>
          <span>Since {new Date(profile.registered_date).getFullYear()}</span>
        </div>

        {profile.ig_handle && (
          <a 
            href={`https://instagram.com/${profile.ig_handle.replace('@', '')}`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="mt-3 text-indigo-400 hover:text-indigo-300 text-sm font-bold flex items-center gap-2 transition-colors"
          >
            <i className="fa-brands fa-instagram text-lg"></i>
            {profile.ig_handle}
          </a>
        )}
      </div>

      {/* Stats & Badges */}
      <div className="p-6 space-y-6">
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Attendance</span>
          <span className={`text-4xl font-black tracking-tighter ${pctColor}`}>
            {pct}%
          </span>
        </div>

        {profile.badges && profile.badges.length > 0 && (
          <div className="border-t border-slate-800 pt-6">
            <span className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 text-center">Verified Badges</span>
            <div className="flex flex-wrap justify-center gap-2">
              {profile.badges.map(badgeId => {
                const b = BADGE_CATEGORIES.find(c => c.id === badgeId);
                return (
                  <span key={badgeId} className="px-3 py-1 bg-indigo-950/50 text-indigo-400 border border-indigo-500/30 rounded-full text-[10px] font-bold uppercase tracking-widest">
                    <i className="fa-solid fa-check mr-1.5"></i>
                    {b ? b.label : badgeId}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Action Bar */}
      {!isOwnProfile && (
        <div className="flex border-t border-slate-800 bg-slate-900">
          <button 
            onClick={() => setShowEndorseModal(true)}
            className="flex-1 py-4 flex justify-center items-center gap-2 text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 border-r border-slate-800 transition-colors uppercase tracking-widest"
          >
            <i className="fa-solid fa-award text-indigo-400"></i> Endorse
          </button>
          <button 
            onClick={handleMessageClick}
            className="flex-1 py-4 flex justify-center items-center gap-2 text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors uppercase tracking-widest"
          >
            <i className="fa-solid fa-paper-plane text-emerald-400"></i> Message
          </button>
        </div>
      )}

      {/* Endorse Modal Overlay */}
      {showEndorseModal && (
        <div className="absolute inset-0 bg-slate-950/90 flex flex-col justify-center items-center p-6 z-10 backdrop-blur-sm">
          <h3 className="text-white font-black uppercase tracking-widest mb-1">Endorse {profile.username}</h3>
          <p className="text-slate-400 text-xs text-center mb-6">Your vote contributes to unlocking verified badges on this profile.</p>
          
          <div className="w-full space-y-2 mb-6">
            {BADGE_CATEGORIES.map(badge => (
              <button 
                key={badge.id}
                onClick={() => handleEndorse(badge.id)}
                disabled={isSubmitting}
                className="w-full py-3 bg-slate-900 border border-slate-700 rounded-lg text-sm font-bold text-slate-300 hover:bg-indigo-900 hover:border-indigo-500 hover:text-white transition-all uppercase tracking-widest disabled:opacity-50"
              >
                {badge.label}
              </button>
            ))}
          </div>

          <button 
            onClick={() => setShowEndorseModal(false)}
            className="text-xs font-bold text-slate-500 hover:text-white uppercase tracking-widest"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
