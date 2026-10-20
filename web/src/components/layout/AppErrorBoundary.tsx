import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button, Card } from '../ui';

type Props = { children: ReactNode };
type State = { hasError: boolean };

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('LinkPulse page rendering error', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-app px-4 py-10 text-ink">
          <Card className="w-full max-w-lg border border-line p-7 sm:p-10">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-paleOrange text-danger"><AlertTriangle aria-hidden="true" /></div>
            <p className="mt-7 text-xs font-bold uppercase tracking-[0.14em] text-textMuted">LinkPulse</p>
            <h1 className="mt-2 text-3xl font-extrabold">This page hit a problem.</h1>
            <p className="mt-3 text-sm leading-6 text-textMuted">The rest of LinkPulse is still available. Reload this page or return to your workspace.</p>
            <div className="mt-7 flex flex-wrap gap-3"><Button onClick={() => window.location.reload()}><RefreshCw className="h-4 w-4" aria-hidden="true" />Reload page</Button><a href="/dashboard" className="app-button border border-line bg-cream text-ink hover:bg-sand">Go to dashboard</a></div>
          </Card>
        </main>
      );
    }
    return this.props.children;
  }
}
