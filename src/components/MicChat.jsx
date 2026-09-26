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
  
  const chatContainerRef = useRef(null);

  const myEntry = queue.find(c => c.id === myComicProfile?.id);

  const fetchChat = async () => {
    if (!activeEventId) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/events/${activeEventId}/chat`);
      if (res.ok) setMessages(await res.json());
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    fetchChat();
    if (!activeEventId) return;
    const socket = new WebSocket(`${import.meta.env.VITE_API_URL.replace("http", "ws")}/ws/${activeEventId}`);
    socket.onmessage = (event) => { if (event.data === "REFRESH_CHAT") fetchChat(); };
    return () => { if (socket.readyState === 1) socket.close(); else socket.addEventListener('open', () => socket.close()); };
  }, [activeEventId]);

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
      await fetch(`${import.meta.env.VITE_API_URL}/events/${activeEventId}/chat`, {
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
      const res = await fetch(`${import.meta.env.VITE_API_URL}/events/${activeEventId}/swap/execute?target_id=${myComicProfile.id}&sender_id=${senderId}`, { method: 'POST' });
      if (res.ok) toast.success("Swap Accepted!");
      else toast.error("Swap failed.");
    } catch (err) { toast.error("Error executing swap."); }
  };

  const renderMessageContent = (msg) => {
    if (msg.content.startsWith('SWAP_REQ:')) {
      const parts = msg.content.split(':');
      const targetPos = parseInt(parts[1], 10);
      const senderId = parseInt(parts[2], 10);
      const isMyTicket = myEntry?.position === targetPos || myEntry?.id === targetPos;

      return (
        <div className="mt-1.5 p-2.5 bg-[#18191a] border border-[#2d88ff]/40 rounded-xl shadow-sm inline-block min-w-[200px]">
          <div className="text-[11px] text-[#e4e6eb] mb-2 flex items-center gap-1.5">
             <i className="fa-solid fa-right-left text-[#2d88ff]"></i>
             <span>Requested to swap with <strong className="text-white">Ticket #{targetPos}</strong></span>
          </div>
          {isMyTicket && (
             <button 
                onClick={() => executeSwap(senderId)} 
                className="w-full bg-[#2d88ff] hover:bg-[#1b74e4] text-white font-bold py-1.5 rounded-lg text-[10px] uppercase font-mono-data tracking-wider transition-colors shadow-sm"
             >
               Accept Trade
             </button>
          )}
        </div>
      );
    }
    return <span className="text-[#e4e6eb]">{msg.content}</span>;
  };

  if (!activeEventId) return null;

  return (
    <div className="flex flex-col h-96 bg-[#242526] border border-[#3e4042] rounded-xl overflow-hidden shadow-sm mt-3 shrink-0">
      
      <div className="bg-[#18191a] border-b border-[#3e4042] p-2.5 flex justify-between items-center shrink-0">
        <h3 className="font-bold text-white text-xs tracking-wider uppercase font-mono-data flex items-center gap-1.5">
          <i className="fa-solid fa-tower-broadcast text-emerald-500 animate-pulse"></i> Mic Chat
        </h3>
        <span className="text-[10px] text-[#b0b3b8] font-mono-data">Live</span>
      </div>

      <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-3 space-y-3 bg-[#242526]">
        {messages.length === 0 ? (
          <p className="text-center text-[#b0b3b8] text-[10px] uppercase font-mono-data py-10 tracking-widest">
            No messages yet. Start the discourse!
          </p>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="text-xs leading-relaxed">
              <span className={`font-bold pr-1.5 ${msg.guest_name === '🎙️ SYSTEM' ? 'text-emerald-400' : 'text-[#2d88ff]'}`}>
                {msg.guest_name}:
              </span>
              {renderMessageContent(msg)}
            </div>
          ))
        )}
      </div>

      <div className="bg-[#18191a] border-t border-[#3e4042] p-2.5 relative shrink-0">
        {showPlusMenu && !isDraftingSwap && (
          <div className="absolute bottom-[52px] left-2 w-48 bg-[#242526] border border-[#3e4042] rounded-xl shadow-2xl p-1.5 z-10 animate-fade-in">
            <div className="text-[9px] font-bold text-[#b0b3b8] uppercase tracking-widest mb-1 px-2 pt-1">Interact</div>
            <button 
              onClick={() => setIsDraftingSwap(true)} 
              className="w-full text-left px-2 py-2 text-xs font-bold text-[#2d88ff] hover:bg-gray-800 rounded transition-colors flex items-center gap-2"
            >
              <i className="fa-solid fa-right-left w-4"></i> Spot Swap Request
            </button>
          </div>
        )}

        {!user && !myComicProfile && (
          <input 
            type="text" 
            placeholder="Your Name (Guest)" 
            value={guestName} 
            onChange={(e) => setGuestName(e.target.value)}
            className="w-full bg-[#242526] border border-[#3e4042] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#2d88ff] mb-2 transition-colors font-sans"
          />
        )}

        <div className="flex gap-2 items-center">
          <button 
            type="button" 
            onClick={() => setShowPlusMenu(!showPlusMenu)} 
            className="w-8 h-8 shrink-0 bg-[#242526] hover:bg-gray-800 text-[#b0b3b8] hover:text-white rounded-full flex items-center justify-center font-bold transition-colors border border-[#3e4042]"
          >
            <i className={`fa-solid ${showPlusMenu ? 'fa-xmark' : 'fa-plus'} text-xs`}></i>
          </button>

          {isDraftingSwap ? (
            <form onSubmit={handleSwapSubmit} className="flex-1 flex gap-2 animate-fade-in">
              <input 
                type="number" 
                min="1" 
                placeholder="Ticket # to Swap" 
                value={swapTargetPos} 
                onChange={(e) => setSwapTargetPos(e.target.value)} 
                className="flex-1 bg-[#242526] border border-[#2d88ff]/50 rounded-full px-3.5 py-1.5 text-xs text-white focus:outline-none font-bold font-mono-data placeholder-[#b0b3b8]" 
                required 
              />
              <button 
                type="submit" 
                className="bg-[#2d88ff] hover:bg-[#1b74e4] text-white px-3.5 rounded-full font-bold transition-colors uppercase tracking-widest text-[10px] font-mono-data"
              >
                Request
              </button>
            </form>
          ) : (
            <form onSubmit={handleStandardSubmit} className="flex-1 flex gap-2">
              <input 
                type="text" 
                placeholder="Say something..." 
                value={newMessage} 
                onChange={(e) => setNewMessage(e.target.value)} 
                className="flex-1 bg-[#242526] border border-[#3e4042] rounded-full px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#2d88ff] transition-colors font-sans" 
              />
              <button 
                type="submit" 
                disabled={!newMessage.trim()}
                className="bg-[#2d88ff] hover:bg-[#1b74e4] disabled:opacity-40 text-white px-3.5 rounded-full font-bold text-[10px] uppercase font-mono-data tracking-widest transition-colors flex items-center justify-center"
              >
                Send
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
