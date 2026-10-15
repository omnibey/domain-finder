'use client';

import React from 'react';
import { Globe, ShieldCheck, AlertTriangle } from 'lucide-react';
import { ProviderStatus } from '@/lib/providers/types';

interface HeaderProps {
  providerStatus: ProviderStatus | null;
}

export function Header({ providerStatus }: HeaderProps) {
  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
        {/* Logo and title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-slate-950 font-bold">
            <Globe className="w-5 h-5 text-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white tracking-tight">DomainFinder</h1>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                v1.0
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Pattern-based domain discovery &amp; availability checker
            </p>
          </div>
        </div>

        {/* Provider badge */}
        <div className="flex items-center gap-2">
          {providerStatus ? (
            providerStatus.isMock ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-medium">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Demo Mode (Mock Provider)</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="truncate max-w-[200px] sm:max-w-none">{providerStatus.name}</span>
              </div>
            )
          ) : (
            <div className="animate-pulse flex items-center gap-2 text-xs text-slate-400">
              <div className="w-2 h-2 rounded-full bg-slate-500"></div>
              <span>Connecting provider...</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
