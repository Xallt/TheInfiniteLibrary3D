import * as THREE from "three";
import { PdfPage } from "../../utils/pdfParser";
import { BookMeshParams, TextureLoader } from "./Book";

export interface PageParams {
  width: number;
  height: number;
}

export interface PageTextures {
  front: string | ImageData | null;
  back: string | ImageData | null;
}

const PLANE_OFFSET = 0.0;

export interface PageData {
  params: PageParams;
  textures: PageTextures;
}

export function createPageMesh(params: PageParams, textures: PageTextures): THREE.Group {
  const group = new THREE.Group();
  const frontGeometry = new THREE.PlaneGeometry(params.width, params.height);
  frontGeometry.translate(params.width / 2, 0, 0);

  const frontMaterial = textures.front
    ? new THREE.MeshLambertMaterial({
        map: createTextureFromSource(textures.front),
        side: THREE.FrontSide,
      })
    : new THREE.MeshLambertMaterial({
        color: 0xffffff,
        side: THREE.FrontSide,
      });
  const frontPlane = new THREE.Mesh(frontGeometry, frontMaterial);
  frontPlane.position.z = PLANE_OFFSET;

  const backGeometry = new THREE.PlaneGeometry(params.width, params.height);
  backGeometry.rotateY(Math.PI);
  backGeometry.translate(params.width / 2, 0, 0);
  const backMaterial = textures.back
    ? new THREE.MeshLambertMaterial({
        map: createTextureFromSource(textures.back),
        side: THREE.FrontSide,
      })
    : new THREE.MeshLambertMaterial({
        color: 0xffffff,
        side: THREE.FrontSide,
      });
  const backPlane = new THREE.Mesh(backGeometry, backMaterial);
  backPlane.position.z = -PLANE_OFFSET;

  group.add(frontPlane);
  group.add(backPlane);

  return group;
}
function createTextureFromSource(source: string | ImageData): THREE.Texture {
  if (source instanceof ImageData) {
    const canvas = document.createElement("canvas");
    canvas.width = source.width;
    canvas.height = source.height;
    const ctx = canvas.getContext("2d")!;
    ctx.putImageData(source, 0, 0);
    return new THREE.CanvasTexture(canvas);
  }
  return TextureLoader.getInstance().load(source);
}

export interface PageProps {
  params: PageParams;
  textures: PageTextures;
}

export function buildPage(pageProps: PageProps) {
  let mesh = createPageMesh(pageProps.params, pageProps.textures);

  return {
    id: crypto.randomUUID(),
    mesh,
    pageProps,
  };
}

export type Page = ReturnType<typeof buildPage>;

export function fromTexturePaths(width: number, height: number, textures: PageTextures): Page {
  return buildPage({ params: { width, height }, textures });
}

export function fromImageData(
  width: number,
  height: number,
  frontImageData: ImageData,
  backImageData: ImageData
): Page {
  return buildPage({
    params: { width, height },
    textures: { front: frontImageData, back: backImageData },
  });
}

export function fromPdfPages(
  frontPdfPage: PdfPage,
  backPdfPage: PdfPage | null,
  params: PageParams
): PageProps {
  const frontBlob = new Blob([frontPdfPage.imageData], { type: "image/png" });
  const backBlob = backPdfPage ? new Blob([backPdfPage.imageData], { type: "image/png" }) : null;

  const frontImageUrl = URL.createObjectURL(frontBlob);
  const backImageUrl = backBlob ? URL.createObjectURL(backBlob) : null;
  const textures: PageTextures = {
    front: frontImageUrl,
    back: backImageUrl,
  };

  const pageProps: PageProps = { params, textures };

  setTimeout(() => {
    if (frontImageUrl) {
      URL.revokeObjectURL(frontImageUrl);
    }
    if (backImageUrl) {
      URL.revokeObjectURL(backImageUrl);
    }
  }, 1000);

  return pageProps;
}

export function fromSinglePdfPage(pdfPage: PdfPage, params: PageParams): PageProps {
  const blob = new Blob([pdfPage.imageData], { type: "image/png" });
  const imageUrl = URL.createObjectURL(blob);

  const textures: PageTextures = {
    front: imageUrl,
    back: imageUrl,
  };

  const pageProps: PageProps = { params, textures };

  setTimeout(() => URL.revokeObjectURL(imageUrl), 1000);

  return pageProps;
}

export function createBlankPage(params: PageParams): PageProps {
  return { params, textures: { front: null, back: null } };
}

export function getPageParams(bookParams: BookMeshParams): PageParams {
  const { bookThickness, bookWidth, bookHeight } = bookParams;
  const pageWidth = (bookWidth - bookThickness) * 0.95;
  return {
    width: pageWidth,
    height: bookHeight,
  };
}

export function buildPageController(
  pageProps: PageProps,
  initialRotation: THREE.Euler,
  initialPosition: THREE.Vector3
) {
  const page = buildPage(pageProps);
  setPageTransform(initialRotation, initialPosition);

  function setPageTransform(rotation: THREE.Euler, position: THREE.Vector3): void {
    page.mesh.rotation.set(rotation.x, rotation.y, rotation.z);
    page.mesh.position.set(position.x, position.y, position.z);
  }
  function updatePageTransform(
    transformUpdate: (
      rotation: THREE.Euler,
      transform: THREE.Vector3
    ) => { rotation: THREE.Euler; transform: THREE.Vector3 }
  ): void {
    const { rotation, transform } = transformUpdate(page.mesh.rotation, page.mesh.position);
    setPageTransform(rotation, transform);
  }

  return {
    id: page.id,
    page,
    updatePageTransform,
    setPageTransform,
  };
}

export type PageController = ReturnType<typeof buildPageController>;
