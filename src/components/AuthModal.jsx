import { useState } from 'react';
import { useAuth } from '../AuthContext';

export default function AuthModal({ isOpen, onClose }) {
  const { login, register } = useAuth();
  const [isLoginView, setIsLoginView] = useState(true);
  
  // Form State
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    let success = false;
    if (isLoginView) {
      success = await login(username, password);
    } else {
      success = await register(username, email, password);
    }

    setIsLoading(false);
    if (success) {
      // Reset form and close modal on success
      setUsername(''); setEmail(''); setPassword('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#242526] border border-[#3e4042] rounded-2xl w-full max-w-sm p-6 relative shadow-2xl">
        
        {/* Close Button */}
        <button onClick={onClose} className="absolute top-4 right-4 text-[#b0b3b8] hover:text-white transition-colors p-1">
          <i className="fa-solid fa-xmark text-lg"></i>
        </button>

        <h2 className="text-xl font-black text-white mb-6 tracking-wide uppercase font-display">
          {isLoginView ? 'Welcome Back' : 'Join the Scene'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-[#b0b3b8] uppercase tracking-widest font-mono-data mb-1.5">Username</label>
            <input 
              type="text" 
              required 
              value={username} 
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-[#18191a] border border-[#3e4042] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#2d88ff] transition-colors font-sans"
              placeholder="Stage Name" 
            />
          </div>

          {!isLoginView && (
            <div>
              <label className="block text-[10px] font-bold text-[#b0b3b8] uppercase tracking-widest font-mono-data mb-1.5">Email</label>
              <input 
                type="email" 
                required 
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#18191a] border border-[#3e4042] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#2d88ff] transition-colors font-sans"
                placeholder="you@email.com" 
              />
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold text-[#b0b3b8] uppercase tracking-widest font-mono-data mb-1.5">Password</label>
            <input 
              type="password" 
              required 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#18191a] border border-[#3e4042] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#2d88ff] transition-colors font-mono-data tracking-widest"
              placeholder="••••••••" 
            />
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-[#2d88ff] hover:bg-[#1b74e4] disabled:opacity-40 text-white font-bold py-3 rounded-xl mt-2 transition-colors text-[10px] uppercase tracking-widest font-mono-data flex justify-center items-center gap-2"
          >
            {isLoading ? <i className="fa-solid fa-spinner animate-spin"></i> : (isLoginView ? 'Log In' : 'Create Account')}
          </button>
        </form>

        <div className="mt-5 text-center">
          <button 
            type="button" 
            onClick={() => setIsLoginView(!isLoginView)} 
            className="text-[10px] text-[#b0b3b8] hover:text-[#2d88ff] transition-colors underline font-mono-data"
          >
            {isLoginView ? "Don't have an account? Sign up" : "Already have an account? Log in"}
          </button>
        </div>

      </div>
    </div>
  );
}
