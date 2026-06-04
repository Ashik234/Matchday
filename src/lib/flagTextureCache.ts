import * as THREE from 'three';

const cache = new Map<string, Promise<THREE.Texture>>();

export function loadFlagTexture(cc: string): Promise<THREE.Texture> {
  const key = cc.toLowerCase();
  const cached = cache.get(key);
  if (cached) return cached;

  const loader = new THREE.TextureLoader();
  loader.setCrossOrigin('anonymous');
  const url = `https://flagcdn.com/w320/${key}.png`;
  const promise = loader.loadAsync(url).then((tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    return tex;
  });
  cache.set(key, promise);
  return promise;
}
