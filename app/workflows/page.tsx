'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  GitFork, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  Calendar, 
  HelpCircle, 
  Settings2, 
  AlertCircle, 
  Trash2, 
  Loader2, 
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { Workflow } from '@/types/database';

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchWorkflows();
  }, []);

  async function fetchWorkflows() {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await fetch('/api/workflows');
      if (!res.ok) throw new Error('Failed to load workflows');
      const data = await res.json();
      setWorkflows(data.workflows || []);
    } catch (err: unknown) {
      console.error(err);
      setErrorMsg('Could not fetch workflows from database.');
    } finally {
      setLoading(false);
    }
  }

  async function toggleWorkflowActive(id: string, currentStatus: boolean) {
    try {
      setTogglingId(id);
      const res = await fetch(`/api/workflows/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !currentStatus }),
      });

      if (!res.ok) throw new Error('Failed to update workflow status');
      const data = await res.json();
      
      setWorkflows((prev) =>
        prev.map((wf) => (wf.id === id ? { ...wf, active: data.workflow.active } : wf))
      );
    } catch (err: unknown) {
      console.error(err);
      alert('Failed to update active status');
    } finally {
      setTogglingId(null);
    }
  }

  async function deleteWorkflow(id: string, name: string) {
    if (!confirm(`Are you sure you want to delete workflow "${name}"?`)) return;

    try {
      setDeletingId(id);
      const res = await fetch(`/api/workflows/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete workflow');
      setWorkflows((prev) => prev.filter((wf) => wf.id !== id));
    } catch (err) {
      console.error(err);
      alert('Failed to delete workflow');
    } finally {
      setDeletingId(null);
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
              <div className="h-6 w-48 bg-slate-200 rounded animate-pulse" />
              <div className="h-4 w-full bg-slate-100 rounded animate-pulse" />
              <div className="h-4 w-2/3 bg-slate-100 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Main Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Workflows</h1>
          <p className="text-sm text-slate-500">
            Generic missed-call automated workflows for customer data collection & scheduling.
          </p>
        </div>
        <Link
          href="/workflows/new"
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create New Workflow
        </Link>
      </div>

      {/* Error alert banner */}
      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={fetchWorkflows}
            className="inline-flex items-center gap-1 text-xs font-semibold text-red-800 underline hover:text-red-900"
          >
            <RefreshCw className="w-3 h-3" /> Retry
          </button>
        </div>
      )}

      {/* Workflows List Grid */}
      {workflows.length === 0 ? (
        /* Empty State */
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center shadow-xs">
          <div className="inline-flex w-12 h-12 rounded-full bg-blue-50 text-blue-600 items-center justify-center mb-3">
            <GitFork className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No workflows created yet</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-6 leading-relaxed">
            Create a custom generic workflow to define how your missed-call AI assistant greets callers, asks required questions, and triggers scheduling or owner actions.
          </p>
          <Link
            href="/workflows/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            Build Your First Workflow
          </Link>
        </div>
      ) : (
        /* Workflows Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {workflows.map((wf) => (
            <div
              key={wf.id}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-colors"
            >
              <div>
                {/* Header row: Status toggle + Trigger */}
                <div className="flex items-center justify-between mb-3">
                  <button
                    onClick={() => toggleWorkflowActive(wf.id, wf.active)}
                    disabled={togglingId === wf.id}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${
                      wf.active
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                        : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    {togglingId === wf.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : wf.active ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-slate-400" />
                    )}
                    <span>{wf.active ? 'Active' : 'Inactive'}</span>
                  </button>

                  <span className="text-[11px] font-medium text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                    Trigger: {wf.trigger}
                  </span>
                </div>

                {/* Title & Greeting */}
                <h3 className="text-lg font-bold text-slate-900 leading-snug">
                  {wf.name}
                </h3>
                <p className="text-xs text-slate-600 mt-1.5 line-clamp-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100 italic">
                  &quot;{wf.greeting}&quot;
                </p>

                {/* Metadata Pills */}
                <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-slate-600">
                  <span className="inline-flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-md font-medium">
                    <HelpCircle className="w-3 h-3 text-slate-500" />
                    {wf.questions ? wf.questions.length : 0} Question(s)
                  </span>

                  <span className="inline-flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-md font-medium">
                    <Settings2 className="w-3 h-3 text-slate-500" />
                    Action: {wf.action?.type || 'none'}
                  </span>

                  {wf.conditions && wf.conditions.length > 0 && (
                    <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-2.5 py-1 rounded-md font-semibold border border-amber-200">
                      {wf.conditions.length} Rule(s)
                    </span>
                  )}
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(wf.created_at).toLocaleDateString()}
                </span>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => deleteWorkflow(wf.id, wf.name)}
                    disabled={deletingId === wf.id}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Delete Workflow"
                  >
                    {deletingId === wf.id ? (
                      <Loader2 className="w-4 h-4 animate-spin text-red-600" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>

                  <Link
                    href={`/workflows/${wf.id}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
                  >
                    <span>Edit Workflow</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
