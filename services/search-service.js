const DEFAULT_SEARXNG_INSTANCE = "https://searx.be";

function buildSearchQueries(analysis) {
  const base = [analysis.market, analysis.frequency, analysis.style]
    .filter(Boolean)
    .join(" ");
  const signalSlice = analysis.signals.slice(0, 3).join(" ");

  return [
    `${base} ${signalSlice} crypto stat arb`,
    `${analysis.market} ${analysis.style} cointegration pairs trading`,
    `${analysis.market} funding rate orderbook mean reversion`
  ]
    .map((query) => query.trim().replace(/\s+/g, " "))
    .filter(Boolean);
}

async function searchWithSearxng(queries) {
  const instance = process.env.SEARXNG_BASE_URL || DEFAULT_SEARXNG_INSTANCE;
  const results = [];

  for (const query of queries) {
    const url = new URL("/search", instance);
    url.searchParams.set("q", query);
    url.searchParams.set("format", "json");
    url.searchParams.set("language", "zh-CN");
    url.searchParams.set("safesearch", "1");

    const response = await fetch(url, {
      headers: {
        "User-Agent": "ai-stat-arb-platform/1.0"
      }
    });

    if (!response.ok) {
      throw new Error(`SearXNG request failed: ${response.status}`);
    }

    const payload = await response.json();
    const items = Array.isArray(payload.results) ? payload.results : [];

    for (const item of items.slice(0, 5)) {
      results.push({
        title: item.title || "Untitled result",
        url: item.url || item.pretty_url || "",
        source: item.engine || new URL(instance).hostname,
        snippet: item.content || item.description || "",
        market: "",
        style: "",
        similarity: 0
      });
    }
  }

  return {
    provider: `SearXNG (${new URL(instance).hostname})`,
    note: "检索结果来自聚合搜索实例，后续会继续由本地准入逻辑和 LLM 评分流程消化。",
    results
  };
}

async function searchWithTavily(queries) {
  const apiKey = process.env.TAVILY_API_KEY;

  if (!apiKey) {
    throw new Error("TAVILY_API_KEY is not configured");
  }

  const results = [];

  for (const query of queries) {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        query,
        topic: "general",
        search_depth: "basic",
        max_results: 5,
        include_raw_content: false
      })
    });

    if (!response.ok) {
      throw new Error(`Tavily request failed: ${response.status}`);
    }

    const payload = await response.json();
    const items = Array.isArray(payload.results) ? payload.results : [];

    for (const item of items) {
      results.push({
        title: item.title || "Untitled result",
        url: item.url || "",
        source: "Tavily",
        snippet: item.content || item.raw_content || "",
        market: "",
        style: "",
        similarity: 0
      });
    }
  }

  return {
    provider: "Tavily Search API",
    note: "检索结果来自 Tavily，适合作为论文摘要、博客说明和开源实现的研究线索池。",
    results
  };
}

function dedupeResults(items) {
  const seen = new Set();

  return items.filter((item) => {
    const key = item.url || `${item.title}:${item.source}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

export async function runStrategySearch(analysis) {
  const queries = buildSearchQueries(analysis);
  const provider = (process.env.SEARCH_PROVIDER || "mock").toLowerCase();

  if (!analysis.rawText) {
    return {
      provider: "No Search",
      note: "策略摘要为空，因此没有发起外部检索。",
      results: []
    };
  }

  try {
    let run;

    if (provider === "searxng") {
      run = await searchWithSearxng(queries);
    } else if (provider === "tavily") {
      run = await searchWithTavily(queries);
    } else {
      return {
        provider: "Mock Fallback",
        note: "当前未配置联网搜索，页面正在展示本地研究样本回退模式。",
        results: []
      };
    }

    return {
      ...run,
      results: dedupeResults(run.results).slice(0, 12)
    };
  } catch (error) {
    return {
      provider: "Search Failed",
      note: `联网检索失败，已自动回退到本地模式：${error.message}`,
      results: []
    };
  }
}
