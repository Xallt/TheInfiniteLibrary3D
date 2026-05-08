import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { createControls } from "../components/Controls";

export const SCENE_ELEVATION = 0.5;
export const HOVER_PERK = 0.05;
export const HOVER_LERP = 0.15;

export function buildCamera(): THREE.PerspectiveCamera {
  const cam = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 5000);
  cam.position.set(0, SCENE_ELEVATION, 1.7);
  return cam;
}

export function buildControls(
  camera: THREE.PerspectiveCamera,
  renderer: THREE.WebGLRenderer
): OrbitControls {
  const ctrl = createControls(camera, renderer);
  ctrl.target.set(0, SCENE_ELEVATION, 0);
  return ctrl;
}
