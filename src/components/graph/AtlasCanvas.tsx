"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { AtlasNodeData, FileNodeData } from "@/types";
import { useAtlas } from "@/store";
import { ensureHeuristic, requestAi } from "@/lib/explain/client";
import { playSfx } from "@/lib/audio/sfx";
import { ROLE_STYLES } from "./roleStyles";
import { FileNode } from "./FileNode";
import { FolderNode } from "./FolderNode";
import { SkillEdge } from "./SkillEdge";
import { NodeTooltip } from "./NodeTooltip";

const nodeTypes = { file: FileNode, folder: FolderNode };
const edgeTypes = { skill: SkillEdge };

function Flow() {
  const storeNodes = useAtlas((s) => s.nodes);
  const storeEdges = useAtlas((s) => s.edges);
  const hover = useAtlas((s) => s.hover);
  const select = useAtlas((s) => s.select);
  const toggleExpand = useAtlas((s) => s.toggleExpand);

  const { fitView } = useReactFlow();
  const [nodes, setNodes, onNodesChange] = useNodesState(storeNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(storeEdges);
  const firstSeed = useRef(true);

  // Re-seed when the visible graph changes (load, expand, collapse) and gently
  // refit so the tree stays framed as it grows/shrinks.
  useEffect(() => {
    setNodes(storeNodes);
    if (firstSeed.current) {
      firstSeed.current = false;
      return;
    }
    const t = setTimeout(
      () => fitView({ duration: 600, padding: 0.22, maxZoom: 1.05 }),
      80,
    );
    return () => clearTimeout(t);
  }, [storeNodes, setNodes, fitView]);
  useEffect(() => {
    setEdges(storeEdges);
  }, [storeEdges, setEdges]);

  const onNodeEnter = useCallback(
    (_: React.MouseEvent, node: Node<AtlasNodeData>) => {
      const key = node.data.path;
      hover(key);
      ensureHeuristic(key);
      playSfx("hover");
    },
    [hover],
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node<AtlasNodeData>) => {
      const key = node.data.path;
      select(key);
      ensureHeuristic(key);
      if (node.data.kind === "folder") {
        const willOpen = !node.data.expanded;
        toggleExpand(key);
        playSfx(willOpen ? "open" : "back");
        if (willOpen) void requestAi(key);
      } else {
        void requestAi(key);
        playSfx("click");
      }
    },
    [select, toggleExpand],
  );

  return (
    <>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodeMouseEnter={onNodeEnter}
        onNodeMouseLeave={() => hover(null)}
        onNodeClick={onNodeClick}
        onPaneClick={() => select(null)}
        fitView
        fitViewOptions={{ padding: 0.2, maxZoom: 1.05, minZoom: 0.2 }}
        minZoom={0.05}
        maxZoom={2.2}
        proOptions={{ hideAttribution: true }}
        className="!bg-transparent"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={26}
          size={1.5}
          color="rgba(255,255,255,0.35)"
        />
        <Controls
          showInteractive={false}
          className="!bottom-6 !left-6"
        />
        <MiniMap
          pannable
          zoomable
          maskColor="rgba(6,42,107,0.35)"
          className="!bottom-6 !right-24 !bg-white/30"
          nodeColor={(n) => {
            const d = n.data as AtlasNodeData;
            if (d.kind === "folder") return "rgba(127,240,230,0.5)";
            return ROLE_STYLES[(d as FileNodeData).role].glow;
          }}
        />
      </ReactFlow>
      <NodeTooltip nodes={nodes} />
    </>
  );
}

export function AtlasCanvas() {
  return (
    <ReactFlowProvider>
      <Flow />
    </ReactFlowProvider>
  );
}
