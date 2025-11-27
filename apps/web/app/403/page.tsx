export default function ForbiddenPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-gray-900">
      <h1 className="text-6xl font-bold text-red-600 mb-4">403</h1>
      <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-2">Access Denied</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-6">You don’t have permission to access this page.</p>
      <a href="/" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition">
        Go back home
      </a>
    </div>
  );
}
