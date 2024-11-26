import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { Book, BookMeshParams } from '../components/Bookshelf/Book';
import { BookTexture, BookTextureParams } from '../components/Bookshelf/BookTexture';

export class BookDesignScene {
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private controls: OrbitControls;
    private books: Book[] = [];

    constructor(container: HTMLElement) {
        // Initialize scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xf0f0f0);

        // Initialize camera
        this.camera = new THREE.PerspectiveCamera(
            75,
            container.clientWidth / container.clientHeight,
            0.1,
            1000
        );
        this.camera.position.z = 5;

        // Initialize renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        container.appendChild(this.renderer.domElement);

        // Initialize controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);

        // Add some basic lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
        directionalLight.position.set(0, 1, 0);
        this.scene.add(directionalLight);

        // Start animation loop
        this.animate();

        // Handle window resize
        window.addEventListener('resize', this.onWindowResize.bind(this));
    }

    private animate = () => {
        requestAnimationFrame(this.animate);
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    };

    private onWindowResize() {
        const container = this.renderer.domElement.parentElement;
        if (!container) return;

        this.camera.aspect = container.clientWidth / container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(container.clientWidth, container.clientHeight);
    }

    public addBookWithTexture(
        texture: THREE.Texture,
        textureParams: BookTextureParams,
        bookParams: BookMeshParams
    ) {
        // Create BookTexture instance
        const bookTexture = new BookTexture(texture, textureParams);

        // Create Book instance
        const book = Book.empty(bookParams, bookTexture, 1, this.books.length);

        // Position the book in the scene
        const bookMesh = book.getMesh();
        bookMesh.position.set(0, 0, 0); // Center position

        // Add to scene and store reference
        this.scene.add(bookMesh);
        this.books.push(book);

        // Adjust camera to view the book
        this.camera.position.set(0, 0, 2);
        this.controls.target.set(0, 0, 0);
        this.controls.update();
    }

    public dispose() {
        // Clean up resources
        window.removeEventListener('resize', this.onWindowResize.bind(this));

        // Remove the canvas from DOM
        if (this.renderer.domElement.parentNode) {
            this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
        }

        // Dispose of Three.js resources
        this.renderer.dispose();
        this.scene.clear();

        // Dispose of controls
        this.controls.dispose();

        // Clear books array
        this.books = [];
    }
} 