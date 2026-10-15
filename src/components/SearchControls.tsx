'use client';

import React from 'react';
import { Search, Square, Trash2, Download, Loader2, CheckCircle2, SearchX } from 'lucide-react';
import { RegistrarType } from '@/lib/types';
import { REGISTRAR_OPTIONS } from '@/lib/registrars';

interface SearchControlsProps {
  isSearching: boolean;
  onStartSearch: () => void;
  onStopSearch: () => void;
  onClearResults: () => void;
  onExportCsv: () => void;
  totalChecked: number;
  availableCount: number;
  otherCount: number;
  totalEstimated: number;
  canStart: boolean;
  selectedRegistrar: RegistrarType;
  onRegistrarChange: (reg: RegistrarType) => void;
  currentCheckingDomain?: string;
}

export function SearchControls({
  isSearching,
  onStartSearch,
  onStopSearch,
  onClearResults,
  onExportCsv,
  totalChecked,
  availableCount,
  otherCount,
  totalEstimated,
  canStart,
  selectedRegistrar,
  onRegistrarChange,
  currentCheckingDomain,
}: SearchControlsProps) {
  const percentage =
    totalEstimated > 0 ? Math.min(100, Math.round((totalChecked / totalEstimated) * 100)) : 0;

  const totalResults = availableCount + otherCount;

  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur-sm space-y-4">
      {/* Primary Action Buttons Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-wrap">
          {!isSearching ? (
            <button
              type="button"
              onClick={onStartSearch}
              disabled={!canStart}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/25 transition-all transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              <Search className="w-4 h-4" />
              <span>Start Discovery</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onStopSearch}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm shadow-lg shadow-rose-600/30 transition-all transform active:scale-[0.98]"
            >
              <Square className="w-4 h-4 fill-white" />
              <span>Stop Search</span>
            </button>
          )}

          {totalResults > 0 && (
            <button
              type="button"
              onClick={onClearResults}
              disabled={isSearching}
              className="flex items-center gap-1.5 px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4 text-slate-400" />
              <span>Clear</span>
            </button>
          )}
        </div>

        {/* Right side controls: Registrar Selector & CSV Export */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Preferred Registrar selector */}
          <div className="flex items-center gap-2">
            <label htmlFor="registrar-select" className="text-xs text-slate-400 hidden sm:inline">
              Buy Registrar:
            </label>
            <select
              id="registrar-select"
              value={selectedRegistrar}
              onChange={(e) => onRegistrarChange(e.target.value as RegistrarType)}
              className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2.5 focus:border-emerald-500"
            >
              {REGISTRAR_OPTIONS.map((reg) => (
                <option key={reg.id} value={reg.id}>
                  {reg.name}
                </option>
              ))}
            </select>
          </div>

          {/* CSV Export Button */}
          <button
            type="button"
            onClick={onExportCsv}
            disabled={availableCount === 0}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-emerald-400 hover:text-emerald-300 text-xs font-bold border border-emerald-500/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV ({availableCount})</span>
          </button>
        </div>
      </div>

      {/* Progress Bar (when active or completed) */}
      {(isSearching || totalChecked > 0) && (
        <div className="space-y-2 pt-2 border-t border-slate-800/80">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-2 font-mono">
              {isSearching ? (
                <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Checking: {currentCheckingDomain || 'Processing batch...'}</span>
                </span>
              ) : (
                <span className="text-slate-300">
                  Search Completed / Paused
                </span>
              )}
            </div>
            <div className="font-mono text-slate-300">
              <span className="text-white font-bold">{totalChecked.toLocaleString()}</span> /{' '}
              {totalEstimated.toLocaleString()} ({percentage}%)
            </div>
          </div>

          {/* Bar track */}
          <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
            <div
              className={`h-full transition-all duration-300 rounded-full ${
                isSearching
                  ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400'
                  : 'bg-emerald-600'
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
            <Search className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 block font-medium">Checked Domains</span>
            <span className="text-base font-bold text-white font-mono">
              {totalChecked.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="bg-slate-950/70 border border-emerald-500/30 rounded-xl p-3.5 flex items-center gap-3 shadow-sm shadow-emerald-500/5">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[11px] text-emerald-400/90 block font-medium">Available Found</span>
            <span className="text-base font-bold text-emerald-300 font-mono">
              {availableCount.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5 flex items-center gap-3 col-span-2 sm:col-span-1">
          <div className="p-2 rounded-lg bg-slate-800 text-slate-400">
            <SearchX className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 block font-medium">Registered / Other</span>
            <span className="text-base font-bold text-slate-300 font-mono">
              {otherCount.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
