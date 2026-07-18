import type { Metadata } from "next";
import "./globals.css";
import React from "react";

export const metadata: Metadata = {
  title: "Open Knowledge Compiler (OKC)",
  description: "An OS-like Interactive Learning Environment compiled locally.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-[#0b0f19] text-[#f3f4f6] min-h-screen flex flex-col antialiased">
        {/* Main Dashboard Layout */}
        <div className="flex flex-1 overflow-hidden h-screen">
          {/* Sidebar */}
          <aside className="w-64 bg-[#0d1321] border-r border-[#1e293b] flex flex-col justify-between p-5 select-none z-10 shrink-0">
            <div>
              {/* Logo */}
              <div className="flex items-center space-x-3 mb-8">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center font-bold text-white shadow-lg">
                  Ω
                </div>
                <div>
                  <h1 className="font-bold text-lg leading-none bg-gradient-to-r from-white to-[#94a3b8] bg-clip-text text-transparent">OKC Workspace</h1>
                  <span className="text-[10px] text-blue-400 font-mono">v1.0.0 (Local-First)</span>
                </div>
              </div>

              {/* Navigation Items */}
              <nav className="space-y-1">
                <a
                  href="/"
                  className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800/50 transition-colors"
                >
                  <span className="text-gray-400">⚡</span>
                  <span>Compile Center</span>
                </a>
                <a
                  href="/library"
                  className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800/50 transition-colors"
                >
                  <span className="text-gray-400">📚</span>
                  <span>Knowledge Library</span>
                </a>
              </nav>
            </div>

            {/* Bottom status panels */}
            <div className="space-y-3">
              <div className="p-3 bg-gray-900/60 rounded-lg border border-gray-800 text-[11px] text-gray-400 space-y-1">
                <div className="flex justify-between">
                  <span>Server Status:</span>
                  <span className="text-green-400 font-semibold">Online</span>
                </div>
                <div className="flex justify-between">
                  <span>AI Tutor (Ollama):</span>
                  <span className="text-blue-400 font-semibold">Connected</span>
                </div>
                <div className="flex justify-between">
                  <span>Database:</span>
                  <span className="text-purple-400 font-mono">SQLite3</span>
                </div>
              </div>
              <p className="text-[10px] text-center text-gray-500">
                Open Source & Fully Local
              </p>
            </div>
          </aside>

          {/* Primary Viewport Area */}
          <main className="flex-1 flex flex-col overflow-hidden bg-[#070b13]">
            {/* Header */}
            <header className="h-14 border-b border-[#1e293b] flex items-center justify-between px-6 bg-[#090e18]/80 backdrop-blur-md shrink-0">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-semibold text-gray-200">OS Environment</span>
                <span className="text-xs text-gray-500 font-mono">/usr/workspace</span>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-xs text-gray-400">
                  Total study time: <span className="text-blue-400 font-bold">14.2h</span>
                </div>
                <div className="text-xs text-gray-400">
                  Global Confidence: <span className="text-green-400 font-bold">85%</span>
                </div>
              </div>
            </header>
            
            {/* Content view */}
            <div className="flex-1 overflow-auto">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
