# Flag Ripple Hover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On hover (desktop only), overlay the large flags in the Featured Teams carousel and Team page hero with a real-time 3D ripple — wind wave plus cursor-tracked warp — using a single mount-on-hover R3F canvas. All other flags stay static.

**Architecture:** Texture loaded from `flagcdn.com` (free PNG CDN) and cached by ISO code. A new `<FlagRipple>` wrapper renders the existing CSS `<Flag>` underneath, then conditionally mounts an absolutely-positioned R3F `<Canvas>` with a custom shader plane on `pointerenter`. Pointer-events on the canvas pass through to the wrapper so `leave` always fires. Mobile, reduced-motion, and devices without hover get the static flag.

**Tech Stack:** React 19, TypeScript strict, `@react-three/fiber`, `@react-three/drei`, `three`, Tailwind v4, existing `flag-icons` CSS package (static fallback), existing `useReducedMotion` hook.

**Repo note:** No test runner. Verification = `npx tsc -b --noEmit` + `npx vite build` + manual browser checks. Each task ends in a commit.

---

## File Structure

**Create:**
- `src/lib/flagTextureCache.ts`
- `src/components/ui/flagShader/shaders.ts`
- `src/components/ui/flagShader/FlagPlane.tsx`
- `src/components/ui/FlagRipple.tsx`

**Modify:**
- `src/components/sections/TeamCarouselCard.tsx` — swap `<Flag>` → `<FlagRipple>`.
- `src/pages/TeamPage/components/FlagWave.tsx` — internals replaced with `<FlagRipple>`.

**Untouched:** `src/components/ui/Flag.tsx`, `GroupCard.tsx`, bracket `MatchCard.tsx`, `RecentForm.tsx`, `MatchTimeline.tsx`, all sm/md flag callers.

---

## Task 1: Flag texture cache

**Files:**
- Create: `src/lib/flagTextureCache.ts`

- [ ] **Step 1: Write the module**

```ts
// src/lib/flagTextureCache.ts
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

- [ ] **Step 2: Type-check**

Run: `npx tsc -b --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/lib/flagTextureCache.ts
git commit -m "lib: flagTextureCache — promise-memoized THREE texture loader"
```

---

## Task 2: Shader source strings

**Files:**
- Create: `src/components/ui/flagShader/shaders.ts`

- [ ] **Step 1: Write the file**

```ts
// src/components/ui/flagShader/shaders.ts
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

- [ ] **Step 2: Type-check**

Run: `npx tsc -b --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/flagShader/shaders.ts
git commit -m "shader: flag vertex (wind + cursor warp) + texture fragment"
```

---

## Task 3: `FlagPlane` R3F mesh

**Files:**
- Create: `src/components/ui/flagShader/FlagPlane.tsx`

- [ ] **Step 1: Write the component**

```tsx
// src/components/ui/flagShader/FlagPlane.tsx
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, type MutableRefObject } from 'react';
import * as THREE from 'three';
import { VERTEX, FRAGMENT } from './shaders';

export function FlagPlane({
  texture,
  mouse,
  intensity,
  aspect,
}: {
  texture: THREE.Texture;
  mouse: MutableRefObject<[number, number]>;
  intensity: MutableRefObject<number>;
  aspect: number;
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

- [ ] **Step 2: Type-check**

Run: `npx tsc -b --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/flagShader/FlagPlane.tsx
git commit -m "shader: FlagPlane — subdivided plane + ShaderMaterial driven by refs"
```

---

## Task 4: `FlagRipple` wrapper

**Files:**
- Create: `src/components/ui/FlagRipple.tsx`

- [ ] **Step 1: Write the component**

```tsx
// src/components/ui/FlagRipple.tsx
import { Suspense, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
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
  const leaveTimerRef = useRef<number | null>(null);
  const reduced = useReducedMotion();

  const isHoverDevice =
    typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches;

  const onEnter = () => {
    if (!isHoverDevice || reduced) return;
    if (leaveTimerRef.current) {
      window.clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
    setHovering(true);
    intensityRef.current = 1;
    if (!tex) {
      void loadFlagTexture(countryCode)
        .then(setTex)
        .catch(() => setHovering(false));
    }
  };

  const onLeave = () => {
    intensityRef.current = 0;
    leaveTimerRef.current = window.setTimeout(() => {
      setHovering(false);
      leaveTimerRef.current = null;
    }, 250);
  };

  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = 1 - (e.clientY - rect.top) / rect.height;
    mouseRef.current = [x, y];
  };

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

- [ ] **Step 2: Type-check**

Run: `npx tsc -b --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/FlagRipple.tsx
git commit -m "ui: FlagRipple wrapper — mount-on-hover canvas over static Flag"
```

---

## Task 5: Wire FlagRipple into Featured Teams + Team Hero

**Files:**
- Modify: `src/components/sections/TeamCarouselCard.tsx`
- Modify: `src/pages/TeamPage/components/FlagWave.tsx`

- [ ] **Step 1: Swap Flag → FlagRipple in TeamCarouselCard**

Replace entire file contents:

```tsx
// src/components/sections/TeamCarouselCard.tsx
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { FlagRipple } from '@/components/ui/FlagRipple';
import { toSlug } from '@/utils/slug';
import type { Team } from '@/data/types';

export function TeamCarouselCard({ team }: { team: Team }) {
  return (
    <Link to={`/team/${toSlug(team.name)}`} className="block">
      <Card hover className="w-[260px] shrink-0 snap-start flex flex-col">
        <div className="flex items-center gap-3 mb-3 min-w-0">
          <FlagRipple countryCode={team.countryCode} size="lg" ariaLabel={team.name} />
          <div className="min-w-0 flex-1">
            <div className="font-display text-xl truncate" title={team.name}>{team.name}</div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-text-dim">{team.federation}</div>
          </div>
        </div>
        <div className="mt-auto flex items-center justify-between text-xs">
          <span className="text-text-dim">FIFA Rank</span>
          <span className="font-mono text-gold">#{team.fifaRank ?? '—'}</span>
        </div>
      </Card>
    </Link>
  );
}
```

- [ ] **Step 2: Replace FlagWave internals**

Replace entire file contents:

```tsx
// src/pages/TeamPage/components/FlagWave.tsx
import { FlagRipple } from '@/components/ui/FlagRipple';

export function FlagWave({ countryCode, label }: { countryCode: string; label: string }) {
  return (
    <div
      className="relative inline-block rounded-md overflow-hidden shadow-card"
      style={{ filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.4))' }}
    >
      <FlagRipple countryCode={countryCode} size="xl" ariaLabel={label} />
    </div>
  );
}
```

- [ ] **Step 3: Type-check + build**

Run: `npx tsc -b --noEmit`
Expected: exit 0.

Run: `npx vite build`
Expected: succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/components/sections/TeamCarouselCard.tsx src/pages/TeamPage/components/FlagWave.tsx
git commit -m "ui: enable FlagRipple on Featured Teams carousel + Team page hero flag"
```

---

## Task 6: Manual verification

**Files:** none.

- [ ] **Step 1: Start dev server**

Run: `pnpm dev`
Open the printed URL.

- [ ] **Step 2: Featured Teams carousel**

Scroll to "Teams to watch". Move pointer over Argentina card's flag.
Expected:
- Within ~200 ms, the flag becomes a rippling 3D plane.
- Moving the mouse across the flag deforms the plane near the cursor (visible bump).
- Wind ripple keeps animating even when the mouse is still.

- [ ] **Step 3: Leave the card**

Move cursor away. Expected: ripple fades over ~250 ms, then the static
flag remains.

- [ ] **Step 4: Re-hover same card**

Cursor over Argentina again. Expected: ripple appears instantly (texture
cached, no fetch).

- [ ] **Step 5: Hover a different team**

Cursor over Spain. Expected: brief network fetch (visible in devtools),
ripple appears.

- [ ] **Step 6: Team page hero**

Navigate to `/team/brazil`. Hover the large hero flag. Expected: same
ripple behaviour at the larger size.

- [ ] **Step 7: Group standings rows**

Scroll to "Group Standings". Hover any team row. Expected: **no
ripple** — those flags stay static (size `sm`).

- [ ] **Step 8: Reduced motion**

Toggle OS reduced-motion ON. Reload. Hover any large flag. Expected:
no canvas mounts, static flag stays.

- [ ] **Step 9: Mobile / touch**

DevTools mobile mode. Tap a team card. Expected: no ripple, navigation
still works.

- [ ] **Step 10: Failure path**

DevTools network panel → block `flagcdn.com`. Hover a never-loaded
team. Expected: static flag stays, no error UI, console has at most one
warning. Page does not crash.

- [ ] **Step 11: tsc + build sanity**

Run: `npx tsc -b --noEmit` (clean)
Run: `npx vite build` (clean)

---

## Self-review checklist

- [ ] Spec coverage: every section in `docs/superpowers/specs/2026-06-04-flag-ripple-hover-design.md` is mapped to a task (texture cache → T1, shaders → T2, FlagPlane → T3, FlagRipple wrapper → T4, wiring → T5, verify → T6).
- [ ] No placeholders.
- [ ] Type consistency: `MutableRefObject<[number, number]>`, `MutableRefObject<number>`, `THREE.Texture`, `Size`, all match across tasks.
- [ ] Exact file paths in every Files block.
- [ ] Each task commits.
