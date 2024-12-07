import * as THREE from 'three';
import Stats from 'three/examples/jsm/libs/stats.module.js';

export type BaseSceneOptions = {
    showStats: boolean;
}

export abstract class BaseScene {
    protected scene!: THREE.Scene;
    protected renderer!: THREE.WebGLRenderer;
    protected camera!: THREE.PerspectiveCamera;
    protected stats!: Stats;

    protected async init(container: HTMLElement, baseSceneOptions: BaseSceneOptions): Promise<void> {
        this.renderer = await this.initRenderer(container);
        this.scene = await this.initScene(this.renderer);

        if (baseSceneOptions.showStats) {
            this.stats = this.initStats(this.renderer);
        }
    }

    /**
     * Initialize the renderer for the scene
     * @param container The HTML element that will contain the renderer
     */
    protected abstract initRenderer(container: HTMLElement): Promise<THREE.WebGLRenderer>;

    /**
     * Initialize the scene with basic setup like camera, lights, etc., and the 3D content itself
     */
    protected async initScene(renderer: THREE.WebGLRenderer): Promise<THREE.Scene> {
        const scene = new THREE.Scene();
        await this.setupScene(renderer, scene);
        return scene;
    }

    /**
     * Setup the scene with the 3D content
     * @param scene The scene to setup
     */
    protected abstract setupScene(renderer: THREE.WebGLRenderer, scene: THREE.Scene): Promise<void>;

    /**
     * Initialize the stats for the scene
     * @param renderer The renderer to attach the stats to
     */
    private initStats(renderer: THREE.WebGLRenderer): Stats {
        const stats = new Stats();
        stats.dom.style.position = 'absolute';
        renderer.domElement.parentElement?.appendChild(stats.dom);

        return stats;
    }

    /**
     * Animate the scene
     */
    protected animate(): void {
        if (this.stats) {
            this.stats.update();
        }
    }

}
