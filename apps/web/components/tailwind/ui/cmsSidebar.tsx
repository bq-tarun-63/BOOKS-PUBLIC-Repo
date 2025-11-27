"use client"

import * as React from "react";
import { useState } from "react";
import { Copy, Check, X } from "lucide-react";

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div>
      <h4 className="text-sm font-semibold mb-2">{label}</h4>
      <div className="relative p-2 bg-gray-100 dark:bg-zinc-800 rounded text-sm font-mono break-all">
        {value}
        <button
          onClick={handleCopy}
          className="absolute right-2 top-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
        >
          {copied ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  );
}

interface CmsCodeSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  contentId: string;
  slug?: string;
  projectId: string;
}

export const CmsCodeSidebar: React.FC<CmsCodeSidebarProps> = ({ 
  isOpen, 
  onClose, 
  contentId, 
  slug, 
  projectId 
}) => {
  const [copied, setCopied] = useState(false);

  const getCodeSnippet = () => {
    const fetchLine = slug
      ? `  return cms.getBySlug('${slug}');`
      : `  return cms.getById('${contentId}');`;
    
    return `import { createClient } from 'page-cms';

const cms = createClient({ 
  baseUrl: 'https://books.betaque.com',
  projectId: '${projectId}'
});

export async function getContent() {
${fetchLine}
}

// Usage in React component
export default async function Page() {
  const content = await getContent();
  return (
    <div>
      {/* for text content */}
      {content?.fields?.body}

      {/* for image content */}
      <img src={content?.fields?.body} alt="CMS Image" /> 
    </div>
  );
}`;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getCodeSnippet());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
      />
      
      {/* Sidebar */}
      <div className="fixed right-0 top-0 h-full w-96 bg-white dark:bg-zinc-900 border-l border-gray-200 dark:border-zinc-700 shadow-2xl z-50 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-700 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold my-1">CMS Integration Guide</h3>
            <button
              onClick={onClose}
              className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-6">
          {/* Configuration */}
          <CopyField label="Base URL" value="https://books.betaque.com" />
          <CopyField label="Content ID" value={contentId} />
          {slug && <CopyField label="Slug" value={slug} />}
          <CopyField label="Project ID" value={projectId} />

          {/* Integration Code */}
          <div>
            <div className="flex items-center justify-between mb-2 mt-10">
              <h4 className="text-sm font-semibold m-0">Integration Code</h4>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 text-xs px-2 py-1 rounded border border-gray-200 dark:border-zinc-700 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            <pre className="p-3 bg-gray-100 dark:bg-zinc-800 rounded text-sm overflow-x-auto mt-3 text-gray-900 dark:text-gray-300 border border-gray-200 dark:border-zinc-700">
              <code>{getCodeSnippet()}</code>
            </pre>
          </div>

          {/* Instructions */}
          <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-zinc-700">
            <h4 className="text-sm font-semibold">Setup Instructions</h4>
            <ol className="space-y-3 text-sm text-gray-600 dark:text-gray-400 list-decimal list-inside">
              <li>
                Install the CMS package:{" "}
                <code className="text-xs bg-gray-100 dark:bg-zinc-800 px-2 py-1 rounded border">
                  npm install page-cms
                </code>
              </li>
              <li>Set up environment variables for baseUrl and projectId</li>
              <li>Use the code snippet above to fetch content in your application</li>
              <li>Content will be available after publishing</li>
              <li>Updates to the content will be reflected after republishing</li>
            </ol>
          </div>

          {/* API Reference */}
          <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-zinc-700">
            <h4 className="text-sm font-semibold">API Endpoints</h4>
            <div className="space-y-2">
              <div className="p-2 bg-gray-100 dark:bg-zinc-800 rounded text-xs font-mono border border-gray-200 dark:border-zinc-700">
                <span className=" font-semibold">GET</span> /api/cms/contents/{contentId}
              </div>
              <div className="p-2 bg-gray-100 dark:bg-zinc-800 rounded text-xs font-mono border border-gray-200 dark:border-zinc-700">
                <span className="font-semibold">GET</span> /api/cms/contents/by-slug/{slug}
              </div>
              <div className="p-2 bg-gray-100 dark:bg-zinc-800 rounded text-xs font-mono border border-gray-200 dark:border-zinc-700">
                <span className="font-semibold">POST</span> /api/cms/contents/{contentId}/publish
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};