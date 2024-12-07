import * as THREE from 'three';

export abstract class BaseScene {
    protected scene!: THREE.Scene;
    protected renderer!: THREE.WebGLRenderer;

    protected async init(container: HTMLElement): Promise<void> {
        this.renderer = await this.initRenderer(container);
        this.scene = await this.initScene();
    }

    /**
     * Initialize the renderer for the scene
     * @param container The HTML element that will contain the renderer
     */
    protected abstract initRenderer(container: HTMLElement): Promise<THREE.WebGLRenderer>;

    /**
     * Initialize the scene with basic setup like camera, lights, etc., and the 3D content itself
     */
    protected async initScene(): Promise<THREE.Scene> {
        const scene = new THREE.Scene();
        await this.setupScene(scene);
        return scene;
    }

    /**
     * Setup the scene with the 3D content
     * @param scene The scene to setup
     */
    protected abstract setupScene(scene: THREE.Scene): Promise<void>;
}
