import * as THREE from 'three';
import { Page, PageParams } from './Page';
import { PdfPage } from 'src/utils/pdfParser';

// Add this new class for the singleton texture loader
export class TextureLoader {
    private static instance: TextureLoader;
    private loader: THREE.TextureLoader;
    private cache: Map<string, THREE.Texture>;

    private constructor() {
        this.loader = new THREE.TextureLoader();
        this.cache = new Map();
    }

    public static getInstance(): TextureLoader {
        if (!TextureLoader.instance) {
            TextureLoader.instance = new TextureLoader();
        }
        return TextureLoader.instance;
    }

    public load(texturePath: string): THREE.Texture {
        if (this.cache.has(texturePath)) {
            return this.cache.get(texturePath)!;
        }
        const texture = this.loader.load(texturePath);
        this.cache.set(texturePath, texture);
        return texture;
    }
}

export type BookMeshParams = {
    bookThickness: number;
    bookWidth: number;
    bookHeight: number;
    coverWidth: number;
};

export class Book {
    private params: BookMeshParams;
    private texturePath: string;
    private coverMesh!: THREE.Mesh;
    private leftSideMesh!: THREE.Mesh;
    private rightSideMesh!: THREE.Mesh;
    private bookMesh: THREE.Mesh;
    private pages: Page[] = [];
    private numPages: number;

    constructor(params: BookMeshParams, texturePath: string, pages: Page[] = []) {
        this.params = params;
        this.texturePath = texturePath;
        this.numPages = pages.length;
        this.pages = pages;
        this.bookMesh = this.createBookMesh();
    }

    public setNumPages(numPages: number): void {
        this.numPages = numPages;
    }

    public static empty(params: BookMeshParams, texturePath: string): Book {
        const book = new Book(params, texturePath);
        book.setNumPages(0);
        return book;
    }

    public static fromPdfPages(params: BookMeshParams, texturePath: string, pdfPages: PdfPage[]): Book {
        const book = new Book(params, texturePath);
        book.setNumPages(pdfPages.length);
        for (const pdfPage of pdfPages) {
            book.appendPageFromPdf(pdfPage);
        }
        return book;
    }

    private createBox(boxCenter: THREE.Vector3, boxSize: THREE.Vector3): THREE.Mesh {
        const geometry = new THREE.BoxGeometry(boxSize.x, boxSize.y, boxSize.z);
        const material = new THREE.MeshLambertMaterial({ map: TextureLoader.getInstance().load(this.texturePath) });
        const box = new THREE.Mesh(geometry, material);
        box.position.set(boxCenter.x, boxCenter.y, boxCenter.z);
        return box;
    }

    public setCoverAngles(angle: number): void {
        this.leftSideMesh.rotation.y = -angle;
        this.rightSideMesh.rotation.y = angle;
    }

    private createBookMesh(): THREE.Mesh {
        const { bookThickness, bookWidth, bookHeight, coverWidth } = this.params;

        this.coverMesh = this.createBox(
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(coverWidth, bookHeight, bookThickness)
        );

        this.leftSideMesh = this.createBox(
            new THREE.Vector3(-coverWidth / 2, 0, bookThickness / 2),
            new THREE.Vector3(bookThickness, bookHeight, bookWidth)
        );

        this.rightSideMesh = this.createBox(
            new THREE.Vector3(coverWidth / 2, 0, bookThickness / 2),
            new THREE.Vector3(bookThickness, bookHeight, bookWidth)
        );

        this.leftSideMesh.geometry.translate(- bookThickness / 2, 0, bookWidth / 2);
        this.rightSideMesh.geometry.translate(bookThickness / 2, 0, bookWidth / 2);

        const book = new THREE.Mesh();
        book.add(this.coverMesh);
        book.add(this.leftSideMesh);
        book.add(this.rightSideMesh);

        for (const page of this.pages) {
            book.add(page.getMesh());
        }

        return book;
    }

    getPageParams(): PageParams {
        const { bookThickness, bookWidth, bookHeight } = this.params;
        const pageWidth = (bookWidth - bookThickness) * 0.95;
        return {
            width: pageWidth,
            height: bookHeight,
        }
    }

    public appendPageFromPdf(pdfPage: PdfPage): void {

        const page = Page.fromPdfPage(
            pdfPage,
            this.getPageParams()
        );


        this.appendPage(page);
    }
    public appendPagesFromPdf(pdfPages: PdfPage[]): void {
        const pages = pdfPages.map(
            page => Page.fromPdfPage(
                page,
                this.getPageParams()
            )
        );
        this.appendPages(pages);
    }

    public appendPage(page: Page): void {
        const { bookThickness, bookWidth, bookHeight, coverWidth } = this.params;
        const pageWidth = (bookWidth - bookThickness) * 0.95;

        const pagePosition = new THREE.Vector3(
            -coverWidth / 2 + this.pages.length * (coverWidth / this.numPages) + (coverWidth / this.numPages) / 2,
            0,
            bookThickness / 2
        );
        const pageRotation = new THREE.Euler(0, -Math.PI / 2, 0);
        page.getMesh().position.set(pagePosition.x, pagePosition.y, pagePosition.z);
        page.getMesh().rotation.set(pageRotation.x, pageRotation.y, pageRotation.z);
        this.pages.push(page);
        this.bookMesh.add(page.getMesh());
    }

    public appendPages(pages: Page[]): void {
        for (const page of pages) {
            this.appendPage(page);
        }
    }


    public getOuterSize(): THREE.Vector3 {
        const { bookThickness, bookWidth, bookHeight, coverWidth } = this.params;
        return new THREE.Vector3(
            coverWidth + bookThickness * 2,
            bookHeight,
            bookWidth + bookThickness
        );
    }

    public getMesh(): THREE.Mesh {
        return this.bookMesh;
    }

    public copy(): Book {
        const newBook = new Book(this.params, this.texturePath, this.pages);
        return newBook;
    }

    // New method to access pages
    public getPages(): Page[] {
        return this.pages;
    }
}
