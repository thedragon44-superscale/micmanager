import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import toast from 'react-hot-toast';

export default function Chat() {
  const { recipientId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [messages, setMessages] = useState([]);
  const [recipient, setRecipient] = useState(null);
  const [inputContent, setInputContent] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

  const authUserId = user?.user_id || user?.id;

  useEffect(() => {
    if (!user) {
      navigate('/profile');
      return;
    }

    fetch(`${import.meta.env.VITE_API_URL}/users/${recipientId}/profile`)
      .then(res => res.ok ? res.json() : null)
      .then(data => setRecipient(data))
      .catch(err => console.error(err));

    fetchThread();
    const interval = setInterval(fetchThread, 3000);
    return () => clearInterval(interval);
  }, [recipientId, authUserId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchThread = async () => {
    if (!authUserId || !recipientId) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/messages/thread/${authUserId}/${recipientId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (err) {
      console.error("Failed to load thread", err);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!inputContent.trim()) return;

    // Strict payload mapping to align with how Inbox.jsx operates
    const msgPayload = {
      id: Date.now().toString(),
      sender_id: authUserId,
      sender_name: user.username || user.name || 'User',
      recipient_id: parseInt(recipientId),
      content: inputContent.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    try {
      // Adjusted to use the global /messages POST endpoint rather than the query string variant
      const res = await fetch(`${import.meta.env.VITE_API_URL}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(msgPayload)
      });

      if (res.ok) {
        setInputContent('');
        fetchThread();
      } else {
        toast.error("Message failed to save to database.");
      }
    } catch (err) {
      toast.error("Network error sending message.");
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#18191a] font-sans animate-fade-in max-w-md mx-auto w-full pb-16">
      <header className="bg-[#242526] border-b border-[#3e4042] p-3 flex items-center justify-between shrink-0 shadow-sm sticky top-[60px] z-30">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-[#2d88ff] p-1 hover:text-white transition-colors">
            <i className="fa-solid fa-arrow-left"></i>
          </button>
          {recipient?.avatar_url ? (
            <img src={recipient.avatar_url} alt={recipient.username} className="w-8 h-8 rounded-full border border-[#3e4042] object-cover shrink-0" />
          ) : (
            <div className="w-8 h-8 bg-[#18191a] border border-[#3e4042] rounded-full flex items-center justify-center text-[#2d88ff] font-bold text-xs shrink-0">
              {recipient?.username?.substring(0, 2).toUpperCase() || '?'}
            </div>
          )}
          <div>
            <h2 className="font-bold text-xs text-white uppercase font-mono-data tracking-wider">
              @{recipient?.username || 'Comic'}
            </h2>
            <span className="text-[9px] text-[#2d88ff] font-mono-data uppercase tracking-widest block mt-0.5">
              <i className="fa-solid fa-shield-halved mr-1"></i> Direct Channel
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 p-3 overflow-y-auto space-y-3 bg-[#18191a]">
        {loading ? (
          <div className="text-center text-[#b0b3b8] py-12 font-mono-data text-[10px] uppercase tracking-widest">
            <i className="fa-solid fa-spinner animate-spin text-[#2d88ff] text-xl mb-2 block"></i>
            Loading history...
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-[#b0b3b8] py-12 font-mono-data text-[10px] uppercase tracking-widest">
            No history with @{recipient?.username}. Say what's up!
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === authUserId;
            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-[80%] px-3.5 py-2.5 rounded-xl text-xs font-medium leading-relaxed ${isMe ? 'bg-[#2d88ff] text-white rounded-br-sm shadow-sm' : 'bg-[#242526] text-white border border-[#3e4042] rounded-bl-sm'}`}>
                  {msg.content}
                </div>
                <span className="text-[8px] font-mono-data text-[#b0b3b8] mt-1 px-1">
                  {msg.timestamp || new Date(msg.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </main>

      <footer className="p-2.5 bg-[#242526] border-t border-[#3e4042] shrink-0 fixed bottom-[64px] left-0 w-full z-20">
        <form onSubmit={sendMessage} className="flex gap-2 max-w-md mx-auto items-center">
          <input
            type="text"
            value={inputContent}
            onChange={(e) => setInputContent(e.target.value)}
            placeholder="Write a message..."
            className="flex-1 bg-[#18191a] border border-[#3e4042] text-white text-xs rounded-full px-3.5 py-2 focus:outline-none focus:border-[#2d88ff] transition-colors font-sans"
          />
          <button
            type="submit"
            disabled={!inputContent.trim()}
            className="text-[#2d88ff] hover:text-[#1b74e4] disabled:opacity-40 font-bold px-2 py-1 transition-colors flex items-center justify-center text-sm"
          >
            <i className="fa-solid fa-paper-plane"></i>
          </button>
        </form>
      </footer>
    </div>
  );
}
