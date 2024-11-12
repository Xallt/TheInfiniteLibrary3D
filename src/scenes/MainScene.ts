import * as THREE from 'three';
import { Book, BookMeshParams, TextureLoader } from '../components/Book';
import { createControls } from '../components/Controls';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { Bookshelf, BookshelfParams } from '../components/Bookshelf';
import { PdfPage } from 'src/utils/pdfParser';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory.js';
import { BookTexture } from '../components/BookTexture';

export class MainScene {
    private camera!: THREE.PerspectiveCamera;
    private scene!: THREE.Scene;
    private renderer!: THREE.WebGLRenderer;
    private controls!: OrbitControls;
    private stats!: Stats;
    private bookParams!: BookMeshParams;
    private bookshelfParams!: BookshelfParams;

    private bookshelf!: Bookshelf;
    private books: Book[] = [];
    private selectedBookIndex: number = -1;
    private selectionIndicator: THREE.Mesh;
    private isBookInViewMode: boolean = false;
    private viewingBookIndex: number = -1;
    private viewingBookMesh: THREE.Mesh | null = null;
    private sceneElevation!: number;

    private controllers: THREE.XRTargetRaySpace[] = [];
    private controllerGrips: THREE.XRGripSpace[] = [];

    private isVRSupported: boolean = false;

    private grabbedBook: Book | null = null;
    private grabbingController: THREE.XRTargetRaySpace | null = null;
    private grabMatrix: THREE.Matrix4 = new THREE.Matrix4();
    private inverseGrabMatrix: THREE.Matrix4 = new THREE.Matrix4();

    private onVRSessionStartHandler?: () => void;
    private onVRSessionEndHandler?: () => void;

    constructor(
        container: HTMLElement,
        bookParams: BookMeshParams,
        bookshelfParams: BookshelfParams
    ) {
        this.bookParams = bookParams;
        this.bookshelfParams = bookshelfParams;

        // Create selection indicator first
        const geometry = new THREE.SphereGeometry(0.02, 32, 32);
        const material = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            transparent: true,
            opacity: 0.5,
            depthTest: false  // Make sure it's always visible
        });
        this.selectionIndicator = new THREE.Mesh(geometry, material);
        this.selectionIndicator.visible = false;

        // Check VR support before initialization
        this.checkVRSupport().then(() => {
            this.init(container);
        });
    }

    private async checkVRSupport(): Promise<void> {
        if ('xr' in navigator && navigator.xr) {
            try {
                this.isVRSupported = await navigator.xr.isSessionSupported('immersive-vr');
                console.log('VR Supported:', this.isVRSupported);
            } catch (err) {
                console.warn('VR Support check failed:', err);
                this.isVRSupported = false;
            }
        } else {
            this.isVRSupported = false;
        }
    }

    private init(container: HTMLElement): void {
        this.initScene();
        this.initCamera();
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
            0.1, // Reduced near plane for VR
            5000
        );
        this.camera.position.set(0, this.sceneElevation, 1.5); // Set initial height to average human height
    }

    private initScene(): void {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xf0f0f0);

        this.sceneElevation = 0.5;

        // Only add VR-specific elements if VR is supported
        // if (this.isVRSupported) {
        //     // Add a grid helper for VR ground reference
        //     const grid = new THREE.GridHelper(100, 20);
        //     this.scene.add(grid);
        // }
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
        bookshelfMesh.position.set(-bookshelfOuterSize.x / 2, bookshelfOuterSize.y / 2 + this.sceneElevation, 0);

        this.scene.add(bookshelfMesh);
    }

    private initRenderer(container: HTMLElement): void {
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true
        });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);

        // Only enable XR if supported
        if (this.isVRSupported) {
            this.renderer.xr.enabled = true;

            // Add VR session change handlers
            this.renderer.xr.addEventListener('sessionstart', () => {
                const xrManager = this.renderer.xr;
                const baseReferenceSpace = xrManager.getReferenceSpace();

                if (baseReferenceSpace) {
                    // Convert camera rotation to quaternion
                    const quaternion = this.camera.quaternion;

                    // Multiply by a 180-degree rotation around Y axis
                    // First create a Euler rotation then convert to quaternion
                    const euler = new THREE.Euler(0, Math.PI, 0, 'XYZ');
                    const rotationQuaternion = new THREE.Quaternion().setFromEuler(euler);
                    quaternion.multiply(rotationQuaternion);

                    // Create transform from current camera position and rotation
                    const transform = new XRRigidTransform(
                        { x: this.camera.position.x, y: this.camera.position.y, z: this.camera.position.z },
                        { x: quaternion.x, y: quaternion.y, z: quaternion.z, w: quaternion.w }
                    );

                    // Apply transform to reference space
                    const referenceSpace = baseReferenceSpace.getOffsetReferenceSpace(transform);
                    xrManager.setReferenceSpace(referenceSpace);
                }
            });

            // Add VR button
            const vrButton = VRButton.createButton(this.renderer);
            container.appendChild(vrButton);

            // Initialize VR controllers
            this.initVRControllers();
        }

        this.renderer.setAnimationLoop(this.animate.bind(this));
        container.appendChild(this.renderer.domElement);
    }

    private initVRControllers(): void {
        if (!this.isVRSupported) return;

        // Controller model factory
        const controllerModelFactory = new XRControllerModelFactory();

        // Setup controllers
        for (let i = 0; i < 2; i++) {
            // Controller
            const controller = this.renderer.xr.getController(i);
            controller.addEventListener('squeezestart', this.onSqueezeStart.bind(this));
            controller.addEventListener('squeezeend', this.onSqueezeEnd.bind(this));
            this.scene.add(controller);
            this.controllers.push(controller);

            // Controller grip
            const controllerGrip = this.renderer.xr.getControllerGrip(i);
            controllerGrip.add(controllerModelFactory.createControllerModel(controllerGrip));
            this.scene.add(controllerGrip);
            this.controllerGrips.push(controllerGrip);
        }
    }

    private onSqueezeStart(event: any): void {
        if (!this.isBookInViewMode || this.viewingBookIndex === -1) return;

        const controller = event.target;
        const book = this.books[this.viewingBookIndex];
        const bookMesh = book.getMesh();

        // Calculate if controller is close enough to grab
        const controllerPosition = new THREE.Vector3();
        controller.getWorldPosition(controllerPosition);
        const distance = controllerPosition.distanceTo(bookMesh.position);

        // If controller is within 0.3 units of the book, allow grabbing
        if (distance < 0.3) {
            this.grabbedBook = book;
            this.grabbingController = controller;

            // Calculate and store the grab offset matrix
            this.inverseGrabMatrix.copy(controller.matrixWorld).invert();
            this.grabMatrix.copy(this.inverseGrabMatrix).multiply(bookMesh.matrixWorld);
        }
    }

    private onSqueezeEnd(event: any): void {
        if (event.target === this.grabbingController) {
            this.grabbedBook = null;
            this.grabbingController = null;
        }
    }

    private initControls(): void {
        this.controls = createControls(this.camera, this.renderer);
        this.controls.target.set(0, this.sceneElevation, 0);
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
    }

    private animate(): void {
        // Update controls based on VR state
        if (this.isVRSupported && this.renderer.xr.isPresenting) {
            // Update VR-specific elements
            this.controllers.forEach(controller => {
                // Add any per-frame controller updates here
            });

            // Update grabbed book position
            this.updateGrabbedBook();
        } else {
            // Update non-VR controls
            this.controls.update();
        }

        this.render();
        this.stats.update();
    }

    private render(): void {
        this.renderer.clear();
        this.renderer.render(this.scene, this.camera);
    }

    public addBook(book: Book): void {
        const added = this.bookshelf.addBook(book);
        if (added) {
            this.books.push(book);
        }
        if (this.books.length === 1) {
            this.selectBook(0);
        }
    }

    public addBookFromPages(pdfPages: PdfPage[] = []): Book {
        const book = Book.fromPdfPages(
            this.bookParams,
            new BookTexture(
                TextureLoader.getInstance().load("assets/BookCovers0135_5_350.jpg"),
                {
                    leftCoverPosition: 0.413,
                    rightCoverPosition: 0.582
                }
            ),
            pdfPages
        );
        this.addBook(book);

        return book;
    }

    public selectBook(index: number): void {
        if (index >= 0 && index < this.books.length) {
            this.selectedBookIndex = index;
            const position = this.bookshelf.getBookPosition(index);

            if (position) {
                // Move indicator in front of the book
                position.z += 0.2;  // Move it forward
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

        const book = this.books[this.selectedBookIndex];
        const bookMesh = book.getMesh();

        // Store original position and rotation for returning later
        book.storeOriginalTransform();

        // Remove book from bookshelf and add it directly to the scene
        const bookshelfMesh = this.bookshelf.getMesh();
        bookshelfMesh.remove(bookMesh);
        this.scene.add(bookMesh);

        // Move the book to viewing position
        bookMesh.position.set(0, this.sceneElevation, 0.5);  // In front of camera
        bookMesh.rotation.set(0, 0, 0);
        book.setCoverAngles(Math.PI / 2);

        // Update camera controls target to the book position
        this.controls.target.copy(bookMesh.position);
        this.controls.update();

        this.isBookInViewMode = true;
        this.viewingBookIndex = this.selectedBookIndex;

        // Update selection indicator
        this.selectionIndicator.position.copy(bookMesh.position);
        this.selectionIndicator.position.z += 0.2;
    }

    public returnBookToShelf(): void {
        if (!this.isBookInViewMode || this.viewingBookIndex === -1) return;

        const book = this.books[this.viewingBookIndex];
        const bookMesh = book.getMesh();

        // Remove book from scene and add it back to bookshelf
        this.scene.remove(bookMesh);
        const bookshelfMesh = this.bookshelf.getMesh();
        bookshelfMesh.add(bookMesh);

        // Restore the book to its original position and rotation
        book.restoreOriginalTransform();

        this.isBookInViewMode = false;

        // Update selection indicator
        const position = this.bookshelf.getBookPosition(this.viewingBookIndex);
        if (position) {
            position.z += 0.2;
            this.selectionIndicator.position.copy(position);
        }

        this.viewingBookIndex = -1;
    }

    public isViewingBook(): boolean {
        return this.isBookInViewMode;
    }

    public setBookAngle(angle: number): void {
        if (this.isBookInViewMode && this.viewingBookIndex !== -1) {
            const book = this.books[this.viewingBookIndex];
            book.setCoverAngles(angle);
        }
    }

    private updateGrabbedBook(): void {
        if (this.grabbedBook && this.grabbingController) {
            const bookMesh = this.grabbedBook.getMesh();

            // Calculate the new world matrix for the book
            const newMatrix = new THREE.Matrix4();
            newMatrix.copy(this.grabbingController.matrixWorld)
                .multiply(this.grabMatrix);

            // Extract position, rotation, and scale from the matrix
            const position = new THREE.Vector3();
            const quaternion = new THREE.Quaternion();
            const scale = new THREE.Vector3();
            newMatrix.decompose(position, quaternion, scale);

            // Apply the transform to the book
            bookMesh.position.copy(position);
            bookMesh.quaternion.copy(quaternion);
            bookMesh.scale.copy(scale);

            // Update selection indicator position
            this.selectionIndicator.position.copy(position);
            this.selectionIndicator.position.z += 0.2;
        }
    }

    public onVRSessionStart(callback: () => void): void {
        this.onVRSessionStartHandler = callback;
        this.renderer.xr.addEventListener('sessionstart', this.onVRSessionStartHandler);
    }

    public onVRSessionEnd(callback: () => void): void {
        this.onVRSessionEndHandler = callback;
        this.renderer.xr.addEventListener('sessionend', this.onVRSessionEndHandler);
    }

    public removeVRSessionListeners(): void {
        if (this.onVRSessionStartHandler) {
            this.renderer.xr.removeEventListener('sessionstart', this.onVRSessionStartHandler);
        }
        if (this.onVRSessionEndHandler) {
            this.renderer.xr.removeEventListener('sessionend', this.onVRSessionEndHandler);
        }
    }

    public isInVR(): boolean {
        return this.isVRSupported && this.renderer.xr.isPresenting;
    }
}