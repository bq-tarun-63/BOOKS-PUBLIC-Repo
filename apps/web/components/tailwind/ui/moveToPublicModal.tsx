import { Loader2 } from "lucide-react";

interface MoveToPublicModalProps {
  isLoading: boolean;
  editorTitle: string;
  isPublicPage: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  isRestrictedPage: boolean;
  setIsRestrictedPage: (val: boolean) => void;
}

function MoveToPublicModal({
  isLoading,
  editorTitle,
  isPublicPage,
  onCancel,
  onConfirm,
  isRestrictedPage,
  setIsRestrictedPage,
}: MoveToPublicModalProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div className="bg-white dark:bg-zinc-800 p-6 rounded-lg shadow-lg w-[400px] max-w-full">
        <h2 className="mb-1 text-lg font-semibold text-gray-900 dark:text-white">Move Page</h2>
        <p className="text-sm mb-2">
          Do you want to move {editorTitle ?? "Untitled Page"} to { isPublicPage ? "Private" : "Public"}  Pages?
        </p>

        {!isPublicPage && (
            <div className="mb-4 space-y-2">
            <label className="flex items-center space-x-2">
                <input
                type="radio"
                name="access"
                value="public"
                checked={!isRestrictedPage}
                onChange={() => setIsRestrictedPage(false)}
                className="text-blue-600"
                />
                <span className="text-sm text-gray-900 dark:text-gray-200 font-medium">
                Public to Everyone
                </span>
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 ml-6">
                All users can read and write to this page.
            </p>

            <label className="flex items-center space-x-2">
                <input
                type="radio"
                name="access"
                value="restricted"
                checked={isRestrictedPage}
                onChange={() => setIsRestrictedPage(true)}
                className="text-blue-600"
                />
                <span className="text-sm text-gray-900 dark:text-gray-200 font-medium">
                Restricted
                </span>
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 ml-6">
                Only you can edit this page. Others have read-only access.
            </p>
            </div>
        )}
        

        <div className="flex justify-end gap-2">
          <button
            className="px-3 py-1 text-sm rounded bg-gray-200 dark:bg-zinc-700 text-gray-800 dark:text-white"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            className="px-3 py-1 text-sm rounded bg-blue-600 text-white flex items-center justify-center min-w-[60px] disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Move"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default MoveToPublicModal