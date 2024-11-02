import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export function createControls(camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer): OrbitControls {
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.rotateSpeed = 0.6;
    controls.zoomSpeed = 1.6;
    controls.panSpeed = 0.8;
    controls.keys = { LEFT: 'KeyA', UP: 'KeyS', RIGHT: 'KeyD', BOTTOM: 'KeyW' };
    return controls;
}
