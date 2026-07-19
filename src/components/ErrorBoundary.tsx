/**
 * ErrorBoundary Component
 *
 * A React Error Boundary that wraps GenAI modules to catch and gracefully
 * handle unexpected UI breakdowns. Displays a user-friendly fallback UI
 * instead of crashing the entire dashboard.
 *
 * Must be a class component per React Error Boundary API requirements.
 */

"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

/** Props accepted by the ErrorBoundary component. */
interface ErrorBoundaryProps {
  /** Child components to wrap with error protection */
  children: ReactNode;
  /** Optional human-readable module name for error messages */
  moduleName?: string;
  /** Optional custom fallback component to render on error */
  fallback?: ReactNode;
}

/** Internal state tracking whether an error has been caught. */
interface ErrorBoundaryState {
  /** Whether an unrecoverable error has occurred */
  hasError: boolean;
  /** The captured error object, if any */
  error: Error | null;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

/**
 * Catches JavaScript errors in any child component tree, logs the error
 * details, and renders a fallback UI instead of crashing the application.
 *
 * Usage:
 * ```tsx
 * <ErrorBoundary moduleName="Crowd Management">
 *   <CrowdManagement />
 * </ErrorBoundary>
 * ```
 */
export default class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  /**
   * Derives updated state when a descendant component throws an error.
   * Called during the "render" phase — side effects are not permitted here.
   *
   * @param error — The error thrown by a descendant component.
   * @returns Updated state to trigger fallback rendering.
   */
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  /**
   * Lifecycle method invoked after an error is caught. Used for
   * logging error details to an external service or console.
   *
   * @param error — The error that was thrown.
   * @param errorInfo — Object containing the component stack trace.
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const moduleName = this.props.moduleName ?? "Unknown Module";
    console.error(
      `[StadiumSync ErrorBoundary] ${moduleName} crashed:`,
      error,
      errorInfo.componentStack
    );
  }

  /**
   * Resets the error state, allowing the user to retry rendering
   * the child component tree after a transient failure.
   */
  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      const moduleName = this.props.moduleName ?? "Module";
      const errorMessage =
        this.state.error?.message ?? "An unexpected error occurred";

      return (
        <div
          role="alert"
          aria-live="assertive"
          className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-red-500/20 rounded-2xl p-6 shadow-xl"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center text-lg">
              ⚠️
            </div>
            <div>
              <h3 className="text-lg font-bold text-red-300">
                {moduleName} Error
              </h3>
              <p className="text-xs text-slate-400">
                This module encountered an unexpected problem
              </p>
            </div>
          </div>

          <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-4 mb-4">
            <p className="text-sm text-red-300 font-mono break-all">
              {errorMessage}
            </p>
          </div>

          <button
            onClick={this.handleRetry}
            className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 text-sm font-medium rounded-lg border border-red-500/30 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 focus:ring-offset-slate-900"
            aria-label={`Retry loading ${moduleName}`}
          >
            🔄 Retry {moduleName}
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
