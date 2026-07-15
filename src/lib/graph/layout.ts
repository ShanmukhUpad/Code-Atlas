import dagre from "@dagrejs/dagre";

export const NODE_W = 152;
export const NODE_H = 104;

export interface Pos {
  x: number;
  y: number;
}

/**
 * Layered "skill tree" layout. Edges are directed dependency → dependent so
 * foundational modules sit near the top (roots) and consumers cascade below,
 * like a JRPG progression tree.
 */
export function layoutFiles(
  filePaths: string[],
  edges: Array<{ from: string; to: string }>,
): Map<string, Pos> {
  const g = new dagre.graphlib.Graph();
  g.setGraph({
    rankdir: "TB",
    nodesep: 46,
    ranksep: 96,
    marginx: 80,
    marginy: 80,
    ranker: "network-simplex",
  });
  g.setDefaultEdgeLabel(() => ({}));

  for (const p of filePaths) g.setNode(p, { width: NODE_W, height: NODE_H });
  for (const e of edges) {
    if (g.hasNode(e.from) && g.hasNode(e.to)) g.setEdge(e.from, e.to);
  }

  dagre.layout(g);

  const positions = new Map<string, Pos>();
  for (const p of filePaths) {
    const n = g.node(p);
    // dagre gives centers; convert to top-left for React Flow.
    positions.set(p, { x: n.x - NODE_W / 2, y: n.y - NODE_H / 2 });
  }
  return positions;
}

export interface LayoutNode {
  id: string;
  width: number;
  height: number;
}

/** General layered layout for mixed-size nodes (folders + files). */
export function layoutTree(
  nodes: LayoutNode[],
  edges: Array<{ from: string; to: string }>,
): Map<string, Pos> {
  const g = new dagre.graphlib.Graph();
  g.setGraph({
    rankdir: "TB",
    nodesep: 40,
    ranksep: 90,
    marginx: 90,
    marginy: 90,
    ranker: "tight-tree",
  });
  g.setDefaultEdgeLabel(() => ({}));

  for (const n of nodes) g.setNode(n.id, { width: n.width, height: n.height });
  for (const e of edges) {
    if (g.hasNode(e.from) && g.hasNode(e.to)) g.setEdge(e.from, e.to);
  }
  dagre.layout(g);

  const positions = new Map<string, Pos>();
  for (const n of nodes) {
    const nn = g.node(n.id);
    positions.set(n.id, { x: nn.x - n.width / 2, y: nn.y - n.height / 2 });
  }
  return positions;
}
