"use client";

import React, { useState, useEffect } from "react";
import { compileFile, getCompileStatus } from "@/lib/api";
import { useRouter } from "next/navigation";

export default function CompileCenter() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("Open Knowledge Compiler");
  const [loading, setLoading] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");
  const [logs, setLogs] = useState<string[]>([]);

  // Drag and drop states
  const [isDragActive, setIsDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      if (!title) {
        // Auto populate title with filename minus extension
        const name = e.dataTransfer.files[0].name.replace(/\.[^/.]+$/, "");
        setTitle(name.split("-").join(" ").split("_").join(" "));
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      if (!title) {
        const name = e.target.files[0].name.replace(/\.[^/.]+$/, "");
        setTitle(name.split("-").join(" ").split("_").join(" "));
      }
    }
  };

  const handleCompile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file && !url) {
      alert("Please upload a file or supply a web URL.");
      return;
    }
    if (!title.trim()) {
      alert("Please input a knowledge package title.");
      return;
    }

    setLoading(true);
    setLogs(["Initializing universal compile pipeline..."]);
    setStatus("queued");

    try {
      let activeFile = file;
      if (!activeFile && url) {
        // If they provided a URL, create a mock empty text file to trigger the parser URL handler
        activeFile = new File([url], "url_source.txt", { type: "text/plain" });
      }

      if (activeFile) {
        const response = await compileFile(activeFile, title, author);
        setJobId(response.job_id);
        setStatus("processing");
        setLogs(prev => [...prev, "File upload complete. Background compile job queued.", `Job ID: ${response.job_id}`]);
      }
    } catch (err: any) {
      setStatus("failed");
      setLogs(prev => [...prev, `Compilation trigger failed: ${err.message}`]);
      setLoading(false);
    }
  };

  // Poll job status
  useEffect(() => {
    if (!jobId || status === "completed" || status.startsWith("failed")) return;

    const interval = setInterval(async () => {
      try {
        const data = await getCompileStatus(jobId);
        setStatus(data.status);
        
        if (data.status === "processing") {
          setLogs(prev => {
            if (prev.includes("Compiler processing text chunks and building graph...")) return prev;
            return [...prev, "Compiler processing text chunks and building graph..."];
          });
        } else if (data.status === "completed") {
          setLogs(prev => [...prev, "Compilation complete! Packaging objects into .okc container...", "Redirecting to active workspace..."]);
          clearInterval(interval);
          setLoading(false);
          // Redirect to library after short delay to let user see success logs
          setTimeout(() => {
            router.push("/library");
          }, 1500);
        } else if (data.status.startsWith("failed")) {
          setStatus("failed");
          setLogs(prev => [...prev, `Compiler failed: ${data.status}`]);
          clearInterval(interval);
          setLoading(false);
        }
      } catch (err: any) {
        clearInterval(interval);
        setLoading(false);
        setStatus("failed");
        setLogs(prev => [...prev, `Error checking compilation status: ${err.message}`]);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [jobId, status, router]);

  return (
    <div className="max-w-4xl mx-auto p-8 space-y-8">
      {/* Introduction banner */}
      <div className="space-y-2">
        <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-blue-200 to-indigo-400 bg-clip-text text-transparent">
          Compile Knowledge Into Interactive Environments
        </h2>
        <p className="text-gray-400 text-sm max-w-2xl">
          Upload any text documentation, textbook PDF, or supply website links. 
          Our compiler converts your files into full markdown textbook chapters, slide presentations, 
          spaced repetition flashcard decks, and canvas physics simulators.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Input Settings Forms */}
        <form onSubmit={handleCompile} className="md:col-span-2 space-y-6 glass-panel p-6 border-gray-800">
          <h3 className="font-bold text-lg text-gray-200">Compile Configurations</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Knowledge Package Title
              </label>
              <input
                type="text"
                placeholder="e.g. Operating Systems Kernel Design"
                className="w-full bg-slate-950 border border-gray-800 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Compiler / Author Name
              </label>
              <input
                type="text"
                placeholder="e.g. Prof. Alan Turing"
                className="w-full bg-slate-950 border border-gray-800 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                disabled={loading}
              />
            </div>

            {/* Input Selection Tabs (File / URL) */}
            <div className="border-t border-gray-800/80 pt-4">
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Source Document Upload
              </label>
              
              {!url && (
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
                    isDragActive
                      ? "border-blue-500 bg-blue-950/20"
                      : "border-gray-800 hover:border-gray-700 bg-slate-950/40"
                  }`}
                >
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    onChange={handleFileChange}
                    accept=".pdf,.docx,.doc,.txt,.md,.markdown,.html,.htm"
                    disabled={loading}
                  />
                  <label htmlFor="file-upload" className="cursor-pointer space-y-3 block">
                    <span className="text-3xl block">📁</span>
                    <span className="text-sm font-medium text-gray-300 block">
                      {file ? file.name : "Drag & drop PDF, Word, or Text files here"}
                    </span>
                    <span className="text-xs text-gray-500 block">
                      or click to browse local storage
                    </span>
                  </label>
                </div>
              )}

              {!file && (
                <div className="mt-4">
                  <label className="block text-xs text-gray-400 mb-1">
                    Or Parse Web Links / YouTube URLs
                  </label>
                  <input
                    type="text"
                    placeholder="https://en.wikipedia.org/wiki/Operating_system"
                    className="w-full bg-slate-950 border border-gray-800 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    value={url}
                    onChange={(e) => {
                      setUrl(e.target.value);
                      if (e.target.value && !title) {
                        setTitle("Web Knowledge Compile");
                      }
                    }}
                    disabled={loading}
                  />
                </div>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || (!file && !url)}
            className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:from-gray-800 disabled:to-gray-800 disabled:text-gray-500 font-bold text-white transition-all shadow-lg text-sm select-none cursor-pointer"
          >
            {loading ? "Compiling environment..." : "Execute Knowledge Compilation"}
          </button>
        </form>

        {/* Compiler Status Output */}
        <div className="glass-panel p-6 border-gray-800 flex flex-col justify-between h-[420px]">
          <div>
            <h3 className="font-bold text-lg text-gray-200 mb-4 flex items-center justify-between">
              <span>Compiler Logs</span>
              {status && (
                <span className={`text-xs px-2 py-0.5 rounded font-mono uppercase ${
                  status === "completed" ? "bg-green-950 text-green-400" :
                  status.startsWith("failed") ? "bg-red-950 text-red-400" :
                  "bg-blue-950 text-blue-400 animate-pulse"
                }`}>
                  {status}
                </span>
              )}
            </h3>

            <div className="bg-slate-950 rounded-lg p-4 font-mono text-xs text-blue-300 h-64 overflow-y-auto space-y-2 border border-gray-900">
              {logs.length === 0 ? (
                <p className="text-gray-600 italic">No compile logs yet. Waiting for input execution...</p>
              ) : (
                logs.map((log, index) => (
                  <p key={index} className={log.startsWith("Error") ? "text-red-400" : log.startsWith("Compile") ? "text-green-400" : ""}>
                    &gt; {log}
                  </p>
                ))
              )}
            </div>
          </div>

          {status === "completed" && (
            <div className="text-center text-xs text-green-400 bg-green-950/20 py-2 border border-green-900 rounded">
              Package successfully indexed! Loading...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
