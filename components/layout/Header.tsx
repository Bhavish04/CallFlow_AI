'use client';

import Link from 'next/link';
import { Menu, PhoneCall, Globe } from 'lucide-react';

interface HeaderProps {
  onOpenMobileMenu: () => void;
}

export function Header({ onOpenMobileMenu }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
      {/* Mobile Left & Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="md:hidden p-2 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 md:hidden">
          <div className="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
            CF
          </div>
          <span className="font-bold text-slate-900 text-sm">CallFlow AI</span>
        </div>
      </div>

      {/* Right Action Controls */}
      <div className="flex items-center gap-2.5">
        {/* Language Badge */}
        <div className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 rounded-md text-xs font-medium text-slate-600 border border-slate-200">
          <Globe className="w-3.5 h-3.5 text-slate-500" />
          <span>EN / HI</span>
        </div>

        {/* Quick Call Simulator Button */}
        <Link
          href="/simulator"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold shadow-xs transition-colors"
        >
          <PhoneCall className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Simulate Call</span>
          <span className="sm:hidden">Simulate</span>
        </Link>
      </div>
    </header>
  );
}
