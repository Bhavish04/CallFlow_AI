'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  PhoneCall,
  Sparkles,
  Calendar,
  Mic,
  Bot,
  Clock,
  CheckCircle2,
  ArrowRight,
  LayoutDashboard,
  Sliders,
  MessageSquare,
  ShieldCheck,
  Stethoscope,
  Cake,
  Building2,
  Wrench,
  Menu,
  X,
  ChevronRight,
  User,
  CalendarCheck,
  AlertCircle,
  Volume2,
  Zap,
  Globe,
  Check,
  ArrowDown,
  Layers,
  Activity,
  CheckCircle,
  Clock3,
} from 'lucide-react';

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activePreviewTab, setActivePreviewTab] = useState<'clinic' | 'bakery'>('clinic');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-blue-600 selection:text-white font-sans antialiased overflow-x-hidden">
      {/* SUBTLE BACKGROUND DECORATION */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[500px] bg-gradient-to-b from-blue-50/80 via-indigo-50/30 to-transparent blur-3xl opacity-70" />
        <div className="absolute top-[35%] -right-[15%] w-[600px] h-[600px] bg-blue-100/40 blur-3xl rounded-full" />
        <div className="absolute top-[65%] -left-[15%] w-[600px] h-[600px] bg-slate-200/40 blur-3xl rounded-full" />
      </div>

      {/* HEADER / NAVIGATION */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200/80 transition-all shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* BRANDING */}
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-md shadow-blue-600/20 group-hover:bg-blue-700 transition-all group-hover:scale-105">
                <PhoneCall className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-xl tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors">
                  CallFlow <span className="text-blue-600 font-extrabold">AI</span>
                </span>
                <span className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold -mt-1">
                  Voice &amp; Workflow Automation
                </span>
              </div>
            </Link>

            {/* DESKTOP NAV LINKS */}
            <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
              <a href="#how-it-works" className="hover:text-blue-600 transition-colors">
                How It Works
              </a>
              <a href="#features" className="hover:text-blue-600 transition-colors">
                Features
              </a>
              <a href="#use-cases" className="hover:text-blue-600 transition-colors">
                Use Cases
              </a>
              <a href="#calendar-voice" className="hover:text-blue-600 transition-colors">
                Calendar &amp; Voice
              </a>
            </nav>

            {/* ACTION BUTTONS */}
            <div className="hidden sm:flex items-center gap-3">
              <Link
                href="/dashboard"
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 rounded-lg transition-all border border-slate-200 shadow-xs flex items-center gap-2"
              >
                <LayoutDashboard className="w-4 h-4 text-blue-600" />
                Dashboard
              </Link>
              <Link
                href="/simulator"
                className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-md shadow-blue-600/20 hover:shadow-blue-600/30 transition-all flex items-center gap-2 group"
              >
                <Sparkles className="w-4 h-4 text-amber-300 group-hover:rotate-12 transition-transform" />
                Try Simulator
              </Link>
            </div>

            {/* MOBILE HAMBURGER TOGGLE */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="sm:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 focus:outline-none"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* MOBILE DROPDOWN MENU */}
        {mobileMenuOpen && (
          <div className="sm:hidden bg-white border-b border-slate-200 px-4 pt-3 pb-6 space-y-3 shadow-lg">
            <a
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-base font-medium text-slate-700 hover:text-blue-600"
            >
              How It Works
            </a>
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-base font-medium text-slate-700 hover:text-blue-600"
            >
              Features
            </a>
            <a
              href="#use-cases"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-base font-medium text-slate-700 hover:text-blue-600"
            >
              Use Cases
            </a>
            <a
              href="#calendar-voice"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-base font-medium text-slate-700 hover:text-blue-600"
            >
              Calendar &amp; Voice
            </a>
            <div className="pt-4 border-t border-slate-200 flex flex-col gap-3">
              <Link
                href="/dashboard"
                className="w-full py-2.5 text-center text-sm font-medium text-slate-800 bg-slate-100 rounded-lg"
              >
                Owner Dashboard
              </Link>
              <Link
                href="/simulator"
                className="w-full py-2.5 text-center text-sm font-semibold text-white bg-blue-600 rounded-lg shadow-sm"
              >
                Try AI Simulator
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* HERO SECTION */}
      <section className="relative z-10 pt-12 pb-20 sm:pt-16 sm:pb-28 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* HERO LEFT COLUMN */}
            <div className="lg:col-span-6 space-y-8 text-center lg:text-left">
              {/* BADGE */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold tracking-wide shadow-xs">
                <Zap className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
                <span>Voice AI &amp; Missed-Call Workflow Automation</span>
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                <span className="text-slate-600 font-normal">Hindi + Hinglish Supported</span>
              </div>

              {/* MAIN HEADLINE */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1] text-slate-900">
                Turn Missed Calls Into{' '}
                <span className="text-blue-600">
                  Customers
                </span>
              </h1>

              {/* SUPPORTING SUBTITLE */}
              <p className="text-lg sm:text-xl text-slate-600 font-normal leading-relaxed max-w-2xl mx-auto lg:mx-0">
                CallFlow AI helps small businesses automatically handle missed calls, talk to callers, collect key booking requirements, and schedule Google Calendar slots — even when you&apos;re busy.
              </p>

              {/* CTA BUTTONS */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
                <Link
                  href="/simulator"
                  className="w-full sm:w-auto px-8 py-4 text-base font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-600/25 hover:shadow-blue-600/35 transition-all flex items-center justify-center gap-3 group"
                >
                  <span>Try the Simulator</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>

                <Link
                  href="/dashboard"
                  className="w-full sm:w-auto px-8 py-4 text-base font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-all flex items-center justify-center gap-2 shadow-xs"
                >
                  <LayoutDashboard className="w-5 h-5 text-blue-600" />
                  <span>Explore Dashboard</span>
                </Link>
              </div>

              {/* FEATURE INDICATORS */}
              <div className="pt-6 border-t border-slate-200 grid grid-cols-3 gap-4 text-center lg:text-left">
                <div className="flex flex-col items-center lg:items-start">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900 text-sm">
                    <Mic className="w-4 h-4 text-blue-600" />
                    Voice + Text AI
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">Deepgram &amp; ElevenLabs</div>
                </div>

                <div className="flex flex-col items-center lg:items-start">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900 text-sm">
                    <Calendar className="w-4 h-4 text-emerald-600" />
                    Google Calendar
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">Live OAuth 2.0 CRUD</div>
                </div>

                <div className="flex flex-col items-center lg:items-start">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900 text-sm">
                    <Globe className="w-4 h-4 text-indigo-600" />
                    English + Hindi
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">Hinglish Autodetect</div>
                </div>
              </div>
            </div>

            {/* HERO RIGHT COLUMN: RICH SOPHISTICATED PRODUCT SHOWCASE VISUAL */}
            <div className="lg:col-span-6 relative">
              {/* DECORATIVE CONTAINER WITH LAYERED OVERLAYS */}
              <div className="relative rounded-3xl border border-slate-200/90 bg-white p-3 shadow-2xl shadow-blue-900/10">
                {/* BUSINESS OWNER IMAGE BASE */}
                <div className="relative rounded-2xl overflow-hidden">
                  <Image
                    src="/hero_assistant.png"
                    alt="CallFlow AI Business Owner Assistant"
                    width={640}
                    height={520}
                    className="w-full h-auto object-cover rounded-2xl transform hover:scale-[1.02] transition-transform duration-700"
                    priority
                  />
                  {/* SOFT GRADIENT OVERLAY ON IMAGE */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent" />
                </div>

                {/* OVERLAY CARD 1: MISSED CALL NOTIFICATION */}
                <div className="absolute top-6 left-6 max-w-[250px] bg-white/95 backdrop-blur-md p-3.5 rounded-xl border border-slate-200 shadow-xl flex items-center gap-3 animate-fade-in">
                  <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0">
                    <PhoneCall className="w-5 h-5 text-rose-600 animate-pulse" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Incoming Missed Call</div>
                    <div className="text-[11px] text-slate-500 font-medium">+1 (555) 019-2830 • 1 min ago</div>
                  </div>
                </div>

                {/* OVERLAY CARD 2: AI ACTIVE WITH AUDIO WAVEFORM */}
                <div className="absolute top-1/2 -right-3 sm:right-6 -translate-y-1/2 max-w-[270px] bg-white/95 backdrop-blur-md p-4 rounded-xl border border-blue-200 shadow-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-xs font-bold text-slate-900">AI Callback Active</span>
                    </div>
                    {/* MINI WAVEFORM BARS */}
                    <div className="flex items-end gap-1 h-3">
                      <span className="w-1 h-full bg-blue-600 rounded-full animate-pulse" />
                      <span className="w-1 h-2/3 bg-blue-400 rounded-full animate-pulse" />
                      <span className="w-1 h-full bg-blue-600 rounded-full animate-pulse" />
                    </div>
                  </div>
                  <p className="text-xs text-slate-700 font-medium italic leading-snug">
                    &quot;Namaste Aditya ji! 4th Sept ko 2 PM ka slot confirm kar doon?&quot;
                  </p>
                </div>

                {/* OVERLAY CARD 3: CALENDAR BOOKED SUCCESS */}
                <div className="absolute bottom-6 left-6 max-w-[270px] bg-white/95 backdrop-blur-md p-3.5 rounded-xl border border-emerald-200 shadow-xl flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
                    <CalendarCheck className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Google Calendar Synced</div>
                    <div className="text-[11px] text-emerald-700 font-bold">
                      Sept 4, 2:00 PM • Dentist Slot
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SOCIAL PROOF / CAPABILITIES STRIP */}
      <section className="py-8 bg-white border-y border-slate-200 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-600" />
              <span>One Assistant. Every Missed Call.</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-8 text-xs font-semibold text-slate-600">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200">
                <Bot className="w-4 h-4 text-blue-600" />
                AI Conversations
              </div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200">
                <Sliders className="w-4 h-4 text-indigo-600" />
                Smart Workflows
              </div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200">
                <Calendar className="w-4 h-4 text-emerald-600" />
                Calendar Actions
              </div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200">
                <LayoutDashboard className="w-4 h-4 text-amber-600" />
                Follow-Up CRM
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS SECTION */}
      <section id="how-it-works" className="py-24 bg-slate-50/70 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-16">
            <h2 className="text-xs font-bold uppercase tracking-wider text-blue-600">Automated 4-Step Pipeline</h2>
            <p className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              How CallFlow AI Works
            </p>
            <p className="text-base text-slate-600">
              From missed call detection to verified Google Calendar event booking in 4 connected automated steps.
            </p>
          </div>

          {/* CONNECTED 4 STEPS */}
          <div className="grid md:grid-cols-4 gap-6 relative">
            {/* STEP 1 */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all group flex flex-col justify-between space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 group-hover:scale-105 transition-transform">
                    <PhoneCall className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-extrabold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">
                    STEP 01
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900">1. Missed Call</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Customer calls your business while you are busy or after hours. CallFlow AI triggers an instant callback.
                </p>
              </div>

              {/* MINI UI SNIPPET */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-700 flex items-center justify-between font-medium">
                <span>Call Triggered</span>
                <span className="text-rose-600 font-bold">Unanswered</span>
              </div>
            </div>

            {/* STEP 2 */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all group flex flex-col justify-between space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 group-hover:scale-105 transition-transform">
                    <Bot className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-extrabold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">
                    STEP 02
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900">2. AI Conversation</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Interacts naturally via voice or text in English, Hindi, or Hinglish to gather requirements.
                </p>
              </div>

              {/* MINI UI SNIPPET */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-700 flex items-center justify-between font-medium">
                <span>Multi-turn Chat</span>
                <span className="text-blue-600 font-bold">Groq LLM</span>
              </div>
            </div>

            {/* STEP 3 */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all group flex flex-col justify-between space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 group-hover:scale-105 transition-transform">
                    <Sliders className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-extrabold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">
                    STEP 03
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900">3. Info Collected</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Extracts required fields (Name, Specialty, Date, Time) with strict proof-of-work extraction guards.
                </p>
              </div>

              {/* MINI UI SNIPPET */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-700 flex items-center justify-between font-medium">
                <span>Parameters</span>
                <span className="text-emerald-600 font-bold">100% Verified</span>
              </div>
            </div>

            {/* STEP 4 */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all group flex flex-col justify-between space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 group-hover:scale-105 transition-transform">
                    <CalendarCheck className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                    STEP 04
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900">4. Action Taken</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Queries calendar availability, prompts caller for confirmation, and creates the Google Calendar event.
                </p>
              </div>

              {/* MINI UI SNIPPET */}
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-[11px] text-emerald-800 flex items-center justify-between font-bold">
                <span>Google Calendar</span>
                <span>EVENT_CREATED</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* USE CASES SECTION */}
      <section id="use-cases" className="py-24 bg-white border-y border-slate-200 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-16">
            <h2 className="text-xs font-bold uppercase tracking-wider text-blue-600">Industry Versatility</h2>
            <p className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              One Workflow. Any Small Business.
            </p>
            <p className="text-base text-slate-600">
              Generic JSON workflow engine customized for clinics, cake shops, real estate agencies, and service shops.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* USE CASE 1: CLINICS */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:border-blue-300 transition-all duration-300 group flex flex-col">
              <div className="relative h-52 w-full overflow-hidden">
                <Image
                  src="/business_clinic.png"
                  alt="Medical Clinic Reception"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-3 left-3 px-3 py-1 rounded-md bg-white/95 backdrop-blur-md border border-slate-200 text-xs font-bold text-blue-700 flex items-center gap-1.5 shadow-sm">
                  <Stethoscope className="w-4 h-4 text-blue-600" />
                  Healthcare
                </div>
              </div>
              <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Clinics &amp; Healthcare</h3>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                    Collect patient name, doctor specialty, appointment date &amp; time. Evaluates 24-hour urgency rules automatically.
                  </p>
                </div>
                <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between font-medium">
                  <span>Seeded Demo</span>
                  <span className="text-blue-600 font-bold">Metro Health Care</span>
                </div>
              </div>
            </div>

            {/* USE CASE 2: CAKE SHOPS */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:border-blue-300 transition-all duration-300 group flex flex-col">
              <div className="relative h-52 w-full overflow-hidden">
                <Image
                  src="/business_bakery.png"
                  alt="Custom Cake Shop Showcase"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-3 left-3 px-3 py-1 rounded-md bg-white/95 backdrop-blur-md border border-slate-200 text-xs font-bold text-slate-900 flex items-center gap-1.5 shadow-sm">
                  <Cake className="w-4 h-4 text-blue-600" />
                  Bakeries
                </div>
              </div>
              <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Cake Shops &amp; Bakeries</h3>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                    Collect theme, flavour choice, weight/servings, pickup date, delivery preference, and time windows.
                  </p>
                </div>
                <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between font-medium">
                  <span>Seeded Demo</span>
                  <span className="text-blue-600 font-bold">Sweet Dreams Bakery</span>
                </div>
              </div>
            </div>

            {/* USE CASE 3: REAL ESTATE */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:border-blue-300 transition-all duration-300 group flex flex-col">
              <div className="relative h-52 w-full overflow-hidden">
                <Image
                  src="/business_realestate.png"
                  alt="Real Estate Agency Office"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-3 left-3 px-3 py-1 rounded-md bg-white/95 backdrop-blur-md border border-slate-200 text-xs font-bold text-slate-900 flex items-center gap-1.5 shadow-sm">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  Real Estate
                </div>
              </div>
              <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Real Estate Agencies</h3>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                    Qualify buyer inquiries, record budget &amp; location criteria, and schedule property viewings.
                  </p>
                </div>
                <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between font-medium">
                  <span>Workflow Config</span>
                  <span className="text-blue-600 font-bold">Generic Engine</span>
                </div>
              </div>
            </div>

            {/* USE CASE 4: HOME SERVICES */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:border-blue-300 transition-all duration-300 group flex flex-col">
              <div className="relative h-52 w-full overflow-hidden">
                <Image
                  src="/business_homeservices.png"
                  alt="Home Services Technician"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-3 left-3 px-3 py-1 rounded-md bg-white/95 backdrop-blur-md border border-slate-200 text-xs font-bold text-slate-900 flex items-center gap-1.5 shadow-sm">
                  <Wrench className="w-4 h-4 text-blue-600" />
                  Home Repair
                </div>
              </div>
              <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Home &amp; Repair Services</h3>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                    Capture emergency repair details, service location, and dispatch preferred arrival windows.
                  </p>
                </div>
                <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between font-medium">
                  <span>Workflow Config</span>
                  <span className="text-blue-600 font-bold">Generic Engine</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES SECTION WITH ASYMMETRIC VISUAL RHYTHM */}
      <section id="features" className="py-24 bg-slate-50/70 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-16">
            <h2 className="text-xs font-bold uppercase tracking-wider text-blue-600">Enterprise Feature Suite</h2>
            <p className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Powerful Capabilities for Small Businesses
            </p>
            <p className="text-base text-slate-600">
              Designed with strict state guards, multi-lingual support, and real-time CRM tracking.
            </p>
          </div>

          {/* FEATURE GRID WITH VARIATION */}
          <div className="grid lg:grid-cols-12 gap-8">
            {/* FEATURE 1: LARGE CARD FOR AI CONVERSATIONS */}
            <div className="lg:col-span-7 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-6">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                  <Bot className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900">Groq LLM Multi-Turn AI Conversations</h3>
                <p className="text-sm text-slate-600 leading-relaxed max-w-xl">
                  Powered by Groq cloud inference (`openai/gpt-oss-20b`). Employs proof-of-work extraction guards so fields are never defaulted unless provided by the caller.
                </p>
              </div>

              {/* REALISTIC CHAT UI SNIPPET */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3 text-xs">
                <div className="flex gap-2">
                  <span className="font-bold text-blue-600 shrink-0">Caller:</span>
                  <span className="text-slate-800">&quot;Mujhe appointment book karni hai. Mera naam Aditya hai.&quot;</span>
                </div>
                <div className="flex gap-2">
                  <span className="font-bold text-emerald-600 shrink-0">AI Agent:</span>
                  <span className="text-slate-800">&quot;Namaste Aditya ji! Aap किस doctor ya specialty ki appointment chahte hain?&quot;</span>
                </div>
              </div>
            </div>

            {/* FEATURE 2: GOOGLE CALENDAR CRUD */}
            <div className="lg:col-span-5 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-6">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                  <CalendarCheck className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900">Google Calendar OAuth CRUD</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Queries calendar slot collisions, prompts caller for confirmation, and executes live creation, patch rescheduling, or cancellation.
                </p>
              </div>

              {/* CALENDAR STATUS BADGE UI */}
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-emerald-900">Google Calendar API</div>
                  <div className="text-emerald-700">Slot Available • Confirmed</div>
                </div>
                <span className="px-2.5 py-1 rounded bg-emerald-600 text-white font-bold text-[10px]">
                  EVENT_CREATED
                </span>
              </div>
            </div>

            {/* FEATURE 3: DYNAMIC WORKFLOW BUILDER */}
            <div className="lg:col-span-5 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-6">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
                  <Sliders className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900">Dynamic JSON Workflow Engine</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Create dynamic question fields, select options, and conditional urgency evaluation rules without touching code.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                <div className="flex justify-between text-slate-700">
                  <span>Urgency Rule:</span>
                  <span className="font-bold text-amber-700">Date within 24h = URGENT</span>
                </div>
              </div>
            </div>

            {/* 3 SMALLER SUPPORTING CARDS */}
            <div className="lg:col-span-7 grid sm:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-blue-300 transition-all space-y-2">
                <Mic className="w-5 h-5 text-blue-600" />
                <h4 className="font-bold text-slate-900 text-sm">Voice &amp; Speech</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Deepgram STT &amp; ElevenLabs TTS pipeline.
                </p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-blue-300 transition-all space-y-2">
                <LayoutDashboard className="w-5 h-5 text-indigo-600" />
                <h4 className="font-bold text-slate-900 text-sm">CRM Dashboard</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Real-time timeline, status tags, and notes.
                </p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-blue-300 transition-all space-y-2">
                <Globe className="w-5 h-5 text-emerald-600" />
                <h4 className="font-bold text-slate-900 text-sm">Multi-Lingual</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Seamless English, Hindi, and Hinglish.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* REALISTIC PRODUCT SHOWCASE SECTION */}
      <section className="py-24 bg-white border-y border-slate-200 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-16">
            <h2 className="text-xs font-bold uppercase tracking-wider text-blue-600">Product Showcase</h2>
            <p className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              See What Happens After the Missed Call
            </p>
            <p className="text-base text-slate-600">
              Realistic preview of how CallFlow AI structures transcripts, extracts parameter JSON, and tags CRM priority.
            </p>
          </div>

          {/* TAB SWITCHER */}
          <div className="flex justify-center mb-8">
            <div className="p-1.5 bg-slate-100 border border-slate-200 rounded-xl inline-flex gap-2">
              <button
                onClick={() => setActivePreviewTab('clinic')}
                className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
                  activePreviewTab === 'clinic'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Stethoscope className="w-4 h-4" />
                Clinic Appointment Demo
              </button>
              <button
                onClick={() => setActivePreviewTab('bakery')}
                className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
                  activePreviewTab === 'bakery'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Cake className="w-4 h-4" />
                Bakery Cake Order Demo
              </button>
            </div>
          </div>

          {/* DASHBOARD MOCKUP CONTAINER */}
          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-2xl shadow-slate-900/10">
            {/* WINDOW TOP BAR */}
            <div className="px-6 py-4 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-400" />
                <div className="w-3 h-3 rounded-full bg-amber-400" />
                <div className="w-3 h-3 rounded-full bg-emerald-400" />
                <span className="text-xs font-bold text-slate-700 ml-4">
                  CallFlow AI Owner Dashboard • {activePreviewTab === 'clinic' ? 'Metro Health Care Clinic' : 'Sweet Dreams Bakery'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-md border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Workflow Verified
              </div>
            </div>

            {/* MOCKUP CONTENT */}
            <div className="grid lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
              {/* LEFT: TRANSCRIPT */}
              <div className="lg:col-span-7 p-6 sm:p-8 space-y-4">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-blue-600" />
                  Call Transcript &amp; Dialogue Timeline
                </div>

                {activePreviewTab === 'clinic' ? (
                  <div className="space-y-4 text-sm">
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 font-bold text-xs text-slate-700">
                        C
                      </div>
                      <div className="bg-slate-100 p-4 rounded-2xl rounded-tl-none border border-slate-200 max-w-[85%] text-slate-800">
                        <p className="font-bold text-xs text-blue-600 mb-1">Aditya (Caller)</p>
                        Mujhe appointment book karni hai. Mera naam Aditya hai.
                      </div>
                    </div>

                    <div className="flex gap-3 justify-end">
                      <div className="bg-blue-600 p-4 rounded-2xl rounded-tr-none max-w-[85%] text-white shadow-sm">
                        <p className="font-bold text-xs text-blue-100 mb-1">CallFlow AI</p>
                        Namaste Aditya ji! Aap kis doctor ya specialty ki appointment chahte hain?
                      </div>
                      <div className="w-8 h-8 rounded-full bg-blue-700 flex items-center justify-center shrink-0 font-bold text-xs text-white">
                        AI
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 font-bold text-xs text-slate-700">
                        C
                      </div>
                      <div className="bg-slate-100 p-4 rounded-2xl rounded-tl-none border border-slate-200 max-w-[85%] text-slate-800">
                        <p className="font-bold text-xs text-blue-600 mb-1">Aditya (Caller)</p>
                        Dentist. Kal 4 September ko 2 PM ka time chalega?
                      </div>
                    </div>

                    <div className="flex gap-3 justify-end">
                      <div className="bg-blue-600 p-4 rounded-2xl rounded-tr-none max-w-[85%] text-white shadow-sm">
                        <p className="font-bold text-xs text-blue-100 mb-1">CallFlow AI</p>
                        Google Calendar check kar liya hai. 4 September ko 2:00 PM ka slot available hai. Kya main aapki booking confirm kar doon?
                      </div>
                      <div className="w-8 h-8 rounded-full bg-blue-700 flex items-center justify-center shrink-0 font-bold text-xs text-white">
                        AI
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 text-sm">
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 font-bold text-xs text-slate-700">
                        C
                      </div>
                      <div className="bg-slate-100 p-4 rounded-2xl rounded-tl-none border border-slate-200 max-w-[85%] text-slate-800">
                        <p className="font-bold text-xs text-blue-600 mb-1">Bhavish (Caller)</p>
                        I want to place a custom cake order. Fruitcake, Mango flavor, 1 kg.
                      </div>
                    </div>

                    <div className="flex gap-3 justify-end">
                      <div className="bg-blue-600 p-4 rounded-2xl rounded-tr-none max-w-[85%] text-white shadow-sm">
                        <p className="font-bold text-xs text-blue-100 mb-1">CallFlow AI</p>
                        Great! What is your preferred pickup or delivery date and time?
                      </div>
                      <div className="w-8 h-8 rounded-full bg-blue-700 flex items-center justify-center shrink-0 font-bold text-xs text-white">
                        AI
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 font-bold text-xs text-slate-700">
                        C
                      </div>
                      <div className="bg-slate-100 p-4 rounded-2xl rounded-tl-none border border-slate-200 max-w-[85%] text-slate-800">
                        <p className="font-bold text-xs text-blue-600 mb-1">Bhavish (Caller)</p>
                        Pickup tomorrow, 4 September at 4 PM.
                      </div>
                    </div>

                    <div className="flex gap-3 justify-end">
                      <div className="bg-blue-600 p-4 rounded-2xl rounded-tr-none max-w-[85%] text-white shadow-sm">
                        <p className="font-bold text-xs text-blue-100 mb-1">CallFlow AI</p>
                        Awesome! We have received your order details and scheduled pickup for Sept 4 at 4 PM!
                      </div>
                      <div className="w-8 h-8 rounded-full bg-blue-700 flex items-center justify-center shrink-0 font-bold text-xs text-white">
                        AI
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* RIGHT: PARAMETERS & ACTION */}
              <div className="lg:col-span-5 p-6 sm:p-8 bg-slate-50/70 space-y-5">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-blue-600" />
                    Extracted Customer State
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                    100% Extracted
                  </span>
                </div>

                {activePreviewTab === 'clinic' ? (
                  <div className="space-y-3 text-xs">
                    <div className="p-3.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between shadow-xs">
                      <span className="text-slate-500">Patient Name:</span>
                      <span className="font-bold text-slate-900">Aditya</span>
                    </div>
                    <div className="p-3.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between shadow-xs">
                      <span className="text-slate-500">Specialty / Doctor:</span>
                      <span className="font-bold text-blue-700">Dentist</span>
                    </div>
                    <div className="p-3.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between shadow-xs">
                      <span className="text-slate-500">Appointment Date:</span>
                      <span className="font-bold text-slate-900">2026-09-04</span>
                    </div>
                    <div className="p-3.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between shadow-xs">
                      <span className="text-slate-500">Preferred Time:</span>
                      <span className="font-bold text-slate-900">14:00 (2:00 PM)</span>
                    </div>
                    <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between shadow-xs">
                      <span className="text-slate-700">Google Calendar:</span>
                      <span className="font-bold text-emerald-700 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        EVENT_CREATED
                      </span>
                    </div>
                    <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-between shadow-xs">
                      <span className="text-slate-700">Urgency Level:</span>
                      <span className="font-bold text-amber-700 flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 text-amber-600" />
                        URGENT (&lt;24h)
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 text-xs">
                    <div className="p-3.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between shadow-xs">
                      <span className="text-slate-500">Customer Name:</span>
                      <span className="font-bold text-slate-900">Bhavish</span>
                    </div>
                    <div className="p-3.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between shadow-xs">
                      <span className="text-slate-500">Cake Theme:</span>
                      <span className="font-bold text-blue-700">Fruitcake</span>
                    </div>
                    <div className="p-3.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between shadow-xs">
                      <span className="text-slate-500">Flavour Choice:</span>
                      <span className="font-bold text-slate-900">Mango</span>
                    </div>
                    <div className="p-3.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between shadow-xs">
                      <span className="text-slate-500">Weight / Servings:</span>
                      <span className="font-bold text-slate-900">1 kg</span>
                    </div>
                    <div className="p-3.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between shadow-xs">
                      <span className="text-slate-500">Delivery Preference:</span>
                      <span className="font-bold text-blue-700">Pickup</span>
                    </div>
                    <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between shadow-xs">
                      <span className="text-slate-700">Workflow Complete:</span>
                      <span className="font-bold text-emerald-700 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        TRUE
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CALENDAR + AI SPLIT SECTION */}
      <section id="calendar-voice" className="py-24 bg-slate-50/70 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            {/* LEFT: CALENDAR WIDGET */}
            <div className="lg:col-span-6 space-y-6">
              <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-blue-600" />
                    <span className="font-bold text-slate-900 text-sm">Google Calendar Integration</span>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                    OAuth 2.0 Synced
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <span className="text-slate-500">1:00 PM - 2:00 PM</span>
                    <span className="text-slate-400 font-medium">Occupied Slot</span>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between font-bold text-emerald-900">
                    <span>2:00 PM - 3:00 PM</span>
                    <span className="text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Available &amp; Booked
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <span className="text-slate-500">3:00 PM - 4:00 PM</span>
                    <span className="text-slate-400 font-medium">Available</span>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT: HEADLINE & EXPLANATION */}
            <div className="lg:col-span-6 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                <span>Deterministic Calendar State Machine</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
                AI That Knows When to Take Action
              </h2>
              <p className="text-base text-slate-600 leading-relaxed">
                CallFlow AI enforces strict state machine guards: Customer Request &rarr; Intent Detection &rarr; Calendar Availability Query &rarr; Caller Confirmation &rarr; Event Creation.
              </p>

              <div className="space-y-3 text-sm text-slate-700">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>Checks slot availability before making any promises.</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>Prompts caller for explicit confirmation before calendar mutation.</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>Stores Google Calendar Event ID for future updates or cancellations.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* VOICE SECTION */}
      <section className="py-24 bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-8 sm:p-12 rounded-3xl bg-slate-900 text-white border border-slate-800 shadow-2xl space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-3 max-w-xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-900/60 border border-blue-700 text-blue-300 text-xs font-semibold">
                  <Mic className="w-3.5 h-3.5 text-blue-400" />
                  Voice + Text Audio Pipeline
                </div>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                  Talk Naturally. Follow Up Automatically.
                </h2>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Deepgram Nova-2 Speech-to-Text (<span className="text-emerald-400 font-semibold">&lt;500ms</span>) combined with ElevenLabs Multilingual TTS synthesis.
                </p>
              </div>

              {/* AUDIO WAVEFORM WIDGET */}
              <div className="p-6 rounded-2xl bg-slate-800 border border-slate-700 space-y-3 w-full md:w-72">
                <div className="flex items-center justify-between text-xs text-slate-300 font-bold">
                  <span>Voice State: SPEAKING</span>
                  <Volume2 className="w-4 h-4 text-blue-400 animate-pulse" />
                </div>
                <div className="flex items-end justify-between h-8 gap-1">
                  <span className="w-1.5 h-full bg-blue-500 rounded-full animate-pulse" />
                  <span className="w-1.5 h-1/2 bg-blue-400 rounded-full animate-pulse" />
                  <span className="w-1.5 h-3/4 bg-blue-500 rounded-full animate-pulse" />
                  <span className="w-1.5 h-full bg-blue-500 rounded-full animate-pulse" />
                  <span className="w-1.5 h-2/3 bg-blue-400 rounded-full animate-pulse" />
                  <span className="w-1.5 h-5/6 bg-blue-500 rounded-full animate-pulse" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-semibold pt-4 border-t border-slate-800">
              <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center gap-2 text-slate-200">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                Deepgram Nova-2 STT
              </div>
              <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center gap-2 text-slate-200">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                ElevenLabs TTS
              </div>
              <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center gap-2 text-slate-200">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                English + Hindi + Hinglish
              </div>
              <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center gap-2 text-slate-200">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                Text Mode Fallback
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CALL TO ACTION SECTION */}
      <section className="py-24 bg-slate-50 relative z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="p-10 sm:p-16 rounded-3xl bg-slate-900 text-white border border-slate-800 shadow-2xl space-y-8">
            <div className="space-y-4 max-w-2xl mx-auto">
              <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
                Never Let a Missed Call Become a Missed Customer
              </h2>
              <p className="text-base sm:text-lg text-slate-300">
                Experience the interactive simulator or explore the owner CRM dashboard to see how CallFlow AI handles missed calls in real-time.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/simulator"
                className="w-full sm:w-auto px-8 py-4 text-base font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-3"
              >
                <span>Try the Simulator</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/dashboard"
                className="w-full sm:w-auto px-8 py-4 text-base font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <LayoutDashboard className="w-5 h-5 text-blue-400" />
                <span>Explore Dashboard</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 bg-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 pb-12 border-b border-slate-200">
            {/* COL 1: BRANDING */}
            <div className="md:col-span-2 space-y-4">
              <Link href="/" className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm">
                  <PhoneCall className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold text-xl text-slate-900">
                  CallFlow <span className="text-blue-600">AI</span>
                </span>
              </Link>
              <p className="text-xs text-slate-600 max-w-sm leading-relaxed">
                Workflow-driven AI missed-call assistant. Automatically initiates callbacks, extracts key customer parameters, executes Google Calendar tools, and organizes CRM follow-ups.
              </p>
            </div>

            {/* COL 2: QUICK NAVIGATION */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Product Navigation</h4>
              <ul className="space-y-2 text-xs text-slate-600">
                <li>
                  <Link href="/simulator" className="hover:text-blue-600 transition-colors">
                    AI Simulator
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard" className="hover:text-blue-600 transition-colors">
                    Owner Dashboard
                  </Link>
                </li>
                <li>
                  <Link href="/workflows" className="hover:text-blue-600 transition-colors">
                    Workflow Builder
                  </Link>
                </li>
                <li>
                  <Link href="/conversations" className="hover:text-blue-600 transition-colors">
                    Call Transcripts &amp; Follow-ups
                  </Link>
                </li>
                <li>
                  <Link href="/business" className="hover:text-blue-600 transition-colors">
                    Business Profile Settings
                  </Link>
                </li>
              </ul>
            </div>

            {/* COL 3: ARCHITECTURE */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Architecture</h4>
              <ul className="space-y-2 text-xs text-slate-600">
                <li>Groq AI Inference (`openai/gpt-oss-20b`)</li>
                <li>Google Calendar API v3 (OAuth 2.0)</li>
                <li>Deepgram Nova-2 Speech-to-Text</li>
                <li>ElevenLabs Multilingual TTS</li>
                <li>Supabase PostgreSQL</li>
              </ul>
            </div>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
            <div>&copy; 2026 CallFlow AI. All rights reserved. Developed for Voice AI Assistant Assignment.</div>
            <div className="flex items-center gap-6">
              <Link href="/simulator" className="hover:text-slate-900">
                Simulator
              </Link>
              <Link href="/dashboard" className="hover:text-slate-900">
                Dashboard
              </Link>
              <Link href="/workflows" className="hover:text-slate-900">
                Workflows
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
