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
import SceneComments from './pages/SceneComments'; // Added to support your new Scene routing

// Import Global Components
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import GlobalAudioGuard from './components/GlobalAudioGuard';

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <MicProvider>
          {/* Main App Container - Bounded Viewport Shell */}
          <div className="h-screen h-[100dvh] bg-[#18191a] text-[#e4e6eb] flex flex-col font-sans selection:bg-[#2d88ff]/30 overflow-hidden">
            
            {/* Global Persistent Header (Market, Live Stage Icon, Ticket Number) */}
            <Header />

            {/* Persistent Audio Guard (Runs audio recording in background across all pages) */}
            <GlobalAudioGuard />

            {/* Main Content Area */}
            <main className="flex-1 min-h-0 w-full max-w-md mx-auto relative flex flex-col overflow-hidden pb-16">
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
                <Route path="/chat/:recipientId" element={<Chat />} />
                <Route path="/stage" element={<LiveStage />} />
                
                {/* Scene Comments Thread Route */}
                <Route path="/comments/:postId" element={<SceneComments />} />

                {/* Catch-all fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>

            {/* Global Mobile Bottom Navigation */}
            <BottomNav />
            
            {/* Styled Toaster to match Facebook Dark theme */}
            <Toaster position="top-center" toastOptions={{
              style: { 
                background: '#242526', 
                color: '#e4e6eb', 
                border: '1px solid #3e4042', 
                fontSize: '12px', 
                fontWeight: 'bold', 
                textTransform: 'uppercase', 
                letterSpacing: '0.05em',
                fontFamily: '"JetBrains Mono", monospace'
              },
              success: {
                iconTheme: {
                  primary: '#2d88ff',
                  secondary: '#fff',
                },
              },
              error: {
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fff',
                },
              },
            }} />
          </div>
        </MicProvider>
      </AuthProvider>
    </Router>
  );
}
