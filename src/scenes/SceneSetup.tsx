import { useThree } from "@react-three/fiber";
import { useEffect } from "react";
import * as THREE from "three";
import { PMREMGenerator } from "three";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import { MainSceneConfig } from "../config/mainSceneConfig";

const SCENE_ELEVATION = 0.5;

export function SceneSetup({ config }: { config: MainSceneConfig }) {
  const { scene, gl: renderer } = useThree();

  useEffect(() => {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const spotLight = new THREE.SpotLight(0xffffff, 3, 100, Math.PI / 3, 0.5, 2);
    spotLight.position.set(0, SCENE_ELEVATION, 2);
    spotLight.target.position.set(0, SCENE_ELEVATION, 0);
    scene.add(spotLight);
    scene.add(spotLight.target);
    scene.background = new THREE.Color(0x000000);
    scene.fog = new THREE.FogExp2(0x000000, 0.18);

    const textureLoader = new THREE.TextureLoader();
    const floorTexture = textureLoader.load(config.floorTexture.path);
    floorTexture.wrapS = floorTexture.wrapT = THREE.RepeatWrapping;
    floorTexture.repeat.set(config.floorTexture.repeat, config.floorTexture.repeat);
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(100, 100),
      new THREE.MeshLambertMaterial({ map: floorTexture })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.2;
    scene.add(floor);

    let cancelled = false;
    (async () => {
      if (!config.environmentMap) return;
      const pmrem = new PMREMGenerator(renderer);
      pmrem.compileEquirectangularShader();
      try {
        const hdr = await new RGBELoader()
          .loadAsync(config.environmentMap.path);
        if (cancelled) return;
        const envMap = pmrem.fromEquirectangular(hdr).texture;
        scene.environment = envMap;
        scene.background = envMap;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1;
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        hdr.dispose();
        pmrem.dispose();
      } catch (e) {
        console.error("Failed to load HDR environment:", e);
      }
    })();

    return () => {
      cancelled = true;
      scene.remove(floor, ambientLight, spotLight, spotLight.target);
      floor.geometry.dispose();
      scene.fog = null;
    };
  }, [scene, renderer, config]);

  return null;
}
