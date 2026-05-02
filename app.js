import { taxonomy } from "./data/strategy-library.js";

const form = document.getElementById("strategy-form");
const resultsNode = document.getElementById("results");
const analysisNode = document.getElementById("analysis-output");
const decisionNode = document.getElementById("decision-output");
const runStatusNode = document.getElementById("run-status");
const providerNode = document.getElementById("provider-output");
const evidenceSummaryNode = document.getElementById("evidence-summary");
const evidenceResultsNode = document.getElementById("evidence-results");
const historyResultsNode = document.getElementById("history-results");

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderStatus(message, tone = "neutral") {
  runStatusNode.textContent = message;
  runStatusNode.dataset.tone = tone;
}

function renderProvider(info) {
  providerNode.innerHTML = `
    <article class="analysis-card">
      <h3>本次运行来源</h3>
      <div class="detail-row"><span>搜索提供方</span><span>${escapeHtml(info.searchProvider)}</span></div>
      <div class="detail-row"><span>评审模型</span><span>${escapeHtml(info.llmProvider)}</span></div>
      <div class="detail-row"><span>运行模式</span><span>${escapeHtml(info.mode)}</span></div>
      <p>${escapeHtml(info.note)}</p>
    </article>
  `;
}

function renderAnalysis(analysis) {
  const signalList = analysis.signals.length ? analysis.signals.join(" / ") : "待识别";
  const riskList = analysis.risks.length ? analysis.risks.join(" / ") : "待补充";
  const scopeList = analysis.scope.length ? analysis.scope.join(" / ") : "待补充";
  const queryList = analysis.queryPlan.length
    ? analysis.queryPlan.map((query) => `<li>${escapeHtml(query)}</li>`).join("")
    : "<li>待补充更具体的长尾协整策略描述</li>";

  analysisNode.innerHTML = `
    <article class="analysis-card">
      <h3>结构化拆解</h3>
      <div class="detail-row"><span>市场</span><span>${escapeHtml(analysis.market)}</span></div>
      <div class="detail-row"><span>频率</span><span>${escapeHtml(analysis.frequency)}</span></div>
      <div class="detail-row"><span>风格</span><span>${escapeHtml(analysis.style)}</span></div>
      <div class="detail-row"><span>核心信号</span><span>${escapeHtml(signalList)}</span></div>
      <div class="detail-row"><span>研究范围 / 约束</span><span>${escapeHtml(scopeList)}</span></div>
      <div class="detail-row"><span>潜在风险点</span><span>${escapeHtml(riskList)}</span></div>
      <div class="query-block">
        <strong>计划检索语句</strong>
        <ul>${queryList}</ul>
      </div>
    </article>
  `;
}

function renderDecision(summary) {
  decisionNode.innerHTML = `
    <article class="analysis-card decision-card">
      <h3>研究准入建议</h3>
      <p>${escapeHtml(summary.verdict)}</p>
      <div class="detail-row"><span>建议动作</span><span>${escapeHtml(summary.action)}</span></div>
      <div class="detail-row"><span>优先补充</span><span>${escapeHtml(summary.nextStep)}</span></div>
    </article>
  `;
}

function renderResults(payload) {
  if (!payload.candidates.length) {
    resultsNode.innerHTML = `
      <article class="result-card">
        <h3>暂无可匹配样本</h3>
        <p>当前描述还偏抽象，建议补充协整检验方法、建仓阈值、流动性约束和事件过滤条件后再评估。</p>
      </article>
    `;
    return;
  }

  resultsNode.innerHTML = payload.candidates
    .map((item) => `
      <article class="result-card">
        <div class="detail-row">
          <strong>${escapeHtml(item.title)}</strong>
          <span class="score-chip">${escapeHtml(item.totalScore)}</span>
        </div>
        <p>${escapeHtml(item.matchNarrative)}</p>
        <div class="detail-row"><span>来源</span><span>${escapeHtml(item.source)}</span></div>
        <div class="detail-row"><span>市场 / 风格</span><span>${escapeHtml(item.market)} / ${escapeHtml(item.style)}</span></div>
        <div class="detail-row"><span>相似度</span><span>${escapeHtml(item.similarity)}</span></div>
        <div class="detail-row"><span>可行性</span><span>${escapeHtml(item.feasibility)}</span></div>
        <div class="detail-row"><span>数据可得性</span><span>${escapeHtml(item.dataAvailability)}</span></div>
        <div class="detail-row"><span>拥挤与失效风险</span><span>${escapeHtml(item.crowdingRisk)}</span></div>
        <div class="detail-row"><span>研究结论</span><span>${escapeHtml(item.researchDecision)}</span></div>
        <p>${escapeHtml(item.note)}</p>
        ${item.url ? `<p><a href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">打开来源</a></p>` : ""}
      </article>
    `)
    .join("");
}

function renderEvidence(evidence) {
  if (!evidence || !evidence.items?.length) {
    evidenceSummaryNode.innerHTML = `
      <article class="analysis-card">
        <h3>暂无外部证据</h3>
        <p>如果联网检索可用，这里会展示论文、博客和开源实现摘要，便于人工复核。</p>
      </article>
    `;
    evidenceResultsNode.innerHTML = "";
    return;
  }

  const topDomains = evidence.summary.topDomains.length
    ? evidence.summary.topDomains.map((item) => `${escapeHtml(item.domain)} (${item.count})`).join(" / ")
    : "暂无";

  evidenceSummaryNode.innerHTML = `
    <div class="evidence-summary-grid">
      <article class="analysis-card">
        <h3>来源数量</h3>
        <p>${escapeHtml(evidence.summary.totalSources)}</p>
      </article>
      <article class="analysis-card">
        <h3>平均可信度</h3>
        <p>${escapeHtml(evidence.summary.avgCredibility)} / 100</p>
      </article>
      <article class="analysis-card">
        <h3>高频域名</h3>
        <p>${topDomains}</p>
      </article>
    </div>
  `;

  evidenceResultsNode.innerHTML = evidence.items
    .map((item) => {
      const tags = item.tags.length
        ? `<div class="tag-list">${item.tags.map((tag) => `<span class="tag-chip">${escapeHtml(tag)}</span>`).join("")}</div>`
        : "";

      return `
        <article class="result-card evidence-card">
          <div class="detail-row">
            <strong>${escapeHtml(item.title)}</strong>
            <span class="score-chip">${escapeHtml(item.credibility)}</span>
          </div>
          <div class="detail-row"><span>域名</span><span>${escapeHtml(item.hostname || item.source)}</span></div>
          <p>${escapeHtml(item.snippet || "暂无摘要")}</p>
          ${tags}
          ${item.url ? `<p><a href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">查看原文</a></p>` : ""}
        </article>
      `;
    })
    .join("");
}

function renderHistory(runs) {
  if (!runs.length) {
    historyResultsNode.innerHTML = `
      <article class="result-card">
        <h3>暂无历史记录</h3>
        <p>首次生成研究准入报告后，这里会自动归档最近的分析结果。</p>
      </article>
    `;
    return;
  }

  historyResultsNode.innerHTML = runs
    .map((run) => `
      <article class="result-card">
        <div class="detail-row">
          <strong>${escapeHtml(run.strategyName)}</strong>
          <span class="score-chip">${escapeHtml(run.topScore)}</span>
        </div>
        <div class="detail-row"><span>时间</span><span>${escapeHtml(new Date(run.createdAt).toLocaleString("zh-CN"))}</span></div>
        <div class="detail-row"><span>市场 / 风格</span><span>${escapeHtml(run.market)} / ${escapeHtml(run.style)}</span></div>
        <div class="detail-row"><span>最佳样本</span><span>${escapeHtml(run.topCandidate || "暂无")}</span></div>
        <div class="detail-row"><span>建议动作</span><span>${escapeHtml(run.action)}</span></div>
        <p>${escapeHtml(run.verdict)}</p>
      </article>
    `)
    .join("");
}

async function loadHistory() {
  const response = await fetch("/api/history");
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || "历史记录加载失败");
  }

  return result.runs || [];
}

function serializeForm() {
  return {
    strategyName: document.getElementById("strategy-name").value.trim(),
    strategySummary: document.getElementById("strategy-summary").value.trim(),
    market: document.getElementById("market-select").value,
    frequency: document.getElementById("frequency-select").value,
    style: document.getElementById("style-select").value
  };
}

async function runAnalysis(payload) {
  renderStatus("正在检索论文、策略样本和开源实现，并生成研究准入评审，请稍候…");

  const response = await fetch("/api/analyze", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || "请求失败");
  }

  return result;
}

async function bootstrap() {
  renderProvider({
    searchProvider: "等待后端返回",
    llmProvider: "等待后端返回",
    mode: "未运行",
    note: "当前前端不直接持有密钥，所有联网检索和模型评审都由本地服务统一处理。"
  });

  renderAnalysis({
    market: taxonomy.markets[0],
    frequency: taxonomy.frequencies[0],
    style: taxonomy.styles[0],
    signals: ["协整", "价差 z-score", "资金费率"],
    scope: ["Top 50-500 代币池", "样本外盲测", "流动性约束"],
    risks: ["伪协整风险", "流动性蒸发风险", "事件跳变风险"],
    queryPlan: [
      "加密长尾现货 1h 协整配对 协整 价差 z-score 资金费率 统计套利",
      "加密长尾现货 协整 价差 z-score 资金费率 pairs trading cointegration crypto",
      "加密长尾现货 funding rate orderbook mean reversion"
    ]
  });

  renderResults({
    candidates: [],
    summary: {
      verdict: "等待你提交一条长尾协整套利假设后生成研究准入判断。",
      action: "输入策略后开始分析",
      nextStep: "补充策略摘要"
    }
  });

  renderDecision({
    verdict: "等待你提交一条长尾协整套利假设后生成研究准入判断。",
    action: "输入策略后开始分析",
    nextStep: "补充策略摘要"
  });

  renderEvidence({
    summary: {
      totalSources: 0,
      avgCredibility: 0,
      topDomains: []
    },
    items: []
  });

  try {
    const runs = await loadHistory();
    renderHistory(runs);
  } catch {
    renderHistory([]);
  }

  renderStatus("系统已就绪，等待你提交新的长尾协整套利研究假设。", "success");
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    const payload = serializeForm();
    const result = await runAnalysis(payload);

    renderAnalysis(result.analysis);
    renderResults(result.evaluation);
    renderDecision(result.evaluation.summary);
    renderEvidence(result.evaluation.evidence);
    renderProvider(result.runtime);
    renderHistory(await loadHistory());
    renderStatus("研究准入评审已生成，可继续人工复核或进入下一阶段。", "success");
  } catch (error) {
    renderStatus(error.message || "分析失败，请检查服务端配置。", "error");
  }
});

bootstrap();
