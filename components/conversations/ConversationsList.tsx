'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  Search, 
  Filter, 
  MessageSquare, 
  PhoneCall, 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  AlertCircle, 
  CheckCircle2, 
  ChevronRight,
  Loader2,
  Sparkles,
  ArrowUpDown
} from 'lucide-react';
import { Workflow } from '@/types/database';

interface ConversationItem {
  id: string;
  customer_name: string | null;
  phone: string;
  intent: string | null;
  status: string;
  priority: string;
  summary: string | null;
  action_performed: string | null;
  calendar_event_id: string | null;
  created_at: string;
  workflows?: {
    id: string;
    name: string;
  } | null;
  followups?: Array<{
    id: string;
    status: string;
    notes: string;
    updated_at: string;
  }> | null;
}

interface ConversationsListProps {
  workflows: Workflow[];
}

export function ConversationsList({ workflows }: ConversationsListProps) {
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedFollowupStatus, setSelectedFollowupStatus] = useState<string>('all');

  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg(null);

      const params = new URLSearchParams();
      if (searchQuery) params.append('q', searchQuery);
      if (selectedWorkflowId !== 'all') params.append('workflow_id', selectedWorkflowId);
      if (selectedPriority !== 'all') params.append('priority', selectedPriority);
      if (selectedStatus !== 'all') params.append('status', selectedStatus);

      const res = await fetch(`/api/conversations?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to load conversations');
      }

      let result: ConversationItem[] = data.conversations || [];

      // Filter by Followup Status if selected
      if (selectedFollowupStatus !== 'all') {
        result = result.filter((item) => {
          const followup = item.followups && item.followups.length > 0 ? item.followups[0] : null;
          const statusVal = followup ? followup.status : 'none';
          return statusVal === selectedFollowupStatus;
        });
      }

      setConversations(result);
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : 'Error fetching conversations';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedWorkflowId, selectedPriority, selectedStatus, selectedFollowupStatus]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  return (
    <div className="space-y-6">
      {/* SEARCH AND FILTERS TOOLBAR */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations by customer name, phone number, or intent..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Filters Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Workflow
            </label>
            <select
              value={selectedWorkflowId}
              onChange={(e) => setSelectedWorkflowId(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Workflows</option>
              {workflows.map((wf) => (
                <option key={wf.id} value={wf.id}>
                  {wf.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Priority
            </label>
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Priorities</option>
              <option value="normal">Normal</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Follow-up Status
            </label>
            <select
              value={selectedFollowupStatus}
              onChange={(e) => setSelectedFollowupStatus(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Follow-ups</option>
              <option value="pending">Pending</option>
              <option value="contacted">Contacted</option>
              <option value="completed">Completed</option>
              <option value="closed">Closed</option>
              <option value="none">No Follow-up</option>
            </select>
          </div>
        </div>
      </div>

      {/* ERROR ALERT BANNER */}
      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={fetchConversations}
            className="px-3 py-1 bg-red-600 text-white rounded text-xs font-semibold hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      )}

      {/* LOADING SKELETON STATE */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 animate-pulse flex items-center justify-between">
              <div className="space-y-2 flex-1">
                <div className="h-4 bg-slate-200 rounded w-1/4" />
                <div className="h-3 bg-slate-100 rounded w-1/2" />
              </div>
              <div className="h-6 bg-slate-200 rounded w-20" />
            </div>
          ))}
        </div>
      ) : conversations.length === 0 ? (
        /* EMPTY STATE */
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center space-y-4 max-w-lg mx-auto shadow-xs">
          <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900">No conversations found</h3>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              Simulated missed call callbacks and customer conversations will appear here once initiated.
            </p>
          </div>
          <Link
            href="/simulator"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>Simulate Missed Call</span>
          </Link>
        </div>
      ) : (
        /* CONVERSATIONS LIST CARDS (RESPONSIVE STACKED ON MOBILE, GRID ON DESKTOP) */
        <div className="space-y-3">
          {conversations.map((conv) => {
            const followup = conv.followups && conv.followups.length > 0 ? conv.followups[0] : null;
            const isUrgent = conv.priority === 'urgent';
            const isCompleted = conv.status === 'completed';

            return (
              <Link
                key={conv.id}
                href={`/conversations/${conv.id}`}
                className={`block bg-white hover:bg-slate-50/80 rounded-xl border transition-all shadow-xs p-4 sm:p-5 ${
                  isUrgent ? 'border-l-4 border-l-red-500 border-slate-200' : 'border-slate-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Left Metadata Block */}
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                        <User className="w-4 h-4 text-slate-400" />
                        {conv.customer_name || 'Anonymous Caller'}
                      </span>
                      <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {conv.phone}
                      </span>

                      {/* Workflow Badge */}
                      {conv.workflows && (
                        <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                          {conv.workflows.name}
                        </span>
                      )}

                      {/* Priority Pill */}
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                          isUrgent
                            ? 'bg-red-100 text-red-700 border border-red-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {conv.priority}
                      </span>
                    </div>

                    {/* Intent & Summary */}
                    <div className="text-xs text-slate-600 flex items-center gap-2 flex-wrap">
                      {conv.intent && (
                        <span className="font-medium text-slate-800">
                          Intent: <span className="italic">{conv.intent}</span>
                        </span>
                      )}
                      {conv.summary && (
                        <span className="text-slate-500 line-clamp-1 truncate max-w-md">
                          • {conv.summary}
                        </span>
                      )}
                    </div>

                    {/* Calendar & Timestamps */}
                    <div className="text-[11px] text-slate-400 flex items-center gap-3 pt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {new Date(conv.created_at).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>

                      {conv.calendar_event_id && (
                        <span className="flex items-center gap-1 text-indigo-600 font-semibold bg-indigo-50 px-2 py-0.5 rounded">
                          <CalendarIcon className="w-3 h-3" /> Event Scheduled
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right Status & Follow-up Badges */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <div className="text-right space-y-1">
                      <span
                        className={`inline-block text-[11px] font-bold px-2.5 py-0.5 rounded border ${
                          isCompleted
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {conv.status.toUpperCase()}
                      </span>

                      {followup && (
                        <span className="block text-[10px] font-medium text-slate-500">
                          Follow-up:{' '}
                          <strong className="text-slate-700 uppercase">{followup.status}</strong>
                        </span>
                      )}
                    </div>

                    <ChevronRight className="w-5 h-5 text-slate-400" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
