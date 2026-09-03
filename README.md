# CallFlow AI — Workflow-Driven AI Missed-Call & Voice Assistant

CallFlow AI is an enterprise-grade, generic AI conversation and workflow automation platform designed for small-to-medium businesses (clinics, bakeries, service shops, consultancies). It automatically handles missed calls by initiating intelligent text or voice callbacks, collecting structured parameters, executing live Google Calendar operations (availability, booking, rescheduling, cancellation), and organizing follow-up tasks in a modern CRM dashboard.

---

## 📋 The Problem

Small businesses lose up to 30–40% of prospective customers due to unanswered calls during business hours, peak operational rushes, or after-hours. Traditional phone solutions rely either on expensive call centers or rigid IVR keypads that fail to collect complex requirements such as appointment dates, medical specialties, or custom order specifications.

---

## 💡 The Solution

CallFlow AI provides a **completely industry-agnostic, workflow-driven AI assistant**:
1. **Automated Callback**: Triggers an interactive text or voice callback when an incoming call is missed.
2. **Generic Workflow Engine**: Allows business owners to define dynamic question fields, condition rules, and integrations without code customization.
3. **Structured Parameter Extraction**: Uses Groq LLM inference with strict proof-of-work extraction guards to reliably populate fields and resolve relative dates (e.g. "tomorrow at 4 PM" relative to business timezone).
4. **Google Calendar Tool Suite**: Checks slot availability, prompts callers for explicit confirmation, and executes live calendar events (create, update/reschedule, cancel) via OAuth 2.0.
5. **Voice AI Pipeline**: Integrates Deepgram Nova-2 Speech-to-Text (STT) and ElevenLabs Text-to-Speech (TTS) supporting natural English, Hindi, and Hinglish interactions.
6. **CRM Dashboard**: Gives business owners real-time visibility into customer call transcripts, extracted parameters, AI summaries, priority flags, and follow-up tasks.

---

## ✨ Key Features

- 🏢 **Multi-Industry Business Profiles**: Define business timezone, phone number, address, and supported languages.
- ⚙️ **Generic Workflow Builder**: Build, reorder, and activate custom workflows with text, date, time, select, and numeric fields.
- 🤖 **Groq AI Engine**: Powered by Groq cloud inference (`openai/gpt-oss-20b`) via OpenAI-compatible SDK with automated fallback models.
- 📅 **Google Calendar Lifecycle**: Live availability checking (`list`), event creation (`insert`), rescheduling (`patch`), and cancellation (`delete`).
- 🛡️ **Server-Side State Machine & Guards**: Guarantees availability check before booking, explicit confirmation before calendar mutations, and blocks false completion claims without valid calendar IDs.
- 🎙️ **Voice Simulation Pipeline**: MediaRecorder audio recording in browser connected to Deepgram STT and ElevenLabs TTS.
- 🇮🇳 **Multi-Lingual Handling**: Seamlessly understands and responds in English, Hindi (Devanagari), or Hinglish based on caller input.
- 📊 **CRM Owner Dashboard**: Searchable conversation list, priority indicators (`URGENT`, `HIGH`, `NORMAL`, `LOW`), transcript timeline, and follow-up task notes.
- 📱 **Mobile-First Responsive UI**: Built with Next.js App Router, Tailwind CSS, and Lucide React Icons.

---

## 🏗️ Architecture

```
   [ Customer / Browser Simulator ]
                  │
                  ▼ (Text or MediaRecorder WebM/MP3 Audio)
     [ Next.js App Router APIs ]
                  │
      ┌───────────┴───────────┐
      ▼                       ▼
[ Deepgram STT ]     [ ElevenLabs TTS ]
 (Audio -> Text)     (Text -> Audio)
      │                       ▲
      └───────────┬───────────┘
                  │
                  ▼
        [ API: /api/ai/chat ]
                  │
                  ▼
      [ Generic Workflow Engine ]
                  │
                  ▼
   [ Groq AI Agent (openai/gpt-oss-20b) ]
                  │
      ┌───────────┴───────────┐
      ▼                       ▼
[ State Machine Guards ] [ Google Calendar Tool Suite ]
(Availability / Proof)   (Check / Create / Patch / Delete)
      │                       │
      └───────────┬───────────┘
                  │
                  ▼
      [ Supabase PostgreSQL ]
   (Conversations, Workflows, FollowUps)
```

---

## 🔄 Google Calendar Lifecycle & State Machine

CallFlow AI enforces a strict server-side state machine for calendar workflows:

```
[ Stage 1: Data Collection ] ──> [ Stage 2: Availability Check ] ──> [ Stage 3: Caller Confirmation ] ──> [ Stage 4: Tool Execution ]
   (Calendar Status: IDLE)          (Status: CHECKING -> AVAILABLE)     (Status: AWAITING_CONFIRMATION)     (Status: EVENT_CREATED / CANCELLED)
```

1. **Stage 1 — Data Collection**: Prompts caller for missing required workflow fields (e.g., patient name, date, time). Google Calendar status remains `IDLE`.
2. **Stage 2 — Availability Check**: Once date and time are collected, the engine invokes `checkCalendarAvailability`. Status transitions to `CHECKING` then `AVAILABLE` or `UNAVAILABLE`.
3. **Stage 3 — Confirmation**: When a slot is available, the agent asks the caller for explicit confirmation. Status transitions to `AWAITING_CONFIRMATION`.
4. **Stage 4 — Tool Execution**: Upon caller confirmation ("yes, book it" / "haan confirm kar do"), the agent executes `createCalendarEvent`, sets status to `EVENT_CREATED`, persists the valid event ID, and sets `workflowComplete = true`.
- **Rescheduling Flow**: If an existing booking exists (`EVENT_CREATED`) and caller requests a date/time change, the system checks availability for the new time, prompts for confirmation, and executes `updateCalendarEvent` (`patch`).
- **Cancellation Flow**: If caller requests cancellation for an existing booking, the agent prompts for confirmation and executes `cancelCalendarEvent` (`delete`), updating status to `CANCELLED`.
- **Idempotency & Safety Guard**: The system strictly blocks the AI from claiming an appointment is booked or updated unless a valid Google Calendar API tool call completes successfully.

---

## 📞 Note on Telephony & Simulator

The submitted application includes an interactive **AI Simulator** (`/simulator`) to demonstrate text and voice missed-call callback workflows directly in the browser. 

*Note: Real telephony (Twilio, Plivo, Exotel) is not included in this single-tenant demo. In a production environment, incoming missed calls would trigger an HTTP POST webhook to `/api/telephony/missed-call` to initiate the callback sequence.*

---

## 💼 Demo Workflows (Generic Engine)

CallFlow AI includes two demo workflows to demonstrate flexibility across industries:

1. **Metro Health Care Clinic — Clinic Appointment Booking**:
   - Questions: Patient Name, Doctor or Specialty, Appointment Date, Preferred Time.
   - Business Logic: Checks appointment date within 24 hours to set priority to `URGENT`. Checks Google Calendar slot availability and schedules appointments.
2. **Sweet Dreams Bakery & Cakes — Cake Order Enquiry**:
   - Questions: Customer Name, Cake Type / Theme, Flavour Choice, Weight / Servings, Required Date, Pickup or Delivery, Preferred Pickup/Delivery Time.
   - Business Logic: Collects order requirements and pickup/delivery schedule window, verifying bakery availability.

*Both workflows execute on the exact same generic workflow engine (`lib/workflow-engine.ts`) driven by JSON definitions in the database without industry-specific hardcoding.*

---

## 📁 Project Structure

```
callflow-ai/
├── app/                        # Next.js App Router pages & API routes
│   ├── api/                    # Server-side API endpoints
│   │   ├── ai/chat/            # Core AI conversation & state machine route
│   │   ├── voice/transcribe/   # Deepgram STT transcription handler
│   │   ├── voice/speak/        # ElevenLabs TTS synthesis handler
│   │   ├── business/           # Business profile management
│   │   ├── workflows/          # Workflow CRUD operations
│   │   ├── conversations/      # Conversation history & transcript retrieval
│   │   └── followups/          # CRM Follow-up task management
│   ├── business/               # Business profile settings page
│   ├── conversations/          # Owner CRM conversation details & dashboard
│   ├── dashboard/              # Analytics & summary dashboard
│   ├── simulator/              # Interactive text/voice missed-call simulator
│   ├── workflows/              # Workflow builder & list management
│   └── page.tsx                # Home landing page
├── components/                 # React UI components
│   ├── business/               # Business profile forms
│   ├── conversations/          # Conversation timeline & follow-up panels
│   ├── dashboard/              # Metrics & analytics cards
│   ├── followups/              # Follow-up task manager
│   ├── simulator/              # Audio recorder & chat simulator UI
│   ├── workflows/              # Dynamic question builder & conditions editor
│   └── common/                 # Header, Sidebar, and Layout components
├── lib/                        # Core backend & business logic modules
│   ├── ai-agent.ts             # AI agent, state machine guards, response sanitizer
│   ├── workflow-engine.ts      # Generic workflow state evaluation & priority rules
│   ├── google-calendar.ts      # Google Calendar API v3 tool suite (CRUD)
│   ├── date-utils.ts           # Natural date/time normalization helpers
│   ├── openai.ts               # Groq / OpenAI client configuration & fallbacks
│   └── supabase.ts             # Supabase PostgreSQL client setup
├── types/                      # TypeScript database interfaces & state types
│   └── database.ts             # Business, Workflow, Conversation, FollowUp definitions
├── supabase/                   # Database migrations & schemas
│   └── schema.sql              # Supabase PostgreSQL DDL tables & indexes
├── public/                     # Static media & branding assets
├── .env.example                # Environment variables template (placeholders only)
├── next.config.ts              # Next.js configuration
├── package.json                # Repository dependencies & scripts
├── README.md                   # System documentation
└── tsconfig.json               # TypeScript strict configuration
```

---

## 🗄️ Database Schema

The system uses Supabase PostgreSQL with dynamic JSONB fields to support arbitrary workflow structures:

- **`businesses`**: Stores business profile metadata (ID, name, industry, timezone, phone, address, supported languages).
- **`workflows`**: Stores dynamic workflow definitions (ID, business ID, name, trigger type, question fields array, closing message, calendar action configuration, conditional priority rules, active flag).
- **`conversations`**: Records individual caller interactions (ID, business ID, workflow ID, customer name, customer phone, transcript JSON array, extracted parameters JSON, missing fields array, workflow completion status, priority flag, calendar status, calendar event ID, summary).
- **`followups`**: Action items generated for business owners (ID, conversation ID, business ID, title, notes, status, due date).

---

## 🔑 Environment Variables

Copy `.env.example` to `.env.local` for local execution:

```bash
cp .env.example .env.local
```

| Variable | Category | Description | Required |
| --- | --- | --- | --- |
| `GROQ_API_KEY` | AI Engine | API key for Groq cloud inference service | **Yes** |
| `GROQ_MODEL` | AI Engine | Primary model name (defaults to `openai/gpt-oss-20b`) | Optional |
| `NEXT_PUBLIC_SUPABASE_URL` | Database | Supabase project URL | **Yes** |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Database | Supabase public anonymous key | **Yes** |
| `SUPABASE_SERVICE_ROLE_KEY` | Database | Supabase service role key for backend routes | **Yes** |
| `GOOGLE_CLIENT_ID` | Calendar | Google OAuth 2.0 Client ID | Optional (Calendar) |
| `GOOGLE_CLIENT_SECRET` | Calendar | Google OAuth 2.0 Client Secret | Optional (Calendar) |
| `GOOGLE_REDIRECT_URI` | Calendar | Google OAuth redirect URI (e.g. Playground) | Optional (Calendar) |
| `GOOGLE_REFRESH_TOKEN` | Calendar | Google OAuth Refresh Token for primary calendar | Optional (Calendar) |
| `GOOGLE_CALENDAR_ID` | Calendar | Target calendar identifier (defaults to `primary`) | Optional (Calendar) |
| `DEEPGRAM_API_KEY` | Voice STT | Deepgram Nova-2 API key for audio transcription | Optional (Voice) |
| `ELEVENLABS_API_KEY` | Voice TTS | ElevenLabs API key for voice synthesis | Optional (Voice) |
| `ELEVENLABS_VOICE_ID` | Voice TTS | ElevenLabs Voice ID for TTS playback | Optional (Voice) |

---

## 🚀 Local Setup & Installation

### 1. Prerequisites
- Node.js 18+ installed on your machine.
- A Supabase PostgreSQL database project.
- A Groq API key (`GROQ_API_KEY`).

### 2. Clone & Install Dependencies
```bash
git clone https://github.com/your-repo/callflow-ai.git
cd callflow-ai
npm install
```

### 3. Database Schema Import
Execute the SQL statements located in `supabase/schema.sql` in your Supabase SQL Editor.

### 4. Configure Local Environment
Create `.env.local` from `.env.example` and populate your credentials:
```bash
cp .env.example .env.local
```

### 5. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Testing & Verification

The codebase includes strict static typing and production build validation commands:

```bash
# TypeScript strict type checking
npx tsc --noEmit

# Production build validation
npm run build
```

---

## 🎥 Reviewer Demonstration Guide (Loom Video Setup)

To demonstrate the full capabilities of CallFlow AI for review:

1. **Business Setup**: Navigate to `/business` and verify or select the active business profile (e.g., Metro Health Care Clinic or Sweet Dreams Bakery & Cakes).
2. **Workflow Builder**: Navigate to `/workflows` to view the dynamic question fields and condition rules.
3. **Clinic Appointment Flow**:
   - Open `/simulator`. Select the **Clinic Appointment Booking** workflow for Metro Health Care Clinic.
   - Enter caller message: *"Mujhe appointment book karni hai. Mera naam Aditya hai."*
   - Provide specialty: *"Dentist"*.
   - Provide date: *"Tomorrow"* (or *"4 September"*).
   - Provide time: *"2 PM"*.
   - Observe Google Calendar checking status transition to `AVAILABLE` and prompt for confirmation.
   - Confirm: *"Haan confirm kar do"*.
   - Verify calendar status becomes `EVENT_CREATED` and event ID is generated.
4. **Reschedule & Cancellation Demo**:
   - Request time change: *"Move my appointment to 5 PM"*. Verify `updateCalendarEvent` patches the booking.
   - Request cancellation: *"Cancel my appointment"*. Verify `cancelCalendarEvent` deletes the event.
5. **Bakery Custom Order Flow**:
   - Select **Cake Order Enquiry** workflow for Sweet Dreams Bakery & Cakes in `/simulator`.
   - Provide order details: *"I want a Fruit cake, Mango flavor, 1 kg, pickup tomorrow at 4 PM"*.
   - Verify extraction of parameters without defaulting unprovided fields.
6. **CRM Dashboard Inspection**:
   - Navigate to `/conversations`. Select the recent conversation to inspect the transcript, extracted state panel, priority badge, and create a follow-up task.

---

## 🛡️ Security & Privacy

- **Server-Side Credentials**: All sensitive API keys (`GROQ_API_KEY`, `GOOGLE_CLIENT_SECRET`, `DEEPGRAM_API_KEY`, `ELEVENLABS_API_KEY`) are accessed strictly inside server-side API routes and never exposed to client browser bundles.
- **Client Exposure**: Only public variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) are exposed to client code.
- **Row Level Security (RLS)**: PostgreSQL tables have RLS policies configured.

---

## 🔮 Production Considerations & Future Improvements

For full production deployment, the following extensions can be integrated:
- **Telephony Integration**: Connecting Twilio/Plivo/Exotel missed-call webhooks to automated IVR callbacks.
- **Multi-Tenant Authentication**: Integrating Supabase Auth with organization-level RLS authorization policies.
- **SMS & Messaging Callbacks**: Sending WhatsApp or SMS booking confirmations via Twilio or Gupshup APIs.
- **Observability & Analytics**: Adding Helicone or Sentry telemetry for tracking LLM token usage and latency.

---

## 📄 License

MIT License. Developed for CallFlow AI Project.
