import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMic } from '../MicContext';
import toast from 'react-hot-toast';

export default function Inbox() {
  const navigate = useNavigate();
  // Wiring in your exact backend state parameters
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
          // Keep your system default fallback
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
          setThreads(data.map(user => ({
            id: `thread-${user.id}`,
            partner_id: user.id,
            partner_name: user.username,
            avatar_url: user.avatar_url,
            is_system: false,
            last_message: 'Tap to view conversation',
            timestamp: '',
            unread: false
          })));
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

    const partnerId = activeThread.partner_id || activeThread.id;
    fetch(`${import.meta.env.VITE_API_URL}/messages/thread/${myComicProfile.id}/${partnerId}`)
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

    const partnerId = activeThread.partner_id || activeThread.id;
    const msgPayload = {
      id: Date.now().toString(),
      sender_id: myComicProfile.id,
      sender_name: myComicProfile.name,
      recipient_id: partnerId,
      content: newMessageText.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, msgPayload]);
    setNewMessageText('');

    // Update local thread
    setThreads(prev => prev.map(t => {
      if (t.partner_id === activeThread.partner_id) {
        return { ...t, last_message: msgPayload.content, timestamp: 'Just now' };
      }
      return t;
    }));

    try {
      await fetch(`${import.meta.env.VITE_API_URL}/messages?sender_id=${myComicProfile.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(msgPayload)
      });
    } catch (err) {
      console.error('Send message error:', err);
    }
  };

  // Filter Directory
  const filteredUsers = directory.filter(u => {
    if (!u) return false;
    const uid = (u.id || u.comic_id || u.user_id || '').toString();
    if (uid === myComicProfile?.id?.toString()) return false;

    const name = u.name || u.comic_name || u.username || u.display_name || '';
    return name.toLowerCase().includes(userSearchQuery.toLowerCase());
  });

  // --- UNAUTHENTICATED GUARD ---
  if (!myComicProfile) {
    return (
      <div className="p-6 text-center animate-fade-in flex flex-col items-center justify-center flex-1 my-auto max-w-md mx-auto w-full">
        <div className="w-14 h-14 rounded-2xl bg-[#2d88ff]/10 border border-[#2d88ff]/30 flex items-center justify-center text-[#2d88ff] text-xl mb-4">
          <i className="fa-solid fa-comments"></i>
        </div>
        <h2 className="text-2xl font-black text-white uppercase font-display">Inbox Locked</h2>
        <p className="text-xs text-[#b0b3b8] font-medium max-w-xs mt-2 mb-6">
          Log into your comic profile to access direct messages, stage notifications, and system DMs.
        </p>
        <button
          onClick={() => navigate('/profile')}
          className="bg-[#2d88ff] hover:bg-[#1b74e4] text-white font-black text-xs px-6 py-3.5 rounded-xl uppercase tracking-widest transition-all active:scale-95 shadow-md"
        >
          Go to Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 bg-[#18191a] max-w-md mx-auto w-full animate-fade-in overscroll-none">
      
      {!activeThread ? (
        /* --- VIEW 1: THREAD LIST --- */
        <div className="flex flex-col h-full min-h-0">
          
          {/* FIXED TOP HEADER & SEARCH */}
          <div className="flex-none p-3 pb-2 bg-[#18191a]">
            <div className="flex justify-between items-center px-1 mb-2">
              <h1 className="text-2xl font-black text-white uppercase font-display tracking-wide">Direct Inbox</h1>
              <button 
                onClick={() => setShowNewChatModal(true)} 
                className="bg-[#2d88ff] hover:bg-[#1b74e4] text-white text-[11px] font-mono-data font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <i className="fa-solid fa-plus text-[10px]"></i> New Chat
              </button>
            </div>

            <div className="relative">
              <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-[#b0b3b8] text-xs"></i>
              <input 
                type="text" 
                placeholder="Search chats by name..." 
                className="w-full bg-[#242526] border border-[#3e4042] rounded-xl pl-9 pr-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#2d88ff] transition-colors"
              />
            </div>
          </div>

          {/* SCROLLABLE THREAD LIST CONTAINER */}
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 pt-1">
            <div className="bg-[#242526] border border-[#3e4042] rounded-xl overflow-hidden shadow-sm">
            {isLoading ? (
              <div className="text-center py-12 text-[#b0b3b8] font-mono-data text-xs uppercase">
                <i className="fa-solid fa-spinner animate-spin text-[#2d88ff] text-xl mb-2 block"></i>
                Loading inbox...
              </div>
            ) : threads.length === 0 ? (
              <div className="text-center py-12 text-[#b0b3b8] font-mono-data text-xs uppercase tracking-widest">
                No matching chats found.
              </div>
            ) : (
              threads.map((thread) => {
                const isSystem = thread.is_system || thread.partner_id === 'system';

                return (
                  <div
                    key={thread.id || thread.partner_id}
                    onClick={() => setActiveThread(thread)}
                    className="p-3.5 border-b border-[#3e4042] last:border-b-0 flex items-center gap-3 cursor-pointer hover:bg-gray-800 transition-colors"
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold shrink-0 ${isSystem ? 'bg-amber-500/20 border border-amber-500/40 text-amber-500' : 'bg-[#18191a] border border-[#3e4042] text-[#2d88ff]'}`}>
                      {isSystem ? <i className="fa-solid fa-robot text-xs"></i> : (thread.partner_name || 'C').charAt(0).toUpperCase()}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-0.5">
                        <h4 className="text-xs font-bold text-white truncate">{thread.partner_name}</h4>
                        <span className="text-[9px] text-[#b0b3b8] font-mono-data shrink-0 ml-2">{thread.timestamp}</span>
                      </div>
                      <p className="text-[11px] text-[#b0b3b8] truncate">{thread.last_message || 'Tap to view conversation'}</p>
                    </div>

                    {thread.unread && (
                      <span className="w-2 h-2 rounded-full bg-[#2d88ff] shrink-0"></span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
      ) : (
        /* --- VIEW 2: ACTIVE DIRECT THREAD --- */
        <div className="flex flex-col h-full min-h-0 bg-[#18191a]">
          <div className="bg-[#242526] border-b border-[#3e4042] p-3 flex items-center gap-3 flex-none shadow-sm z-20">
            <button onClick={() => setActiveThread(null)} className="text-[#2d88ff] p-1 hover:text-white transition-colors">
              <i className="fa-solid fa-arrow-left"></i>
            </button>
            <h3 className="font-bold text-xs text-white uppercase font-mono-data tracking-wider">
              {activeThread.partner_name}
            </h3>
          </div>
          
          <div className="flex-1 min-h-0 p-3 overflow-y-auto flex flex-col gap-3">
            {messages.length === 0 ? (
              <div className="text-center text-[#b0b3b8] py-20 font-mono-data text-xs uppercase">
                No conversation history yet. Say hello!
              </div>
            ) : (
              messages.map((msg, idx) => {
              const isMe = String(msg.sender_id) === String(myComicProfile.id);
              const isSystemMsg = String(msg.sender_id) === 'system' || activeThread.is_system;

                if (isSystemMsg) {
                  return (
                    <div key={`sys-msg-${msg.id}-${idx}`} className="bg-amber-500/10 border border-amber-500/30 p-3.5 rounded-xl text-center my-2 max-w-[90%] mx-auto">
                      <span className="text-[9px] font-bold text-amber-500 uppercase tracking-wider block mb-1">
                        <i className="fa-solid fa-circle-check mr-1"></i> Stage System
                      </span>
                      <p className="text-xs text-amber-100 font-medium leading-relaxed text-left whitespace-pre-wrap">
                        {msg.content}
                      </p>
                      <span className="text-[9px] font-mono-data text-amber-500/50 block mt-2 text-right">
                        {msg.timestamp}
                      </span>
                    </div>
                  );
                }

                return (
                  <div key={`msg-${msg.id}-${idx}`} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[9px] font-bold text-[#b0b3b8]">{isMe ? 'You' : msg.sender_name}</span>
                      <span className="text-[8px] font-mono-data text-[#b0b3b8]">{msg.timestamp}</span>
                    </div>
                    <div className={`p-3 rounded-xl max-w-[85%] text-xs font-medium leading-relaxed ${
                      isMe 
                        ? 'bg-[#2d88ff] text-white rounded-tr-sm' 
                        : 'bg-[#242526] border border-[#3e4042] text-white rounded-tl-sm'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={chatEndRef} className="h-2 shrink-0" />
          </div>

          {/* Chat Input Bar */}
          {!activeThread.is_system ? (
            <form onSubmit={handleSendMessage} className="p-2.5 bg-[#242526] border-t border-[#3e4042] flex-none flex gap-2 w-full max-w-md mx-auto z-20 shadow-lg">
              <input
                type="text"
                value={newMessageText}
                onChange={(e) => setNewMessageText(e.target.value)}
                placeholder="Write message..."
                className="flex-1 bg-[#18191a] border border-[#3e4042] rounded-full px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#2d88ff] transition-colors font-sans"
              />
              <button
                type="submit"
                disabled={!newMessageText.trim()}
                className="text-[#2d88ff] disabled:opacity-40 text-xs font-bold px-3 uppercase tracking-wider transition-colors hover:text-white"
              >
                Send
              </button>
            </form>
          ) : (
            <div className="p-3 bg-[#242526] border-t border-[#3e4042] text-center flex-none w-full max-w-md mx-auto z-20 shadow-lg">
              <span className="text-[10px] font-mono-data text-[#b0b3b8] uppercase tracking-wider">
                System notifications are read-only
              </span>
            </div>
          )}
        </div>
      )}

      {/* --- NEW CHAT / USER SEARCH MODAL --- */}
      {showNewChatModal && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setShowNewChatModal(false)}
        >
          <div 
            className="bg-[#242526] border border-[#3e4042] p-4 rounded-2xl w-full max-w-xs flex flex-col shadow-2xl" 
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-3 pb-2 border-b border-[#3e4042]">
              <h3 className="text-xs font-bold text-white uppercase font-mono-data tracking-wider">New Conversation</h3>
              <button onClick={() => setShowNewChatModal(false)} className="text-[#b0b3b8] hover:text-white font-bold p-1">✕</button>
            </div>

            <input
              type="text"
              value={userSearchQuery}
              onChange={(e) => setUserSearchQuery(e.target.value)}
              placeholder="Search comic by name..."
              className="w-full bg-[#18191a] border border-[#3e4042] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#2d88ff] mb-3 font-sans"
              autoFocus
            />

            <div className="flex-1 max-h-48 overflow-y-auto space-y-1.5 pr-1">
              {!userSearchQuery.trim() ? (
                <div className="text-center text-[#b0b3b8] py-8 font-mono-data text-[10px] uppercase">
                  Type a comic's name to search...
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center text-[#b0b3b8] py-8 font-mono-data text-[10px] uppercase">
                  No comics found.
                </div>
              ) : (
                filteredUsers.map((user, idx) => {
                  const userName = user.name || user.comic_name || user.username || `Comic #${idx + 1}`;
                  const displayUsername = user.username || userName.replace(/\s+/g, '').toLowerCase();

                  return (
                    <button
                      key={user.id || idx}
                      onClick={() => handleSelectUserForChat(user)}
                      className="w-full p-2.5 rounded-xl bg-[#18191a] border border-[#3e4042] hover:bg-gray-800 text-left flex items-center gap-3 transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-full bg-[#242526] text-[#2d88ff] font-bold flex items-center justify-center text-xs shrink-0 border border-[#3e4042] group-hover:border-[#2d88ff]">
                        {userName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-white block truncate">
                          {userName}
                        </span>
                        <span className="text-[9px] text-[#b0b3b8] font-mono-data block truncate">
                          @{displayUsername}
                        </span>
                      </div>
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
