import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, "..", "data");
const historyPath = path.join(dataDir, "analysis-history.json");

async function ensureHistoryFile() {
  await fs.mkdir(dataDir, { recursive: true });

  try {
    await fs.access(historyPath);
  } catch {
    await fs.writeFile(historyPath, "[]", "utf8");
  }
}

async function readHistory() {
  await ensureHistoryFile();
  const raw = await fs.readFile(historyPath, "utf8");

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveAnalysisRun(run) {
  const history = await readHistory();
  const next = [run, ...history].slice(0, 30);
  await fs.writeFile(historyPath, JSON.stringify(next, null, 2), "utf8");
}

export async function loadRecentRuns(limit = 8) {
  const history = await readHistory();
  return history.slice(0, limit);
}
