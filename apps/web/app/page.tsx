"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface PublishedNote {
  id: string;
  title: string;
  publicSlug: string;
  icon?: string;
  updatedAt: string;
}

export default function HomePage() {
  const [publishedNotes, setPublishedNotes] = useState<PublishedNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, published: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Try to fetch published notes (if we had an endpoint)
        // For now, we'll just show a welcome page
        setStats({ total: 0, published: 0 });
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl" role="img" aria-label="Book icon">
                📚
              </span>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Public Notes
              </h1>
            </div>
            <nav className="flex items-center gap-4">
              <Link
                href="/"
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
              >
                Home
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 py-16">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Welcome to Public Notes
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-8">
            Discover and read publicly shared notes and documents. Browse curated content
            from our community.
          </p>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">📄</span>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Published Notes
              </h3>
            </div>
            {loading ? (
              <p className="text-3xl font-bold text-gray-400 dark:text-gray-500">
                ...
              </p>
            ) : (
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {stats.published}
              </p>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">🌐</span>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Public Access
              </h3>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Open
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">✨</span>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Always Free
              </h3>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Free
            </p>
          </div>
        </div>

        {/* How It Works */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8 border border-gray-200 dark:border-gray-700 mb-16">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
            How It Works
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex flex-col">
              <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center mb-4">
                <span className="text-2xl">1️⃣</span>
              </div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Browse Notes
              </h4>
              <p className="text-gray-600 dark:text-gray-400">
                Explore publicly shared notes and documents from our community.
              </p>
            </div>

            <div className="flex flex-col">
              <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center mb-4">
                <span className="text-2xl">2️⃣</span>
              </div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Read Content
              </h4>
              <p className="text-gray-600 dark:text-gray-400">
                Access full content of published notes in a clean, readable format.
              </p>
            </div>

            <div className="flex flex-col">
              <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center mb-4">
                <span className="text-2xl">3️⃣</span>
              </div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Share & Discover
              </h4>
              <p className="text-gray-600 dark:text-gray-400">
                Share notes with others using public links. No account required.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Access */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-8 border border-blue-200 dark:border-blue-800">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Access a Published Note
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            If you have a public note link, you can access it directly using the slug.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                Example URL format:
              </p>
              <code className="block bg-white dark:bg-gray-800 px-4 py-2 rounded border border-gray-200 dark:border-gray-700 text-sm">
                /n/[public-slug]
              </code>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-gray-200 dark:border-gray-800 text-center">
          <p className="text-gray-600 dark:text-gray-400">
            Public Notes Server - Share knowledge, share ideas
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
            All published notes are publicly accessible and do not require authentication.
          </p>
        </footer>
      </main>
    </div>
  );
}

