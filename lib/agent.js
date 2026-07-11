import { Annotation, StateGraph, START, END } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { webSearch } from "./tools/webSearch.js";
import { fetchFinancialSnapshot } from "./tools/stockData.js";

const AgentState = Annotation.Root({
  company: Annotation(),
  riskProfile: Annotation(),
  horizon: Annotation(),
  financials: Annotation(),
  newsOutcome: Annotation({ reducer: (_p, n) => n, default: () => null }),
  competitiveOutcome: Annotation({ reducer: (_p, n) => n, default: () => null }),
  sources: Annotation({ reducer: (p, n) => [...(p ?? []), ...(n ?? [])], default: () => [] }),
  stages: Annotation({ reducer: (p, n) => [...(p ?? []), ...(n ?? [])], default: () => [] }),
  verdict: Annotation({ reducer: (_p, n) => n, default: () => null }),
});

function log(stage, label, detail) {
  return { stage, label, detail, timestamp: new Date().toISOString() };
}

/* ------------------------------------------------------------------ */
/* LLM — supports OpenRouter (free) or any OpenAI-compatible provider */
/* ------------------------------------------------------------------ */

let _llm = null;
// Models to try in order if quota is exceeded (all confirmed available on v1beta)
const GEMINI_FALLBACK_MODELS = [
  "gemini-2.0-flash-lite",
  "gemini-2.5-flash-preview-05-20",
  "gemini-2.5-pro-preview-05-06",
];

function makeLLM(model) {
  return new ChatGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_API_KEY,
    model,
    temperature: 0.2,
    maxOutputTokens: 1500,
    maxRetries: 1,
  });
}

function getLLM() {
  if (_llm) return _llm;

  // Priority 1: Google Gemini (AI Studio)
  if (process.env.GOOGLE_API_KEY) {
    _llm = makeLLM(process.env.GOOGLE_MODEL ?? "gemini-2.0-flash-lite");
    return _llm;
  }

  // Priority 2: OpenRouter
  if (process.env.OPENROUTER_API_KEY) {
    _llm = new ChatOpenAI({
      apiKey: process.env.OPENROUTER_API_KEY,
      model: process.env.OPENROUTER_MODEL ?? "openai/gpt-oss-20b:free",
      temperature: 0.2,
      maxTokens: 3000,
      configuration: {
        baseURL: "https://openrouter.ai/api/v1",
        defaultHeaders: {
          "HTTP-Referer": "http://localhost:3000",
          "X-Title": "AI Investment Research Agent",
        },
      },
    });
    return _llm;
  }

  // Priority 3: OpenAI
  if (process.env.OPENAI_API_KEY) {
    _llm = new ChatOpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      temperature: 0.2,
      maxTokens: 2000,
    });
    return _llm;
  }

  throw new Error("No LLM API key found. Set GOOGLE_API_KEY, OPENROUTER_API_KEY, or OPENAI_API_KEY in .env.local");
}

/* ------------------------------------------------------------------ */
/* Nodes                                                               */
/* ------------------------------------------------------------------ */

async function nodeFinancials(state) {
  const financials = await fetchFinancialSnapshot(state.company);
  const detail = financials.ticker
    ? `Resolved ${financials.ticker}${financials.exchange ? ` on ${financials.exchange}` : ""}. Price: ${financials.price ?? "n/a"} ${financials.currency ?? ""}`
    : financials.notes ?? "Could not resolve market data.";
  return { financials, stages: [log("fetchFinancials", "Fetched market data", detail)] };
}

async function nodeNews(state) {
  const outcome = await webSearch(`${state.company} latest news earnings 2025 outlook`, 4);
  const sources = outcome.sources ?? [];
  return {
    newsOutcome: outcome,
    sources,
    stages: [log("fetchNews", "Researched recent news",
      outcome.ok ? `Found ${sources.length} sources.` : outcome.note ?? "Unavailable.")],
  };
}

async function nodeCompetitive(state) {
  const outcome = await webSearch(`${state.company} competitors industry position 2025`, 3);
  const sources = outcome.sources ?? [];
  return {
    competitiveOutcome: outcome,
    sources,
    stages: [log("fetchCompetitive", "Researched competitive landscape",
      outcome.ok ? `Found ${sources.length} sources.` : outcome.note ?? "Unavailable.")],
  };
}

function extractJSON(text) {
  // Try direct parse first
  try { return JSON.parse(text); } catch {}
  // Extract from markdown code block
  const block = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (block) try { return JSON.parse(block[1].trim()); } catch {}
  // Extract first {...} blob
  const brace = text.match(/\{[\s\S]*\}/);
  if (brace) try { return JSON.parse(brace[0]); } catch {}
  return null;
}

async function nodeDecision(state) {
  const fin = state.financials ?? {};
  const finBlock = fin.ticker
    ? `Ticker: ${fin.ticker} | Price: ${fin.price ?? "n/a"} ${fin.currency ?? ""} | MCap: ${fin.marketCap ?? "n/a"} | P/E: ${fin.peRatio ?? "n/a"} | 52w: ${fin.fiftyTwoWeekLow ?? "n/a"}-${fin.fiftyTwoWeekHigh ?? "n/a"}`
    : `No market data: ${fin.notes ?? "unavailable"}`;

  const trim = (text, max = 400) => text?.length > max ? text.slice(0, max) + "…" : (text ?? "");
  const newsBlock = state.newsOutcome?.ok ? trim(state.newsOutcome.answerText) : `[No live news — model knowledge only]`;
  const compBlock = state.competitiveOutcome?.ok ? trim(state.competitiveOutcome.answerText) : `[No live competitive data — model knowledge only]`;

  const prompt = `You are a rigorous equity analyst. Respond with ONLY a valid JSON object — no markdown, no explanation, just the JSON.

Company: ${state.company} | Risk: ${state.riskProfile} | Horizon: ${state.horizon}
MARKET: ${finBlock}
NEWS: ${newsBlock}
COMPETITIVE: ${compBlock}

Return this exact JSON shape:
{
  "tickerGuess": "string or null",
  "verdict": "INVEST" | "PASS" | "WATCHLIST",
  "confidence": <number 0-100>,
  "thesisSummary": "2-3 sentence summary",
  "bullCase": ["point1", "point2"],
  "bearCase": ["point1", "point2"],
  "keyRisks": ["risk1", "risk2"],
  "catalysts": ["catalyst1"],
  "suggestedHorizon": "e.g. 12-18 months",
  "suggestedPositionNote": "one-line sizing note",
  "reasoningChain": ["step1", "step2", "step3"]
}`;

  // Try primary model, then fallbacks on quota errors
  const modelsToTry = [
    process.env.GOOGLE_MODEL ?? "gemini-2.0-flash-lite",
    ...GEMINI_FALLBACK_MODELS.filter(m => m !== (process.env.GOOGLE_MODEL ?? "gemini-2.0-flash-lite")),
  ];

  let lastErr;
  for (const model of modelsToTry) {
    try {
      const llm = process.env.GOOGLE_API_KEY ? makeLLM(model) : getLLM();
      const raw = await Promise.race([
        llm.invoke([{ role: "user", content: prompt }]),
        new Promise((_, reject) => setTimeout(() => reject(new Error("LLM timeout after 120s — try again")), 120000)),
      ]);
      const text = typeof raw === "string" ? raw
        : raw?.content || raw?.additional_kwargs?.reasoning || raw?.additional_kwargs?.reasoning_content || "";
      let structured = extractJSON(text);
      if (!structured?.verdict) throw new Error(`LLM returned unparseable output. Raw: ${text.slice(0, 300)}`);
      structured.confidence = Number(structured.confidence) || 50;
      structured.bullCase = Array.isArray(structured.bullCase) ? structured.bullCase : [structured.bullCase ?? "N/A"];
      structured.bearCase = Array.isArray(structured.bearCase) ? structured.bearCase : [structured.bearCase ?? "N/A"];
      structured.keyRisks = Array.isArray(structured.keyRisks) ? structured.keyRisks : [structured.keyRisks ?? "N/A"];
      structured.catalysts = Array.isArray(structured.catalysts) ? structured.catalysts : [structured.catalysts ?? "N/A"];
      structured.reasoningChain = Array.isArray(structured.reasoningChain) ? structured.reasoningChain : ["Derived from available data"];
      return {
        verdict: { company: state.company, ...structured },
        stages: [log("decision", `Synthesized verdict (${model})`, `${structured.verdict} (${structured.confidence}/100)`)],
      };
    } catch (err) {
      const is429 = err?.status === 429 || err?.message?.includes("429") || err?.message?.includes("quota") || err?.message?.includes("Quota");
      const is404 = err?.status === 404 || err?.message?.includes("404") || err?.message?.includes("not found");
      lastErr = err;
      if (!is429 && !is404) throw err;
      console.warn(`[decision] model ${model} failed (${err?.status ?? "err"}), trying next...`);
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  // All Gemini models failed — try OpenRouter if configured
  if (process.env.OPENROUTER_API_KEY) {
    console.warn("[decision] all Gemini models failed, falling back to OpenRouter...");
    const llm = new ChatOpenAI({
      apiKey: process.env.OPENROUTER_API_KEY,
      model: process.env.OPENROUTER_MODEL ?? "openai/gpt-4o-mini",
      temperature: 0.2,
      maxTokens: 1500,
      configuration: {
        baseURL: "https://openrouter.ai/api/v1",
        defaultHeaders: {
          "HTTP-Referer": "http://localhost:3000",
          "X-Title": "AI Investment Research Agent",
        },
      },
    });
    const raw = await llm.invoke([{ role: "user", content: prompt }]);
    const text = typeof raw === "string" ? raw : raw?.content || "";
    let structured = extractJSON(text);
    if (!structured?.verdict) throw new Error(`OpenRouter returned unparseable output. Raw: ${text.slice(0, 300)}`);
    structured.confidence = Number(structured.confidence) || 50;
    structured.bullCase = Array.isArray(structured.bullCase) ? structured.bullCase : [structured.bullCase ?? "N/A"];
    structured.bearCase = Array.isArray(structured.bearCase) ? structured.bearCase : [structured.bearCase ?? "N/A"];
    structured.keyRisks = Array.isArray(structured.keyRisks) ? structured.keyRisks : [structured.keyRisks ?? "N/A"];
    structured.catalysts = Array.isArray(structured.catalysts) ? structured.catalysts : [structured.catalysts ?? "N/A"];
    structured.reasoningChain = Array.isArray(structured.reasoningChain) ? structured.reasoningChain : ["Derived from available data"];
    return {
      verdict: { company: state.company, ...structured },
      stages: [log("decision", "Synthesized verdict (OpenRouter fallback)", `${structured.verdict} (${structured.confidence}/100)`)],
    };
  }
  throw lastErr;
}

/* ------------------------------------------------------------------ */
/* Graph — compiled once, reused across requests                      */
/* ------------------------------------------------------------------ */

let _graph = null;
function getGraph() {
  if (_graph) return _graph;
  _graph = new StateGraph(AgentState)
    .addNode("fetchFinancials", nodeFinancials)
    .addNode("fetchNews", nodeNews)
    .addNode("fetchCompetitive", nodeCompetitive)
    .addNode("decision", nodeDecision)
    .addEdge(START, "fetchFinancials")
    .addEdge(START, "fetchNews")
    .addEdge(START, "fetchCompetitive")
    .addEdge("fetchFinancials", "decision")
    .addEdge("fetchNews", "decision")
    .addEdge("fetchCompetitive", "decision")
    .addEdge("decision", END)
    .compile();
  return _graph;
}

/* ------------------------------------------------------------------ */
/* Public entry point                                                  */
/* ------------------------------------------------------------------ */

export async function runInvestmentResearch(req) {
  const graph = getGraph();

  const result = await graph.invoke({
    company: req.company.trim(),
    riskProfile: req.riskProfile ?? "balanced",
    horizon: req.horizon ?? "medium",
  });

  if (!result.verdict) throw new Error("Agent did not produce a verdict.");

  const seen = new Set();
  const sources = (result.sources ?? []).filter((s) => {
    if (!s.url || seen.has(s.url)) return false;
    seen.add(s.url);
    return true;
  });

  return {
    company: req.company.trim(),
    generatedAt: new Date().toISOString(),
    financials: result.financials ?? {},
    sources,
    verdict: result.verdict,
    stages: result.stages ?? [],
  };
}
