"use client";

import React, { useState, useEffect } from "react";
import { getLibrary } from "@/lib/api";
import Link from "next/link";

interface LibraryItem {
  id: string;
  title: string;
  description: string;
  author: string;
  filepath: string;
  created_at: string;
}

export default function KnowledgeLibrary() {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadLibrary() {
      try {
        const data = await getLibrary();
        setItems(data);
      } catch (err: any) {
        setError(err.message || "Failed to load library");
      } finally {
        setLoading(false);
      }
    }
    loadLibrary();
  }, []);

  return (
    <div className="max-w-6xl mx-auto p-8 space-y-8">
      {/* Title */}
      <div className="flex justify-between items-center border-b border-gray-800/80 pb-5">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-white">Your Compiled Knowledge Library</h2>
          <p className="text-gray-400 text-xs">
            Manage, fork, and interact with your compiled local-first learning environments.
          </p>
        </div>
        <Link
          href="/"
          className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2.5 rounded-lg transition-colors flex items-center space-x-1.5"
        >
          <span>➕</span>
          <span>Compile New Source</span>
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-500 font-mono text-xs">
          Scanning local file directory ...
        </div>
      ) : error ? (
        <div className="bg-red-950/20 border border-red-900 rounded-lg p-6 text-center space-y-2">
          <p className="text-red-400 text-sm">Failed to sync workspace database: {error}</p>
          <button onClick={() => window.location.reload()} className="bg-gray-800 hover:bg-gray-700 text-white text-xs px-3 py-1.5 rounded">
            Retry Connection
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-gray-800 rounded-xl space-y-4">
          <span className="text-4xl block">📦</span>
          <p className="text-gray-400 text-sm">No knowledge environments compiled yet.</p>
          <p className="text-xs text-gray-600 max-w-sm mx-auto">
            Upload your first textbook PDF or code repository documentation on the Compile Center tab.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => (
            <div
              key={item.id}
              className="glass-panel p-5 border-gray-800 hover:border-gray-700 transition-all flex flex-col justify-between group h-64"
            >
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-mono text-blue-400">.okc container</span>
                  <span className="text-[10px] text-gray-500">
                    {new Date(item.created_at).toLocaleDateString()}
                  </span>
                </div>
                <h3 className="font-bold text-gray-100 group-hover:text-blue-400 transition-colors line-clamp-1">
                  {item.title}
                </h3>
                <p className="text-gray-400 text-xs line-clamp-3 leading-relaxed">
                  {item.description || "Interactive Socratic courses, book guides, timelines, and simulations."}
                </p>
              </div>

              <div className="border-t border-gray-800/80 pt-4 mt-4 flex items-center justify-between">
                <span className="text-[10px] text-gray-500 font-medium">
                  By: {item.author}
                </span>
                <Link
                  href={`/workspace/${item.id}`}
                  className="bg-blue-600/10 border border-blue-500/30 hover:bg-blue-600 hover:text-white hover:border-blue-500 text-blue-400 text-xs font-bold px-3 py-1.5 rounded-md transition-all cursor-pointer"
                >
                  Open Workspace &gt;
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
