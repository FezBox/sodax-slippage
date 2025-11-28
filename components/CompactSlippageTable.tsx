'use client';

import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { clsx } from 'clsx';

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

function formatAmount(amount: string | number | undefined, maxDecimals = 6): string {
    if (!amount) return '-';
    const num = parseFloat(amount.toString());
    if (isNaN(num)) return '-';

    // If integer, return as is
    if (Number.isInteger(num)) return num.toString();

    // Truncate to maxDecimals
    return num.toLocaleString('en-US', {
        maximumFractionDigits: maxDecimals,
        minimumFractionDigits: 0
    });
}

export function CompactSlippageTable({ intents }: { intents: Intent[] }) {
    const [sortField, setSortField] = useState<SortField>('time');
    const [filterToken, setFilterToken] = useState('');

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
            <div className="flex gap-4 items-center flex-wrap">
                <input
                    type="text"
                    placeholder="Filter by token..."
                    className="px-4 py-2 border rounded-lg bg-white dark:bg-zinc-800 dark:border-zinc-700 text-sm w-full md:w-auto"
                    value={filterToken}
                    onChange={e => setFilterToken(e.target.value)}
                />
                <select
                    className="px-4 py-2 border rounded-lg bg-white dark:bg-zinc-800 dark:border-zinc-700 text-sm w-full md:w-auto"
                    value={sortField}
                    onChange={e => setSortField(e.target.value as SortField)}
                >
                    <option value="time">Latest Time</option>
                    <option value="absDiff">Abs Diff (High to Low)</option>
                    <option value="pctDiff">Pct Diff (High to Low)</option>
                </select>
            </div>

            <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
                <table className="w-full text-sm text-left">
                    <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 font-medium border-b border-zinc-200 dark:border-zinc-700">
                        <tr>
                            <th className="px-4 py-3 w-32">Time / Status</th>
                            <th className="px-4 py-3">Route</th>
                            <th className="px-4 py-3">Outcome</th>
                            <th className="px-4 py-3 text-right w-32">Slippage</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {sortedAndFiltered.map((intent) => {
                            const time = intent.quote?.timestamp || intent.fill?.timestamp;
                            const dateStr = time ? format(new Date(Number(time) * 1000), 'MMM d') : '-';
                            const timeStr = time ? format(new Date(Number(time) * 1000), 'HH:mm:ss') : '-';

                            const pct = parseFloat(intent.slippage?.pct || '0');
                            const isPositive = pct > 0;
                            const isNegative = pct < 0;

                            return (
                                <tr key={intent.intentId} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                                    {/* Time & Status */}
                                    <td className="px-4 py-3 align-top">
                                        <div className="flex flex-col gap-1">
                                            <div className="text-zinc-900 dark:text-zinc-100 font-medium">{timeStr}</div>
                                            <div className="text-xs text-zinc-500">{dateStr}</div>
                                            <span className={clsx(
                                                "inline-flex items-center w-fit px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wide mt-1",
                                                intent.status === 'filled' ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                                                    intent.status === 'pending' ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" :
                                                        "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                            )}>
                                                {intent.status.replace('_', ' ')}
                                            </span>
                                        </div>
                                    </td>

                                    {/* Route */}
                                    <td className="px-4 py-3 align-top">
                                        {intent.quote ? (
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400 text-xs">
                                                    <span>From</span>
                                                    <span className="font-mono text-zinc-900 dark:text-zinc-100 font-medium">
                                                        {formatAmount(intent.quote.fromAmount)} {intent.quote.fromToken}
                                                    </span>
                                                    <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-[10px]">
                                                        {intent.quote.fromChain}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400 text-xs">
                                                    <span>To</span>
                                                    <span className="font-mono text-zinc-900 dark:text-zinc-100 font-medium">
                                                        {formatAmount(intent.quote.toAmount)} {intent.quote.toToken}
                                                    </span>
                                                    <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-[10px]">
                                                        {intent.quote.toChain}
                                                    </span>
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="text-zinc-400 italic">Unknown Quote</span>
                                        )}
                                    </td>

                                    {/* Outcome */}
                                    <td className="px-4 py-3 align-top">
                                        {intent.fill ? (
                                            <div className="flex flex-col gap-1">
                                                <div className="text-xs text-zinc-500">Filled Amount</div>
                                                <div className="font-mono font-medium text-zinc-900 dark:text-zinc-100">
                                                    {formatAmount(intent.fill.toAmount)} {intent.fill.toToken}
                                                </div>
                                                {intent.slippage && (
                                                    <div className={clsx(
                                                        "text-xs font-mono",
                                                        isPositive ? "text-green-600" : isNegative ? "text-red-600" : "text-zinc-500"
                                                    )}>
                                                        Diff: {isPositive ? '+' : ''}{formatAmount(intent.slippage.abs)}
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-zinc-300 italic text-xs">Waiting for fill...</span>
                                        )}
                                    </td>

                                    {/* Slippage % */}
                                    <td className="px-4 py-3 align-top text-right">
                                        {intent.slippage ? (
                                            <div className={clsx(
                                                "text-lg font-bold font-mono",
                                                isPositive ? "text-green-600" : isNegative ? "text-red-600" : "text-zinc-500"
                                            )}>
                                                {isPositive ? '+' : ''}{pct.toFixed(2)}%
                                            </div>
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
