import * as THREE from 'three';
import { BookMeshParams, TextureLoader } from './Book';
import { PdfPage } from '../../utils/pdfParser';

export interface PageParams {
    width: number;
    height: number;
}

export interface PageTextures {
    front: string | ImageData | null;
    back: string | ImageData | null;
}

export class Page {
    private mesh: THREE.Group;
    private params: PageParams;
    private static readonly PLANE_OFFSET = 0.0000;

    constructor(params: PageParams, textures: PageTextures) {
        this.params = params;
        this.mesh = this.createPageMesh(textures);
    }

    public getParams(): PageParams {
        return this.params;
    }

    public static getPageParams(bookParams: BookMeshParams): PageParams {
        const { bookThickness, bookWidth, bookHeight } = bookParams;
        const pageWidth = (bookWidth - bookThickness) * 0.95;
        return {
            width: pageWidth,
            height: bookHeight,
        }
    }

    private createPageMesh(textures: PageTextures): THREE.Group {
        const group = new THREE.Group();
        const frontGeometry = new THREE.PlaneGeometry(this.params.width, this.params.height);
        frontGeometry.translate(this.params.width / 2, 0, 0);

        const frontMaterial = textures.front
            ? new THREE.MeshLambertMaterial({
                map: this.createTextureFromSource(textures.front),
                side: THREE.FrontSide
            })
            : new THREE.MeshLambertMaterial({
                color: 0xffffff,
                side: THREE.FrontSide
            });
        const frontPlane = new THREE.Mesh(frontGeometry, frontMaterial);
        frontPlane.position.z = Page.PLANE_OFFSET;

        const backGeometry = new THREE.PlaneGeometry(this.params.width, this.params.height);
        backGeometry.rotateY(Math.PI);
        backGeometry.translate(this.params.width / 2, 0, 0);
        const backMaterial = textures.back
            ? new THREE.MeshLambertMaterial({
                map: this.createTextureFromSource(textures.back),
                side: THREE.FrontSide
            })
            : new THREE.MeshLambertMaterial({
                color: 0xffffff,
                side: THREE.FrontSide
            });
        const backPlane = new THREE.Mesh(backGeometry, backMaterial);
        backPlane.position.z = -Page.PLANE_OFFSET;

        group.add(frontPlane);
        group.add(backPlane);

        return group;
    }

    private createTextureFromSource(source: string | ImageData): THREE.Texture {
        if (source instanceof ImageData) {
            const canvas = document.createElement('canvas');
            canvas.width = source.width;
            canvas.height = source.height;
            const ctx = canvas.getContext('2d')!;
            ctx.putImageData(source, 0, 0);
            return new THREE.CanvasTexture(canvas);
        }
        return TextureLoader.getInstance().load(source);
    }

    public getMesh(): THREE.Group {
        return this.mesh;
    }

    public static fromTexturePaths(
        width: number,
        height: number,
        textures: PageTextures
    ): Page {
        return new Page(
            { width, height },
            textures
        );
    }

    public static fromImageData(
        width: number,
        height: number,
        frontImageData: ImageData,
        backImageData: ImageData,
    ): Page {
        return new Page(
            { width, height },
            { front: frontImageData, back: backImageData }
        );
    }

    public static fromPdfPages(
        frontPdfPage: PdfPage,
        backPdfPage: PdfPage | null,
        params: PageParams
    ): Page {
        const frontBlob = new Blob([frontPdfPage.imageData], { type: 'image/png' });
        const backBlob = backPdfPage
            ? new Blob([backPdfPage.imageData], { type: 'image/png' })
            : null;

        const frontImageUrl = URL.createObjectURL(frontBlob);
        const backImageUrl = backBlob
            ? URL.createObjectURL(backBlob)
            : null;
        const textures: PageTextures = {
            front: frontImageUrl,
            back: backImageUrl
        };

        const page = new Page(params, textures);

        setTimeout(() => {
            if (frontImageUrl) {
                URL.revokeObjectURL(frontImageUrl);
            }
            if (backImageUrl) {
                URL.revokeObjectURL(backImageUrl);
            }
        }, 1000);

        return page;
    }

    public static fromSinglePdfPage(
        pdfPage: PdfPage,
        params: PageParams
    ): Page {
        const blob = new Blob([pdfPage.imageData], { type: 'image/png' });
        const imageUrl = URL.createObjectURL(blob);

        const textures: PageTextures = {
            front: imageUrl,
            back: imageUrl
        };

        const page = new Page(params, textures);

        setTimeout(() => URL.revokeObjectURL(imageUrl), 1000);

        return page;
    }

    public static createBlankPage(params: PageParams): Page {
        return new Page(params, { front: null, back: null });
    }
} 