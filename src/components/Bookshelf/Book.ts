import * as THREE from 'three';
import { ProceduralMesh } from '../../utils/ProceduralMesh';
import { BookTexture } from './BookTexture';
import { Page } from './Page';

interface QuadUVs {
    front: number[];
    back: number[];
    left: number[];
    right: number[];
    top: number[];
    bottom: number[];
}

export function buildUniformlyOpenedState(angle: number = 0) {
    function getPageRotationArgs(numPages: number): { coverAngle: number, pageAngles: number[] } {
        const pageAngles = Array(numPages).fill(0).map((_, index) => {
            const proportionalAngle = 2 * angle * (index + 1) / numPages - angle - angle / numPages;
            return proportionalAngle;
        });

        return {
            coverAngle: angle,
            pageAngles
        };
    }

    return {
        stateType: 'uniformlyOpened',
        angle,
        getPageRotationArgs
    };
}

export function buildPageSelectedState(angle: number = Math.PI / 2, selectedPageIndex: number = 0) {
    const eps = 0.1; // Small angle to separate pages
    function getPageRotationArgs(numPages: number): { coverAngle: number, pageAngles: number[] } {
        const pageAngles = Array(numPages).fill(0).map((_, index) => {
            if (index < selectedPageIndex) {
                // Pages before selected page fold back
                return -angle + eps;
            } else {
                // Selected page and those after fold forward
                return angle - eps;
            }
        });

        return {
            coverAngle: angle,
            pageAngles
        };
    }

    return {
        stateType: 'pageSelected',
        angle,
        selectedPageIndex,
        getPageRotationArgs
    };
}

export type UniformlyOpenedState = ReturnType<typeof buildUniformlyOpenedState>;
export type PageSelectedState = ReturnType<typeof buildPageSelectedState>;
export type BookOpeningState = UniformlyOpenedState | PageSelectedState;

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
        initialState: BookOpeningState = buildUniformlyOpenedState(),
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
        initialState: BookOpeningState = buildUniformlyOpenedState(),
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
        this.leftSideMesh.rotation.y = coverAngle;
        this.rightSideMesh.rotation.y = -coverAngle;

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
        this.setState(buildUniformlyOpenedState(angle));
    }

    private createBoxGeometry(boxSize: THREE.Vector3, uvs: QuadUVs): THREE.BufferGeometry {
        const corner = new THREE.Vector3(
            -boxSize.x / 2,
            boxSize.y / 2,
            boxSize.z / 2
        );
        const { points, indices } = ProceduralMesh.get3DRectPoints(corner, boxSize);

        const vertices: number[] = [];
        const indicesArray: number[] = [];
        const uvCoords: number[] = [];
        let vertexCounter = 0;

        // Helper to add a quad with specific UVs
        const addQuad = (p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3, p4: THREE.Vector3, quadUVs: number[]) => {
            vertices.push(
                p1.x, p1.y, p1.z,
                p2.x, p2.y, p2.z,
                p3.x, p3.y, p3.z,
                p4.x, p4.y, p4.z
            );

            uvCoords.push(...quadUVs);

            indicesArray.push(
                vertexCounter, vertexCounter + 1, vertexCounter + 2,
                vertexCounter + 2, vertexCounter + 1, vertexCounter + 3
            );

            vertexCounter += 4;
        };

        // Add all faces with their specific UVs
        addQuad(
            points[indices.frontTopLeft], points[indices.frontTopRight],
            points[indices.frontBottomLeft], points[indices.frontBottomRight],
            uvs.front
        );
        addQuad(
            points[indices.backTopRight], points[indices.backTopLeft],
            points[indices.backBottomRight], points[indices.backBottomLeft],
            uvs.back
        );
        addQuad(
            points[indices.frontBottomLeft], points[indices.backBottomLeft],
            points[indices.frontTopLeft], points[indices.backTopLeft],
            uvs.left
        );
        addQuad(
            points[indices.backBottomRight], points[indices.frontBottomRight],
            points[indices.backTopRight], points[indices.frontTopRight],
            uvs.right
        );
        addQuad(
            points[indices.frontTopLeft], points[indices.backTopLeft],
            points[indices.frontTopRight], points[indices.backTopRight],
            uvs.top
        );
        addQuad(
            points[indices.frontBottomLeft], points[indices.frontBottomRight],
            points[indices.backBottomLeft], points[indices.backBottomRight],
            uvs.bottom
        );

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvCoords, 2));
        geometry.setIndex(indicesArray);
        geometry.computeVertexNormals();

        return geometry;
    }

    private createSpineGeometry(boxSize: THREE.Vector3): THREE.BufferGeometry {
        return this.createBoxGeometry(boxSize, {
            front: this.bookTexture.getSpineUVs(),
            back: this.bookTexture.getSpineUVs(),
            left: this.bookTexture.getLeftLeftUVs(),
            right: this.bookTexture.getRightRightUVs(),
            top: this.bookTexture.getSpineTopSideUVs(),
            bottom: this.bookTexture.getSpineBottomSideUVs()
        });
    }

    private createLeftCoverGeometry(boxSize: THREE.Vector3): THREE.BufferGeometry {
        return this.createBoxGeometry(boxSize, {
            front: this.bookTexture.getLeftLeftUVs(),
            back: this.bookTexture.getRightRightUVs(),
            left: this.bookTexture.getLeftSideUVs(),
            right: this.bookTexture.getLeftSideUVs(),
            top: this.bookTexture.getLeftSideTopUVs(),
            bottom: this.bookTexture.getLeftSideBottomUVs()
        });
    }

    private createRightCoverGeometry(boxSize: THREE.Vector3): THREE.BufferGeometry {
        return this.createBoxGeometry(boxSize, {
            front: this.bookTexture.getLeftLeftUVs(),
            back: this.bookTexture.getRightRightUVs(),
            left: this.bookTexture.getRightSideUVs(),
            right: this.bookTexture.getRightSideUVs(),
            top: this.bookTexture.getRightSideTopUVs(),
            bottom: this.bookTexture.getRightSideBottomUVs()
        });
    }

    private createBox(boxCenter: THREE.Vector3, boxSize: THREE.Vector3, geometry: THREE.BufferGeometry): THREE.Mesh {
        const material = new THREE.MeshLambertMaterial({
            map: this.bookTexture.getTexture()
        });
        const box = new THREE.Mesh(geometry, material);
        box.position.set(boxCenter.x, boxCenter.y, boxCenter.z);
        return box;
    }

    private createBookMesh(): THREE.Mesh {
        const { bookThickness, bookWidth, bookHeight, coverWidth } = this.params;

        // Create spine
        this.coverMesh = this.createBox(
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(coverWidth, bookHeight, bookThickness),
            this.createSpineGeometry(new THREE.Vector3(coverWidth, bookHeight, bookThickness))
        );

        // Create right cover
        this.rightSideMesh = this.createBox(
            new THREE.Vector3(-coverWidth / 2, 0, bookThickness / 2),
            new THREE.Vector3(bookThickness, bookHeight, bookWidth),
            this.createRightCoverGeometry(new THREE.Vector3(bookThickness, bookHeight, bookWidth))
        );

        // Create left cover
        this.leftSideMesh = this.createBox(
            new THREE.Vector3(coverWidth / 2, 0, bookThickness / 2),
            new THREE.Vector3(bookThickness, bookHeight, bookWidth),
            this.createLeftCoverGeometry(new THREE.Vector3(bookThickness, bookHeight, bookWidth))
        );

        this.rightSideMesh.geometry.translate(- bookThickness / 2, 0, bookWidth / 2);
        this.leftSideMesh.geometry.translate(bookThickness / 2, 0, bookWidth / 2);

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

    public getOuterSize(): THREE.Vector3 {
        return Book.getOuterSizeForParams(this.params);
    }

    public static getOuterSizeForParams(params: BookMeshParams): THREE.Vector3 {
        const { bookThickness, bookWidth, bookHeight, coverWidth } = params;
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
        const newState = buildPageSelectedState(angle, pageIndex);
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
