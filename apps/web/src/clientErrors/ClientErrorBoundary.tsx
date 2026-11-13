import { Component, type ErrorInfo, type ReactNode } from "react";
import { ClientErrorKind } from "@aegis/shared/clientErrors/ClientErrorKind";
import { ClientErrorFallback } from "@/clientErrors/ClientErrorFallback";
import { clientErrorReporter } from "@/clientErrors/clientErrorReporter";
import { isChunkLoadError } from "@/clientErrors/isChunkLoadError";
import { RenderCrashContext, type RenderCrash } from "@/clientErrors/RenderCrashContext";

type ClientErrorBoundaryProps = {
  children: ReactNode;
  fallback?: ReactNode;
};

type ClientErrorBoundaryState = {
  failed: boolean;
  loadFailed: boolean;
};

export class ClientErrorBoundary extends Component<ClientErrorBoundaryProps, ClientErrorBoundaryState> {
  override state: ClientErrorBoundaryState = { failed: false, loadFailed: false };

  private readonly renderCrash: RenderCrash = { crashed: false };

  static getDerivedStateFromError(error: unknown): ClientErrorBoundaryState {
    return { failed: true, loadFailed: isChunkLoadError(error) };
  }

  override componentDidCatch(error: unknown, info: ErrorInfo) {
    this.renderCrash.crashed = true;
    clientErrorReporter.capture({
      kind: ClientErrorKind.RENDER.value,
      error,
      componentStack: info.componentStack ?? undefined,
    });
  }

  override render() {
    if (!this.state.failed) {
      return <RenderCrashContext.Provider value={this.renderCrash}>{this.props.children}</RenderCrashContext.Provider>;
    }
    if (this.props.fallback !== undefined) {
      return this.props.fallback;
    }
    return <ClientErrorFallback loadFailed={this.state.loadFailed} />;
  }
}
