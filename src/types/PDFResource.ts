export interface PDFMetadata {
    title?: string;
    author?: string;
    numPages: number;
    fileSize?: number;
}

export abstract class PDFResource {
    protected metadata?: PDFMetadata;

    abstract getArrayBuffer(): Promise<ArrayBuffer>;
    abstract getDisplayName(): string;

    setMetadata(metadata: PDFMetadata) {
        this.metadata = metadata;
    }

    getMetadata(): PDFMetadata | undefined {
        return this.metadata;
    }
}

export class URLPDFResource extends PDFResource {
    private url: string;

    constructor(url: string) {
        super();
        if (!url.trim()) {
            throw new Error('URL cannot be empty');
        }
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