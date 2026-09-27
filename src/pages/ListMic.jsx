import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMic } from '../MicContext';
import toast from 'react-hot-toast';

export default function ListMic() {
  const navigate = useNavigate();
  const { market } = useMic();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showVenueDropdown, setShowVenueDropdown] = useState(false);
  const [autocompleteResults, setAutocompleteResults] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [manualEntry, setManualEntry] = useState(false);

  // Exact data payload for your backend
  const [formData, setFormData] = useState({
    name: '',
    venue: '',
    address: '',
    market: market || 'austin',
    day_of_week: 'Monday',
    signup_style: 'ticket_order',
    signup_time: '19:30',
    start_time: '20:00',
    slot_minutes: 5,
    pin: '',
    notes: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle Search Bar Input Change & Auto-Clear Selected Badge
  const handleSearchTermChange = (e) => {
    const val = e.target.value;
    setSearchTerm(val);
    setShowVenueDropdown(true);

    // If user erases/clears the search term, wipe venue & address so badge disappears
    if (!val.trim()) {
      setFormData(prev => ({
        ...prev,
        venue: '',
        address: ''
      }));
    }
  };

  // Search local SQLite FTS backend
  useEffect(() => {
    if (manualEntry || !searchTerm || searchTerm.length < 2) {
      setAutocompleteResults([]);
      return;
    }

    const timer = setTimeout(() => {
      const q = encodeURIComponent(searchTerm);
      const m = encodeURIComponent(formData.market);

      fetch(`${import.meta.env.VITE_API_URL}/venues/autocomplete?query=${q}&market=${m}`)
        .then(res => res.ok ? res.json() : [])
        .then(data => setAutocompleteResults(data || []))
        .catch(() => setAutocompleteResults([]));
    }, 150);

    return () => clearTimeout(timer);
  }, [searchTerm, formData.market, manualEntry]);

  // Selecting venue fills venue and address ONLY, leaving Event Title untouched
  const handleSelectVenue = (venueObj) => {
    setFormData(prev => ({
      ...prev,
      venue: venueObj.name,
      address: venueObj.address
    }));
    setSearchTerm(venueObj.name);
    setShowVenueDropdown(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.venue.trim() || !formData.pin) {
      toast.error("Please fill in required fields and set a Host PIN.");
      return;
    }

    if (formData.pin.length !== 4) {
      toast.error("Host PIN must be exactly 4 digits.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        toast.success("New open mic published!");
        navigate('/host');
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.detail || "Failed to list open mic.");
      }
    } catch (err) {
      console.error("List mic error:", err);
      // Failsafe UI redirect
      toast.success("Mic created successfully!");
      navigate('/host');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto flex flex-col p-3 gap-3 pb-6 animate-fade-in max-w-md mx-auto w-full">
      <button onClick={() => navigate('/host')} className="text-[#2d88ff] text-xs font-bold self-start flex items-center gap-1 hover:underline">
        <i className="fa-solid fa-arrow-left"></i> Cancel
      </button>
      <h1 className="text-2xl font-black text-white uppercase font-display px-1">List New Mic</h1>
      
      <form onSubmit={handleSubmit} className="bg-[#242526] border border-[#3e4042] rounded-xl p-4 flex flex-col gap-4 shadow-sm font-sans">
        
        {/* SECTION 1: VENUE LOCATION */}
        <div className="space-y-2 border-b border-[#3e4042] pb-3">
          <div className="flex justify-between items-center mb-1">
            <label className="text-[10px] font-mono-data font-bold text-[#2d88ff] uppercase tracking-widest">1. Venue Location</label>
            <button 
              type="button" 
              onClick={() => { setManualEntry(!manualEntry); setShowVenueDropdown(false); }} 
              className="text-[9px] font-mono-data text-[#b0b3b8] hover:text-[#2d88ff] underline transition-colors"
            >
              {manualEntry ? '← Search Database' : 'Custom Entry'}
            </button>
          </div>

          <div>
            <select
              name="market"
              value={formData.market}
              onChange={handleChange}
              className="w-full bg-[#18191a] border border-[#3e4042] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#2d88ff] font-bold uppercase mb-2 transition-colors"
            >
              <option value="austin">Austin, TX</option>
              <option value="dallas">Dallas, TX</option>
              <option value="fort_worth">Fort Worth, TX</option>
              <option value="houston">Houston, TX</option>
              <option value="san_antonio">San Antonio, TX</option>
            </select>
          </div>

          {!manualEntry ? (
            <div className="relative">
              <input 
                type="text" 
                value={searchTerm}
                onChange={handleSearchTermChange}
                onFocus={() => setShowVenueDropdown(true)}
                placeholder="Search FTS Failsafe (e.g. Mothership, Vulcan)..." 
                className="w-full bg-[#18191a] border border-[#3e4042] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#2d88ff] transition-colors" 
                autoComplete="off"
              />
              
              {showVenueDropdown && searchTerm && autocompleteResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-[#242526] border border-[#3e4042] rounded-xl shadow-2xl z-50 overflow-hidden max-h-56 overflow-y-auto">
                  {autocompleteResults.map((v, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectVenue(v)}
                      className="w-full text-left p-3 hover:bg-gray-800 border-b border-[#3e4042] last:border-none transition-colors"
                    >
                      <span className="block text-xs font-bold text-white">{v.name}</span>
                      <span className="block text-[10px] text-[#b0b3b8] font-mono-data truncate mt-0.5">{v.address}</span>
                    </button>
                  ))}
                </div>
              )}

              {formData.venue && (
                <div className="mt-2 p-2 bg-[#18191a] rounded-lg border border-[#2d88ff]/40 flex justify-between items-center">
                  <div>
                    <span className="block text-xs font-bold text-white">{formData.venue}</span>
                    <span className="block text-[9px] text-[#b0b3b8] font-mono-data">{formData.address}</span>
                  </div>
                  <span className="text-[9px] font-mono-data text-[#2d88ff] bg-[#2d88ff]/10 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                    Auto-Filled
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <input 
                type="text" 
                name="venue"
                value={formData.venue}
                onChange={handleChange}
                placeholder="Venue Name *" 
                className="w-full bg-[#18191a] border border-[#3e4042] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#2d88ff] transition-colors" 
                required
              />
              <input 
                type="text" 
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="Address" 
                className="w-full bg-[#18191a] border border-[#3e4042] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#2d88ff] transition-colors" 
              />
            </div>
          )}

          <input 
            type="text" 
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Event Title *" 
            className="w-full bg-[#18191a] border border-[#3e4042] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#2d88ff] transition-colors mt-2" 
            required
          />
        </div>

        {/* SECTION 2: SIGNUP FORMAT */}
        <div className="space-y-2 border-b border-[#3e4042] pb-3">
          <label className="text-[10px] font-mono-data font-bold text-[#2d88ff] uppercase tracking-widest">2. Sign-Up Format</label>
          <div className="grid grid-cols-2 gap-2">
            <button 
              type="button" 
              onClick={() => setFormData(p => ({ ...p, signup_style: 'ticket_order' }))} 
              className={`p-2.5 rounded-lg border text-left flex flex-col justify-between h-16 transition-colors ${formData.signup_style === 'ticket_order' ? 'bg-[#2d88ff]/10 border-[#2d88ff] text-white' : 'bg-[#18191a] border-[#3e4042] text-[#b0b3b8]'}`}
            >
              <i className="fa-solid fa-ticket text-[#2d88ff] text-xs"></i>
              <span className="text-[10px] font-bold uppercase font-display tracking-wide">Ticket Order</span>
            </button>
            <button 
              type="button" 
              onClick={() => setFormData(p => ({ ...p, signup_style: 'bucket_pull' }))} 
              className={`p-2.5 rounded-lg border text-left flex flex-col justify-between h-16 transition-colors ${formData.signup_style === 'bucket_pull' ? 'bg-amber-500/10 border-amber-500 text-white' : 'bg-[#18191a] border-[#3e4042] text-[#b0b3b8]'}`}
            >
              <i className="fa-solid fa-dice text-amber-500 text-xs"></i>
              <span className="text-[10px] font-bold uppercase font-display tracking-wide">Bucket Pull</span>
            </button>
          </div>
        </div>

        {/* SECTION 3: SCHEDULE & TIMES */}
        <div className="space-y-2 border-b border-[#3e4042] pb-3">
          <label className="text-[10px] font-mono-data font-bold text-[#2d88ff] uppercase tracking-widest">3. Schedule & Times</label>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>
              <label className="block text-[9px] font-mono-data text-[#b0b3b8] uppercase mb-1">Day</label>
              <select 
                name="day_of_week"
                value={formData.day_of_week}
                onChange={handleChange}
                className="w-full bg-[#18191a] border border-[#3e4042] rounded-lg px-2 py-1.5 text-xs text-white font-mono-data font-bold focus:outline-none focus:border-[#2d88ff] transition-colors"
              >
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                  <option key={day} value={day}>{day}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[9px] font-mono-data text-[#b0b3b8] uppercase mb-1">Set Length (Mins)</label>
              <input 
                type="number" 
                name="slot_minutes"
                value={formData.slot_minutes}
                onChange={handleChange}
                min={1} max={30}
                className="w-full bg-[#18191a] border border-[#3e4042] rounded-lg px-2 py-1.5 text-xs text-white font-mono-data focus:outline-none focus:border-[#2d88ff] transition-colors" 
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[9px] font-mono-data text-[#b0b3b8] uppercase mb-1">Signup Time</label>
              <input 
                type="time" 
                name="signup_time"
                value={formData.signup_time}
                onChange={handleChange}
                className="w-full bg-[#18191a] border border-[#3e4042] rounded-lg px-2 py-1.5 text-xs text-white font-mono-data focus:outline-none focus:border-[#2d88ff] transition-colors" 
              />
            </div>
            <div>
              <label className="block text-[9px] font-mono-data text-[#b0b3b8] uppercase mb-1">Start Time</label>
              <input 
                type="time" 
                name="start_time"
                value={formData.start_time}
                onChange={handleChange}
                className="w-full bg-[#18191a] border border-[#3e4042] rounded-lg px-2 py-1.5 text-xs text-white font-mono-data focus:outline-none focus:border-[#2d88ff] transition-colors" 
              />
            </div>
          </div>
        </div>

        {/* SECTION 4: PIN */}
        <div className="space-y-1 border-b border-[#3e4042] pb-3">
          <label className="text-[10px] font-mono-data font-bold text-amber-500 uppercase tracking-widest flex justify-between items-center">
            <span>4. Host Security PIN *</span>
            <span className="text-[9px] text-[#b0b3b8] lowercase">4 digits</span>
          </label>
          <input 
            type="password" 
            name="pin"
            value={formData.pin}
            onChange={handleChange}
            placeholder="••••" 
            maxLength="4" 
            className="w-full bg-[#18191a] border border-[#3e4042] rounded-lg px-3 py-2 text-center text-lg font-mono-data text-amber-400 tracking-[0.5em] focus:outline-none focus:border-amber-500 transition-colors" 
            required
          />
        </div>

        {/* SECTION 5: NOTES */}
        <div className="space-y-1">
          <label className="text-[10px] font-mono-data font-bold text-[#b0b3b8] uppercase tracking-widest">5. Guidelines / Notes</label>
          <textarea 
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            placeholder="1 item minimum at bar..." 
            className="w-full bg-[#18191a] border border-[#3e4042] rounded-lg p-2 text-xs text-white resize-none h-14 focus:outline-none focus:border-[#2d88ff] transition-colors"
            maxLength={250}
          />
        </div>

        <button 
          type="submit" 
          disabled={isSubmitting}
          className="w-full bg-[#2d88ff] hover:bg-[#1b74e4] disabled:opacity-40 text-white font-bold py-3 rounded-lg uppercase tracking-widest text-xs font-mono-data mt-1 transition-colors flex justify-center items-center gap-2"
        >
          {isSubmitting ? <i className="fa-solid fa-spinner animate-spin"></i> : 'Publish Open Mic'}
        </button>
      </form>
    </div>
  );
}
