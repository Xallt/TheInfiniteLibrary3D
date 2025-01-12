import * as THREE from 'three';
import { Book, BookMeshParams, PageSelectedState, TextureLoader, UniformlyOpenedState } from '../components/Bookshelf/Book';
import { createControls } from '../components/Controls';
import { Bookshelf, BookshelfParams } from '../components/Bookshelf/Bookshelf';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory.js';
import { TransformControls, TransformControlsGizmo } from 'three/examples/jsm/controls/TransformControls';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { PMREMGenerator } from 'three';
import { BaseScene } from './BaseScene';
import { defaultMainSceneConfig, MainSceneConfig } from '../config/mainSceneConfig';

interface BookIntersection extends THREE.Intersection<THREE.Object3D<THREE.Object3DEventMap>> {
    bookIndex: number;
}

export class ControllerWrapper {
    public controller: THREE.XRTargetRaySpace;
    public gamepad: Gamepad | null = null;
    public previousButtonStates: boolean[] = [];

    constructor(controller: THREE.XRTargetRaySpace) {
        this.controller = controller;
    }

    public updateButtonStates() {
        if (this.gamepad) {
            if (this.previousButtonStates.length !== this.gamepad.buttons.length) {
                this.previousButtonStates = this.gamepad.buttons.map(button => button.pressed);
            } else {
                this.previousButtonStates = this.gamepad.buttons.map(button => button.pressed);
            }
        }
    }

    public isButtonNewlyPressed(index: number): boolean {
        if (!this.gamepad || index >= this.gamepad.buttons.length) return false;
        const isCurrentlyPressed = this.gamepad.buttons[index].pressed;
        const wasPreviouslyPressed = this.previousButtonStates[index] || false;
        return isCurrentlyPressed && !wasPreviouslyPressed;
    }
}

export class MainScene extends BaseScene {
    private sceneConfig: MainSceneConfig;
    protected camera!: THREE.PerspectiveCamera;
    protected scene!: THREE.Scene;
    protected renderer!: THREE.WebGLRenderer;
    private controls!: OrbitControls;
    private lightingSetup!: THREE.Light[];
    private bookshelfParams!: BookshelfParams;
    private onBookSelectedCallback?: (bookIndex: number) => void;

    private gizmo: THREE.Object3D | null = null;

    private bookshelf!: Bookshelf;
    private books: Book[] = [];
    private selectedBookIndex: number = -1;
    private selectionIndicator: THREE.Mesh;
    private isBookInViewMode: boolean = false;
    private viewingBookIndex: number = -1;
    private sceneElevation!: number;

    private controllerWrappers: ControllerWrapper[] = [];
    private controllerGrips: THREE.XRGripSpace[] = [];

    protected isVRSupported: boolean = false;

    private grabbedBook: Book | null = null;
    private grabbingController: THREE.XRTargetRaySpace | null = null;
    private grabMatrix: THREE.Matrix4 = new THREE.Matrix4();
    private inverseGrabMatrix: THREE.Matrix4 = new THREE.Matrix4();

    private onVRSessionStartHandler?: () => void;
    private onVRSessionEndHandler?: () => void;

    private transformControl: TransformControls | null = null;
    private transformMode: 'translate' | 'rotate' = 'translate';

    private raycaster: THREE.Raycaster;
    private tempMatrix: THREE.Matrix4;

    private controllerRayLine: THREE.Line | null = null;

    private mousePosition: THREE.Vector2;
    private mouseRaycaster: THREE.Raycaster;

    constructor(
        container: HTMLElement,
        bookshelfParams: BookshelfParams,
        sceneConfig: MainSceneConfig = defaultMainSceneConfig
    ) {
        super();

        this.sceneConfig = sceneConfig;

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

        this.raycaster = new THREE.Raycaster();
        this.tempMatrix = new THREE.Matrix4();

        this.mousePosition = new THREE.Vector2();
        this.mouseRaycaster = new THREE.Raycaster();

        // Initialize the scene
        this.init(container);
    }

    protected async init(container: HTMLElement): Promise<void> {
        await super.init(container, {
            showStats: true,
            checkVR: true
        });

        // Set initial cursor style
        this.renderer.domElement.style.cursor = 'default';

        // Add selection indicator to scene
        this.scene.add(this.selectionIndicator);

        // Add event listeners
        this.addEventListeners();
    }

    protected async setupScene(renderer: THREE.WebGLRenderer, scene: THREE.Scene): Promise<void> {
        this.sceneElevation = 0.5;

        this.camera = await this.initCamera(scene);

        // Initialize all scene components
        this.lightingSetup = await this.initLighting(scene, renderer);
        this.controls = await this.initControls(this.camera, renderer);
        await this.initEnvironment(scene);
        this.bookshelf = await this.initBookshelf(scene);
    }


    protected async initCamera(scene: THREE.Scene): Promise<THREE.PerspectiveCamera> {
        const camera = new THREE.PerspectiveCamera(
            60,
            window.innerWidth / window.innerHeight,
            0.1, // Reduced near plane for VR
            5000
        );
        camera.position.set(0, this.sceneElevation, 1.7); // Set initial height to average human height

        return camera;
    }

    protected async initEnvironment(scene: THREE.Scene): Promise<THREE.Mesh> {
        const textureLoader = new THREE.TextureLoader();
        const floorTexture = textureLoader.load(this.sceneConfig.floorTexture.path);

        // Apply scaling to the texture
        floorTexture.wrapS = floorTexture.wrapT = THREE.RepeatWrapping;
        floorTexture.repeat.set(this.sceneConfig.floorTexture.repeat, this.sceneConfig.floorTexture.repeat);

        const floor = new THREE.Mesh(
            new THREE.PlaneGeometry(100, 100),
            new THREE.MeshLambertMaterial({ map: floorTexture })
        );
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -.2;

        scene.add(floor);
        return floor;
    }

    protected async initBookshelf(scene: THREE.Scene): Promise<Bookshelf> {
        const bookshelf = new Bookshelf(this.bookshelfParams, "resources/wood.jpeg");
        const bookshelfMesh = bookshelf.getMesh();
        const bookshelfOuterSize = bookshelf.getOuterSize();

        // Place the bookshelf at the center of the scene
        bookshelfMesh.position.set(
            -bookshelfOuterSize.x / 2,
            bookshelfOuterSize.y / 2 + this.sceneElevation,
            0
        );

        scene.add(bookshelfMesh);
        return bookshelf;
    }

    protected async initLighting(scene: THREE.Scene, renderer: THREE.WebGLRenderer): Promise<[THREE.AmbientLight, THREE.SpotLight]> {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.0);
        scene.add(ambientLight);

        const spotLight = new THREE.SpotLight(
            0xffffff,
            3,
            100,
            Math.PI / 3,
            0.5,
            2
        );
        spotLight.position.set(0, this.sceneElevation, 2);
        spotLight.target.position.set(0, this.sceneElevation, 0);
        scene.add(spotLight);
        scene.add(spotLight.target);

        // Set initial black background
        scene.background = new THREE.Color(0x000000);

        // Load HDR environment map asynchronously
        if (this.sceneConfig.environmentMap) {
            this.loadEnvironmentMap(scene, renderer, this.sceneConfig.environmentMap.path);
        }

        return [ambientLight, spotLight];
    }

    private async loadEnvironmentMap(scene: THREE.Scene, renderer: THREE.WebGLRenderer, path: string): Promise<void> {
        const pmremGenerator = new PMREMGenerator(renderer);
        pmremGenerator.compileEquirectangularShader();

        try {
            const hdrEquirect = await new RGBELoader()
                .setPath("resources/")
                .loadAsync(path);

            const envMap = pmremGenerator.fromEquirectangular(hdrEquirect).texture;
            scene.environment = envMap;
            scene.background = envMap;

            renderer.toneMapping = THREE.ACESFilmicToneMapping;
            renderer.toneMappingExposure = 1;
            renderer.outputColorSpace = THREE.SRGBColorSpace;

            console.log('HDR environment loaded');

            hdrEquirect.dispose();
            pmremGenerator.dispose();
        } catch (error) {
            console.error('Failed to load HDR environment:', error);
        }
    }

    protected setupVRControllers(leftController: THREE.XRTargetRaySpace, rightController: THREE.XRTargetRaySpace): void {
        if (!this.isVRSupported) return;

        const controllerModelFactory = new XRControllerModelFactory();

        // Create the controller ray line
        this.createControllerRay();

        const controllers = [leftController, rightController];

        // Setup controllers
        for (let i = 0; i < 2; i++) {
            const controller = controllers[i];
            const controllerWrapper = new ControllerWrapper(controller);

            // Add ray line to right controller only
            if (i === 1 && this.controllerRayLine) { // Right controller
                controller.add(this.controllerRayLine);
                controller.addEventListener('connected', (event) => {
                    controllerWrapper.gamepad = event.data?.gamepad || null;
                });
                controller.addEventListener('select', () => {
                    if (this.isBookInViewMode) {
                        // Return book to shelf if in view mode
                        this.returnBookToShelf();
                    } else if (this.selectedBookIndex !== -1) {
                        // View selected book if not in view mode
                        this.viewSelectedBook();
                    }
                });
            }

            controller.addEventListener('squeezestart', this.onSqueezeStart.bind(this));
            controller.addEventListener('squeezeend', this.onSqueezeEnd.bind(this));
            this.scene.add(controller);
            this.controllerWrappers.push(controllerWrapper);

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

    protected async initControls(camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer): Promise<OrbitControls> {
        const controls = createControls(camera, renderer);
        controls.target.set(0, this.sceneElevation, 0);

        return controls;
    }

    private addEventListeners(): void {
        window.addEventListener('resize', this.onWindowResize.bind(this));
        window.addEventListener('keydown', this.onKeyDown.bind(this));
        window.addEventListener('mousemove', this.onMouseMove.bind(this));
        window.addEventListener('click', this.onMouseClick.bind(this));
    }

    private onWindowResize(): void {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    private onKeyDown(event: KeyboardEvent): void {
        if (!this.isBookInViewMode || !this.transformControl) return;

        switch (event.key.toLowerCase()) {
            case 't':
                this.transformMode = 'translate';
                this.transformControl.setMode('translate');
                break;
            case 'r':
                this.transformMode = 'rotate';
                this.transformControl.setMode('rotate');
                break;
        }
    }

    protected animate(): void {
        if (this.isVRSupported && this.renderer.xr.isPresenting) {
            // Update ray intersection for right controller only
            const rightController = this.controllerWrappers[1].controller;
            if (rightController) {
                this.handleControllerRayIntersection(rightController);
            }

            // Update grabbed book position
            this.updateGrabbedBook();

            // Handle controller button states
            if (this.isBookInViewMode && this.viewingBookIndex !== -1) {
                const book = this.books[this.viewingBookIndex];
                const currentState = book.getCurrentState();
                if (currentState instanceof PageSelectedState) {
                    book.selectPage(currentState.getSelectedPageIndex());
                }
            }
        } else {
            this.controls.update();
        }

        this.render();
        super.animate();
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
        if (this.books.length >= 1) {
            this.selectBook(0);
        }

    }

    public selectBook(index: number): void {
        if (index >= 0 && index < this.books.length) {
            this.selectedBookIndex = index;
            const position = this.bookshelf.getBookPosition(index);

            if (position) {
                // Get the book's dimensions
                const book = this.books[index];
                const bookMesh = book.getMesh();
                const bookBounds = new THREE.Box3().setFromObject(bookMesh);
                const bookDepth = bookBounds.max.z - bookBounds.min.z;

                // Position indicator in front of the book's center
                this.selectionIndicator.position.copy(position);
                this.selectionIndicator.position.z += bookDepth + 0.05; // Offset by book depth plus a small gap
                this.selectionIndicator.visible = true;
            }
        } else {
            this.selectionIndicator.visible = false;
            this.selectedBookIndex = -1;
        }
    }

    public getBookCount(): number {
        return this.books.length;
    }

    public viewBook(bookIndex: number): void {
        const book = this.books[bookIndex];
        const bookMesh = book.getMesh();

        // Reset cursor to default when entering view mode
        this.renderer.domElement.style.cursor = 'default';

        // Store original position and rotation for returning later
        book.storeOriginalTransform();

        // Hide selection indicator while book is being viewed
        this.selectionIndicator.visible = false;

        // Remove book from bookshelf and add it directly to the scene
        const bookshelfMesh = this.bookshelf.getMesh();
        bookshelfMesh.remove(bookMesh);


        // If it's VR mode, add to the scene
        // Otherwise, add to a new transform control group
        if (this.isVRSupported) {
            bookMesh.position.set(0, this.sceneElevation, 0.5);  // In front of camera
            bookMesh.rotation.set(0, 0, 0);
            this.scene.add(bookMesh);
            this.controls.target.copy(bookMesh.position);
        } else {
            this.transformControl = new TransformControls(this.camera, this.renderer.domElement);
            this.transformControl.size = 0.5;
            this.transformControl.setMode(this.transformMode);
            this.transformControl.addEventListener('dragging-changed', (event) => {
                this.controls.enabled = !event.value;
            });

            this.gizmo = this.transformControl.getHelper();

            this.scene.add(bookMesh);
            if (this.gizmo) {
                this.scene.add(this.gizmo);
            }

            bookMesh.position.set(0, this.sceneElevation, 0.5);  // In front of camera
            bookMesh.rotation.set(0, 0, 0);

            this.transformControl.attach(bookMesh);

            this.controls.target.copy(bookMesh.position);
        }

        book.setCoverAngles(Math.PI / 2);

        // Update camera controls target to the book position
        this.controls.update();

        this.isBookInViewMode = true;
        this.viewingBookIndex = this.selectedBookIndex;
    }

    public viewSelectedBook(): void {
        if (this.selectedBookIndex === -1) throw new Error("No book selected");
        if (this.isBookInViewMode) throw new Error("Book already in view");

        this.viewBook(this.selectedBookIndex);
    }

    public returnBookToShelf(): void {
        if (!this.isBookInViewMode || this.viewingBookIndex === -1) return;

        const book = this.books[this.viewingBookIndex];
        const bookMesh = book.getMesh();

        // Clean up transform controls if they exist
        if (this.transformControl) {
            if (this.gizmo) {
                this.scene.remove(this.gizmo);
            }
            this.transformControl.detach();
            this.transformControl = null;
        }

        // Remove book from scene and add it back to bookshelf
        this.scene.remove(bookMesh);
        const bookshelfMesh = this.bookshelf.getMesh();
        bookshelfMesh.add(bookMesh);

        // Restore the book to its original position and rotation
        book.restoreOriginalTransform();

        this.isBookInViewMode = false;

        // Show and update selection indicator
        this.selectionIndicator.visible = true;
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

    public getViewingBook(): Book | null {
        if (this.isBookInViewMode && this.viewingBookIndex !== -1) {
            return this.books[this.viewingBookIndex];
        }
        return null;
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

    public selectBookPage(pageIndex: number): void {
        if (this.isBookInViewMode && this.viewingBookIndex !== -1) {
            const book = this.books[this.viewingBookIndex];
            book.selectPage(pageIndex);
        }
    }

    public getBook(index: number): Book {
        if (index < 0 || index >= this.books.length) throw new Error("Book index out of bounds");
        return this.books[index];
    }

    public getSelectedBook(): Book {
        return this.getBook(this.selectedBookIndex);
    }

    private handleControllerRayIntersection(controller: THREE.XRTargetRaySpace): void {
        // Get controller world matrix
        this.tempMatrix.identity().extractRotation(controller.matrixWorld);

        // Set raycaster from controller
        const rayOrigin = new THREE.Vector3();
        controller.getWorldPosition(rayOrigin);
        const rayDirection = new THREE.Vector3(0, 0, -1).applyMatrix4(this.tempMatrix);
        this.raycaster.set(rayOrigin, rayDirection);

        // Update ray visibility - only hide when in view mode
        if (this.controllerRayLine) {
            this.controllerRayLine.visible = !this.isBookInViewMode;
        }

        // Only proceed with intersection testing if not in view mode
        if (!this.isBookInViewMode) {
            // Test intersections with all books
            const intersects: BookIntersection[] = [];
            this.books.forEach((book, index) => {
                const bookMesh = book.getMesh();
                const bookIntersects = this.raycaster.intersectObject(bookMesh, true);
                if (bookIntersects.length > 0) {
                    const intersection = bookIntersects[0] as BookIntersection;
                    intersection.bookIndex = index;
                    intersects.push(intersection);
                }
            });

            // Sort intersections by distance
            intersects.sort((a, b) => a.distance - b.distance);

            // Select the closest intersected book
            if (intersects.length > 0) {
                const closestIntersect = intersects[0];
                const bookIndex = closestIntersect.bookIndex;

                // Only update selection if it's different from current selection
                if (bookIndex !== undefined && bookIndex !== this.selectedBookIndex) {
                    this.selectBook(bookIndex);
                }
            }
        }
    }

    private createControllerRay(): void {
        const geometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 0, -1)  // 1 meter long ray
        ]);
        const material = new THREE.LineBasicMaterial({
            color: 0xff0000,
            transparent: true,
            opacity: 0.5
        });
        this.controllerRayLine = new THREE.Line(geometry, material);
        this.controllerRayLine.scale.z = 5; // Make the ray 5 meters long
        this.controllerRayLine.visible = true; // Ensure initial visibility
    }

    private rayBookIntersection(mousePosition: THREE.Vector2): BookIntersection | null {
        // Only perform raycasting if not in VR and not viewing a book
        if (!this.isVRSupported && !this.isBookInViewMode) {
            this.mouseRaycaster.setFromCamera(mousePosition, this.camera);

            // Test intersections with all books
            const intersects: BookIntersection[] = [];
            this.books.forEach((book, index) => {
                const bookMesh = book.getMesh();
                const bookIntersects = this.mouseRaycaster.intersectObject(bookMesh, true);
                if (bookIntersects.length > 0) {
                    const intersection = bookIntersects[0] as BookIntersection;
                    intersection.bookIndex = index;
                    intersects.push(intersection);
                }
            });

            // Sort intersections by distance
            intersects.sort((a, b) => a.distance - b.distance);

            // Update cursor style and select the closest intersected book
            if (intersects.length > 0) {
                return intersects[0];
            }
        }
        return null;
    }

    private mousePositionFromEvent(event: MouseEvent): THREE.Vector2 {
        // Get the renderer's DOM element bounds
        const rect = this.renderer.domElement.getBoundingClientRect();

        // Calculate normalized device coordinates (-1 to +1) relative to the renderer element
        const mousePosition = new THREE.Vector2();
        mousePosition.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mousePosition.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        return mousePosition;
    }

    private onMouseClick(event: MouseEvent): void {
        const mousePosition = this.mousePositionFromEvent(event);
        const intersection = this.rayBookIntersection(mousePosition);
        if (intersection) {
            this.selectBook(intersection.bookIndex);
            if (this.onBookSelectedCallback) {
                this.onBookSelectedCallback(intersection.bookIndex);
            }
        }
    }

    private onMouseMove(event: MouseEvent): void {
        const mousePosition = this.mousePositionFromEvent(event);
        const intersection = this.rayBookIntersection(mousePosition);
        if (intersection) {
            this.selectBook(intersection.bookIndex);
        } else {
            this.selectBook(-1);
        }
    }

    public getControllers(): ControllerWrapper[] {
        return this.controllerWrappers;
    }

    public async exportSceneToGLB(): Promise<Blob> {
        const exporter = new GLTFExporter();

        // Create a copy of the scene for export
        const exportScene = this.scene.clone();

        // Remove any UI elements or helpers you don't want to export
        exportScene.traverse((object) => {
            if (object instanceof TransformControlsGizmo ||
                object === this.selectionIndicator ||
                object === this.controllerRayLine) {
                object.visible = false;
            }
        });

        // Export as GLB
        return new Promise((resolve, reject) => {
            exporter.parse(
                exportScene,
                (buffer) => {
                    const blob = new Blob([buffer as ArrayBuffer], { type: 'application/octet-stream' });
                    resolve(blob);
                },
                (error) => {
                    console.error('An error occurred while exporting:', error);
                    reject(error);
                },
                { binary: true } // This makes it export as GLB instead of GLTF
            );
        });
    }

    public setOnBookSelectedCallback(callback: (bookIndex: number) => void) {
        this.onBookSelectedCallback = callback;
    }
}
