import { createPageMesh, PageData } from "./Page";

export function PageComponent({ params, textures }: PageData) {

    let mesh = createPageMesh(params, textures);

    return (
        <primitive object={mesh} />
    );

}