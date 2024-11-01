import * as THREE from 'three';
import { cover } from 'three/src/extras/TextureUtils';

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
    numPages: number;
};

export class Book {
    private params: BookMeshParams;
    private texturePath: string;
    private coverMesh!: THREE.Mesh;
    private leftSideMesh!: THREE.Mesh;
    private rightSideMesh!: THREE.Mesh;
    private bookMesh: THREE.Mesh;

    constructor(params: BookMeshParams, texturePath: string) {
        this.params = params;
        this.texturePath = texturePath;
        this.bookMesh = this.createBookMesh();
    }

    private createBox(boxCenter: THREE.Vector3, boxSize: THREE.Vector3): THREE.Mesh {
        const geometry = new THREE.BoxGeometry(boxSize.x, boxSize.y, boxSize.z);
        const material = new THREE.MeshLambertMaterial({ map: TextureLoader.getInstance().load(this.texturePath) });
        const box = new THREE.Mesh(geometry, material);
        box.position.set(boxCenter.x, boxCenter.y, boxCenter.z);
        return box;
    }

    private createPage(rootPosition: THREE.Vector3, pageSize: THREE.Vector2): THREE.Mesh {
        const geometry = new THREE.PlaneGeometry(pageSize.x, pageSize.y);
        const material = new THREE.MeshLambertMaterial({ map: TextureLoader.getInstance().load("assets/page.jpg"), side: THREE.DoubleSide });
        const page = new THREE.Mesh(geometry, material);
        page.position.set(rootPosition.x, rootPosition.y, rootPosition.z);
        return page;
    }

    public setCoverAngles(angle: number): void {
        this.leftSideMesh.rotation.y = -angle;
        this.rightSideMesh.rotation.y = angle;
    }

    private createBookMesh(): THREE.Mesh {
        const { bookThickness, bookWidth, bookHeight, coverWidth, numPages } = this.params;

        this.coverMesh = this.createBox(
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(coverWidth, bookHeight, bookThickness)
        );

        // Positioning in this specific way to make sure the rotation pivot is correct
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

        let pages: THREE.Mesh[] = [];
        for (let i = 0; i < numPages; i++) {
            const pageWidth = (bookWidth - bookThickness) * 0.95;
            const page = this.createPage(
                new THREE.Vector3(0, 0, 0),
                new THREE.Vector2(pageWidth, bookHeight)
            );
            page.rotation.y = Math.PI / 2;
            page.position.x = -coverWidth / 2 + i * (coverWidth / numPages) + (coverWidth / numPages) / 2;
            page.position.z = pageWidth / 2 + bookThickness / 2;
            pages.push(page);
        }

        const book = new THREE.Mesh();
        book.add(this.coverMesh);
        book.add(this.leftSideMesh);
        book.add(this.rightSideMesh);
        pages.forEach(page => book.add(page));
        return book;
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
        const newBook = new Book(this.params, this.texturePath);
        return newBook;
    }
}
