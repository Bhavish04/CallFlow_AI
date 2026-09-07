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
  PhoneOff,
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

// Resilient fetch wrapper with explicit timeout protection
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 12000
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return res;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error(`Request to ${url} timed out after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

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

  // Synchronization refs to prevent React state closure staleness across async cycles
  const conversationIdRef = useRef<string | null>(null);
  const selectedWorkflowIdRef = useRef<string>(workflows.length > 0 ? workflows[0].id : '');
  const calendarStatusRef = useRef<string>('IDLE');
  const transcriptRef = useRef<TranscriptMessage[]>([]);
  const isStartingRecordingRef = useRef<boolean>(false);

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

  // Voice Mode State Machine & Phone-Call Session State
  const [voiceSessionActive, setVoiceSessionActive] = useState<boolean>(false);
  const voiceSessionActiveRef = useRef<boolean>(false);
  const workflowCompleteRef = useRef<boolean>(false);

  const [voiceState, setVoiceState] = useState<VoiceState>('IDLE');
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [ttsUnavailable, setTtsUnavailable] = useState<boolean>(false);

  // MediaRecorder & Audio refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const recordingSessionIdRef = useRef<number>(0);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Web Audio VAD & Silence Detection Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const vadRafIdRef = useRef<number | null>(null);
  const speechStartedRef = useRef<boolean>(false);
  const speechStartTimeRef = useRef<number | null>(null);
  const silenceStartTimeRef = useRef<number | null>(null);
  const isListeningStoppingRef = useRef<boolean>(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState<boolean>(false);

  // Calibrated VAD parameters for natural phone-call turn-taking
  const VAD_SPEECH_RMS_THRESHOLD = 0.024; // Threshold indicating speech above room noise
  const VAD_SILENCE_DURATION_MS = 1400; // 1.4s natural pause before concluding turn
  const VAD_MIN_SPEECH_DURATION_MS = 350; // Minimum speech duration to prevent click/cough misfires
  const VAD_MAX_TURN_DURATION_MS = 25000; // Safeguard: max 25s per single turn

  useEffect(() => {
    conversationIdRef.current = conversationId;
  }, [conversationId]);

  useEffect(() => {
    selectedWorkflowIdRef.current = selectedWorkflowId;
  }, [selectedWorkflowId]);

  useEffect(() => {
    calendarStatusRef.current = calendarStatus;
  }, [calendarStatus]);

  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [transcript, loading, voiceState]);

  const selectedWorkflow = workflows.find((w) => w.id === selectedWorkflowId);

  // Helper to keep state and ref in sync
  function updateVoiceSessionActive(active: boolean) {
    voiceSessionActiveRef.current = active;
    setVoiceSessionActive(active);
  }

  // TERMINATE ENTIRE VOICE SESSION (End Call)
  function endVoiceSession() {
    voiceSessionActiveRef.current = false;
    setVoiceSessionActive(false);
    setIsUserSpeaking(false);
    speechStartedRef.current = false;
    speechStartTimeRef.current = null;
    silenceStartTimeRef.current = null;
    isListeningStoppingRef.current = false;
    isStartingRecordingRef.current = false;

    // Invalidate any in-flight asynchronous operations, STT, or TTS callbacks
    recordingSessionIdRef.current++;

    // Cancel VAD animation frame loop
    if (vadRafIdRef.current) {
      cancelAnimationFrame(vadRafIdRef.current);
      vadRafIdRef.current = null;
    }

    // Disconnect & close AudioContext
    if (audioContextRef.current) {
      try {
        if (audioContextRef.current.state !== 'closed') {
          audioContextRef.current.close();
        }
      } catch (e) {
        console.warn('Error closing AudioContext on endVoiceSession:', e);
      }
      audioContextRef.current = null;
    }
    analyserRef.current = null;

    // Stop and cleanup active TTS audio
    if (activeAudioRef.current) {
      try {
        activeAudioRef.current.pause();
        activeAudioRef.current.currentTime = 0;
      } catch (e) {
        console.warn('Error pausing active audio on endVoiceSession:', e);
      }
      activeAudioRef.current = null;
    }

    // Cancel any browser SpeechSynthesis in flight
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}
    }

    // Stop and cleanup MediaRecorder
    if (mediaRecorderRef.current) {
      try {
        if (mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }
      } catch (e) {
        console.warn('Error stopping MediaRecorder on endVoiceSession:', e);
      }
      mediaRecorderRef.current = null;
    }

    // Clean up and stop all microphone stream tracks
    if (mediaStreamRef.current) {
      try {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      } catch (e) {
        console.warn('Error stopping stream tracks on endVoiceSession:', e);
      }
      mediaStreamRef.current = null;
    }

    setVoiceState('IDLE');
  }

  // START SIMULATED MISSED CALL
  async function startSimulation(autoStartVoice = false) {
    if (!selectedWorkflowId) return;

    // Cleanly terminate any active voice session
    endVoiceSession();

    try {
      setInitializing(true);
      setErrorMsg(null);
      setVoiceError(null);
      setTtsUnavailable(false);
      setConversationId(null);
      conversationIdRef.current = null;
      setTranscript([]);
      transcriptRef.current = [];
      setCollectedData({});
      setMissingFields([]);
      setPriority('normal');
      setWorkflowComplete(false);
      workflowCompleteRef.current = false;
      setIntent(null);
      setCalendarStatus('IDLE');
      calendarStatusRef.current = 'IDLE';
      setCalendarEventId(null);
      setCalendarError(null);
      setBookingTicket(null);
      setVoiceState('IDLE');

      const res = await fetchWithTimeout('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflowId: selectedWorkflowId,
        }),
      }, 15000);

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to start simulation');
      }

      setConversationId(data.conversationId);
      conversationIdRef.current = data.conversationId;
      setTranscript(data.transcript || []);
      transcriptRef.current = data.transcript || [];
      setCollectedData(data.collectedData || {});
      setMissingFields(data.missingFields || []);
      setPriority(data.priority || 'normal');
      setWorkflowComplete(data.workflowComplete || false);
      workflowCompleteRef.current = Boolean(data.workflowComplete);
      setCalendarStatus(data.calendarStatus || 'IDLE');
      calendarStatusRef.current = data.calendarStatus || 'IDLE';
      setCalendarEventId(data.calendarEventId || null);
      setCalendarError(data.calendarError || null);

      const shouldStartVoice = mode === 'voice' || autoStartVoice;
      if (shouldStartVoice) {
        if (autoStartVoice && mode !== 'voice') {
          setMode('voice');
        }
        updateVoiceSessionActive(true);
        if (data.reply) {
          await playTtsAudio(data.reply);
        } else if (!data.workflowComplete) {
          console.log('[VOICE] restarting listener');
          await startRecording();
        }
      }
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : 'Error starting simulation';
      setErrorMsg(msg);
    } finally {
      setInitializing(false);
    }
  }

  // START CONTINUOUS VOICE CALL (Initiated by single mic click)
  async function startVoiceCall() {
    if (voiceSessionActiveRef.current) return;

    const currentConvId = conversationIdRef.current || conversationId;
    if (!currentConvId) {
      await startSimulation(true);
      return;
    }

    updateVoiceSessionActive(true);
    setVoiceError(null);
    setTtsUnavailable(false);

    if (!workflowCompleteRef.current) {
      console.log('[VOICE] restarting listener');
      await startRecording();
    }
  }

  // CORE AI CONVERSATION PIPELINE (Reused by both Text & Voice mode)
  async function processUserMessage(userText: string, sessionId?: number) {
    const currentConvId = conversationIdRef.current || conversationId;
    if (!userText.trim()) return;

    if (!currentConvId) {
      console.error('[VOICE] processUserMessage called without valid conversationId');
      if (mode === 'voice') {
        setVoiceError('Call session not initialized. Reconnecting...');
        if (voiceSessionActiveRef.current && !workflowCompleteRef.current) {
          console.log('[VOICE] restarting listener');
          setTimeout(() => {
            if (voiceSessionActiveRef.current && !workflowCompleteRef.current) {
              startRecording();
            }
          }, 1000);
        }
      }
      return;
    }

    if (sessionId !== undefined && (sessionId !== recordingSessionIdRef.current || !voiceSessionActiveRef.current)) {
      console.warn(`[VOICE] Discarding processUserMessage for stale/inactive session #${sessionId}`);
      return;
    }

    setErrorMsg(null);
    setVoiceError(null);
    setTtsUnavailable(false);

    // POST-COMPLETION SAFEGUARD: Stop further AI / Groq / Calendar processing after workflow complete
    if (workflowCompleteRef.current) {
      const tempUserMsg: TranscriptMessage = {
        role: 'user',
        content: userText.trim(),
        timestamp: new Date().toISOString(),
      };

      let isHindi = /[\u0900-\u097F]/.test(userText);
      let isHinglish = false;
      const history = transcriptRef.current.length > 0 ? transcriptRef.current : transcript;
      if (!isHindi) {
        for (const m of history) {
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

      setTranscript((prev) => {
        const next = [...prev, tempUserMsg, tempAssistantMsg];
        transcriptRef.current = next;
        return next;
      });
      setInputMessage('');

      if (mode === 'voice' && voiceSessionActiveRef.current) {
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
    setTranscript((prev) => {
      const next = [...prev, tempUserMsg];
      transcriptRef.current = next;
      return next;
    });

    try {
      if (mode === 'text') setLoading(true);
      if (mode === 'voice') setVoiceState('THINKING');

      console.log('[VOICE] AI request started');

      const res = await fetchWithTimeout('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflowId: selectedWorkflowIdRef.current || selectedWorkflowId,
          conversationId: currentConvId,
          message: userText,
          calendarStatus: calendarStatusRef.current || calendarStatus,
        }),
      }, 15000);

      console.log('[VOICE] AI response received');

      if (sessionId !== undefined && (sessionId !== recordingSessionIdRef.current || !voiceSessionActiveRef.current)) {
        console.warn(`[VOICE] Discarding AI response for stale/inactive session #${sessionId}`);
        return;
      }

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `Failed to get AI response (status ${res.status})`);
      }

      setTranscript(data.transcript || []);
      transcriptRef.current = data.transcript || [];
      setCollectedData(data.collectedData || {});
      setMissingFields(data.missingFields || []);
      setPriority(data.priority || 'normal');
      setWorkflowComplete(data.workflowComplete || false);
      workflowCompleteRef.current = Boolean(data.workflowComplete);
      setIntent(data.intent || null);
      setCalendarStatus(data.calendarStatus || 'IDLE');
      calendarStatusRef.current = data.calendarStatus || 'IDLE';
      setCalendarEventId(data.calendarEventId || null);
      setCalendarError(data.calendarError || null);
      setBookingTicket(data.bookingTicket || null);

      // If in Voice mode, synthesize and play TTS for AI response
      if (mode === 'voice' && voiceSessionActiveRef.current) {
        if (data.reply) {
          await playTtsAudio(data.reply);
        } else if (!data.workflowComplete) {
          console.log('[VOICE] restarting listener');
          await startRecording();
        } else {
          endVoiceSession();
        }
      } else {
        setVoiceState('IDLE');
      }
    } catch (err: unknown) {
      console.error('[VOICE] AI request error:', err);
      const msg = err instanceof Error ? err.message : 'Error communicating with AI';
      if (mode === 'text') setErrorMsg(msg);
      if (mode === 'voice') {
        setVoiceError(`${msg}. Resuming call...`);
        setVoiceState('IDLE');
        // Recoverable AI communication error: if call session is active and not complete, allow speaking again after a pause
        if (voiceSessionActiveRef.current && !workflowCompleteRef.current) {
          setTimeout(() => {
            if (voiceSessionActiveRef.current && (sessionId === undefined || sessionId === recordingSessionIdRef.current) && !workflowCompleteRef.current) {
              console.log('[VOICE] restarting listener');
              startRecording();
            }
          }, 1500);
        }
      }
    } finally {
      setLoading(false);
    }
  }

  // TEXT MODE SUBMIT
  function handleTextSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const currentConvId = conversationIdRef.current || conversationId;
    if (!inputMessage.trim() || loading || !currentConvId) return;

    const userText = inputMessage.trim();
    setInputMessage('');
    processUserMessage(userText);
  }

  // VOICE MODE: PLAY TTS AUDIO (PROMISE WRAPPED, LEAK-PROOF, STRICT MICROPHONE ISOLATION)
  async function playTtsAudio(textToSpeak: string): Promise<void> {
    const sessionId = recordingSessionIdRef.current;

    try {
      setVoiceState('SPEAKING');
      console.log('[VOICE] TTS request started');

      const res = await fetchWithTimeout('/api/voice/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToSpeak }),
      }, 12000);

      console.log('[VOICE] TTS response received');

      // If call session was terminated while awaiting TTS response, abort immediately
      if (sessionId !== recordingSessionIdRef.current || !voiceSessionActiveRef.current) {
        setVoiceState('IDLE');
        return;
      }

      if (!res.ok) {
        let errData: any = {};
        try { errData = await res.json(); } catch {}
        console.warn('[VOICE] TTS API returned error:', errData.error || res.statusText);
        setTtsUnavailable(true);
        setVoiceError(errData.error || `Audio output unavailable (status ${res.status})`);
        
        if (voiceSessionActiveRef.current) {
          // If browser SpeechSynthesis is supported, speak the response aloud as seamless fallback
          if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            return new Promise<void>((resolve) => {
              let resolved = false;
              const cleanup = (shouldAutoRecord: boolean) => {
                if (resolved) return;
                resolved = true;
                if (sessionId !== recordingSessionIdRef.current || !voiceSessionActiveRef.current) {
                  setVoiceState('IDLE');
                  resolve();
                  return;
                }
                if (workflowCompleteRef.current) {
                  endVoiceSession();
                  resolve();
                  return;
                }
                if (shouldAutoRecord) {
                  console.log('[VOICE] restarting listener');
                  startRecording();
                } else {
                  setVoiceState('IDLE');
                }
                resolve();
              };

              try {
                const utterance = new SpeechSynthesisUtterance(textToSpeak);
                const isHindi = /[\u0900-\u097F]/.test(textToSpeak);
                utterance.lang = isHindi ? 'hi-IN' : 'en-US';
                utterance.rate = 1.0;

                utterance.onstart = () => {
                  console.log('[VOICE] audio playback started');
                };
                utterance.onend = () => {
                  console.log('[VOICE] audio playback ended');
                  cleanup(true);
                };
                utterance.onerror = () => {
                  cleanup(true);
                };
                window.speechSynthesis.speak(utterance);
              } catch {
                cleanup(true);
              }
            });
          } else {
            if (workflowCompleteRef.current) {
              endVoiceSession();
            } else {
              console.log('[VOICE] restarting listener');
              setTimeout(() => {
                if (voiceSessionActiveRef.current && sessionId === recordingSessionIdRef.current && !workflowCompleteRef.current) {
                  startRecording();
                }
              }, 1500);
            }
          }
        } else {
          setVoiceState('IDLE');
        }
        return;
      }

      const audioBlob = await res.blob();
      if (!audioBlob || audioBlob.size === 0) {
        console.warn('[VOICE] TTS API returned 0-byte audio blob.');
        setTtsUnavailable(true);
        if (voiceSessionActiveRef.current) {
          if (workflowCompleteRef.current) {
            endVoiceSession();
          } else {
            console.log('[VOICE] restarting listener');
            setTimeout(() => {
              if (voiceSessionActiveRef.current && sessionId === recordingSessionIdRef.current && !workflowCompleteRef.current) {
                startRecording();
              }
            }, 1500);
          }
        } else {
          setVoiceState('IDLE');
        }
        return;
      }

      // Check race condition before playing
      if (sessionId !== recordingSessionIdRef.current || !voiceSessionActiveRef.current) {
        setVoiceState('IDLE');
        return;
      }

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

        const cleanup = (shouldAutoRecord: boolean) => {
          if (resolved) return;
          resolved = true;
          URL.revokeObjectURL(audioUrl);
          if (activeAudioRef.current === audio) {
            activeAudioRef.current = null;
          }

          // Check if session was ended while audio was speaking
          if (sessionId !== recordingSessionIdRef.current || !voiceSessionActiveRef.current) {
            setVoiceState('IDLE');
            resolve();
            return;
          }

          // If workflow completed, end the session cleanly without recording
          if (workflowCompleteRef.current) {
            endVoiceSession();
            resolve();
            return;
          }

          if (shouldAutoRecord) {
            console.log('[VOICE] restarting listener');
            startRecording();
          } else {
            setVoiceState('IDLE');
          }
          resolve();
        };

        audio.onplay = () => {
          console.log('[VOICE] audio playback started');
        };

        audio.onended = () => {
          console.log('[VOICE] audio playback ended');
          cleanup(true);
        };

        audio.onerror = (e) => {
          console.warn('[VOICE] TTS audio playback error:', e);
          setTtsUnavailable(true);
          cleanup(true);
        };

        // Safety fallback timer for audio playback (e.g., 30s max)
        const playbackTimeout = setTimeout(() => {
          if (!resolved) {
            console.warn('[VOICE] Audio playback timeout reached, recovering listener');
            cleanup(true);
          }
        }, 30000);

        audio.play().catch((playErr) => {
          clearTimeout(playbackTimeout);
          console.warn('[VOICE] TTS audio.play() rejected:', playErr);
          setTtsUnavailable(true);
          cleanup(true);
        });
      });
    } catch (err) {
      console.warn('[VOICE] TTS Playback Exception:', err);
      setTtsUnavailable(true);
      if (sessionId === recordingSessionIdRef.current && voiceSessionActiveRef.current) {
        if (workflowCompleteRef.current) {
          endVoiceSession();
        } else {
          console.log('[VOICE] restarting listener');
          setTimeout(() => {
            if (voiceSessionActiveRef.current && sessionId === recordingSessionIdRef.current && !workflowCompleteRef.current) {
              startRecording();
            }
          }, 1500);
        }
      } else {
        setVoiceState('IDLE');
      }
    }
  }

  // VOICE MODE: STOP LISTENING TURN (Called automatically on silence detection or explicitly)
  function stopListeningTurn() {
    if (isListeningStoppingRef.current) return;
    isListeningStoppingRef.current = true;
    setIsUserSpeaking(false);

    // Cancel VAD loop
    if (vadRafIdRef.current) {
      cancelAnimationFrame(vadRafIdRef.current);
      vadRafIdRef.current = null;
    }

    console.log('[VOICE] stopping recorder');

    // Stop MediaRecorder (triggers recorder.onstop)
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.warn('[VOICE] Error stopping MediaRecorder in stopListeningTurn:', e);
      }
    } else {
      // Fallback if recorder was already stopped or inactive
      console.log('[VOICE] recorder was not recording');
      if (voiceSessionActiveRef.current && !workflowCompleteRef.current) {
        console.log('[VOICE] restarting listener');
        setTimeout(() => {
          if (voiceSessionActiveRef.current && !workflowCompleteRef.current) {
            startRecording();
          }
        }, 200);
      }
      return;
    }
    setVoiceState('TRANSCRIBING');
  }

  // Alias for backward compatibility if invoked manually
  function stopRecording() {
    stopListeningTurn();
  }

  // VOICE MODE: START MICROPHONE LISTENING (HANDS-FREE VAD WITH AUTOMATIC SILENCE DETECTION)
  async function startRecording() {
    if (!voiceSessionActiveRef.current) return;
    if (workflowCompleteRef.current) {
      endVoiceSession();
      return;
    }

    // Prevent duplicate concurrent startRecording executions
    if (isStartingRecordingRef.current) {
      console.log('[VOICE] startRecording already in progress, skipping duplicate');
      return;
    }
    isStartingRecordingRef.current = true;

    try {
      // 1. Increment session ID to invalidate any in-flight previous recording/STT callbacks
      const currentSessionId = ++recordingSessionIdRef.current;
      isListeningStoppingRef.current = false;
      speechStartedRef.current = false;
      speechStartTimeRef.current = null;
      silenceStartTimeRef.current = null;
      setIsUserSpeaking(false);

      // 2. Cancel any active VAD loop
      if (vadRafIdRef.current) {
        cancelAnimationFrame(vadRafIdRef.current);
        vadRafIdRef.current = null;
      }

      // 3. Close any previous AudioContext
      if (audioContextRef.current) {
        try {
          if (audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close();
          }
        } catch {}
        audioContextRef.current = null;
      }
      analyserRef.current = null;

      // 4. Pause/cleanup active TTS audio if playing
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
        activeAudioRef.current = null;
      }

      // 5. Ensure any existing MediaRecorder is stopped & cleaned up
      if (mediaRecorderRef.current) {
        try {
          if (mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
          }
        } catch (e) {
          console.warn('[VOICE] Error stopping previous MediaRecorder:', e);
        }
        mediaRecorderRef.current = null;
      }

      // 6. Ensure any existing MediaStream tracks are stopped
      if (mediaStreamRef.current) {
        try {
          mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        } catch (e) {
          console.warn('[VOICE] Error stopping previous MediaStream:', e);
        }
        mediaStreamRef.current = null;
      }

      setVoiceError(null);
      setTtsUnavailable(false);

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Microphone recording is not supported in this browser.');
      }

      // 7. Request a fresh audio stream with echo cancellation & noise suppression
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Verify session was not cancelled or invalidated during getUserMedia prompt
      if (currentSessionId !== recordingSessionIdRef.current || !voiceSessionActiveRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      mediaStreamRef.current = stream;

      // 8. Initialize Web Audio API Analyser for Voice Activity & Silence Detection
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

      if (AudioCtxClass) {
        try {
          const audioCtx = new AudioCtxClass();
          audioContextRef.current = audioCtx;
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 512;
          analyser.smoothingTimeConstant = 0.2;
          analyserRef.current = analyser;

          const source = audioCtx.createMediaStreamSource(stream);
          source.connect(analyser);

          const timeDomainData = new Float32Array(analyser.fftSize);

          // Real-time VAD Monitoring Loop
          const vadLoop = () => {
            if (
              currentSessionId !== recordingSessionIdRef.current ||
              !voiceSessionActiveRef.current ||
              isListeningStoppingRef.current
            ) {
              return;
            }

            analyser.getFloatTimeDomainData(timeDomainData);
            let sumSquares = 0;
            for (let i = 0; i < timeDomainData.length; i++) {
              sumSquares += timeDomainData[i] * timeDomainData[i];
            }
            const rms = Math.sqrt(sumSquares / timeDomainData.length);
            const now = Date.now();

            if (rms >= VAD_SPEECH_RMS_THRESHOLD) {
              // Vocal speech detected
              if (!speechStartedRef.current) {
                speechStartedRef.current = true;
                speechStartTimeRef.current = now;
                setIsUserSpeaking(true);
                console.log('[VOICE] VAD speech detected');
              } else {
                setIsUserSpeaking(true);
              }
              silenceStartTimeRef.current = null;
            } else if (speechStartedRef.current) {
              // User had started speaking, now in pause or silence
              setIsUserSpeaking(false);
              const speechDuration = now - (speechStartTimeRef.current || now);

              if (speechDuration >= VAD_MIN_SPEECH_DURATION_MS) {
                if (!silenceStartTimeRef.current) {
                  silenceStartTimeRef.current = now;
                } else if (now - silenceStartTimeRef.current >= VAD_SILENCE_DURATION_MS) {
                  // Natural silence detected! Auto-complete user turn
                  console.log('[VOICE] silence detected');
                  stopListeningTurn();
                  return;
                }
              }
            }

            // Safeguard: cap maximum single turn speech duration to 25s
            if (
              speechStartedRef.current &&
              speechStartTimeRef.current &&
              now - speechStartTimeRef.current >= VAD_MAX_TURN_DURATION_MS
            ) {
              console.log('[VOICE] silence detected');
              stopListeningTurn();
              return;
            }

            vadRafIdRef.current = requestAnimationFrame(vadLoop);
          };

          vadRafIdRef.current = requestAnimationFrame(vadLoop);
        } catch (vadErr) {
          console.warn('[VOICE] Web Audio API Analyser initialization notice:', vadErr);
        }
      }

      // 9. Select best supported MIME type
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

      // 10. Dedicated per-session chunks array bound to this specific recording session
      const sessionChunks: Blob[] = [];

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          sessionChunks.push(event.data);
        }
      };

      recorder.onstop = async () => {
        console.log('[VOICE] recorder onstop fired');

        // Disconnect & close AudioContext here AFTER recorder has stopped recording
        if (audioContextRef.current) {
          try {
            if (audioContextRef.current.state !== 'closed') {
              audioContextRef.current.close();
            }
          } catch (e) {
            console.warn('[VOICE] Error closing AudioContext in onstop:', e);
          }
          audioContextRef.current = null;
        }
        analyserRef.current = null;

        // Stop all microphone tracks immediately upon completion of turn
        try {
          stream.getTracks().forEach((track) => track.stop());
        } catch (e) {
          console.warn('[VOICE] Error stopping stream tracks in onstop:', e);
        }
        if (mediaStreamRef.current === stream) {
          mediaStreamRef.current = null;
        }
        if (mediaRecorderRef.current === recorder) {
          mediaRecorderRef.current = null;
        }

        // Clean up VAD monitoring loop
        if (vadRafIdRef.current) {
          cancelAnimationFrame(vadRafIdRef.current);
          vadRafIdRef.current = null;
        }

        // Check race condition: if session was ended or invalidated, discard audio
        if (currentSessionId !== recordingSessionIdRef.current || !voiceSessionActiveRef.current) {
          console.warn(`[VOICE] Discarding stopped recorder from inactive/stale session #${currentSessionId}`);
          return;
        }

        const actualMimeType = recorder.mimeType || selectedMimeType;
        const audioBlob = new Blob(sessionChunks, { type: actualMimeType });
        console.log('[VOICE] audio blob created');

        // If user didn't speak or segment is too small, silently re-open listener without breaking call
        if (audioBlob.size < 500 || !speechStartedRef.current) {
          console.log(`[VOICE] Ambient silence (size: ${audioBlob.size}b, speechDetected: ${speechStartedRef.current}). Re-opening listener.`);
          if (voiceSessionActiveRef.current && !workflowCompleteRef.current) {
            console.log('[VOICE] restarting listener');
            setTimeout(() => {
              if (voiceSessionActiveRef.current && currentSessionId === recordingSessionIdRef.current && !workflowCompleteRef.current) {
                startRecording();
              }
            }, 200);
          } else {
            setVoiceState('IDLE');
          }
          return;
        }

        await processVoiceRecording(audioBlob, actualMimeType, currentSessionId);
      };

      recorder.start();
      setVoiceState('RECORDING');
    } catch (err: unknown) {
      console.error('[VOICE] Microphone Error:', err);
      const msg =
        err instanceof Error
          ? err.message
          : 'Microphone permission denied or recording failed.';

      const isFatal =
        err instanceof DOMException &&
        (err.name === 'NotAllowedError' ||
          err.name === 'NotFoundError' ||
          err.name === 'SecurityError');

      if (isFatal) {
        endVoiceSession();
        setVoiceError(`Fatal microphone error: ${msg}`);
        setVoiceState('ERROR');
      } else {
        setVoiceError(msg);
        setVoiceState('ERROR');
        // Non-fatal error: try re-opening if session is active
        if (voiceSessionActiveRef.current && !workflowCompleteRef.current) {
          setTimeout(() => {
            if (voiceSessionActiveRef.current && !workflowCompleteRef.current) {
              console.log('[VOICE] restarting listener');
              startRecording();
            }
          }, 1500);
        }
      }
    } finally {
      isStartingRecordingRef.current = false;
    }
  }

  // VOICE MODE: TRANSCRIBE & EXECUTE ENGINE
  async function processVoiceRecording(audioBlob: Blob, mimeType: string, sessionId: number) {
    try {
      if (sessionId !== recordingSessionIdRef.current || !voiceSessionActiveRef.current) {
        console.warn(`[VOICE] Discarding transcribe request for inactive/stale session #${sessionId}`);
        return;
      }

      setVoiceState('TRANSCRIBING');

      // Determine established conversation language from transcript history
      let establishedLang: string | undefined = undefined;
      const history = transcriptRef.current.length > 0 ? transcriptRef.current : transcript;
      const userHistoryMsgs = history.filter((m) => m.role === 'user');
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

      console.log('[VOICE] sending audio to STT');
      console.log('[VOICE] STT request started');

      const res = await fetchWithTimeout(transcribeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': mimeType,
        },
        body: audioBlob,
      }, 12000);

      console.log('[VOICE] STT response received');

      if (sessionId !== recordingSessionIdRef.current || !voiceSessionActiveRef.current) {
        console.warn(`[VOICE] Discarding transcribe response for inactive/stale session #${sessionId}`);
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `STT transcription failed (status ${res.status})`);
      }

      const userText = data.transcript;
      console.log('[VOICE] transcript received');

      if (!userText || !userText.trim()) {
        throw new Error('Could not understand speech. Please speak again.');
      }

      await processUserMessage(userText.trim(), sessionId);
    } catch (err: unknown) {
      if (sessionId !== recordingSessionIdRef.current || !voiceSessionActiveRef.current) return;
      console.error('[VOICE] STT Processing Error:', err);
      const msg = err instanceof Error ? err.message : 'Voice transcription failed';
      setVoiceError(`${msg}. Resuming listening...`);

      // Recoverable STT error: keep session active and re-listen
      if (voiceSessionActiveRef.current && !workflowCompleteRef.current) {
        setVoiceState('IDLE');
        setTimeout(() => {
          if (voiceSessionActiveRef.current && sessionId === recordingSessionIdRef.current && !workflowCompleteRef.current) {
            console.log('[VOICE] restarting listener');
            startRecording();
          }
        }, 1500);
      } else {
        setVoiceState('ERROR');
      }
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
                endVoiceSession();
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

          {/* End Call Button if Voice session is currently active */}
          {mode === 'voice' && voiceSessionActive && (
            <button
              onClick={endVoiceSession}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors"
            >
              <PhoneOff className="w-3.5 h-3.5" />
              <span>End Call</span>
            </button>
          )}

          {!conversationId ? (
            <button
              onClick={() => startSimulation(mode === 'voice')}
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
              onClick={() => startSimulation(mode === 'voice')}
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
                    ? voiceSessionActive
                      ? 'Live Voice Call Connected (Hands-Free Hindi/English)'
                      : 'Voice Call Session Idle'
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
              /* VOICE MODE CONTROLS & HANDS-FREE PHONE CALL STATE MACHINE */
              <div className="space-y-3">
                {/* Voice Status Indicator Banner */}
                <div className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                  <div className="flex items-center gap-2">
                    {voiceSessionActive && voiceState === 'RECORDING' && (
                      isUserSpeaking ? (
                        <Radio className="w-4 h-4 text-emerald-600 animate-pulse" />
                      ) : (
                        <Radio className="w-4 h-4 text-red-600 animate-pulse" />
                      )
                    )}
                    {voiceSessionActive && voiceState === 'TRANSCRIBING' && <Loader2 className="w-4 h-4 text-amber-600 animate-spin" />}
                    {voiceSessionActive && voiceState === 'THINKING' && <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />}
                    {voiceSessionActive && voiceState === 'SPEAKING' && <Volume2 className="w-4 h-4 text-indigo-600 animate-bounce" />}
                    {voiceSessionActive && voiceState === 'IDLE' && <PhoneCall className="w-4 h-4 text-emerald-600 animate-pulse" />}
                    {(!voiceSessionActive || voiceState === 'ERROR') && (
                      voiceState === 'ERROR' ? <AlertCircle className="w-4 h-4 text-red-600" /> : <Mic className="w-4 h-4 text-slate-500" />
                    )}

                    <span className="font-semibold text-slate-800">
                      {!voiceSessionActive && (voiceError || 'Call ended. Click Start Voice Call to begin.')}
                      {voiceSessionActive && voiceState === 'RECORDING' && (
                        isUserSpeaking
                          ? 'Speaking detected... (listening)'
                          : 'Listening... (speak naturally, pause to send)'
                      )}
                      {voiceSessionActive && voiceState === 'TRANSCRIBING' && 'Processing speech...'}
                      {voiceSessionActive && voiceState === 'THINKING' && 'Processing response...'}
                      {voiceSessionActive && voiceState === 'SPEAKING' && 'Assistant speaking... (microphone paused)'}
                      {voiceSessionActive && voiceState === 'IDLE' && 'Call connected... preparing next turn'}
                      {voiceSessionActive && voiceState === 'ERROR' && (voiceError || 'Voice issue detected. Resuming call...')}
                    </span>
                  </div>

                  {ttsUnavailable && (
                    <span className="text-[10px] text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1">
                      <VolumeX className="w-3 h-3" /> Audio Unavailable (Text Fallback)
                    </span>
                  )}
                </div>

                {/* Hands-Free Voice Call Controls */}
                <div className="flex items-center justify-center gap-4">
                  {!voiceSessionActive ? (
                    <button
                      onClick={startVoiceCall}
                      disabled={initializing || workflowComplete}
                      aria-label="Start voice call"
                      className="flex items-center gap-3 px-6 py-3.5 rounded-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold text-xs shadow-lg transition-transform active:scale-95 focus:outline-none focus:ring-4 focus:ring-indigo-300"
                    >
                      <Mic className="w-5 h-5" />
                      <span>Start Voice Call</span>
                    </button>
                  ) : (
                    <>
                      {/* Hands-Free Real-Time State Badge */}
                      {voiceState === 'RECORDING' ? (
                        <div className="flex items-center gap-2.5 px-5 py-3 rounded-full bg-white border border-slate-200 shadow-sm text-xs">
                          {isUserSpeaking ? (
                            <>
                              <span className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                              </span>
                              <span className="font-extrabold text-emerald-700">Speaking...</span>
                            </>
                          ) : (
                            <>
                              <span className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                              </span>
                              <span className="font-bold text-slate-800">Listening...</span>
                            </>
                          )}
                        </div>
                      ) : voiceState === 'SPEAKING' ? (
                        <div className="flex items-center gap-2.5 px-5 py-3 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold shadow-xs">
                          <Volume2 className="w-4 h-4 animate-bounce text-indigo-600" />
                          <span>Assistant Speaking...</span>
                        </div>
                      ) : voiceState === 'TRANSCRIBING' || voiceState === 'THINKING' ? (
                        <div className="flex items-center gap-2.5 px-5 py-3 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold shadow-xs">
                          <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                          <span>Processing...</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2.5 px-5 py-3 rounded-full bg-slate-100 border border-slate-200 text-slate-500 text-xs font-semibold shadow-xs">
                          <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                          <span>Connecting turn...</span>
                        </div>
                      )}

                      {/* Primary Call Control: End Call */}
                      <button
                        onClick={endVoiceSession}
                        aria-label="End call"
                        title="End Call"
                        className="flex items-center gap-2 px-5 py-3 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-md active:scale-95 focus:outline-none focus:ring-4 focus:ring-red-300"
                      >
                        <PhoneOff className="w-4 h-4" />
                        <span>End Call</span>
                      </button>
                    </>
                  )}
                </div>

                <div className="text-center text-[10px] text-slate-400 font-medium">
                  {voiceSessionActive
                    ? 'Hands-free call active. Speak naturally; the assistant detects pauses and responds automatically.'
                    : 'Hands-free automated phone call. Supports English & Hindi/Hinglish.'}
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
