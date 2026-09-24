import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function ListMic() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ name: '', venue: '', host_pin: '', day_of_week: '5', start_time: '20:00', default_stage_time: 5 });
  const [venueQuery, setVenueQuery] = useState('');
  const [venueResults, setVenueResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (venueQuery.length < 3) return setVenueResults([]);
    
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(venueQuery + ' Austin TX')}&limit=5&addressdetails=1`);
        setVenueResults(await res.json());
        setShowDropdown(true);
      } catch (err) { 
        console.error("Venue search error:", err); 
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [venueQuery]);

  const handleSelect = (v) => {
    const placeName = (v.name && v.name !== v.address?.house_number) 
      ? v.name 
      : v.display_name.split(',')[0];
      
    setVenueQuery(placeName);
    setFormData({ ...formData, venue: placeName });
    setShowDropdown(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('http://127.0.0.1:8000/series/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, day_of_week: parseInt(formData.day_of_week), default_stage_time: parseInt(formData.default_stage_time) })
      });
      if (!res.ok) throw new Error("Failed to create mic");
      toast.success("Mic listed successfully!");
      navigate('/'); 
    } catch (err) { toast.error(err.message); }
  };

  return (
    <div className="p-6 flex-1 flex flex-col items-center justify-center">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-xl">
        <h2 className="text-xl font-black text-slate-100 mb-6 uppercase tracking-tight text-center">List a New Mic</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4 text-left" autoComplete="off">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Mic Name</label>
            <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} autoComplete="off" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-slate-100 focus:outline-none focus:border-indigo-500" placeholder="e.g. Midnight Roasters" />
          </div>
          
          <div className="relative">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Venue</label>
            <input type="text" required value={venueQuery} onChange={e => { setVenueQuery(e.target.value); setFormData({...formData, venue: e.target.value}); }} autoComplete="off" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-slate-100 focus:outline-none focus:border-indigo-500" placeholder="Type business name or address..." />
            
            {showDropdown && venueResults.length > 0 && (
              <ul className="absolute z-10 w-full bg-slate-800 border border-slate-700 rounded-lg mt-1 max-h-48 overflow-y-auto shadow-2xl">
                {venueResults.map((v) => (
                  <li key={v.place_id} onClick={() => handleSelect(v)} className="p-3 border-b border-slate-700/50 hover:bg-indigo-900/50 cursor-pointer transition-colors">
                    <div className="font-bold text-slate-200 text-sm">
                      {(v.name && v.name !== v.address?.house_number) ? v.name : v.display_name.split(',')[0]}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate mt-0.5">{v.display_name}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Day of Week</label>
              <select value={formData.day_of_week} onChange={e => setFormData({...formData, day_of_week: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-slate-100 focus:outline-none focus:border-indigo-500 text-sm">
                <option value="0">Monday</option><option value="1">Tuesday</option><option value="2">Wednesday</option>
                <option value="3">Thursday</option><option value="4">Friday</option><option value="5">Saturday</option><option value="6">Sunday</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Start Time</label>
              <input type="time" required value={formData.start_time} onChange={e => setFormData({...formData, start_time: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-slate-100 focus:outline-none focus:border-indigo-500" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Host PIN</label>
              <input type="password" required maxLength={4} value={formData.host_pin} onChange={e => setFormData({...formData, host_pin: e.target.value})} autoComplete="new-password" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-slate-100 font-mono tracking-widest focus:outline-none focus:border-indigo-500" placeholder="0000" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Set Time (Min)</label>
              <input type="number" required min="1" value={formData.default_stage_time} onChange={e => setFormData({...formData, default_stage_time: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-slate-100 focus:outline-none focus:border-indigo-500" />
            </div>
          </div>

          <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-lg mt-4 transition-colors uppercase tracking-wider text-sm shadow-lg">
            CREATE MIC
          </button>
        </form>
      </div>
    </div>
  );
}
