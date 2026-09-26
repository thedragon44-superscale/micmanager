import { useState, useEffect, useRef } from 'react';
import { useMic } from '../MicContext';
import { useAuth } from '../AuthContext';
import toast from 'react-hot-toast';

export default function GlobalAudioGuard() {
  const { user } = useAuth();
  const { activeEventId, queue, myComicProfile } = useMic();

  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [autoRecordEnabled, setAutoRecordEnabled] = useState(() => {
    return localStorage.getItem('auto_record_enabled') !== 'false';
  });

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const wasOnStageRef = useRef(false);
  const currentEventIdRef = useRef(null);

  const authUserId = user?.user_id || user?.id;

  // Sync auto-record preference updates from localStorage
  useEffect(() => {
    const handleStorageChange = () => {
      setAutoRecordEnabled(localStorage.getItem('auto_record_enabled') !== 'false');
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // AUTO-RECORD ENGINE
  useEffect(() => {
    // Find user's queue entry in active mic
    const myEntry = queue.find(
      c => (myComicProfile && (c.id === myComicProfile.id || c.comic_id === myComicProfile.id)) || 
           (user && (c.name === user.username || c.comic_name === user.username))
    );

    const isOnStage = myEntry && myEntry.status === 'on_stage';

    if (isOnStage) {
      currentEventIdRef.current = activeEventId || myEntry.event_id;
    }

    // 1. AUTO-START: Promoted to 'on_stage' AND Auto-Record is enabled
    if (isOnStage && !isRecording && autoRecordEnabled && !wasOnStageRef.current) {
      wasOnStageRef.current = true;
      attemptStartRecording();
    }

    // 2. AUTO-STOP & SAVE: Was on stage, but no longer on stage (e.g. host clicked Next Comic)
    if (wasOnStageRef.current && !isOnStage && isRecording) {
      wasOnStageRef.current = false;
      stopAndAutoSave();
    }
  }, [queue, isRecording, autoRecordEnabled, activeEventId]);

  // Handle Tab Focus Regain when user brings browser back up
  useEffect(() => {
    const handleVisibilityChange = () => {
      const myEntry = queue.find(
        c => (myComicProfile && (c.id === myComicProfile.id || c.comic_id === myComicProfile.id)) || 
             (user && (c.name === user.username || c.comic_name === user.username))
      );
      const isOnStage = myEntry && myEntry.status === 'on_stage';

      if (
        document.visibilityState === 'visible' && 
        isOnStage && 
        !isRecording && 
        autoRecordEnabled
      ) {
        wasOnStageRef.current = true;
        currentEventIdRef.current = activeEventId || myEntry.event_id;
        attemptStartRecording();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [queue, isRecording, autoRecordEnabled, activeEventId]);

  // Recording counter timer
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isRecording]);

  const attemptStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);
      toast("🎙️ You are ON STAGE! Stage Guard recording...", { duration: 4000, icon: '🔴' });
    } catch (err) {
      console.warn("Auto-record blocked by browser or mic unavailable:", err);
      toast("⚠️ Tap 'Start Record' to capture your set!", { duration: 5000 });
    }
  };

  const stopAndAutoSave = () => {
    if (!mediaRecorderRef.current || !isRecording) return;

    mediaRecorderRef.current.stop();
    setIsRecording(false);
    
    if (mediaRecorderRef.current.stream) {
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }

    mediaRecorderRef.current.onstop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      await uploadToVault(audioBlob, recordingTime);
    };
  };

  const uploadToVault = async (blob, duration) => {
    if (!authUserId) return;
    setIsUploading(true);

    const formData = new FormData();
    formData.append('file', blob, `set_${Date.now()}.webm`);
    formData.append('duration_seconds', duration);
    
    const targetEventId = currentEventIdRef.current || activeEventId;
    if (targetEventId) {
      formData.append('event_id', targetEventId);
    }

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/users/${authUserId}/audio`, {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        toast.success("Set saved to Stage History & Vault! 🎙️");
      } else {
        toast.error("Failed to save recording.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error during audio upload.");
    } finally {
      setIsUploading(false);
      setRecordingTime(0);
    }
  };

  const formatSeconds = (sec) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  if (!isRecording && !isUploading) return null;

  return (
    <div className="fixed bottom-[80px] right-4 z-[300] bg-[#242526] border border-red-500/50 rounded-xl p-3 shadow-lg flex items-center gap-3 backdrop-blur-md">
      <div className="flex items-center gap-2.5">
        <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
        <div className="flex flex-col">
          <span className="text-[9px] font-bold uppercase tracking-widest font-mono-data text-red-400">
            {isUploading ? 'Saving Set...' : 'Live Stage Guard'}
          </span>
          <span className="text-xs font-mono-data font-bold text-white">
            {formatSeconds(recordingTime)}
          </span>
        </div>
      </div>

      {isRecording && (
        <button 
          onClick={() => {
            wasOnStageRef.current = false;
            stopAndAutoSave();
          }}
          disabled={isUploading}
          className="bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest font-mono-data transition-colors shadow-sm ml-1"
        >
          Stop & Save
        </button>
      )}
    </div>
  );
}
