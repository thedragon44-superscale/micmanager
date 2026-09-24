import { useState, useEffect, useRef } from 'react';
import { useMic } from '../MicContext';
import { useAuth } from '../AuthContext';
import toast from 'react-hot-toast';

export default function AudioRecorder({ onRecordingComplete }) {
  const { user } = useAuth();
  const { activeEventId, queue, myComicProfile } = useMic();
  
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const prevStatusRef = useRef(null);

  const authUserId = user?.user_id || user?.id;

  // Find user's queue entry
  const myEntry = queue.find(
    c => (myComicProfile && c.id === myComicProfile.id) || (user && c.name === user.username)
  );

  // AUTO-TRIGGER ENGINE: Start on 'on_stage', Auto-Stop & Auto-Save on stage advance
  useEffect(() => {
    if (!myEntry) return;

    const currentStatus = myEntry.status;
    const prevStatus = prevStatusRef.current;

    // 1. Auto-Start when promoted to ON STAGE
    if (prevStatus !== 'on_stage' && currentStatus === 'on_stage' && !isRecording) {
      startRecording();
      toast("🎤 You are ON STAGE! Auto-recording started...", { duration: 4000 });
    }

    // 2. Auto-Stop and Auto-Upload when host advances queue ('on_stage' -> 'completed')
    if (prevStatus === 'on_stage' && currentStatus === 'completed' && isRecording) {
      stopAndAutoSave();
    }

    prevStatusRef.current = currentStatus;
  }, [myEntry?.status, isRecording]);

  // Timer counter for recording duration
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

  const startRecording = async () => {
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
    } catch (err) {
      toast.error("Microphone access denied or unavailable.");
      console.error(err);
    }
  };

  const stopAndAutoSave = () => {
    if (!mediaRecorderRef.current || !isRecording) return;

    mediaRecorderRef.current.stop();
    setIsRecording(false);
    
    // Stop all audio tracks to release mic
    mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());

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
    if (activeEventId) formData.append('event_id', activeEventId);

    try {
      const res = await fetch(`http://127.0.0.1:8000/users/${authUserId}/audio`, {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        toast.success("Set auto-saved to your Mic History Vault! 🎙️");
        if (onRecordingComplete) onRecordingComplete();
      } else {
        toast.error("Failed to save audio set.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Upload network error.");
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

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col items-center justify-between gap-3 shadow-lg">
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2">
          <span className={`w-3 h-3 rounded-full ${isRecording ? 'bg-red-500 animate-ping' : 'bg-slate-700'}`}></span>
          <span className="text-xs font-black uppercase tracking-widest text-slate-300">
            {isRecording ? 'Live Recording Set...' : 'Stage Audio Guard'}
          </span>
        </div>
        <span className="text-xs font-mono font-bold text-slate-400">
          {formatSeconds(recordingTime)}
        </span>
      </div>

      <div className="flex gap-2 w-full">
        {!isRecording ? (
          <button 
            onClick={startRecording}
            disabled={isUploading}
            className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-xl text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
          >
            <i className="fa-solid fa-circle text-red-400"></i> Manual Record
          </button>
        ) : (
          <button 
            onClick={stopAndAutoSave}
            disabled={isUploading}
            className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-2.5 rounded-xl text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2 shadow-lg shadow-red-950"
          >
            <i className="fa-solid fa-square"></i> Stop & Save Set
          </button>
        )}
      </div>

      {isUploading && (
        <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-widest animate-pulse">
          Uploading audio to MinIO Vault...
        </span>
      )}
    </div>
  );
}
