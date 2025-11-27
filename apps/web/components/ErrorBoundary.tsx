"use client";
import React from "react";
import { ErrorPage } from "./tailwind/ErrorPage";

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
        <ErrorPage
          title="Application Error"
          message="Something went wrong in the application. Please refresh the page or try again."
          showRetry={true}
          onRetry={() => {
            this.setState({ hasError: false, error: undefined });
            window.location.reload();
          }}
        />
      ) as React.ReactNode;
    }

    return this.props.children as React.ReactNode;
  }
}

export default ErrorBoundary;
