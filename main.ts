import * as THREE from 'three';

import Stats from 'three/addons/libs/stats.module.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

import { CinematicCamera } from 'three/addons/cameras/CinematicCamera.js';

let camera: CinematicCamera, scene: THREE.Scene, raycaster: THREE.Raycaster, renderer: THREE.WebGLRenderer, stats: Stats;

const mouse: THREE.Vector2 = new THREE.Vector2();
let INTERSECTED: THREE.Mesh | null;
const radius: number = 100;
let theta: number = 0;

init();

function init(): void {

    camera = new CinematicCamera(60, window.innerWidth / window.innerHeight, 1, 1000);
    camera.setLens(5);
    camera.position.set(2, 1, 500);

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);

    scene.add(new THREE.AmbientLight(0xffffff));

    const light = new THREE.DirectionalLight(0xffffff);
    light.position.set(1, 1, 1).normalize();
    scene.add(light);

    const geometry: THREE.BoxGeometry = new THREE.BoxGeometry(20, 20, 20);

    for (let i: number = 0; i < 1500; i++) {
        const object: THREE.Mesh = new THREE.Mesh(
            geometry,
            new THREE.MeshLambertMaterial({ color: Math.random() * 0xffffff })
        );

        object.position.x = Math.random() * 800 - 400;
        object.position.y = Math.random() * 800 - 400;
        object.position.z = Math.random() * 800 - 400;

        scene.add(object);
    }

    raycaster = new THREE.Raycaster();

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setAnimationLoop(animate);
    document.body.appendChild(renderer.domElement);

    stats = new Stats();
    document.body.appendChild(stats.dom);

    document.addEventListener('mousemove', onDocumentMouseMove);

    window.addEventListener('resize', onWindowResize);

    const effectController: {
        focalLength: number;
        fstop: number;
        showFocus: boolean;
        focalDepth: number;
    } = {
        focalLength: 15,
        fstop: 2.8,
        showFocus: false,
        focalDepth: 3,
    };

    const matChanger = (): void => {
        for (const e in effectController) {
            if (e in camera.postprocessing.bokeh_uniforms) {
                camera.postprocessing.bokeh_uniforms[e].value = effectController[e as keyof typeof effectController];
            }
        }

        camera.postprocessing.bokeh_uniforms['znear'].value = camera.near;
        camera.postprocessing.bokeh_uniforms['zfar'].value = camera.far;
        camera.setLens(effectController.focalLength, camera.frameHeight, effectController.fstop, camera.coc);
        effectController['focalDepth'] = camera.postprocessing.bokeh_uniforms['focalDepth'].value;
    };

    const gui: GUI = new GUI();

    gui.add(effectController, 'focalLength', 1, 135, 0.01).onChange(matChanger);
    gui.add(effectController, 'fstop', 1.8, 22, 0.01).onChange(matChanger);
    gui.add(effectController, 'focalDepth', 0.1, 100, 0.001).onChange(matChanger);
    gui.add(effectController, 'showFocus', true).onChange(matChanger);

    matChanger();

}

function onWindowResize(): void {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
}

function onDocumentMouseMove(event: MouseEvent): void {
    event.preventDefault();

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

function animate(): void {
    render();
    stats.update();
}

function render(): void {
    theta += 0.1;

    camera.position.x = radius * Math.sin(THREE.MathUtils.degToRad(theta));
    camera.position.y = radius * Math.sin(THREE.MathUtils.degToRad(theta));
    camera.position.z = radius * Math.cos(THREE.MathUtils.degToRad(theta));
    camera.lookAt(scene.position);

    camera.updateMatrixWorld();

    // find intersections
    raycaster.setFromCamera(mouse, camera);

    const intersects: THREE.Intersection[] = raycaster.intersectObjects(scene.children, false);

    if (intersects.length > 0) {
        const targetDistance: number = intersects[0].distance;

        camera.focusAt(targetDistance); // using Cinematic camera focusAt method

        if (INTERSECTED !== intersects[0].object) {
            if (INTERSECTED) {
                (INTERSECTED.material as THREE.MeshLambertMaterial).emissive.setHex(INTERSECTED.currentHex);
            }

            INTERSECTED = intersects[0].object as THREE.Mesh;
            INTERSECTED.currentHex = (INTERSECTED.material as THREE.MeshLambertMaterial).emissive.getHex();
            (INTERSECTED.material as THREE.MeshLambertMaterial).emissive.setHex(0xff0000);
        }
    } else {
        if (INTERSECTED) {
            (INTERSECTED.material as THREE.MeshLambertMaterial).emissive.setHex(INTERSECTED.currentHex);
        }

        INTERSECTED = null;
    }

    if (camera.postprocessing.enabled) {
        camera.renderCinematic(scene, renderer);
    } else {
        scene.overrideMaterial = null;

        renderer.clear();
        renderer.render(scene, camera);
    }
}
