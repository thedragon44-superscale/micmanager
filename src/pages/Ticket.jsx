import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMic } from '../MicContext';

export default function Ticket() {
  const navigate = useNavigate();
  const { queue, activeMic, myComicProfile } = useMic();
  
  const [ticketTab, setTicketTab] = useState('stub');
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [hasSwapOffer, setHasSwapOffer] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');

  // Find actual queue position based on authenticated profile
  const myEntry = queue.find(c => String(c.id) === String(myComicProfile?.id));
  const myPosition = myEntry ? myEntry.position || queue.indexOf(myEntry) + 1 : '--';

  // Fetch dynamic event chat room 
  useEffect(() => {
    if (activeMic?.id) {
      fetch(`${import.meta.env.VITE_API_URL}/events/${activeMic.id}/chat`)
        .then(res => res.ok ? res.json() : [])
        .then(data => setChatMessages(data || []))
        .catch(() => setChatMessages([]));
    }
  }, [activeMic?.id]);

  return (
    <div className="flex flex-col h-full min-h-0 w-full max-w-md mx-auto bg-[#18191a]">
      {/* HEADER & TABS */}
      <div className="p-3 pb-0 w-full shrink-0">
        <button onClick={() => navigate('/')} className="text-[#2d88ff] text-xs font-bold self-start flex items-center gap-1 mb-3 hover:underline">
          <i className="fa-solid fa-arrow-left"></i> Back to Mics
        </button>
        
        <div className="flex bg-[#242526] border border-[#3e4042] p-1 rounded-xl shrink-0 mb-3 w-full shadow-sm">
          <button onClick={() => setTicketTab('stub')} className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase transition-colors ${ticketTab === 'stub' ? 'bg-[#2d88ff] text-white' : 'text-[#b0b3b8] hover:text-white'}`}>
            <i className="fa-solid fa-ticket mr-1.5"></i> Ticket #{myPosition < 10 && myPosition !== '--' ? `0${myPosition}` : myPosition}
          </button>
          <button onClick={() => setTicketTab('chat')} className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase transition-colors relative ${ticketTab === 'chat' ? 'bg-[#2d88ff] text-white' : 'text-[#b0b3b8] hover:text-white'}`}>
            <i className="fa-solid fa-comments mr-1.5"></i> Mic Chat
            {hasSwapOffer && <span className="absolute top-2 right-6 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>}
          </button>
        </div>
      </div>

      {/* --- STUB & LIVE LINEUP TAB --- */}
      {ticketTab === 'stub' && (
        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col w-full animate-fade-in pb-6">
          
          {/* TICKET CARD */}
          <div className="px-3 mb-4 w-full">
            <div className="bg-[#242526] border border-[#2d88ff]/50 rounded-xl p-4 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#2d88ff]/10 rounded-full blur-3xl pointer-events-none"></div>
              
              <div className="flex justify-between items-start border-b border-[#3e4042] pb-3 relative z-10">
                <div>
                  <span className="text-[9px] font-mono-data uppercase tracking-widest text-emerald-400 font-bold flex items-center gap-1 mb-0.5">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span> Live Stage
                  </span>
                  <h3 className="text-lg font-bold text-white font-display">{activeMic?.name || 'Open Mic Session'}</h3>
                  <p className="text-[9px] text-[#b0b3b8] font-mono-data uppercase tracking-widest mt-0.5">Host Controls Active</p>
                </div>
                <span className="text-[10px] font-mono-data font-black text-[#18191a] bg-[#2d88ff] px-2 py-0.5 rounded uppercase">Your Stub</span>
              </div>

              <div className="my-4 text-center py-4 bg-[#18191a] rounded-xl border border-[#3e4042] relative z-10">
                <span className="text-[9px] font-mono-data text-[#b0b3b8] uppercase block mb-1">Queue Position</span>
                <span className="text-6xl font-black font-mono-data text-[#2d88ff] drop-shadow-md">
                  #{myPosition < 10 && myPosition !== '--' ? `0${myPosition}` : myPosition}
                </span>
              </div>
            </div>
          </div>

          {/* FULL LINEUP (FLUSH FULL-WIDTH) */}
          <div className="w-full flex flex-col">
            <span className="text-[10px] font-black text-[#b0b3b8] uppercase tracking-widest font-mono-data px-3 mb-1.5">Full Live Lineup</span>
            <div className="w-full bg-[#242526] border-y border-[#3e4042] flex flex-col">
              {queue.length === 0 ? (
                <div className="p-6 text-center text-[10px] text-[#b0b3b8] uppercase font-mono-data">Queue is empty or loading...</div>
              ) : (
                queue.map((c, index) => {
                  const isMe = String(c.id) === String(myComicProfile?.id);
                  const pos = c.position || index + 1;
                  
                  let statusBadge = null;
                  if (c.status === 'on_stage') {
                    statusBadge = <span className="text-[9px] bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded font-black uppercase font-mono-data animate-pulse">On Stage</span>;
                  } else if (c.status === 'on_deck') {
                    statusBadge = <span className="text-[9px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded font-black uppercase font-mono-data">On Deck</span>;
                  }

                  return (
                    <div key={c.id} className={`p-3 flex justify-between items-center border-b border-[#3e4042] last:border-b-0 ${isMe ? 'bg-[#2d88ff]/10' : c.status === 'on_stage' ? 'bg-red-900/10' : c.status === 'on_deck' ? 'bg-amber-900/10' : 'bg-[#18191a]'}`}>
                      <div className="flex gap-3 items-center">
                        <span className={`text-xs font-mono-data w-5 ${c.status === 'completed' ? 'text-[#3e4042]' : 'text-[#b0b3b8]'}`}>
                          {pos.toString().padStart(2, '0')}
                        </span>
                        <span className={`text-sm font-bold ${c.status === 'completed' ? 'text-[#b0b3b8] line-through opacity-60' : c.status === 'on_stage' ? 'text-red-400' : c.status === 'on_deck' ? 'text-amber-400' : 'text-white'}`}>
                          {c.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {statusBadge}
                        {isMe && <span className="text-[9px] bg-[#2d88ff] text-white px-2 py-0.5 rounded font-bold uppercase font-mono-data">You</span>}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- MIC CHAT TAB --- */}
      {ticketTab === 'chat' && (
        <div className="flex flex-col flex-1 min-h-0 w-full animate-fade-in">
          {/* Flush Chat Header */}
          <div className="bg-[#242526] border-y border-[#3e4042] p-3 flex justify-between items-center flex-none w-full shadow-sm">
            <span className="text-xs font-bold text-white uppercase tracking-wider font-mono-data">
              <i className="fa-solid fa-tower-broadcast text-[#2d88ff] mr-1.5 animate-pulse"></i> Event Chat
            </span>
            <span className="text-[10px] font-mono-data text-[#b0b3b8] flex items-center gap-1.5">
               <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span> Live
            </span>
          </div>

          <div className="flex-1 min-h-0 p-3 overflow-y-auto flex flex-col gap-3 w-full">
            {chatMessages.length === 0 ? (
              <div className="text-center text-[#b0b3b8] py-20 font-mono-data text-[10px] uppercase tracking-widest">
                Room is quiet. No messages yet.
              </div>
            ) : (
              chatMessages.map((msg, idx) => {
                const isMe = String(msg.sender_id) === String(myComicProfile?.id);
                return (
                  <div key={idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} w-full`}>
                    <span className="text-[10px] font-bold text-[#b0b3b8] ml-1 mb-0.5">{isMe ? 'You' : msg.sender_name}</span>
                    <div className={`p-2.5 rounded-xl text-sm border max-w-[85%] leading-relaxed ${isMe ? 'bg-[#2d88ff] border-[#2d88ff] text-white rounded-tr-sm shadow-sm' : 'bg-[#242526] border-[#3e4042] text-white rounded-tl-sm'}`}>
                      {msg.content}
                    </div>
                  </div>
                );
              })
            )}

            {/* Dynamic Embedded Spot Swap Request */}
            {hasSwapOffer && (
              <div className="bg-[#18191a] border border-[#2d88ff]/50 p-3 rounded-xl w-[90%] mt-2 self-center text-center">
                <span className="text-[9px] font-bold text-[#2d88ff] uppercase tracking-widest block mb-1">
                  <i className="fa-solid fa-right-left mr-1"></i> Spot Swap Request
                </span>
                <p className="text-xs text-[#b0b3b8] mb-2.5">Another comic wants to trade spots with you.</p>
                <div className="flex gap-2">
                  <button onClick={() => setHasSwapOffer(false)} className="flex-1 bg-[#2d88ff] hover:bg-blue-600 text-white font-bold text-[10px] py-2 rounded-lg uppercase transition-colors">Accept</button>
                  <button onClick={() => setHasSwapOffer(false)} className="flex-1 bg-[#242526] border border-[#3e4042] text-[#b0b3b8] hover:text-white font-bold text-[10px] py-2 rounded-lg uppercase transition-colors">Decline</button>
                </div>
              </div>
            )}
          </div>

          {/* Fixed Full-Width Chat Input */}
          <div className="p-2.5 bg-[#242526] border-t border-[#3e4042] flex-none flex items-center gap-2 relative w-full max-w-md mx-auto z-20 shadow-lg">
            
            {/* The + Popover Menu */}
            {showPlusMenu && (
              <div className="absolute bottom-14 left-2 w-48 bg-[#242526] border border-[#3e4042] rounded-xl p-1.5 shadow-2xl z-30 animate-fade-in">
                <div className="text-[9px] font-bold text-[#b0b3b8] uppercase tracking-widest mb-1 px-2 pt-1">Actions</div>
                <button className="w-full text-left px-2 py-2 text-xs font-bold text-[#2d88ff] hover:bg-gray-700 rounded transition-colors flex items-center gap-2">
                  <i className="fa-solid fa-right-left w-4"></i> Request Spot Swap
                </button>
                <button className="w-full text-left px-2 py-2 text-xs font-bold text-red-400 hover:bg-gray-700 rounded transition-colors flex items-center gap-2 mt-0.5">
                  <i className="fa-solid fa-user-minus w-4"></i> Drop Out of Lineup
                </button>
              </div>
            )}

            <button 
              onClick={() => setShowPlusMenu(!showPlusMenu)} 
              className="w-8 h-8 rounded-full bg-[#18191a] border border-[#3e4042] text-[#b0b3b8] flex items-center justify-center shrink-0 hover:text-white transition-colors"
            >
              <i className={`fa-solid ${showPlusMenu ? 'fa-xmark' : 'fa-plus'} text-xs`}></i>
            </button>

            <input 
              type="text" 
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Message room..." 
              className="flex-1 bg-[#18191a] border border-[#3e4042] rounded-full px-4 py-2 text-xs text-white focus:outline-none focus:border-[#2d88ff] font-sans transition-colors" 
            />
            <button 
              disabled={!chatInput.trim()}
              className="text-[#2d88ff] disabled:opacity-40 font-bold px-2 py-1 text-sm hover:text-blue-400 transition-colors"
            >
              <i className="fa-solid fa-paper-plane"></i>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
