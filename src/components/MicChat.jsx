import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../AuthContext';
import { useMic } from '../MicContext';
import toast from 'react-hot-toast';

export default function MicChat() {
  const { activeEventId, myComicProfile, queue } = useMic();
  const { user } = useAuth();
  
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [guestName, setGuestName] = useState('');
  
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [swapTargetPos, setSwapTargetPos] = useState('');
  const [isDraftingSwap, setIsDraftingSwap] = useState(false);
  
  // CHANGED: Ref targets the container instead of a dummy end div
  const chatContainerRef = useRef(null);

  const myEntry = queue.find(c => c.id === myComicProfile?.id);

  const fetchChat = async () => {
    if (!activeEventId) return;
    try {
      const res = await fetch(`http://127.0.0.1:8000/events/${activeEventId}/chat`);
      if (res.ok) setMessages(await res.json());
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    fetchChat();
    if (!activeEventId) return;
    const socket = new WebSocket(`ws://127.0.0.1:8000/ws/${activeEventId}`);
    socket.onmessage = (event) => { if (event.data === "REFRESH_CHAT") fetchChat(); };
    return () => { if (socket.readyState === 1) socket.close(); else socket.addEventListener('open', () => socket.close()); };
  }, [activeEventId]);

  // CHANGED: Isolated scroll logic prevents the whole page from jumping
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const postMessage = async (contentStr) => {
    const identity = user?.username || myComicProfile?.name || guestName;
    if (!identity) {
      toast.error("Please enter a name to chat!");
      return false;
    }
    try {
      await fetch(`http://127.0.0.1:8000/events/${activeEventId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: contentStr, guest_name: identity })
      });
      return true;
    } catch (err) {
      toast.error("Failed to send.");
      return false;
    }
  };

  const handleStandardSubmit = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    const success = await postMessage(newMessage);
    if (success) setNewMessage('');
  };

  const handleSwapSubmit = async (e) => {
    e.preventDefault();
    if (!swapTargetPos) return;
    const content = `SWAP_REQ:${swapTargetPos}:${myComicProfile.id}`;
    const success = await postMessage(content);
    if (success) {
      setIsDraftingSwap(false);
      setSwapTargetPos('');
      setShowPlusMenu(false);
    }
  };

  const executeSwap = async (senderId) => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/events/${activeEventId}/swap/execute?target_id=${myComicProfile.id}&sender_id=${senderId}`, { method: 'POST' });
      if (res.ok) toast.success("Swap Accepted!");
      else toast.error("Swap failed.");
    } catch (err) { toast.error("Error executing swap."); }
  };

  const renderMessageContent = (msg) => {
    if (msg.content.startsWith('SWAP_REQ:')) {
      const parts = msg.content.split(':');
      const targetPos = parseInt(parts[1], 10);
      const senderId = parseInt(parts[2], 10);
      const isMyTicket = myEntry?.position === targetPos;

      return (
        <div className="mt-1 p-3 bg-indigo-900/30 border border-indigo-500/50 rounded-lg shadow-sm">
          <div className="text-xs text-indigo-100 mb-2">
             <i className="fa-solid fa-handshake text-indigo-400 mr-2"></i>
             Requested to swap with <span className="font-black text-white">Ticket #{targetPos}</span>
          </div>
          {isMyTicket && (
             <button onClick={() => executeSwap(senderId)} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-1.5 rounded text-xs uppercase tracking-wider transition-colors shadow-lg">
               Accept Trade
             </button>
          )}
        </div>
      );
    }
    return <span className="text-slate-200">{msg.content}</span>;
  };

  if (!activeEventId) return null;

  return (
    <div className="flex flex-col h-96 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl mt-2 shrink-0">
      
      <div className="bg-indigo-950 border-b border-indigo-900 p-3 flex justify-between items-center shrink-0">
        <h3 className="font-black text-indigo-100 text-sm tracking-widest uppercase">MIC CHAT</h3>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[10px] text-green-400 font-bold uppercase tracking-wider">Live</span>
        </div>
      </div>

      {/* CHANGED: Assigned ref to the container and removed the dummy div at the bottom */}
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <p className="text-center text-slate-500 text-xs mt-10">No messages yet. Start the discourse!</p>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="text-sm">
              <span className={`font-bold pr-1 ${msg.guest_name === '🎙️ SYSTEM' ? 'text-green-400' : 'text-indigo-400'}`}>
                {msg.guest_name}:
              </span>
              {renderMessageContent(msg)}
            </div>
          ))
        )}
      </div>

      <div className="bg-slate-950 border-t border-slate-800 p-3 relative shrink-0">
        {showPlusMenu && !isDraftingSwap && (
          <div className="absolute bottom-full left-2 mb-2 w-48 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-2 z-10 animate-fade-in">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 px-2">Interact</div>
            <button onClick={() => setIsDraftingSwap(true)} className="w-full text-left px-2 py-2 text-xs font-bold text-indigo-300 hover:bg-slate-700 hover:text-white rounded transition-colors">
              Spot Swap Request
            </button>
          </div>
        )}

        {!user && !myComicProfile && (
          <input 
            type="text" placeholder="Your Name (Guest)" value={guestName} onChange={(e) => setGuestName(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 mb-2"
          />
        )}

        <div className="flex gap-2">
          <button type="button" onClick={() => setShowPlusMenu(!showPlusMenu)} className="w-10 h-10 shrink-0 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg flex items-center justify-center font-bold text-xl transition-colors border border-slate-700">
            {showPlusMenu ? '×' : '+'}
          </button>

          {isDraftingSwap ? (
            <form onSubmit={handleSwapSubmit} className="flex-1 flex gap-2 animate-fade-in">
              <input type="number" min="1" placeholder="Ticket # to Swap" value={swapTargetPos} onChange={(e) => setSwapTargetPos(e.target.value)} className="flex-1 bg-indigo-950 border border-indigo-500 rounded-lg px-3 py-2 text-sm text-indigo-100 focus:outline-none placeholder:text-indigo-400/50 font-bold" required />
              <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 rounded-lg font-bold transition-colors uppercase tracking-wider text-xs">Send Request</button>
            </form>
          ) : (
            <form onSubmit={handleStandardSubmit} className="flex-1 flex gap-2">
              <input type="text" placeholder="Say something..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)} className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500" />
              <button type="submit" className="bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white px-4 rounded-lg font-bold text-sm transition-colors">Send</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
