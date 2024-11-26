import { PdfParser, PdfPage, PdfParseResult } from '../utils/pdfParser';

export interface PDFMetadata {
    title?: string;
    author?: string;
    numPages: number;
    fileSize?: number;
}

export abstract class PDFResource {
    protected metadata?: PDFMetadata;
    protected parseResult?: PdfParseResult;

    abstract getArrayBuffer(): Promise<ArrayBuffer>;
    abstract getDisplayName(): string;

    setMetadata(metadata: PDFMetadata) {
        this.metadata = metadata;
    }

    getMetadata(): PDFMetadata | undefined {
        return this.metadata;
    }

    // Get just the metadata without parsing pages
    async parseMetadata(): Promise<PDFMetadata> {
        const buffer = await this.getArrayBuffer();
        const parser = PdfParser.getInstance();
        const metadata = await parser.parsePdfMetadata(buffer);
        this.setMetadata(metadata);
        return metadata;
    }

    // Get the full parse result including pages
    async getParsedPDF(options: { imageFormat: 'png' | 'jpeg', scale?: number }): Promise<PdfParseResult> {
        if (this.parseResult) {
            return this.parseResult;
        }

        const buffer = await this.getArrayBuffer();
        const parser = PdfParser.getInstance();
        this.parseResult = await parser.parsePdfToImages(buffer, options);

        // Update metadata if we haven't already
        if (!this.metadata) {
            this.setMetadata(this.parseResult.metadata);
        }

        return this.parseResult;
    }

    // Clear cached data to free memory
    clearCache() {
        this.parseResult = undefined;
    }
}

export class URLPDFResource extends PDFResource {
    private url: string;

    constructor(url: string) {
        super();
        this.url = url;
    }

    async getArrayBuffer(): Promise<ArrayBuffer> {
        const response = await fetch(this.url);
        if (!response.ok) {
            throw new Error(`Failed to fetch PDF from URL: ${response.statusText}`);
        }
        return response.arrayBuffer();
    }

    getDisplayName(): string {
        return this.url;
    }
}

export class UploadedPDFResource extends PDFResource {
    private file: File;

    constructor(file: File) {
        super();
        if (!file.type.includes('pdf')) {
            throw new Error('File must be a PDF');
        }
        this.file = file;
    }

    async getArrayBuffer(): Promise<ArrayBuffer> {
        return this.file.arrayBuffer();
    }

    getDisplayName(): string {
        return this.file.name;
    }

    getFileSize(): number {
        return this.file.size;
    }
}

// Factory function to create PDFResources
export const createPDFResource = (source: string | File): PDFResource => {
    if (source instanceof File) {
        return new UploadedPDFResource(source);
    } else {
        return new URLPDFResource(source);
    }
}; 