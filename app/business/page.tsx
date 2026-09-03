'use client';

import { useState, useEffect } from 'react';
import { Building2, Save, AlertCircle, CheckCircle2, Loader2, Globe, Clock, MapPin, Phone } from 'lucide-react';
import { Business } from '@/types/database';

const INDUSTRY_OPTIONS = [
  { value: 'clinic', label: 'Clinic / Medical / Healthcare' },
  { value: 'cake_shop', label: 'Cake Shop / Bakery / Sweets' },
  { value: 'logistics', label: 'Logistics / Delivery / Express' },
  { value: 'real_estate', label: 'Real Estate Agency' },
  { value: 'repair_service', label: 'Home & Repair Services' },
  { value: 'salon', label: 'Salon & Spa' },
  { value: 'restaurant', label: 'Restaurant & Catering' },
  { value: 'other', label: 'Other Small Business' },
];

const TIMEZONE_OPTIONS = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Asia/Kolkata',
  'Asia/Dubai',
  'Asia/Singapore',
];

export default function BusinessProfilePage() {
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [industry, setIndustry] = useState('clinic');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [timezone, setTimezone] = useState('UTC');
  const [languages, setLanguages] = useState<string[]>(['en']);

  // Feedback states
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Fetch business profile on mount
  useEffect(() => {
    fetchBusiness();
  }, []);

  async function fetchBusiness() {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await fetch('/api/business');
      if (!res.ok) throw new Error('Failed to fetch business data');
      const data = await res.json();
      if (data.business) {
        setBusiness(data.business);
        setName(data.business.name || '');
        setIndustry(data.business.industry || 'clinic');
        setPhone(data.business.phone || '');
        setAddress(data.business.address || '');
        setTimezone(data.business.timezone || 'UTC');
        setLanguages(data.business.languages || ['en']);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Could not load business profile. Please verify connection.');
    } finally {
      setLoading(false);
    }
  }

  function toggleLanguage(lang: string) {
    if (languages.includes(lang)) {
      if (languages.length === 1) return; // Must keep at least 1 language
      setLanguages(languages.filter((l) => l !== lang));
    } else {
      setLanguages([...languages, lang]);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    // Validation
    if (!name.trim()) {
      setErrorMsg('Business Name is required');
      return;
    }
    if (!industry.trim()) {
      setErrorMsg('Industry selection is required');
      return;
    }

    try {
      setSaving(true);
      const res = await fetch('/api/business', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: business?.id,
          name: name.trim(),
          industry: industry.trim(),
          phone: phone.trim(),
          address: address.trim(),
          timezone,
          languages,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save business profile');
      }

      setBusiness(data.business);
      setSuccessMsg(data.message || 'Business profile saved successfully!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error saving profile';
      setErrorMsg(msg);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-3xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-200 animate-pulse" />
          <div className="space-y-2">
            <div className="h-6 w-48 bg-slate-200 rounded animate-pulse" />
            <div className="h-4 w-64 bg-slate-100 rounded animate-pulse" />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <div className="h-10 bg-slate-100 rounded animate-pulse" />
          <div className="h-10 bg-slate-100 rounded animate-pulse" />
          <div className="h-10 bg-slate-100 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Business Profile</h1>
        <p className="text-sm text-slate-500">
          Manage your business information and missed-call AI assistant preferences.
        </p>
      </div>

      {/* Notifications */}
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

      {/* Form Container */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {business ? 'Edit Business Profile' : 'Create Business Profile'}
              </h2>
              <p className="text-xs text-slate-500">
                {business ? 'Update details used across all missed-call workflows' : 'Set up your business profile to get started'}
              </p>
            </div>
          </div>
          {business && (
            <span className="text-xs font-mono text-slate-400 bg-slate-50 px-2 py-1 rounded border border-slate-200">
              ID: {business.id.slice(0, 8)}...
            </span>
          )}
        </div>

        {/* Empty State Banner if new */}
        {!business && (
          <div className="p-4 bg-blue-50/70 border border-blue-100 rounded-lg text-xs text-blue-800 leading-relaxed">
            <strong>Welcome to CallFlow AI!</strong> Please fill out your business details below to customize your automated AI phone assistant.
          </div>
        )}

        <div className="space-y-4">
          {/* Business Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Business Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Metro Health Care Clinic / Sweet Dreams Bakery"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Industry Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Industry Category <span className="text-red-500">*</span>
            </label>
            <select
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {INDUSTRY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500 mt-1">
              Workflows adapt parameters dynamically based on your industry.
            </p>
          </div>

          {/* Phone & Address Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-slate-400" /> Phone Number
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 555-0192"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" /> Timezone
              </label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {TIMEZONE_OPTIONS.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400" /> Physical Address
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. 123 Medical Center Way, Suite 400"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Languages */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1">
              <Globe className="w-3.5 h-3.5 text-slate-400" /> Supported AI Languages
            </label>
            <div className="flex flex-wrap gap-4 pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-800 font-medium">
                <input
                  type="checkbox"
                  checked={languages.includes('en')}
                  onChange={() => toggleLanguage('en')}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span>English (EN)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-800 font-medium">
                <input
                  type="checkbox"
                  checked={languages.includes('hi')}
                  onChange={() => toggleLanguage('hi')}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span>Hindi / हिंदी (HI)</span>
              </label>
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5">
              The AI voice assistant will handle callbacks in selected languages.
            </p>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="pt-5 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold text-sm rounded-lg shadow-xs transition-colors"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving Profile...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>{business ? 'Save Changes' : 'Create Profile'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
