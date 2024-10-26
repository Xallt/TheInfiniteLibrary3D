import * as THREE from 'three';
import { Book, BookMeshParams } from '../components/Book';
import { createControls } from '../components/Controls';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { TrackballControls } from 'three/examples/jsm/controls/TrackballControls.js';

export class MainScene {
    private camera!: THREE.PerspectiveCamera;
    private scene!: THREE.Scene;
    private renderer!: THREE.WebGLRenderer;
    private controls!: TrackballControls;
    private stats!: Stats;
    private bookParams!: BookMeshParams;

    constructor(numBooks: number) {
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

        this.initBooks(numBooks);
    }

    private initCamera(): void {
        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 1000);
        this.camera.position.set(2, 1, 50);
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

    private initBooks(numBooks: number): void {
        this.bookParams = {
            bookThickness: 1,
            bookWidth: 15,
            bookHeight: 20,
            coverWidth: 4,
            numPages: 100,
        };

        const sampleRadius = 100;

        for (let i = 0; i < numBooks; i++) {
            const book = new Book(this.bookParams, "assets/book-cover.jpg");
            const bookMesh = book.getMesh();
            this.scene.add(bookMesh);

            // Random translation
            bookMesh.position.x = Math.random() * sampleRadius - sampleRadius / 2;
            bookMesh.position.y = Math.random() * sampleRadius - sampleRadius / 2;
            bookMesh.position.z = Math.random() * sampleRadius - sampleRadius / 2;

            // Random rotation
            bookMesh.rotation.x = Math.random() * Math.PI;
            bookMesh.rotation.y = Math.random() * Math.PI;
            bookMesh.rotation.z = Math.random() * Math.PI;
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
