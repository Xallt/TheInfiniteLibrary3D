import * as THREE from 'three';
import { TrackballControls } from 'three/examples/jsm/controls/TrackballControls.js';

export function createControls(camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer): TrackballControls {
    const controls = new TrackballControls(camera, renderer.domElement);
    controls.rotateSpeed = 1.0;
    controls.zoomSpeed = 1.2;
    controls.panSpeed = 0.8;
    controls.keys = ['KeyA', 'KeyS', 'KeyD'];
    return controls;
}
