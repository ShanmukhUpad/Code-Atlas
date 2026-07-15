// Parsers for data/config files: JSON (leaf config nodes) and Jupyter notebooks
// (JSON envelopes whose code cells are treated as Python for dependency edges).

export interface JsonInfo {
  /** Top-level object keys, surfaced as the file's "exports" for context. */
  keys: string[];
  header?: string;
}

/** Pull top-level keys + a short summary from a JSON file (tolerant of errors). */
export function parseJsonInfo(content: string): JsonInfo {
  try {
    const data = JSON.parse(content);
    if (data && typeof data === "object" && !Array.isArray(data)) {
      const keys = Object.keys(data);
      const shown = keys.slice(0, 8).join(", ");
      return {
        keys: keys.slice(0, 24),
        header: keys.length
          ? `JSON object with ${keys.length} top-level key${keys.length === 1 ? "" : "s"}: ${shown}${keys.length > 8 ? "…" : ""}.`
          : "Empty JSON object.",
      };
    }
    if (Array.isArray(data)) {
      return { keys: [], header: `JSON array of ${data.length} item${data.length === 1 ? "" : "s"}.` };
    }
    return { keys: [], header: "JSON value." };
  } catch {
    return { keys: [], header: undefined };
  }
}

export interface NotebookInfo {
  /** Concatenated source of all code cells (used for Python import parsing). */
  code: string;
  /** Line count of the code cells. */
  codeLoc: number;
  /** First markdown cell (trimmed), used as the notebook's header. */
  header?: string;
}

interface RawCell {
  cell_type?: string;
  source?: string | string[];
}

function cellText(cell: RawCell): string {
  const s = cell.source;
  return Array.isArray(s) ? s.join("") : typeof s === "string" ? s : "";
}

/** Extract code + a header from a Jupyter notebook (.ipynb) JSON document. */
export function parseNotebook(content: string): NotebookInfo {
  try {
    const nb = JSON.parse(content) as { cells?: RawCell[] };
    const cells = Array.isArray(nb.cells) ? nb.cells : [];
    const codeParts: string[] = [];
    let header: string | undefined;
    for (const cell of cells) {
      if (cell.cell_type === "code") codeParts.push(cellText(cell));
      else if (cell.cell_type === "markdown" && !header) {
        const md = cellText(cell)
          .replace(/[#*`>_-]/g, " ")
          .replace(/\s+/g, " ")
          .trim();
        if (md) header = md.slice(0, 200);
      }
    }
    const code = codeParts.join("\n");
    return { code, codeLoc: code ? code.split("\n").length : 0, header };
  } catch {
    return { code: "", codeLoc: 0, header: undefined };
  }
}
