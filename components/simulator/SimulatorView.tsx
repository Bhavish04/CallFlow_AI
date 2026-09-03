'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  PhoneCall, 
  Send, 
  RotateCcw, 
  Bot, 
  User, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Calendar as CalendarIcon, 
  Layers, 
  Loader2,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  MessageSquare,
  Radio,
  Copy,
  Check,
  Ticket
} from 'lucide-react';
import { Workflow, TranscriptMessage } from '@/types/database';
import { getWorkflowActionType } from '@/lib/workflow-engine';

interface SimulatorViewProps {
  workflows: Workflow[];
}

type Mode = 'text' | 'voice';
type VoiceState = 'IDLE' | 'RECORDING' | 'TRANSCRIBING' | 'THINKING' | 'SPEAKING' | 'ERROR';

export function SimulatorView({ workflows }: SimulatorViewProps) {
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>(
    workflows.length > 0 ? workflows[0].id : ''
  );
  const [mode, setMode] = useState<Mode>('text');

  // Conversation state
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
  const [collectedData, setCollectedData] = useState<Record<string, unknown>>({});
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [priority, setPriority] = useState<string>('normal');
  const [workflowComplete, setWorkflowComplete] = useState<boolean>(false);
  const [intent, setIntent] = useState<string | null>(null);

  // Calendar State
  const [calendarStatus, setCalendarStatus] = useState<string>('IDLE');
  const [calendarEventId, setCalendarEventId] = useState<string | null>(null);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const [copiedEventId, setCopiedEventId] = useState<boolean>(false);
  const [bookingTicket, setBookingTicket] = useState<any | null>(null);

  const handleCopyEventId = () => {
    if (calendarEventId) {
      navigator.clipboard.writeText(calendarEventId);
      setCopiedEventId(true);
      setTimeout(() => setCopiedEventId(false), 2000);
    }
  };

  // Text Mode State
  const [inputMessage, setInputMessage] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [initializing, setInitializing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Voice Mode State Machine
  const [voiceState, setVoiceState] = useState<VoiceState>('IDLE');
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [ttsUnavailable, setTtsUnavailable] = useState<boolean>(false);

  // MediaRecorder & Audio refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const recordingSessionIdRef = useRef<number>(0);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [transcript, loading, voiceState]);

  const selectedWorkflow = workflows.find((w) => w.id === selectedWorkflowId);

  // START SIMULATED MISSED CALL
  async function startSimulation() {
    if (!selectedWorkflowId) return;

    try {
      setInitializing(true);
      setErrorMsg(null);
      setVoiceError(null);
      setTtsUnavailable(false);
      setConversationId(null);
      setTranscript([]);
      setCollectedData({});
      setMissingFields([]);
      setPriority('normal');
      setWorkflowComplete(false);
      setIntent(null);
      setCalendarStatus('IDLE');
      setCalendarEventId(null);
      setCalendarError(null);
      setBookingTicket(null);
      setVoiceState('IDLE');

      // Cleanup active recording/audio stream
      recordingSessionIdRef.current++;
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
        activeAudioRef.current = null;
      }
      if (mediaRecorderRef.current) {
        try {
          if (mediaRecorderRef.current.state !== 'inactive') mediaRecorderRef.current.stop();
        } catch {}
        mediaRecorderRef.current = null;
      }
      if (mediaStreamRef.current) {
        try {
          mediaStreamRef.current.getTracks().forEach((t) => t.stop());
        } catch {}
        mediaStreamRef.current = null;
      }

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflowId: selectedWorkflowId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to start simulation');
      }

      setConversationId(data.conversationId);
      setTranscript(data.transcript || []);
      setCollectedData(data.collectedData || {});
      setMissingFields(data.missingFields || []);
      setPriority(data.priority || 'normal');
      setWorkflowComplete(data.workflowComplete || false);
      setCalendarStatus(data.calendarStatus || 'IDLE');
      setCalendarEventId(data.calendarEventId || null);
      setCalendarError(data.calendarError || null);

      // If in Voice mode, automatically trigger TTS for greeting
      if (mode === 'voice' && data.reply) {
        playTtsAudio(data.reply);
      }
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : 'Error starting simulation';
      setErrorMsg(msg);
    } finally {
      setInitializing(false);
    }
  }

  // CORE AI CONVERSATION PIPELINE (Reused by both Text & Voice mode)
  async function processUserMessage(userText: string) {
    if (!userText.trim() || !conversationId) return;

    setErrorMsg(null);
    setVoiceError(null);
    setTtsUnavailable(false);

    // POST-COMPLETION SAFEGUARD: Stop further AI / Groq / Calendar processing after workflow complete
    if (workflowComplete) {
      const tempUserMsg: TranscriptMessage = {
        role: 'user',
        content: userText.trim(),
        timestamp: new Date().toISOString(),
      };

      let isHindi = /[\u0900-\u097F]/.test(userText);
      let isHinglish = false;
      if (!isHindi) {
        for (const m of transcript) {
          if (m.role === 'user' && /[\u0900-\u097F]/.test(m.content)) {
            isHindi = true;
            break;
          }
        }
      }
      if (!isHindi) {
        const lower = userText.toLowerCase();
        if (
          lower.includes('dhanyawad') ||
          lower.includes('shukriya') ||
          lower.includes('kardo') ||
          lower.includes('karni') ||
          lower.includes('hai') ||
          lower.includes('bata')
        ) {
          isHinglish = true;
        }
      }

      let ackText = "You're welcome! Your booking is confirmed.";
      if (isHindi) {
        ackText = 'आपका स्वागत है! आपकी बुकिंग कन्फर्म हो चुकी है। धन्यवाद!';
      } else if (isHinglish) {
        ackText = 'Welcome! Aapki booking confirm ho chuki hai. Dhanyawad!';
      }

      const tempAssistantMsg: TranscriptMessage = {
        role: 'assistant',
        content: ackText,
        timestamp: new Date().toISOString(),
      };

      setTranscript((prev) => [...prev, tempUserMsg, tempAssistantMsg]);
      setInputMessage('');

      if (mode === 'voice') {
        await playTtsAudio(ackText);
      } else {
        setVoiceState('IDLE');
      }
      return;
    }

    const tempUserMsg: TranscriptMessage = {
      role: 'user',
      content: userText,
      timestamp: new Date().toISOString(),
    };
    setTranscript((prev) => [...prev, tempUserMsg]);

    try {
      if (mode === 'text') setLoading(true);
      if (mode === 'voice') setVoiceState('THINKING');

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflowId: selectedWorkflowId,
          conversationId,
          message: userText,
          calendarStatus,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to get AI response');
      }

      setTranscript(data.transcript || []);
      setCollectedData(data.collectedData || {});
      setMissingFields(data.missingFields || []);
      setPriority(data.priority || 'normal');
      setWorkflowComplete(data.workflowComplete || false);
      setIntent(data.intent || null);
      setCalendarStatus(data.calendarStatus || 'IDLE');
      setCalendarEventId(data.calendarEventId || null);
      setCalendarError(data.calendarError || null);
      setBookingTicket(data.bookingTicket || null);

      // If in Voice mode, synthesize and play TTS for AI response
      if (mode === 'voice' && data.reply) {
        await playTtsAudio(data.reply);
      } else {
        setVoiceState('IDLE');
      }
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : 'Error communicating with AI';
      if (mode === 'text') setErrorMsg(msg);
      if (mode === 'voice') {
        setVoiceError(msg);
        setVoiceState('ERROR');
      }
    } finally {
      setLoading(false);
    }
  }

  // TEXT MODE SUBMIT
  function handleTextSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!inputMessage.trim() || loading || !conversationId) return;

    const userText = inputMessage.trim();
    setInputMessage('');
    processUserMessage(userText);
  }

  // VOICE MODE: PLAY TTS AUDIO (PROMISE WRAPPED & LEAK PROOF)
  async function playTtsAudio(textToSpeak: string): Promise<void> {
    try {
      setVoiceState('SPEAKING');

      const res = await fetch('/api/voice/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToSpeak }),
      });

      if (!res.ok) {
        let errData: any = {};
        try { errData = await res.json(); } catch {}
        console.warn('TTS API returned error:', errData.error || res.statusText);
        setTtsUnavailable(true);
        setVoiceError(errData.error || 'Audio output unavailable');
        setVoiceState('IDLE');
        return;
      }

      const audioBlob = await res.blob();
      if (!audioBlob || audioBlob.size === 0) {
        console.warn('TTS API returned 0-byte audio blob.');
        setTtsUnavailable(true);
        setVoiceState('IDLE');
        return;
      }

      // TTS synthesis succeeded! Clear unavailable state & voice error
      setTtsUnavailable(false);
      setVoiceError(null);

      const audioUrl = URL.createObjectURL(audioBlob);

      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
        activeAudioRef.current = null;
      }

      const audio = new Audio(audioUrl);
      activeAudioRef.current = audio;

      return new Promise<void>((resolve) => {
        let resolved = false;
        const cleanup = () => {
          if (resolved) return;
          resolved = true;
          URL.revokeObjectURL(audioUrl);
          if (activeAudioRef.current === audio) {
            activeAudioRef.current = null;
          }
          setVoiceState('IDLE');
          resolve();
        };

        audio.onended = cleanup;
        audio.onerror = (e) => {
          console.warn('TTS audio playback error:', e);
          setTtsUnavailable(true);
          cleanup();
        };

        audio.play().catch((playErr) => {
          console.warn('TTS audio.play() rejected:', playErr);
          setTtsUnavailable(true);
          cleanup();
        });
      });
    } catch (err) {
      console.warn('TTS Playback Exception:', err);
      setTtsUnavailable(true);
      setVoiceState('IDLE');
    }
  }

  // VOICE MODE: START MICROPHONE RECORDING
  async function startRecording() {
    try {
      // 1. Increment session ID to invalidate any in-flight previous recording/STT callbacks
      const currentSessionId = ++recordingSessionIdRef.current;

      // 2. Pause/cleanup active TTS audio if playing
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
        activeAudioRef.current = null;
      }

      // 3. Ensure any existing MediaRecorder is stopped & cleaned up
      if (mediaRecorderRef.current) {
        try {
          if (mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
          }
        } catch (e) {
          console.warn('Error stopping previous MediaRecorder:', e);
        }
        mediaRecorderRef.current = null;
      }

      // 4. Ensure any existing MediaStream tracks are stopped
      if (mediaStreamRef.current) {
        try {
          mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        } catch (e) {
          console.warn('Error stopping previous MediaStream:', e);
        }
        mediaStreamRef.current = null;
      }

      setVoiceError(null);
      setTtsUnavailable(false);

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Microphone recording is not supported in this browser.');
      }

      // 5. Request a fresh audio stream with noise suppression & echo cancellation
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      mediaStreamRef.current = stream;

      // 6. Select best supported MIME type
      let selectedMimeType = 'audio/webm';
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported) {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          selectedMimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/webm')) {
          selectedMimeType = 'audio/webm';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          selectedMimeType = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
          selectedMimeType = 'audio/ogg;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
          selectedMimeType = 'audio/ogg';
        }
      }

      const recorder = new MediaRecorder(stream, { mimeType: selectedMimeType });
      mediaRecorderRef.current = recorder;

      // 7. Dedicated per-session chunks array bound to this specific recording session (0% risk of cross-turn leak)
      const sessionChunks: Blob[] = [];

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          sessionChunks.push(event.data);
        }
      };

      recorder.onstop = async () => {
        // Stop stream tracks cleanly
        try {
          stream.getTracks().forEach((track) => track.stop());
        } catch (e) {
          console.warn('Error stopping stream tracks in onstop:', e);
        }
        if (mediaStreamRef.current === stream) {
          mediaStreamRef.current = null;
        }
        if (mediaRecorderRef.current === recorder) {
          mediaRecorderRef.current = null;
        }

        // Check race condition: if session is stale, ignore
        if (currentSessionId !== recordingSessionIdRef.current) {
          console.warn(`[Voice Simulator] Discarding stopped recorder from stale session #${currentSessionId}`);
          return;
        }

        const actualMimeType = recorder.mimeType || selectedMimeType;
        const audioBlob = new Blob(sessionChunks, { type: actualMimeType });

        console.log(
          `[Voice Simulator Session #${currentSessionId}] Recording finished: size=${audioBlob.size} bytes, type=${actualMimeType}, chunks=${sessionChunks.length}`
        );

        if (audioBlob.size < 500) {
          console.warn(`[Voice Simulator Session #${currentSessionId}] Audio recording too small (${audioBlob.size} bytes).`);
          setVoiceError('Audio recording was too short or empty. Please speak clearly into the microphone.');
          setVoiceState('ERROR');
          return;
        }

        await processVoiceRecording(audioBlob, actualMimeType, currentSessionId);
      };

      // Start recording without timeslice so MediaRecorder produces a unified, header-intact WebM stream
      recorder.start();
      setVoiceState('RECORDING');
    } catch (err: unknown) {
      console.error('Microphone Error:', err);
      const msg =
        err instanceof Error
          ? err.message
          : 'Microphone permission denied or recording failed.';
      setVoiceError(msg);
      setVoiceState('ERROR');
    }
  }

  // VOICE MODE: STOP MICROPHONE RECORDING
  function stopRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.warn('Error stopping MediaRecorder:', e);
      }
      setVoiceState('TRANSCRIBING');
    }
  }

  // VOICE MODE: TRANSCRIBE & EXECUTE ENGINE
  async function processVoiceRecording(audioBlob: Blob, mimeType: string, sessionId: number) {
    try {
      if (sessionId !== recordingSessionIdRef.current) {
        console.warn(`[Voice Simulator] Discarding transcribe request for stale session #${sessionId}`);
        return;
      }

      setVoiceState('TRANSCRIBING');

      // Determine established conversation language from transcript history
      let establishedLang: string | undefined = undefined;
      const userHistoryMsgs = transcript.filter((m) => m.role === 'user');
      for (let i = userHistoryMsgs.length - 1; i >= 0; i--) {
        const text = userHistoryMsgs[i].content;
        if (/[\u0900-\u097F]/.test(text)) {
          establishedLang = 'hi';
          break;
        }
        const lower = text.toLowerCase();
        if (lower.includes('mujhe') || lower.includes('karni') || lower.includes('bata') || lower.includes('chahiye')) {
          establishedLang = 'hinglish';
          break;
        }
      }

      const transcribeUrl = establishedLang
        ? `/api/voice/transcribe?lang=${encodeURIComponent(establishedLang)}`
        : '/api/voice/transcribe';

      const res = await fetch(transcribeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': mimeType,
        },
        body: audioBlob,
      });

      if (sessionId !== recordingSessionIdRef.current) {
        console.warn(`[Voice Simulator] Discarding transcribe response for stale session #${sessionId}`);
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'STT transcription failed.');
      }

      const userText = data.transcript;
      console.log(
        `[Voice Simulator Session #${sessionId}] STT Result: "${userText}" (Language: ${data.language || 'en'}, Confidence: ${data.confidence ?? 'N/A'}, Retried: ${data.sttRetried || false})`
      );

      if (!userText || !userText.trim()) {
        throw new Error('Could not understand speech. Please try speaking again.');
      }

      await processUserMessage(userText.trim());
    } catch (err: unknown) {
      if (sessionId !== recordingSessionIdRef.current) return;
      console.error('Voice Processing Error:', err);
      const msg = err instanceof Error ? err.message : 'Voice transcription failed';
      setVoiceError(msg);
      setVoiceState('ERROR');
    }
  }

  if (workflows.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center space-y-4 max-w-xl mx-auto shadow-xs">
        <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900">No active workflows available</h3>
        <p className="text-xs text-slate-500">
          Please create at least one active workflow in the Workflow Builder before running the AI Simulator.
        </p>
        <a
          href="/workflows/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold"
        >
          Create Workflow &rarr;
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* TOP CONFIGURATION & MODE SELECTOR BAR */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <PhoneCall className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">
              Select Active Workflow
            </label>
            <select
              value={selectedWorkflowId}
              onChange={(e) => setSelectedWorkflowId(e.target.value)}
              disabled={Boolean(conversationId) || initializing}
              className="w-full max-w-md px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {workflows.map((wf) => (
                <option key={wf.id} value={wf.id}>
                  {wf.name} ({wf.questions ? wf.questions.length : 0} fields)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* MODE SELECTOR (TEXT | VOICE) & SIMULATE BUTTON */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Mode Toggle */}
          <div className="bg-slate-100 p-1 rounded-lg flex items-center border border-slate-200">
            <button
              onClick={() => {
                setMode('text');
                setTtsUnavailable(false);
                setVoiceError(null);
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors flex items-center gap-1.5 ${
                mode === 'text'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Text</span>
            </button>
            <button
              onClick={() => {
                setMode('voice');
                setTtsUnavailable(false);
                setVoiceError(null);
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors flex items-center gap-1.5 ${
                mode === 'voice'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Voice (Hindi/EN)</span>
            </button>
          </div>

          {!conversationId ? (
            <button
              onClick={startSimulation}
              disabled={initializing || !selectedWorkflowId}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-semibold rounded-lg shadow-xs transition-colors"
            >
              {initializing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <PhoneCall className="w-4 h-4" />
                  <span>Simulate Missed Call</span>
                </>
              )}
            </button>
          ) : (
            <button
              onClick={startSimulation}
              disabled={initializing}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors border border-slate-200"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restart Call</span>
            </button>
          )}
        </div>
      </div>

      {/* ERROR ALERT BANNERS */}
      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2.5 shadow-xs">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold block">Simulation Error</span>
            <span>{errorMsg}</span>
          </div>
        </div>
      )}

      {voiceError && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2.5 shadow-xs">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold block">Voice Service Notice</span>
            <span>{voiceError}</span>
          </div>
        </div>
      )}

      {/* MAIN LAYOUT: CHAT/VOICE (LEFT) + LIVE WORKFLOW & CALENDAR STATE (RIGHT) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* CHAT/VOICE INTERFACE PANEL (7 COLS) */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col min-h-[540px] max-h-[660px]">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-xl">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-slate-800">
                {conversationId
                  ? mode === 'voice'
                    ? 'Voice AI Call Simulation Active (Hindi / English)'
                    : 'Text AI Call Simulation Active'
                  : 'Waiting to start...'}
              </span>
            </div>
            {selectedWorkflow && (
              <span className="text-[11px] text-slate-500 font-medium bg-white px-2 py-0.5 rounded border border-slate-200">
                {selectedWorkflow.name}
              </span>
            )}
          </div>

          {/* TRANSCRIPT AREA */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/30">
            {!conversationId ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3">
                <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                  {mode === 'voice' ? <Mic className="w-6 h-6" /> : <Sparkles className="w-6 h-6" />}
                </div>
                <h4 className="text-sm font-bold text-slate-800">
                  Ready for {mode === 'voice' ? 'Voice AI Pipeline' : 'Text AI Engine'}
                </h4>
                <p className="text-xs text-slate-500 max-w-xs">
                  {mode === 'voice'
                    ? 'Click "Simulate Missed Call" above to test real-time Speech-to-Text (Deepgram) & Text-to-Speech (ElevenLabs) with Hindi/Hinglish support.'
                    : 'Click "Simulate Missed Call" above to start an automated callback with real-time field extraction and Google Calendar tool calling.'}
                </p>
              </div>
            ) : (
              <>
                {transcript.map((msg, index) => {
                  const isAssistant = msg.role === 'assistant';
                  return (
                    <div
                      key={index}
                      className={`flex gap-3 ${isAssistant ? 'justify-start' : 'justify-end'}`}
                    >
                      {isAssistant && (
                        <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 text-xs shadow-xs">
                          <Bot className="w-4 h-4" />
                        </div>
                      )}

                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed ${
                          isAssistant
                            ? 'bg-white border border-slate-200 text-slate-800 shadow-xs rounded-tl-xs'
                            : 'bg-blue-600 text-white shadow-xs rounded-tr-xs font-medium'
                        }`}
                      >
                        <p>{msg.content}</p>
                        {msg.timestamp && (
                          <span
                            className={`text-[9px] block mt-1 ${
                              isAssistant ? 'text-slate-400' : 'text-blue-100'
                            }`}
                          >
                            {new Date(msg.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        )}
                      </div>

                      {!isAssistant && (
                        <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center shrink-0 text-xs shadow-xs">
                          <User className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  );
                })}

                {loading && mode === 'text' && (
                  <div className="flex gap-3 justify-start">
                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-xs px-4 py-3 text-xs text-slate-500 flex items-center gap-2 shadow-xs">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                      <span>AI Engine is processing message & checking tools...</span>
                    </div>
                  </div>
                )}

                <div ref={chatBottomRef} />
              </>
            )}
          </div>

          {/* INPUT CONTROLS: TEXT FORM vs VOICE STATE MACHINE */}
          <div className="p-4 border-t border-slate-200 bg-white rounded-b-xl">
            {mode === 'text' ? (
              /* TEXT MODE INPUT FORM */
              <form onSubmit={handleTextSubmit} className="flex items-center gap-2">
                <input
                  type="text"
                  disabled={!conversationId || loading || workflowComplete}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder={
                    !conversationId
                      ? 'Start simulation above...'
                      : workflowComplete
                      ? 'Workflow completed!'
                      : 'Type message (e.g. "I am Rahul, appointment tomorrow at 4 PM" or "Yes, confirm it")...'
                  }
                  className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={!conversationId || loading || !inputMessage.trim() || workflowComplete}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </form>
            ) : (
              /* VOICE MODE CONTROLS & STATE MACHINE */
              <div className="space-y-3">
                {/* Voice Status Indicator Banner */}
                <div className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                  <div className="flex items-center gap-2">
                    {voiceState === 'RECORDING' && <Radio className="w-4 h-4 text-red-600 animate-pulse" />}
                    {voiceState === 'TRANSCRIBING' && <Loader2 className="w-4 h-4 text-amber-600 animate-spin" />}
                    {voiceState === 'THINKING' && <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />}
                    {voiceState === 'SPEAKING' && <Volume2 className="w-4 h-4 text-indigo-600 animate-bounce" />}
                    {voiceState === 'IDLE' && <Mic className="w-4 h-4 text-slate-500" />}
                    {voiceState === 'ERROR' && <AlertCircle className="w-4 h-4 text-red-600" />}

                    <span className="font-semibold text-slate-800">
                      {voiceState === 'IDLE' && 'Tap microphone to speak (English / Hindi)'}
                      {voiceState === 'RECORDING' && 'Listening... Speak clearly into mic'}
                      {voiceState === 'TRANSCRIBING' && 'Transcribing speech via Deepgram STT...'}
                      {voiceState === 'THINKING' && 'AI engine checking workflow parameters...'}
                      {voiceState === 'SPEAKING' && 'Playing audio response via ElevenLabs TTS...'}
                      {voiceState === 'ERROR' && (voiceError || 'Voice error occurred')}
                    </span>
                  </div>

                  {ttsUnavailable && (
                    <span className="text-[10px] text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1">
                      <VolumeX className="w-3 h-3" /> Audio Unavailable (Text Fallback)
                    </span>
                  )}
                </div>

                {/* Microphone Button Controls */}
                <div className="flex items-center justify-center gap-4">
                  {voiceState === 'IDLE' || voiceState === 'ERROR' ? (
                    <button
                      onClick={startRecording}
                      disabled={!conversationId || workflowComplete}
                      aria-label="Start speaking"
                      className="w-16 h-16 rounded-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white flex items-center justify-center shadow-lg transition-transform active:scale-95 focus:outline-none focus:ring-4 focus:ring-indigo-300"
                    >
                      <Mic className="w-7 h-7" />
                    </button>
                  ) : voiceState === 'RECORDING' ? (
                    <button
                      onClick={stopRecording}
                      aria-label="Stop recording"
                      className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-lg animate-pulse focus:outline-none focus:ring-4 focus:ring-red-300"
                    >
                      <MicOff className="w-7 h-7" />
                    </button>
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center border border-slate-200">
                      <Loader2 className="w-7 h-7 animate-spin text-indigo-600" />
                    </div>
                  )}
                </div>

                <div className="text-center text-[10px] text-slate-400 font-medium">
                  {voiceState === 'RECORDING' ? 'Click red button when done speaking' : 'Supports English & Hindi/Hinglish callbacks'}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* LIVE WORKFLOW & CALENDAR TOOL STATE PANEL (5 COLS) */}
        <div className="lg:col-span-5 space-y-4">
          {/* 1. Workflow Extraction State */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-600" />
                <span>Live State & Extraction</span>
              </h3>
              <span
                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                  workflowComplete
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : conversationId
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'bg-slate-100 text-slate-500 border-slate-200'
                }`}
              >
                {workflowComplete ? 'COMPLETE' : conversationId ? 'IN PROGRESS' : 'IDLE'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 space-y-0.5">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Priority</span>
                <span
                  className={`font-bold inline-block px-2 py-0.5 rounded text-[11px] ${
                    priority === 'urgent'
                      ? 'bg-red-100 text-red-700 border border-red-200'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {priority.toUpperCase()}
                </span>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 space-y-0.5">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Detected Intent</span>
                <span className="font-semibold text-slate-800 truncate block">
                  {intent || 'Pending...'}
                </span>
              </div>
            </div>

            <div>
              <span className="block text-[11px] font-semibold text-slate-600 mb-1.5 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Collected Parameters (`collected_data`)
              </span>

              {Object.keys(collectedData).length === 0 ? (
                <div className="p-3 bg-slate-50 rounded-lg text-center text-[11px] text-slate-400 italic">
                  No fields extracted yet
                </div>
              ) : (
                <div className="bg-slate-50 rounded-lg border border-slate-200 divide-y divide-slate-100 text-xs overflow-hidden">
                  {Object.entries(collectedData).map(([k, v]) => (
                    <div key={k} className="p-2 flex items-center justify-between">
                      <span className="font-mono font-medium text-slate-600 text-[11px]">{k}</span>
                      <span className="font-bold text-slate-900 truncate max-w-[140px]">{String(v)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <span className="block text-[11px] font-semibold text-slate-600 mb-1.5 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-600" /> Remaining Missing Required Fields
              </span>

              {missingFields.length === 0 ? (
                <div className="p-2.5 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-semibold border border-emerald-200 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>All required workflow fields collected!</span>
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {missingFields.map((f) => (
                    <span
                      key={f}
                      className="px-2.5 py-1 bg-amber-50 text-amber-800 font-mono text-[11px] font-semibold rounded border border-amber-200"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 2. GOOGLE CALENDAR TOOL CALLING INTEGRATION PANEL */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-indigo-600" />
                <span>Google Calendar Tool Status</span>
              </h3>
              <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Server-side OAuth
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Status:</span>
                <span
                  className={`font-bold px-2.5 py-0.5 rounded text-[11px] uppercase tracking-wide border ${
                    calendarStatus === 'EVENT_CREATED'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : calendarStatus === 'AWAITING_CONFIRMATION'
                      ? 'bg-indigo-100 text-indigo-800 border-indigo-300'
                      : calendarStatus === 'AVAILABLE'
                      ? 'bg-blue-100 text-blue-800 border-blue-300'
                      : calendarStatus === 'UNAVAILABLE'
                      ? 'bg-red-100 text-red-800 border-red-300'
                      : calendarStatus === 'ERROR'
                      ? 'bg-red-50 text-red-700 border-red-200'
                      : 'bg-slate-200 text-slate-600 border-slate-300'
                  }`}
                >
                  {calendarStatus.replace('_', ' ')}
                </span>
              </div>

              {calendarEventId && (
                <div className="pt-2.5 border-t border-slate-200 space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-500">Calendar Event ID:</span>
                    <button
                      type="button"
                      onClick={handleCopyEventId}
                      className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-semibold rounded border border-indigo-200 transition-colors flex items-center gap-1 shrink-0"
                    >
                      {copiedEventId ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedEventId ? 'Copied!' : 'Copy ID'}</span>
                    </button>
                  </div>
                  <span className="font-bold text-indigo-900 bg-slate-100 px-2 py-1 rounded border border-slate-200 font-mono text-[11px] block truncate select-all">
                    {calendarEventId}
                  </span>
                </div>
              )}

              {calendarError && (
                <div className="pt-2 border-t border-red-200 text-[11px] text-red-700 flex items-start gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{calendarError}</span>
                </div>
              )}
            </div>
          </div>

          {/* 3. CONFIRMED EVENT BOOKING TICKET (STRICTLY GATED TO WORKFLOW COMPLETE + EVENT CREATED) */}
          {workflowComplete && Boolean(calendarEventId) && (
            <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-xl border border-indigo-500/40 p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-indigo-500/20">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/30">
                    <Ticket className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">Official Event Ticket</h4>
                    <span className="text-xs font-mono font-extrabold text-white">
                      {bookingTicket?.ticketId || `TCK-${calendarEventId?.slice(-8).toUpperCase()}`}
                    </span>
                  </div>
                </div>
                <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 font-extrabold text-[10px] rounded-full border border-emerald-500/40 uppercase tracking-widest flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> CONFIRMED
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-white/5 p-2.5 rounded-lg border border-white/10 space-y-0.5">
                  <span className="text-[10px] text-slate-400 font-medium block">Customer</span>
                  <span className="font-bold text-slate-100 truncate block">
                    {String(collectedData.customer_name || collectedData.name || 'Customer')}
                  </span>
                </div>

                <div className="bg-white/5 p-2.5 rounded-lg border border-white/10 space-y-0.5">
                  <span className="text-[10px] text-slate-400 font-medium block">Workflow</span>
                  <span className="font-bold text-slate-100 truncate block">
                    {selectedWorkflow?.name || 'Booking'}
                  </span>
                </div>

                <div className="bg-white/5 p-2.5 rounded-lg border border-white/10 space-y-0.5">
                  <span className="text-[10px] text-slate-400 font-medium block">Date</span>
                  <span className="font-bold text-indigo-300 truncate block font-mono">
                    {String(collectedData.date || 'N/A')}
                  </span>
                </div>

                <div className="bg-white/5 p-2.5 rounded-lg border border-white/10 space-y-0.5">
                  <span className="text-[10px] text-slate-400 font-medium block">Time</span>
                  <span className="font-bold text-indigo-300 truncate block font-mono">
                    {String(collectedData.time || 'N/A')}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-indigo-500/20 flex items-center justify-between text-[10px] text-slate-400">
                <span className="font-mono truncate max-w-[190px]">Cal Event: {calendarEventId}</span>
                <span className="font-semibold text-emerald-400 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Idempotent
                </span>
              </div>
            </div>
          )}

          {/* 3. WORKFLOW COMPLETION PROGRESS CHECKLIST */}
          {(workflowComplete || calendarStatus === 'EVENT_CREATED' || Object.keys(collectedData).length > 0) && (
            <div className="bg-emerald-50/90 rounded-xl border border-emerald-200 p-4 space-y-3 shadow-xs">
              <div className="flex items-center justify-between pb-2 border-b border-emerald-200/80">
                <h4 className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Workflow Progress Checklist</span>
                </h4>
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded border ${
                  workflowComplete
                    ? 'bg-emerald-600 text-white border-emerald-700'
                    : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                }`}>
                  {workflowComplete ? 'WORKFLOW COMPLETED' : 'IN PROGRESS'}
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-emerald-950">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${collectedData.customer_name || collectedData.patient_name || collectedData.name ? 'text-emerald-600' : 'text-slate-300'}`} />
                  <span>Customer details ({String(collectedData.customer_name || collectedData.patient_name || collectedData.name || 'Collecting...')})</span>
                </div>

                <div className="flex items-center gap-2">
                  <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${missingFields.length === 0 ? 'text-emerald-600' : 'text-slate-300'}`} />
                  <span>Required information collected</span>
                </div>

                {getWorkflowActionType(selectedWorkflow) === 'google_calendar' && (
                  <>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${['AVAILABLE', 'AWAITING_CONFIRMATION', 'EVENT_CREATED'].includes(calendarStatus) ? 'text-emerald-600' : 'text-slate-300'}`} />
                      <span>Calendar availability checked</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${calendarStatus === 'EVENT_CREATED' ? 'text-emerald-600' : 'text-slate-300'}`} />
                      <span>Appointment confirmed</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${Boolean(calendarEventId) ? 'text-emerald-600' : 'text-slate-300'}`} />
                      <span>Calendar event created</span>
                    </div>
                  </>
                )}

                <div className="flex items-center gap-2 font-semibold">
                  <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${workflowComplete ? 'text-emerald-600 font-bold' : 'text-slate-300'}`} />
                  <span>Workflow completed</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
