import * as THREE from 'three';
import { PMREMGenerator } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { TransformControls, TransformControlsGizmo } from 'three/examples/jsm/controls/TransformControls';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory.js';
import { Book } from '../components/Bookshelf/Book';
import { createControls } from '../components/Controls';
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
            this.previousButtonStates = this.gamepad.buttons.map(button => button.pressed);
        }
    }

    public isButtonNewlyPressed(index: number): boolean {
        if (!this.gamepad || index >= this.gamepad.buttons.length) return false;
        const isCurrentlyPressed = this.gamepad.buttons[index].pressed;
        const wasPreviouslyPressed = this.previousButtonStates[index] || false;
        return isCurrentlyPressed && !wasPreviouslyPressed;
    }
}

export class MainScene {
    private readonly sceneConfig: MainSceneConfig;

    private sceneInternal!: THREE.Scene;
    private rendererInternal!: THREE.WebGLRenderer;

    private get scene(): THREE.Scene { return this.sceneInternal; }
    private get renderer(): THREE.WebGLRenderer { return this.rendererInternal; }

    private camera!: THREE.PerspectiveCamera;
    private controls!: OrbitControls;
    private bookshelfMesh: THREE.Mesh | null = null;
    private sceneElevation!: number;

    private books: Book[] = [];
    private selectedBookIndex: number = -1;
    private hoveredBookIndex: number = -1;
    private bookRestZ: number[] = [];
    private bookHoverOffsets: number[] = [];
    private isBookInViewMode: boolean = false;
    private viewingBookIndex: number = -1;

    private controllerWrappers: ControllerWrapper[] = [];
    private controllerGrips: THREE.XRGripSpace[] = [];
    private controllerRayLine: THREE.Line | null = null;

    private grabbedBook: Book | null = null;
    private grabbingController: THREE.XRTargetRaySpace | null = null;
    private grabMatrix: THREE.Matrix4 = new THREE.Matrix4();
    private inverseGrabMatrix: THREE.Matrix4 = new THREE.Matrix4();

    private gizmo: THREE.Object3D | null = null;
    private transformControl: TransformControls | null = null;
    private transformMode: 'translate' | 'rotate' = 'translate';

    private readonly raycaster: THREE.Raycaster;
    private readonly tempMatrix: THREE.Matrix4;
    private readonly mouseRaycaster: THREE.Raycaster;

    private onBookSelectedCallback?: (bookIndex: number) => void;

    private readonly boundOnWindowResize: () => void;
    private readonly boundOnKeyDown: (e: KeyboardEvent) => void;
    private readonly boundOnMouseMove: (e: MouseEvent) => void;
    private readonly boundOnMouseClick: (e: MouseEvent) => void;

    constructor(sceneConfig: MainSceneConfig = defaultMainSceneConfig) {
        this.sceneConfig = sceneConfig;
        this.raycaster = new THREE.Raycaster();
        this.tempMatrix = new THREE.Matrix4();
        this.mouseRaycaster = new THREE.Raycaster();

        this.boundOnWindowResize = this.onWindowResize.bind(this);
        this.boundOnKeyDown = this.onKeyDown.bind(this);
        this.boundOnMouseMove = this.onMouseMove.bind(this);
        this.boundOnMouseClick = this.onMouseClick.bind(this);
    }

    public initialize(): void {
        this.rendererInternal.domElement.style.cursor = 'default';
        this.addEventListeners();
    }

    public dispose(): void {
        window.removeEventListener('resize', this.boundOnWindowResize);
        window.removeEventListener('keydown', this.boundOnKeyDown);
        window.removeEventListener('mousemove', this.boundOnMouseMove);
        window.removeEventListener('click', this.boundOnMouseClick);
        this.controls?.dispose();
    }

    public async setupScene(renderer: THREE.WebGLRenderer, scene: THREE.Scene): Promise<void> {
        this.rendererInternal = renderer;
        this.sceneInternal = scene;
        this.sceneElevation = 0.5;
        this.camera = await this.initCamera();
        await this.initLighting(scene, renderer);
        this.controls = await this.initControls(renderer);
        await this.initEnvironment(scene);
    }

    private async initCamera(): Promise<THREE.PerspectiveCamera> {
        const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 5000);
        camera.position.set(0, this.sceneElevation, 1.7);
        return camera;
    }

    private async initEnvironment(scene: THREE.Scene): Promise<THREE.Mesh> {
        const textureLoader = new THREE.TextureLoader();
        const floorTexture = textureLoader.load(this.sceneConfig.floorTexture.path);
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

    private async initLighting(scene: THREE.Scene, renderer: THREE.WebGLRenderer): Promise<void> {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.0);
        scene.add(ambientLight);

        const spotLight = new THREE.SpotLight(0xffffff, 3, 100, Math.PI / 3, 0.5, 2);
        spotLight.position.set(0, this.sceneElevation, 2);
        spotLight.target.position.set(0, this.sceneElevation, 0);
        scene.add(spotLight);
        scene.add(spotLight.target);

        scene.background = new THREE.Color(0x000000);

        if (this.sceneConfig.environmentMap) {
            this.loadEnvironmentMap(scene, renderer, this.sceneConfig.environmentMap.path);
        }
    }

    private async loadEnvironmentMap(scene: THREE.Scene, renderer: THREE.WebGLRenderer, path: string): Promise<void> {
        const pmremGenerator = new PMREMGenerator(renderer);
        pmremGenerator.compileEquirectangularShader();
        try {
            const hdrEquirect = await new RGBELoader().setPath("resources/").loadAsync(path);
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

    private async initControls(renderer: THREE.WebGLRenderer): Promise<OrbitControls> {
        const controls = createControls(this.camera, renderer);
        controls.target.set(0, this.sceneElevation, 0);
        return controls;
    }

    private setupVRControllers(leftController: THREE.XRTargetRaySpace, rightController: THREE.XRTargetRaySpace): void {
        const controllerModelFactory = new XRControllerModelFactory();
        this.createControllerRay();

        const controllers = [leftController, rightController];
        for (let i = 0; i < 2; i++) {
            const controller = controllers[i];
            const controllerWrapper = new ControllerWrapper(controller);

            if (i === 1 && this.controllerRayLine) {
                controller.add(this.controllerRayLine);
                controller.addEventListener('connected', (event) => {
                    controllerWrapper.gamepad = event.data?.gamepad || null;
                });
                controller.addEventListener('select', () => {
                    if (this.isBookInViewMode) {
                        this.returnBookToShelf();
                    } else if (this.selectedBookIndex !== -1) {
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

        const controllerPosition = new THREE.Vector3();
        controller.getWorldPosition(controllerPosition);

        if (controllerPosition.distanceTo(bookMesh.position) < 0.3) {
            this.grabbedBook = book;
            this.grabbingController = controller;
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

    private addEventListeners(): void {
        window.addEventListener('resize', this.boundOnWindowResize);
        window.addEventListener('keydown', this.boundOnKeyDown);
        window.addEventListener('mousemove', this.boundOnMouseMove);
        window.addEventListener('click', this.boundOnMouseClick);
    }

    private onWindowResize(): void {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
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

    public updateLogic(): void {
        if (!this.rendererInternal || !this.sceneInternal || !this.camera) return;

        this.controls?.update();

        this.updateBookHover();
    }

    public tick(): void {
        if (!this.rendererInternal || !this.sceneInternal || !this.camera) return;

        this.controls?.update();

        this.updateBookHover();
        this.render();
    }

    private render(): void {
        this.renderer.clear();
        this.renderer.render(this.scene, this.camera);
    }

    public getCamera(): THREE.PerspectiveCamera | null {
        return this.camera ?? null;
    }

    public setBookshelfMesh(mesh: THREE.Mesh): void {
    }

    public setBooks(books: Book[]): void {
        this.books = [...books];
        this.bookRestZ = books.map(b => b.getMesh().position.z);
        this.bookHoverOffsets = books.map(() => 0);
        this.hoveredBookIndex = -1;
        this.selectedBookIndex = this.books.length > 0 ? 0 : -1;
    }

    private static readonly HOVER_PERK = 0.05;
    private static readonly HOVER_LERP = 0.15;

    private updateBookHover(): void {
        if (this.isBookInViewMode) return;
        for (let i = 0; i < this.books.length; i++) {
            const target = i === this.hoveredBookIndex ? MainScene.HOVER_PERK : 0;
            this.bookHoverOffsets[i] += (target - this.bookHoverOffsets[i]) * MainScene.HOVER_LERP;
            this.books[i].getMesh().position.z = this.bookRestZ[i] + this.bookHoverOffsets[i];
        }
    }

    public selectBook(index: number): void {
        if (index >= 0 && index < this.books.length) {
            this.selectedBookIndex = index;
            this.hoveredBookIndex = index;
            this.renderer.domElement.style.cursor = 'pointer';
        } else {
            this.selectedBookIndex = -1;
            this.hoveredBookIndex = -1;
            this.renderer.domElement.style.cursor = 'default';
        }
    }

    public viewBook(bookIndex: number): void {
        const book = this.books[bookIndex];
        const bookMesh = book.getMesh();

        this.renderer.domElement.style.cursor = 'default';
        this.hoveredBookIndex = -1;
        if (this.bookHoverOffsets[bookIndex] !== undefined) {
            this.bookHoverOffsets[bookIndex] = 0;
            bookMesh.position.z = this.bookRestZ[bookIndex];
        }

        book.storeOriginalTransform();
        this.bookshelfMesh?.remove(bookMesh);

        this.transformControl = new TransformControls(this.camera, this.renderer.domElement);
        this.transformControl.size = 0.5;
        this.transformControl.setMode(this.transformMode);
        this.transformControl.addEventListener('dragging-changed', (event) => {
            this.controls.enabled = !event.value;
        });

        this.gizmo = this.transformControl.getHelper();
        this.scene.add(bookMesh);
        if (this.gizmo) this.scene.add(this.gizmo);

        bookMesh.position.set(0, this.sceneElevation, 0.5);
        bookMesh.rotation.set(0, 0, 0);
        this.transformControl.attach(bookMesh);
        this.controls.target.copy(bookMesh.position);

        book.setCoverAngles(Math.PI / 2);
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

        if (this.transformControl) {
            if (this.gizmo) this.scene.remove(this.gizmo);
            this.transformControl.detach();
            this.transformControl = null;
        }

        this.scene.remove(bookMesh);
        this.bookshelfMesh?.add(bookMesh);
        book.restoreOriginalTransform();
        this.isBookInViewMode = false;
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
        if (!this.grabbedBook || !this.grabbingController) return;

        const bookMesh = this.grabbedBook.getMesh();
        const newMatrix = new THREE.Matrix4()
            .copy(this.grabbingController.matrixWorld)
            .multiply(this.grabMatrix);

        const position = new THREE.Vector3();
        const quaternion = new THREE.Quaternion();
        const scale = new THREE.Vector3();
        newMatrix.decompose(position, quaternion, scale);

        bookMesh.position.copy(position);
        bookMesh.quaternion.copy(quaternion);
        bookMesh.scale.copy(scale);
    }

    public selectBookPage(pageIndex: number): void {
        if (this.isBookInViewMode && this.viewingBookIndex !== -1) {
            this.books[this.viewingBookIndex].selectPage(pageIndex);
        }
    }

    public getBook(index: number): Book {
        if (index < 0 || index >= this.books.length) throw new Error("Book index out of bounds");
        return this.books[index];
    }

    public getSelectedBook(): Book {
        return this.getBook(this.selectedBookIndex);
    }

    public getControllers(): ControllerWrapper[] {
        return this.controllerWrappers;
    }

    public setOnBookSelectedCallback(callback: (bookIndex: number) => void): void {
        this.onBookSelectedCallback = callback;
    }


    private createControllerRay(): void {
        const geometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 0, -1),
        ]);
        const material = new THREE.LineBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.5 });
        this.controllerRayLine = new THREE.Line(geometry, material);
        this.controllerRayLine.scale.z = 5;
        this.controllerRayLine.visible = true;
    }

    private rayBookIntersection(mousePosition: THREE.Vector2): BookIntersection | null {
        if (this.isBookInViewMode) return null;

        this.mouseRaycaster.setFromCamera(mousePosition, this.camera);

        const intersects: BookIntersection[] = [];
        this.books.forEach((book, index) => {
            const bookIntersects = this.mouseRaycaster.intersectObject(book.getMesh(), true);
            if (bookIntersects.length > 0) {
                const intersection = bookIntersects[0] as BookIntersection;
                intersection.bookIndex = index;
                intersects.push(intersection);
            }
        });

        intersects.sort((a, b) => a.distance - b.distance);
        return intersects.length > 0 ? intersects[0] : null;
    }

    private mousePositionFromEvent(event: MouseEvent): THREE.Vector2 {
        const rect = this.renderer.domElement.getBoundingClientRect();
        return new THREE.Vector2(
            ((event.clientX - rect.left) / rect.width) * 2 - 1,
            -((event.clientY - rect.top) / rect.height) * 2 + 1
        );
    }

    private isEventOnCanvas(event: MouseEvent): boolean {
        return event.target === this.renderer.domElement;
    }

    private onMouseClick(event: MouseEvent): void {
        if (!this.isEventOnCanvas(event)) return;
        const intersection = this.rayBookIntersection(this.mousePositionFromEvent(event));
        if (intersection) {
            this.selectBook(intersection.bookIndex);
            this.onBookSelectedCallback?.(intersection.bookIndex);
        }
    }

    private onMouseMove(event: MouseEvent): void {
        if (!this.isEventOnCanvas(event)) return;
        const intersection = this.rayBookIntersection(this.mousePositionFromEvent(event));
        this.selectBook(intersection ? intersection.bookIndex : -1);
    }

    public async exportSceneToGLB(): Promise<Blob> {
        const exporter = new GLTFExporter();
        const exportScene = this.scene.clone();

        exportScene.traverse((object) => {
            if (object instanceof TransformControlsGizmo || object === this.controllerRayLine) {
                object.visible = false;
            }
        });

        return new Promise((resolve, reject) => {
            exporter.parse(
                exportScene,
                (buffer) => resolve(new Blob([buffer as ArrayBuffer], { type: 'application/octet-stream' })),
                (error) => {
                    console.error('An error occurred while exporting:', error);
                    reject(error);
                },
                { binary: true }
            );
        });
    }
}
