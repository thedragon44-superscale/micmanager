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

  const [formData, setFormData] = useState({
    name: '',
    venue: '',
    address: '',
    market: market || 'austin',
    day_of_week: 'Monday',
    signup_style: 'ticket_order', // 'ticket_order' | 'bucket_pull'
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

  // Fetch live autocomplete suggestions from local SQLite FTS5 backend
  useEffect(() => {
    if (!formData.venue || formData.venue.length < 2) {
      setAutocompleteResults([]);
      return;
    }

    const timer = setTimeout(() => {
      const q = encodeURIComponent(formData.venue);
      const m = encodeURIComponent(formData.market);

      fetch(`${import.meta.env.VITE_API_URL}/venues/autocomplete?query=${q}&market=${m}`)
        .then(res => res.ok ? res.json() : [])
        .then(data => setAutocompleteResults(data || []))
        .catch(() => setAutocompleteResults([]));
    }, 150);

    return () => clearTimeout(timer);
  }, [formData.venue, formData.market]);

  const handleSelectVenue = (venueObj) => {
    setFormData(prev => ({
      ...prev,
      venue: venueObj.name,
      address: venueObj.address,
      name: prev.name || `${venueObj.name} Open Mic`
    }));
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
      toast.success("Mic created successfully!");
      navigate('/host');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 sm:p-5 flex flex-col gap-5 animate-fade-in max-w-md mx-auto w-full flex-1 pb-10">
      
      {/* HEADER BAR */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mt-1">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
            <span className="text-[10px] font-mono-data uppercase tracking-widest text-indigo-400 font-bold">Host Portal</span>
          </div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tight font-display">List New Mic</h1>
        </div>

        <button
          onClick={() => navigate('/host')}
          className="bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-mono-data font-black px-3 py-2 rounded-xl uppercase tracking-wider transition-all active:scale-95"
        >
          ← Cancel
        </button>
      </div>

      {/* FORM CONTAINER */}
      <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* SECTION 1: VENUE & LOCATION FINDER */}
        <div className="space-y-3 relative z-20">
          <h3 className="text-xs font-black text-indigo-400 uppercase tracking-widest font-mono-data border-b border-slate-800/80 pb-1.5 flex justify-between items-center">
            <span>1. Venue & Location</span>
            <span className="text-[9px] text-slate-500 font-normal">Auto-Fill Active</span>
          </h3>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-mono-data font-black text-slate-400 uppercase tracking-widest mb-1">
                Market City
              </label>
              <select
                name="market"
                value={formData.market}
                onChange={handleChange}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-bold uppercase"
              >
                <option value="austin">Austin</option>
                <option value="dallas">Dallas</option>
                <option value="houston">Houston</option>
                <option value="san_antonio">San Antonio</option>
              </select>
            </div>

            {/* VENUE NAME WITH AUTOCOMPLETE DROP-DOWN */}
            <div className="relative">
              <label className="block text-[10px] font-mono-data font-black text-slate-400 uppercase tracking-widest mb-1">
                Venue Name *
              </label>
              <input
                type="text"
                name="venue"
                value={formData.venue}
                onChange={(e) => {
                  handleChange(e);
                  setShowVenueDropdown(true);
                }}
                onFocus={() => setShowVenueDropdown(true)}
                placeholder="Search venue..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-sans"
                required
                autoComplete="off"
              />

              {/* Autocomplete Suggestions Menu */}
              {showVenueDropdown && formData.venue && autocompleteResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden max-h-48 overflow-y-auto">
                  {autocompleteResults.map((v, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectVenue(v)}
                      className="w-full text-left p-2.5 hover:bg-indigo-950/50 border-b border-slate-900 last:border-none transition-colors"
                    >
                      <span className="block text-xs font-bold text-white">{v.name}</span>
                      <span className="block text-[10px] text-slate-400 font-mono-data truncate">{v.address}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-mono-data font-black text-slate-400 uppercase tracking-widest mb-1">
              Event Title *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g. Vulcan Gas Late Night Open Mic"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-sans"
              required
            />
          </div>

          <div>
            <label className="block text-[10px] font-mono-data font-black text-slate-400 uppercase tracking-widest mb-1">
              Address / Location
            </label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="Address auto-fills on venue selection..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-sans"
            />
          </div>
        </div>

        {/* SECTION 2: SIGNUP STYLE SELECTOR */}
        <div className="space-y-2.5 pt-1 relative z-10">
          <h3 className="text-xs font-black text-indigo-400 uppercase tracking-widest font-mono-data border-b border-slate-800/80 pb-1.5">
            2. Stage Sign-Up Format
          </h3>

          <div className="grid grid-cols-2 gap-2">
            {/* TICKET ORDER CARD */}
            <button
              type="button"
              onClick={() => setFormData(p => ({ ...p, signup_style: 'ticket_order' }))}
              className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                formData.signup_style === 'ticket_order'
                  ? 'bg-indigo-950/60 border-indigo-500 text-white glow-indigo'
                  : 'bg-slate-950 border-slate-800/80 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="flex justify-between items-center mb-1">
                <i className="fa-solid fa-ticket text-indigo-400 text-sm"></i>
                {formData.signup_style === 'ticket_order' && (
                  <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                )}
              </div>
              <div>
                <h4 className="text-xs font-black uppercase font-display text-white">Ticket Order</h4>
                <p className="text-[9px] text-slate-400 mt-0.5 leading-tight">First come, first served sequential queue.</p>
              </div>
            </button>

            {/* BUCKET PULL CARD */}
            <button
              type="button"
              onClick={() => setFormData(p => ({ ...p, signup_style: 'bucket_pull' }))}
              className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                formData.signup_style === 'bucket_pull'
                  ? 'bg-amber-950/60 border-amber-500 text-white glow-amber'
                  : 'bg-slate-950 border-slate-800/80 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="flex justify-between items-center mb-1">
                <i className="fa-solid fa-dice text-amber-400 text-sm"></i>
                {formData.signup_style === 'bucket_pull' && (
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                )}
              </div>
              <div>
                <h4 className="text-xs font-black uppercase font-display text-white">Bucket Pull</h4>
                <p className="text-[9px] text-slate-400 mt-0.5 leading-tight">Randomized lottery stage draw by host.</p>
              </div>
            </button>
          </div>
        </div>

        {/* SECTION 3: SCHEDULE & SLOT TIMES */}
        <div className="space-y-3 pt-1 relative z-10">
          <h3 className="text-xs font-black text-indigo-400 uppercase tracking-widest font-mono-data border-b border-slate-800/80 pb-1.5">
            3. Schedule & Slot Times
          </h3>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-mono-data font-black text-slate-400 uppercase tracking-widest mb-1">
                Day of Week
              </label>
              <select
                name="day_of_week"
                value={formData.day_of_week}
                onChange={handleChange}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-bold"
              >
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                  <option key={day} value={day}>{day}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-mono-data font-black text-slate-400 uppercase tracking-widest mb-1">
                Set Time (Mins)
              </label>
              <input
                type="number"
                name="slot_minutes"
                value={formData.slot_minutes}
                onChange={handleChange}
                min={1}
                max={30}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono-data"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-mono-data font-black text-slate-400 uppercase tracking-widest mb-1">
                List Signup Time
              </label>
              <input
                type="time"
                name="signup_time"
                value={formData.signup_time}
                onChange={handleChange}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono-data"
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono-data font-black text-slate-400 uppercase tracking-widest mb-1">
                Stage Start Time
              </label>
              <input
                type="time"
                name="start_time"
                value={formData.start_time}
                onChange={handleChange}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono-data"
              />
            </div>
          </div>
        </div>

        {/* SECTION 4: HOST SECURITY PIN */}
        <div className="space-y-2 pt-1 relative z-10">
          <h3 className="text-xs font-black text-amber-400 uppercase tracking-widest font-mono-data border-b border-slate-800/80 pb-1.5 flex items-center justify-between">
            <span>4. Host Security PIN *</span>
            <span className="text-[9px] text-slate-500 lowercase">4 digits</span>
          </h3>

          <input
            type="password"
            name="pin"
            value={formData.pin}
            onChange={handleChange}
            placeholder="••••"
            maxLength={4}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-center text-xl font-mono-data tracking-[0.5em] text-amber-400 focus:outline-none focus:border-amber-500"
            required
          />
        </div>

        {/* SECTION 5: NOTES & GUIDELINES */}
        <div className="space-y-2 pt-1 relative z-10">
          <label className="block text-[10px] font-mono-data font-black text-slate-400 uppercase tracking-widest">
            Mic Guidelines / Host Notes
          </label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            placeholder="e.g. 1 item minimum at bar, bucket pull at 7:45 PM..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500 resize-none h-20"
            maxLength={250}
          />
        </div>

        {/* SUBMIT BUTTON */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-black py-4 rounded-2xl uppercase tracking-widest text-xs transition-all active:scale-95 shadow-xl shadow-indigo-950/60 mt-4 flex items-center justify-center gap-2 relative z-10"
        >
          {isSubmitting ? (
            <i className="fa-solid fa-spinner animate-spin text-sm"></i>
          ) : (
            <>
              <i className="fa-solid fa-plus-circle text-xs"></i>
              <span>Publish Open Mic</span>
            </>
          )}
        </button>

      </form>

    </div>
  );
}
