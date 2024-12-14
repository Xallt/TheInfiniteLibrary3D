/// <reference types="vite/client" />

import * as pdfjsLib from 'pdfjs-dist';
import { PDFMetadata } from 'src/types/PDFResource';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export interface PdfParseOptions {
    imageFormat: 'png' | 'jpeg';
    scale?: number;
}

export interface PdfPage {
    imageData: Uint8Array;
    pageNumber: number;
}

export class PdfParseResult {
    public metadata: PDFMetadata;
    public pages: AsyncGenerator<PdfPage>;

    constructor(
        metadata: PDFMetadata,
        pages: AsyncGenerator<PdfPage>
    ) {
        this.metadata = metadata;
        this.pages = pages;
    }

    async *getPairedPages(): AsyncGenerator<[PdfPage, PdfPage | null], void, unknown> {
        let firstPage: PdfPage | null = null;

        for await (const page of this.pages) {
            if (firstPage === null) {
                firstPage = page;
            } else {
                yield [firstPage, page];
                firstPage = null;
            }
        }

        // Handle odd number of pages
        if (firstPage !== null) {
            yield [firstPage, null];
        }
    }
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

    public async parsePdfMetadata(pdfFile: ArrayBuffer): Promise<PDFMetadata> {
        const loadingTask = pdfjsLib.getDocument({ data: pdfFile });
        const pdf = await loadingTask.promise;
        return { numPages: pdf.numPages };
    }

    public async parsePdfToImages(
        pdfFile: ArrayBuffer,
        options: PdfParseOptions
    ): Promise<PdfParseResult> {
        // Load the PDF document
        const loadingTask = pdfjsLib.getDocument({ data: pdfFile });
        const pdf = await loadingTask.promise;

        const metadata: PDFMetadata = {
            numPages: pdf.numPages
        };

        // Return both metadata and the generator
        return new PdfParseResult(
            metadata,
            this.generatePages(pdf, options)
        );
    }

    private async *generatePages(
        pdf: pdfjsLib.PDFDocumentProxy,
        options: PdfParseOptions
    ): AsyncGenerator<PdfPage> {
        const {
            scale = 2.0,
            imageFormat = 'png'
        } = options;

        // Process pages one at a time
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

            yield {
                imageData,
                pageNumber: pageNum
            };
        }
    }
}
