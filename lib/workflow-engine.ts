import { Workflow, QuestionField, ConditionRule, WorkflowAction } from '@/types/database';

export interface WorkflowEvaluationResult {
  missingRequiredFields: QuestionField[];
  isComplete: boolean;
  priority: 'normal' | 'urgent' | string;
  actionRequired: boolean;
  actionType: WorkflowAction['type'] | null;
  actionOperation: WorkflowAction['operation'] | null;
  matchedConditions: ConditionRule[];
}

export function getWorkflowActionType(workflow: Workflow | undefined | null): string {
  if (!workflow || !workflow.action) return 'none';
  if (typeof workflow.action === 'string') {
    return workflow.action;
  }
  if (typeof workflow.action === 'object' && workflow.action !== null) {
    if ('type' in workflow.action && typeof workflow.action.type === 'string') {
      return workflow.action.type;
    }
  }
  return 'none';
}

export function getRequiredFields(workflow: Workflow): QuestionField[] {
  if (!workflow || !Array.isArray(workflow.questions)) return [];
  return workflow.questions.filter((q) => q.required);
}

export function getMissingRequiredFields(
  workflow: Workflow,
  collectedData: Record<string, unknown>
): QuestionField[] {
  const required = getRequiredFields(workflow);
  return required.filter((q) => {
    const val = collectedData ? collectedData[q.name] : undefined;
    if (val === undefined || val === null) return true;
    if (typeof val === 'string' && val.trim() === '') return true;
    if (Array.isArray(val) && val.length === 0) return true;
    return false;
  });
}

export function isWorkflowComplete(
  workflow: Workflow,
  collectedData: Record<string, unknown>
): boolean {
  return getMissingRequiredFields(workflow, collectedData).length === 0;
}

export function evaluateConditions(
  workflow: Workflow,
  collectedData: Record<string, unknown>,
  businessTimezone: string = 'UTC'
): { priority: 'normal' | 'urgent' | string; matchedConditions: ConditionRule[] } {
  if (!workflow || !Array.isArray(workflow.conditions) || workflow.conditions.length === 0) {
    return { priority: 'normal', matchedConditions: [] };
  }

  const matchedConditions: ConditionRule[] = [];
  let priority: 'normal' | 'urgent' | string = 'normal';

  for (const cond of workflow.conditions) {
    const val = collectedData ? collectedData[cond.field] : undefined;
    if (val === undefined || val === null) continue;

    let isMatch = false;
    const strVal = String(val).trim().toLowerCase();
    const condVal = cond.value !== undefined && cond.value !== null ? String(cond.value).trim().toLowerCase() : '';

    switch (cond.operator) {
      case 'equals':
        isMatch = strVal === condVal;
        break;

      case 'not_equals':
        isMatch = strVal !== condVal;
        break;

      case 'contains':
        isMatch = strVal.includes(condVal);
        break;

      case 'within_24_hours': {
        // Attempt date parsing
        try {
          const dateStr = String(val).trim();
          const targetDate = new Date(dateStr);
          if (!isNaN(targetDate.getTime())) {
            const now = new Date();
            const diffMs = targetDate.getTime() - now.getTime();
            // If date is within next 24 hours (or today/past within 24h)
            if (diffMs >= -12 * 3600 * 1000 && diffMs <= 24 * 3600 * 1000) {
              isMatch = true;
            }
          } else {
            // Check keywords
            if (strVal.includes('today') || strVal.includes('tomorrow') || strVal.includes('urgent')) {
              isMatch = true;
            }
          }
        } catch {
          // ignore date parse errors
        }
        break;
      }

      default:
        isMatch = false;
    }

    if (isMatch) {
      matchedConditions.push(cond);
      if (cond.result) {
        priority = cond.result;
      }
    }
  }

  return { priority, matchedConditions };
}

export function evaluateWorkflowState(
  workflow: Workflow,
  collectedData: Record<string, unknown>,
  businessTimezone: string = 'UTC'
): WorkflowEvaluationResult {
  const missingRequiredFields = getMissingRequiredFields(workflow, collectedData);
  const complete = missingRequiredFields.length === 0;
  const { priority, matchedConditions } = evaluateConditions(workflow, collectedData, businessTimezone);

  let actionRequired = false;
  let actionType: WorkflowAction['type'] | null = null;
  let actionOperation: WorkflowAction['operation'] | null = null;

  const actionTypeStr = getWorkflowActionType(workflow);
  if (complete && actionTypeStr !== 'none') {
    actionRequired = true;
    actionType = actionTypeStr as WorkflowAction['type'];
    actionOperation = (typeof workflow.action === 'object' && workflow.action?.operation) || 'create_event';
  }

  return {
    missingRequiredFields,
    isComplete: complete,
    priority,
    actionRequired,
    actionType,
    actionOperation,
    matchedConditions,
  };
}
