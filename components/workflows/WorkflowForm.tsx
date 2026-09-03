'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  GitFork, 
  Plus, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Save, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  Calendar, 
  Layers, 
  HelpCircle, 
  FileText
} from 'lucide-react';
import { Workflow, QuestionField, ConditionRule, WorkflowAction } from '@/types/database';

interface WorkflowFormProps {
  initialData?: Workflow;
  isEditing?: boolean;
}

export function WorkflowForm({ initialData, isEditing = false }: WorkflowFormProps) {
  const router = useRouter();

  // Basic Info
  const [name, setName] = useState(initialData?.name || '');
  const [trigger, setTrigger] = useState(initialData?.trigger || 'missed_call');
  const [greeting, setGreeting] = useState(
    initialData?.greeting || 'Hi! Thank you for calling. Sorry we missed your call. How can I help you today?'
  );
  const [closing, setClosing] = useState(
    initialData?.closing || 'Thank you! Your request has been recorded successfully.'
  );
  const [active, setActive] = useState(initialData?.active ?? true);

  // Dynamic Questions list
  const [questions, setQuestions] = useState<QuestionField[]>(
    initialData?.questions || [
      { name: 'customer_name', label: 'Customer Name', type: 'text', required: true, description: 'Name of the caller' },
    ]
  );

  // Dynamic Conditions list
  const [conditions, setConditions] = useState<ConditionRule[]>(initialData?.conditions || []);

  // Action configuration
  const [actionType, setActionType] = useState<WorkflowAction['type']>(
    initialData?.action?.type || 'none'
  );
  const [actionOperation, setActionOperation] = useState<WorkflowAction['operation']>(
    initialData?.action?.operation || 'create_event'
  );

  // UI state
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // QUESTION HANDLERS
  function addQuestion() {
    const index = questions.length + 1;
    setQuestions([
      ...questions,
      {
        name: `field_${index}`,
        label: `Field ${index}`,
        type: 'text',
        required: true,
        description: '',
      },
    ]);
  }

  function updateQuestion(index: number, updated: Partial<QuestionField>) {
    setQuestions((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...updated };
      return copy;
    });
  }

  function removeQuestion(index: number) {
    if (questions.length === 1) {
      alert('A workflow must contain at least one question field.');
      return;
    }
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  }

  function moveQuestion(index: number, direction: 'up' | 'down') {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= questions.length) return;
    setQuestions((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });
  }

  // CONDITION HANDLERS
  function addCondition() {
    const defaultField = questions.length > 0 ? questions[0].name : 'date';
    setConditions([
      ...conditions,
      {
        field: defaultField,
        operator: 'within_24_hours',
        value: '',
        result: 'urgent',
      },
    ]);
  }

  function updateCondition(index: number, updated: Partial<ConditionRule>) {
    setConditions((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...updated };
      return copy;
    });
  }

  function removeCondition(index: number) {
    setConditions((prev) => prev.filter((_, i) => i !== index));
  }

  // SUBMIT VALIDATION & PERSISTENCE
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    // Validation
    if (!name.trim()) {
      setErrorMsg('Workflow name is required.');
      return;
    }
    if (!greeting.trim()) {
      setErrorMsg('Greeting message is required.');
      return;
    }
    if (!closing.trim()) {
      setErrorMsg('Closing message is required.');
      return;
    }

    if (questions.length === 0) {
      setErrorMsg('At least one question field is required.');
      return;
    }

    // Check question keys
    const keys = new Set<string>();
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.name || !q.name.trim()) {
        setErrorMsg(`Question #${i + 1} requires an internal key/name.`);
        return;
      }
      if (!q.label || !q.label.trim()) {
        setErrorMsg(`Question #${i + 1} requires a display label.`);
        return;
      }
      const cleanKey = q.name.trim().toLowerCase();
      if (keys.has(cleanKey)) {
        setErrorMsg(`Duplicate question key "${q.name}". All field keys must be unique.`);
        return;
      }
      keys.add(cleanKey);

      if (q.type === 'select' && (!q.options || q.options.length === 0)) {
        setErrorMsg(`Select field "${q.label}" requires at least one option.`);
        return;
      }
    }

    const actionConfig: WorkflowAction = {
      type: actionType,
      ...(actionType === 'google_calendar' ? { operation: actionOperation } : {}),
    };

    const payload = {
      name: name.trim(),
      trigger,
      greeting: greeting.trim(),
      closing: closing.trim(),
      active,
      questions,
      conditions,
      action: actionConfig,
    };

    try {
      setSaving(true);

      const url = isEditing && initialData?.id ? `/api/workflows/${initialData.id}` : '/api/workflows';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save workflow.');
      }

      setSuccessMsg(isEditing ? 'Workflow updated successfully!' : 'Workflow created successfully!');
      setTimeout(() => {
        router.push('/workflows');
        router.refresh();
      }, 800);
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : 'Error saving workflow.';
      setErrorMsg(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Alert Banners */}
      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* SECTION 1: BASIC WORKFLOW INFO */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
          <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <GitFork className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">1. Basic Information</h2>
            <p className="text-xs text-slate-500">Define general workflow triggers and initial assistant greetings</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Workflow Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Clinic Appointment Booking"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Trigger Event</label>
            <select
              value={trigger}
              onChange={(e) => setTrigger(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="missed_call">Missed Call Callback</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Opening Greeting Message <span className="text-red-500">*</span>
          </label>
          <textarea
            required
            rows={2}
            value={greeting}
            onChange={(e) => setGreeting(e.target.value)}
            placeholder="Hi! Thank you for calling... how can I help you today?"
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Closing Confirmation Message <span className="text-red-500">*</span>
          </label>
          <textarea
            required
            rows={2}
            value={closing}
            onChange={(e) => setClosing(e.target.value)}
            placeholder="Thanks! Your appointment request has been processed."
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <div className="pt-2 flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <span>Enable Workflow Immediately (Active)</span>
          </label>
        </div>
      </div>

      {/* SECTION 2: DYNAMIC QUESTIONS BUILDER */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">2. Questions / Data Fields to Collect</h2>
              <p className="text-xs text-slate-500">Configure parameters for the AI agent to ask and extract from callers</p>
            </div>
          </div>
          <button
            type="button"
            onClick={addQuestion}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-semibold rounded-lg transition-colors border border-indigo-200"
          >
            <Plus className="w-3.5 h-3.5" /> Add Question
          </button>
        </div>

        {questions.length === 0 ? (
          <div className="p-4 bg-slate-50 rounded-lg text-center text-xs text-slate-500">
            No question fields added yet. Click &quot;Add Question&quot; to define customer parameters.
          </div>
        ) : (
          <div className="space-y-4">
            {questions.map((q, idx) => (
              <div
                key={idx}
                className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 space-y-3 relative transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 bg-white px-2.5 py-0.5 rounded border border-slate-200">
                    Question #{idx + 1}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => moveQuestion(idx, 'up')}
                      disabled={idx === 0}
                      className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                      title="Move Up"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveQuestion(idx, 'down')}
                      disabled={idx === questions.length - 1}
                      className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                      title="Move Down"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeQuestion(idx)}
                      className="p-1 text-slate-400 hover:text-red-600 ml-1"
                      title="Delete Question"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Internal Key / Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={q.name}
                      onChange={(e) => updateQuestion(idx, { name: e.target.value.replace(/\s+/g, '_') })}
                      placeholder="e.g. date, specialty, cake_type"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-900 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Display Label <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={q.label}
                      onChange={(e) => updateQuestion(idx, { label: e.target.value })}
                      placeholder="e.g. Preferred Date, Doctor Specialty"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Field Type</label>
                    <select
                      value={q.type}
                      onChange={(e) => updateQuestion(idx, { type: e.target.value as QuestionField['type'] })}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-900"
                    >
                      <option value="text">Text / General</option>
                      <option value="phone">Phone Number</option>
                      <option value="date">Date</option>
                      <option value="time">Time</option>
                      <option value="number">Number / Amount</option>
                      <option value="select">Select Dropdown</option>
                    </select>
                  </div>
                </div>

                {q.type === 'select' && (
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Select Options (Comma-separated) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={q.options ? q.options.join(', ') : ''}
                      onChange={(e) =>
                        updateQuestion(idx, {
                          options: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                        })
                      }
                      placeholder="e.g. pickup, delivery"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-900"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between pt-1">
                  <input
                    type="text"
                    value={q.description || ''}
                    onChange={(e) => updateQuestion(idx, { description: e.target.value })}
                    placeholder="Optional help description for assistant..."
                    className="flex-1 px-2.5 py-1 bg-white border border-slate-200 rounded text-[11px] text-slate-600 mr-4"
                  />

                  <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-slate-700 shrink-0">
                    <input
                      type="checkbox"
                      checked={q.required}
                      onChange={(e) => updateQuestion(idx, { required: e.target.checked })}
                      className="w-3.5 h-3.5 text-blue-600 rounded"
                    />
                    <span>Required</span>
                  </label>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 3: GENERIC CONDITION BUILDER */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">3. Conditional Rules</h2>
              <p className="text-xs text-slate-500">Configure conditional logic to flag responses (e.g., date &lt; 24h &rarr; urgent)</p>
            </div>
          </div>
          <button
            type="button"
            onClick={addCondition}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 hover:bg-amber-100 text-xs font-semibold rounded-lg transition-colors border border-amber-200"
          >
            <Plus className="w-3.5 h-3.5" /> Add Condition
          </button>
        </div>

        {conditions.length === 0 ? (
          <div className="p-4 bg-slate-50 rounded-lg text-center text-xs text-slate-500">
            No conditional rules defined. Default priority will be &quot;normal&quot;.
          </div>
        ) : (
          <div className="space-y-3">
            {conditions.map((cond, idx) => (
              <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-wrap items-center gap-3 text-xs">
                <span className="font-semibold text-slate-600">IF Field</span>

                {/* Field Selector */}
                <select
                  value={cond.field}
                  onChange={(e) => updateCondition(idx, { field: e.target.value })}
                  className="px-2.5 py-1.5 bg-white border border-slate-300 rounded font-mono text-slate-900"
                >
                  {questions.map((q) => (
                    <option key={q.name} value={q.name}>
                      {q.name} ({q.label})
                    </option>
                  ))}
                  <option value="custom">Custom Field</option>
                </select>

                {/* Operator Selector */}
                <select
                  value={cond.operator}
                  onChange={(e) => updateCondition(idx, { operator: e.target.value as ConditionRule['operator'] })}
                  className="px-2.5 py-1.5 bg-white border border-slate-300 rounded text-slate-900"
                >
                  <option value="within_24_hours">is within 24 hours</option>
                  <option value="equals">equals</option>
                  <option value="not_equals">does not equal</option>
                  <option value="contains">contains</option>
                </select>

                {/* Value input if needed */}
                {cond.operator !== 'within_24_hours' && (
                  <input
                    type="text"
                    value={String(cond.value || '')}
                    onChange={(e) => updateCondition(idx, { value: e.target.value })}
                    placeholder="Compare value..."
                    className="px-2.5 py-1.5 bg-white border border-slate-300 rounded text-slate-900"
                  />
                )}

                <span className="font-semibold text-slate-600">&rarr; Set Priority:</span>
                <select
                  value={cond.result}
                  onChange={(e) => updateCondition(idx, { result: e.target.value })}
                  className="px-2.5 py-1.5 bg-white border border-slate-300 rounded text-slate-900 font-semibold text-red-600"
                >
                  <option value="urgent">urgent</option>
                  <option value="normal">normal</option>
                </select>

                <button
                  type="button"
                  onClick={() => removeCondition(idx)}
                  className="p-1 text-slate-400 hover:text-red-600 ml-auto"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 4: ACTION CONFIGURATION */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">4. Target Integration / Action</h2>
            <p className="text-xs text-slate-500">Configure external tools to invoke after collecting details</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Target Tool Integration</label>
            <select
              value={actionType}
              onChange={(e) => setActionType(e.target.value as WorkflowAction['type'])}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="none">None / Owner Dashboard Notification</option>
              <option value="google_calendar">Google Calendar Tool Calling</option>
            </select>
          </div>

          {actionType === 'google_calendar' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Google Calendar Operation</label>
              <select
                value={actionOperation}
                onChange={(e) => setActionOperation(e.target.value as WorkflowAction['operation'])}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="create_event">Create Calendar Event</option>
                <option value="check_availability">Check Availability Only</option>
                <option value="update_event">Update / Reschedule Event</option>
                <option value="cancel_event">Cancel Event</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* SUBMIT BUTTON BAR */}
      <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.push('/workflows')}
          className="px-4 py-2 text-slate-600 hover:text-slate-900 text-xs font-semibold"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold text-sm rounded-lg shadow-xs transition-colors"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Saving Workflow...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>{isEditing ? 'Save Changes' : 'Create Workflow'}</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
