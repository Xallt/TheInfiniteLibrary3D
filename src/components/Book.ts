import * as THREE from 'three';
import { Page, PageParams } from './Page';
import { PdfPage } from 'src/utils/pdfParser';
import { BookTexture } from './BookTexture';
import { ProceduralMesh } from '../utils/ProceduralMesh';

// Add these interfaces at the top of the file
export interface BookOpeningState {
    getPageRotationArgs(numPages: number): { coverAngle: number, pageAngles: number[] };
}

export class UniformlyOpenedState implements BookOpeningState {
    constructor(private angle: number = 0) { }

    getPageRotationArgs(numPages: number): { coverAngle: number, pageAngles: number[] } {
        const pageAngles = Array(numPages).fill(0).map((_, index) => {
            const proportionalAngle = 2 * this.angle * (index + 1) / numPages - this.angle - this.angle / numPages;
            return proportionalAngle;
        });

        return {
            coverAngle: this.angle,
            pageAngles
        };
    }
}

// Add this new state class after UniformlyOpenedState
export class PageSelectedState implements BookOpeningState {
    private readonly eps = 0.1; // Small angle to separate pages

    constructor(
        private angle: number = Math.PI / 2,
        private selectedPageIndex: number = 0
    ) { }

    getPageRotationArgs(numPages: number): { coverAngle: number, pageAngles: number[] } {
        const pageAngles = Array(numPages).fill(0).map((_, index) => {
            if (index < this.selectedPageIndex) {
                // Pages before selected page fold back
                return -this.angle + this.eps;
            } else {
                // Selected page and those after fold forward
                return this.angle - this.eps;
            }
        });

        return {
            coverAngle: this.angle,
            pageAngles
        };
    }

    public getSelectedPageIndex(): number {
        return this.selectedPageIndex;
    }
}

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
    private bookTexture: BookTexture;
    private coverMesh!: THREE.Mesh;
    private leftSideMesh!: THREE.Mesh;
    private rightSideMesh!: THREE.Mesh;
    private bookMesh: THREE.Mesh;
    private pages: (Page | null)[];
    private originalPosition?: THREE.Vector3;
    private originalRotation?: THREE.Euler;
    private openingState: BookOpeningState;
    id: number;

    constructor(
        params: BookMeshParams,
        bookTexture: BookTexture,
        pages: (Page | null)[],
        initialState: BookOpeningState = new UniformlyOpenedState(),
        id: number
    ) {
        this.params = params;
        this.bookTexture = bookTexture;
        this.pages = pages;
        this.openingState = initialState;
        this.bookMesh = this.createBookMesh();
        this.id = id;
    }

    public static empty(
        params: BookMeshParams,
        bookTexture: BookTexture,
        numPages: number,
        id: number,
        initialState: BookOpeningState = new UniformlyOpenedState(),
    ): Book {
        return new Book(params, bookTexture, new Array(numPages).fill(null), initialState, id);
    }

    public getParams(): BookMeshParams {
        return this.params;
    }

    public setState(state: BookOpeningState): void {
        this.openingState = state;
        this.updateBookRotations();
    }

    private updateBookRotations(): void {
        const { coverAngle, pageAngles } = this.openingState.getPageRotationArgs(this.pages.length);

        // Update cover angles
        this.leftSideMesh.rotation.y = -coverAngle;
        this.rightSideMesh.rotation.y = coverAngle;

        // Set page angles
        this.pages.forEach((page, index) => {
            if (page) {
                page.getMesh().rotation.y = pageAngles[index] - Math.PI / 2;
            }
        });
    }

    public addPage(page: Page, index: number): void {
        if (index < 0 || index >= this.pages.length) {
            throw new Error(`Page index ${index} is out of bounds (0-${this.pages.length - 1})`);
        }

        const { bookThickness, bookWidth, coverWidth } = this.params;

        const pagePosition = new THREE.Vector3(
            -coverWidth / 2 + index * (coverWidth / this.pages.length) + (coverWidth / this.pages.length) / 2,
            0,
            bookThickness / 2
        );

        // Get rotation from current state
        const { pageAngles } = this.openingState.getPageRotationArgs(this.pages.length);
        const pageRotation = new THREE.Euler(0, pageAngles[index] - Math.PI / 2, 0);

        page.getMesh().position.set(pagePosition.x, pagePosition.y, pagePosition.z);
        page.getMesh().rotation.set(pageRotation.x, pageRotation.y, pageRotation.z);

        // Remove existing page mesh if it exists
        if (this.pages[index]) {
            this.bookMesh.remove(this.pages[index]!.getMesh());
        }

        this.pages[index] = page;
        this.bookMesh.add(page.getMesh());
    }

    public getPage(index: number): Page | null {
        if (index < 0 || index >= this.pages.length) {
            throw new Error(`Page index ${index} is out of bounds (0-${this.pages.length - 1})`);
        }
        return this.pages[index];
    }

    public getNumPages(): number {
        return this.pages.length;
    }

    public setCoverAngles(angle: number): void {
        this.setState(new UniformlyOpenedState(angle));
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

        // Update the page rotation calculation
        this.pages.forEach((page, index) => {
            if (page) {
                const pagePosition = new THREE.Vector3(
                    -coverWidth / 2 + index * (coverWidth / this.pages.length) + (coverWidth / this.pages.length) / 2,
                    0,
                    bookThickness / 2
                );
                const { pageAngles } = this.openingState.getPageRotationArgs(this.pages.length);
                const pageRotation = new THREE.Euler(0, pageAngles[index], 0);
                page.getMesh().position.set(pagePosition.x, pagePosition.y, pagePosition.z);
                page.getMesh().rotation.set(pageRotation.x, pageRotation.y, pageRotation.z);
                book.add(page.getMesh());
            }
        });

        return book;
    }

    private createBoxGeometry(boxSize: THREE.Vector3): THREE.BufferGeometry {
        // Create the geometry with the corner at origin
        const corner = new THREE.Vector3(
            -boxSize.x / 2,  // Center the box
            boxSize.y / 2,
            boxSize.z / 2
        );
        const { points, indices } = ProceduralMesh.get3DRectPoints(corner, boxSize);

        const vertices: number[] = [];
        const indicesArray: number[] = [];
        let vertexCounter = 0;

        // Helper to add a quad (two triangles) with its own vertices
        const addQuad = (p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3, p4: THREE.Vector3) => {
            vertices.push(
                p1.x, p1.y, p1.z,
                p2.x, p2.y, p2.z,
                p3.x, p3.y, p3.z,
                p4.x, p4.y, p4.z
            );

            indicesArray.push(
                vertexCounter, vertexCounter + 1, vertexCounter + 2,     // First triangle
                vertexCounter + 2, vertexCounter + 1, vertexCounter + 3  // Second triangle
            );

            vertexCounter += 4;
        };

        // Add all faces for a complete box
        // Front
        addQuad(points[indices.frontBottomLeft], points[indices.frontBottomRight],
            points[indices.frontTopLeft], points[indices.frontTopRight]);
        // Back
        addQuad(points[indices.backBottomRight], points[indices.backBottomLeft],
            points[indices.backTopRight], points[indices.backTopLeft]);
        // Left
        addQuad(points[indices.frontBottomLeft], points[indices.backBottomLeft],
            points[indices.frontTopLeft], points[indices.backTopLeft]);
        // Right
        addQuad(points[indices.backBottomRight], points[indices.frontBottomRight],
            points[indices.backTopRight], points[indices.frontTopRight]);
        // Top
        addQuad(points[indices.frontTopLeft], points[indices.frontTopRight],
            points[indices.backTopLeft], points[indices.backTopRight]);
        // Bottom
        addQuad(points[indices.frontBottomLeft], points[indices.frontBottomRight],
            points[indices.backBottomLeft], points[indices.backBottomRight]);

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setIndex(indicesArray);
        geometry.computeVertexNormals();

        return geometry;
    }

    private createBox(boxCenter: THREE.Vector3, boxSize: THREE.Vector3): THREE.Mesh {
        const geometry = this.createBoxGeometry(boxSize);
        const material = new THREE.MeshLambertMaterial({ map: this.bookTexture.getTexture(), side: THREE.DoubleSide });
        const box = new THREE.Mesh(geometry, material);
        box.position.set(boxCenter.x, boxCenter.y, boxCenter.z);
        return box;
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
        const newBook = new Book(this.params, this.bookTexture, this.pages, this.openingState, this.id);
        return newBook;
    }

    public storeOriginalTransform(): void {
        const mesh = this.getMesh();
        this.originalPosition = mesh.position.clone();
        this.originalRotation = mesh.rotation.clone();
    }

    public restoreOriginalTransform(): void {
        if (!this.originalPosition || !this.originalRotation) return;

        const mesh = this.getMesh();
        mesh.position.copy(this.originalPosition);
        mesh.rotation.copy(this.originalRotation);
        this.setCoverAngles(0); // Reset cover angles
    }

    public selectPage(pageIndex: number, angle: number = Math.PI / 2): void {
        if (pageIndex < 0 || pageIndex > this.pages.length) {
            throw new Error(`Page index ${pageIndex} is out of bounds (0-${this.pages.length - 1})`);
        }

        // Create new PageSelectedState with the specified angle and page index
        const newState = new PageSelectedState(angle, pageIndex);
        this.setState(newState);
    }

    public getCurrentState(): BookOpeningState {
        return this.openingState;
    }

    public resizePageArray(newSize: number): void {
        // Create new array with new size, preserving existing pages
        const newPages = new Array(newSize).fill(null);

        // Copy over existing pages that are within the new bounds
        for (let i = 0; i < Math.min(this.pages.length, newSize); i++) {
            if (this.pages[i]) {
                // Remove page from book mesh before reassignment
                this.bookMesh.remove(this.pages[i]!.getMesh());
            }
        }

        this.pages = newPages;
        this.updateBookRotations(); // Update rotations for new page count
    }
}
