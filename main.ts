import * as THREE from 'three';

import Stats from 'three/examples/jsm/libs/stats.module.js';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';
import { TrackballControls } from 'three/examples/jsm/controls/TrackballControls.js';

// Add this interface near the top of your file, after the imports
interface CustomMesh extends THREE.Mesh {
    currentHex?: number;
}

let camera: THREE.PerspectiveCamera, scene: THREE.Scene, raycaster: THREE.Raycaster, renderer: THREE.WebGLRenderer, stats: Stats;
let controls: TrackballControls;

const mouse: THREE.Vector2 = new THREE.Vector2();
let INTERSECTED: CustomMesh | null;

init();

function createBook(): THREE.Mesh {
    const geometry: THREE.BoxGeometry = new THREE.BoxGeometry(20, 20, 20);
    const material: THREE.MeshLambertMaterial = new THREE.MeshLambertMaterial({ color: Math.random() * 0xffffff });
    const mesh: THREE.Mesh = new THREE.Mesh(geometry, material);
    return mesh;
}

function init(): void {

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 1000);
    camera.position.set(2, 1, 500);

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);

    scene.add(new THREE.AmbientLight(0xffffff));

    const light = new THREE.DirectionalLight(0xffffff);
    light.position.set(1, 1, 1).normalize();
    scene.add(light);

    const object: THREE.Mesh = createBook();
    scene.add(object);

    raycaster = new THREE.Raycaster();

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
    // find intersections
    raycaster.setFromCamera(mouse, camera);

    const intersects: THREE.Intersection[] = raycaster.intersectObjects(scene.children, false);

    if (intersects.length > 0) {
        if (INTERSECTED !== intersects[0].object) {
            if (INTERSECTED) {
                (INTERSECTED.material as THREE.MeshLambertMaterial).emissive.setHex(INTERSECTED.currentHex!);
            }

            INTERSECTED = intersects[0].object as CustomMesh;
            INTERSECTED.currentHex = (INTERSECTED.material as THREE.MeshLambertMaterial).emissive.getHex();
            (INTERSECTED.material as THREE.MeshLambertMaterial).emissive.setHex(0xff0000);
        }
    } else {
        if (INTERSECTED) {
            (INTERSECTED.material as THREE.MeshLambertMaterial).emissive.setHex(INTERSECTED.currentHex!);
        }

        INTERSECTED = null;
    }

    renderer.clear();
    renderer.render(scene, camera);
}
