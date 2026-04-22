"use client";

import { useState, useEffect } from "react";
import { Check, Copy } from "lucide-react";

export function CopyLink({ slug }: { slug: string }) {
  const [hasMounted, setHasMounted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setHasMounted(true);
    setOrigin(window.location.origin);
  }, []);

  const handleCopy = () => {
    const link = `${origin}/b/${slug}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!hasMounted) {
    return (
      <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-100 animate-pulse">
        <div className="h-4 bg-slate-200 rounded w-full"></div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-100">
      <code className="text-xs font-mono text-indigo-600 flex-1 break-all">
        {origin}/b/{slug}
      </code>
      <button 
        className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 p-1 rounded hover:bg-indigo-50 transition-colors"
        onClick={handleCopy}
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </button>
    </div>
  );
}
