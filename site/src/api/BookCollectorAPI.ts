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

export type BookCollectorSource = 'example_book' | 'all/guy_books';

export class BookCollectorAPI {
    private static baseUrl = config.bookCollectorUrl;

    static async fetchBooks(source: BookCollectorSource): Promise<BookPDFSource[]> {
        const response = await fetch(`${this.baseUrl}/${source}`);
        const result: BookCollectorResponse = await response.json();

        if (result.type === 'error' || !result.data) {
            throw new Error(result.message || 'Failed to fetch books');
        }

        return result.data;
    }
} 