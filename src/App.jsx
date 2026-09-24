import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Context Providers
import { AuthProvider } from './AuthContext';
import { MicProvider } from './MicContext';

// Layout Components
import Header from './components/Header';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import GlobalAudioGuard from './components/GlobalAudioGuard';

// Pages
import Landing from './pages/Landing';
import Ticket from './pages/Ticket';
import Signup from './pages/Signup';
import HostDashboard from './pages/HostDashboard';
import LiveStage from './pages/LiveStage';
import ListMic from './pages/ListMic';
import MyProfile from './pages/MyProfile';
import Scene from './pages/Scene';
import Inbox from './pages/Inbox';
import Chat from './pages/Chat';

function App() {
  const [isNavOpen, setIsNavOpen] = useState(false);

  return (
    <AuthProvider>
      <MicProvider>
        <Router>
          <div className="flex flex-col h-[100dvh] w-full max-w-md mx-auto bg-slate-950 text-slate-100 overflow-hidden font-sans border-x border-slate-900 shadow-2xl relative">
            <Toaster position="top-center" toastOptions={{ className: 'bg-slate-800 text-slate-100' }} />
            
            <Header toggleNav={() => setIsNavOpen(!isNavOpen)} />
            <Navbar isOpen={isNavOpen} closeNav={() => setIsNavOpen(false)} />
            
            {/* Global Audio Guard mounted here persists across all route changes */}
            <GlobalAudioGuard />

            <main className="flex-1 overflow-y-auto w-full flex flex-col relative">
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/ticket" element={<Ticket />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/host" element={<HostDashboard />} />
                <Route path="/live" element={<LiveStage />} />
                <Route path="/list-mic" element={<ListMic />} />
                <Route path="/profile" element={<MyProfile />} />
                <Route path="/scene" element={<Scene />} />
                <Route path="/inbox" element={<Inbox />} />
                <Route path="/chat/:recipientId" element={<Chat />} />
              </Routes>
              <Footer />
            </main>
          </div>
        </Router>
      </MicProvider>
    </AuthProvider>
  );
}

export default App;
