"use client";

import React, { useEffect, useMemo } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  MarkerType,
} from "reactflow";
import "reactflow/dist/style.css";
import { OKCGraph } from "@/types/okc";

interface KnowledgeGraphProps {
  graphData: OKCGraph;
  activeConceptId: string | null;
  onSelectConcept: (conceptId: string) => void;
}

export default function KnowledgeGraph({
  graphData,
  activeConceptId,
  onSelectConcept,
}: KnowledgeGraphProps) {
  
  // Format graph data into React Flow compatible node and edge structures
  const { nodes, edges } = useMemo(() => {
    // Lay out nodes sequentially in a grid layout to avoid dagre layout library overhead
    const flowNodes: Node[] = graphData.nodes.map((node, index) => {
      const isSelected = activeConceptId?.toLowerCase() === node.id.toLowerCase();
      
      return {
        id: node.id,
        type: "default",
        data: {
          label: (
            <div className="text-center space-y-1">
              <div className="font-bold text-xs text-white">{node.label}</div>
              <div className="text-[9px] text-blue-400 font-mono">
                Centrality: {Math.round(node.importance * 100)}%
              </div>
            </div>
          ),
        },
        position: {
          x: 100 + (index % 3) * 260,
          y: 80 + Math.floor(index / 3) * 160,
        },
        style: {
          background: isSelected ? "rgba(59, 130, 246, 0.15)" : "#0f172a",
          border: isSelected ? "2px solid #3b82f6" : "1px solid #1e293b",
          boxShadow: isSelected ? "0 0 15px rgba(59, 130, 246, 0.5)" : "none",
          borderRadius: "8px",
          width: 180,
          cursor: "pointer",
        },
      };
    });

    const flowEdges: Edge[] = graphData.edges.map((edge, index) => {
      const isPrereq = edge.relation_type === "prerequisite";
      return {
        id: `edge_${index}`,
        source: edge.source,
        target: edge.target,
        animated: isPrereq,
        style: {
          stroke: isPrereq ? "#6366f1" : "#4b5563",
          strokeWidth: 2,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isPrereq ? "#6366f1" : "#4b5563",
        },
      };
    });

    return { nodes: flowNodes, edges: flowEdges };
  }, [graphData, activeConceptId]);

  const onNodeClick = (event: React.MouseEvent, node: Node) => {
    onSelectConcept(node.id);
  };

  return (
    <div className="h-full w-full bg-[#090d16] flex flex-col relative select-none">
      {/* Legend overlay */}
      <div className="absolute top-3 right-3 bg-slate-950/80 border border-gray-800 p-2.5 rounded-lg text-[9px] text-gray-400 space-y-1.5 z-10 pointer-events-none">
        <div className="font-bold text-gray-300">Edge Legend</div>
        <div className="flex items-center space-x-1.5">
          <span className="h-0.5 w-4 bg-indigo-500 block animate-pulse" />
          <span>Prerequisite Link</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="h-0.5 w-4 bg-gray-500 block" />
          <span>Semantic Relation</span>
        </div>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodeClick={onNodeClick}
        fitView
        attributionPosition="bottom-left"
      >
        <Background color="#1e293b" gap={16} size={1} />
        <Controls />
        <MiniMap 
          nodeColor={() => "#3b82f6"} 
          maskColor="rgba(15, 23, 42, 0.6)"
        />
      </ReactFlow>
    </div>
  );
}
