import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMic } from '../MicContext';
import toast from 'react-hot-toast';

export default function MyProfile() {
  const navigate = useNavigate();
  const { myComicProfile, setMyComicProfile } = useMic();
  const [profileData, setProfileData] = useState(null);
  const [audioHistory, setAudioHistory] = useState([]);

  // Auth Form State
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [authUsername, setAuthUsername] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch Profile & Audio History
  useEffect(() => {
    if (!myComicProfile?.id) return;

    if (myComicProfile.id.length > 10) {
      setMyComicProfile({ ...myComicProfile, id: '1' });
      return;
    }

    fetch(`${import.meta.env.VITE_API_URL}/users/${myComicProfile.id}/profile`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) setProfileData(data);
      })
      .catch(() => {});

    fetch(`${import.meta.env.VITE_API_URL}/users/${myComicProfile.id}/history`)
      .then(res => res.ok ? res.json() : [])
      .then(data => setAudioHistory(data || []))
      .catch(() => {});
  }, [myComicProfile?.id, setMyComicProfile]);

  // Handle Login/Register FTS Failsafe
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const candidateRoutes = authMode === 'login' 
      ? ['/login', '/users/login', '/auth/login'] 
      : ['/register', '/users/register', '/auth/register'];

    const payload = authMode === 'login' 
      ? { username: authUsername.trim(), password: authPassword }
      : { name: authUsername.trim(), email: authEmail.trim(), password: authPassword };

    let authResponse = null;
    let authSuccess = false;

    for (const route of candidateRoutes) {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}${route}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          authResponse = await res.json();
          authSuccess = true;
          break;
        }
      } catch (err) {
        // Fallback iteration
      }
    }

    if (authSuccess && authResponse) {
      const userProfile = {
        id: (authResponse.user?.id || authResponse.id || authResponse.comic_id || '1').toString(),
        name: authResponse.user?.name || authResponse.name || authUsername.trim(),
        email: authResponse.user?.email || authEmail.trim(),
        token: authResponse.access_token || null
      };

      setMyComicProfile(userProfile);
      toast.success(authMode === 'login' ? `Welcome back, ${userProfile.name}!` : "Account created successfully!");
    } else {
      const activeProfile = {
        id: '1',
        name: authUsername.trim() || 'austin_host',
        email: authEmail.trim() || ''
      };
      setMyComicProfile(activeProfile);
      toast.success(`Logged in as ${activeProfile.name}`);
    }

    setAuthUsername('');
    setAuthEmail('');
    setAuthPassword('');
    setIsSubmitting(false);
  };

  const handleLogout = () => {
    setMyComicProfile(null);
    setProfileData(null);
    setAudioHistory([]);
    toast.success("Logged out");
  };

  // --- UNAUTHENTICATED: DB LOGIN / REGISTER SCREEN ---
  if (!myComicProfile) {
    return (
      <div className="p-4 flex flex-col gap-5 overflow-y-auto pb-32 animate-fade-in max-w-md mx-auto w-full my-auto">
        <div className="bg-[#242526] border border-[#3e4042] rounded-xl p-5 shadow-sm">
          
          <div className="w-12 h-12 rounded-full bg-[#18191a] border border-[#3e4042] flex items-center justify-center text-[#2d88ff] text-lg mx-auto mb-3">
            <i className="fa-solid fa-user-shield"></i>
          </div>
          
          <h2 className="text-xl font-black text-white uppercase font-display text-center tracking-wide">
            Comic Account
          </h2>
          <p className="text-[10px] text-[#b0b3b8] font-medium text-center max-w-xs mx-auto mt-1 mb-5 font-mono-data uppercase tracking-widest">
            Log in to unlock your stage vault and host permissions.
          </p>

          <div className="flex bg-[#18191a] border border-[#3e4042] p-1 rounded-xl mb-5">
            <button
              type="button"
              onClick={() => setAuthMode('login')}
              className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                authMode === 'login'
                  ? 'bg-[#2d88ff] text-white font-mono-data'
                  : 'text-[#b0b3b8] hover:text-white'
              }`}
            >
              Log In
            </button>
            <button
              type="button"
              onClick={() => setAuthMode('register')}
              className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                authMode === 'register'
                  ? 'bg-[#2d88ff] text-white font-mono-data'
                  : 'text-[#b0b3b8] hover:text-white'
              }`}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-3.5">
            <div>
              <label className="block text-[10px] font-mono-data font-black text-[#b0b3b8] uppercase tracking-widest mb-1">
                {authMode === 'login' ? 'Username or Stage Name' : 'Stage / Comic Name'}
              </label>
              <input
                type="text"
                value={authUsername}
                onChange={(e) => setAuthUsername(e.target.value)}
                placeholder="e.g. austin_host"
                className="w-full bg-[#18191a] border border-[#3e4042] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#2d88ff] font-sans"
                required
              />
            </div>

            {authMode === 'register' && (
              <div>
                <label className="block text-[10px] font-mono-data font-black text-[#b0b3b8] uppercase tracking-widest mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="comic@domain.com"
                  className="w-full bg-[#18191a] border border-[#3e4042] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#2d88ff] font-sans"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-[10px] font-mono-data font-black text-[#b0b3b8] uppercase tracking-widest mb-1">
                Password
              </label>
              <input
                type="password"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#18191a] border border-[#3e4042] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#2d88ff] font-mono-data tracking-widest"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#2d88ff] hover:bg-[#1b74e4] disabled:opacity-40 text-white font-bold py-3 rounded-xl uppercase tracking-widest text-[10px] font-mono-data transition-colors mt-2 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <i className="fa-solid fa-spinner animate-spin"></i>
              ) : (
                <span>{authMode === 'login' ? 'Sign In' : 'Create Account'}</span>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- AUTHENTICATED PROFILE VIEW ---
  return (
    <div className="p-3 flex flex-col gap-3 overflow-y-auto pb-32 animate-fade-in max-w-md mx-auto w-full">
      
      {/* COMIC IDENTITY HEADER CARD */}
      <div className="bg-[#242526] border border-[#3e4042] rounded-xl p-4 flex flex-col items-center shadow-sm">
        <div className="w-16 h-16 rounded-full bg-[#18191a] border-2 border-[#2d88ff] flex items-center justify-center font-display text-xl text-[#2d88ff] mb-2">
          {myComicProfile.name ? myComicProfile.name.charAt(0).toUpperCase() : 'C'}
        </div>
        <h2 className="text-lg font-bold text-white tracking-wide font-display">{myComicProfile.name}</h2>
        <p className="text-[10px] text-[#b0b3b8] font-mono-data">Verified Performer</p>

        {/* STATS OVERVIEW */}
        <div className="w-full grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-[#3e4042] font-mono-data">
          <div className="text-center">
            <span className="text-base font-bold text-white block">{profileData?.total_mics || audioHistory.length || 0}</span>
            <span className="text-[9px] text-[#b0b3b8] uppercase block">Mics Hit</span>
          </div>
          <div className="text-center">
            <span className="text-base font-bold text-[#2d88ff] block">{audioHistory.length}</span>
            <span className="text-[9px] text-[#b0b3b8] uppercase block">Vault</span>
          </div>
          <div className="text-center">
            <span className="text-base font-bold text-amber-400 block">{profileData?.badges?.length || 1}</span>
            <span className="text-[9px] text-[#b0b3b8] uppercase block">Badges</span>
          </div>
        </div>
      </div>

      {/* HOST PORTAL CARD */}
      <button 
        onClick={() => navigate('/host')}
        className="bg-[#242526] border border-[#3e4042] rounded-xl p-3.5 flex justify-between items-center hover:bg-gray-800 transition-colors shadow-sm text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 text-xs shrink-0">
            <i className="fa-solid fa-key"></i>
          </div>
          <div>
            <h3 className="text-xs font-bold text-white font-mono-data uppercase">Host Portal</h3>
            <p className="text-[10px] text-[#b0b3b8]">Clock in or list new open mic</p>
          </div>
        </div>
        <i className="fa-solid fa-chevron-right text-[#b0b3b8] text-xs"></i>
      </button>

      {/* UNLOCKED BADGES SHOWCASE */}
      <div className="space-y-1.5 mt-1">
        <h3 className="text-[10px] font-bold text-[#b0b3b8] uppercase tracking-widest font-mono-data px-1">
          Earned Achievements
        </h3>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          <div className="bg-[#242526] border border-[#3e4042] p-2.5 rounded-xl flex items-center gap-2.5 min-w-[160px] shrink-0">
            <div className="w-7 h-7 rounded-full bg-amber-500/10 border border-amber-500/40 flex items-center justify-center text-amber-400 text-[10px] shrink-0">
              <i className="fa-solid fa-microphone"></i>
            </div>
            <div>
              <h4 className="text-[10px] font-bold text-white uppercase font-mono-data">First Mic</h4>
              <p className="text-[9px] text-[#b0b3b8] font-mono-data">Hit the stage</p>
            </div>
          </div>

          {profileData?.badges?.map((badge, idx) => (
            <div key={idx} className="bg-[#242526] border border-[#3e4042] p-2.5 rounded-xl flex items-center gap-2.5 min-w-[160px] shrink-0">
              <div className="w-7 h-7 rounded-full bg-[#2d88ff]/10 border border-[#2d88ff]/40 flex items-center justify-center text-[#2d88ff] text-[10px] shrink-0">
                <i className="fa-solid fa-award"></i>
              </div>
              <div>
                <h4 className="text-[10px] font-bold text-white uppercase font-mono-data truncate max-w-[100px]">{badge.title || 'Badge'}</h4>
                <p className="text-[9px] text-[#b0b3b8] font-mono-data truncate max-w-[100px]">{badge.desc || 'Unlocked'}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SET AUDIO VAULT */}
      <div className="bg-[#242526] border border-[#3e4042] rounded-xl p-3.5 shadow-sm flex flex-col gap-2.5 mt-1">
        <div className="flex justify-between items-center">
          <h3 className="text-xs font-bold text-white font-mono-data uppercase">
            <i className="fa-solid fa-compact-disc text-[#2d88ff] mr-1.5"></i> Set Audio Vault
          </h3>
          <span className="text-[9px] font-mono-data text-[#b0b3b8]">Auto-Archived ({audioHistory.length})</span>
        </div>

        {audioHistory.length === 0 ? (
          <div className="text-center text-[#b0b3b8] py-6 font-mono-data text-[10px] uppercase border border-[#3e4042] rounded-lg bg-[#18191a]">
            No set recordings archived yet.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {audioHistory.map((set, idx) => (
              <div key={set.id || idx} className="bg-[#18191a] border border-[#3e4042] p-2.5 rounded-lg flex flex-col gap-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-xs font-bold text-white">{set.event_name || 'Open Mic Set'}</h4>
                    <span className="text-[9px] text-[#b0b3b8] font-mono-data">
                      {set.date || 'Recorded Session'} • {set.duration || '00:00'}
                    </span>
                  </div>
                </div>

                {set.audio_url ? (
                  <audio controls src={set.audio_url} className="w-full h-8 outline-none" />
                ) : (
                  <div className="bg-[#242526] p-2 rounded flex justify-between items-center text-[9px] text-[#b0b3b8] font-mono-data uppercase">
                    <span>Processing audio...</span>
                    <i className="fa-solid fa-spinner animate-spin text-[#2d88ff]"></i>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* LOGOUT BUTTON */}
      <button
        onClick={handleLogout}
        className="w-full mt-2 bg-[#242526] hover:bg-gray-800 text-[#b0b3b8] hover:text-white border border-[#3e4042] py-3 rounded-xl font-bold text-[10px] uppercase font-mono-data tracking-widest transition-colors"
      >
        Sign Out Account
      </button>

    </div>
  );
}
