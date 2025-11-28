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
        try {
            const response = await axios.get<SodaxDetailResponse>(`${BASE_URL}/messages/${id}`);
            if (response.data.data && response.data.data.length > 0) {
                return response.data.data[0];
            }
            return null;
        } catch (error) {
            console.error(`Error fetching message detail for ${id}:`, error);
            return null;
        }
    }

    static async fetchMessageDetailsBatch(ids: number[]): Promise<SodaxMessageDetail[]> {
        const results: SodaxMessageDetail[] = [];
        const CHUNK_SIZE = 5;
        const DELAY_MS = 1000;

        for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
            const chunk = ids.slice(i, i + CHUNK_SIZE);
            const promises = chunk.map(id => this.fetchMessageDetail(id));
            const chunkResults = await Promise.all(promises);

            for (const res of chunkResults) {
                if (res) results.push(res);
            }

            if (i + CHUNK_SIZE < ids.length) {
                await new Promise(resolve => setTimeout(resolve, DELAY_MS));
            }
        }

        return results;
    }
}
