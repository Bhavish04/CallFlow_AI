'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  PhoneCall, 
  GitFork, 
  MessageSquare, 
  CheckCircle2, 
  Plus, 
  Building2, 
  Clock, 
  AlertCircle, 
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { Business } from '@/types/database';

interface RecentConv {
  id: string;
  customer_name: string | null;
  phone: string;
  intent: string | null;
  status: string;
  priority: string;
  summary: string | null;
  action_performed: string | null;
  created_at: string;
}

export default function DashboardPage() {
  const [business, setBusiness] = useState<Business | null>(null);
  const [activeWorkflowsCount, setActiveWorkflowsCount] = useState<number>(0);
  const [totalConversationsCount, setTotalConversationsCount] = useState<number>(0);
  const [pendingFollowupsCount, setPendingFollowupsCount] = useState<number>(0);
  const [recentConversations, setRecentConversations] = useState<RecentConv[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await fetch('/api/dashboard');
      if (!res.ok) throw new Error('Failed to load dashboard statistics');

      const data = await res.json();
      setBusiness(data.business || null);
      setActiveWorkflowsCount(data.activeWorkflowsCount || 0);
      setTotalConversationsCount(data.totalConversationsCount || 0);
      setPendingFollowupsCount(data.pendingFollowupsCount || 0);
      setRecentConversations(data.recentConversations || []);
    } catch (err: unknown) {
      console.error(err);
      setErrorMsg('Could not fetch live dashboard metrics from database.');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <div className="h-7 w-40 bg-slate-200 rounded animate-pulse" />
            <div className="h-4 w-64 bg-slate-100 rounded animate-pulse" />
          </div>
          <div className="h-10 w-44 bg-slate-200 rounded-lg animate-pulse" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white p-5 rounded-xl border border-slate-200 space-y-3">
              <div className="h-4 w-24 bg-slate-100 rounded animate-pulse" />
              <div className="h-8 w-16 bg-slate-200 rounded animate-pulse" />
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center space-y-3">
          <div className="h-6 w-48 bg-slate-200 rounded mx-auto animate-pulse" />
          <div className="h-4 w-64 bg-slate-100 rounded mx-auto animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
            {business ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                <Building2 className="w-3 h-3" />
                {business.name} ({business.industry})
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                No business profile set up
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Overview of missed-call automated workflows and customer responses.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/simulator"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
          >
            <PhoneCall className="w-4 h-4" />
            Simulate Call
          </Link>

          <Link
            href="/workflows/new"
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Workflow
          </Link>

          <Link
            href="/conversations"
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-xs transition-colors"
          >
            <MessageSquare className="w-4 h-4" />
            Conversations
          </Link>
        </div>
      </div>

      {/* Error alert banner if any */}
      {errorMsg && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={fetchDashboardData}
            className="inline-flex items-center gap-1 text-xs font-semibold text-amber-800 underline hover:text-amber-900"
          >
            <RefreshCw className="w-3 h-3" /> Retry
          </button>
        </div>
      )}

      {/* Business Setup Prompt if empty */}
      {!business && (
        <div className="p-5 bg-blue-50/70 border border-blue-200 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-blue-900">Set Up Your Business Profile</h3>
            <p className="text-xs text-blue-700">
              Configure your business name, industry, and timezone to enable automated missed-call callbacks.
            </p>
          </div>
          <Link
            href="/business"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold shadow-xs shrink-0"
          >
            Configure Profile &rarr;
          </Link>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Business Industry */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Business Profile</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-base font-bold text-slate-900 truncate block">
              {business ? business.name : 'Not Configured'}
            </span>
            <span className="text-xs text-slate-500 capitalize">
              {business ? business.industry.replace('_', ' ') : 'No industry set'}
            </span>
          </div>
        </div>

        {/* Active Workflows */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Workflows</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <GitFork className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900">{activeWorkflowsCount}</span>
            <Link href="/workflows" className="text-xs font-semibold text-blue-600 hover:underline">
              Manage &rarr;
            </Link>
          </div>
        </div>

        {/* Total Conversations */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Calls Logged</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <PhoneCall className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900">{totalConversationsCount}</span>
            <Link href="/conversations" className="text-xs font-semibold text-blue-600 hover:underline">
              View All &rarr;
            </Link>
          </div>
        </div>

        {/* Pending Followups */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Follow-ups</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900">{pendingFollowupsCount}</span>
            <span className="text-xs text-amber-600 font-medium">Requires Action</span>
          </div>
        </div>
      </div>

      {/* Recent Conversations List / Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-slate-900 text-base">Recent Conversations</h2>
            <p className="text-xs text-slate-500">Customer responses captured by missed-call assistant</p>
          </div>
          <Link href="/conversations" className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1">
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentConversations.length === 0 ? (
          /* Empty State */
          <div className="p-10 text-center">
            <div className="inline-flex w-12 h-12 rounded-full bg-slate-100 text-slate-400 items-center justify-center mb-3">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-800">No calls recorded yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
              Use the AI Simulator to simulate a missed call callback flow and verify information extraction.
            </p>
            <Link
              href="/simulator"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              Launch AI Simulator
            </Link>
          </div>
        ) : (
          /* List of recent conversations */
          <div className="divide-y divide-slate-100">
            {recentConversations.map((conv) => (
              <div key={conv.id} className="p-4 hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-900 text-sm">
                      {conv.customer_name || 'Anonymous Caller'}
                    </span>
                    <span className="text-xs text-slate-500 font-mono">{conv.phone}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        conv.priority === 'urgent'
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      {conv.priority.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-1">
                    {conv.summary || conv.intent || 'Call completed successfully'}
                  </p>
                </div>

                <div className="flex items-center gap-4 text-xs text-slate-400 shrink-0">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{new Date(conv.created_at).toLocaleDateString()}</span>
                  </div>
                  <Link
                    href={`/conversations/${conv.id}`}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                  >
                    Details &rarr;
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
