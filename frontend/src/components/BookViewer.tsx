"use client";

import React, { useState } from "react";
import { Chapter, GlossaryItem } from "@/types/okc";

interface BookViewerProps {
  bookData: {
    title: string;
    chapters: Chapter[];
    glossary: GlossaryItem[];
    appendices: Record<string, string>;
  };
  activeConceptId: string | null;
  onSelectConcept: (conceptId: string) => void;
}

export default function BookViewer({ bookData, activeConceptId, onSelectConcept }: BookViewerProps) {
  const [activeChapterIndex, setActiveChapterIndex] = useState(0);
  const [showGlossary, setShowGlossary] = useState(false);

  const activeChapter = bookData.chapters[activeChapterIndex];

  // Helper to format citations in Markdown text
  const renderMarkdownContent = (text: string) => {
    // Basic markdown paragraphs rendering
    return text.split("\n\n").map((para, i) => {
      if (para.startsWith("# ")) {
        return <h2 key={i} className="text-xl font-bold text-gray-100 border-b border-gray-800 pb-2 mt-6 mb-3">{para.replace("# ", "")}</h2>;
      }
      if (para.startsWith("## ")) {
        return <h3 key={i} className="text-lg font-semibold text-gray-200 mt-5 mb-2">{para.replace("## ", "")}</h3>;
      }
      if (para.startsWith("- ") || para.startsWith("* ")) {
        return (
          <ul key={i} className="list-disc pl-5 my-2 space-y-1">
            {para.split("\n").map((li, j) => (
              <li key={j} className="text-xs text-gray-300 leading-relaxed">
                {li.replace(/^[\s\-\*]+/, "")}
              </li>
            ))}
          </ul>
        );
      }
      
      return (
        <p key={i} className="text-xs text-gray-300 leading-relaxed my-3">
          {para}
        </p>
      );
    });
  };

  return (
    <div className="flex h-full bg-[#070b13] overflow-hidden">
      {/* Chapter Sidebar */}
      <div className="w-48 bg-[#090e18] border-r border-gray-850 p-4 space-y-4 shrink-0 overflow-y-auto select-none">
        <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Book Syllabus</h4>
        <nav className="space-y-1">
          {bookData.chapters.map((chap, idx) => (
            <button
              key={chap.id}
              onClick={() => {
                setActiveChapterIndex(idx);
                setShowGlossary(false);
                // Also trigger selection of topic
                onSelectConcept(`topic_${idx + 1}`);
              }}
              className={`w-full text-left text-xs px-2.5 py-2 rounded-md font-medium transition-colors cursor-pointer ${
                activeChapterIndex === idx && !showGlossary
                  ? "bg-blue-600/10 text-blue-400 border border-blue-500/20"
                  : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/40"
              }`}
            >
              Ch {chap.chapter_number}: {chap.title}
            </button>
          ))}
          
          <button
            onClick={() => setShowGlossary(true)}
            className={`w-full text-left text-xs px-2.5 py-2 rounded-md font-medium transition-colors cursor-pointer ${
              showGlossary
                ? "bg-blue-600/10 text-blue-400 border border-blue-500/20"
                : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/40"
            }`}
          >
            📖 Glossary & Terms
          </button>
        </nav>
      </div>

      {/* Chapter Content area */}
      <div className="flex-1 p-6 overflow-y-auto">
        {showGlossary ? (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white mb-1">Interactive Glossary</h2>
              <p className="text-xs text-gray-500">Core technical terminology compiled from source files.</p>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              {bookData.glossary.map((item, idx) => (
                <div key={idx} className="p-4 bg-gray-900/60 rounded-lg border border-gray-800 space-y-1">
                  <span className="text-xs font-bold text-blue-400 font-mono">{item.term}</span>
                  <p className="text-xs text-gray-300 leading-relaxed">{item.definition}</p>
                </div>
              ))}
            </div>
          </div>
        ) : activeChapter ? (
          <div className="max-w-2xl mx-auto space-y-4">
            <div className="flex justify-between items-center text-xs text-gray-500 font-mono border-b border-gray-800 pb-2">
              <span>CHAPTER {activeChapter.chapter_number}</span>
              <span>Compiled Reference</span>
            </div>
            <div className="prose prose-invert prose-sm">
              {renderMarkdownContent(activeChapter.content_markdown)}
            </div>

            {/* Citations Footer panel */}
            <div className="mt-12 pt-6 border-t border-gray-850 bg-gray-900/20 p-4 rounded-lg border border-gray-850">
              <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Sources & Citations</h4>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                Concepts in this chapter map to paragraphs in the uploaded files. 
                Use the <span className="text-indigo-400 font-bold">Concept Graph</span> to view exact prerequisite lines or click links to consult original source snippets.
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center py-20 text-gray-600 text-xs italic">
            Select a chapter from the outline sidebar to read details.
          </div>
        )}
      </div>
    </div>
  );
}
