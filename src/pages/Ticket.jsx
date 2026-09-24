import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMic } from '../MicContext';
import MicChat from '../components/MicChat';
import ProfileCard from '../components/ProfileCard';
import AudioRecorder from '../components/AudioRecorder';
import toast from 'react-hot-toast';

export default function Ticket() {
  const navigate = useNavigate();
  const { queue, myComicProfile, removeComic, currentComic, activeEventId } = useMic();
  
  // States
  const [incomingRequest, setIncomingRequest] = useState(null);
  const [selectedComicId, setSelectedComicId] = useState(null);

  useEffect(() => {
    if (!myComicProfile) navigate('/');
  }, [myComicProfile, navigate]);

  // Listen for incoming swap requests routed through the Chat's WS payload
  useEffect(() => {
    if (!activeEventId || !myComicProfile) return;
    
    const wsUrl = `ws://127.0.0.1:8000/ws/${activeEventId}`;
    const socket = new WebSocket(wsUrl);

    socket.onmessage = (event) => {
      const data = event.data;
      if (data.startsWith(`SWAP_REQ:${myComicProfile.id}:`)) {
        setIncomingRequest(parseInt(data.split(':')[2], 10));
      }
    };

    return () => {
      if (socket.readyState === 1) socket.close();
      else socket.addEventListener('open', () => socket.close());
    };
  }, [activeEventId, myComicProfile]);

  if (!myComicProfile) return null;

  const waitingList = queue.filter(c => c.status !== 'completed');
  const myIndex = waitingList.findIndex(c => c.id === myComicProfile.id);
  const onDeckComic = queue.find(c => c.status === 'on_deck');

  let spotText = `#${myIndex + 1}`;
  let badgeText = 'Waiting';
  let badgeClasses = 'bg-slate-800 text-slate-300 border-slate-700';

  if (myComicProfile.status === 'on_stage') {
    spotText = 'STAGE';
    badgeText = 'LIVE NOW';
    badgeClasses = 'bg-red-950 text-red-400 border-red-900/50 animate-pulse';
  } else if (myComicProfile.status === 'on_deck') {
    badgeText = 'ON DECK';
    badgeClasses = 'bg-amber-950 text-amber-400 border-amber-900/50';
  }

  const handleLeave = () => {
    if (window.confirm("Are you sure you want to remove yourself from the list?")) {
      removeComic(myComicProfile.id);
      navigate('/');
    }
  };

  const handleIncomingResponse = async (accepted) => {
    try {
      await fetch(`http://127.0.0.1:8000/events/${activeEventId}/swap/respond?target_id=${myComicProfile.id}&sender_id=${incomingRequest}&accepted=${accepted}`, {
        method: 'POST'
      });
      setIncomingRequest(null);
    } catch (err) {
      toast.error("Failed to send response.");
    }
  };

  const incomingSender = incomingRequest ? queue.find(c => c.id === incomingRequest) : null;

  return (
    <div className="p-4 flex flex-col gap-4 animate-fade-in overflow-y-auto relative h-full">
      
      {/* INCOMING REQUEST OVERLAY */}
      {incomingRequest && incomingSender && (
        <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md z-50 flex items-center justify-center p-6 animate-fade-in rounded-3xl border border-indigo-500 shadow-[0_0_50px_rgba(99,102,241,0.2)]">
          <div className="text-center w-full">
            <div className="w-20 h-20 bg-indigo-900/40 border-2 border-indigo-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
              <i className="fa-solid fa-handshake text-3xl text-indigo-400"></i>
            </div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-2">Swap Request!</h2>
            <p className="text-slate-300 mb-8 font-medium">
              <strong className="text-indigo-400 text-lg">{incomingSender.name}</strong> wants to trade spots with you.
            </p>
            <div className="flex gap-3">
              <button onClick={() => handleIncomingResponse(false)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-4 rounded-xl uppercase tracking-wider text-xs transition-colors">
                Decline
              </button>
              <button onClick={() => handleIncomingResponse(true)} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-xl uppercase tracking-wider text-xs transition-colors shadow-[0_0_20px_rgba(79,70,229,0.4)]">
                Accept Trade
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOP NAV */}
      <div className="flex justify-between items-center shrink-0">
        <button onClick={() => navigate('/')} className="text-blue-400 hover:text-blue-300 font-bold text-xs uppercase tracking-widest transition-colors">
          &larr; Browse Mics
        </button>
        <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest border border-slate-700 px-2 py-0.5 rounded bg-slate-900">
          Ticket Active
        </span>
      </div>

      {/* CONDENSED DASHBOARD CARD */}
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 shadow-xl shrink-0 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-600 to-cyan-400"></div>
        
        {/* Row 1: My Spot */}
        <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-3 pl-2">
          <div>
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 block mb-0.5">Your Position</span>
            <div className="text-3xl font-black text-slate-100 tracking-tighter leading-none">{spotText}</div>
          </div>
          <div className={`text-[9px] font-black px-2.5 py-1 rounded border uppercase tracking-widest shadow-sm ${badgeClasses}`}>
            {badgeText}
          </div>
        </div>

        {/* Row 2: Stage Status */}
        <div className="grid grid-cols-2 gap-2 pl-2">
          <div>
            <span className="text-[8px] uppercase tracking-widest text-slate-500 font-black block mb-0.5 flex items-center gap-1">
              On Stage {currentComic && <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>}
            </span>
            {currentComic ? (
              <button onClick={() => setSelectedComicId(currentComic.id)} className="font-bold text-slate-200 hover:text-indigo-400 text-sm truncate block transition-colors text-left">
                {currentComic.name}
              </button>
            ) : (
              <span className="font-bold text-slate-600 text-sm truncate block">None</span>
            )}
          </div>
          <div>
            <span className="text-[8px] uppercase tracking-widest text-slate-500 font-black block mb-0.5">On Deck</span>
            {onDeckComic ? (
              <button onClick={() => setSelectedComicId(onDeckComic.id)} className="font-bold text-slate-200 hover:text-indigo-400 text-sm truncate block transition-colors text-left">
                {onDeckComic.name}
              </button>
            ) : (
              <span className="font-bold text-slate-600 text-sm truncate block">None</span>
            )}
          </div>
        </div>
      </div>

      {/* MIC CHAT (Takes up remaining space) */}
      <MicChat />

      {/* AUDIO RECORDER */}
      <AudioRecorder 
        userId={myComicProfile.id} 
        eventId={activeEventId} 
      />

      {/* BOTTOM ACTION */}
      <div className="shrink-0 mt-2">
        <button onClick={handleLeave} className="w-full bg-slate-900 hover:bg-red-950/40 text-slate-500 hover:text-red-400 border border-slate-800 hover:border-red-900/60 font-black py-3.5 rounded-xl text-[10px] uppercase tracking-widest transition-colors active:scale-95">
          Leave the List
        </button>
      </div>
      
      {/* PROFILE MODAL OVERLAY */}
      {selectedComicId && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-sm my-auto animate-fade-in flex justify-center">
            <ProfileCard 
              userId={selectedComicId} 
              currentUserId={myComicProfile?.id} 
              onClose={() => setSelectedComicId(null)} 
            />
          </div>
        </div>
      )}
    </div>
  );
}
