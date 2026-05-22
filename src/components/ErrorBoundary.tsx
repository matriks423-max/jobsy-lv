import { Component, type ReactNode, type ErrorInfo } from "react";
import { Sentry } from "@/lib/sentry";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[jobsy] Uncaught error:", error, info.componentStack);
    Sentry.captureException(error, { extra: { componentStack: info.componentStack } });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--cream)] px-4 text-center">
          <h1 className="font-serif text-4xl font-bold text-[var(--ink)] mb-4">
            Kaut kas nogāja greizi
          </h1>
          <p className="text-[var(--muted)] mb-8 max-w-sm">
            Radās neparedzēta kļūda. Lūdzu, atgriezieties sākumlapā un mēģiniet vēlreiz.
          </p>
          <button
            onClick={this.handleReset}
            className="px-6 py-3 bg-[var(--ink)] text-[var(--cream)] rounded-xl font-semibold hover:opacity-80 transition-opacity"
          >
            Atgriezties sākumlapā
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
