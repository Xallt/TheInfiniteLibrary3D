import * as THREE from 'three';
import { Book, BookMeshParams } from '../components/Book';
import { createControls } from '../components/Controls';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { TrackballControls } from 'three/examples/jsm/controls/TrackballControls.js';
import { Bookshelf, BookshelfParams } from '../components/Bookshelf';
import { PdfPage } from 'src/utils/pdfParser';
import { Page } from 'src/components/Page';

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
    private originalBookPositions: Map<number, THREE.Vector3> = new Map();
    private isBookInViewMode: boolean = false;
    private viewingBookIndex: number = -1;
    private viewingBookMesh: THREE.Mesh | null = null;

    constructor(
        container: HTMLElement,
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

        this.init(container);
    }

    private init(container: HTMLElement): void {
        this.initCamera();
        this.initScene();
        this.initLighting();
        this.initRenderer(container);
        this.initControls();
        this.initStats();
        this.addEventListeners();

        this.initBookshelf();

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

    public addBook(pdfPages: PdfPage[] = []): Book {
        const book = Book.fromPdfPages(
            this.bookParams,
            "assets/book-cover.jpg",
            pdfPages
        );
        const added = this.bookshelf.addBook(book);
        if (added) {
            this.books.push(book);
            // If this is the first book, select it
            if (this.books.length === 1) {
                this.selectBook(0);
            }
        }

        return book;
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
        const prevIndex = (this.selectedBookIndex + this.books.length - 1) % this.books.length;
        this.selectBook(prevIndex);
    }

    public getBookCount(): number {
        return this.books.length;
    }

    public viewSelectedBook(): void {
        if (this.selectedBookIndex === -1 || this.isBookInViewMode) return;

        const originalBook = this.books[this.selectedBookIndex];
        const originalMesh = originalBook.getMesh();

        // Hide the original book
        originalMesh.visible = false;

        // Create and position a copy of the book
        const bookCopy = originalBook.copy();
        bookCopy.setCoverAngles(Math.PI / 2);
        const viewingMesh = bookCopy.getMesh();
        viewingMesh.position.set(0, 0, 50);  // In front of camera
        this.scene.add(viewingMesh);
        this.viewingBookMesh = viewingMesh;

        // Update camera controls target to the book position
        this.controls.target.copy(viewingMesh.position);
        this.controls.update();

        this.isBookInViewMode = true;
        this.viewingBookIndex = this.selectedBookIndex;

        // Update selection indicator
        this.selectionIndicator.position.copy(viewingMesh.position);
        this.selectionIndicator.position.z += 20;
    }

    public returnBookToShelf(): void {
        if (!this.isBookInViewMode || this.viewingBookIndex === -1) return;

        // Show the original book
        const originalBook = this.books[this.viewingBookIndex];
        const originalMesh = originalBook.getMesh();
        originalMesh.visible = true;

        // Remove the copy
        if (this.viewingBookMesh) {
            this.scene.remove(this.viewingBookMesh);
            this.viewingBookMesh = null;
        }

        // Reset camera controls target to origin
        this.controls.target.set(0, 0, 0);
        this.controls.update();

        this.isBookInViewMode = false;

        // Update selection indicator
        const position = this.bookshelf.getBookPosition(this.viewingBookIndex);
        if (position) {
            position.z += 20;
            this.selectionIndicator.position.copy(position);
        }

        this.viewingBookIndex = -1;
    }

    public isViewingBook(): boolean {
        return this.isBookInViewMode;
    }
}
