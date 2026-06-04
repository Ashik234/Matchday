import { Component, lazy, Suspense, type ReactNode } from 'react';
import { TrophySVG } from './TrophySVG';

const TrophyModel = lazy(() =>
  import('./TrophyModel').then((m) => ({ default: m.TrophyModel })),
);

class TrophyErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(err: unknown) {
    console.warn('[trophy] 3D model failed, falling back to SVG:', err);
  }
  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

export function TrophyCenter({ size = 140 }: { size?: number }) {
  const svgSize = size <= 96 ? size : 96;
  return (
    <TrophyErrorBoundary fallback={<TrophySVG size={svgSize} />}>
      <Suspense fallback={<TrophySVG size={svgSize} />}>
        <TrophyModel size={size} />
      </Suspense>
    </TrophyErrorBoundary>
  );
}
