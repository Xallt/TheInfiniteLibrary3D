import * as THREE from 'three';

import Stats from 'three/examples/jsm/libs/stats.module.js';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';
import { TrackballControls } from 'three/examples/jsm/controls/TrackballControls.js';

let camera: THREE.PerspectiveCamera, scene: THREE.Scene, renderer: THREE.WebGLRenderer, stats: Stats;
let controls: TrackballControls;
let axesHelper: THREE.AxesHelper;

const mouse: THREE.Vector2 = new THREE.Vector2();
let book: THREE.Mesh;

init();

function createBox(boxSize: THREE.Vector3, texturePath: string): THREE.Mesh {
    const geometry: THREE.BoxGeometry = new THREE.BoxGeometry(boxSize.x, boxSize.y, boxSize.z);
    const material: THREE.MeshLambertMaterial = new THREE.MeshLambertMaterial({ map: new THREE.TextureLoader().load(texturePath) });
    const mesh: THREE.Mesh = new THREE.Mesh(geometry, material);
    return mesh;
}

type BookMeshParams = {
    bookThickness: number;
    bookWidth: number;
    bookHeight: number;
    coverWidth: number;
}

function createBookMesh(params: BookMeshParams, texturePath: string): THREE.Mesh {
    const cover: THREE.Mesh = createBox(new THREE.Vector3(params.coverWidth, params.bookHeight, params.bookThickness), texturePath);
    const leftSide: THREE.Mesh = createBox(new THREE.Vector3(params.bookWidth, params.bookHeight, params.bookThickness), texturePath);
    const rightSide: THREE.Mesh = createBox(new THREE.Vector3(params.bookWidth, params.bookHeight, params.bookThickness), texturePath);

    // Join the meshes together
    const book: THREE.Mesh = new THREE.Mesh();
    book.add(cover);
    book.add(leftSide);
    book.add(rightSide);
    return book;
}

function init(): void {

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 1000);
    camera.position.set(2, 1, 500);

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);

    // Add AxesHelper
    axesHelper = new THREE.AxesHelper(100); // The parameter defines the length of the axes
    scene.add(axesHelper);

    scene.add(new THREE.AmbientLight(0xffffff));

    const light = new THREE.DirectionalLight(0xffffff);
    light.position.set(1, 1, 1).normalize();
    scene.add(light);

    book = createBookMesh({
        bookThickness: 1,
        bookWidth: 20,
        bookHeight: 20,
        coverWidth: 20,
    }, '59661342.jpg');
    scene.add(book);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setAnimationLoop(animate);
    document.body.appendChild(renderer.domElement);

    // Add TrackballControls
    controls = new TrackballControls(camera, renderer.domElement);
    controls.rotateSpeed = 1.0;
    controls.zoomSpeed = 1.2;
    controls.panSpeed = 0.8;
    controls.keys = ['KeyA', 'KeyS', 'KeyD'];

    stats = new Stats();
    document.body.appendChild(stats.dom);

    document.addEventListener('mousemove', onDocumentMouseMove);

    window.addEventListener('resize', onWindowResize);

    const gui: GUI = new GUI();

    gui.add(camera, 'fov', 1, 180, 0.01);
    gui.add(camera, 'aspect', 1, 10, 0.01);
    gui.add(camera, 'near', 0.1, 1000, 0.01);
    gui.add(camera, 'far', 0.1, 1000, 0.01);

}

function onWindowResize(): void {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    controls.handleResize();
}

function onDocumentMouseMove(event: MouseEvent): void {
    event.preventDefault();

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

function animate(): void {
    controls.update();


    render();
    stats.update();
}

function render(): void {
    renderer.clear();
    renderer.render(scene, camera);
}
