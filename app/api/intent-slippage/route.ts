import { NextResponse } from 'next/server';
import { SodaxApi } from '@/lib/sodax/api';
import { pairingService } from '@/lib/sodax/pairing';

// Simple in-memory state to track if we've done an initial backfill
let isInitialized = false;

export async function GET() {
    try {
        // 1. Fetch data
        let messages = [];

        if (!isInitialized) {
            // Initial backfill: fetch last 150 messages to ensure we catch most recent intents
            const latest = await SodaxApi.fetchLatestMessages(150);
            const ids = latest.map(m => m.id);
            messages = await SodaxApi.fetchMessageDetailsBatch(ids);
            isInitialized = true;
        } else {
            // Incremental update: fetch latest 50 to catch any fills that happened
            const latest = await SodaxApi.fetchLatestMessages(50);
            const ids = latest.map(m => m.id);
            messages = await SodaxApi.fetchMessageDetailsBatch(ids);
        }

        // 2. Process
        pairingService.processMessages(messages);

        // 3. Return result
        const intents = pairingService.getIntents();
        const stats = pairingService.getStats();

        return NextResponse.json({
            stats,
            intents,
            explorerUrls: SodaxApi.config.explorerUrls,
            lastUpdated: new Date().toISOString(),
        });

    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
    }
}
