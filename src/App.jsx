import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './AuthContext';
import { MicProvider } from './MicContext';
import { Toaster } from 'react-hot-toast';

// Import Pages
import Landing from './pages/Landing';
import Scene from './pages/Scene';
import Inbox from './pages/Inbox';
import MyProfile from './pages/MyProfile';
import HostDashboard from './pages/HostDashboard';
import Ticket from './pages/Ticket';
import Signup from './pages/Signup';
import ListMic from './pages/ListMic';
import Chat from './pages/Chat';
import LiveStage from './pages/LiveStage';

// Import Global Components
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import GlobalAudioGuard from './components/GlobalAudioGuard';

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <MicProvider>
          {/* Main App Container */}
          <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col pb-20 font-sans selection:bg-blue-500/30">
            
            {/* Global Persistent Header (Market, Live Stage Icon, Ticket Number) */}
            <Header />

            {/* Persistent Audio Guard (Runs audio recording in background across all pages) */}
            <GlobalAudioGuard />

            {/* Main Content Area */}
            <main className="flex-1 w-full max-w-md mx-auto relative flex flex-col">
              <Routes>
                {/* Core Navigation Tabs */}
                <Route path="/" element={<Landing />} />
                <Route path="/scene" element={<Scene />} />
                <Route path="/inbox" element={<Inbox />} />
                <Route path="/profile" element={<MyProfile />} />

                {/* Secondary Utility & Host Routes */}
                <Route path="/host" element={<HostDashboard />} />
                <Route path="/ticket" element={<Ticket />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/list-mic" element={<ListMic />} />
                <Route path="/chat" element={<Chat />} />
                <Route path="/stage" element={<LiveStage />} />

                {/* Catch-all fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>

            {/* Global Mobile Bottom Navigation */}
            <BottomNav />
            
            <Toaster position="top-center" toastOptions={{
              style: { 
                background: '#0f172a', 
                color: '#f1f5f9', 
                border: '1px solid #1e293b', 
                fontSize: '12px', 
                fontWeight: 'bold', 
                textTransform: 'uppercase', 
                letterSpacing: '0.05em' 
              }
            }} />
          </div>
        </MicProvider>
      </AuthProvider>
    </Router>
  );
}
