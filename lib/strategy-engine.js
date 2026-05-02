const signalDictionary = [
  { label: "协整", terms: ["协整", "cointegration", "engle-granger", "johansen"] },
  { label: "价差 z-score", terms: ["z-score", "价差", "spread", "残差"] },
  { label: "滚动窗口", terms: ["滚动窗口", "walk-forward", "rolling"] },
  { label: "卡尔曼滤波", terms: ["卡尔曼", "kalman"] },
  { label: "资金费率", terms: ["资金费率", "funding rate", "基差"] },
  { label: "orderbook 深度", terms: ["orderbook", "订单簿", "深度", "盘口"] },
  { label: "Narrative Driver", terms: ["narrative", "叙事", "主题簇"] },
  { label: "均值回复", terms: ["均值回复", "mean reversion", "回归"] }
];

const scopeDictionary = [
  { label: "Top 50-500 代币池", terms: ["top 50-500", "长尾", "中小市值", "代币池"] },
  { label: "跨现货-永续", terms: ["现货", "永续", "跨现货-永续"] },
  { label: "样本外盲测", terms: ["样本外", "盲测", "walk-forward"] },
  { label: "Maker 返佣", terms: ["maker", "返佣", "手续费"] },
  { label: "Rug Pull 过滤", terms: ["rug pull", "暴雷", "归零"] },
  { label: "流动性约束", terms: ["流动性", "深度", "滑点"] }
];

const riskDictionary = [
  { label: "伪协整风险", terms: ["协整", "相关性", "价差"] },
  { label: "流动性蒸发风险", terms: ["长尾", "深度", "滑点", "订单簿"] },
  { label: "费率侵蚀风险", terms: ["资金费率", "手续费", "maker", "taker"] },
  { label: "事件跳变风险", terms: ["rug pull", "黑天鹅", "叙事", "公告"] }
];

function extractLabels(text, dictionary) {
  return dictionary
    .filter((entry) => entry.terms.some((term) => text.includes(term.toLowerCase())))
    .map((entry) => entry.label);
}

function buildQueryPlan(analysis) {
  const base = [analysis.market, analysis.frequency, analysis.style].filter(Boolean).join(" ");
  const signalSlice = analysis.signals.slice(0, 3).join(" ");

  return [
    `${base} ${signalSlice} 统计套利`,
    `${analysis.market} ${signalSlice} pairs trading cointegration crypto`,
    `${analysis.market} ${analysis.style} funding rate orderbook mean reversion`
  ].map((query) => query.trim().replace(/\s+/g, " "));
}

function buildNarrative(candidate, similarity) {
  if (similarity >= 82) {
    return "该样本与当前输入在市场结构、协整信号和执行约束上高度贴合，适合作为直接对标的研究底稿。";
  }

  if (similarity >= 68) {
    return "该样本与当前输入共享主要统计套利框架，可作为相邻策略簇的补充参考。";
  }

  return "该样本只在局部信号层面相关，更适合作为边界案例，而不是主对标方案。";
}

function finalDecision(score) {
  if (score >= 82) return "建议进入代码转化与 Walk-forward 盲测";
  if (score >= 72) return "建议人工复核后进入研究池";
  return "暂不建议占用真实回测资源";
}

export function analyzeStrategyInput(summary, selected) {
  const normalized = String(summary || "").trim().toLowerCase();
  const signals = extractLabels(normalized, signalDictionary);
  const scope = extractLabels(normalized, scopeDictionary);
  const risks = extractLabels(normalized, riskDictionary);

  return {
    rawText: normalized,
    market: selected.market,
    frequency: selected.frequency,
    style: selected.style,
    signals,
    scope,
    risks,
    queryPlan: buildQueryPlan({
      market: selected.market,
      frequency: selected.frequency,
      style: selected.style,
      signals
    })
  };
}

function similarityScore(analysis, candidate) {
  let score = 0;

  if (analysis.market === candidate.market) score += 22;
  if (analysis.frequency === candidate.frequency) score += 14;
  if (analysis.style === candidate.style) score += 20;

  const signalHits = analysis.signals.filter((signal) => candidate.signals.includes(signal)).length;
  const scopeHits = analysis.scope.filter((item) => candidate.scope.some((scope) => scope.includes(item))).length;

  score += signalHits * 12;
  score += scopeHits * 7;

  return Math.min(score, 100);
}

function weightedScore(candidate, similarity) {
  return Math.round(
    similarity * 0.22 +
    candidate.originality * 0.16 +
    candidate.feasibility * 0.24 +
    candidate.dataAvailability * 0.16 +
    (100 - candidate.crowdingRisk) * 0.08 +
    candidate.researchValue * 0.14
  );
}

function buildSummary(topCandidate, analysis) {
  if (!topCandidate) {
    return {
      verdict: "当前描述还不足以映射到清晰的长尾协整框架，说明策略假设仍偏抽象或缺少关键执行约束。",
      action: "先补足研究字段，再进入下一轮检索",
      nextStep: "补充价差构造、建仓阈值、持仓周期与流动性过滤规则"
    };
  }

  if (topCandidate.totalScore >= 82) {
    return {
      verdict: `当前假设已经能找到高相似研究底稿，建议以“${topCandidate.title}”为主对标样本进入代码转化与样本外盲测准备。`,
      action: "进入代码转化架构师阶段",
      nextStep: "补充 BaseStrategy 输入字段、手续费假设与风险事件黑名单"
    };
  }

  if (analysis.signals.length < 2) {
    return {
      verdict: "输入描述中的核心统计套利信号还不够具体，容易让搜索结果偏向泛泛的量化均值回复样本。",
      action: "暂不进入真实回测准备阶段",
      nextStep: "补充协整检验方法、阈值逻辑和配对筛选窗口"
    };
  }

  return {
    verdict: "当前方案具备研究价值，但执行约束和风险过滤信息仍不够完整，建议继续做逻辑盲审。",
    action: "继续补充可行性分析",
    nextStep: "优先细化流动性门槛、费率假设和事件剔除条件"
  };
}

export function evaluateCandidates(analysis, library) {
  const candidates = library
    .map((candidate) => {
      const similarity = similarityScore(analysis, candidate);
      const totalScore = weightedScore(candidate, similarity);

      return {
        ...candidate,
        similarity,
        totalScore,
        matchNarrative: buildNarrative(candidate, similarity),
        researchDecision: finalDecision(totalScore)
      };
    })
    .filter((candidate) => candidate.similarity >= 28)
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, 6);

  return {
    candidates,
    summary: buildSummary(candidates[0], analysis)
  };
}
