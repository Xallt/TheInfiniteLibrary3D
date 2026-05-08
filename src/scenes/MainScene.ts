import * as THREE from 'three';
import { PMREMGenerator } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { Book } from '../components/Bookshelf/Book';
import { createControls } from '../components/Controls';
import { MainSceneConfig } from '../config/mainSceneConfig';

interface BookIntersection extends THREE.Intersection<THREE.Object3D<THREE.Object3DEventMap>> {
    bookIndex: number;
}


export function buildMainScene(sceneConfig: MainSceneConfig, renderer: THREE.WebGLRenderer, scene: THREE.Scene) {
    const sceneElevation: number = 0.5;
    let bookshelfMesh: THREE.Mesh | null = null;
    let books: Book[] = [];
    let selectedBookIndex: number = -1;
    let hoveredBookIndex: number = -1;
    let bookRestZ: number[] = [];
    let bookHoverOffsets: number[] = [];
    let isBookInViewMode: boolean = false;
    let viewingBookIndex: number = -1;

    let grabbedBook: Book | null = null;
    let grabbingController: THREE.XRTargetRaySpace | null = null;
    let grabMatrix: THREE.Matrix4 = new THREE.Matrix4();

    let gizmo: THREE.Object3D | null = null;
    let transformControl: TransformControls | null = null;
    let transformMode: 'translate' | 'rotate' = 'translate';

    let mouseRaycaster = new THREE.Raycaster();

    let camera: THREE.PerspectiveCamera = initCamera();
    let controls: OrbitControls = initControls(renderer);

    let onBookSelectedCallback: ((bookIndex: number) => void) | null = null;

    initLighting(scene, renderer);
    initEnvironment(scene);

    renderer.domElement.style.cursor = 'default';
    addEventListeners();

    function dispose() {
        window.removeEventListener('resize', onWindowResize);
        window.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('click', onMouseClick);
        controls?.dispose();
    }


    function initCamera(): THREE.PerspectiveCamera {
        const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 5000);
        camera.position.set(0, sceneElevation, 1.7);
        return camera;
    }

    function initEnvironment(scene: THREE.Scene): THREE.Mesh {
        const textureLoader = new THREE.TextureLoader();
        const floorTexture = textureLoader.load(sceneConfig.floorTexture.path);
        floorTexture.wrapS = floorTexture.wrapT = THREE.RepeatWrapping;
        floorTexture.repeat.set(sceneConfig.floorTexture.repeat, sceneConfig.floorTexture.repeat);

        const floor = new THREE.Mesh(
            new THREE.PlaneGeometry(100, 100),
            new THREE.MeshLambertMaterial({ map: floorTexture })
        );
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -.2;
        scene.add(floor);
        return floor;
    }

    function initLighting(scene: THREE.Scene, renderer: THREE.WebGLRenderer): void {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.0);
        scene.add(ambientLight);

        const spotLight = new THREE.SpotLight(0xffffff, 3, 100, Math.PI / 3, 0.5, 2);
        spotLight.position.set(0, sceneElevation, 2);
        spotLight.target.position.set(0, sceneElevation, 0);
        scene.add(spotLight);
        scene.add(spotLight.target);

        scene.background = new THREE.Color(0x000000);
    }

    async function setupScene(): Promise<void> {
        if (sceneConfig.environmentMap) {
            await loadEnvironmentMap(scene, renderer, sceneConfig.environmentMap.path);
        }
    }

    async function loadEnvironmentMap(scene: THREE.Scene, renderer: THREE.WebGLRenderer, path: string): Promise<void> {
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

    function initControls(renderer: THREE.WebGLRenderer): OrbitControls {
        if (!camera) throw new Error("Camera not initialized");
        const controls = createControls(camera, renderer);
        controls.target.set(0, sceneElevation, 0);
        return controls;
    }

    function addEventListeners(): void {
        window.addEventListener('resize', onWindowResize);
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('click', onMouseClick);
    }

    function onWindowResize(): void {
        if (!camera) return;
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
    }

    function onKeyDown(event: KeyboardEvent): void {
        if (!isBookInViewMode || !transformControl) return;
        switch (event.key.toLowerCase()) {
            case 't':
                transformMode = 'translate';
                transformControl.setMode('translate');
                break;
            case 'r':
                transformMode = 'rotate';
                transformControl.setMode('rotate');
                break;
        }
    }

    function updateLogic(): void {

        controls?.update();

        updateBookHover();
    }

    function tick(): void {

        controls?.update();

        updateBookHover();
        render();
    }

    function render(): void {
        renderer.clear();
        renderer.render(scene, camera);
    }

    function setBooks(booksArg: Book[]): void {
        books = [...booksArg];
        bookRestZ = books.map(b => b.getMesh().position.z);
        bookHoverOffsets = books.map(() => 0);
        hoveredBookIndex = -1;
        selectedBookIndex = books.length > 0 ? 0 : -1;
    }

    const HOVER_PERK = 0.05;
    const HOVER_LERP = 0.15;

    function updateBookHover(): void {
        if (isBookInViewMode) return;
        for (let i = 0; i < books.length; i++) {
            const target = i === hoveredBookIndex ? HOVER_PERK : 0;
            bookHoverOffsets[i] += (target - bookHoverOffsets[i]) * HOVER_LERP;
            books[i].getMesh().position.z = bookRestZ[i] + bookHoverOffsets[i];
        }
    }

    function selectBook(index: number): void {
        if (index >= 0 && index < books.length) {
            selectedBookIndex = index;
            hoveredBookIndex = index;
            renderer.domElement.style.cursor = 'pointer';
        } else {
            selectedBookIndex = -1;
            hoveredBookIndex = -1;
            renderer.domElement.style.cursor = 'default';
        }
    }

    function viewBook(bookIndex: number): void {
        const book = books[bookIndex];
        const bookMesh = book.getMesh();

        renderer.domElement.style.cursor = 'default';
        hoveredBookIndex = -1;
        if (bookHoverOffsets[bookIndex] !== undefined) {
            bookHoverOffsets[bookIndex] = 0;
            bookMesh.position.z = bookRestZ[bookIndex];
        }

        book.storeOriginalTransform();
        bookshelfMesh?.remove(bookMesh);

        transformControl = new TransformControls(camera, renderer.domElement);
        transformControl.size = 0.5;
        transformControl.setMode(transformMode);
        transformControl.addEventListener('dragging-changed', (event) => {
            if (!controls) return;
            controls.enabled = !event.value;
        });

        gizmo = transformControl.getHelper();
        scene.add(bookMesh);
        if (gizmo) scene.add(gizmo);

        bookMesh.position.set(0, sceneElevation, 0.5);
        bookMesh.rotation.set(0, 0, 0);
        transformControl.attach(bookMesh);
        controls.target.copy(bookMesh.position);

        book.setCoverAngles(Math.PI / 2);
        controls.update();
        isBookInViewMode = true;
        viewingBookIndex = selectedBookIndex;
    }

    function viewSelectedBook(): void {
        if (selectedBookIndex === -1) throw new Error("No book selected");
        if (isBookInViewMode) throw new Error("Book already in view");
        viewBook(selectedBookIndex);
    }

    function returnBookToShelf(): void {
        if (!isBookInViewMode || viewingBookIndex === -1) return;

        const book = books[viewingBookIndex];
        const bookMesh = book.getMesh();

        if (transformControl) {
            if (gizmo) scene.remove(gizmo);
            transformControl.detach();
            transformControl = null;
        }

        scene.remove(bookMesh);
        bookshelfMesh?.add(bookMesh);
        book.restoreOriginalTransform();
        isBookInViewMode = false;
        viewingBookIndex = -1;
    }

    function isViewingBook(): boolean {
        return isBookInViewMode;
    }

    function getViewingBook(): Book | null {
        if (isBookInViewMode && viewingBookIndex !== -1) {
            return books[viewingBookIndex];
        }
        return null;
    }

    function updateGrabbedBook(): void {
        if (!grabbedBook || !grabbingController) return;

        const bookMesh = grabbedBook.getMesh();
        const newMatrix = new THREE.Matrix4()
            .copy(grabbingController.matrixWorld)
            .multiply(grabMatrix);

        const position = new THREE.Vector3();
        const quaternion = new THREE.Quaternion();
        const scale = new THREE.Vector3();
        newMatrix.decompose(position, quaternion, scale);

        bookMesh.position.copy(position);
        bookMesh.quaternion.copy(quaternion);
        bookMesh.scale.copy(scale);
    }

    function selectBookPage(pageIndex: number): void {
        if (isBookInViewMode && viewingBookIndex !== -1) {
            books[viewingBookIndex].selectPage(pageIndex);
        }
    }

    function getBook(index: number): Book {
        if (index < 0 || index >= books.length) throw new Error("Book index out of bounds");
        return books[index];
    }

    function getSelectedBook(): Book {
        return getBook(selectedBookIndex);
    }

    function setOnBookSelectedCallback(callback: (bookIndex: number) => void): void {
        onBookSelectedCallback = callback;
    }


    function rayBookIntersection(mousePosition: THREE.Vector2): BookIntersection | null {
        if (!camera) return null;
        if (isBookInViewMode) return null;

        mouseRaycaster.setFromCamera(mousePosition, camera);

        const intersects: BookIntersection[] = [];
        books.forEach((book, index) => {
            const bookIntersects = mouseRaycaster.intersectObject(book.getMesh(), true);
            if (bookIntersects.length > 0) {
                const intersection = bookIntersects[0] as BookIntersection;
                intersection.bookIndex = index;
                intersects.push(intersection);
            }
        });

        intersects.sort((a, b) => a.distance - b.distance);
        return intersects.length > 0 ? intersects[0] : null;
    }

    function mousePositionFromEvent(event: MouseEvent): THREE.Vector2 {
        const rect = renderer.domElement.getBoundingClientRect();
        return new THREE.Vector2(
            ((event.clientX - rect.left) / rect.width) * 2 - 1,
            -((event.clientY - rect.top) / rect.height) * 2 + 1
        );
    }

    function isEventOnCanvas(event: MouseEvent): boolean {
        return event.target === renderer.domElement;
    }

    function onMouseClick(event: MouseEvent): void {
        if (!isEventOnCanvas(event)) return;
        const intersection = rayBookIntersection(mousePositionFromEvent(event));
        if (intersection) {
            selectBook(intersection.bookIndex);
            onBookSelectedCallback?.(intersection.bookIndex);
        }
    }

    function onMouseMove(event: MouseEvent): void {
        if (!isEventOnCanvas(event)) return;
        const intersection = rayBookIntersection(mousePositionFromEvent(event));
        selectBook(intersection ? intersection.bookIndex : -1);
    }

    return {
        state: {
            sceneConfig,
            camera,
            controls,
            bookshelfMesh,
            sceneElevation,
            books,
            selectedBookIndex,
            hoveredBookIndex,
            bookRestZ,
            bookHoverOffsets,
            isBookInViewMode,
            viewingBookIndex,
            grabbedBook,
            grabbingController,
            grabMatrix,
            gizmo,
            transformControl,
            transformMode,
            mouseRaycaster,
            onBookSelectedCallback,

        },
        actions: {
            setupScene,
            dispose,
            initCamera,
            initEnvironment,
            initLighting,
            loadEnvironmentMap,
            initControls,
            addEventListeners,
            onWindowResize,
            onKeyDown,
            updateLogic,
            tick,
            render,
            setBooks,
            updateBookHover,
            selectBook,
            viewBook,
            viewSelectedBook,
            returnBookToShelf,
            isViewingBook,
            getViewingBook,
            updateGrabbedBook,
            selectBookPage,
            getBook,
            getSelectedBook,
            setOnBookSelectedCallback,
            rayBookIntersection,
            mousePositionFromEvent,
            isEventOnCanvas,
            onMouseClick,
            onMouseMove,

        }
    };
}

export type MainScene = ReturnType<typeof buildMainScene>;

