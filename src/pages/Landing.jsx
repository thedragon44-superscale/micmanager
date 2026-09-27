import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMic } from '../MicContext';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Re-link Leaflet marker images so Webpack/Vite doesn't break them
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Helper component to trigger map camera pans when coordinates change
function MapUpdater({ center }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 11, { animate: true });
  }, [center, map]);
  return null;
}

export default function Landing() {
  const navigate = useNavigate();
  const { queue, myComicProfile, market, activeEventId } = useMic();
  
  const [todayMics, setTodayMics] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showRosterModal, setShowRosterModal] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    fetch(`${import.meta.env.VITE_API_URL}/events/today?market=${market}`)
      .then(res => res.ok ? res.json() : [])
      .then(data => setTodayMics(data || []))
      .catch(err => console.error("Error fetching today's mics:", err))
      .finally(() => setIsLoading(false));
  }, [market]);

  const activeQueue = queue.filter(c => c.status !== 'completed' && c.status !== 'dropped');
  const amIOnList = myComicProfile && activeQueue.some(c => c.id === myComicProfile.id);
  const activeMicsCount = todayMics.filter(m => m.status === 'active').length;

  // Calculate dynamic center based on active market's mic locations
  const validMics = todayMics.filter(m => m.lat && m.lng);
  const mapCenter = validMics.length > 0 
    ? [
        validMics.reduce((sum, m) => sum + m.lat, 0) / validMics.length,
        validMics.reduce((sum, m) => sum + m.lng, 0) / validMics.length
      ]
    : [30.2672, -97.7431]; // Default fallback

  return (
    <div className="flex flex-col gap-3 p-3 pb-24 animate-fade-in max-w-md mx-auto w-full">
      
      <div className="flex justify-between items-center px-1 pt-1">
        <h1 className="text-2xl font-black text-white uppercase font-display tracking-wide">Tonight's Mics</h1>
        <span className="text-[10px] font-mono-data text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded uppercase font-bold">
          {activeMicsCount} Active
        </span>
      </div>

      {/* DYNAMIC LOGISTICS RADAR MAP */}
      {!isLoading && todayMics.length > 0 && (
        <div className="bg-[#242526] border border-[#3e4042] rounded-xl overflow-hidden shadow-sm flex flex-col">
          <div className="h-40 relative w-full border-b border-[#3e4042]">
            <MapContainer 
              center={mapCenter} 
              zoom={11} 
              scrollWheelZoom={false} 
              className="h-full w-full !z-0 [&_.leaflet-tile-pane]:filter [&_.leaflet-tile-pane]:invert [&_.leaflet-tile-pane]:hue-rotate-180 [&_.leaflet-tile-pane]:brightness-90 [&_.leaflet-tile-pane]:contrast-85"
            >
              <MapUpdater center={mapCenter} />
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; OpenStreetMap'
              />
              {todayMics.filter(m => m.lat && m.lng).map(mic => (
                <Marker key={mic.id} position={[mic.lat, mic.lng]}>
                  <Popup className="font-sans !bg-[#242526] !text-white !border-[#3e4042] !rounded-lg">
                    <strong className="font-black font-display uppercase tracking-wider block border-b border-gray-600 pb-1 mb-1">{mic.venue}</strong>
                    <span className="text-xs text-[#b0b3b8] block">{mic.address}</span>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
          <div className="p-2.5 flex justify-between items-center bg-[#242526]">
            <div>
              <h3 className="text-xs font-bold text-white">Logistics Radar Map</h3>
              <p className="text-[10px] text-[#b0b3b8]">Live market routing</p>
            </div>
            <span className="text-[10px] font-mono-data text-[#2d88ff] font-bold uppercase tracking-widest">{market.split('_').join(' ')}</span>
          </div>
        </div>
      )}

      {/* Dynamic Mics Feed based on Database */}
      {isLoading ? (
        <div className="bg-[#242526] border border-[#3e4042] rounded-xl p-8 text-center shadow-sm">
          <i className="fa-solid fa-spinner animate-spin text-[#2d88ff] text-xl mb-2"></i>
          <p className="text-[10px] font-mono-data text-[#b0b3b8] uppercase tracking-widest">Loading scenes...</p>
        </div>
      ) : todayMics.length === 0 ? (
        <div className="bg-[#242526] border border-[#3e4042] rounded-xl p-8 text-center shadow-sm">
          <p className="text-[10px] font-mono-data text-[#b0b3b8] uppercase tracking-widest">No mics scheduled for {market.split('_').join(' ')} today.</p>
        </div>
      ) : (
        todayMics.map(mic => {
          const isActive = mic.status === 'active';
          const isMyActiveMic = isActive && activeEventId === mic.id;

          return (
            <div 
              key={mic.id} 
              className={`bg-[#242526] border border-[#3e4042] rounded-xl p-4 shadow-sm flex flex-col gap-3 ${!isActive ? 'opacity-80' : ''}`}
            >
              <div className="flex justify-between items-start border-b border-[#3e4042] pb-2.5 gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-bold text-white font-display tracking-wide truncate">{mic.name}</h3>
                  <p className="text-[11px] text-[#b0b3b8] mt-0.5 truncate">
                    <i className="fa-solid fa-location-dot mr-1 text-[#2d88ff]"></i> 
                    {mic.venue} {mic.address && `• ${mic.address}`}
                  </p>
                </div>
                {isActive ? (
                  <span className="text-[9px] font-bold px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-widest font-mono-data shrink-0 ml-2">
                    ● Live Signups
                  </span>
                ) : (
                  <span className="text-[9px] font-bold px-2 py-1 rounded bg-[#18191a] text-[#b0b3b8] border border-[#3e4042] uppercase tracking-widest font-mono-data shrink-0 ml-2">
                    Scheduled
                  </span>
                )}
              </div>

              {isActive ? (
                <>
                  <div className="flex justify-between items-center">
                    <div className="flex flex-col text-[11px] font-mono-data text-[#b0b3b8]">
                      <span>Host: <strong className="text-[#2d88ff] uppercase">{mic.host_name}</strong></span>
                      <span>Day: <strong className="text-white">{mic.day_of_week}</strong></span>
                      <span>Sign Up: <strong className="text-white">{mic.signup_time}</strong> • Start: <strong className="text-white">{mic.start_time}</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-[#18191a] border border-[#3e4042] flex items-center justify-center text-[#b0b3b8]">
                        <i className="fa-solid fa-users text-xs"></i>
                      </div>
                      <div>
                        <span className="text-sm font-bold font-mono-data text-white block leading-none">
                          {isMyActiveMic ? queue.length : '-'}
                        </span>
                        <span className="text-[9px] text-[#b0b3b8] uppercase font-bold">On List</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button 
                      onClick={() => setShowRosterModal(true)} 
                      className="flex-1 bg-[#18191a] border border-[#3e4042] text-white py-2.5 rounded-lg text-[11px] font-bold uppercase tracking-widest hover:bg-gray-800 font-mono-data transition-colors"
                    >
                      Roster
                    </button>
                    <button 
                      onClick={() => navigate(amIOnList && isMyActiveMic ? '/ticket' : '/signup')} 
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-lg text-[11px] font-bold uppercase tracking-widest font-mono-data shadow-md transition-colors"
                    >
                      {amIOnList && isMyActiveMic ? 'My Ticket' : 'Sign Up'}
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex justify-between items-center text-[11px] font-mono-data text-[#b0b3b8]">
                  <div className="flex flex-col">
                    <span>Host: <strong className="text-[#2d88ff] uppercase">{mic.host_name}</strong></span>
                    <span>Day: <strong className="text-white">{mic.day_of_week}</strong></span>
                  </div>
                  <div className="flex flex-col text-right">
                    <span>Sign Up: <strong className="text-white">{mic.signup_time}</strong></span>
                    <span>Start: <strong className="text-white">{mic.start_time}</strong></span>
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}

      {/* --- PUBLIC ROSTER MODAL --- */}
      {showRosterModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 pb-20 animate-fade-in" onClick={() => setShowRosterModal(false)}>
          <div className="bg-[#242526] border border-[#3e4042] rounded-2xl w-full max-w-sm mx-auto max-h-[70vh] flex flex-col shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b border-[#3e4042] shrink-0 bg-[#242526]">
              <div>
                <h3 className="text-sm font-bold text-white uppercase font-display tracking-wide">Live Roster</h3>
                <p className="text-[10px] text-[#b0b3b8] font-mono-data uppercase tracking-widest mt-0.5">Public Viewer</p>
              </div>
              <button onClick={() => setShowRosterModal(false)} className="w-8 h-8 rounded-full bg-[#18191a] border border-[#3e4042] text-[#b0b3b8] flex items-center justify-center hover:bg-gray-800 hover:text-white transition-colors">
                <i className="fa-solid fa-xmark text-sm"></i>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto w-full flex flex-col bg-[#18191a]">
              {queue.length === 0 ? (
                <div className="p-8 text-center text-[#b0b3b8] text-[10px] font-mono-data uppercase tracking-widest">
                  The list is currently empty.
                </div>
              ) : (
                queue.map((c, index) => {
                  const isMe = myComicProfile && String(c.id) === String(myComicProfile.id);
                  const pos = c.position || index + 1;
                  
                  let statusBadge = null;
                  if (c.status === 'on_stage') {
                    statusBadge = <span className="text-[9px] bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded font-black uppercase font-mono-data animate-pulse">On Stage</span>;
                  } else if (c.status === 'on_deck') {
                    statusBadge = <span className="text-[9px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded font-black uppercase font-mono-data">On Deck</span>;
                  }

                  return (
                    <div key={c.id} className={`p-3.5 flex justify-between items-center border-b border-[#3e4042] last:border-b-0 ${isMe ? 'bg-[#2d88ff]/10' : c.status === 'on_stage' ? 'bg-red-900/10' : c.status === 'on_deck' ? 'bg-amber-900/10' : 'bg-[#18191a]'}`}>
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
    </div>
  );
}
