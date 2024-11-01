import { PDFDocument } from 'pdf-lib';
import sharp from 'sharp';

export interface PdfParseOptions {
    imageFormat: 'png' | 'jpeg';
    dpi?: number;
    prefix?: string;
}

export interface PdfPage {
    imageData: Buffer;
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
            imageFormat = 'png',
            dpi = 300,
            prefix = 'page'
        } = options;

        // Parse PDF
        const pdfDoc = await PDFDocument.load(pdfFile);
        const pageCount = pdfDoc.getPageCount();
        const pages: PdfPage[] = [];

        // Process each page
        for (let i = 0; i < pageCount; i++) {
            const pageNum = i + 1;

            // Create a new document with just this page
            const singlePageDoc = await PDFDocument.create();
            const [page] = await singlePageDoc.copyPages(pdfDoc, [i]);
            singlePageDoc.addPage(page);

            // Save the single page as PDF
            const pageBytes = await singlePageDoc.save();

            // Convert PDF page to image using sharp
            const image = sharp(Buffer.from(pageBytes))
                .resize(undefined, undefined, {
                    fit: 'contain',
                    background: { r: 255, g: 255, b: 255, alpha: 1 }
                })
                .flatten({ background: '#ffffff' });

            // Set DPI
            image.withMetadata({
                density: dpi
            });

            // Get image data as buffer
            const imageData = await image.toFormat(imageFormat).toBuffer();

            pages.push({
                imageData,
                pageNumber: pageNum
            });
        }

        return pages;
    }
} 