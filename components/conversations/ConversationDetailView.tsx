'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  User, 
  Phone, 
  Clock, 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  AlertCircle, 
  Bot, 
  MessageSquare, 
  Save, 
  Loader2, 
  ShieldCheck,
  FileText,
  Tag,
  Layers,
  Sparkles
} from 'lucide-react';
import { QuestionField, TranscriptMessage } from '@/types/database';

interface ConversationDetailViewProps {
  initialData: {
    id: string;
    customer_name: string | null;
    phone: string;
    intent: string | null;
    status: string;
    priority: string;
    collected_data: Record<string, unknown>;
    summary: string | null;
    action_performed: string | null;
    calendar_event_id: string | null;
    transcript: TranscriptMessage[];
    created_at: string;
    updated_at: string;
    workflows?: {
      id: string;
      name: string;
      trigger: string;
      greeting: string;
      questions?: QuestionField[];
      closing: string;
    } | null;
    businesses?: {
      id: string;
      name: string;
      industry: string;
      timezone: string;
    } | null;
    followups?: Array<{
      id: string;
      status: string;
      notes: string;
      created_at: string;
      updated_at: string;
    }> | null;
  };
}

export function ConversationDetailView({ initialData }: ConversationDetailViewProps) {
  const [conversation, setConversation] = useState(initialData);
  const [convStatus, setConvStatus] = useState(initialData.status);
  const [updatingConvStatus, setUpdatingConvStatus] = useState(false);

  // Follow-up state
  const existingFollowup = conversation.followups && conversation.followups.length > 0
    ? conversation.followups[0]
    : null;

  const [followupId, setFollowupId] = useState<string | null>(existingFollowup?.id || null);
  const [followupStatus, setFollowupStatus] = useState<string>(existingFollowup?.status || 'pending');
  const [followupNotes, setFollowupNotes] = useState<string>(existingFollowup?.notes || '');
  const [savingFollowup, setSavingFollowup] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Update Conversation Status
  async function handleUpdateConvStatus(newStatus: string) {
    try {
      setUpdatingConvStatus(true);
      setFeedbackMsg(null);

      const res = await fetch(`/api/conversations/${conversation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update conversation status');

      setConvStatus(newStatus);
      setConversation((prev) => ({ ...prev, status: newStatus }));
      setFeedbackMsg({ type: 'success', text: 'Conversation status updated successfully!' });
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : 'Error updating conversation status';
      setFeedbackMsg({ type: 'error', text: msg });
    } finally {
      setUpdatingConvStatus(false);
    }
  }

  // Create or Update Follow-up
  async function handleSaveFollowup(e?: React.FormEvent) {
    if (e) e.preventDefault();

    try {
      setSavingFollowup(true);
      setFeedbackMsg(null);

      if (!followupId) {
        // Create new follow-up
        const res = await fetch('/api/followups', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversation_id: conversation.id,
            status: followupStatus,
            notes: followupNotes,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to create follow-up');

        setFollowupId(data.followup.id);
        setFeedbackMsg({ type: 'success', text: 'Follow-up created successfully!' });
      } else {
        // Update existing follow-up
        const res = await fetch(`/api/followups/${followupId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: followupStatus,
            notes: followupNotes,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to update follow-up');

        setFeedbackMsg({ type: 'success', text: 'Follow-up updated successfully!' });
      }
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : 'Error saving follow-up';
      setFeedbackMsg({ type: 'error', text: msg });
    } finally {
      setSavingFollowup(false);
    }
  }

  // Build DYNAMIC Captured Information table using workflow.questions
  const questionsList = conversation.workflows?.questions || [];
  const collectedData = conversation.collected_data || {};

  return (
    <div className="space-y-6">
      {/* HEADER BAR */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/conversations"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-xs transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Conversations</span>
        </Link>

        <div className="flex items-center gap-2">
          {/* Priority Pill */}
          <span
            className={`text-xs font-bold px-3 py-1 rounded-full uppercase border ${
              conversation.priority === 'urgent'
                ? 'bg-red-100 text-red-700 border-red-200'
                : 'bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            {conversation.priority} PRIORITY
          </span>
        </div>
      </div>

      {/* FEEDBACK ALERT */}
      {feedbackMsg && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center justify-between shadow-xs ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600" />
            )}
            <span className="font-semibold">{feedbackMsg.text}</span>
          </div>
          <button onClick={() => setFeedbackMsg(null)} className="text-slate-400 hover:text-slate-600 font-bold">
            &times;
          </button>
        </div>
      )}

      {/* TOP SUMMARY CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Customer Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-2">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Customer</span>
          <div className="font-bold text-slate-900 text-base flex items-center gap-2">
            <User className="w-4 h-4 text-blue-600" />
            <span>{conversation.customer_name || 'Anonymous Caller'}</span>
          </div>
          <div className="text-xs text-slate-500 font-mono flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-slate-400" />
            <span>{conversation.phone}</span>
          </div>
        </div>

        {/* Workflow & Industry Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-2">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Active Workflow</span>
          <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-600" />
            <span>{conversation.workflows?.name || 'Standard Workflow'}</span>
          </div>
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <span className="bg-slate-100 px-2 py-0.5 rounded font-mono text-[11px]">
              Trigger: {conversation.workflows?.trigger || 'missed_call'}
            </span>
            {conversation.businesses && (
              <span className="text-slate-400">({conversation.businesses.industry})</span>
            )}
          </div>
        </div>

        {/* Status & Timestamp Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-2">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Conversation Status</span>
          <div className="flex items-center gap-2">
            <select
              value={convStatus}
              onChange={(e) => handleUpdateConvStatus(e.target.value)}
              disabled={updatingConvStatus}
              className="px-3 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="in_progress">IN PROGRESS</option>
              <option value="completed">COMPLETED</option>
              <option value="closed">CLOSED</option>
            </select>
            {updatingConvStatus && <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />}
          </div>
          <div className="text-[11px] text-slate-400 flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-400" />
            <span>Created {new Date(conversation.created_at).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* MAIN TWO-COLUMN LAYOUT: CAPTURED DATA & FOLLOW-UP (LEFT) + TRANSCRIPT (RIGHT) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: CAPTURED DATA, AI SUMMARY & FOLLOW-UP (7 COLS) */}
        <div className="lg:col-span-7 space-y-6">
          {/* 1. DYNAMIC CAPTURED INFORMATION */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600" />
                <span>Captured Workflow Information</span>
              </h3>
              <span className="text-[10px] font-semibold text-slate-400 uppercase">Generic Fields</span>
            </div>

            {Object.keys(collectedData).length === 0 ? (
              <p className="text-xs text-slate-400 italic p-3 text-center bg-slate-50 rounded-lg">
                No parameters were extracted during this conversation.
              </p>
            ) : (
              <div className="bg-slate-50 rounded-lg border border-slate-200 divide-y divide-slate-100 text-xs overflow-hidden">
                {/* Dynamically match question definitions for human-readable labels */}
                {Object.entries(collectedData).map(([key, val]) => {
                  const matchingQ = questionsList.find((q) => q.name === key);
                  const label = matchingQ ? matchingQ.label : key.replace(/_/g, ' ');

                  return (
                    <div key={key} className="p-3 flex items-center justify-between">
                      <span className="font-semibold text-slate-700 capitalize">{label}</span>
                      <span className="font-mono font-bold text-slate-900 bg-white px-2 py-1 rounded border border-slate-200">
                        {String(val)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 2. AI CONVERSATION SUMMARY */}
          {conversation.summary && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50/50 rounded-xl border border-blue-200/80 p-4 shadow-xs space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-blue-900">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span>AI Conversation Summary</span>
              </div>
              <p className="text-xs text-blue-950 leading-relaxed font-medium">
                {conversation.summary}
              </p>
            </div>
          )}

          {/* 3. GOOGLE CALENDAR ACTION STATUS */}
          {conversation.calendar_event_id && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-2">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-indigo-600" />
                  <span>Google Calendar Integration</span>
                </h3>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  EVENT SCHEDULED
                </span>
              </div>

              <div className="flex items-center justify-between text-xs font-mono bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <span className="text-slate-500 font-sans font-medium">Event ID:</span>
                <span className="font-bold text-indigo-700">{conversation.calendar_event_id}</span>
              </div>
              {conversation.action_performed && (
                <p className="text-[11px] text-slate-500">
                  Action performed: <strong className="font-mono text-slate-700">{conversation.action_performed}</strong>
                </p>
              )}
            </div>
          )}

          {/* 4. FOLLOW-UP MANAGEMENT FORM */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Tag className="w-4 h-4 text-amber-600" />
                <span>Follow-up Management</span>
              </h3>
              <span className="text-[10px] font-medium text-slate-400">Owner CRM Task</span>
            </div>

            <form onSubmit={handleSaveFollowup} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Follow-up Status
                </label>
                <select
                  value={followupStatus}
                  onChange={(e) => setFollowupStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="pending">Pending</option>
                  <option value="contacted">Contacted</option>
                  <option value="completed">Completed</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Business Owner Notes
                </label>
                <textarea
                  rows={3}
                  value={followupNotes}
                  onChange={(e) => setFollowupNotes(e.target.value)}
                  placeholder="Add notes (e.g. Called customer, confirmed appointment time and preferences)..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                {existingFollowup && (
                  <span className="text-[10px] text-slate-400">
                    Last updated: {new Date(existingFollowup.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
                <button
                  type="submit"
                  disabled={savingFollowup}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-xs transition-colors disabled:opacity-60 ml-auto"
                >
                  {savingFollowup ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>{followupId ? 'Update Follow-up' : 'Create Follow-up'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* RIGHT COLUMN: FULL CONVERSATION TRANSCRIPT TIMELINE (5 COLS) */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4 max-h-[720px] flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-blue-600" />
              <span>Full Conversation Transcript</span>
            </h3>
            <span className="text-[10px] font-mono text-slate-400">
              {conversation.transcript ? conversation.transcript.length : 0} Turns
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {!conversation.transcript || conversation.transcript.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center p-8">No transcript available.</p>
            ) : (
              conversation.transcript.map((msg, index) => {
                const isAssistant = msg.role === 'assistant';
                return (
                  <div
                    key={index}
                    className={`flex gap-3 ${isAssistant ? 'justify-start' : 'justify-end'}`}
                  >
                    {isAssistant && (
                      <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 text-xs shadow-xs mt-0.5">
                        <Bot className="w-3.5 h-3.5" />
                      </div>
                    )}

                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed ${
                        isAssistant
                          ? 'bg-slate-50 border border-slate-200 text-slate-800 rounded-tl-xs'
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
                      <div className="w-7 h-7 rounded-full bg-slate-800 text-white flex items-center justify-center shrink-0 text-xs shadow-xs mt-0.5">
                        <User className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
