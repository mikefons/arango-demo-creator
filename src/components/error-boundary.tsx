"use client";

import { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex h-screen items-center justify-center bg-background">
          <div className="flex flex-col items-center gap-4 max-w-sm text-center px-6">
            <div className="w-12 h-12 rounded-xl bg-red-900/20 border border-red-800/40 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-200 mb-1">
                Something went wrong
              </p>
              <p className="text-xs text-muted leading-relaxed">
                {this.state.error.message}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                this.setState({ error: null });
                window.location.reload();
              }}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reload
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
