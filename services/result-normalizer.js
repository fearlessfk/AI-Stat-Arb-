const trustedDomains = [
  "arxiv.org",
  "ssrn.com",
  "nber.org",
  "github.com",
  "medium.com",
  "substack.com",
  "tradingview.com",
  "quantconnect.com",
  "fmz.com",
  "reddit.com",
  "theblock.co",
  "messari.io"
];

function hostnameFromUrl(rawUrl) {
  if (!rawUrl) {
    return "";
  }

  try {
    return new URL(rawUrl).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function scoreDomain(hostname) {
  if (!hostname) {
    return 25;
  }

  if (trustedDomains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`))) {
    return 85;
  }

  if (hostname.includes("github") || hostname.includes("substack")) {
    return 72;
  }

  return 55;
}

function inferTags(text) {
  const sourceText = String(text || "").toLowerCase();
  const tags = [];

  if (sourceText.includes("cointegration") || sourceText.includes("协整")) tags.push("协整");
  if (sourceText.includes("pairs trading") || sourceText.includes("配对")) tags.push("配对");
  if (sourceText.includes("funding") || sourceText.includes("资金费率")) tags.push("资金费率");
  if (sourceText.includes("orderbook") || sourceText.includes("订单簿")) tags.push("orderbook");
  if (sourceText.includes("mean reversion") || sourceText.includes("均值回复")) tags.push("均值回复");

  return tags;
}

function truncate(text, maxLength = 220) {
  const value = String(text || "").replace(/\s+/g, " ").trim();

  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1)}…`;
}

export function normalizeSearchResults(items) {
  return items.map((item, index) => {
    const hostname = hostnameFromUrl(item.url);
    const credibility = scoreDomain(hostname);
    const snippet = truncate(item.snippet);
    const title = truncate(item.title, 120) || `搜索结果 ${index + 1}`;
    const tags = inferTags(`${item.title} ${item.snippet}`);

    return {
      id: item.id || `search-${index + 1}`,
      title,
      url: item.url || "",
      source: item.source || hostname || "Unknown",
      hostname,
      snippet,
      credibility,
      tags
    };
  });
}

export function buildEvidenceSummary(results) {
  if (!results.length) {
    return {
      totalSources: 0,
      avgCredibility: 0,
      topDomains: []
    };
  }

  const domainMap = new Map();
  let totalCredibility = 0;

  for (const item of results) {
    totalCredibility += item.credibility;

    if (item.hostname) {
      domainMap.set(item.hostname, (domainMap.get(item.hostname) || 0) + 1);
    }
  }

  const topDomains = [...domainMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([domain, count]) => ({ domain, count }));

  return {
    totalSources: results.length,
    avgCredibility: Math.round(totalCredibility / results.length),
    topDomains
  };
}
