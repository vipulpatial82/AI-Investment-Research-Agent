# The Analyst — AI Investment Research Agent

Give it a company name. It resolves the ticker and pulls a live market snapshot,
researches recent news and the competitive landscape, then makes a LangGraph.js
agent commit to one of three verdicts — **INVEST / PASS / WATCHLIST** — with a
full, inspectable reasoning trace, bull/bear cases, risks, catalysts, and sources.

Built for the InsideIIM × Altuni AI Labs "AI Product Development Engineer (Intern)" take-home.

---

## 1. Overview

**What it does:**

1. You type a company name (e.g. "Tata Motors", "Nvidia", "Zomato") and pick a
   risk profile + time horizon.
2. A LangGraph.js agent runs three research steps **in parallel**:
   - **Market data** — resolves the ticker and pulls price, market cap, P/E,
     52-week range via Yahoo Finance public endpoints (no key required).
   - **News research** — recent news, earnings, outlook via DuckDuckGo (no key required).
   - **Competitive research** — competitors, industry positioning via DuckDuckGo.
3. Those three results are handed to Google Gemini (via LangChain.js) which returns
   a **structured verdict object** — not free-form text. That object contains the
   verdict, confidence score, thesis summary, bull case, bear case, risks, catalysts,
   suggested horizon, position note, and a step-by-step reasoning chain.
4. The frontend renders the verdict as an analyst terminal-style report, plus a
   transparency panel showing exactly what the agent did at each stage and which
   sources it used.

**Zero required API keys beyond Google Gemini** — market data comes from Yahoo Finance
public endpoints and web search uses DuckDuckGo, both completely free with no signup.

---

## 2. How to run it

### Prerequisites
- Node.js 18.18+ (built/tested on Node 22)
- A Google Gemini API key — get one free at https://aistudio.google.com/app/apikeys

### Setup

```bash
git clone https://github.com/vipulpatial82/AI-Investment-Research-Agent.git
cd AI-Investment-Research-Agent
npm install --legacy-peer-deps
cp .env.example .env.local
```

Edit `.env.local`:

```bash
GOOGLE_API_KEY=AIzaSy...   # required — must start with AIza
GOOGLE_MODEL=gemini-2.0-flash-lite   # optional, this is the default
```

> **No other keys needed.** Web search uses DuckDuckGo (free, no signup).
> Market data uses Yahoo Finance public endpoints (no key).

### Run locally

```bash
npm run dev
```

Open **http://localhost:3000**, type a company name, hit "Run Analysis Agent."

### Build for production / deploy

```bash
npm run build
npm start
```

**Vercel:** push to GitHub, import in Vercel, add `GOOGLE_API_KEY` as an
Environment Variable, deploy. No other config needed.

**Why `--legacy-peer-deps`:** `langchain`/`@langchain/community` have a peer
dependency conflict on an optional `typeorm` → `better-sqlite3` package we don't
use. `--legacy-peer-deps` is the standard fix — the app builds and runs clean.

---

## 3. Architecture

```
                         ┌──────────────────┐
                  ┌─────▶│  fetchFinancials  │── Yahoo Finance (ticker + quote)
                  │      └──────────────────┘
   START ─────────┼─────▶│    fetchNews      │── DuckDuckGo (free, no key)
                  │      └──────────────────┘
                  └─────▶│  fetchCompetitive │── DuckDuckGo (free, no key)
                         └──────────────────┘
                                │  (all three feed in)
                                ▼
                         ┌──────────────────┐
                         │     decision      │── Google Gemini (model fallback chain)
                         └──────────────────┘
                                │
                                ▼
                               END
```

- **Framework:** LangGraph.js `StateGraph` (`lib/agent.js`). State is a typed
  `Annotation.Root` with reducers so sources and stage logs are appended/merged
  automatically as nodes run in parallel.
- **Fan-out / fan-in:** all three research nodes start from `START` and run
  independently; `decision` has edges from all three so it only fires once all
  research is complete. This cuts wall-clock latency ~3x vs sequential.
- **Model fallback chain:** the decision node tries models in order on quota/404 errors:
  `gemini-2.0-flash-lite` → `gemini-2.5-flash-preview-05-20` → `gemini-2.5-pro-preview-05-06`
  → OpenRouter (if `OPENROUTER_API_KEY` is set). One exhausted model never kills the run.
- **Tools** (`lib/tools/`):
  - `stockData.js` — resolves a company name to a ticker via Yahoo's public search
    endpoint, then pulls a quote snapshot from `v8/finance/chart`. Uses proper
    browser-like headers with `Referer`/`Origin` and tries `query1` then `query2`
    as fallback to handle rate-limiting. Fully key-free.
  - `webSearch.js` — DuckDuckGo search with two layers: Instant Answer API first,
    HTML scraper fallback if that returns nothing. No API key, no rate limits.
    Returns a structured degraded result instead of throwing if both fail.
- **Structured decision:** raw JSON prompt forces the model to return a typed object
  (verdict enum, numeric confidence, arrays for bull/bear/risks/catalysts, reasoning
  chain). Works on all Gemini models including free tiers that don't support
  function calling.
- **API layer:** `app/api/research/route.js` — Next.js Route Handler (Node runtime),
  validates the request, calls `runInvestmentResearch()`, returns clear error messages
  for quota/invalid-key/timeout failures.
- **Frontend:** `app/page.jsx` — single client component. Tailwind CSS, no component
  library, styled like an analyst terminal (serif display, paper background, mono
  labels). Five tabs: Overview, Financials, Strategic Analysis, Reasoning Trace,
  Activity Log.

---

## 4. Key decisions & trade-offs

- **DuckDuckGo over Tavily for web search.** Tavily requires an API key and has a
  free-tier quota. DuckDuckGo is completely free with no signup — the agent uses the
  Instant Answer API first, then falls back to HTML scraping. Trade-off: DuckDuckGo
  returns shallower results than Tavily's deep search, but it means the project runs
  with zero external dependencies beyond a Google key.

- **Model fallback chain instead of a single model.** Free-tier Gemini models have
  per-minute and per-day quotas. Rather than failing hard on a 429, the agent tries
  the next available model automatically. Trade-off: slight latency increase on quota
  hits (2s delay between retries), but the run always completes.

- **Yahoo Finance v8/finance/chart with dual-host fallback.** Yahoo's v7 endpoint
  requires crumb/cookie auth. v8/finance/chart returns the same data from the `meta`
  field without auth. We try `query1.finance.yahoo.com` first and fall back to
  `query2.finance.yahoo.com` on 429/403. Proper browser headers (`Referer`, `Origin`,
  `Accept-Language`) prevent most blocks. Trade-off: unofficial endpoint, no SLA.

- **Structured output via raw JSON prompt** rather than `withStructuredOutput` + Zod.
  `withStructuredOutput` requires function-calling support which not all free Gemini
  models have. A raw JSON prompt with `extractJSON()` fallback (tries direct parse →
  markdown block → first `{...}` blob) works reliably across all models. Trade-off:
  slightly less type-safe at the boundary, but the output is validated and normalized
  before use.

- **Parallel fan-out over a ReAct loop.** A ReAct loop lets the LLM decide when to
  call tools. A fixed graph with three parallel deterministic nodes is faster
  (guaranteed parallelism), cheaper (fixed LLM calls per run), and easier to audit
  (deterministic trace). Trade-off: less adaptive — always runs the same three lookups.

- **Three verdicts (INVEST / PASS / WATCHLIST).** The brief says "invest or pass."
  WATCHLIST is added for genuinely mixed evidence — forcing binary on ambiguous cases
  produces a less honest answer. Noted as a deliberate deviation from the literal brief.

- **No persistence / no auth / no history.** Each run is stateless. For a take-home
  whose core ask is "build the agent," agent quality mattered more than a database
  schema. Left explicitly for "what I'd improve."

---

## 5. Example outputs

### Tata Motors
```
Verdict: WATCHLIST    Confidence: 62/100
Thesis: Strong EV and JLR momentum but the stock has re-rated sharply and
near-term demand signals are mixed — risk/reward not clearly favorable.

Bull: JLR turnaround driving margins | India EV leadership | Deleveraging balance sheet
Bear: Valuation above historical averages | CV/PV volume decelerating | Input cost volatility
```

### Nvidia
```
Verdict: INVEST       Confidence: 78/100
Thesis: Clear AI infrastructure leader with dominant data-center share and
widening CUDA moat — valuation rich but justified by growth visibility.

Bull: Dominant AI accelerator share | CUDA switching costs | Sovereign AI demand
Bear: Priced for hyper-growth | Hyperscaler concentration | Export-control risk
```

### Zomato
```
Verdict: PASS         Confidence: 58/100
Thesis: Food-delivery core healthy but Blinkit capex cycle is heavy and
margin-dilutive — valuation already prices in a smooth path to profitability.

Bull: Category leader in food delivery | Blinkit optionality | Asset-light model
Bear: Quick-commerce capex compresses margins | Intense competition | Regulatory risk
```

---

## 6. What I would improve with more time

- **Deeper search** — swap DuckDuckGo for a proper search API (Serper, Bing, Exa)
  for richer news snippets and more reliable competitive data.
- **Licensed financial data** (Financial Modeling Prep / Polygon) to fill in revenue
  growth, margins, and debt/equity — the schema has fields for these but leaves them
  null currently.
- **Streaming** via LangGraph's `astream_events` over Server-Sent-Events so the UI's
  activity log reflects real-time node completion instead of a cosmetic animation.
- **Report history** — persist past runs in Postgres/Supabase so users can revisit
  verdicts and diff how a thesis changed over time.
- **Automated evals** — a fixed set of companies re-run periodically to catch
  regressions in verdict quality when the prompt or model changes.
- **PDF export** — the output is naturally something a user wants to save or share.
- **Adaptive tool-calling mode** — let the model issue follow-up searches on specific
  angles (litigation, a named competitor) instead of a fixed three-lookup graph.

---

## 7. Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), React 18, Tailwind CSS, Framer Motion |
| Backend | Next.js Route Handler (Node runtime) |
| Agent orchestration | LangGraph.js (`@langchain/langgraph`) |
| LLM | Google Gemini via `@langchain/google-genai`, raw JSON structured output |
| Web search | DuckDuckGo Instant Answer API + HTML scraper (no key) |
| Market data | Yahoo Finance v8/finance/chart public endpoint (no key) |
| Fallback LLM | OpenRouter via `@langchain/openai` (optional) |

---

## 8. Repo structure

```
AI-Investment-Research-Agent/
├── app/
│   ├── api/research/route.js   # POST endpoint — validates request, runs agent
│   ├── globals.css             # Tailwind + Google Fonts
│   ├── layout.jsx              # Root layout with dark mode
│   └── page.jsx                # Full UI: 5-tab analyst dashboard
├── lib/
│   ├── agent.js                # LangGraph StateGraph + model fallback decision node
│   ├── types.js                # Shared type definitions
│   └── tools/
│       ├── stockData.js        # Yahoo Finance v8 ticker resolution + quote snapshot
│       └── webSearch.js        # DuckDuckGo search (Instant Answer API + HTML fallback)
├── server.js                   # Standalone Express server (alternative runner)
├── .env.example                # Key template
├── .env.local                  # Your actual keys (gitignored)
├── next.config.mjs             # serverComponentsExternalPackages for LangChain
├── package.json
├── BUILD_LOG.md                # Full build log + AI chat transcript
└── README.md
```
