import path from "node:path";

import type { ImageMetadata } from "astro";

const imageModules = import.meta.glob<{ default: ImageMetadata }>(
  "/src/assets/**/*.{avif,jpg,jpeg,png,webp}",
  { eager: true },
);

const assetByBaseName = new Map(
  Object.entries(imageModules).map(([sourcePath, module]) => [
    path.basename(sourcePath, path.extname(sourcePath)),
    module.default,
  ]),
);

function getOriginalAssetName(image: ImageMetadata): string {
  const fileName = path.basename(image.src);
  const withoutExtension = fileName.replace(/\.[^.]+$/u, "");
  const nameParts = withoutExtension.split(".");

  if (nameParts.length > 1) {
    nameParts.pop();
  }

  return nameParts.join(".");
}

export function resolveHeroVariants(image: ImageMetadata): {
  desktop: ImageMetadata;
  tablet?: ImageMetadata;
  mobile?: ImageMetadata;
} {
  const baseName = getOriginalAssetName(image);

  return {
    desktop: image,
    tablet: assetByBaseName.get(`${baseName}-tablette`),
    mobile: assetByBaseName.get(`${baseName}-mobile`),
  };
}
