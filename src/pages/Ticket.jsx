import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Ticket() {
  const navigate = useNavigate();
  const [ticketTab, setTicketTab] = useState('stub');
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [hasSwapOffer, setHasSwapOffer] = useState(true);

  // Mock data for the live lineup
  const myPosition = 12;
  const hostQueue = [
    { id: 1, name: 'Jerry Seinfeld', status: 'completed' },
    { id: 2, name: 'David Letterman', status: 'on_stage' },
    { id: 3, name: 'Richard Pryor', status: 'on_deck' },
    { id: 4, name: 'Joan Rivers', status: 'waiting' },
    { id: 12, name: 'Comic User (You)', status: 'waiting', isMe: true }
  ];

  return (
    <div className="flex flex-col h-full max-w-md mx-auto pb-32">
      <div className="p-3 pb-0">
        <button onClick={() => navigate('/')} className="text-[#2d88ff] text-xs font-bold self-start flex items-center gap-1 mb-3 hover:underline">
          <i className="fa-solid fa-arrow-left"></i> Back to Mics
        </button>
        
        {/* Tab Toggle */}
        <div className="flex bg-[#242526] border border-[#3e4042] p-1 rounded-xl shrink-0 mb-3">
          <button onClick={() => setTicketTab('stub')} className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase transition-colors ${ticketTab === 'stub' ? 'bg-[#2d88ff] text-white' : 'text-[#b0b3b8] hover:text-white'}`}>
            <i className="fa-solid fa-ticket mr-1.5"></i> Ticket #{myPosition < 10 ? `0${myPosition}` : myPosition}
          </button>
          <button onClick={() => setTicketTab('chat')} className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase transition-colors relative ${ticketTab === 'chat' ? 'bg-[#2d88ff] text-white' : 'text-[#b0b3b8] hover:text-white'}`}>
            <i className="fa-solid fa-comments mr-1.5"></i> Mic Chat
            {hasSwapOffer && <span className="absolute top-2 right-6 w-2 h-2 bg-red-500 rounded-full"></span>}
          </button>
        </div>
      </div>

      {/* --- STUB & LIVE LINEUP TAB --- */}
      {ticketTab === 'stub' && (
        <div className="flex flex-col gap-3 px-3">
          <div className="bg-[#242526] border border-[#2d88ff]/50 rounded-xl p-4 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#2d88ff]/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="flex justify-between items-start border-b border-[#3e4042] pb-3 relative z-10">
              <div>
                <span className="text-[9px] font-mono-data uppercase tracking-widest text-[#2d88ff] font-bold block mb-0.5">Live Check-In</span>
                <h3 className="text-lg font-bold text-white font-display">Vulcan Gas Open Mic</h3>
              </div>
              <span className="text-[10px] font-mono-data font-black text-white bg-[#2d88ff] px-2 py-0.5 rounded uppercase">Ticket</span>
            </div>

            <div className="my-4 text-center py-4 bg-[#18191a] rounded-xl border border-[#3e4042] relative z-10">
              <span className="text-[9px] font-mono-data text-[#b0b3b8] uppercase block mb-1">Queue Position</span>
              <span className="text-6xl font-black font-mono-data text-[#2d88ff] drop-shadow-md">#{myPosition < 10 ? `0${myPosition}` : myPosition}</span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-black text-[#b0b3b8] uppercase tracking-widest font-mono-data px-1">Full Live Lineup</span>
            <div className="bg-[#242526] border border-[#3e4042] rounded-xl overflow-hidden">
              {hostQueue.map(c => (
                <div key={c.id} className={`p-2.5 flex justify-between items-center border-b border-[#3e4042] last:border-b-0 ${c.isMe ? 'bg-[#2d88ff]/10' : c.status === 'on_stage' ? 'bg-red-900/20' : ''}`}>
                  <div className="flex gap-3 items-center">
                    <span className={`text-xs font-mono-data w-5 ${c.status === 'completed' ? 'text-[#3e4042]' : 'text-[#b0b3b8]'}`}>{(c.id).toString().padStart(2, '0')}</span>
                    <span className={`text-xs ${c.status === 'completed' ? 'text-[#b0b3b8] line-through opacity-60' : c.status === 'on_stage' ? 'text-red-400 font-bold' : 'text-white'}`}>{c.name}</span>
                  </div>
                  {c.status === 'on_stage' && <span className="text-[9px] bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded font-black uppercase font-mono-data animate-pulse">Live</span>}
                  {c.isMe && <span className="text-[9px] bg-[#2d88ff] text-white px-2 py-0.5 rounded font-bold uppercase font-mono-data">You</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- MIC CHAT TAB --- */}
      {ticketTab === 'chat' && (
        <div className="flex flex-col flex-1 bg-[#242526] border-x border-t border-[#3e4042] rounded-t-xl mx-3 overflow-hidden shadow-sm">
          <div className="bg-[#18191a] border-b border-[#3e4042] p-2.5 flex justify-between items-center shrink-0">
            <span className="text-xs font-bold text-white uppercase tracking-wider font-mono-data">
              <i className="fa-solid fa-tower-broadcast text-emerald-500 mr-1.5 animate-pulse"></i> Mic Chat Room
            </span>
            <span className="text-[10px] font-mono-data text-[#b0b3b8]">24 Online</span>
          </div>

          <div className="flex-1 p-3 overflow-y-auto flex flex-col gap-3 relative">
            <div className="text-center text-[10px] text-[#b0b3b8] font-mono-data uppercase font-bold my-1">Chat started at 6:30 PM</div>
            
            {/* Standard Message */}
            <div className="flex flex-col items-start max-w-[85%]">
              <span className="text-[10px] font-bold text-[#b0b3b8] ml-1 mb-0.5">Joan Rivers</span>
              <div className="p-2.5 rounded-xl text-sm bg-[#18191a] border border-[#3e4042] text-white rounded-tl-sm">
                Is parking validated here?
              </div>
            </div>

            {/* Venue Verified Message */}
            <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-xl w-[95%] self-center my-1">
              <span className="text-[9px] font-bold text-amber-500 uppercase tracking-wider block mb-1.5">
                <i className="fa-solid fa-circle-check mr-1"></i> Vulcan Gas Co. (Host)
              </span>
              <p className="text-xs text-amber-100 font-medium">List is full! We are starting the stage right now. Be by the patio when you are on deck.</p>
            </div>

            {/* Embedded Spot Swap Request */}
            {hasSwapOffer && (
              <div className="bg-[#18191a] border border-[#2d88ff]/50 p-3 rounded-xl w-[90%] mt-2">
                <span className="text-[9px] font-bold text-[#2d88ff] uppercase tracking-widest block mb-1">
                  <i className="fa-solid fa-right-left mr-1"></i> Spot Swap Request
                </span>
                <p className="text-xs text-white mb-2.5">Richard (Spot #3) wants to trade for your spot (#12).</p>
                <div className="flex gap-2">
                  <button onClick={() => setHasSwapOffer(false)} className="flex-1 bg-[#2d88ff] hover:bg-blue-600 text-white font-bold text-[10px] py-2 rounded-lg uppercase transition-colors">Accept</button>
                  <button onClick={() => setHasSwapOffer(false)} className="flex-1 bg-[#242526] border border-[#3e4042] text-[#b0b3b8] hover:text-white font-bold text-[10px] py-2 rounded-lg uppercase transition-colors">Decline</button>
                </div>
              </div>
            )}
          </div>

          {/* Chat Input Bar */}
          <div className="p-2.5 bg-[#242526] border-t border-[#3e4042] shrink-0 flex items-center gap-2 fixed bottom-[64px] left-0 right-0 w-full max-w-md mx-auto z-20 shadow-lg">
            {/* The + Popover Menu */}
            {showPlusMenu && (
              <div className="absolute bottom-12 left-2 w-48 bg-[#242526] border border-[#3e4042] rounded-xl p-1.5 shadow-2xl z-20 animate-fade-in">
                <div className="text-[9px] font-bold text-[#b0b3b8] uppercase tracking-widest mb-1 px-2 pt-1">Actions</div>
                <button className="w-full text-left px-2 py-2 text-xs font-bold text-[#2d88ff] hover:bg-gray-700 rounded transition-colors flex items-center gap-2">
                  <i className="fa-solid fa-right-left w-4"></i> Request Spot Swap
                </button>
                <button className="w-full text-left px-2 py-2 text-xs font-bold text-red-400 hover:bg-gray-700 rounded transition-colors flex items-center gap-2 mt-0.5">
                  <i className="fa-solid fa-user-minus w-4"></i> Drop Out of Lineup
                </button>
              </div>
            )}
            <button onClick={() => setShowPlusMenu(!showPlusMenu)} className="w-8 h-8 rounded-full bg-[#242526] border border-[#3e4042] text-[#b0b3b8] flex items-center justify-center shrink-0 hover:bg-gray-700 transition-colors">
              <i className={`fa-solid ${showPlusMenu ? 'fa-xmark' : 'fa-plus'} text-xs`}></i>
            </button>
            <input type="text" placeholder="Message room..." className="flex-1 bg-[#242526] border border-[#3e4042] rounded-full px-3 py-2 text-xs text-white focus:outline-none focus:border-[#2d88ff]" />
            <button className="text-[#2d88ff] font-bold px-1.5 text-sm hover:text-blue-400"><i className="fa-solid fa-paper-plane"></i></button>
          </div>
        </div>
      )}
    </div>
  );
}
