import * as THREE from 'three';

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

    private createBookMesh(): THREE.Mesh {
        const { bookThickness, bookWidth, bookHeight, coverWidth, numPages } = this.params;

        const cover = this.createBox(
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(coverWidth, bookHeight, bookThickness)
        );
        const leftSide = this.createBox(
            new THREE.Vector3(-coverWidth / 2 - bookThickness / 2, 0, bookWidth / 2 - bookThickness / 2),
            new THREE.Vector3(bookThickness, bookHeight, bookWidth)
        );
        const rightSide = this.createBox(
            new THREE.Vector3(coverWidth / 2 + bookThickness / 2, 0, bookWidth / 2 - bookThickness / 2),
            new THREE.Vector3(bookThickness, bookHeight, bookWidth)
        );

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
        book.add(cover);
        book.add(leftSide);
        book.add(rightSide);
        pages.forEach(page => book.add(page));
        return book;
    }

    public getMesh(): THREE.Mesh {
        return this.bookMesh;
    }
}
