<div align="center">

# 🔍 The Analyst
### AI Investment Research Agent

[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![LangGraph](https://img.shields.io/badge/LangGraph.js-Agent-blue?style=for-the-badge)](https://langchain-ai.github.io/langgraphjs/)
[![Gemini](https://img.shields.io/badge/Google-Gemini-4285F4?style=for-the-badge&logo=google)](https://aistudio.google.com)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)


</div>

---

## ✨ What It Does

Type any company name (e.g. `Nvidia`, `Tata Motors`, `Zomato`), pick a risk profile and time horizon — the agent does the rest:

1. **Resolves the ticker** and pulls a live market snapshot (price, market cap, P/E, 52-week range)
2. **Researches recent news** — earnings, outlook, macro sentiment
3. **Maps the competitive landscape** — peers, industry positioning, moat analysis
4. **Synthesizes a structured verdict** — `INVEST`, `PASS`, or `WATCHLIST` with a confidence score, thesis, bull/bear cases, risks, catalysts, and a step-by-step reasoning chain

> **Zero API keys beyond Google Gemini.** Market data = Yahoo Finance (free). Web search = DuckDuckGo (free, no signup).

---

## 🖥️ Demo

| Overview | Strategic Analysis | Reasoning Trace |
|----------|-------------------|-----------------|
| Verdict banner, confidence gauge, market snapshot | Bull/Bear cases, risks, catalysts | Step-by-step agent reasoning chain |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18.18+ (tested on Node 22)
- Google Gemini API key — **free** at [aistudio.google.com/app/apikeys](https://aistudio.google.com/app/apikeys)

### Installation

```bash
git clone https://github.com/vipulpatial82/AI-Investment-Research-Agent.git
cd AI-Investment-Research-Agent
npm install --legacy-peer-deps
cp .env.example .env.local
```

### Configuration

Edit `.env.local`:

```env
# Required — get free key at https://aistudio.google.com/app/apikeys
GOOGLE_API_KEY=AIzaSy...

# Optional — defaults to gemini-2.0-flash-lite
GOOGLE_MODEL=gemini-2.0-flash-lite
```

> No other keys needed. DuckDuckGo and Yahoo Finance are both free with no signup.

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), type a company name, hit **Run Analysis Agent**.

### Deploy to Vercel

```bash
# Push to GitHub, then import in Vercel
# Add GOOGLE_API_KEY as an Environment Variable — that's it
```

---

## 🏗️ Architecture

```
                    ┌──────────────────┐
             ┌─────▶│  fetchFinancials  │── Yahoo Finance (ticker + quote, no key)
             │      └──────────────────┘
START ───────┼─────▶│    fetchNews      │── DuckDuckGo (free, no key)
             │      └──────────────────┘
             └─────▶│  fetchCompetitive │── DuckDuckGo (free, no key)
                    └──────────────────┘
                           │  all three run in parallel
                           ▼
                    ┌──────────────────┐
                    │     decision      │── Google Gemini (model fallback chain)
                    └──────────────────┘
                           │
                           ▼
                          END
```

### How it works

| Component | Details |
|-----------|---------|
| **Agent framework** | LangGraph.js `StateGraph` with typed `Annotation.Root` state and array reducers |
| **Parallelism** | All 3 research nodes fan out from `START` simultaneously — ~3x faster than sequential |
| **Model fallback** | `gemini-2.0-flash-lite` → `gemini-2.5-flash-preview` → `gemini-2.5-pro-preview` → OpenRouter |
| **Market data** | Yahoo Finance `v8/finance/chart` — browser-like headers, `query1`→`query2` fallback |
| **Web search** | DuckDuckGo Instant Answer API → HTML scraper fallback → graceful degradation |
| **Structured output** | Raw JSON prompt + `extractJSON()` — works on all Gemini tiers including free |
| **API layer** | Next.js Route Handler (Node runtime) with clear quota/key/timeout error messages |
| **Frontend** | Single React component, Tailwind CSS, analyst terminal aesthetic, 5 tabs |

---

## 📊 Example Outputs

<details>
<summary><b>Nvidia — INVEST (78/100)</b></summary>

```
Verdict:  INVEST
Confidence: 78/100
Thesis: Clear AI infrastructure leader with dominant data-center share and widening
CUDA moat — valuation rich but justified by growth visibility.

Bull Case:
  • Dominant AI accelerator share with no near-term challenger
  • CUDA software ecosystem creates deep switching costs
  • Sovereign AI and enterprise demand expanding beyond hyperscalers

Bear Case:
  • Priced for continued hyper-growth — any deceleration hits multiple hard
  • Customer concentration among a handful of hyperscaler buyers
  • Export-control and geopolitical risk to a meaningful revenue segment
```
</details>

<details>
<summary><b>Tata Motors — WATCHLIST (62/100)</b></summary>

```
Verdict:  WATCHLIST
Confidence: 62/100
Thesis: Strong EV and JLR momentum but the stock has re-rated sharply and
near-term demand signals are mixed — risk/reward not clearly favorable.

Bull Case:
  • JLR turnaround continues to drive consolidated margins higher
  • Strong position in India's fast-growing EV passenger segment
  • Deleveraging balance sheet reduces a long-standing overhang

Bear Case:
  • Valuation has already re-rated well above historical averages
  • Domestic PV/CV volume growth decelerating quarter-over-quarter
  • Global auto demand and input-cost volatility remain a swing factor
```
</details>

<details>
<summary><b>Zomato — PASS (58/100)</b></summary>

```
Verdict:  PASS
Confidence: 58/100
Thesis: Food-delivery core healthy but Blinkit capex cycle is heavy and
margin-dilutive — valuation already prices in a smooth path to profitability.

Bull Case:
  • Category leader in Indian food delivery with improving unit economics
  • Blinkit gives genuine optionality in a large quick-commerce market
  • Asset-light delivery model scales profitability with volume

Bear Case:
  • Quick-commerce capex compresses group margins now
  • Intense, well-funded competition keeps pricing tight
  • Valuation already prices in a smooth path to sustained group profits
```
</details>

---

## 🔑 Key Design Decisions

**DuckDuckGo over Tavily** — Tavily requires an API key with a free-tier quota. DuckDuckGo is completely free with no signup. The agent uses the Instant Answer API first, then falls back to HTML scraping. Trade-off: shallower results, but zero external dependencies beyond a Google key.

**Model fallback chain** — Free Gemini tiers have per-minute and per-day quotas. Rather than failing hard on a 429, the agent automatically tries the next available model in this order:

| Priority | Model | Triggers when |
|----------|-------|---------------|
| 1st | `gemini-2.0-flash-lite` | Always tried first |
| 2nd | `gemini-2.5-flash-preview-05-20` | 1st hits 429 quota or 404 |
| 3rd | `gemini-2.5-pro-preview-05-06` | 2nd also fails |
| 4th | OpenRouter `gpt-4o-mini` | All Gemini models fail |

One exhausted model never kills the run.

**Raw JSON prompt over `withStructuredOutput` + Zod** — `withStructuredOutput` requires function-calling support which not all free Gemini models have. A raw JSON prompt with `extractJSON()` works reliably across all models.

**Parallel fan-out over ReAct loop** — Fixed graph with 3 parallel deterministic nodes is faster (guaranteed parallelism), cheaper (fixed LLM calls), and easier to audit (deterministic trace) than a ReAct loop.

**Three verdicts (INVEST / PASS / WATCHLIST)** — The brief says "invest or pass." WATCHLIST is added for genuinely mixed evidence — forcing binary on ambiguous cases produces a less honest answer. *Deliberate deviation from the literal brief.*

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), React 18, Tailwind CSS, Framer Motion |
| Backend | Next.js Route Handler (Node runtime) |
| Agent | LangGraph.js (`@langchain/langgraph`) |
| LLM | Google Gemini via `@langchain/google-genai` |
| Web Search | DuckDuckGo Instant Answer API + HTML scraper (no key) |
| Market Data | Yahoo Finance `v8/finance/chart` public endpoint (no key) |
| Fallback LLM | OpenRouter via `@langchain/openai` (optional) |

---

## 📁 Repo Structure

```
AI-Investment-Research-Agent/
├── app/
│   ├── api/research/route.js   # POST endpoint — validates request, runs agent
│   ├── globals.css             # Tailwind + Google Fonts
│   ├── layout.jsx              # Root layout with dark mode
│   └── page.jsx                # 5-tab analyst dashboard UI
├── lib/
│   ├── agent.js                # LangGraph StateGraph + model fallback chain
│   ├── types.js                # Shared type definitions
│   └── tools/
│       ├── stockData.js        # Yahoo Finance v8 — dual-host fallback
│       └── webSearch.js        # DuckDuckGo — Instant Answer + HTML scraper
├── server.js                   # Standalone Express server (alternative runner)
├── .env.example                # Key template
├── next.config.mjs             # serverComponentsExternalPackages for LangChain
├── package.json
├── BUILD_LOG.md                # Full build log + AI chat transcript
└── README.md
```

---

## 🔮 What I'd Improve With More Time

- **Deeper search** — swap DuckDuckGo for Serper/Bing/Exa for richer news snippets
- **Licensed financial data** — Financial Modeling Prep / Polygon for revenue growth, margins, debt/equity
- **Real-time streaming** — LangGraph `astream_events` over SSE so the activity log shows live node completion
- **Report history** — persist runs in Postgres/Supabase to revisit and diff verdicts over time
- **Automated evals** — fixed company set re-run periodically to catch verdict quality regressions
- **PDF export** — research output is naturally something users want to save and share
- **Adaptive tool-calling** — let the model issue follow-up searches on specific angles instead of fixed 3-lookup graph

---

## ⚠️ Disclaimer

This tool is for educational and demonstration purposes only. Output is derived from public market feeds and automated research. It does not constitute formal investment advice.

---

---

## 📦 Built With

**Frontend**
- [Next.js 14](https://nextjs.org) — App Router, React Server Components
- [React 18](https://react.dev) — UI framework
- [Tailwind CSS 3](https://tailwindcss.com) — utility-first styling
- [Framer Motion 11](https://www.framer.com/motion/) — animations
- [Lucide React](https://lucide.dev) — icons

**Backend**
- [Next.js Route Handler](https://nextjs.org/docs/app/building-your-application/routing/route-handlers) — Node.js serverless API
- [Express 4](https://expressjs.com) — standalone server alternative (`server.js`)

**AI / Agent**
- [LangGraph.js](https://langchain-ai.github.io/langgraphjs/) (`@langchain/langgraph`) — agent state graph orchestration
- [LangChain.js](https://js.langchain.com) (`langchain`, `@langchain/core`) — LLM abstraction layer
- [Google Gemini](https://aistudio.google.com) (`@langchain/google-genai`) — primary LLM
- [OpenRouter](https://openrouter.ai) (`@langchain/openai`) — fallback LLM provider (optional)

**Data & Search**
- [Yahoo Finance](https://finance.yahoo.com) — public `v8/finance/chart` endpoint for live market data (no key)
- [DuckDuckGo](https://duckduckgo.com) — Instant Answer API + HTML scraper for news & competitive research (no key)

**Utilities**
- [Zod 3](https://zod.dev) — schema validation
- [dotenv 16](https://github.com/motdotla/dotenv) — environment variable management

**Dev Tools**
- [TypeScript 6](https://www.typescriptlang.org) — type checking
- [PostCSS](https://postcss.org) + [Autoprefixer](https://github.com/postcss/autoprefixer) — CSS processing

---

<div align="center">
  <sub>Made by <a href="https://github.com/vipulpatial82">Vipul Patial</a></sub>
</div>
