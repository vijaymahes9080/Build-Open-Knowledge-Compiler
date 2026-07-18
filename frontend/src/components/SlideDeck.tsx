"use client";

import React, { useState } from "react";
import { SlideDeck as SlideDeckType } from "@/types/okc";

interface SlideDeckProps {
  slideData: {
    decks: SlideDeckType[];
  };
}

export default function SlideDeck({ slideData }: SlideDeckProps) {
  const [activeDeckIndex, setActiveDeckIndex] = useState(0);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);

  const activeDeck = slideData.decks[activeDeckIndex];
  const activeSlide = activeDeck?.slides[activeSlideIndex];

  const handleNext = () => {
    if (activeDeck && activeSlideIndex + 1 < activeDeck.slides.length) {
      setActiveSlideIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (activeSlideIndex > 0) {
      setActiveSlideIndex((prev) => prev - 1);
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#070b13] overflow-hidden select-none">
      {/* Deck Selector Header */}
      <div className="p-4 bg-[#090e18] border-b border-gray-850 flex items-center justify-between shrink-0 select-none">
        <div className="space-y-0.5">
          <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Slide Decks</h4>
          <div className="flex space-x-1">
            {slideData.decks.map((deck, idx) => (
              <button
                key={deck.id}
                onClick={() => {
                  setActiveDeckIndex(idx);
                  setActiveSlideIndex(0);
                }}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                  activeDeckIndex === idx
                    ? "bg-blue-600 text-white"
                    : "bg-slate-900 text-gray-400 border border-gray-800 hover:text-white"
                }`}
              >
                {deck.title}
              </button>
            ))}
          </div>
        </div>

        {activeDeck && (
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrev}
              disabled={activeSlideIndex === 0}
              className="bg-slate-900 border border-gray-800 text-gray-400 disabled:text-gray-700 hover:text-white px-2 py-1 rounded text-xs transition-colors cursor-pointer"
            >
              &lt; Prev
            </button>
            <span className="text-[10px] text-gray-400 font-mono">
              {activeSlideIndex + 1} / {activeDeck.slides.length}
            </span>
            <button
              onClick={handleNext}
              disabled={activeSlideIndex === activeDeck.slides.length - 1}
              className="bg-slate-900 border border-gray-800 text-gray-400 disabled:text-gray-700 hover:text-white px-2 py-1 rounded text-xs transition-colors cursor-pointer"
            >
              Next &gt;
            </button>
          </div>
        )}
      </div>

      {/* Main Slide canvas */}
      {activeSlide ? (
        <div className="flex-1 p-6 flex flex-col space-y-6 overflow-y-auto justify-between">
          <div className="flex-grow flex flex-col justify-center max-w-2xl mx-auto w-full space-y-6">
            {/* Title */}
            <h2 className="text-xl md:text-2xl font-black text-white text-center border-b border-gray-800 pb-4">
              {activeSlide.title}
            </h2>

            {/* Bullet points */}
            <div className="grid grid-cols-1 gap-3 py-4">
              {activeSlide.bullets.map((bullet, idx) => (
                <div key={idx} className="flex items-start space-x-3 text-xs leading-relaxed text-gray-300">
                  <span className="text-blue-500 mt-1 select-none">✦</span>
                  <p>{bullet}</p>
                </div>
              ))}
            </div>

            {/* Mermaid structure display */}
            {activeSlide.diagram_mermaid && (
              <div className="p-4 bg-slate-950 border border-gray-900 rounded-lg space-y-1.5 font-mono text-[9px] text-indigo-400/90 shadow-inner">
                <span className="text-[8px] text-gray-600 uppercase font-bold tracking-widest block select-none">
                  Mermaid Structure
                </span>
                <pre className="overflow-x-auto">{activeSlide.diagram_mermaid}</pre>
              </div>
            )}
          </div>

          {/* Speaker notes section */}
          {activeSlide.speaker_notes && (
            <div className="max-w-2xl mx-auto w-full border-t border-gray-850/80 pt-4 mt-8 bg-gray-900/20 p-3 rounded border border-gray-850 select-none">
              <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block mb-1">
                🗣 Speaker Notes
              </span>
              <p className="text-[10px] text-gray-400 leading-relaxed italic">
                {activeSlide.speaker_notes}
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="flex-grow flex items-center justify-center text-gray-600 text-xs italic">
          No slides compiled for this package.
        </div>
      )}
    </div>
  );
}
