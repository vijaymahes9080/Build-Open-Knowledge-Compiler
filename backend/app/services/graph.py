import networkx as nx
import re
from typing import List, Dict, Any
from app.models.okc_schema import OKCGraph, GraphNode, GraphEdge

class SemanticGraphBuilder:
    @staticmethod
    def build_graph(chunks: List[Dict[str, Any]], extracted_topics: List[Dict[str, Any]]) -> OKCGraph:
        """
        Builds a semantic graph using NetworkX.
        - extracted_topics: list of dicts with {"title": ..., "summary": ..., "prerequisites": [...]}
        """
        G = nx.DiGraph()
        
        # 1. Add all nodes
        topic_map = {}
        for i, t in enumerate(extracted_topics):
            title = t.get("title", f"Topic {i+1}")
            node_id = re.sub(r'[^a-zA-Z0-9]', '_', title).lower()
            topic_map[title.lower()] = node_id
            
            # Default weight/importance
            G.add_node(node_id, label=title, type="topic")
            
        # 2. Add explicit prerequisite edges
        for t in extracted_topics:
            title = t.get("title", "")
            target_id = topic_map.get(title.lower())
            if not target_id:
                continue
                
            prereqs = t.get("prerequisites", [])
            for prereq in prereqs:
                source_id = topic_map.get(prereq.lower())
                if source_id and source_id != target_id:
                    G.add_edge(source_id, target_id, relation_type="prerequisite")
                    
        # 3. Add heuristic similarity edges based on content overlap (if no prerequisites are found)
        # Check text chunk co-occurrences
        for chunk in chunks:
            text = chunk["text"].lower()
            matched_nodes = []
            for t_title, node_id in topic_map.items():
                if t_title in text:
                    matched_nodes.append(node_id)
            # Add undirected-like connections for concept overlap in the same chunk
            for i in range(len(matched_nodes)):
                for j in range(i+1, len(matched_nodes)):
                    n1, n2 = matched_nodes[i], matched_nodes[j]
                    if not G.has_edge(n1, n2) and not G.has_edge(n2, n1):
                        G.add_edge(n1, n2, relation_type="related_to")

        # 4. Calculate node centrality (importance) using NetworkX PageRank
        try:
            if len(G.nodes) > 0:
                # If directed, use standard pagerank. If pagerank fails due to dangling nodes, fallback to degree centrality.
                pagerank = nx.pagerank(G, alpha=0.85)
                # Normalize values
                max_pr = max(pagerank.values()) if pagerank.values() else 1.0
                min_pr = min(pagerank.values()) if pagerank.values() else 0.0
                pr_range = max_pr - min_pr
                
                for node_id in G.nodes:
                    pr_val = pagerank[node_id]
                    # Scale between 0.2 and 1.0
                    normalized_score = 0.2 + 0.8 * ((pr_val - min_pr) / pr_range if pr_range > 0 else 0.5)
                    G.nodes[node_id]["importance"] = round(normalized_score, 2)
            else:
                pass
        except Exception as e:
            print(f"PageRank computation failed: {e}. Defaulting to degree centrality.")
            for node_id in G.nodes:
                G.nodes[node_id]["importance"] = 0.5

        # 5. Format into OKCGraph schemas
        nodes = []
        for node_id, data in G.nodes(data=True):
            nodes.append(GraphNode(
                id=node_id,
                label=data.get("label", node_id),
                type=data.get("type", "topic"),
                importance=data.get("importance", 0.5)
            ))
            
        edges = []
        for u, v, data in G.edges(data=True):
            edges.append(GraphEdge(
                source=u,
                target=v,
                relation_type=data.get("relation_type", "related_to")
            ))
            
        return OKCGraph(nodes=nodes, edges=edges)
