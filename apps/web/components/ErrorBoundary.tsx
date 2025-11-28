"use client";
import React from "react";

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-white px-6 text-center text-gray-800">
          <div>
            <p className="text-sm tracking-[0.3em] text-gray-400">PUBLIC SERVER</p>
            <h1 className="mt-2 text-4xl font-semibold">Something went wrong</h1>
            <p className="mt-3 text-gray-500">
              Please refresh the page to try again. If the issue persists, contact the site owner.
            </p>
          </div>
          <button
            type="button"
            className="rounded-md bg-black px-6 py-3 font-medium text-white"
            onClick={() => {
              this.setState({ hasError: false, error: undefined });
              window.location.reload();
            }}
          >
            Refresh page
          </button>
        </div>
      );
    }

    return this.props.children as React.ReactNode;
  }
}

export default ErrorBoundary;
