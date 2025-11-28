import React from 'react';

interface Stats {
    count: number;
    avgPct: string;
    maxPct: string;
    minPct: string;
}

export function SummaryCards({ stats }: { stats: Stats | null }) {
    if (!stats) return null;

    const cards = [
        { label: 'Total Paired', value: stats.count },
        { label: 'Avg Slippage', value: `${parseFloat(stats.avgPct).toFixed(4)}%` },
        { label: 'Max Positive', value: `${parseFloat(stats.maxPct).toFixed(4)}%` },
        { label: 'Max Negative', value: `${parseFloat(stats.minPct).toFixed(4)}%` },
    ];

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {cards.map((card) => (
                <div key={card.label} className="bg-white dark:bg-zinc-800 p-4 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700">
                    <div className="text-sm text-zinc-500 dark:text-zinc-400">{card.label}</div>
                    <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">{card.value}</div>
                </div>
            ))}
        </div>
    );
}
