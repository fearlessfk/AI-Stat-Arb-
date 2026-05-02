import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { analyzeStrategyInput, evaluateCandidates } from "./lib/strategy-engine.js";
import { strategyLibrary } from "./data/strategy-library.js";
import { runStrategySearch } from "./services/search-service.js";
import { scoreWithDeepSeek } from "./services/deepseek-service.js";
import { normalizeSearchResults, buildEvidenceSummary } from "./services/result-normalizer.js";
import { saveAnalysisRun, loadRecentRuns } from "./services/history-store.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = __dirname;
let port = 3000;

async function loadEnvFile() {
  const envPath = path.join(rootDir, ".env");

  try {
    const raw = await fs.readFile(envPath, "utf8");

    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      const separatorIndex = trimmed.indexOf("=");

      if (separatorIndex === -1) {
        continue;
      }

      const key = trimmed.slice(0, separatorIndex).trim();
      const value = trimmed.slice(separatorIndex + 1).trim();

      if (key && !process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
}

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

async function readBody(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8"
  });
  response.end(JSON.stringify(payload));
}

async function serveStatic(response, requestPath) {
  const safePath = requestPath === "/" ? "/index.html" : requestPath;
  const filePath = path.join(rootDir, safePath);
  const normalized = path.normalize(filePath);

  if (!normalized.startsWith(rootDir)) {
    throw new Error("invalid-path");
  }

  const file = await fs.readFile(normalized);
  const extension = path.extname(normalized);

  response.writeHead(200, {
    "Content-Type": contentTypes[extension] || "application/octet-stream"
  });
  response.end(file);
}

async function handleAnalyze(request, response) {
  const payload = await readBody(request);
  const analysis = analyzeStrategyInput(payload.strategySummary || "", {
    market: payload.market,
    frequency: payload.frequency,
    style: payload.style
  });

  const searchRun = await runStrategySearch(analysis);
  const normalizedEvidence = normalizeSearchResults(searchRun.results);
  const evidenceSummary = buildEvidenceSummary(normalizedEvidence);
  const localEvaluation = evaluateCandidates(analysis, strategyLibrary);
  const llmEvaluation = await scoreWithDeepSeek({
    strategyName: payload.strategyName,
    analysis,
    searchResults: normalizedEvidence,
    fallbackEvaluation: localEvaluation
  });

  const archivedRun = {
    id: `run-${Date.now()}`,
    createdAt: new Date().toISOString(),
    strategyName: payload.strategyName || "未命名策略",
    market: analysis.market,
    frequency: analysis.frequency,
    style: analysis.style,
    verdict: llmEvaluation.summary.verdict,
    action: llmEvaluation.summary.action,
    topCandidate: llmEvaluation.candidates[0]?.title || "",
    topScore: llmEvaluation.candidates[0]?.totalScore || 0,
    searchProvider: searchRun.provider,
    llmModel: llmEvaluation.meta.model
  };

  await saveAnalysisRun(archivedRun);

  sendJson(response, 200, {
    analysis,
    evaluation: {
      ...llmEvaluation,
      evidence: {
        summary: evidenceSummary,
        items: normalizedEvidence
      }
    },
    runtime: {
      searchProvider: searchRun.provider,
      llmProvider: llmEvaluation.meta.model,
      mode: llmEvaluation.meta.mode,
      note: searchRun.note
    }
  });
}

async function handleHistory(response) {
  const runs = await loadRecentRuns();
  sendJson(response, 200, { runs });
}

function createAppServer() {
  return http.createServer(async (request, response) => {
    try {
      if (!request.url) {
        sendJson(response, 400, { error: "missing-url" });
        return;
      }

      const url = new URL(request.url, `http://${request.headers.host}`);

      if (request.method === "POST" && url.pathname === "/api/analyze") {
        await handleAnalyze(request, response);
        return;
      }

      if (request.method === "GET" && url.pathname === "/api/history") {
        await handleHistory(response);
        return;
      }

      if (request.method === "GET") {
        await serveStatic(response, url.pathname);
        return;
      }

      sendJson(response, 405, { error: "method-not-allowed" });
    } catch (error) {
      if (error.message === "invalid-path") {
        sendJson(response, 403, { error: "forbidden" });
        return;
      }

      if (error.code === "ENOENT") {
        sendJson(response, 404, { error: "not-found" });
        return;
      }

      sendJson(response, 500, {
        error: error.message || "internal-server-error"
      });
    }
  });
}

export async function startServer(requestedPort) {
  await loadEnvFile();
  port = Number(requestedPort || process.env.PORT || 3000);
  const server = createAppServer();

  await new Promise((resolve) => {
    server.listen(port, resolve);
  });

  return server;
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === __filename;

if (isDirectRun) {
  await loadEnvFile();
  port = Number(process.env.PORT || 3000);
  const server = createAppServer();

  server.listen(port, () => {
    console.log(`AI Stat-Arb platform running on http://localhost:${port}`);
  });
}
