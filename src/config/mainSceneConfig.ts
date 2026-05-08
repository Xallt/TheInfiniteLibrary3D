export interface MainSceneConfig {
  floorTexture: {
    path: string;
    repeat: number;
  };
  environmentMap?: {
    path: string;
  };
}

export const defaultMainSceneConfig: MainSceneConfig = {
  floorTexture: {
    path: `${import.meta.env.BASE_URL}resources/Floor/wood parquet 12_baseColor.jpeg`,
    repeat: 100,
  },
  environmentMap: undefined,
  // TODO: Fix parallel env map loading
  // environmentMap: {
  //     path: `${import.meta.env.BASE_URL}resources/HDR_hazy_nebulae.hdr`
  // }
};
