'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Header } from '@/components/Header';
import { PatternForm } from '@/components/PatternForm';
import { SearchControls } from '@/components/SearchControls';
import { ResultsTable } from '@/components/ResultsTable';
import { OtherResultsTable } from '@/components/OtherResultsTable';
import {
  DomainCheckResult,
  PatternConfig,
  RegistrarType,
  BatchCheckResponse,
} from '@/lib/types';
import { estimateCombinations, generateDomainCandidates } from '@/lib/pattern/generator';
import { downloadCsv } from '@/lib/export/csv';
import { ProviderStatus } from '@/lib/providers/types';
import { Sparkles, ShieldCheck, AlertCircle } from 'lucide-react';

const BATCH_SIZE = 20;

export default function HomePage() {
  const [providerStatus, setProviderStatus] = useState<ProviderStatus | null>(null);

  // Pattern configuration state
  const [config, setConfig] = useState<PatternConfig>({
    pattern: '?mail.com',
    allowNumbers: false,
    characterSet: 'lowercase',
    selectedTlds: ['.com'],
    customChars: '',
    prefix: '',
    suffix: '',
  });

  // Search execution state
  const [isSearching, setIsSearching] = useState(false);
  const [totalChecked, setTotalChecked] = useState(0);
  const [currentCheckingDomain, setCurrentCheckingDomain] = useState<string>('');
  const [selectedRegistrar, setSelectedRegistrar] = useState<RegistrarType>('cloudflare');

  // Results state in browser memory
  const [availableResults, setAvailableResults] = useState<DomainCheckResult[]>([]);
  const [otherResults, setOtherResults] = useState<DomainCheckResult[]>([]);
  const [activeTab, setActiveTab] = useState<'available' | 'other'>('available');

  // Abort control ref
  const stopRequestedRef = useRef(false);

  // Calculate live estimate for current pattern
  const estimate = useMemo(() => estimateCombinations(config), [config]);

  // Fetch provider health and status on mount
  useEffect(() => {
    async function fetchStatus() {
      try {
        const res = await fetch('/api/health');
        if (res.ok) {
          const data: ProviderStatus = await res.json();
          setProviderStatus(data);
        }
      } catch (err) {
        console.error('Failed to query provider health:', err);
      }
    }
    fetchStatus();
  }, []);

  // Handler for Stop button
  const handleStopSearch = () => {
    stopRequestedRef.current = true;
    setIsSearching(false);
  };

  // Handler for Clear Results button
  const handleClearResults = () => {
    setAvailableResults([]);
    setOtherResults([]);
    setTotalChecked(0);
    setCurrentCheckingDomain('');
  };

  // Handler for CSV Export
  const handleExportCsv = () => {
    if (availableResults.length === 0) return;
    downloadCsv(availableResults);
  };

  // Start search runner: orchestrates small sequential batch requests from browser
  const handleStartSearch = async () => {
    if (!estimate.valid || estimate.totalCombinations === 0) return;

    if (estimate.totalCombinations > 100000) {
      const proceed = window.confirm(
        `This pattern generates ${estimate.totalCombinations.toLocaleString()} domains, which will take thousands of API requests. Do you wish to proceed?`
      );
      if (!proceed) return;
    }

    stopRequestedRef.current = false;
    setIsSearching(true);
    setCurrentCheckingDomain('Preparing candidates...');

    const candidateGenerator = generateDomainCandidates(config);
    let batch: string[] = [];
    let checkedCount = 0;

    for (const candidate of candidateGenerator) {
      if (stopRequestedRef.current) {
        break;
      }

      batch.push(candidate);

      if (batch.length === BATCH_SIZE) {
        setCurrentCheckingDomain(batch[0]);
        await processBatch(batch);
        checkedCount += batch.length;
        setTotalChecked(checkedCount);
        batch = [];

        // Throttle slightly (100ms) between batches to allow UI re-renders and smooth abort
        await new Promise((r) => setTimeout(r, 100));
      }
    }

    // Process leftover domains in last batch
    if (batch.length > 0 && !stopRequestedRef.current) {
      setCurrentCheckingDomain(batch[0]);
      await processBatch(batch);
      checkedCount += batch.length;
      setTotalChecked(checkedCount);
    }

    setIsSearching(false);
    setCurrentCheckingDomain('');
  };

  // Helper to execute single batch against Next.js API
  const processBatch = async (batch: string[]) => {
    try {
      const response = await fetch('/api/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ domains: batch }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        // If rate limited or error, record as unknown
        const fallbackResults: DomainCheckResult[] = batch.map((domain) => ({
          domain,
          status: 'UNKNOWN',
          price: null,
          currency: null,
          premium: null,
          checkedAt: new Date().toISOString(),
          provider: 'System',
          reason: errJson.error || `Server HTTP ${response.status}`,
        }));
        setOtherResults((prev) => [...fallbackResults, ...prev]);
        return;
      }

      const data: BatchCheckResponse = await response.json();
      const results: DomainCheckResult[] = data.results || [];

      const newAvailable: DomainCheckResult[] = [];
      const newOther: DomainCheckResult[] = [];

      for (const res of results) {
        if (res.status === 'AVAILABLE') {
          newAvailable.push(res);
        } else {
          newOther.push(res);
        }
      }

      if (newAvailable.length > 0) {
        setAvailableResults((prev) => [...prev, ...newAvailable]);
      }
      if (newOther.length > 0) {
        setOtherResults((prev) => [...newOther, ...prev]);
      }
    } catch (err: unknown) {
      console.error('Batch check error:', err);
      const fallbackResults: DomainCheckResult[] = batch.map((domain) => ({
        domain,
        status: 'UNKNOWN',
        price: null,
        currency: null,
        premium: null,
        checkedAt: new Date().toISOString(),
        provider: 'System',
        reason: err instanceof Error ? err.message : 'Network error',
      }));
      setOtherResults((prev) => [...fallbackResults, ...prev]);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Top Navigation & Provider status */}
      <Header providerStatus={providerStatus} />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Hero Title & Information */}
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Fast Pattern-Based Domain Search</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Find Available Domains in Seconds
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Use <code className="text-emerald-400 font-mono">?</code> wildcards to generate combinations and check registration availability in real time.
          </p>
        </div>

        {/* Demo Mode Notice Banner if provider is mock */}
        {providerStatus?.isMock && (
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between gap-3 shadow-lg shadow-amber-500/5">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>Demo Mode Active:</strong> Running with Mock Provider for development. Set <code className="font-mono bg-slate-900 px-1 py-0.5 rounded text-amber-200">DOMAIN_PROVIDER=rdap</code> or configure Cloudflare credentials in <code className="font-mono bg-slate-900 px-1 py-0.5 rounded text-amber-200">.env.local</code> for live checks.
              </span>
            </div>
          </div>
        )}

        {/* Top Controls Grid: Pattern Form & Search Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7">
            <PatternForm
              config={config}
              onChange={setConfig}
              estimate={estimate}
              disabled={isSearching}
            />
          </div>
          <div className="lg:col-span-5">
            <SearchControls
              isSearching={isSearching}
              onStartSearch={handleStartSearch}
              onStopSearch={handleStopSearch}
              onClearResults={handleClearResults}
              onExportCsv={handleExportCsv}
              totalChecked={totalChecked}
              availableCount={availableResults.length}
              otherCount={otherResults.length}
              totalEstimated={estimate.totalCombinations}
              canStart={estimate.valid && estimate.totalCombinations > 0}
              selectedRegistrar={selectedRegistrar}
              onRegistrarChange={setSelectedRegistrar}
              currentCheckingDomain={currentCheckingDomain}
            />
          </div>
        </div>

        {/* Results Tabs & Tables */}
        <div className="space-y-4 pt-2">
          {/* Tab Selector */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('available')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'available'
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm shadow-emerald-500/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <span>Available Domains</span>
                <span className="px-2 py-0.5 rounded-full text-[11px] bg-emerald-500/20 text-emerald-300 font-mono">
                  {availableResults.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('other')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'other'
                    ? 'bg-slate-800 text-white border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <span>Audit Log / Taken</span>
                <span className="px-2 py-0.5 rounded-full text-[11px] bg-slate-800 text-slate-300 font-mono">
                  {otherResults.length}
                </span>
              </button>
            </div>
          </div>

          {/* Active Tab View */}
          {activeTab === 'available' ? (
            <ResultsTable
              results={availableResults}
              selectedRegistrar={selectedRegistrar}
            />
          ) : (
            <OtherResultsTable results={otherResults} />
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-6 mt-12 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>
            Simple Domain Finder &copy; 2026 &bull; Lightweight domain availability discovery
          </p>
          <div className="flex items-center gap-4 text-slate-400 text-xs">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              No Database &bull; Client-Side Session Memory
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
