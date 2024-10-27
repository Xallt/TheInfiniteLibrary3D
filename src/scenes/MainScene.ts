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

    constructor(numBooks: number, bookParams: BookMeshParams, bookshelfParams: BookshelfParams) {
        this.bookParams = bookParams;
        this.bookshelfParams = bookshelfParams;
        this.init(numBooks);
    }

    private init(numBooks: number): void {
        this.initCamera();
        this.initScene();
        this.initLighting();
        this.initRenderer();
        this.initControls();
        this.initStats();
        this.addEventListeners();

        this.initBookshelf();
        this.initBooks(numBooks);
    }

    private initCamera(): void {
        this.camera = new THREE.PerspectiveCamera(
            60,
            window.innerWidth / window.innerHeight,
            1,
            5000
        );
        this.camera.position.set(2, 1, 150);
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
            this.bookshelf.addBook(book);
        }
    }

    private initRenderer(): void {
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setAnimationLoop(this.animate.bind(this));
        document.body.appendChild(this.renderer.domElement);
    }

    private initControls(): void {
        this.controls = createControls(this.camera, this.renderer);
    }

    private initStats(): void {
        this.stats = new Stats();
        document.body.appendChild(this.stats.dom);
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
}
