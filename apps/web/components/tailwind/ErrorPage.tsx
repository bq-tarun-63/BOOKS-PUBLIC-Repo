import { AlertCircle, ArrowLeft, Home, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";

interface ErrorPageProps {
  title?: string;
  message?: string;
  errorCode?: number;
  errorId?: string;
  onRetry?: () => void;
  showRetry?: boolean;
}

export function ErrorPage({
  title = "Something went wrong",
  message = "An unexpected error occurred. Please try again.",
  errorCode,
  errorId,
  onRetry,
  showRetry = false,
}: ErrorPageProps) {
  const router = useRouter();

  const handleGoHome = () => {
    router.push("/notes");
  };

  const handleGoBack = () => {
    router.back();
  };

  const getErrorTitle = () => {
    if (errorCode === 404) return "Not Found";
    if (errorCode === 403) return "Access Denied";
    if (errorCode === 401) return "Unauthorized";
    if (errorCode === 500) return "Server Error";
    return title;
  };

  const getErrorMessage = () => {
    if (errorCode === 404) return "The resource you're looking for doesn't exist or may have been deleted.";
    if (errorCode === 403) return "You don't have permission to access this resource.";
    if (errorCode === 401) return "You need to log in to access this resource.";
    if (errorCode === 500) return "The server encountered an error. Please try again later.";
    return message;
  };

  return (
    <div className="min-h-[500px] w-full max-w-screen-lg border-muted  bg-background dark:bg-background  sm:rounded-lg sm:border sm:shadow-lg">
      <div className="flex flex-col items-center justify-center p-12 text-center">
        {/* Icon */}
        <div className="mb-8">
          <AlertCircle className="h-16 w-16 text-gray-400 dark:text-gray-500" />
        </div>

        {/* Error Code */}
        {errorCode && (
          <div className="mb-2">
            <span className="text-4xl font-bold text-gray-300 dark:text-gray-600">{errorCode}</span>
          </div>
        )}

        {/* Title */}
        <h1 className="mb-4 text-3xl font-semibold text-gray-900 dark:text-white">{getErrorTitle()}</h1>

        {/* Message */}
        <p className="mb-6 text-gray-600 dark:text-gray-300 max-w-md text-lg">{getErrorMessage()}</p>

        {/* Error ID if provided */}
        {errorId && <p className="mb-8 text-sm text-gray-500 dark:text-gray-400 font-mono">Error ID: {errorId}</p>}

        {/* Action Buttons */}
        <div className="flex gap-4 mt-4">
          <button
            type="button"
            onClick={handleGoBack}
            className="flex items-center gap-2 px-6 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-zinc-800 border border-gray-300 dark:border-zinc-600 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </button>

          {showRetry && onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="flex items-center gap-2 px-6 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-zinc-800 border border-gray-300 dark:border-zinc-600 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </button>
          )}

          <button
            type="button"
            onClick={handleGoHome}
            className="flex items-center gap-2 px-6 py-3 text-sm font-medium text-white bg-black dark:bg-white dark:text-black border border-black dark:border-white rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
          >
            <Home className="h-4 w-4" />
            Go to Notes
          </button>
        </div>

        {/* Additional Help Text */}
        <div className="mt-12">
          <p className="text-sm text-gray-500 dark:text-gray-400">If this problem persists, please contact support.</p>
        </div>
      </div>
    </div>
  );
}
