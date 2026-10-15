'use client';

import React, { useState, useId } from 'react';
import { PatternConfig, PatternEstimate } from '@/lib/types';
import { DEFAULT_TLDS } from '@/lib/pattern/generator';
import { Sparkles, SlidersHorizontal, AlertCircle, Info, Hash } from 'lucide-react';

interface PatternFormProps {
  config: PatternConfig;
  onChange: (config: PatternConfig) => void;
  estimate: PatternEstimate;
  disabled: boolean;
}

const QUICK_PATTERNS = [
  '?mail.com',
  '??mail.com',
  '???mail.com',
  'dev?.io',
  'go??.com',
  'app?.ai',
];

export function PatternForm({ config, onChange, estimate, disabled }: PatternFormProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const patternInputId = useId();
  const allowNumbersId = useId();
  const charsetSelectId = useId();
  const customCharsId = useId();
  const prefixId = useId();
  const suffixId = useId();

  const handlePatternChange = (val: string) => {
    onChange({ ...config, pattern: val });
  };

  const handleQuickPattern = (p: string) => {
    if (disabled) return;
    onChange({ ...config, pattern: p });
  };

  const handleTldToggle = (tld: string) => {
    if (disabled) return;
    const current = config.selectedTlds || ['.com'];
    let next: string[];
    if (current.includes(tld)) {
      if (current.length === 1) return; // Keep at least one
      next = current.filter((t) => t !== tld);
    } else {
      next = [...current, tld];
    }
    onChange({ ...config, selectedTlds: next });
  };

  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl backdrop-blur-sm space-y-5">
      {/* Pattern Input Section */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label htmlFor={patternInputId} className="text-sm font-semibold text-white flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>Domain Search Pattern</span>
          </label>
          <span className="text-xs text-slate-400">
            Use <code className="px-1.5 py-0.5 rounded bg-slate-800 text-emerald-300 font-mono text-xs">?</code> for each wildcard letter
          </span>
        </div>

        <div className="relative">
          <input
            id={patternInputId}
            type="text"
            value={config.pattern}
            onChange={(e) => handlePatternChange(e.target.value)}
            disabled={disabled}
            placeholder="e.g. ?mail.com or ??mail.com"
            className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-4 py-3.5 text-white font-mono text-base placeholder-slate-500 transition-colors disabled:opacity-50"
          />
        </div>

        {/* Quick Pattern Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
          <span className="text-xs text-slate-500 mr-1">Examples:</span>
          {QUICK_PATTERNS.map((qp) => (
            <button
              key={qp}
              type="button"
              onClick={() => handleQuickPattern(qp)}
              disabled={disabled}
              className={`text-xs px-2.5 py-1 rounded-lg font-mono transition-all ${
                config.pattern === qp
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700/50'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {qp}
            </button>
          ))}
        </div>
      </div>

      {/* Extension / TLD selector */}
      <div>
        <label className="block text-xs font-medium text-slate-300 mb-2">
          Domain Extensions
        </label>
        <div className="flex flex-wrap gap-2">
          {DEFAULT_TLDS.map((tld) => {
            const isSelected = (config.selectedTlds || ['.com']).includes(tld);
            return (
              <button
                key={tld}
                type="button"
                onClick={() => handleTldToggle(tld)}
                disabled={disabled}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                  isSelected
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm shadow-emerald-500/20'
                    : 'bg-slate-800/80 hover:bg-slate-850 text-slate-300 border border-slate-700'
                } disabled:opacity-50`}
              >
                {tld}
              </button>
            );
          })}
        </div>
      </div>

      {/* Advanced Settings Toggle */}
      <div>
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-xs font-medium text-slate-400 hover:text-slate-200 flex items-center gap-1.5 transition-colors"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>{showAdvanced ? 'Hide Advanced Pattern Rules' : 'Show Advanced Pattern Rules (Numbers, Character Sets, Affixes)'}</span>
        </button>

        {showAdvanced && (
          <div className="mt-3 p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-4 animate-in fade-in duration-150">
            {/* Include numbers toggle */}
            <div className="flex items-center justify-between">
              <div>
                <label htmlFor={allowNumbersId} className="text-xs font-medium text-slate-200 block">
                  Allow Numbers in Wildcards (0-9)
                </label>
                <span className="text-[11px] text-slate-400">
                  Allow &apos;?&apos; to replace with both letters (a-z) and numbers (0-9)
                </span>
              </div>
              <input
                id={allowNumbersId}
                type="checkbox"
                checked={config.allowNumbers || false}
                onChange={(e) => onChange({ ...config, allowNumbers: e.target.checked })}
                disabled={disabled}
                className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-900 border-slate-700 bg-slate-800 cursor-pointer disabled:opacity-50"
              />
            </div>

            {/* Character Set Selection */}
            <div>
              <label htmlFor={charsetSelectId} className="text-xs font-medium text-slate-200 block mb-1">
                Wildcard Character Set
              </label>
              <select
                id={charsetSelectId}
                value={config.characterSet || 'lowercase'}
                onChange={(e) =>
                  onChange({
                    ...config,
                    characterSet: e.target.value as PatternConfig['characterSet'],
                  })
                }
                disabled={disabled}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-xs focus:border-emerald-500"
              >
                <option value="lowercase">Standard Latin Letters (a-z) — 26 chars</option>
                <option value="alphanumeric">Alphanumeric (a-z, 0-9) — 36 chars</option>
                <option value="custom">Custom Character Set</option>
              </select>
            </div>

            {/* Custom characters input */}
            {config.characterSet === 'custom' && (
              <div>
                <label htmlFor={customCharsId} className="text-xs font-medium text-slate-200 block mb-1">
                  Custom Characters
                </label>
                <input
                  id={customCharsId}
                  type="text"
                  value={config.customChars || ''}
                  onChange={(e) => onChange({ ...config, customChars: e.target.value })}
                  disabled={disabled}
                  placeholder="e.g. aeiou or xyz123"
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2 text-xs font-mono"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Only these characters will be substituted into &apos;?&apos; placeholders.
                </span>
              </div>
            )}

            {/* Prefix & Suffix */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor={prefixId} className="text-xs font-medium text-slate-200 block mb-1">
                  Fixed Prefix
                </label>
                <input
                  id={prefixId}
                  type="text"
                  value={config.prefix || ''}
                  onChange={(e) => onChange({ ...config, prefix: e.target.value })}
                  disabled={disabled}
                  placeholder="e.g. get or the"
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2 text-xs font-mono"
                />
              </div>
              <div>
                <label htmlFor={suffixId} className="text-xs font-medium text-slate-200 block mb-1">
                  Fixed Suffix
                </label>
                <input
                  id={suffixId}
                  type="text"
                  value={config.suffix || ''}
                  onChange={(e) => onChange({ ...config, suffix: e.target.value })}
                  disabled={disabled}
                  placeholder="e.g. app or hq"
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2 text-xs font-mono"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Live Estimation & Validation Feedback */}
      <div className="border-t border-slate-800 pt-4">
        {estimate.valid ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <Hash className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs text-slate-400">Estimated Combinations:</span>
                  <div className="text-sm font-bold text-white font-mono">
                    {estimate.totalCombinations.toLocaleString()} domains
                  </div>
                </div>
              </div>

              {estimate.sampleDomains.length > 0 && (
                <div className="text-right">
                  <span className="text-[11px] text-slate-400 block">Sample Preview:</span>
                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    {estimate.sampleDomains.slice(0, 3).map((sample) => (
                      <span
                        key={sample}
                        className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800/80 text-emerald-300 border border-slate-700"
                      >
                        {sample}
                      </span>
                    ))}
                    {estimate.sampleDomains.length > 3 && (
                      <span className="text-xs text-slate-500">...</span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Warning if combination is large */}
            {estimate.warning && (
              <div
                className={`p-3 rounded-xl flex items-start gap-2.5 text-xs ${
                  estimate.totalCombinations > 100000
                    ? 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
                    : 'bg-amber-500/15 border border-amber-500/30 text-amber-300'
                }`}
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{estimate.warning}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl">
            <Info className="w-4 h-4 shrink-0" />
            <span>{estimate.error || 'Invalid pattern specification'}</span>
          </div>
        )}
      </div>
    </div>
  );
}
