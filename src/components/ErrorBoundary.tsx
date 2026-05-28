import { Component, type ReactNode, type ErrorInfo } from "react";
import { Sentry } from "@/lib/sentry";

function getLocale(): "lv" | "ru" | "en" {
  try {
    const stored = localStorage.getItem("jobsy-language");
    if (stored === "lv" || stored === "ru" || stored === "en") return stored;
  } catch { /* ignore */ }
  return "lv";
}

const ERROR_STRINGS = {
  lv: { heading: "Kaut kas nogaja greizi", body: "Radas neparedzeta kluda. Ludzu, atgriezieties sakumlapa un meginiet velreiz.", btn: "Atgriezties sakumlapa" },
  ru: { heading: "???-?? ????? ?? ???", body: "????????? ?????????????? ??????. ????????? ?? ??????? ? ?????????? ??? ???.", btn: "?? ???????" },
  en: { heading: "Something went wrong", body: "An unexpected error occurred. Please return to the home page and try again.", btn: "Back to Home" },
};

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
      const s = ERROR_STRINGS[getLocale()];
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-surface-cream px-4 text-center">
          <h1 className="mb-4 font-headline text-4xl font-bold text-on-surface">
            {s.heading}
          </h1>
          <p className="mb-8 max-w-sm font-body text-on-surface-variant">
            {s.body}
          </p>
          <button
            onClick={this.handleReset}
            className="rounded-xl bg-primary px-6 py-3 font-label text-label-md font-semibold text-white transition-opacity hover:opacity-90"
          >
            {s.btn}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
