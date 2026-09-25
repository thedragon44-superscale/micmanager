import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMic } from '../MicContext';

export default function Ticket() {
  const navigate = useNavigate();
  const { 
    queue, 
    myComicProfile, 
    removeFromQueue, 
    activeMic, 
    requestSpotSwap, 
    swapRequests, 
    respondToSwapRequest 
  } = useMic();

  const [activeTab, setActiveTab] = useState('pass'); // 'pass' | 'chat'
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [showConfirmCancel, setShowConfirmCancel] = useState(false);
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [targetSwapComic, setTargetSwapComic] = useState(null);

  const chatEndRef = useRef(null);

  const activeQueue = queue.filter(c => c.status !== 'completed');
  const myQueueIndex = activeQueue.findIndex(c => c.id === myComicProfile?.id);
  const myEntry = activeQueue[myQueueIndex];

  // Fetch Live Chat Messages for Active Mic
  useEffect(() => {
    if (!activeMic?.id) return;
    fetch(`${import.meta.env.VITE_API_URL}/events/${activeMic.id}/chat`)
      .then(res => res.json())
      .then(data => setMessages(data || []))
      .catch(err => console.error('Error fetching chat:', err));
  }, [activeMic?.id]);

  // Auto-scroll Chat
  useEffect(() => {
    if (activeTab === 'chat') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeTab]);

  if (!myComicProfile || myQueueIndex === -1 || !myEntry) {
    return (
      <div className="p-6 text-center animate-fade-in flex flex-col items-center justify-center flex-1 my-auto">
        <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 text-xl mb-4">
          <i className="fa-solid fa-ticket"></i>
        </div>
        <h2 className="text-2xl font-black text-white uppercase font-display">No Active Ticket</h2>
        <p className="text-xs text-slate-400 font-medium max-w-xs mt-2 mb-6">
          You are not currently checked into tonight's lineup.
        </p>
        <button
          onClick={() => navigate('/')}
          className="bg-blue-600 hover:bg-blue-500 text-white font-black text-xs px-6 py-3.5 rounded-xl uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-blue-950/50"
        >
          View Tonight's Mics
        </button>
      </div>
    );
  }

  const positionNumber = myQueueIndex + 1;
  const isMeOnStage = myEntry.status === 'on_stage';
  const isMeOnDeck = myEntry.status === 'on_deck';

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const msgPayload = {
      id: Date.now().toString(),
      senderId: myComicProfile.id,
      senderName: myComicProfile.name,
      text: newMessage.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, msgPayload]);
    setNewMessage('');

    fetch(`${import.meta.env.VITE_API_URL}/events/${activeMic.id}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(msgPayload)
    }).catch(err => console.error('Failed to send message:', err));
  };

  const handleDropOut = async () => {
    await removeFromQueue(myComicProfile.id);
    setShowConfirmCancel(false);
    setShowPlusMenu(false);
    navigate('/');
  };

  const handleSendSwapOffer = async () => {
    if (!targetSwapComic) return;
    if (requestSpotSwap) {
      await requestSpotSwap(targetSwapComic.id);
    }
    setShowSwapModal(false);
    setTargetSwapComic(null);
  };

  return (
    <div className="p-4 sm:p-5 flex flex-col gap-4 animate-fade-in max-w-md mx-auto w-full flex-1">
      
      {/* TICKET / CHAT SUB-NAVIGATION SWITCHER */}
      <div className="flex bg-slate-900/90 border border-slate-800 p-1 rounded-2xl">
        <button
          onClick={() => setActiveTab('pass')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
            activeTab === 'pass'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-950/50 font-mono-data'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <i className="fa-solid fa-ticket mr-2"></i> Pass #{positionNumber < 10 ? `0${positionNumber}` : positionNumber}
        </button>
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all relative ${
            activeTab === 'chat'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-950/50 font-mono-data'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <i className="fa-solid fa-comments mr-2"></i> Mic Chat
          {messages.length > 0 && (
            <span className="ml-1.5 bg-slate-950 text-blue-400 text-[9px] font-mono-data px-1.5 py-0.5 rounded-full border border-blue-500/30">
              {messages.length}
            </span>
          )}
        </button>
      </div>

      {/* --- TAB 1: STAGE PASS & TICKET STUB --- */}
      {activeTab === 'pass' && (
        <div className="flex flex-col gap-5 animate-fade-in">
          
          {/* STATUS BANNER */}
          {isMeOnStage ? (
            <div className="bg-red-950/60 border border-red-500/50 p-4 rounded-2xl glow-red text-center animate-pulse">
              <p className="text-xs font-black text-red-400 uppercase tracking-widest font-mono-data flex items-center justify-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-400 animate-ping"></span>
                YOU ARE ON STAGE NOW!
              </p>
              <p className="text-[11px] text-slate-300 font-medium mt-1">
                Background audio recording is running. Do your set!
              </p>
            </div>
          ) : isMeOnDeck ? (
            <div className="bg-amber-950/60 border border-amber-500/50 p-4 rounded-2xl glow-amber text-center">
              <p className="text-xs font-black text-amber-400 uppercase tracking-widest font-mono-data flex items-center justify-center gap-2">
                <i className="fa-solid fa-triangle-exclamation"></i> YOU ARE ON DECK!
              </p>
              <p className="text-[11px] text-slate-300 font-medium mt-1">
                Head to the stage area. You are up next.
              </p>
            </div>
          ) : (
            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl text-center">
              <p className="text-xs font-black text-blue-400 uppercase tracking-widest font-mono-data">
                Checked In & Waiting
              </p>
              <p className="text-[11px] text-slate-400 font-medium mt-1">
                {myQueueIndex} {myQueueIndex === 1 ? 'comic' : 'comics'} ahead of you in line.
              </p>
            </div>
          )}

          {/* INCOMING SPOT SWAP REQUEST ALERT */}
          {swapRequests && swapRequests.length > 0 && (
            <div className="bg-indigo-950/80 border border-indigo-500/50 p-4 rounded-2xl glow-blue">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-mono-data font-black text-indigo-400 uppercase tracking-widest">
                  <i className="fa-solid fa-right-left mr-1"></i> Spot Swap Offered
                </span>
              </div>
              <p className="text-xs text-white font-medium mb-3">
                <span className="font-bold text-indigo-300">{swapRequests[0].senderName}</span> wants to trade spot #{swapRequests[0].senderPosition} for your spot #{positionNumber}.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => respondToSwapRequest && respondToSwapRequest(swapRequests[0].id, true)}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs py-2 rounded-xl uppercase tracking-wider active:scale-95 transition-all"
                >
                  Accept Trade
                </button>
                <button
                  onClick={() => respondToSwapRequest && respondToSwapRequest(swapRequests[0].id, false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs py-2 rounded-xl uppercase tracking-wider active:scale-95 transition-all"
                >
                  Decline
                </button>
              </div>
            </div>
          )}

          {/* DIGITAL TICKET STUB */}
          <div className={`relative rounded-3xl p-6 border transition-all duration-300 shadow-2xl ${
            isMeOnStage 
              ? 'bg-slate-900 border-red-500/50 glow-red' 
              : isMeOnDeck 
              ? 'bg-slate-900 border-amber-500/50 glow-amber' 
              : 'bg-slate-900 border-blue-500/30 glow-blue'
          }`}>
            
            <div className="flex justify-between items-start border-b border-slate-800/80 pb-4">
              <div>
                <span className="text-[10px] font-mono-data uppercase tracking-widest text-slate-500 block">Event</span>
                <h3 className="text-xl font-bold text-white font-display">{activeMic?.name || 'Open Mic Night'}</h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">{activeMic?.venue || 'Live Venue'}</p>
              </div>
              <span className="text-xs font-mono-data font-black text-slate-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 uppercase">
                Pass
              </span>
            </div>

            <div className="my-6 text-center py-4 bg-slate-950/80 rounded-2xl border border-slate-800">
              <span className="text-[10px] font-mono-data text-slate-500 uppercase tracking-widest block mb-1">Queue Position</span>
              <span className={`text-6xl font-black font-mono-data tracking-tight ${
                isMeOnStage ? 'text-red-400' : isMeOnDeck ? 'text-amber-400' : 'text-blue-400'
              }`}>
                #{positionNumber < 10 ? `0${positionNumber}` : positionNumber}
              </span>
            </div>

            <div className="flex justify-between items-center border-t border-slate-800/80 pt-4">
              <div>
                <span className="text-[10px] font-mono-data uppercase tracking-widest text-slate-500 block">Performer</span>
                <span className="text-sm font-bold text-white">{myComicProfile.name}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-mono-data uppercase tracking-widest text-slate-500 block">Status</span>
                <span className={`text-xs font-black uppercase tracking-wider font-mono-data ${
                  isMeOnStage ? 'text-red-400' : isMeOnDeck ? 'text-amber-400' : 'text-emerald-400'
                }`}>
                  {myEntry.status.replace('_', ' ')}
                </span>
              </div>
            </div>

          </div>

          {/* ACTION BUTTONS */}
          <div className="flex gap-2">
            {!isMeOnStage && (
              <button
                onClick={() => setShowSwapModal(true)}
                className="flex-1 bg-slate-900 hover:bg-slate-800 text-blue-400 border border-blue-500/30 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <i className="fa-solid fa-right-left"></i> Request Spot Swap
              </button>
            )}

            {!isMeOnStage && (
              <button
                onClick={() => setShowConfirmCancel(true)}
                className="bg-slate-950 hover:bg-red-950/40 text-slate-500 hover:text-red-400 border border-slate-800 hover:border-red-900/40 px-4 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95"
              >
                Drop
              </button>
            )}
          </div>

        </div>
      )}

      {/* --- TAB 2: LIVE MIC CHAT --- */}
      {activeTab === 'chat' && (
        <div className="flex flex-col flex-1 bg-slate-900/60 border border-slate-800 rounded-2xl h-[480px] overflow-hidden">
          
          {/* CHAT MESSAGES FEED */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3">
            {messages.length === 0 ? (
              <div className="text-center text-slate-600 py-16 font-mono-data text-xs uppercase">
                No chat messages yet. Start the room!
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = msg.senderId === myComicProfile.id;

                return (
                  <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold text-slate-400">{msg.senderName}</span>
                      <span className="text-[9px] font-mono-data text-slate-600">{msg.timestamp}</span>
                    </div>
                    <div className={`p-3 rounded-2xl max-w-[80%] text-xs font-medium ${
                      isMe 
                        ? 'bg-blue-600 text-white rounded-tr-none' 
                        : 'bg-slate-950 border border-slate-800 text-slate-200 rounded-tl-none'
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={chatEndRef} />
          </div>

          {/* CHAT INPUT BAR WITH '+' ACTION MENU */}
          <form onSubmit={handleSendMessage} className="p-2.5 bg-slate-950 border-t border-slate-800 flex items-center gap-2 relative">
            
            {/* '+' QUICK ACTION BUTTON */}
            <button
              type="button"
              onClick={() => setShowPlusMenu(!showPlusMenu)}
              className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all active:scale-95 shrink-0 ${
                showPlusMenu 
                  ? 'bg-blue-600 border-blue-500 text-white rotate-45' 
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <i className="fa-solid fa-plus text-sm"></i>
            </button>

            {/* TEXT INPUT */}
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Message the lineup..."
              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
            />

            {/* SEND BUTTON */}
            <button
              type="submit"
              className="w-10 h-10 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl flex items-center justify-center transition-all active:scale-95 shrink-0 shadow-lg shadow-blue-950/50"
            >
              <i className="fa-solid fa-paper-plane text-xs"></i>
            </button>

            {/* '+' QUICK ACTION MENU POPOVER */}
            {showPlusMenu && (
              <div className="absolute bottom-14 left-2.5 bg-slate-900 border border-slate-800 p-2 rounded-2xl w-52 shadow-2xl flex flex-col gap-1 z-50 animate-fade-in">
                <button
                  type="button"
                  onClick={() => {
                    setShowPlusMenu(false);
                    setShowSwapModal(true);
                  }}
                  className="p-2.5 rounded-xl text-left text-xs font-bold text-slate-200 hover:bg-slate-800 flex items-center gap-2.5 transition-colors"
                >
                  <i className="fa-solid fa-right-left text-blue-400 text-xs"></i> Request Spot Swap
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPlusMenu(false);
                    setShowConfirmCancel(true);
                  }}
                  className="p-2.5 rounded-xl text-left text-xs font-bold text-red-400 hover:bg-red-950/40 flex items-center gap-2.5 transition-colors"
                >
                  <i className="fa-solid fa-user-minus text-red-400 text-xs"></i> Drop Out of Lineup
                </button>
              </div>
            )}

          </form>

        </div>
      )}

      {/* --- SPOT SWAP SELECTOR MODAL --- */}
      {showSwapModal && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowSwapModal(false)}>
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl w-full max-w-xs flex flex-col max-h-[80vh] shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-800">
              <h3 className="text-sm font-black text-white uppercase font-display">Select Comic to Swap</h3>
              <button onClick={() => setShowSwapModal(false)} className="text-slate-500 hover:text-white font-bold p-1">✕</button>
            </div>
            
            <p className="text-[11px] text-slate-400 mb-3">Choose a performer in line to offer a position trade:</p>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 mb-4">
              {activeQueue.filter(c => c.id !== myComicProfile.id).map((comic, idx) => {
                const isSelected = targetSwapComic?.id === comic.id;

                return (
                  <button
                    key={comic.id}
                    onClick={() => setTargetSwapComic(comic)}
                    className={`w-full p-3 rounded-xl border text-left flex justify-between items-center transition-all active:scale-95 ${
                      isSelected 
                        ? 'bg-blue-950/50 border-blue-500 text-blue-400 glow-blue font-mono-data' 
                        : 'bg-slate-950 border-slate-800 text-slate-200'
                    }`}
                  >
                    <span className="text-xs font-bold">
                      #{idx + 1 < 10 ? `0${idx + 1}` : idx + 1} • {comic.name}
                    </span>
                    {isSelected && <i className="fa-solid fa-check text-blue-400 text-xs"></i>}
                  </button>
                );
              })}
            </div>

            <button
              onClick={handleSendSwapOffer}
              disabled={!targetSwapComic}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-black py-3 rounded-xl uppercase tracking-widest text-xs transition-all active:scale-95 shadow-lg shadow-blue-950/50"
            >
              Send Swap Offer
            </button>
          </div>
        </div>
      )}

      {/* --- CONFIRM DROP OUT MODAL --- */}
      {showConfirmCancel && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowConfirmCancel(false)}>
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl w-full max-w-xs text-center shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-black text-white uppercase font-display mb-2">Leave Lineup?</h3>
            <p className="text-xs text-slate-400 mb-6">This will forfeit position #{positionNumber} in the stage queue.</p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowConfirmCancel(false)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all active:scale-95"
              >
                Keep Spot
              </button>
              <button
                onClick={handleDropOut}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all active:scale-95 shadow-lg shadow-red-950/50"
              >
                Confirm Drop
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
