import * as THREE from 'three';
import { TextureLoader } from './Book';
import { PdfPage } from '../utils/pdfParser';

export interface PageParams {
    width: number;
    height: number;
}

export class Page {
    private mesh: THREE.Mesh;
    private params: PageParams;

    constructor(params: PageParams, texturePath: string | ImageData) {
        this.params = params;
        this.mesh = this.createPageMesh(texturePath);
    }

    private createPageMesh(textureSource: string | ImageData): THREE.Mesh {
        const geometry = new THREE.PlaneGeometry(this.params.width, this.params.height);
        geometry.translate(this.params.width / 2, 0, 0);

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
        texturePath: string
    ): Page {
        return new Page(
            { width, height },
            texturePath
        );
    }

    public static fromImageData(
        width: number,
        height: number,
        imageData: ImageData,
    ): Page {
        return new Page(
            { width, height },
            imageData
        );
    }

    public static fromPdfPage(
        pdfPage: PdfPage,
        params: PageParams
    ): Page {
        // Create ImageData from the Uint8Array
        const blob = new Blob([pdfPage.imageData], { type: 'image/png' });
        const imageUrl = URL.createObjectURL(blob);

        // Create the page
        const page = new Page(params, imageUrl);

        // Clean up the URL after the texture is loaded
        setTimeout(() => URL.revokeObjectURL(imageUrl), 1000);

        return page;
    }
} 