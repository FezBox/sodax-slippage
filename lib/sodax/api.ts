import axios from 'axios';

export interface SodaxMessageSummary {
    id: number;
    sn: string;
    action_type: string;
    created_at: string;
}

export interface SodaxMessageDetail extends SodaxMessageSummary {
    action_detail: string;
}

interface SodaxListResponse {
    data: SodaxMessageSummary[];
    meta: any;
}

interface SodaxDetailResponse {
    data: SodaxMessageDetail[];
}

const BASE_URL = 'https://sodaxscan.com/api';

export class SodaxApi {
    private static cache = new Map<number, SodaxMessageDetail>();

    static async fetchLatestMessages(limit = 20): Promise<SodaxMessageSummary[]> {
        try {
            const response = await axios.get<SodaxListResponse>(`${BASE_URL}/messages`, {
                params: { limit },
            });
            return response.data.data;
        } catch (error) {
            console.error('Error fetching latest messages:', error);
            return [];
        }
    }

    static async fetchMessageDetail(id: number): Promise<SodaxMessageDetail | null> {
        if (this.cache.has(id)) {
            // console.log(`[Cache Hit] ${id}`);
            return this.cache.get(id)!;
        }

        try {
            console.log(`[API Fetch] Message ${id}`);
            const response = await axios.get<SodaxDetailResponse>(`${BASE_URL}/messages/${id}`);
            if (response.data.data && response.data.data.length > 0) {
                const detail = response.data.data[0];
                this.cache.set(id, detail);
                return detail;
            }
            return null;
        } catch (error) {
            console.error(`Error fetching message detail for ${id}:`, error);
            return null;
        }
    }

    static async fetchMessageDetailsBatch(ids: number[]): Promise<SodaxMessageDetail[]> {
        const results: SodaxMessageDetail[] = [];
        const missingIds: number[] = [];

        // 1. Check cache first
        for (const id of ids) {
            if (this.cache.has(id)) {
                results.push(this.cache.get(id)!);
            } else {
                missingIds.push(id);
            }
        }

        if (missingIds.length === 0) {
            return results;
        }

        // 2. Fetch missing IDs in chunks
        const CHUNK_SIZE = 5;
        const DELAY_MS = 1000;

        for (let i = 0; i < missingIds.length; i += CHUNK_SIZE) {
            const chunk = missingIds.slice(i, i + CHUNK_SIZE);
            const promises = chunk.map(id => this.fetchMessageDetail(id));
            const chunkResults = await Promise.all(promises);

            for (const res of chunkResults) {
                if (res) results.push(res);
            }

            if (i + CHUNK_SIZE < missingIds.length) {
                await new Promise(resolve => setTimeout(resolve, DELAY_MS));
            }
        }

        return results;
    }
}
