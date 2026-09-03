'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, AlertCircle, Loader2 } from 'lucide-react';
import { WorkflowForm } from '@/components/workflows/WorkflowForm';
import { Workflow } from '@/types/database';

export default function EditWorkflowPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchWorkflow();
  }, [id]);

  async function fetchWorkflow() {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await fetch(`/api/workflows/${id}`);
      if (!res.ok) throw new Error('Workflow not found');
      const data = await res.json();
      setWorkflow(data.workflow);
    } catch (err: unknown) {
      console.error(err);
      setErrorMsg('Could not fetch workflow details from database.');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-200 animate-pulse" />
          <div className="h-6 w-48 bg-slate-200 rounded animate-pulse" />
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-8 space-y-4">
          <div className="h-10 bg-slate-100 rounded animate-pulse" />
          <div className="h-20 bg-slate-100 rounded animate-pulse" />
          <div className="h-32 bg-slate-100 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (errorMsg || !workflow) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <Link
          href="/workflows"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Workflows
        </Link>
        <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <span>{errorMsg || 'Workflow not found.'}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/workflows"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Workflows
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Edit Workflow</h1>
          <p className="text-sm text-slate-500">
            Updating generic workflow parameters for &quot;{workflow.name}&quot;
          </p>
        </div>

        <span className="text-xs font-mono text-slate-400 bg-slate-100 px-2.5 py-1 rounded border border-slate-200">
          ID: {workflow.id.slice(0, 8)}...
        </span>
      </div>

      <WorkflowForm initialData={workflow} isEditing={true} />
    </div>
  );
}
