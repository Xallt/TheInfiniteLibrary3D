import * as THREE from 'three';
import { TextureLoader } from './Book';

export interface PageParams {
    width: number;
    height: number;
    position?: THREE.Vector3;
    rotation?: THREE.Euler;
}

export class Page {
    private mesh: THREE.Mesh;
    private params: PageParams;

    constructor(params: PageParams, texturePath: string | ImageData) {
        this.params = params;
        this.mesh = this.createPageMesh(texturePath);

        if (params.position) {
            this.mesh.position.copy(params.position);
        }
        if (params.rotation) {
            this.mesh.rotation.copy(params.rotation);
        }
    }

    private createPageMesh(textureSource: string | ImageData): THREE.Mesh {
        const geometry = new THREE.PlaneGeometry(this.params.width, this.params.height);
        let texture: THREE.Texture;

        if (textureSource instanceof ImageData) {
            // Create canvas and draw ImageData
            const canvas = document.createElement('canvas');
            canvas.width = textureSource.width;
            canvas.height = textureSource.height;
            const ctx = canvas.getContext('2d')!;
            ctx.putImageData(textureSource, 0, 0);

            // Create texture from canvas
            texture = new THREE.CanvasTexture(canvas);
        } else {
            texture = TextureLoader.getInstance().load(textureSource);
        }

        const material = new THREE.MeshLambertMaterial({
            map: texture,
            side: THREE.DoubleSide
        });
        return new THREE.Mesh(geometry, material);
    }

    public getMesh(): THREE.Mesh {
        return this.mesh;
    }

    public static fromTexturePath(
        width: number,
        height: number,
        texturePath: string,
        position?: THREE.Vector3,
        rotation?: THREE.Euler
    ): Page {
        return new Page(
            { width, height, position, rotation },
            texturePath
        );
    }

    public static fromImageData(
        width: number,
        height: number,
        imageData: ImageData,
        position?: THREE.Vector3,
        rotation?: THREE.Euler
    ): Page {
        return new Page(
            { width, height, position, rotation },
            imageData
        );
    }
} 