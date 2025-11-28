import Decimal from 'decimal.js';
import { parseActionDetail, ParsedMessage } from './parser';
import { SodaxMessageDetail } from './api';

export interface PairedIntent {
    intentId: string; // sn
    quote?: ParsedMessage & { timestamp: string; id: number };
    fill?: ParsedMessage & { timestamp: string; id: number };
    status: 'pending' | 'filled' | 'orphan_fill';
    slippage?: {
        abs: string; // string for serialization
        pct: string; // string for serialization
    };
}

export class PairingService {
    private intents: Map<string, PairedIntent> = new Map();
    // Index for quick lookup: `${fromAmount}_${fromToken}_${fromChain}` -> intentId[]
    private lookup: Map<string, string[]> = new Map();
    private processedMessageIds: Set<number> = new Set();

    constructor() { }

    public processMessages(messages: SodaxMessageDetail[]) {
        // Sort by ID ascending to process in order
        const sorted = [...messages].sort((a, b) => a.id - b.id);

        for (const msg of sorted) {
            this.processMessage(msg);
        }
    }

    private getLookupKey(parsed: ParsedMessage): string | null {
        if (!parsed.fromAmount || !parsed.fromToken || !parsed.fromChain) return null;
        return `${parsed.fromAmount.toString()}_${parsed.fromToken}_${parsed.fromChain}_${parsed.toToken}_${parsed.toChain}`;
    }

    private processMessage(msg: SodaxMessageDetail) {
        if (this.processedMessageIds.has(msg.id)) {
            return;
        }
        this.processedMessageIds.add(msg.id);

        const parsed = parseActionDetail(msg.action_detail);
        if (parsed.type === 'unknown') return;

        const key = this.getLookupKey(parsed);
        if (!key) return;

        // Try to find existing intent
        let intentId: string | undefined;
        const candidates = this.lookup.get(key) || [];

        // Simple matching: find first candidate that needs this leg
        // In a real app, we might need time-window matching to handle identical amounts
        for (const id of candidates) {
            const existing = this.intents.get(id);
            if (!existing) continue;

            if (parsed.type === 'quote' && !existing.quote) {
                // Found a fill waiting for a quote? (Unlikely order but possible)
                intentId = id;
                break;
            } else if (parsed.type === 'fill' && !existing.fill) {
                // Found a quote waiting for a fill
                intentId = id;
                break;
            }
        }

        if (!intentId) {
            // Create new intent
            // Use msg.id as part of ID to ensure uniqueness, or just a random string
            intentId = `${msg.id}_${Math.random().toString(36).substr(2, 9)}`;
            const newIntent: PairedIntent = {
                intentId,
                status: parsed.type === 'quote' ? 'pending' : 'orphan_fill',
            };
            this.intents.set(intentId, newIntent);

            const list = this.lookup.get(key) || [];
            list.push(intentId);
            this.lookup.set(key, list);
        }

        const intent = this.intents.get(intentId)!;
        const msgData = {
            ...parsed,
            timestamp: msg.created_at,
            id: msg.id,
        };

        if (parsed.type === 'quote') {
            intent.quote = msgData;
        } else if (parsed.type === 'fill') {
            intent.fill = msgData;
        }

        this.updateStatusAndSlippage(intent);
    }

    private updateStatusAndSlippage(intent: PairedIntent) {
        if (intent.quote && intent.fill) {
            intent.status = 'filled';

            // Calculate slippage
            if (intent.quote.toAmount && intent.fill.toAmount) {
                const quoteAmt = intent.quote.toAmount;
                const fillAmt = intent.fill.toAmount;

                const absDiff = fillAmt.minus(quoteAmt);
                // Avoid division by zero
                const pctDiff = quoteAmt.isZero()
                    ? new Decimal(0)
                    : absDiff.div(quoteAmt).times(100);

                intent.slippage = {
                    abs: absDiff.toString(),
                    pct: pctDiff.toString(),
                };
            }
        } else if (intent.fill && !intent.quote) {
            intent.status = 'orphan_fill';
        } else if (intent.quote && !intent.fill) {
            intent.status = 'pending';
        }
    }

    public getIntents(): PairedIntent[] {
        return Array.from(this.intents.values())
            .sort((a, b) => {
                // Sort by latest timestamp (either fill or quote)
                const timeA = a.fill?.timestamp || a.quote?.timestamp || '0';
                const timeB = b.fill?.timestamp || b.quote?.timestamp || '0';
                return Number(timeB) - Number(timeA);
            });
    }

    public getStats() {
        const all = this.getIntents().filter(i => i.status === 'filled' && i.slippage);
        if (all.length === 0) return null;

        const pcts = all.map(i => new Decimal(i.slippage!.pct));
        const max = Decimal.max(...pcts);
        const min = Decimal.min(...pcts);

        // Average
        const sum = pcts.reduce((acc, curr) => acc.plus(curr), new Decimal(0));
        const avg = sum.div(all.length);

        return {
            count: all.length,
            avgPct: avg.toString(),
            maxPct: max.toString(),
            minPct: min.toString(),
        };
    }
}

// Singleton instance for the app
export const pairingService = new PairingService();
