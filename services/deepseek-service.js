function cleanJsonBlock(text) {
  return text
    .trim()
    .replace(/^```json/i, "")
    .replace(/^```/i, "")
    .replace(/```$/i, "")
    .trim();
}

function fallbackMeta() {
  return {
    model: "local-fallback",
    mode: "本地回退"
  };
}

function buildPrompt({ strategyName, analysis, searchResults, fallbackEvaluation }) {
  return [
    {
      role: "system",
      content:
        "你是一个加密资产统计套利研究评审助手。你的任务不是预测收益，而是根据联网检索结果与策略描述，判断该策略是否值得进入真实回测准备阶段。请只返回 JSON。"
    },
    {
      role: "user",
      content: JSON.stringify(
        {
          task: "评估一个长尾加密配对交易策略的研究准入优先级",
          strategyName,
          analysis,
          searchResults,
          fallbackEvaluation
        },
        null,
        2
      )
    }
  ];
}

function normalizeCandidate(candidate, index) {
  return {
    id: candidate.id || `llm-${index + 1}`,
    title: candidate.title || `候选策略 ${index + 1}`,
    source: candidate.source || "联网搜索",
    url: candidate.url || "",
    market: candidate.market || "待识别",
    style: candidate.style || "待识别",
    similarity: Number(candidate.similarity || 0),
    feasibility: Number(candidate.feasibility || 0),
    dataAvailability: Number(candidate.dataAvailability || 0),
    crowdingRisk: Number(candidate.crowdingRisk || 0),
    totalScore: Number(candidate.totalScore || 0),
    matchNarrative: candidate.matchNarrative || "待补充",
    researchDecision: candidate.researchDecision || "待人工复核",
    note: candidate.note || "待补充"
  };
}

function normalizeSummary(summary, fallbackSummary) {
  return {
    verdict: summary?.verdict || fallbackSummary.verdict,
    action: summary?.action || fallbackSummary.action,
    nextStep: summary?.nextStep || fallbackSummary.nextStep
  };
}

function useFallback(fallbackEvaluation) {
  return {
    ...fallbackEvaluation,
    meta: fallbackMeta()
  };
}

export async function scoreWithDeepSeek(payload) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const baseUrl = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";
  const model = process.env.DEEPSEEK_MODEL || "deepseek-v4-flash";

  if (!apiKey) {
    return useFallback(payload.fallbackEvaluation);
  }

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: buildPrompt(payload)
      })
    });

    if (!response.ok) {
      throw new Error(`DeepSeek request failed: ${response.status}`);
    }

    const completion = await response.json();
    const message = completion.choices?.[0]?.message?.content;

    if (!message) {
      throw new Error("DeepSeek returned empty content");
    }

    const parsed = JSON.parse(cleanJsonBlock(message));
    const candidates = Array.isArray(parsed.candidates)
      ? parsed.candidates.map(normalizeCandidate)
      : payload.fallbackEvaluation.candidates;
    const summary = normalizeSummary(parsed.summary, payload.fallbackEvaluation.summary);

    return {
      candidates,
      summary,
      meta: {
        model,
        mode: "DeepSeek 联网评审"
      }
    };
  } catch (error) {
    return {
      ...payload.fallbackEvaluation,
      meta: {
        model,
        mode: `DeepSeek 失败，已回退：${error.message}`
      }
    };
  }
}
