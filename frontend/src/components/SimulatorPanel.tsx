"use client";

import React, { useState } from "react";
import { Simulation } from "@/types/okc";

interface SimulatorPanelProps {
  simulationData: {
    simulations: Simulation[];
  };
}

export default function SimulatorPanel({ simulationData }: SimulatorPanelProps) {
  const [activeSimIndex, setActiveSimIndex] = useState(0);
  const [reloadKey, setReloadKey] = useState(0); // Quick state trigger to reload iframe

  const activeSim = simulationData.simulations[activeSimIndex];

  const handleReload = () => {
    setReloadKey((prev) => prev + 1);
  };

  return (
    <div className="h-full flex flex-col bg-[#070b13] overflow-hidden">
      {/* Simulation Selector Bar */}
      <div className="p-4 bg-[#090e18] border-b border-gray-850 flex items-center justify-between shrink-0 select-none">
        <div className="space-y-0.5">
          <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Dynamic Simulators</h4>
          <div className="flex space-x-1">
            {simulationData.simulations.map((sim, idx) => (
              <button
                key={sim.id}
                onClick={() => {
                  setActiveSimIndex(idx);
                  setReloadKey(0);
                }}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                  activeSimIndex === idx
                    ? "bg-blue-600 text-white"
                    : "bg-slate-900 text-gray-400 border border-gray-800 hover:text-white"
                }`}
              >
                {sim.title}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleReload}
          className="bg-gray-800 hover:bg-gray-700 text-[10px] text-gray-300 px-2 py-1 rounded border border-gray-700 transition-colors cursor-pointer"
        >
          🔄 Restart Simulation
        </button>
      </div>

      {/* Main Sandbox iFrame Viewport */}
      {activeSim ? (
        <div className="flex-1 flex flex-col p-4 space-y-4">
          <div className="space-y-1 select-none">
            <h3 className="text-sm font-bold text-gray-200">{activeSim.title}</h3>
            <p className="text-[11px] text-gray-400 leading-relaxed">{activeSim.description}</p>
          </div>

          <div className="flex-1 rounded-xl overflow-hidden border border-gray-800 bg-[#0b0f19] relative min-h-[350px]">
            <iframe
              key={reloadKey}
              srcDoc={activeSim.html_content}
              title={activeSim.title}
              className="w-full h-full border-none absolute inset-0 bg-[#0b0f19]"
              sandbox="allow-scripts"
            />
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-gray-500 text-xs italic">
          No simulator objects compiled for this package.
        </div>
      )}
    </div>
  );
}
