-- CallFlow AI - Database Schema (Supabase / PostgreSQL)
-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. BUSINESSES TABLE
CREATE TABLE IF NOT EXISTS businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  industry TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  languages TEXT[] NOT NULL DEFAULT ARRAY['en'],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. WORKFLOWS TABLE
CREATE TABLE IF NOT EXISTS workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  trigger TEXT NOT NULL DEFAULT 'missed_call',
  greeting TEXT NOT NULL,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  conditions JSONB DEFAULT '[]'::jsonb,
  action JSONB NOT NULL DEFAULT '{}'::jsonb,
  closing TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. CONVERSATIONS TABLE
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  workflow_id UUID REFERENCES workflows(id) ON DELETE SET NULL,
  customer_name TEXT,
  phone TEXT NOT NULL,
  intent TEXT,
  status TEXT NOT NULL DEFAULT 'completed',
  priority TEXT NOT NULL DEFAULT 'normal',
  collected_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  summary TEXT,
  action_performed TEXT,
  calendar_event_id TEXT NULL,
  transcript JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ALTER CONVERSATIONS TABLE TO GUARANTEE CALENDAR_EVENT_ID COLUMN
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS calendar_event_id TEXT NULL;

-- 4. FOLLOWUPS TABLE
CREATE TABLE IF NOT EXISTS followups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- INDEXES FOR FAST QUERYING AND JOIN PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_workflows_business_id ON workflows(business_id);
CREATE INDEX IF NOT EXISTS idx_conversations_business_id ON conversations(business_id);
CREATE INDEX IF NOT EXISTS idx_conversations_workflow_id ON conversations(workflow_id);
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_followups_conversation_id ON followups(conversation_id);
CREATE INDEX IF NOT EXISTS idx_followups_status ON followups(status);

-- AUTOMATIC UPDATED_AT TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ATTACH UPDATED_AT TRIGGERS
DROP TRIGGER IF EXISTS set_businesses_updated_at ON businesses;
CREATE TRIGGER set_businesses_updated_at
  BEFORE UPDATE ON businesses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_workflows_updated_at ON workflows;
CREATE TRIGGER set_workflows_updated_at
  BEFORE UPDATE ON workflows
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_conversations_updated_at ON conversations;
CREATE TRIGGER set_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_followups_updated_at ON followups;
CREATE TRIGGER set_followups_updated_at
  BEFORE UPDATE ON followups
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ROW LEVEL SECURITY (RLS) POLICIES FOR ANON ACCESS
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE followups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on businesses" ON businesses;
CREATE POLICY "Allow all on businesses" ON businesses FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on workflows" ON workflows;
CREATE POLICY "Allow all on workflows" ON workflows FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on conversations" ON conversations;
CREATE POLICY "Allow all on conversations" ON conversations FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on followups" ON followups;
CREATE POLICY "Allow all on followups" ON followups FOR ALL USING (true) WITH CHECK (true);
