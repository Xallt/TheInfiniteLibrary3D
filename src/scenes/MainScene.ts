import * as THREE from 'three';
import { Book, BookMeshParams } from '../components/Book';
import { createControls } from '../components/Controls';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { TrackballControls } from 'three/examples/jsm/controls/TrackballControls.js';
import { Bookshelf, BookshelfParams } from '../components/Bookshelf';

export class MainScene {
    private camera!: THREE.PerspectiveCamera;
    private scene!: THREE.Scene;
    private renderer!: THREE.WebGLRenderer;
    private controls!: TrackballControls;
    private stats!: Stats;
    private bookParams!: BookMeshParams;
    private bookshelfParams!: BookshelfParams;

    private bookshelf!: Bookshelf;
    private books: Book[] = [];
    private selectedBookIndex: number = -1;
    private selectionIndicator: THREE.Mesh;

    constructor(
        container: HTMLElement,
        numBooks: number,
        bookParams: BookMeshParams,
        bookshelfParams: BookshelfParams
    ) {
        this.bookParams = bookParams;
        this.bookshelfParams = bookshelfParams;

        // Create selection indicator first
        const geometry = new THREE.SphereGeometry(2, 32, 32);
        const material = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            transparent: true,
            opacity: 0.5,
            depthTest: false  // Make sure it's always visible
        });
        this.selectionIndicator = new THREE.Mesh(geometry, material);
        this.selectionIndicator.visible = false;

        this.init(container, numBooks);
    }

    private init(container: HTMLElement, numBooks: number): void {
        this.initCamera();
        this.initScene();
        this.initLighting();
        this.initRenderer(container);
        this.initControls();
        this.initStats();
        this.addEventListeners();

        this.initBookshelf();
        this.initBooks(numBooks);

        this.scene.add(this.selectionIndicator);
    }

    private initCamera(): void {
        this.camera = new THREE.PerspectiveCamera(
            60,
            window.innerWidth / window.innerHeight,
            1,
            5000
        );
        this.camera.position.set(0, 0, 150);
    }

    private initScene(): void {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xf0f0f0);
    }

    private initLighting(): void {
        this.scene.add(new THREE.AmbientLight(0xffffff));
        const light = new THREE.DirectionalLight(0xffffff);
        light.position.set(1, 1, 1).normalize();
        this.scene.add(light);
    }

    private initBookshelf(): void {
        this.bookshelf = new Bookshelf(this.bookshelfParams, "assets/wood.jpeg");
        const bookshelfMesh = this.bookshelf.getMesh();

        const bookshelfOuterSize = this.bookshelf.getOuterSize();


        // Place the bookshelf at the center of the scene
        bookshelfMesh.position.set(-bookshelfOuterSize.x / 2, bookshelfOuterSize.y / 2, 0);

        this.scene.add(bookshelfMesh);
    }

    private initBooks(numBooks: number): void {
        for (let i = 0; i < numBooks; i++) {
            const book = new Book(this.bookParams, "assets/book-cover.jpg");
            const added = this.bookshelf.addBook(book);
            if (added) {
                this.books.push(book);
            }
        }
        if (this.books.length > 0) {
            this.selectBook(0);
        }
    }

    private initRenderer(container: HTMLElement): void {
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setAnimationLoop(this.animate.bind(this));
        container.appendChild(this.renderer.domElement);
    }

    private initControls(): void {
        this.controls = createControls(this.camera, this.renderer);
    }

    private initStats(): void {
        this.stats = new Stats();
        this.stats.dom.style.position = 'absolute';
        this.renderer.domElement.parentElement?.appendChild(this.stats.dom);
    }

    private addEventListeners(): void {
        window.addEventListener('resize', this.onWindowResize.bind(this));
    }

    private onWindowResize(): void {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.controls.handleResize();
    }

    private animate(): void {
        this.controls.update();
        this.render();
        this.stats.update();
    }

    private render(): void {
        this.renderer.clear();
        this.renderer.render(this.scene, this.camera);
    }

    public addBook(): void {
        const book = new Book(this.bookParams, "assets/book-cover.jpg");
        const added = this.bookshelf.addBook(book);
        if (added) {
            this.books.push(book);
            // Wait a frame for the book to be properly positioned
            requestAnimationFrame(() => {
                this.selectBook(this.books.length - 1);
            });
        } else {
            console.warn("Could not add book - bookshelf is full");
        }
    }

    public selectBook(index: number): void {
        if (index >= 0 && index < this.books.length) {
            this.selectedBookIndex = index;
            const position = this.bookshelf.getBookPosition(index);

            if (position) {
                // Move indicator in front of the book
                position.z += 20;  // Move it forward
                this.selectionIndicator.position.copy(position);
                this.selectionIndicator.visible = true;
            }
        } else {
            this.selectionIndicator.visible = false;
            this.selectedBookIndex = -1;
        }
    }

    public selectNextBook(): void {
        if (this.books.length === 0) return;
        const nextIndex = (this.selectedBookIndex + 1) % this.books.length;
        this.selectBook(nextIndex);
    }

    public selectPreviousBook(): void {
        if (this.books.length === 0) return;
        const prevIndex = this.selectedBookIndex <= 0 ? this.books.length - 1 : this.selectedBookIndex - 1;
        this.selectBook(prevIndex);
    }

    public getBookCount(): number {
        return this.books.length;
    }
}
