export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Business {
  id: string;
  name: string;
  industry: string;
  phone: string | null;
  address: string | null;
  timezone: string;
  languages: string[];
  created_at: string;
  updated_at: string;
}

export interface QuestionField {
  name: string;
  label: string;
  required: boolean;
  type: 'text' | 'phone' | 'date' | 'time' | 'number' | 'select' | 'boolean';
  description?: string;
  options?: string[];
}

export interface ConditionRule {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'within_24_hours' | 'greater_than' | 'less_than';
  value?: string | number | boolean;
  result: 'urgent' | 'normal' | string;
}

export interface WorkflowAction {
  type: 'none' | 'google_calendar' | 'owner_notification' | 'external_api' | 'callback_task';
  operation?: 'check_availability' | 'create_event' | 'update_event' | 'cancel_event';
  calendar_id?: string;
  endpoint?: string;
  channel?: string;
  details?: Record<string, Json>;
}

export interface Workflow {
  id: string;
  business_id: string;
  name: string;
  trigger: string;
  greeting: string;
  questions: QuestionField[];
  conditions: ConditionRule[];
  action: WorkflowAction;
  closing: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TranscriptMessage {
  role: 'system' | 'assistant' | 'user';
  content: string;
  timestamp?: string;
  tool_calls?: Array<{
    name: string;
    args: Record<string, unknown>;
    result?: unknown;
  }>;
}

export interface Conversation {
  id: string;
  business_id: string;
  workflow_id: string | null;
  customer_name: string | null;
  phone: string;
  intent: string | null;
  status: 'in_progress' | 'completed' | 'failed' | string;
  priority: 'normal' | 'urgent' | string;
  collected_data: Record<string, unknown>;
  summary: string | null;
  action_performed: string | null;
  calendar_event_id?: string | null;
  transcript: TranscriptMessage[];
  created_at: string;
  updated_at: string;
}

export interface Followup {
  id: string;
  conversation_id: string;
  status: 'pending' | 'contacted' | 'completed' | 'closed';
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface Database {
  public: {
    Tables: {
      businesses: {
        Row: Business;
        Insert: Omit<Business, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Business, 'id'>>;
      };
      workflows: {
        Row: Workflow;
        Insert: Omit<Workflow, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Workflow, 'id'>>;
      };
      conversations: {
        Row: Conversation;
        Insert: Omit<Conversation, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Conversation, 'id'>>;
      };
      followups: {
        Row: Followup;
        Insert: Omit<Followup, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Followup, 'id'>>;
      };
    };
  };
}
