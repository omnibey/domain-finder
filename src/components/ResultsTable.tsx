'use client';

import React, { useState, useMemo } from 'react';
import { DomainCheckResult, RegistrarType } from '@/lib/types';
import { getRegistrarUrl, REGISTRAR_OPTIONS } from '@/lib/registrars';
import { StatusBadge } from './StatusBadge';
import { ExternalLink, Search, ArrowUpDown, Clock, DollarSign, Sparkles } from 'lucide-react';

interface ResultsTableProps {
  results: DomainCheckResult[];
  selectedRegistrar: RegistrarType;
}

type SortField = 'domain' | 'price' | 'checkedAt';
type SortOrder = 'asc' | 'desc';

export function ResultsTable({ results, selectedRegistrar }: ResultsTableProps) {
  const [filterText, setFilterText] = useState('');
  const [sortField, setSortField] = useState<SortField>('domain');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  const registrarInfo = REGISTRAR_OPTIONS.find((r) => r.id === selectedRegistrar) || REGISTRAR_OPTIONS[0];

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const filteredAndSorted = useMemo(() => {
    let list = results;
    if (filterText.trim()) {
      const q = filterText.toLowerCase().trim();
      list = list.filter((r) => r.domain.toLowerCase().includes(q));
    }

    return [...list].sort((a, b) => {
      let comparison = 0;
      if (sortField === 'domain') {
        comparison = a.domain.localeCompare(b.domain);
      } else if (sortField === 'price') {
        const priceA = parseFloat(a.price?.replace(/[^0-9.]/g, '') || '0');
        const priceB = parseFloat(b.price?.replace(/[^0-9.]/g, '') || '0');
        comparison = priceA - priceB;
      } else if (sortField === 'checkedAt') {
        comparison = new Date(a.checkedAt).getTime() - new Date(b.checkedAt).getTime();
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [results, filterText, sortField, sortOrder]);

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
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
              Available Domains
            </h2>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {results.length} found
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Positively verified available for registration through live registry check
          </p>
        </div>

        {/* Filter input */}
        {results.length > 0 && (
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Filter results..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:border-emerald-500 font-mono"
            />
          </div>
        )}
      </div>

      {results.length === 0 ? (
        <div className="p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-800/80 text-slate-500 flex items-center justify-center mx-auto mb-3">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-slate-300">No available domains yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            Configure your pattern above and click &quot;Start Discovery&quot; to begin scanning for available domains.
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-medium">
                <tr>
                  <th className="py-3 px-4">
                    <button
                      type="button"
                      onClick={() => handleSort('domain')}
                      className="flex items-center gap-1.5 hover:text-white"
                    >
                      <span>Domain Name</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </button>
                  </th>
                  <th className="py-3 px-4">Verification Status</th>
                  <th className="py-3 px-4">
                    <button
                      type="button"
                      onClick={() => handleSort('price')}
                      className="flex items-center gap-1.5 hover:text-white"
                    >
                      <span>Registration Price</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </button>
                  </th>
                  <th className="py-3 px-4">Premium Status</th>
                  <th className="py-3 px-4">
                    <button
                      type="button"
                      onClick={() => handleSort('checkedAt')}
                      className="flex items-center gap-1.5 hover:text-white"
                    >
                      <span>Checked At</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </button>
                  </th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {filteredAndSorted.map((item) => {
                  const buyUrl = getRegistrarUrl(selectedRegistrar, item.domain);
                  return (
                    <tr
                      key={item.domain}
                      className="hover:bg-slate-850/50 transition-colors group"
                    >
                      <td className="py-3 px-4">
                        <span className="text-white font-bold text-sm tracking-wide group-hover:text-emerald-300 transition-colors">
                          {item.domain}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-sans">
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        {item.price ? (
                          <span className="font-semibold text-emerald-400">{item.price}</span>
                        ) : (
                          <span className="text-slate-500 font-sans text-xs">Standard rate</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-sans">
                        {item.premium === true ? (
                          <span className="inline-flex items-center gap-1 text-purple-400 font-semibold text-xs">
                            <Sparkles className="w-3 h-3" /> Yes
                          </span>
                        ) : item.premium === false ? (
                          <span className="text-slate-400 text-xs">No</span>
                        ) : (
                          <span className="text-slate-500 text-xs">Standard / N/A</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-400 font-sans text-xs">
                        <span className="flex items-center gap-1 text-slate-400">
                          <Clock className="w-3 h-3 text-slate-500" />
                          {formatTimestamp(item.checkedAt)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <a
                          href={buyUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-sm shadow-emerald-500/20 transition-all font-sans"
                        >
                          <span>Buy on {registrarInfo.name}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-slate-800/80">
            {filteredAndSorted.map((item) => {
              const buyUrl = getRegistrarUrl(selectedRegistrar, item.domain);
              return (
                <div key={item.domain} className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-white font-mono font-bold text-base">
                      {item.domain}
                    </span>
                    <StatusBadge status={item.status} />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-3.5 h-3.5 text-slate-500" />
                      <span>{item.price || 'Standard registrar price'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>{formatTimestamp(item.checkedAt)}</span>
                    </div>
                  </div>

                  <div>
                    <a
                      href={buyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-sm transition-all"
                    >
                      <span>Buy domain on {registrarInfo.name}</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer note */}
          <div className="p-3 bg-slate-950/60 border-t border-slate-800 text-[11px] text-slate-400 text-center">
            Availability and prices are verified with registry data and are subject to registrar confirmation. Domains are not reserved until purchased.
          </div>
        </>
      )}
    </div>
  );
}
