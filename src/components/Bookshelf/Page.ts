import * as THREE from 'three';
import { PdfPage } from '../../utils/pdfParser';
import { BookMeshParams, TextureLoader } from './Book';

export interface PageParams {
    width: number;
    height: number;
}

export interface PageTextures {
    front: string | ImageData | null;
    back: string | ImageData | null;
}

const PLANE_OFFSET = 0.0000;

function buildPage(paramsArg: PageParams, textures: PageTextures) {
    let params = paramsArg;
    let mesh = createPageMesh(textures);


    function createPageMesh(textures: PageTextures): THREE.Group {
        const group = new THREE.Group();
        const frontGeometry = new THREE.PlaneGeometry(params.width, params.height);
        frontGeometry.translate(params.width / 2, 0, 0);

        const frontMaterial = textures.front
            ? new THREE.MeshLambertMaterial({
                map: createTextureFromSource(textures.front),
                side: THREE.FrontSide
            })
            : new THREE.MeshLambertMaterial({
                color: 0xffffff,
                side: THREE.FrontSide
            });
        const frontPlane = new THREE.Mesh(frontGeometry, frontMaterial);
        frontPlane.position.z = PLANE_OFFSET;

        const backGeometry = new THREE.PlaneGeometry(params.width, params.height);
        backGeometry.rotateY(Math.PI);
        backGeometry.translate(params.width / 2, 0, 0);
        const backMaterial = textures.back
            ? new THREE.MeshLambertMaterial({
                map: createTextureFromSource(textures.back),
                side: THREE.FrontSide
            })
            : new THREE.MeshLambertMaterial({
                color: 0xffffff,
                side: THREE.FrontSide
            });
        const backPlane = new THREE.Mesh(backGeometry, backMaterial);
        backPlane.position.z = -PLANE_OFFSET;

        group.add(frontPlane);
        group.add(backPlane);

        return group;
    }

    function createTextureFromSource(source: string | ImageData): THREE.Texture {
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

    return {
        mesh,
        params,
    };

}


export type Page = ReturnType<typeof buildPage>;

export function fromTexturePaths(
    width: number,
    height: number,
    textures: PageTextures
): Page {
    return buildPage({ width, height }, textures);
}

export function fromImageData(
    width: number,
    height: number,
    frontImageData: ImageData,
    backImageData: ImageData,
): Page {
    return buildPage({ width, height }, { front: frontImageData, back: backImageData });
}

export function fromPdfPages(
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

    const page = buildPage(params, textures);

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

export function fromSinglePdfPage(
    pdfPage: PdfPage,
    params: PageParams
): Page {
    const blob = new Blob([pdfPage.imageData], { type: 'image/png' });
    const imageUrl = URL.createObjectURL(blob);

    const textures: PageTextures = {
        front: imageUrl,
        back: imageUrl
    };

    const page = buildPage(params, textures);

    setTimeout(() => URL.revokeObjectURL(imageUrl), 1000);

    return page;
}

export function createBlankPage(params: PageParams): Page {
    return buildPage(params, { front: null, back: null });
}

export function getPageParams(bookParams: BookMeshParams): PageParams {
    const { bookThickness, bookWidth, bookHeight } = bookParams;
    const pageWidth = (bookWidth - bookThickness) * 0.95;
    return {
        width: pageWidth,
        height: bookHeight,
    }
}