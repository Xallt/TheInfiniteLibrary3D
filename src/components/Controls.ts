import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export function createControls(camera: THREE.PerspectiveCamera): OrbitControls {
  const controls = new OrbitControls(camera, null);
  controls.rotateSpeed = 0.5;
  controls.zoomSpeed = 0.6;
  controls.panSpeed = 0.8;
  controls.keys = { LEFT: "KeyA", UP: "KeyS", RIGHT: "KeyD", BOTTOM: "KeyW" };
  return controls;
}
