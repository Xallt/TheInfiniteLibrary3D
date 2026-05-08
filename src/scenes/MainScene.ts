import { useEffect, useRef } from 'react';
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

const SCENE_ELEVATION = 0.5;
const HOVER_PERK = 0.05;
const HOVER_LERP = 0.15;

export function buildCamera(): THREE.PerspectiveCamera {
    const cam = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 5000);
    cam.position.set(0, SCENE_ELEVATION, 1.7);
    return cam;
}

export function buildControls(camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer): OrbitControls {
    const ctrl = createControls(camera, renderer);
    ctrl.target.set(0, SCENE_ELEVATION, 0);
    return ctrl;
}

interface MainSceneProps {
    sceneConfig: MainSceneConfig;
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    controls: OrbitControls;
}

export function useMainScene({ sceneConfig, renderer, scene, camera, controls }: MainSceneProps) {

    // --- Mutable scene state via refs ---
    const bookshelfMeshRef = useRef<THREE.Mesh | null>(null);
    const booksRef = useRef<Book[]>([]);
    const selectedBookIndexRef = useRef(-1);
    const hoveredBookIndexRef = useRef(-1);
    const bookRestZRef = useRef<number[]>([]);
    const bookHoverOffsetsRef = useRef<number[]>([]);
    const isBookInViewModeRef = useRef(false);
    const viewingBookIndexRef = useRef(-1);
    const gizmoRef = useRef<THREE.Object3D | null>(null);
    const transformControlRef = useRef<TransformControls | null>(null);
    const transformModeRef = useRef<'translate' | 'rotate'>('translate');
    const mouseRaycasterRef = useRef(new THREE.Raycaster());
    const onBookSelectedCallbackRef = useRef<((bookIndex: number) => void) | null>(null);
    const readyRef = useRef(false);

    // --- Event handlers (access fresh state via refs) ---

    function onWindowResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
    }

    function onKeyDown(event: KeyboardEvent) {
        if (!isBookInViewModeRef.current || !transformControlRef.current) return;
        switch (event.key.toLowerCase()) {
            case 't':
                transformModeRef.current = 'translate';
                transformControlRef.current.setMode('translate');
                break;
            case 'r':
                transformModeRef.current = 'rotate';
                transformControlRef.current.setMode('rotate');
                break;
        }
    }

    function updateBookHover() {
        if (isBookInViewModeRef.current) return;
        const books = booksRef.current;
        const offsets = bookHoverOffsetsRef.current;
        const restZ = bookRestZRef.current;
        for (let i = 0; i < books.length; i++) {
            const target = i === hoveredBookIndexRef.current ? HOVER_PERK : 0;
            offsets[i] += (target - offsets[i]) * HOVER_LERP;
            books[i].getMesh().position.z = restZ[i] + offsets[i];
        }
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

    function rayBookIntersection(mousePosition: THREE.Vector2): BookIntersection | null {
        if (isBookInViewModeRef.current) return null;
        mouseRaycasterRef.current.setFromCamera(mousePosition, camera);
        const intersects: BookIntersection[] = [];
        booksRef.current.forEach((book, index) => {
            const hits = mouseRaycasterRef.current.intersectObject(book.getMesh(), true);
            if (hits.length > 0) {
                const hit = hits[0] as BookIntersection;
                hit.bookIndex = index;
                intersects.push(hit);
            }
        });
        intersects.sort((a, b) => a.distance - b.distance);
        return intersects.length > 0 ? intersects[0] : null;
    }

    function onMouseClick(event: MouseEvent) {
        if (!isEventOnCanvas(event)) return;
        const hit = rayBookIntersection(mousePositionFromEvent(event));
        if (hit) {
            selectBook(hit.bookIndex);
            onBookSelectedCallbackRef.current?.(hit.bookIndex);
        }
    }

    function onMouseMove(event: MouseEvent) {
        if (!isEventOnCanvas(event)) return;
        const hit = rayBookIntersection(mousePositionFromEvent(event));
        selectBook(hit ? hit.bookIndex : -1);
    }

    // --- Setup effect: lighting, floor, env map, event listeners ---
    useEffect(() => {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.0);
        scene.add(ambientLight);

        const spotLight = new THREE.SpotLight(0xffffff, 3, 100, Math.PI / 3, 0.5, 2);
        spotLight.position.set(0, SCENE_ELEVATION, 2);
        spotLight.target.position.set(0, SCENE_ELEVATION, 0);
        scene.add(spotLight);
        scene.add(spotLight.target);
        scene.background = new THREE.Color(0x000000);

        const textureLoader = new THREE.TextureLoader();
        const floorTexture = textureLoader.load(sceneConfig.floorTexture.path);
        floorTexture.wrapS = floorTexture.wrapT = THREE.RepeatWrapping;
        floorTexture.repeat.set(sceneConfig.floorTexture.repeat, sceneConfig.floorTexture.repeat);
        const floor = new THREE.Mesh(
            new THREE.PlaneGeometry(100, 100),
            new THREE.MeshLambertMaterial({ map: floorTexture })
        );
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -0.2;
        scene.add(floor);

        renderer.domElement.style.cursor = 'default';
        window.addEventListener('resize', onWindowResize);
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('click', onMouseClick);

        let cancelled = false;
        async function setup() {
            if (sceneConfig.environmentMap) {
                const pmremGenerator = new PMREMGenerator(renderer);
                pmremGenerator.compileEquirectangularShader();
                try {
                    const hdrEquirect = await new RGBELoader().setPath('resources/').loadAsync(sceneConfig.environmentMap.path);
                    if (cancelled) return;
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
            if (!cancelled) readyRef.current = true;
        }
        setup();

        return () => {
            cancelled = true;
            window.removeEventListener('resize', onWindowResize);
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('click', onMouseClick);
            controls.dispose();
            scene.remove(floor, ambientLight, spotLight, spotLight.target);
            floor.geometry.dispose();
        };
        // sceneConfig, renderer, scene, controls are stable references
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // --- RAF loop ---
    useEffect(() => {
        let rafId: number;
        function tick() {
            rafId = requestAnimationFrame(tick);
            if (!readyRef.current) return;
            controls.update();
            updateBookHover();
            renderer.render(scene, camera);
        }
        rafId = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(rafId);
        // controls, renderer, scene, camera are all stable references
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // --- Public actions ---

    function setBooks(newBooks: Book[]) {
        booksRef.current = [...newBooks];
        bookRestZRef.current = newBooks.map(b => b.getMesh().position.z);
        bookHoverOffsetsRef.current = newBooks.map(() => 0);
        hoveredBookIndexRef.current = -1;
        selectedBookIndexRef.current = newBooks.length > 0 ? 0 : -1;
    }

    function selectBook(index: number) {
        if (index >= 0 && index < booksRef.current.length) {
            selectedBookIndexRef.current = index;
            hoveredBookIndexRef.current = index;
            renderer.domElement.style.cursor = 'pointer';
        } else {
            selectedBookIndexRef.current = -1;
            hoveredBookIndexRef.current = -1;
            renderer.domElement.style.cursor = 'default';
        }
    }

    function viewBook(bookIndex: number) {
        const book = booksRef.current[bookIndex];
        const bookMesh = book.getMesh();

        renderer.domElement.style.cursor = 'default';
        hoveredBookIndexRef.current = -1;
        if (bookHoverOffsetsRef.current[bookIndex] !== undefined) {
            bookHoverOffsetsRef.current[bookIndex] = 0;
            bookMesh.position.z = bookRestZRef.current[bookIndex];
        }

        book.storeOriginalTransform();
        bookshelfMeshRef.current?.remove(bookMesh);

        const transformControl = new TransformControls(camera, renderer.domElement);
        transformControl.size = 0.5;
        transformControl.setMode(transformModeRef.current);
        transformControl.addEventListener('dragging-changed', (event) => {
            controls.enabled = !event.value;
        });

        const gizmo = transformControl.getHelper();
        scene.add(bookMesh);
        if (gizmo) scene.add(gizmo);
        transformControlRef.current = transformControl;
        gizmoRef.current = gizmo;

        bookMesh.position.set(0, SCENE_ELEVATION, 0.5);
        bookMesh.rotation.set(0, 0, 0);
        transformControl.attach(bookMesh);
        controls.target.copy(bookMesh.position);
        book.setCoverAngles(Math.PI / 2);
        controls.update();

        isBookInViewModeRef.current = true;
        viewingBookIndexRef.current = selectedBookIndexRef.current;
    }

    function viewSelectedBook() {
        if (selectedBookIndexRef.current === -1) throw new Error('No book selected');
        if (isBookInViewModeRef.current) throw new Error('Book already in view');
        viewBook(selectedBookIndexRef.current);
    }

    function returnBookToShelf() {
        if (!isBookInViewModeRef.current || viewingBookIndexRef.current === -1) return;
        const book = booksRef.current[viewingBookIndexRef.current];
        const bookMesh = book.getMesh();

        if (transformControlRef.current) {
            if (gizmoRef.current) scene.remove(gizmoRef.current);
            transformControlRef.current.detach();
            transformControlRef.current = null;
        }

        scene.remove(bookMesh);
        bookshelfMeshRef.current?.add(bookMesh);
        book.restoreOriginalTransform();
        isBookInViewModeRef.current = false;
        viewingBookIndexRef.current = -1;
    }

    function isViewingBook(): boolean {
        return isBookInViewModeRef.current;
    }

    function getViewingBook(): Book | null {
        if (isBookInViewModeRef.current && viewingBookIndexRef.current !== -1) {
            return booksRef.current[viewingBookIndexRef.current];
        }
        return null;
    }

    function selectBookPage(pageIndex: number) {
        if (isBookInViewModeRef.current && viewingBookIndexRef.current !== -1) {
            booksRef.current[viewingBookIndexRef.current].selectPage(pageIndex);
        }
    }

    function getBook(index: number): Book {
        if (index < 0 || index >= booksRef.current.length) throw new Error('Book index out of bounds');
        return booksRef.current[index];
    }

    function getSelectedBook(): Book {
        return getBook(selectedBookIndexRef.current);
    }

    function setOnBookSelectedCallback(callback: (bookIndex: number) => void) {
        onBookSelectedCallbackRef.current = callback;
    }

    return {
        actions: {
            setBooks,
            setOnBookSelectedCallback,
            viewBook,
            viewSelectedBook,
            returnBookToShelf,
            isViewingBook,
            getViewingBook,
            selectBookPage,
            getBook,
            getSelectedBook,
            selectBook,
            rayBookIntersection,
        },
    };
}

export type MainScene = ReturnType<typeof useMainScene>;
