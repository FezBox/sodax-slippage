'use client';

import React, { useEffect, useState } from 'react';
import { CompactSlippageTable } from '@/components/CompactSlippageTable';
import { SummaryCards } from '@/components/SummaryCards';

export default function Home() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const fetchData = async () => {
    try {
      const res = await fetch('/api/intent-slippage');
      const json = await res.json();
      setData(json);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">SODAX Intent Slippage</h1>
            <p className="text-zinc-500 mt-2">
              Monitoring quote vs. fill amounts for cross-chain intents.
            </p>
          </div>
          <div className="text-right text-sm text-zinc-400">
            {loading ? 'Loading...' : `Last updated: ${lastUpdated}`}
          </div>
        </header>

        {loading && !data ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900 dark:border-zinc-100"></div>
          </div>
        ) : (
          <>
            <SummaryCards stats={data?.stats} />
            <CompactSlippageTable intents={data?.intents || []} explorerUrls={data?.explorerUrls} />
          </>
        )}
      </div>
    </div>
  );
}
