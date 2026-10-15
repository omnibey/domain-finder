'use client';

import React from 'react';
import { DomainStatus } from '@/lib/types';
import { CheckCircle2, XCircle, Sparkles, HelpCircle, Ban } from 'lucide-react';

interface StatusBadgeProps {
  status: DomainStatus;
  showIcon?: boolean;
}

export function StatusBadge({ status, showIcon = true }: StatusBadgeProps) {
  switch (status) {
    case 'AVAILABLE':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
          {showIcon && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
          AVAILABLE
        </span>
      );
    case 'REGISTERED':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
          {showIcon && <XCircle className="w-3.5 h-3.5 text-slate-400" />}
          REGISTERED
        </span>
      );
    case 'PREMIUM':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
          {showIcon && <Sparkles className="w-3.5 h-3.5 text-purple-400" />}
          PREMIUM
        </span>
      );
    case 'UNSUPPORTED':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-500/15 text-rose-300 border border-rose-500/30">
          {showIcon && <Ban className="w-3.5 h-3.5 text-rose-400" />}
          UNSUPPORTED
        </span>
      );
    case 'UNKNOWN':
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30">
          {showIcon && <HelpCircle className="w-3.5 h-3.5 text-amber-400" />}
          UNKNOWN
        </span>
      );
  }
}
