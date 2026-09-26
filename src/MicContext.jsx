import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';

const MicContext = createContext();

export function useMic() {
  return useContext(MicContext);
}

export function MicProvider({ children }) {
  const API_URL = import.meta.env.VITE_API_URL;

  // Persistent Host State via LocalStorage
  const [isHostClockedIn, setIsHostClockedInState] = useState(() => {
    return localStorage.getItem('isHostClockedIn') === 'true';
  });

  const [activeEventId, setActiveEventId] = useState(null);
  const [queue, setQueue] = useState([]);
  const [myComicProfile, setMyComicProfileState] = useState(() => {
    const saved = localStorage.getItem('myComicProfile');
    return saved ? JSON.parse(saved) : null;
  });

  const [market, setMarketState] = useState(() => {
    return localStorage.getItem('activeMarket') || 'austin';
  });

  const setMarket = (newMarket) => {
    setMarketState(newMarket);
    localStorage.setItem('activeMarket', newMarket);
  };

  const setMyComicProfile = (profile) => {
    setMyComicProfileState(profile);
    if (profile) {
      localStorage.setItem('myComicProfile', JSON.stringify(profile));
    } else {
      localStorage.removeItem('myComicProfile');
    }
  };

  // Stage timer settings
  const [stageSettings, setStageSettings] = useState({ minutes: 5, warningAt: 60 });
  const [timeLeft, setTimeLeft] = useState(300);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  const setIsHostClockedIn = (status) => {
    setIsHostClockedInState(status);
    if (status) {
      localStorage.setItem('isHostClockedIn', 'true');
    } else {
      localStorage.removeItem('isHostClockedIn');
    }
  };

  // Fetch queue for current event
  const loadQueue = useCallback(async (eventId) => {
    if (!eventId) return;
    try {
      const res = await fetch(`${API_URL}/events/${eventId}/queue`);
      if (res.ok) {
        const data = await res.json();
        setQueue(data.map(item => ({
          id: item.comic_id,
          name: item.comic_name,
          status: item.status,
          position: item.position
        })));
      }
    } catch (err) {
      console.error("Failed to load queue:", err);
    }
  }, [API_URL]);

  // AUTO-REHYDRATE ON REFRESH: Fetch active mic from SQLite database
  const checkActiveMic = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/mics/active?market=${market}`);
      if (res.ok) {
        const activeMics = await res.json();
        if (activeMics && activeMics.length > 0) {
          const currentActive = activeMics[0]; // Primary active mic
          setActiveEventId(currentActive.id);
          loadQueue(currentActive.id);
        } else {
          setActiveEventId(null);
          setQueue([]);
        }
      }
    } catch (err) {
      console.error("Error checking active mic:", err);
    }
  }, [API_URL, loadQueue, market]);

  useEffect(() => {
    checkActiveMic();
  }, [checkActiveMic]);

  // Real-Time WebSocket Connection
  useEffect(() => {
    if (!activeEventId) return;

    const wsUrl = API_URL.replace("http", "ws");
    const socket = new WebSocket(`${wsUrl}/ws/${activeEventId}`);
    let pingInterval;

    socket.onopen = () => {
      // Send a PING every 30 seconds to bypass Cloudflare's 100s idle timeout
      pingInterval = setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send("PING");
        }
      }, 30000);
    };

    socket.onmessage = (event) => {
      if (event.data === "REFRESH_QUEUE") {
        loadQueue(activeEventId);
      } else if (event.data === "MIC_ENDED") {
        toast("The host has ended the mic for tonight!", { icon: "🎤" });
        setQueue([]);
        setMyComicProfile(null);
        setActiveEventId(null);
        setIsHostClockedIn(false);
      }
    };

    return () => {
      if (pingInterval) clearInterval(pingInterval);
      socket.close();
    };
  }, [activeEventId, API_URL, loadQueue]);

  // Actions
  const registerComic = async (name) => {
    if (!activeEventId) {
      toast.error("No active mic session found to sign up for!");
      return false;
    }
    try {
      const res = await fetch(`${API_URL}/events/${activeEventId}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, push_enabled: false })
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Signup failed");
      }

      const data = await res.json();
      setMyComicProfile({ id: data.comic_id, name: data.comic_name });
      toast.success(`Signed up as ${name}!`);
      loadQueue(activeEventId);
      return true;
    } catch (err) {
      toast.error(err.message);
      return false;
    }
  };

  // Stage Timer Countdown Interval Effect
  useEffect(() => {
    let timer = null;
    if (isTimerRunning && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isTimerRunning) {
      setIsTimerRunning(false);
      toast("TIME IS UP! Light the comic!", { icon: "🚨", duration: 5000 });
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isTimerRunning, timeLeft]);

  const advanceQueue = async () => {
    if (!activeEventId) return;
    try {
      await fetch(`${API_URL}/events/${activeEventId}/advance`, { method: 'POST' });
      await loadQueue(activeEventId);
      
      // Auto-reset and auto-start timer for the new comic on stage
      setTimeLeft(stageSettings.minutes * 60);
      setIsTimerRunning(true);
      toast.success("Stage advanced & stage timer started!");
    } catch (err) {
      console.error(err);
    }
  };

  const activateMic = async (eventId, pin) => {
    try {
      const res = await fetch(`${API_URL}/events/${eventId}/activate?pin=${pin}`, {
        method: 'POST'
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Invalid PIN");
      }
      setIsHostClockedIn(true);
      setActiveEventId(eventId);
      await loadQueue(eventId);
      toast.success("Mic activated & Clocked in!");
      return true;
    } catch (err) {
      toast.error(err.message);
      return false;
    }
  };

  const endMic = async () => {
    if (activeEventId) {
      try {
        await fetch(`${API_URL}/events/${activeEventId}/end`, { method: 'POST' });
      } catch (err) {
        console.error(err);
      }
    }
    setIsHostClockedIn(false);
    setActiveEventId(null);
    setQueue([]);
  };

  const endSession = async () => {
    await endMic();
  };

  const updateComicStatus = async (comicId, status) => {
    if (!activeEventId) return;
    try {
      await fetch(`${API_URL}/events/${activeEventId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comic_id: comicId, status })
      });
      await loadQueue(activeEventId);
    } catch (err) {
      console.error('Failed to update comic status:', err);
    }
  };

  const currentComic = queue.find(c => c.status === 'on_stage') || null;
  const activeMic = activeEventId ? { id: activeEventId, name: 'Live Open Mic' } : null;

  const value = {
    market, setMarket,
    isHostClockedIn, setIsHostClockedIn,
    activeEventId, setActiveEventId,
    activeMic,
    stageSettings, setStageSettings,
    currentComic,
    myComicProfile, setMyComicProfile,
    queue, setQueue,
    timeLeft, setTimeLeft,
    isTimerRunning, setIsTimerRunning,
    registerComic, advanceQueue, endMic, endSession, updateComicStatus, loadQueue, checkActiveMic, activateMic
  };

  return <MicContext.Provider value={value}>{children}</MicContext.Provider>;
}
