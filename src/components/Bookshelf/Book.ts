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
                return -angle + eps;
            } else {
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

export type BookState = {
    id: number;
    params: BookMeshParams;
    mesh: THREE.Mesh;
    pages: (Page | null)[];
    openingState: BookOpeningState;
};

export type BookActions = {
    setState(openingState: BookOpeningState): void;
    addPage(page: Page, index: number): void;
    resizePageArray(newSize: number): void;
    selectPage(pageIndex: number, angle?: number): void;
    setCoverAngles(angle: number): void;
    storeOriginalTransform(): void;
    restoreOriginalTransform(): void;
    copy(): Book;
};

export type Book = { state: BookState; actions: BookActions };

export function getBookOuterSize(params: BookMeshParams): THREE.Vector3 {
    const { bookThickness, bookWidth, bookHeight, coverWidth } = params;
    return new THREE.Vector3(
        coverWidth + bookThickness * 2,
        bookHeight,
        bookWidth + bookThickness
    );
}

export function buildEmptyBook(
    params: BookMeshParams,
    bookTexture: BookTexture,
    numPages: number,
    id: number,
    initialState: BookOpeningState = buildUniformlyOpenedState(),
): Book {
    return buildBook(params, bookTexture, new Array(numPages).fill(null), initialState, id);
}

export function buildBook(
    params: BookMeshParams,
    bookTexture: BookTexture,
    pages: (Page | null)[],
    initialState: BookOpeningState = buildUniformlyOpenedState(),
    id: number,
): Book {
    let originalPosition: THREE.Vector3 | undefined;
    let originalRotation: THREE.Euler | undefined;

    let coverMesh!: THREE.Mesh;
    let leftSideMesh!: THREE.Mesh;
    let rightSideMesh!: THREE.Mesh;

    const state: BookState = {
        id,
        params,
        mesh: null!,
        pages: [...pages],
        openingState: initialState,
    };

    function createBoxGeometry(boxSize: THREE.Vector3, uvs: QuadUVs): THREE.BufferGeometry {
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

    function createBox(boxCenter: THREE.Vector3, _boxSize: THREE.Vector3, geometry: THREE.BufferGeometry): THREE.Mesh {
        const material = new THREE.MeshLambertMaterial({ map: bookTexture.getTexture() });
        const box = new THREE.Mesh(geometry, material);
        box.position.set(boxCenter.x, boxCenter.y, boxCenter.z);
        return box;
    }

    function updateBookRotations(): void {
        const { coverAngle, pageAngles } = state.openingState.getPageRotationArgs(state.pages.length);
        leftSideMesh.rotation.y = coverAngle;
        rightSideMesh.rotation.y = -coverAngle;
        state.pages.forEach((page, index) => {
            if (page) {
                page.getMesh().rotation.y = pageAngles[index] - Math.PI / 2;
            }
        });
    }

    function createBookMesh(): THREE.Mesh {
        const { bookThickness, bookWidth, bookHeight, coverWidth } = params;

        coverMesh = createBox(
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(coverWidth, bookHeight, bookThickness),
            createBoxGeometry(new THREE.Vector3(coverWidth, bookHeight, bookThickness), {
                front: bookTexture.getSpineUVs(),
                back: bookTexture.getSpineUVs(),
                left: bookTexture.getLeftLeftUVs(),
                right: bookTexture.getRightRightUVs(),
                top: bookTexture.getSpineTopSideUVs(),
                bottom: bookTexture.getSpineBottomSideUVs()
            })
        );

        rightSideMesh = createBox(
            new THREE.Vector3(-coverWidth / 2, 0, bookThickness / 2),
            new THREE.Vector3(bookThickness, bookHeight, bookWidth),
            createBoxGeometry(new THREE.Vector3(bookThickness, bookHeight, bookWidth), {
                front: bookTexture.getLeftLeftUVs(),
                back: bookTexture.getRightRightUVs(),
                left: bookTexture.getRightSideUVs(),
                right: bookTexture.getRightSideUVs(),
                top: bookTexture.getRightSideTopUVs(),
                bottom: bookTexture.getRightSideBottomUVs()
            })
        );

        leftSideMesh = createBox(
            new THREE.Vector3(coverWidth / 2, 0, bookThickness / 2),
            new THREE.Vector3(bookThickness, bookHeight, bookWidth),
            createBoxGeometry(new THREE.Vector3(bookThickness, bookHeight, bookWidth), {
                front: bookTexture.getLeftLeftUVs(),
                back: bookTexture.getRightRightUVs(),
                left: bookTexture.getLeftSideUVs(),
                right: bookTexture.getLeftSideUVs(),
                top: bookTexture.getLeftSideTopUVs(),
                bottom: bookTexture.getLeftSideBottomUVs()
            })
        );

        rightSideMesh.geometry.translate(-bookThickness / 2, 0, bookWidth / 2);
        leftSideMesh.geometry.translate(bookThickness / 2, 0, bookWidth / 2);

        const book = new THREE.Mesh();
        book.add(coverMesh);
        book.add(leftSideMesh);
        book.add(rightSideMesh);

        state.pages.forEach((page, index) => {
            if (page) {
                const pagePosition = new THREE.Vector3(
                    -coverWidth / 2 + index * (coverWidth / state.pages.length) + (coverWidth / state.pages.length) / 2,
                    0,
                    bookThickness / 2
                );
                const { pageAngles } = state.openingState.getPageRotationArgs(state.pages.length);
                const pageRotation = new THREE.Euler(0, pageAngles[index], 0);
                page.getMesh().position.set(pagePosition.x, pagePosition.y, pagePosition.z);
                page.getMesh().rotation.set(pageRotation.x, pageRotation.y, pageRotation.z);
                book.add(page.getMesh());
            }
        });

        return book;
    }

    state.mesh = createBookMesh();

    const actions: BookActions = {
        setState(newState: BookOpeningState): void {
            state.openingState = newState;
            updateBookRotations();
        },

        addPage(page: Page, index: number): void {
            if (index < 0 || index >= state.pages.length) {
                throw new Error(`Page index ${index} is out of bounds (0-${state.pages.length - 1})`);
            }
            const { bookThickness, coverWidth } = params;
            const pagePosition = new THREE.Vector3(
                -coverWidth / 2 + index * (coverWidth / state.pages.length) + (coverWidth / state.pages.length) / 2,
                0,
                bookThickness / 2
            );
            const { pageAngles } = state.openingState.getPageRotationArgs(state.pages.length);
            const pageRotation = new THREE.Euler(0, pageAngles[index] - Math.PI / 2, 0);
            page.getMesh().position.set(pagePosition.x, pagePosition.y, pagePosition.z);
            page.getMesh().rotation.set(pageRotation.x, pageRotation.y, pageRotation.z);

            if (state.pages[index]) {
                state.mesh.remove(state.pages[index]!.getMesh());
            }
            state.pages[index] = page;
            state.mesh.add(page.getMesh());
        },

        resizePageArray(newSize: number): void {
            const newPages = new Array(newSize).fill(null);
            for (let i = 0; i < Math.min(state.pages.length, newSize); i++) {
                if (state.pages[i]) {
                    state.mesh.remove(state.pages[i]!.getMesh());
                }
            }
            state.pages = newPages;
            updateBookRotations();
        },

        selectPage(pageIndex: number, angle: number = Math.PI / 2): void {
            if (pageIndex < 0 || pageIndex > state.pages.length) {
                throw new Error(`Page index ${pageIndex} is out of bounds (0-${state.pages.length - 1})`);
            }
            actions.setState(buildPageSelectedState(angle, pageIndex));
        },

        setCoverAngles(angle: number): void {
            actions.setState(buildUniformlyOpenedState(angle));
        },

        storeOriginalTransform(): void {
            originalPosition = state.mesh.position.clone();
            originalRotation = state.mesh.rotation.clone();
        },

        restoreOriginalTransform(): void {
            if (!originalPosition || !originalRotation) return;
            state.mesh.position.copy(originalPosition);
            state.mesh.rotation.copy(originalRotation);
            actions.setCoverAngles(0);
        },

        copy(): Book {
            return buildBook(params, bookTexture, state.pages, state.openingState, id);
        },
    };

    return { state, actions };
}
