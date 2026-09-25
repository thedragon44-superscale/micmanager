import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMic } from '../MicContext';
import toast from 'react-hot-toast';

export default function Inbox() {
  const navigate = useNavigate();
  const { myComicProfile, market } = useMic();
  
  const [threads, setThreads] = useState([]);
  const [activeThread, setActiveThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessageText, setNewMessageText] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // New Chat Search Modal States
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [directory, setDirectory] = useState([]);

  const chatEndRef = useRef(null);

  // Fetch Directory for User Search
  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/directory?market=${market}`)
      .then(res => res.ok ? res.json() : [])
      .then(data => setDirectory(data || []))
      .catch(err => console.error('Directory fetch error:', err));
  }, [market]);

  // Fetch Inbox Threads
  useEffect(() => {
    if (!myComicProfile?.id) return;

    fetch(`${import.meta.env.VITE_API_URL}/users/${myComicProfile.id}/inbox`)
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        if (!data || data.length === 0) {
          const systemDefault = [{
            id: 'sys-welcome',
            partner_id: 'system',
            partner_name: 'Stage System',
            is_system: true,
            last_message: 'Welcome to Open Mic Manager! You will receive stage calls and badge alerts here.',
            timestamp: 'Just now',
            unread: false
          }];
          setThreads(systemDefault);
        } else {
          setThreads(data);
        }
      })
      .catch(() => {
        setThreads([{
          id: 'sys-welcome',
          partner_id: 'system',
          partner_name: 'Stage System',
          is_system: true,
          last_message: 'Welcome to Open Mic Manager! You will receive stage calls and badge alerts here.',
          timestamp: 'Just now',
          unread: false
        }]);
      })
      .finally(() => setIsLoading(false));
  }, [myComicProfile?.id]);

  // Fetch Messages for Active Thread
  useEffect(() => {
    if (!activeThread || !myComicProfile?.id) return;

    if (activeThread.is_system) {
      setMessages([
        {
          id: 'msg-1',
          sender_id: 'system',
          sender_name: 'Stage System',
          content: activeThread.last_message || 'Welcome to Open Mic Manager! System alerts and stage notices will appear here.',
          timestamp: activeThread.timestamp || 'Just now'
        }
      ]);
      return;
    }

    fetch(`${import.meta.env.VITE_API_URL}/messages/${myComicProfile.id}/${activeThread.partner_id}`)
      .then(res => res.ok ? res.json() : [])
      .then(data => setMessages(data || []))
      .catch(err => console.error('Error fetching messages:', err));
  }, [activeThread, myComicProfile?.id]);

  // Auto-scroll chat
  useEffect(() => {
    if (activeThread) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeThread]);

  // Start New Chat with Selected User
  const handleSelectUserForChat = (user) => {
    const userId = (user.id || user.comic_id || user.user_id).toString();
    const userName = user.name || user.comic_name || user.username || 'Comic User';

    // Check if thread already exists
    let existingThread = threads.find(t => t.partner_id.toString() === userId);

    if (!existingThread) {
      existingThread = {
        id: `thread-${Date.now()}`,
        partner_id: userId,
        partner_name: userName,
        is_system: false,
        last_message: 'New conversation started',
        timestamp: 'Just now',
        unread: false
      };
      setThreads(prev => [existingThread, ...prev]);
    }

    setActiveThread(existingThread);
    setShowNewChatModal(false);
    setUserSearchQuery('');
  };

  // Send Message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessageText.trim() || !activeThread || !myComicProfile) return;

    const msgPayload = {
      id: Date.now().toString(),
      sender_id: myComicProfile.id,
      sender_name: myComicProfile.name,
      recipient_id: activeThread.partner_id,
      content: newMessageText.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, msgPayload]);
    setNewMessageText('');

    // Update thread last message locally
    setThreads(prev => prev.map(t => {
      if (t.partner_id === activeThread.partner_id) {
        return { ...t, last_message: msgPayload.content, timestamp: 'Just now' };
      }
      return t;
    }));

    try {
      await fetch(`${import.meta.env.VITE_API_URL}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(msgPayload)
      });
    } catch (err) {
      console.error('Send message error:', err);
    }
  };

  // Filter Directory by User Search Query
  const filteredUsers = directory.filter(u => {
    if (!u) return false;
    const uid = (u.id || u.comic_id || u.user_id || '').toString();
    if (uid === myComicProfile?.id?.toString()) return false; // Exclude self

    const name = u.name || u.comic_name || u.username || u.display_name || '';
    return name.toLowerCase().includes(userSearchQuery.toLowerCase());
  });

  // --- UNAUTHENTICATED GUARD ---
  if (!myComicProfile) {
    return (
      <div className="p-6 text-center animate-fade-in flex flex-col items-center justify-center flex-1 my-auto max-w-md mx-auto w-full">
        <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 text-xl mb-4 glow-blue">
          <i className="fa-solid fa-comments"></i>
        </div>
        <h2 className="text-2xl font-black text-white uppercase font-display">Inbox Locked</h2>
        <p className="text-xs text-slate-400 font-medium max-w-xs mt-2 mb-6">
          Log into your comic profile to access direct messages, stage notifications, and system DMs.
        </p>
        <button
          onClick={() => navigate('/profile')}
          className="bg-blue-600 hover:bg-blue-500 text-white font-black text-xs px-6 py-3.5 rounded-xl uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-blue-950/50"
        >
          Go to Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-5 flex flex-col gap-4 animate-fade-in max-w-md mx-auto w-full flex-1 pb-8">
      
      {/* HEADER BAR */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mt-1">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-blue-400"></span>
            <span className="text-[10px] font-mono-data uppercase tracking-widest text-blue-400 font-bold">Direct Messaging</span>
          </div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tight font-display">
            {activeThread ? activeThread.partner_name : 'Inbox'}
          </h1>
        </div>

        {activeThread ? (
          <button
            onClick={() => setActiveThread(null)}
            className="bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-mono-data font-black px-3 py-2 rounded-xl uppercase tracking-wider transition-all active:scale-95"
          >
            ← Back
          </button>
        ) : (
          <button
            onClick={() => setShowNewChatModal(true)}
            className="bg-blue-600 hover:bg-blue-500 text-white border border-blue-500/40 text-xs font-mono-data font-black px-3.5 py-2 rounded-xl uppercase tracking-wider transition-all active:scale-95 shadow-lg shadow-blue-950/50 flex items-center gap-1.5"
          >
            <i className="fa-solid fa-plus text-[10px]"></i> New Chat
          </button>
        )}
      </div>

      {/* --- VIEW 1: THREAD LIST --- */}
      {!activeThread ? (
        <div className="flex flex-col gap-3 animate-fade-in">
          {isLoading ? (
            <div className="text-center py-12 text-slate-500 font-mono-data text-xs uppercase">
              Loading inbox...
            </div>
          ) : threads.length === 0 ? (
            <div className="text-center text-slate-500 py-12 font-mono-data text-xs uppercase tracking-widest border border-dashed border-slate-800 rounded-2xl bg-slate-950/50">
              No direct messages or alerts.
            </div>
          ) : (
            threads.map((thread) => {
              const isSystem = thread.is_system || thread.partner_id === 'system';

              return (
                <div
                  key={thread.id || thread.partner_id}
                  onClick={() => setActiveThread(thread)}
                  className={`bg-slate-900/80 hover:bg-slate-900 border p-4 rounded-2xl flex items-center justify-between cursor-pointer transition-all active:scale-95 group ${
                    isSystem 
                      ? 'border-amber-500/30 glow-amber' 
                      : thread.unread 
                      ? 'border-blue-500/50 glow-blue' 
                      : 'border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3.5 flex-1 min-w-0 pr-2">
                    {/* Avatar Badge */}
                    <div className={`w-11 h-11 rounded-xl border flex items-center justify-center font-display font-black text-base shrink-0 ${
                      isSystem 
                        ? 'bg-amber-950/60 border-amber-500/40 text-amber-400' 
                        : 'bg-slate-950 border-slate-800 text-blue-400 group-hover:border-blue-500/50'
                    }`}>
                      {isSystem ? <i className="fa-solid fa-bullhorn text-xs"></i> : (thread.partner_name || 'C').charAt(0).toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-0.5">
                        <h3 className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors truncate">
                          {thread.partner_name}
                        </h3>
                        <span className="text-[9px] font-mono-data text-slate-500 shrink-0 ml-2">
                          {thread.timestamp || 'Recent'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-medium truncate">
                        {thread.last_message || 'Tap to view conversation'}
                      </p>
                    </div>
                  </div>

                  {thread.unread && (
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-400 shrink-0 animate-pulse"></span>
                  )}
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* --- VIEW 2: ACTIVE CONVERSATION MESSAGES --- */
        <div className="flex flex-col flex-1 bg-slate-900/60 border border-slate-800 rounded-3xl h-[500px] overflow-hidden shadow-2xl animate-fade-in">
          
          {/* MESSAGES FEED */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3">
            {messages.length === 0 ? (
              <div className="text-center text-slate-600 py-20 font-mono-data text-xs uppercase">
                No conversation history yet. Say hello!
              </div>
            ) : (
              messages.map((msg, idx) => {
                const isMe = msg.sender_id === myComicProfile.id;
                const isSystemMsg = msg.sender_id === 'system' || activeThread.is_system;

                if (isSystemMsg) {
                  return (
                    <div key={msg.id || idx} className="bg-amber-950/40 border border-amber-500/30 p-3.5 rounded-2xl text-center my-2 glow-amber">
                      <span className="text-[9px] font-mono-data font-black text-amber-400 uppercase tracking-widest block mb-1">
                        <i className="fa-solid fa-bell mr-1"></i> Stage System Notification
                      </span>
                      <p className="text-xs text-slate-200 font-medium leading-relaxed">
                        {msg.content}
                      </p>
                      <span className="text-[9px] font-mono-data text-slate-500 block mt-2">
                        {msg.timestamp}
                      </span>
                    </div>
                  );
                }

                return (
                  <div key={msg.id || idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold text-slate-400">{isMe ? 'You' : msg.sender_name}</span>
                      <span className="text-[9px] font-mono-data text-slate-600">{msg.timestamp}</span>
                    </div>
                    <div className={`p-3 rounded-2xl max-w-[80%] text-xs font-medium leading-relaxed ${
                      isMe 
                        ? 'bg-blue-600 text-white rounded-tr-none shadow-lg shadow-blue-950/40' 
                        : 'bg-slate-950 border border-slate-800 text-slate-200 rounded-tl-none'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={chatEndRef} />
          </div>

          {/* CHAT INPUT BAR */}
          {!activeThread.is_system ? (
            <form onSubmit={handleSendMessage} className="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2">
              <input
                type="text"
                value={newMessageText}
                onChange={(e) => setNewMessageText(e.target.value)}
                placeholder={`Message ${activeThread.partner_name}...`}
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 font-sans"
              />
              <button
                type="submit"
                disabled={!newMessageText.trim()}
                className="w-10 h-10 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold rounded-xl flex items-center justify-center transition-all active:scale-95 shrink-0 shadow-lg shadow-blue-950/50"
              >
                <i className="fa-solid fa-paper-plane text-xs"></i>
              </button>
            </form>
          ) : (
            <div className="p-3 bg-slate-950 border-t border-slate-800 text-center">
              <span className="text-[10px] font-mono-data text-slate-500 uppercase tracking-wider">
                System notifications are read-only
              </span>
            </div>
          )}

        </div>
      )}

      {/* --- NEW CHAT / USER SEARCH MODAL --- */}
      {showNewChatModal && (
        <div 
          className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setShowNewChatModal(false)}
        >
          <div 
            className="bg-slate-900 border border-slate-800 p-5 rounded-3xl w-full max-w-xs flex flex-col max-h-[80vh] shadow-2xl" 
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-800">
              <h3 className="text-sm font-black text-white uppercase font-display">New Conversation</h3>
              <button onClick={() => setShowNewChatModal(false)} className="text-slate-500 hover:text-white font-bold p-1">✕</button>
            </div>

            {/* User Search Input */}
            <div className="relative mb-3">
              <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs"></i>
              <input
                type="text"
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                placeholder="Search comic by name..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                autoFocus
              />
            </div>

            {/* Autocomplete Results Directory List */}
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 mb-2">
              {!userSearchQuery.trim() ? (
                <div className="text-center text-slate-600 py-8 font-mono-data text-xs uppercase">
                  Type a comic's name to search...
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center text-slate-500 py-8 font-mono-data text-xs uppercase">
                  No comics found.
                </div>
              ) : (
                filteredUsers.map((user, idx) => {
                  const userName = user.name || user.comic_name || user.username || `Comic #${idx + 1}`;

                  return (
                    <button
                      key={user.id || idx}
                      onClick={() => handleSelectUserForChat(user)}
                      className="w-full p-2.5 rounded-xl border border-slate-800/80 bg-slate-950 hover:bg-slate-800 text-left flex items-center gap-3 transition-all active:scale-95 group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center font-display font-black text-blue-400 text-xs group-hover:border-blue-500/50">
                        {userName.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-xs font-bold text-slate-200 group-hover:text-white truncate">
                        {userName}
                      </span>
                    </button>
                  );
                })
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
