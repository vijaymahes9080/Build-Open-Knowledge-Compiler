"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { getPackage } from "@/lib/api";
import { OKCPackageData, Topic } from "@/types/okc";

import BookViewer from "@/components/BookViewer";
import KnowledgeGraph from "@/components/KnowledgeGraph";
import TutorPanel from "@/components/TutorPanel";
import SimulatorPanel from "@/components/SimulatorPanel";
import QuizWidget from "@/components/QuizWidget";
import SlideDeck from "@/components/SlideDeck";
import PodcastPanel from "@/components/PodcastPanel";

type LeftTab = "book" | "slides" | "quiz" | "simulator";
type RightTab = "graph" | "tutor" | "timeline" | "podcast";

export default function WorkspaceClient() {
  const { id } = useParams() as { id: string };
  const [data, setData] = useState<OKCPackageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Layout Tab selection
  const [leftTab, setLeftTab] = useState<LeftTab>("book");
  const [rightTab, setRightTab] = useState<RightTab>("graph");

  // Panel resizing states
  const [splitWidth, setSplitWidth] = useState(50); // percentage for left panel

  // Shared coordination state
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [activeConceptId, setActiveConceptId] = useState<string | null>(null);

  useEffect(() => {
    async function loadPackage() {
      try {
        const packageData = await getPackage(id);
        setData(packageData);
        if (packageData.knowledge.topics.length > 0) {
          setSelectedTopic(packageData.knowledge.topics[0]);
          setActiveConceptId(packageData.knowledge.topics[0].id);
        }
      } catch (err: any) {
        setError(err.message || "Failed to unpack OKC package");
      } finally {
        setLoading(false);
      }
    }
    loadPackage();
  }, [id]);

  // Direct trigger when graph node or section is clicked
  const handleSelectConcept = (conceptId: string) => {
    setActiveConceptId(conceptId);
    if (data) {
      // Find matching topic in knowledge tree
      const matched = data.knowledge.topics.find(
        (t) => t.id.toLowerCase() === conceptId.toLowerCase()
      );
      if (matched) {
        setSelectedTopic(matched);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center space-y-3">
        <span className="text-3xl animate-spin text-blue-500">⚛</span>
        <div className="font-mono text-xs text-gray-500">Unzipping OKC Container assets...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-4">
        <p className="text-red-400 text-sm">Failed to open container workspace: {error}</p>
        <a href="/library" className="bg-gray-800 hover:bg-gray-700 text-white text-xs px-4 py-2 rounded">
          Back to Library
        </a>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden h-full">
      {/* Dynamic Sub-header */}
      <div className="h-10 bg-slate-900 border-b border-gray-800 flex items-center justify-between px-6 shrink-0 select-none">
        <div className="flex items-center space-x-3">
          <span className="text-xs font-bold text-gray-300 font-mono">📦 {data.metadata.title}</span>
          <span className="text-[10px] bg-slate-800 text-gray-400 px-1.5 py-0.5 rounded border border-gray-700">OKC Core Package</span>
        </div>
        <div className="flex items-center space-x-3 text-[10px] text-gray-400">
          <span>Author: {data.metadata.author}</span>
          <span>•</span>
          <span>Concepts: {data.knowledge.topics.length}</span>
        </div>
      </div>

      {/* Main Split Window Pane */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT COLUMN: Study Materials */}
        <div 
          className="flex flex-col border-r border-[#1e293b] overflow-hidden"
          style={{ width: `${splitWidth}%` }}
        >
          {/* Tab selectors */}
          <div className="h-10 bg-slate-950 border-b border-gray-800 flex items-center px-4 space-x-1 shrink-0 select-none">
            {(["book", "slides", "quiz", "simulator"] as LeftTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setLeftTab(tab)}
                className={`text-xs px-3 py-1.5 rounded-md font-semibold capitalize cursor-pointer transition-colors ${
                  leftTab === tab
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-gray-400 hover:text-gray-200 hover:bg-gray-900"
                }`}
              >
                {tab === "simulator" ? "🎨 Lab Simulator" : tab}
              </button>
            ))}
          </div>

          {/* Active view rendering */}
          <div className="flex-1 overflow-auto bg-slate-950/20">
            {leftTab === "book" && (
              <BookViewer 
                bookData={data.book} 
                activeConceptId={activeConceptId}
                onSelectConcept={handleSelectConcept}
              />
            )}
            {leftTab === "slides" && (
              <SlideDeck slideData={data.slides} />
            )}
            {leftTab === "quiz" && (
              <QuizWidget 
                packageId={data.metadata.id} 
                quizData={data.quiz} 
                revisionData={data.revision}
              />
            )}
            {leftTab === "simulator" && (
              <SimulatorPanel simulationData={data.simulation} />
            )}
          </div>
        </div>

        {/* DRAG DIVIDER */}
        <div 
          className="w-1 bg-[#1e293b] hover:bg-blue-500 cursor-col-resize transition-colors select-none shrink-0"
          onMouseDown={(e) => {
            const startX = e.clientX;
            const startWidth = splitWidth;
            const doDrag = (moveEvent: MouseEvent) => {
              const deltaX = moveEvent.clientX - startX;
              const deltaPercent = (deltaX / window.innerWidth) * 100;
              const newWidth = Math.max(20, Math.min(80, startWidth + deltaPercent));
              setSplitWidth(newWidth);
            };
            const stopDrag = () => {
              document.removeEventListener("mousemove", doDrag);
              document.removeEventListener("mouseup", stopDrag);
            };
            document.addEventListener("mousemove", doDrag);
            document.addEventListener("mouseup", stopDrag);
          }}
        />

        {/* RIGHT COLUMN: Exploration Workspace */}
        <div 
          className="flex flex-col overflow-hidden"
          style={{ width: `${100 - splitWidth}%` }}
        >
          {/* Tab selectors */}
          <div className="h-10 bg-slate-950 border-b border-gray-800 flex items-center px-4 space-x-1 shrink-0 select-none">
            {(["graph", "tutor", "timeline", "podcast"] as RightTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setRightTab(tab)}
                className={`text-xs px-3 py-1.5 rounded-md font-semibold capitalize cursor-pointer transition-colors ${
                  rightTab === tab
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-gray-400 hover:text-gray-200 hover:bg-gray-900"
                }`}
              >
                {tab === "graph" ? "🕸 Concept Graph" : tab === "tutor" ? "🤖 AI Tutor Guide" : tab === "timeline" ? "⏳ Event Timeline" : "🎙️ AI Podcast"}
              </button>
            ))}
          </div>

          {/* Active view rendering */}
          <div className="flex-1 overflow-auto bg-slate-950/20">
            {rightTab === "graph" && (
              <KnowledgeGraph 
                graphData={data.graph} 
                activeConceptId={activeConceptId}
                onSelectConcept={handleSelectConcept}
              />
            )}
            {rightTab === "tutor" && (
              <TutorPanel 
                packageId={data.metadata.id}
                selectedTopic={selectedTopic}
              />
            )}
            {rightTab === "podcast" && (
              <PodcastPanel packageData={data} />
            )}
            {rightTab === "timeline" && (
              <div className="p-6 space-y-6">
                <h3 className="font-bold text-gray-200 text-sm">Chronological Milestones</h3>
                <div className="relative border-l border-gray-800 pl-4 ml-2 space-y-6">
                  {data.timeline.events.map((event) => (
                    <div key={event.id} className="relative group">
                      <div className="absolute -left-[21px] mt-1.5 h-3.5 w-3.5 rounded-full bg-slate-950 border-2 border-indigo-500 group-hover:bg-indigo-500 transition-colors" />
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-indigo-400 font-mono">{event.date}</span>
                        <h4 className="text-sm font-bold text-gray-200">{event.title}</h4>
                        <p className="text-xs text-gray-400 leading-relaxed">{event.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}



