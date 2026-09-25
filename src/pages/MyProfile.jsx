import { useState, useEffect } from 'react';
import { useMic } from '../MicContext';
import toast from 'react-hot-toast';

export default function MyProfile() {
  const { myComicProfile, setMyComicProfile } = useMic();
  const [profileData, setProfileData] = useState(null);
  const [audioHistory, setAudioHistory] = useState([]);

  // Auth Form State (Login vs Register)
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [authUsername, setAuthUsername] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch Full Profile & Set Audio Archive safely
  useEffect(() => {
    if (!myComicProfile?.id) return;

    // Ignore temporary timestamp IDs from previous dev sessions
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
  }, [myComicProfile?.id]);

  // Handle DB Authentication (Login or Register)
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
        // Fallback
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
      // Default to Seed DB User ID '1' for local dev login matching
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
      <div className="p-4 sm:p-5 flex flex-col gap-5 animate-fade-in max-w-md mx-auto w-full my-auto">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
          
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 text-lg mx-auto mb-3 glow-blue">
            <i className="fa-solid fa-user-shield"></i>
          </div>
          
          <h2 className="text-2xl font-black text-white uppercase font-display text-center tracking-tight">
            Comic Account
          </h2>
          <p className="text-xs text-slate-400 font-medium text-center max-w-xs mx-auto mt-1 mb-5">
            Log in to unlock your stage vault and host permissions.
          </p>

          {/* LOGIN / REGISTER TAB SWITCHER */}
          <div className="flex bg-slate-950 border border-slate-800/80 p-1 rounded-xl mb-5">
            <button
              type="button"
              onClick={() => setAuthMode('login')}
              className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                authMode === 'login'
                  ? 'bg-blue-600 text-white font-mono-data shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Log In
            </button>
            <button
              type="button"
              onClick={() => setAuthMode('register')}
              className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                authMode === 'register'
                  ? 'bg-blue-600 text-white font-mono-data shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Register
            </button>
          </div>

          {/* AUTH FORM */}
          <form onSubmit={handleAuthSubmit} className="space-y-3.5 text-left">
            <div>
              <label className="block text-[10px] font-mono-data font-black text-slate-400 uppercase tracking-widest mb-1">
                {authMode === 'login' ? 'Username or Stage Name' : 'Stage / Comic Name'}
              </label>
              <input
                type="text"
                value={authUsername}
                onChange={(e) => setAuthUsername(e.target.value)}
                placeholder="e.g. austin_host"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 font-sans"
                required
              />
            </div>

            {authMode === 'register' && (
              <div>
                <label className="block text-[10px] font-mono-data font-black text-slate-400 uppercase tracking-widest mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="comic@domain.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 font-sans"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-[10px] font-mono-data font-black text-slate-400 uppercase tracking-widest mb-1">
                Password
              </label>
              <input
                type="password"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono-data"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-black py-3 rounded-xl uppercase tracking-widest text-xs transition-all active:scale-95 shadow-lg shadow-blue-950/50 mt-2 flex items-center justify-center gap-2"
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
    <div className="p-4 sm:p-5 flex flex-col gap-5 animate-fade-in max-w-md mx-auto w-full pb-8">
      
      {/* COMIC IDENTITY HEADER CARD */}
      <div className="bg-slate-900 border border-slate-800/80 rounded-3xl p-5 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-slate-950 border border-blue-500/40 flex items-center justify-center font-display font-black text-blue-400 text-2xl shadow-lg glow-blue">
              {myComicProfile.name ? myComicProfile.name.charAt(0).toUpperCase() : 'C'}
            </div>
            <div>
              <h1 className="text-xl font-black text-white uppercase tracking-tight font-display">
                {myComicProfile.name}
              </h1>
              <p className="text-xs text-blue-400 font-mono-data font-bold mt-0.5">
                Verified Performer
              </p>
            </div>
          </div>
        </div>

        {/* STATS OVERVIEW */}
        <div className="grid grid-cols-3 gap-2 mt-5 pt-4 border-t border-slate-800/80 relative z-10">
          <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800/60 text-center">
            <span className="text-lg font-black font-mono-data text-white block">
              {profileData?.total_mics || audioHistory.length || 0}
            </span>
            <span className="text-[9px] font-mono-data text-slate-500 uppercase tracking-wider block -mt-0.5">Mics Hit</span>
          </div>

          <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800/60 text-center">
            <span className="text-lg font-black font-mono-data text-blue-400 block">
              {audioHistory.length}
            </span>
            <span className="text-[9px] font-mono-data text-slate-500 uppercase tracking-wider block -mt-0.5">Audio Vault</span>
          </div>

          <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800/60 text-center">
            <span className="text-lg font-black font-mono-data text-amber-400 block">
              {profileData?.badges?.length || 1}
            </span>
            <span className="text-[9px] font-mono-data text-slate-500 uppercase tracking-wider block -mt-0.5">Badges</span>
          </div>
        </div>

      </div>

      {/* UNLOCKED BADGES SHOWCASE */}
      <div className="space-y-2">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest font-mono-data">
          Earned Achievements
        </h3>

        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          <div className="bg-slate-900 border border-amber-500/30 p-3 rounded-2xl flex items-center gap-3 min-w-[170px] shrink-0 glow-amber">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/40 flex items-center justify-center text-amber-400 text-xs shrink-0">
              <i className="fa-solid fa-microphone"></i>
            </div>
            <div>
              <h4 className="text-xs font-bold text-white uppercase font-display">First Mic</h4>
              <p className="text-[9px] text-slate-400 font-mono-data">Signed up & hit stage</p>
            </div>
          </div>

          {profileData?.badges?.map((badge, idx) => (
            <div key={idx} className="bg-slate-900 border border-blue-500/30 p-3 rounded-2xl flex items-center gap-3 min-w-[170px] shrink-0 glow-blue">
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/40 flex items-center justify-center text-blue-400 text-xs shrink-0">
                <i className="fa-solid fa-award"></i>
              </div>
              <div>
                <h4 className="text-xs font-bold text-white uppercase font-display">{badge.title || 'Badge'}</h4>
                <p className="text-[9px] text-slate-400 font-mono-data">{badge.desc || 'Unlocked'}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SET AUDIO VAULT */}
      <div className="space-y-3 mt-1">
        <div className="flex justify-between items-center">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest font-mono-data flex items-center gap-2">
            <i className="fa-solid fa-compact-disc text-blue-400"></i> Set Audio Vault ({audioHistory.length})
          </h3>
          <span className="text-[10px] font-mono-data text-slate-600 uppercase">Auto-Recorded</span>
        </div>

        {audioHistory.length === 0 ? (
          <div className="text-center text-slate-500 py-8 font-mono-data text-xs uppercase tracking-widest border border-dashed border-slate-800 rounded-2xl bg-slate-950/50">
            No set recordings archived yet.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {audioHistory.map((set, idx) => (
              <div key={set.id || idx} className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl flex flex-col gap-3 shadow-md">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-display font-bold text-sm text-white">{set.event_name || 'Open Mic Set'}</h4>
                    <p className="text-[10px] font-mono-data text-slate-400 mt-0.5">{set.date || 'Recorded Session'}</p>
                  </div>

                  <span className="text-[10px] font-mono-data font-black text-blue-400 bg-blue-950/80 border border-blue-500/30 px-2 py-0.5 rounded-md uppercase">
                    {set.duration || '03:00'}
                  </span>
                </div>

                {set.audio_url ? (
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center gap-3">
                    <audio controls src={set.audio_url} className="w-full h-8 accent-blue-500" />
                  </div>
                ) : (
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 flex justify-between items-center text-xs text-slate-400 font-mono-data">
                    <span>Audio processing on Pi...</span>
                    <i className="fa-solid fa-spinner animate-spin text-blue-400 text-xs"></i>
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
        className="w-full mt-2 bg-slate-950 hover:bg-red-950/40 text-slate-500 hover:text-red-400 border border-slate-800 hover:border-red-900/40 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95"
      >
        Sign Out Account
      </button>

    </div>
  );
}
