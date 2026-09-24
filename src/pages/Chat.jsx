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
      navigate('/login');
      return;
    }

    // 1. Fetch recipient profile info
    fetch(`http://127.0.0.1:8000/users/${recipientId}/profile`)
      .then(res => res.ok ? res.json() : null)
      .then(data => setRecipient(data))
      .catch(err => console.error(err));

    // 2. Fetch initial chat thread & poll every 3s
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
      const res = await fetch(`http://127.0.0.1:8000/messages/thread/${authUserId}/${recipientId}`);
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

    try {
      const res = await fetch(`http://127.0.0.1:8000/messages?sender_id=${authUserId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient_id: parseInt(recipientId),
          content: inputContent,
          message_type: 'text'
        })
      });

      if (res.ok) {
        setInputContent('');
        fetchThread();
      } else {
        toast.error("Failed to send message.");
      }
    } catch (err) {
      toast.error("Network error.");
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-65px)] bg-slate-950 font-sans">
      
      {/* CHAT HEADER */}
      <header className="bg-slate-900 border-b border-slate-800 p-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-slate-400 hover:text-white transition-colors mr-1">
            <i className="fa-solid fa-arrow-left text-base"></i>
          </button>

          {recipient?.avatar_url ? (
            <img src={recipient.avatar_url} alt={recipient.username} className="w-8 h-8 rounded-full border border-slate-700 object-cover" />
          ) : (
            <div className="w-8 h-8 bg-indigo-900/50 border border-indigo-500/30 rounded-full flex items-center justify-center text-indigo-300 font-bold text-xs">
              {recipient?.username?.substring(0, 2).toUpperCase() || '?'}
            </div>
          )}

          <div>
            <h2 className="font-bold text-sm text-slate-100">@{recipient?.username || 'Comic'}</h2>
            <span className="text-[9px] text-emerald-400 font-mono uppercase tracking-widest block">
              <i className="fa-solid fa-shield-halved mr-1"></i> Direct Channel
            </span>
          </div>
        </div>
      </header>

      {/* THREAD BODY */}
      <main className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-950/50">
        {loading ? (
          <div className="text-center text-slate-500 py-12 font-mono text-xs uppercase animate-pulse">
            Loading history...
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-slate-500 py-12 font-mono text-xs uppercase">
            No history with @{recipient?.username}. Say what's up!
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === authUserId;
            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-xs font-medium leading-relaxed ${isMe ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-slate-900 text-slate-200 border border-slate-800 rounded-bl-none'}`}>
                  {msg.content}
                </div>
                <span className="text-[8px] font-mono text-slate-600 mt-1 px-1">
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </main>

      {/* INPUT FOOTER */}
      <footer className="p-3 bg-slate-900 border-t border-slate-800 shrink-0">
        <form onSubmit={sendMessage} className="flex gap-2 max-w-2xl mx-auto">
          <input
            type="text"
            value={inputContent}
            onChange={(e) => setInputContent(e.target.value)}
            placeholder="Write a message..."
            className="flex-1 bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors"
          />
          <button
            type="submit"
            disabled={!inputContent.trim()}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white px-5 py-3 rounded-xl text-xs font-bold uppercase transition-all shadow-md"
          >
            <i className="fa-solid fa-paper-plane"></i>
          </button>
        </form>
      </footer>
    </div>
  );
}
