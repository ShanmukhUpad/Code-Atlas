// Starts a local Ollama server for Code Atlas' AI descriptions — but only if
// one isn't already running (so it's safe to run alongside the desktop app).
// Never fails the dev script: if Ollama isn't installed, it just no-ops.
import { spawn } from "node:child_process";
import http from "node:http";

const BASE = process.env.OLLAMA_URL || "http://localhost:11434";

function ping() {
  return new Promise((resolve) => {
    const req = http.get(`${BASE}/api/tags`, { timeout: 1500 }, (res) => {
      res.resume();
      resolve(res.statusCode === 200);
    });
    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
  });
}

if (await ping()) {
  console.log("[ollama] already running — reusing it for AI descriptions");
  process.exit(0);
}

console.log("[ollama] starting `ollama serve`…");
const child = spawn("ollama", ["serve"], { stdio: "inherit", shell: true });

child.on("error", (err) => {
  console.warn(
    `[ollama] not started (${err.message}). Code Atlas will use heuristic descriptions.\n` +
      "         Install from https://ollama.com and `ollama pull llama3.2` to enable AI.",
  );
  process.exit(0); // don't break `npm run dev`
});

// Forward termination so Ctrl+C stops the server we started.
for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => {
    child.kill();
    process.exit(0);
  });
}
child.on("exit", (code) => process.exit(code ?? 0));
