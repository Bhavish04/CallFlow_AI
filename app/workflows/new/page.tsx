import { WorkflowForm } from '@/components/workflows/WorkflowForm';

export default function NewWorkflowPage() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Create Workflow</h1>
        <p className="text-sm text-slate-500">
          Build a generic missed-call callback workflow for customer info collection & scheduling.
        </p>
      </div>

      <WorkflowForm isEditing={false} />
    </div>
  );
}
