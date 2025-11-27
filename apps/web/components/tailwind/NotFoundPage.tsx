import { ArrowLeft, FileX, Home } from "lucide-react";
import { useRouter } from "next/navigation";

interface NotFoundPageProps {
  noteId?: string;
  message?: string;
}

export function NotFoundPage({ noteId, message }: NotFoundPageProps) {
  const router = useRouter();

  const handleGoHome = () => {
    router.push("/notes");
  };

  const handleGoBack = () => {
    router.back();
  };

  return (
    <div className="min-h-[500px] w-full max-w-screen-lg border-muted  bg-background dark:bg-background  sm:rounded-lg sm:border sm:shadow-lg">
      <div className="flex flex-col items-center justify-center p-12 text-center">
        {/* Icon */}
        <div className="mb-8">
          <FileX className="h-16 w-16 text-gray-400 dark:text-gray-500" />
        </div>

        {/* Title */}
        <h1 className="mb-4 text-3xl font-semibold text-gray-900 dark:text-white">Note Not Found</h1>

        {/* Message */}
        <p className="mb-6 text-gray-600 dark:text-gray-300 max-w-md text-lg">
          {message || "The note you're looking for doesn't exist or may have been deleted."}
        </p>

        {/* Note ID if provided */}
        {noteId && <p className="mb-8 text-sm text-gray-500 dark:text-gray-400 font-mono">Note ID: {noteId}</p>}

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
          <p className="text-sm text-gray-500 dark:text-gray-400">
            If you believe this is an error, please check the URL or contact support.
          </p>
        </div>
      </div>
    </div>
  );
}
