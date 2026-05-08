import * as THREE from "three";
import { ProceduralMesh } from "../../utils/ProceduralMesh";
import { BookTexture } from "./BookTexture";
import { buildPage, Page, PageProps } from "./Page";

interface QuadUVs {
  front: number[];
  back: number[];
  left: number[];
  right: number[];
  top: number[];
  bottom: number[];
}

export function buildUniformlyOpenedState(angle: number = 0) {
  function getPageRotationArgs(numPages: number): { coverAngle: number; pageAngles: number[] } {
    const pageAngles = Array(numPages)
      .fill(0)
      .map((_, index) => {
        const proportionalAngle = (2 * angle * (index + 1)) / numPages - angle - angle / numPages;
        return proportionalAngle;
      });

    return {
      coverAngle: angle,
      pageAngles,
    };
  }

  return {
    stateType: "uniformlyOpened",
    angle,
    getPageRotationArgs,
  };
}

export function buildPageSelectedState(angle: number = Math.PI / 2, selectedPageIndex: number = 0) {
  const eps = 0.1; // Small angle to separate pages
  function getPageRotationArgs(numPages: number): { coverAngle: number; pageAngles: number[] } {
    const pageAngles = Array(numPages)
      .fill(0)
      .map((_, index) => {
        if (index < selectedPageIndex) {
          return -angle + eps;
        } else {
          return angle - eps;
        }
      });

    return {
      coverAngle: angle,
      pageAngles,
    };
  }

  return {
    stateType: "pageSelected",
    angle,
    selectedPageIndex,
    getPageRotationArgs,
  };
}

export type UniformlyOpenedState = ReturnType<typeof buildUniformlyOpenedState>;
export type PageSelectedState = ReturnType<typeof buildPageSelectedState>;
export type BookOpeningState = UniformlyOpenedState | PageSelectedState;

export class TextureLoader {
  private static instance: TextureLoader;
  private loader: THREE.TextureLoader;
  private cache: Map<string, THREE.Texture>;

  private constructor() {
    this.loader = new THREE.TextureLoader();
    this.cache = new Map();
  }

  public static getInstance(): TextureLoader {
    if (!TextureLoader.instance) {
      TextureLoader.instance = new TextureLoader();
    }
    return TextureLoader.instance;
  }

  public load(texturePath: string): THREE.Texture {
    if (this.cache.has(texturePath)) {
      return this.cache.get(texturePath)!;
    }
    const texture = this.loader.load(texturePath);
    this.cache.set(texturePath, texture);
    return texture;
  }
}

export interface BookMeshParams {
  bookThickness: number;
  bookWidth: number;
  bookHeight: number;
  coverWidth: number;
}

export function getBookOuterSize(params: BookMeshParams): THREE.Vector3 {
  const { bookThickness, bookWidth, bookHeight, coverWidth } = params;
  return new THREE.Vector3(coverWidth + bookThickness * 2, bookHeight, bookWidth + bookThickness);
}
function createBoxGeometry(boxSize: THREE.Vector3, uvs: QuadUVs): THREE.BufferGeometry {
  const corner = new THREE.Vector3(-boxSize.x / 2, boxSize.y / 2, boxSize.z / 2);
  const { points, indices } = ProceduralMesh.get3DRectPoints(corner, boxSize);

  const vertices: number[] = [];
  const indicesArray: number[] = [];
  const uvCoords: number[] = [];
  let vertexCounter = 0;

  const addQuad = (
    p1: THREE.Vector3,
    p2: THREE.Vector3,
    p3: THREE.Vector3,
    p4: THREE.Vector3,
    quadUVs: number[]
  ) => {
    vertices.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z, p3.x, p3.y, p3.z, p4.x, p4.y, p4.z);
    uvCoords.push(...quadUVs);
    indicesArray.push(
      vertexCounter,
      vertexCounter + 1,
      vertexCounter + 2,
      vertexCounter + 2,
      vertexCounter + 1,
      vertexCounter + 3
    );
    vertexCounter += 4;
  };

  addQuad(
    points[indices.frontTopLeft],
    points[indices.frontTopRight],
    points[indices.frontBottomLeft],
    points[indices.frontBottomRight],
    uvs.front
  );
  addQuad(
    points[indices.backTopRight],
    points[indices.backTopLeft],
    points[indices.backBottomRight],
    points[indices.backBottomLeft],
    uvs.back
  );
  addQuad(
    points[indices.frontBottomLeft],
    points[indices.backBottomLeft],
    points[indices.frontTopLeft],
    points[indices.backTopLeft],
    uvs.left
  );
  addQuad(
    points[indices.backBottomRight],
    points[indices.frontBottomRight],
    points[indices.backTopRight],
    points[indices.frontTopRight],
    uvs.right
  );
  addQuad(
    points[indices.frontTopLeft],
    points[indices.backTopLeft],
    points[indices.frontTopRight],
    points[indices.backTopRight],
    uvs.top
  );
  addQuad(
    points[indices.frontBottomLeft],
    points[indices.frontBottomRight],
    points[indices.backBottomLeft],
    points[indices.backBottomRight],
    uvs.bottom
  );

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvCoords, 2));
  geometry.setIndex(indicesArray);
  geometry.computeVertexNormals();

  return geometry;
}
function createBox(
  boxCenter: THREE.Vector3,
  _boxSize: THREE.Vector3,
  geometry: THREE.BufferGeometry,
  bookTexture: BookTexture
): THREE.Mesh {
  const material = new THREE.MeshLambertMaterial({ map: bookTexture.getTexture() });
  const box = new THREE.Mesh(geometry, material);
  box.position.set(boxCenter.x, boxCenter.y, boxCenter.z);
  return box;
}

function createBookMesh(
  params: BookMeshParams,
  bookTexture: BookTexture
): {
  coverMesh: THREE.Mesh;
  leftSideMesh: THREE.Mesh;
  rightSideMesh: THREE.Mesh;
  mesh: THREE.Mesh;
} {
  const { bookThickness, bookWidth, bookHeight, coverWidth } = params;

  const coverMesh = createBox(
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(coverWidth, bookHeight, bookThickness),
    createBoxGeometry(new THREE.Vector3(coverWidth, bookHeight, bookThickness), {
      front: bookTexture.getSpineUVs(),
      back: bookTexture.getSpineUVs(),
      left: bookTexture.getLeftLeftUVs(),
      right: bookTexture.getRightRightUVs(),
      top: bookTexture.getSpineTopSideUVs(),
      bottom: bookTexture.getSpineBottomSideUVs(),
    }),
    bookTexture
  );

  const rightSideMesh = createBox(
    new THREE.Vector3(-coverWidth / 2, 0, bookThickness / 2),
    new THREE.Vector3(bookThickness, bookHeight, bookWidth),
    createBoxGeometry(new THREE.Vector3(bookThickness, bookHeight, bookWidth), {
      front: bookTexture.getLeftLeftUVs(),
      back: bookTexture.getRightRightUVs(),
      left: bookTexture.getRightSideUVs(),
      right: bookTexture.getRightSideUVs(),
      top: bookTexture.getRightSideTopUVs(),
      bottom: bookTexture.getRightSideBottomUVs(),
    }),
    bookTexture
  );

  const leftSideMesh = createBox(
    new THREE.Vector3(coverWidth / 2, 0, bookThickness / 2),
    new THREE.Vector3(bookThickness, bookHeight, bookWidth),
    createBoxGeometry(new THREE.Vector3(bookThickness, bookHeight, bookWidth), {
      front: bookTexture.getLeftLeftUVs(),
      back: bookTexture.getRightRightUVs(),
      left: bookTexture.getLeftSideUVs(),
      right: bookTexture.getLeftSideUVs(),
      top: bookTexture.getLeftSideTopUVs(),
      bottom: bookTexture.getLeftSideBottomUVs(),
    }),
    bookTexture
  );

  rightSideMesh.geometry.translate(-bookThickness / 2, 0, bookWidth / 2);
  leftSideMesh.geometry.translate(bookThickness / 2, 0, bookWidth / 2);

  const book = new THREE.Mesh();
  book.add(coverMesh);
  book.add(leftSideMesh);
  book.add(rightSideMesh);

  return {
    coverMesh,
    leftSideMesh,
    rightSideMesh,
    mesh: book,
  };
}
export function buildBook(
  params: BookMeshParams,
  bookTexture: BookTexture,
  numPages: number,
  initialState: BookOpeningState = buildUniformlyOpenedState(),
  id: number
) {
  let originalPosition: THREE.Vector3 | undefined;
  let originalRotation: THREE.Euler | undefined;
  let pages: (Page | null)[] = new Array(numPages).fill(null);
  let pageTransforms: Map<string, { rotation: THREE.Euler; position: THREE.Vector3 }> = new Map();

  function setPageTransform(pageId: string, rotation: THREE.Euler, position: THREE.Vector3): void {
    const page = pages.find((page) => page?.id === pageId);
    if (page) {
      page.mesh.rotation.set(rotation.x, rotation.y, rotation.z);
      page.mesh.position.set(position.x, position.y, position.z);
      pageTransforms.set(pageId, { rotation, position });
    }
  }

  function updatePageTransform(
    pageId: string,
    transformUpdate: (
      rotation: THREE.Euler,
      transform: THREE.Vector3
    ) => { rotation: THREE.Euler; transform: THREE.Vector3 }
  ): void {
    const page = pages.find((page) => page?.id === pageId);
    if (page) {
      const { rotation, transform } = transformUpdate(page.mesh.rotation, page.mesh.position);
      setPageTransform(pageId, rotation, transform);
    }
  }

  let openingState = initialState;
  let { coverMesh, leftSideMesh, rightSideMesh, mesh } = createBookMesh(params, bookTexture);

  function updateBookRotations(): void {
    const { coverAngle, pageAngles } = openingState.getPageRotationArgs(pages.length);
    leftSideMesh.rotation.y = coverAngle;
    rightSideMesh.rotation.y = -coverAngle;
    pages.forEach((page, index) => {
      if (page) {
        updatePageTransform(page.id, (rotation, transform) => {
          return {
            rotation: new THREE.Euler(rotation.x, pageAngles[index] - Math.PI / 2, rotation.z),
            transform: transform,
          };
        });
      }
    });
  }

  function setState(newState: BookOpeningState): void {
    openingState = newState;
    updateBookRotations();
  }

  function addPage(pageProps: PageProps, index: number): void {
    if (index < 0 || index >= pages.length) {
      throw new Error(`Page index ${index} is out of bounds (0-${pages.length - 1})`);
    }
    const page = buildPage(pageProps);
    const { bookThickness, coverWidth } = params;
    const pagePosition = new THREE.Vector3(
      -coverWidth / 2 + index * (coverWidth / pages.length) + coverWidth / pages.length / 2,
      0,
      bookThickness / 2
    );
    const { pageAngles } = openingState.getPageRotationArgs(pages.length);
    pages[index] = page;
    const pageRotation = new THREE.Euler(0, pageAngles[index] - Math.PI / 2, 0);
    setPageTransform(page.id, pageRotation, pagePosition);

    if (pages[index]) {
      mesh.remove(pages[index]!.mesh);
    }
    mesh.add(page.mesh);
  }

  function resizePageArray(newSize: number): void {
    for (let i = 0; i < pages.length; i++) {
      if (pages[i]) {
        mesh.remove(pages[i]!.mesh);
      }
    }
    pages.splice(0, pages.length, ...new Array(newSize).fill(null));
    updateBookRotations();
  }

  function selectPage(pageIndex: number, angle: number = Math.PI / 2): void {
    if (pageIndex < 0 || pageIndex > pages.length) {
      throw new Error(`Page index ${pageIndex} is out of bounds (0-${pages.length - 1})`);
    }
    setState(buildPageSelectedState(angle, pageIndex));
  }

  function setCoverAngles(angle: number): void {
    setState(buildUniformlyOpenedState(angle));
  }

  function storeOriginalTransform(): void {
    originalPosition = mesh.position.clone();
    originalRotation = mesh.rotation.clone();
  }

  function restoreOriginalTransform(): void {
    if (!originalPosition || !originalRotation) return;
    mesh.position.copy(originalPosition);
    mesh.rotation.copy(originalRotation);
    setCoverAngles(0);
  }

  return {
    state: {
      id,
      params,
      mesh,
      pages,
      pageTransforms,
      openingState,
    },
    actions: {
      setState,
      addPage,
      resizePageArray,
      selectPage,
      setCoverAngles,
      storeOriginalTransform,
      restoreOriginalTransform,
    },
  };
}

export type Book = ReturnType<typeof buildBook>;
