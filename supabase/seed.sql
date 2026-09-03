-- CallFlow AI - Development Seed Data

-- Insert Sample Business 1: Clinic
INSERT INTO businesses (id, name, industry, phone, address, timezone, languages)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Metro Health Care Clinic',
  'clinic',
  '+1 555-0192',
  '123 Medical Center Way, Suite 400',
  'America/New_York',
  ARRAY['en', 'hi']
) ON CONFLICT (id) DO NOTHING;

-- Insert Sample Workflow 1: Clinic Appointment Booking
INSERT INTO workflows (id, business_id, name, trigger, greeting, questions, conditions, action, closing, active)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  'Clinic Appointment Booking',
  'missed_call',
  'Hello! Thank you for calling Metro Health Care Clinic. I noticed we missed your call. I am your AI assistant—how can I help you today?',
  '[
    {"name": "customer_name", "label": "Patient Name", "required": true, "type": "text"},
    {"name": "specialty", "label": "Doctor or Specialty", "required": true, "type": "text"},
    {"name": "date", "label": "Appointment Date", "required": true, "type": "date"},
    {"name": "time", "label": "Preferred Time", "required": true, "type": "time"}
  ]'::jsonb,
  '[
    {"field": "date", "operator": "within_24_hours", "result": "urgent"}
  ]'::jsonb,
  '{"type": "google_calendar", "calendar_id": "primary"}'::jsonb,
  'Thank you! Your appointment request has been scheduled and added to our calendar. Have a wonderful day!',
  true
) ON CONFLICT (id) DO NOTHING;

-- Insert Sample Business 2: Cake Shop
INSERT INTO businesses (id, name, industry, phone, address, timezone, languages)
VALUES (
  '33333333-3333-3333-3333-333333333333',
  'Sweet Dreams Bakery & Cakes',
  'cake_shop',
  '+1 555-0482',
  '456 Pastry Boulevard',
  'America/Chicago',
  ARRAY['en', 'hi']
) ON CONFLICT (id) DO NOTHING;

-- Insert Sample Workflow 2: Cake Order Enquiry
INSERT INTO workflows (id, business_id, name, trigger, greeting, questions, conditions, action, closing, active)
VALUES (
  '44444444-4444-4444-4444-444444444444',
  '33333333-3333-3333-3333-333333333333',
  'Cake Order Enquiry',
  'missed_call',
  'Hi there! Thanks for calling Sweet Dreams Bakery. Sorry we missed your call. Would you like to place a custom cake order or ask an enquiry?',
  '[
    {"name": "customer_name", "label": "Customer Name", "required": true, "type": "text"},
    {"name": "cake_type", "label": "Cake Type / Theme", "required": true, "type": "text"},
    {"name": "flavour", "label": "Flavour Choice", "required": true, "type": "text"},
    {"name": "weight", "label": "Weight / Servings", "required": true, "type": "text"},
    {"name": "date", "label": "Required Date", "required": true, "type": "date"},
    {"name": "delivery_preference", "label": "Pickup or Delivery", "required": true, "type": "select", "options": ["pickup", "delivery"]},
    {"name": "time", "label": "Preferred Pickup/Delivery Time", "required": true, "type": "time"}
  ]'::jsonb,
  '[
    {"field": "date", "operator": "within_24_hours", "result": "urgent"}
  ]'::jsonb,
  '{"type": "google_calendar", "operation": "create_event"}'::jsonb,
  'Awesome! We have received your cake order details. Our master baker will review it and get back to you shortly!',
  true
) ON CONFLICT (id) DO UPDATE SET
  questions = EXCLUDED.questions,
  action = EXCLUDED.action;
