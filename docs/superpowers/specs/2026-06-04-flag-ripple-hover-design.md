# Flag Ripple Hover — Design Spec

**Date:** 2026-06-04
**Branch:** `feat/matchday-impl`
**Author:** assistant

## Goal

On pointer-hover over a large flag (Featured Teams carousel + Team
page hero), render a real-time 3D ripple effect: the flag becomes a
displaced plane with a wind wave + cursor-tracked warp. Static CSS
flag everywhere else.

## Non-Goals

- Argentina-specific sun emblem (out of scope).
- Click-burst ripple from cursor.
- Always-on ripple on mobile (battery / perf).
- Replacing flag rendering for small flags (group rows, match cards).
- Wrapping every flag site-wide.

## Constraints

- `@react-three/fiber` + `@react-three/drei` + `three` already in deps.
- Single R3F canvas at a time (mount-on-hover, unmount-on-leave).
- 0 new dependencies.
- Texture source: [flagcdn.com](https://flagcdn.com) free PNG CDN — no
  auth, no key, lowercase ISO codes, 4:3 aspect ratio.
- Respect `useReducedMotion`.
- Mobile (`@media (hover:none)`) renders static flag only.

## Architecture

`src/components/ui/FlagRipple.tsx` wraps `<Flag>` and conditionally
overlays a `<Canvas>` on hover. The canvas is absolutely positioned to
match the underlying Flag's bounding box. CSS `pointer-events: none`
on the canvas so the cursor continues to hit the Flag for `leave`
detection.

### File structure

```
src/
├── components/ui/
│   ├── Flag.tsx                  # unchanged
│   ├── FlagRipple.tsx            # new — wrapper with hover lifecycle
│   └── flagShader/
│       ├── FlagPlane.tsx         # mesh + ShaderMaterial inside R3F scene
│       └── shaders.ts            # vertex + fragment GLSL as exported strings
└── lib/
    └── flagTextureCache.ts       # Map<countryCode, Promise<THREE.Texture>>
```

### Texture pipeline

`flagTextureCache.ts`:

```ts
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
```

Cache keyed by lowercase ISO code. Second hover for same country skips
the network and the GPU upload.

### Shaders (`shaders.ts`)

```ts
export const VERTEX = `
varying vec2 vUv;
uniform float uTime;
uniform vec2 uMouse;
uniform float uIntensity;

void main() {
  vUv = uv;
  vec3 pos = position;
  // Wind wave: horizontal sine, amplitude grows toward right edge.
  float wave = sin(pos.x * 4.0 + uTime * 2.0) * 0.04 * uv.x * uIntensity;
  // Cursor warp: smoothstep bump around uMouse.
  float d = distance(uv, uMouse);
  float warp = smoothstep(0.4, 0.0, d) * 0.06 * uIntensity;
  pos.z += wave + warp;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

export const FRAGMENT = `
varying vec2 vUv;
uniform sampler2D uMap;
void main() {
  gl_FragColor = texture2D(uMap, vUv);
}
`;
```

### `FlagPlane.tsx`

```tsx
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { VERTEX, FRAGMENT } from './shaders';

export function FlagPlane({
  texture,
  mouse,    // ref to [x, y] in 0..1
  intensity, // ref to a number
  aspect,
}: {
  texture: THREE.Texture;
  mouse: React.MutableRefObject<[number, number]>;
  intensity: React.MutableRefObject<number>;
  aspect: number; // width / height of the flag
}) {
  const matRef = useRef<THREE.ShaderMaterial | null>(null);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(0.5, 0.5) },
      uIntensity: { value: 0 },
      uMap: { value: texture },
    }),
    [texture],
  );

  useFrame((_, dt) => {
    if (!matRef.current) return;
    uniforms.uTime.value += dt;
    uniforms.uMouse.value.set(mouse.current[0], mouse.current[1]);
    // Smoothly ramp intensity toward target.
    const target = intensity.current;
    const cur = uniforms.uIntensity.value;
    uniforms.uIntensity.value = cur + (target - cur) * Math.min(1, dt * 6);
  });

  return (
    <mesh>
      <planeGeometry args={[aspect, 1, 24, 18]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={VERTEX}
        fragmentShader={FRAGMENT}
        uniforms={uniforms}
        transparent
      />
    </mesh>
  );
}
```

### `FlagRipple.tsx`

Wrapper. Renders the existing CSS `<Flag>` as the static layer. On
pointerenter (desktop only), overlays a Canvas. On pointerleave,
ramps intensity back to 0 then unmounts after 250 ms.

```tsx
import { Suspense, useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { Flag } from './Flag';
import { FlagPlane } from './flagShader/FlagPlane';
import { loadFlagTexture } from '@/lib/flagTextureCache';
import { useReducedMotion } from '@/hooks/useReducedMotion';

type Size = 'sm' | 'md' | 'lg' | 'xl';

export function FlagRipple({
  countryCode,
  size = 'lg',
  ariaLabel,
}: {
  countryCode: string;
  size?: Size;
  ariaLabel?: string;
}) {
  const [hovering, setHovering] = useState(false);
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  const mouseRef = useRef<[number, number]>([0.5, 0.5]);
  const intensityRef = useRef(0);
  const reduced = useReducedMotion();

  // Hover-only on devices that actually have hover.
  const isHoverDevice =
    typeof window !== 'undefined' &&
    window.matchMedia('(hover: hover)').matches;

  const onEnter = () => {
    if (!isHoverDevice || reduced) return;
    setHovering(true);
    intensityRef.current = 1;
    if (!tex) {
      void loadFlagTexture(countryCode).then(setTex).catch(() => {
        // texture failed → stay on static flag
        setHovering(false);
      });
    }
  };

  const onLeave = () => {
    intensityRef.current = 0;
    window.setTimeout(() => setHovering(false), 250);
  };

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = 1 - (e.clientY - rect.top) / rect.height;
    mouseRef.current = [x, y];
  };

  // Aspect derived from the CSS Flag (1.333 == 4/3).
  const aspect = 4 / 3;

  return (
    <div
      className="relative inline-block"
      onPointerEnter={onEnter}
      onPointerLeave={onLeave}
      onPointerMove={onMove}
    >
      <Flag countryCode={countryCode} size={size} ariaLabel={ariaLabel} />
      {hovering && tex && (
        <div className="absolute inset-0 pointer-events-none">
          <Canvas
            dpr={[1, 2]}
            camera={{ position: [0, 0, 1.4], fov: 45 }}
            gl={{ alpha: true, antialias: true }}
            style={{ background: 'transparent' }}
          >
            <Suspense fallback={null}>
              <FlagPlane
                texture={tex}
                mouse={mouseRef}
                intensity={intensityRef}
                aspect={aspect}
              />
            </Suspense>
          </Canvas>
        </div>
      )}
    </div>
  );
}
```

### Pointer-events choreography

- Outer `<div>` listens to `pointerenter/leave/move`.
- `<Flag>` (the CSS background `<span>`) receives nothing — pure
  visual.
- The overlay `<div>` containing `<Canvas>` has `pointer-events:none`
  so the cursor passes through to the outer div and `leave` fires
  reliably.

### Where wired

| Location | Decision |
|---|---|
| `TeamCarouselCard` (size lg) | replace `<Flag>` → `<FlagRipple>` |
| `TeamHero` (size xl) | replace `<FlagWave>` body to use `<FlagRipple>` |
| `GroupCard` rows (size sm) | leave as `<Flag>` |
| `MatchCard` bracket (size sm) | leave as `<Flag>` |
| `RecentForm` chips (size sm) | leave as `<Flag>` |
| `MatchTimeline`, `MatchesTab` upcoming (size md) | leave as `<Flag>` |

Rule of thumb: only wrap `lg` and `xl`. Smaller flags are too small
for the ripple to be visible and would multiply GPU canvases.

### Performance & lifecycle

- One Canvas at a time across the whole app: the hover state is local
  to each wrapper but only the most-recently-entered wrapper has
  `hovering === true`. The previous one's `leave` fires first.
- Texture cache survives across mounts.
- Mobile, reduced-motion, and devices without hover get the plain
  `<Flag>`.
- DPR clamped `[1, 2]` so retina doesn't quadruple the fragment count.

### Accessibility

- The static `<Flag>` underneath provides the actual `role="img"` +
  `aria-label`. The Canvas adds no a11y semantics (the texture is
  visually decorative).
- Reduced motion → no Canvas mounts, ever.

### Loading + failure

- First hover for a new country: texture fetch ~50–100 ms.
- During fetch, static flag remains visible; once texture resolves,
  the canvas appears immediately at full ramp.
- Fetch failure (`flagcdn.com` blocked) → wrapper reverts to static
  flag silently, no error UI.

## Test plan

- [ ] Hover Brazil card → ripple appears, gentle wind wave + warp
      under cursor.
- [ ] Move cursor across flag → warp follows the pointer.
- [ ] Leave → ripple fades over ~250 ms then canvas unmounts.
- [ ] Hover Brazil again → instant (cached texture).
- [ ] Hover a different team → new texture fetches, no flash.
- [ ] Block `flagcdn.com` in devtools → cards still render static
      flags, no console errors after first attempt.
- [ ] DevTools mobile mode → no canvas, just static flags.
- [ ] Reduced-motion OS setting → no canvas anywhere.
- [ ] Team page hero ripples too.
- [ ] Group standings rows do NOT ripple (size sm).
- [ ] No FPS drop with rapid hover-leave-hover cycles.

## Out of scope (revisit later)

- Mobile always-on subtle ripple
- Argentina sun emblem
- Click-burst ripple
- Per-team accent glow
- Pre-cache top-8 textures on app idle
