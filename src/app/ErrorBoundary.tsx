import { Component, type ReactNode } from 'react';

type State = { error: Error | null };

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('Caught at boundary:', error);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-bg text-text p-8">
          <div className="max-w-md text-center">
            <h1 className="font-display text-4xl mb-3">Something went wrong</h1>
            <p className="text-text-dim mb-6">{this.state.error.message}</p>
            <button
              type="button"
              onClick={() => location.reload()}
              className="px-5 py-2 rounded-full bg-gold text-bg-deep font-semibold"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
