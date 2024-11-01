import * as pdfjsLib from 'pdfjs-dist';

// Initialize PDF.js worker
const workerUrl = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
);
pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl.href;

export interface PdfParseOptions {
    imageFormat: 'png' | 'jpeg';
    scale?: number;
}

export interface PdfPage {
    imageData: Uint8Array;
    pageNumber: number;
}

export class PdfParser {
    private static instance: PdfParser;

    private constructor() { }

    public static getInstance(): PdfParser {
        if (!PdfParser.instance) {
            PdfParser.instance = new PdfParser();
        }
        return PdfParser.instance;
    }

    public async parsePdfToImages(
        pdfFile: ArrayBuffer,
        options: PdfParseOptions
    ): Promise<PdfPage[]> {
        const {
            scale = 2.0,
            imageFormat = 'png'
        } = options;

        // Load the PDF document
        const loadingTask = pdfjsLib.getDocument({ data: pdfFile });
        const pdf = await loadingTask.promise;
        const pages: PdfPage[] = [];

        // Process all pages
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            // Get the page
            const page = await pdf.getPage(pageNum);

            // Calculate viewport dimensions
            const viewport = page.getViewport({ scale });

            // Create canvas
            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;

            // Prepare canvas for rendering
            const context = canvas.getContext('2d')!;
            const renderContext = {
                canvasContext: context,
                viewport: viewport
            };

            // Render page to canvas
            await page.render(renderContext).promise;

            // Convert canvas to blob
            const blob = await new Promise<Blob>((resolve) =>
                canvas.toBlob(
                    (blob) => resolve(blob!),
                    `image/${imageFormat}`,
                    1.0
                )
            );

            // Convert blob to Uint8Array
            const imageData = new Uint8Array(await blob.arrayBuffer());

            pages.push({
                imageData,
                pageNumber: pageNum
            });
        }

        return pages;
    }
} 