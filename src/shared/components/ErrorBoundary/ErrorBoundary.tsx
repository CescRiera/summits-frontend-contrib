import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import styles from "./ErrorBoundary.module.css";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
  retryTimeout: NodeJS.Timeout | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      retryTimeout: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Enhanced error capture - ensure we capture the error message even if it's a minified React error
    const errorMessage =
      error?.message || error?.toString() || String(error) || "Unknown error";

    // If it's a minified React error, try to extract more info
    if (
      errorMessage.includes("Minified React error") ||
      errorMessage.includes("#300")
    ) {
      console.error(
        "[ErrorBoundary] React error #300 detected - this usually means hooks are called in wrong order or component structure changed"
      );
    }

    return {
      hasError: true,
      error: error instanceof Error ? error : new Error(errorMessage),
    };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Enhanced error logging to capture all error details
    const errorDetails = {
      message: error?.message || String(error),
      name: error?.name || "Unknown",
      stack: error?.stack || "No stack trace",
      toString: error?.toString?.() || String(error),
      // Try to get React error code if it's a minified error
      ...(error as any),
    };

    console.error("[ErrorBoundary] Caught an error:", errorDetails);
    console.error("[ErrorBoundary] Error object:", error);
    console.error("[ErrorBoundary] Error type:", typeof error);
    console.error("[ErrorBoundary] Error keys:", Object.keys(error || {}));
    console.error("[ErrorBoundary] Error stack:", error?.stack);
    console.error("[ErrorBoundary] Component stack:", errorInfo.componentStack);

    // Use functional setState to access current retryCount
    this.setState((prevState) => {
      // Clear any existing retry timeout
      if (prevState.retryTimeout) {
        clearTimeout(prevState.retryTimeout);
      }

      const currentRetryCount = prevState.retryCount;

      // Attempt automatic recovery with exponential backoff
      // Only retry up to 3 times to avoid infinite loops
      if (currentRetryCount < 3) {
        const retryDelay = Math.min(
          1000 * Math.pow(2, currentRetryCount),
          10000
        ); // Max 10 seconds

        const timeout = setTimeout(() => {
          this.setState((prevState) => ({
            hasError: false,
            error: null,
            errorInfo: null,
            retryCount: prevState.retryCount + 1,
            retryTimeout: null,
          }));
        }, retryDelay);

        return {
          error,
          errorInfo,
          retryTimeout: timeout,
        };
      } else {
        console.error(
          "[ErrorBoundary] Maximum retry attempts reached. Manual reload required."
        );
        return {
          error,
          errorInfo,
          retryTimeout: null,
        };
      }
    });
  }

  override componentWillUnmount() {
    // Clear any pending retry timeout
    if (this.state.retryTimeout) {
      clearTimeout(this.state.retryTimeout);
    }
  }

  handleGoHome = () => {
    // Clear any pending retry timeout
    if (this.state.retryTimeout) {
      clearTimeout(this.state.retryTimeout);
    }
    // Reset error state and navigate home
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      retryTimeout: null,
    });
    window.location.href = "/";
  };

  override render() {
    if (this.state.hasError) {
      const { error } = this.state;
      const errorMessage = error?.message || "An unexpected error occurred";
      // Extract a short error code if available (first line of stack or error code)
      const errorCode =
        error?.stack?.split("\n")[0]?.substring(0, 100) ||
        errorMessage.substring(0, 100);

      return (
        <div className={styles["error-boundary"]}>
          <div className={styles["error-boundary__container"]}>
            <h1 className={`${styles["error-boundary__title"]} typography-display-medium`}>
              This page is not working
            </h1>
            <p className={`${styles["error-boundary__main-message"]} typography-body-large`}>
              There is an error with {errorMessage}. Please try again or go
              home.
            </p>
            {errorCode && (
              <div className={styles["error-boundary__code-snippet"]}>
                <pre className={`${styles["error-boundary__code"]} typography-body-small`}>
                  {errorCode}
                </pre>
              </div>
            )}
            <button
              className={`${styles["error-boundary__button"]} typography-button-large`}
              onClick={this.handleGoHome}
            >
              Go Home
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
