import * as THREE from 'three';
import { createBookMesh, BookMeshParams } from '../components/Book';
import { createControls } from '../components/Controls';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';
import { TrackballControls } from 'three/examples/jsm/controls/TrackballControls.js';

export class MainScene {
    private camera: THREE.PerspectiveCamera;
    private scene: THREE.Scene;
    private renderer: THREE.WebGLRenderer;
    private controls: TrackballControls;
    private stats: Stats;
    private book: THREE.Mesh;

    constructor() {
        this.init();
    }

    private init(): void {
        this.initCamera();
        this.initScene();
        this.initLighting();
        this.initObjects();
        this.initRenderer();
        this.initControls();
        this.initStats();
        this.initGUI();
        this.addEventListeners();
    }

    private initCamera(): void {
        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 1000);
        this.camera.position.set(2, 1, 500);
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

    private initObjects(): void {
        const bookParams: BookMeshParams = {
            bookThickness: 2,
            bookWidth: 15,
            bookHeight: 20,
            coverWidth: 4,
        };
        this.book = createBookMesh(bookParams, '59661342.jpg');
        this.scene.add(this.book);
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

    private initGUI(): void {
        const gui = new GUI();
        gui.add(this.camera, 'fov', 1, 180, 0.01);
        gui.add(this.camera, 'aspect', 1, 10, 0.01);
        gui.add(this.camera, 'near', 0.1, 1000, 0.01);
        gui.add(this.camera, 'far', 0.1, 1000, 0.01);
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
