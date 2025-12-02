'use client';

import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { clsx } from 'clsx';
import { ExternalLink } from 'lucide-react';

interface Intent {
    intentId: string;
    quote?: any;
    fill?: any;
    status: string;
    slippage?: {
        abs: string;
        pct: string;
    };
}

type SortField = 'time' | 'absDiff' | 'pctDiff';

export function IntentSlippageTable({ intents, explorerUrls }: { intents: Intent[], explorerUrls?: Record<string, string> }) {
    const [sortField, setSortField] = useState<SortField>('time');
    const [filterToken, setFilterToken] = useState('');

    const getExplorerLink = (networkId?: string, txHash?: string) => {
        if (!networkId || !txHash || !explorerUrls) return null;
        const urlTemplate = explorerUrls[networkId];
        if (!urlTemplate) return null;

        if (urlTemplate.includes('{txHash}')) {
            return urlTemplate.replace('{txHash}', txHash);
        }
        return urlTemplate + txHash;
    };

    const sortedAndFiltered = useMemo(() => {
        let data = [...intents];

        // Filter
        if (filterToken) {
            const lower = filterToken.toLowerCase();
            data = data.filter(i =>
                i.quote?.fromToken?.toLowerCase().includes(lower) ||
                i.quote?.toToken?.toLowerCase().includes(lower)
            );
        }

        // Sort
        data.sort((a, b) => {
            if (sortField === 'time') {
                const tA = Number(a.fill?.timestamp || a.quote?.timestamp || 0);
                const tB = Number(b.fill?.timestamp || b.quote?.timestamp || 0);
                return tB - tA;
            }
            if (sortField === 'absDiff') {
                const vA = parseFloat(a.slippage?.abs || '0');
                const vB = parseFloat(b.slippage?.abs || '0');
                return vB - vA;
            }
            if (sortField === 'pctDiff') {
                const vA = parseFloat(a.slippage?.pct || '0');
                const vB = parseFloat(b.slippage?.pct || '0');
                return vB - vA;
            }
            return 0;
        });

        return data;
    }, [intents, sortField, filterToken]);

    return (
        <div className="space-y-4">
            <div className="flex gap-4 items-center">
                <input
                    type="text"
                    placeholder="Filter by token..."
                    className="px-4 py-2 border rounded-lg bg-white dark:bg-zinc-800 dark:border-zinc-700"
                    value={filterToken}
                    onChange={e => setFilterToken(e.target.value)}
                />
                <select
                    className="px-4 py-2 border rounded-lg bg-white dark:bg-zinc-800 dark:border-zinc-700"
                    value={sortField}
                    onChange={e => setSortField(e.target.value as SortField)}
                >
                    <option value="time">Latest Time</option>
                    <option value="absDiff">Abs Diff (High to Low)</option>
                    <option value="pctDiff">Pct Diff (High to Low)</option>
                </select>
            </div>

            <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-700">
                <table className="w-full text-sm text-left">
                    <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 font-medium border-b border-zinc-200 dark:border-zinc-700">
                        <tr>
                            <th className="px-4 py-3">Time</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3">From (Quote)</th>
                            <th className="px-4 py-3">To (Quote)</th>
                            <th className="px-4 py-3">To (Fill)</th>
                            <th className="px-4 py-3 text-right">Diff</th>
                            <th className="px-4 py-3 text-right">% Diff</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {sortedAndFiltered.map((intent) => {
                            const time = intent.quote?.timestamp || intent.fill?.timestamp;
                            const dateStr = time ? format(new Date(Number(time) * 1000), 'MMM d, HH:mm:ss') : '-';

                            const pct = parseFloat(intent.slippage?.pct || '0');
                            const isPositive = pct > 0;
                            const isNegative = pct < 0;

                            const quoteTxLink = getExplorerLink(intent.quote?.networkId, intent.quote?.txHash);
                            const fillTxLink = getExplorerLink(intent.fill?.networkId, intent.fill?.txHash);

                            return (
                                <tr key={intent.intentId} className="bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                                    <td className="px-4 py-3 whitespace-nowrap text-zinc-500">{dateStr}</td>
                                    <td className="px-4 py-3">
                                        <span className={clsx(
                                            "px-2 py-1 rounded-full text-xs font-medium",
                                            intent.status === 'filled' ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                                                intent.status === 'pending' ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" :
                                                    "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                        )}>
                                            {intent.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        {intent.quote ? (
                                            <div className="flex items-center gap-2">
                                                <div>
                                                    <span className="font-medium">{intent.quote.fromAmount} {intent.quote.fromToken}</span>
                                                    <span className="text-zinc-400 text-xs ml-1">({intent.quote.fromChain})</span>
                                                </div>
                                                {quoteTxLink && (
                                                    <a href={quoteTxLink} target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-blue-500 transition-colors" title="View Source Transaction">
                                                        <ExternalLink size={14} />
                                                    </a>
                                                )}
                                            </div>
                                        ) : '-'}
                                    </td>
                                    <td className="px-4 py-3">
                                        {intent.quote ? (
                                            <div>
                                                <span className="font-medium">{intent.quote.toAmount} {intent.quote.toToken}</span>
                                                <span className="text-zinc-400 text-xs ml-1">({intent.quote.toChain})</span>
                                            </div>
                                        ) : '-'}
                                    </td>
                                    <td className="px-4 py-3">
                                        {intent.fill ? (
                                            <div className="flex items-center gap-2">
                                                <div>
                                                    <span className="font-medium">{intent.fill.toAmount} {intent.fill.toToken}</span>
                                                    <span className="text-zinc-400 text-xs ml-1">({intent.fill.toChain})</span>
                                                </div>
                                                {fillTxLink && (
                                                    <a href={fillTxLink} target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-blue-500 transition-colors" title="View Fill Transaction">
                                                        <ExternalLink size={14} />
                                                    </a>
                                                )}
                                            </div>
                                        ) : <span className="text-zinc-300 italic">Pending...</span>}
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono">
                                        {intent.slippage ? (
                                            <span className={clsx(
                                                isPositive ? "text-green-600" : isNegative ? "text-red-600" : "text-zinc-500"
                                            )}>
                                                {isPositive ? '+' : ''}{parseFloat(intent.slippage.abs).toFixed(6)}
                                            </span>
                                        ) : '-'}
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono font-bold">
                                        {intent.slippage ? (
                                            <span className={clsx(
                                                isPositive ? "text-green-600" : isNegative ? "text-red-600" : "text-zinc-500"
                                            )}>
                                                {isPositive ? '+' : ''}{pct.toFixed(2)}%
                                            </span>
                                        ) : '-'}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
