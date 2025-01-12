import { config } from '../config';

export interface BookPDFSource {
    title: string;
    author: string | null;
    pdf_path: string;
}

interface BookCollectorResponse {
    type: 'success' | 'error';
    data?: BookPDFSource[];
    message?: string;
}

export type BookCollectorSource = 'guy_books';

export class BookPaginationIterator implements AsyncIterator<BookPDFSource[]> {
    private paginationId: number | null = null;
    private hasMore = true;

    constructor(
        private readonly source: BookCollectorSource,
        private readonly baseUrl: string
    ) { }

    async init(): Promise<void> {
        const response = await fetch(`${this.baseUrl}/pagination_init/${this.source}`);
        const result: BookCollectorResponse = await response.json();

        if (result.type === 'error' || !result.data || result.data.length === 0) {
            throw new Error(result.message || 'Failed to initialize pagination');
        }

        // Server returns pagination ID in the title field of the first book
        const paginationIdMatch = result.data[0].title.match(/pagination_id:(\d+)/);
        if (!paginationIdMatch) {
            throw new Error('Invalid pagination ID format received');
        }

        this.paginationId = parseInt(paginationIdMatch[1], 10);
    }

    async next(): Promise<IteratorResult<BookPDFSource[]>> {
        if (!this.hasMore || this.paginationId === null) {
            return { done: true, value: undefined };
        }

        const response = await fetch(`${this.baseUrl}/pagination_next/${this.source}/${this.paginationId}`);
        const result: BookCollectorResponse = await response.json();

        if (result.type === 'error') {
            if (result.message === 'No more pages available') {
                this.hasMore = false;
                return { done: true, value: undefined };
            }
            throw new Error(result.message || 'Failed to fetch next page');
        }

        if (!result.data) {
            this.hasMore = false;
            return { done: true, value: undefined };
        }

        return {
            done: false,
            value: result.data
        };
    }

    [Symbol.asyncIterator](): AsyncIterator<BookPDFSource[]> {
        return this;
    }
}

export class BookCollectorAPI {
    private static baseUrl = config.bookCollectorUrl;

    static async fetchBooks(source: BookCollectorSource): Promise<BookPDFSource[]> {
        const response = await fetch(`${this.baseUrl}/all/${source}`);
        const result: BookCollectorResponse = await response.json();

        if (result.type === 'error' || !result.data) {
            throw new Error(result.message || 'Failed to fetch books');
        }

        return result.data;
    }

    static async createPaginatedBooks(source: BookCollectorSource): Promise<BookPaginationIterator> {
        const iterator = new BookPaginationIterator(source, this.baseUrl);
        await iterator.init();
        return iterator;
    }
} 