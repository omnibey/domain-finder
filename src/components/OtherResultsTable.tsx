'use client';

import React, { useState, useMemo } from 'react';
import { DomainCheckResult } from '@/lib/types';
import { StatusBadge } from './StatusBadge';
import { Search, Clock, Info } from 'lucide-react';

interface OtherResultsTableProps {
  results: DomainCheckResult[];
}

export function OtherResultsTable({ results }: OtherResultsTableProps) {
  const [filterText, setFilterText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const filtered = useMemo(() => {
    return results.filter((item) => {
      if (statusFilter !== 'ALL' && item.status !== statusFilter) {
        return false;
      }
      if (filterText.trim()) {
        const q = filterText.toLowerCase().trim();
        return item.domain.toLowerCase().includes(q) || (item.reason && item.reason.toLowerCase().includes(q));
      }
      return true;
    });
  }, [results, filterText, statusFilter]);

  const formatTimestamp = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return iso;
    }
  };

  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-2xl shadow-xl backdrop-blur-sm overflow-hidden">
      {/* Table Header Bar */}
      <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-500"></span>
              Registered &amp; Other Checked Domains
            </h2>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700">
              {results.length} domains
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Audit log of domains checked that were registered, premium, unsupported, or uncertain
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 focus:border-emerald-500"
          >
            <option value="ALL">All Statuses ({results.length})</option>
            <option value="REGISTERED">Registered</option>
            <option value="PREMIUM">Premium</option>
            <option value="UNKNOWN">Unknown / Error</option>
            <option value="UNSUPPORTED">Unsupported TLD</option>
          </select>

          <div className="relative flex-1 sm:w-48">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Filter list..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:border-emerald-500 font-mono"
            />
          </div>
        </div>
      </div>

      {results.length === 0 ? (
        <div className="p-8 text-center text-xs text-slate-500">
          No other domains recorded yet in this session.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-medium">
              <tr>
                <th className="py-3 px-4">Domain</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Details / Price</th>
                <th className="py-3 px-4">Status Reason</th>
                <th className="py-3 px-4">Checked At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filtered.map((item) => (
                <tr key={`${item.domain}-${item.checkedAt}`} className="hover:bg-slate-850/50">
                  <td className="py-3 px-4 text-slate-300 font-semibold">{item.domain}</td>
                  <td className="py-3 px-4 font-sans">
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="py-3 px-4 text-slate-400">
                    {item.price || (item.status === 'REGISTERED' ? 'Taken' : '—')}
                  </td>
                  <td className="py-3 px-4 text-slate-400 font-sans text-xs">
                    {item.reason ? (
                      <span className="flex items-center gap-1 text-slate-400">
                        <Info className="w-3 h-3 text-slate-500 shrink-0" />
                        <span className="truncate max-w-xs">{item.reason}</span>
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="py-3 px-4 text-slate-500 font-sans text-xs">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-600" />
                      {formatTimestamp(item.checkedAt)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
