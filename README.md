# The Analyst — AI Investment Research Agent

Built for the InsideIIM × Altuni AI Labs "AI Product Development Engineer (Intern)" take-home.

Give it a company name. It resolves the ticker and pulls a live market snapshot,
researches recent news/earnings and the competitive landscape, then makes a
LangGraph.js agent commit to one of three verdicts — **INVEST / PASS /
WATCHLIST** — with a full, inspectable reasoning trace, bull/bear cases,
risks, catalysts, and sources.

---

## 1. Overview

**What it does:**

1. You type a company name (e.g. "Tata Motors", "Nvidia", "Zomato") and pick a
   risk profile + time horizon.
2. A LangGraph.js agent runs three research steps **in parallel**:
   - **Market data** — resolves the ticker and pulls price, market cap, P/E,
     52-week range (Yahoo Finance public endpoints, no key required).
   - **News research** — recent news, earnings, outlook (Tavily web search).
   - **Competitive research** — competitors, industry positioning (Tavily web
     search).
3. Those three results are handed to an LLM (Google Gemini, via LangChain.js) which
   is forced to return a **structured verdict object** (via
   `withStructuredOutput` + a Zod schema) — not just free-form text. That
   object contains the verdict, a confidence score, thesis summary, bull
   case, bear case, risks, catalysts, suggested horizon, a position note, and
   a step-by-step reasoning chain.
4. The frontend renders the verdict as an "analyst terminal" style report,
   plus a transparency panel showing exactly what the agent did at each
   stage and which sources it used.

**Why this shape:** the assignment explicitly says "how you build it is
entirely up to you," so I optimized for two things a hiring team would
actually want to see: (a) a real multi-step **agent graph** (not a single
prompt-and-print script), and (b) a decision that is **structured, auditable,
and falsifiable** — you can see exactly why it said INVEST vs PASS, and check
that against the sources it used.

---

## 2. How to run it

### Prerequisites
- Node.js 18.18+ (built/tested on Node 22)
- A Google Gemini API key (required)
- A Tavily API key (optional, but strongly recommended — see below)

### Setup

```bash
cd investment-research-agent
npm install --legacy-peer-deps   # see "why --legacy-peer-deps" below
cp .env.example .env.local
```

Edit `.env.local`:

```bash
GOOGLE_API_KEY=your-google-api-key   # required
GOOGLE_MODEL=gemini-2.0-flash        # optional
TAVILY_API_KEY=tvly-...          # optional but recommended (https://tavily.com — free tier)
LLM_TIMEOUT_MS=45000             # optional
LLM_MAX_RETRIES=2                # optional
```

> **No key needed for market data.** Price/market-cap/P/E/52-week-range come
> from Yahoo Finance's public, unauthenticated quote endpoints
> (`lib/tools/stockData.ts`). This is a reasonable choice for a take-home;
> see "Key decisions & trade-offs" for why I wouldn't ship this exact
> integration to production as-is.

> **Without `TAVILY_API_KEY`:** the agent still runs end-to-end. The news and
> competitive research nodes detect the missing key, skip the live search,
> and clearly flag in both the agent activity log and the reasoning trace
> that the LLM fell back to its own (possibly stale) training knowledge for
> that step. It never silently pretends to have live data it doesn't have.

### Run locally

```bash
npm run dev
```

Open **http://localhost:3000**, type a company name, hit "Run research
agent."

### Build for production / deploy

```bash
npm run build
npm start
```

**Vercel:** push this folder to a GitHub repo, import it in Vercel, add
`GOOGLE_API_KEY` (and optionally `TAVILY_API_KEY`, `GOOGLE_MODEL`) as
Environment Variables, deploy. No other config needed — it's a standard
Next.js App Router project with one serverless API route.

**Why `--legacy-peer-deps`:** `langchain`/`@langchain/community` declare an
optional peer on `typeorm` → `better-sqlite3`, and two transitive packages
disagree on its version range. It's a peer-dependency resolution conflict on
an **optional** dependency we don't use (we don't touch SQL/vector stores
here), not a real incompatibility — `--legacy-peer-deps` is the standard fix
and the app builds and runs clean with it.

---

## 3. How it works — architecture

```
                         ┌──────────────┐
                  ┌─────▶│  financials   │── Yahoo Finance (ticker + quote)
                  │      └──────────────┘
   START ─────────┼─────▶│    news      │── Tavily web search
                  │      └──────────────┘
                  └─────▶│ competitive  │── Tavily web search
                         └──────────────┘
                                │  (all three feed in)
                                ▼
                         ┌──────────────┐
                         │   decision    │── Google Gemini, withStructuredOutput(Zod)
                         └──────────────┘
                                │
                                ▼
                               END
```

- **Framework:** LangGraph.js `StateGraph` (`lib/agent.ts`). State is a typed
  `Annotation.Root` with reducers for arrays (sources, stage logs get
  appended/merged automatically as nodes run).
- **Fan-out / fan-in:** `financials`, `news`, and `competitive` all start
  from `START` and run independently (LangGraph parallelizes them); `decision`
  has edges from all three, so it only runs once all research is in. This
  cuts wall-clock latency roughly 3x vs. running them sequentially.
- **Tools** (`lib/tools/`):
  - `stockData.ts` — resolves a free-text company name to a ticker via
    Yahoo's public search endpoint, then pulls a quote snapshot. Fully
    key-free, with graceful degradation notes if lookup/quote fails.
  - `webSearch.ts` — thin wrapper around LangChain's Tavily search tool.
    Normalizes results into a shared `SourceRef` shape used by the UI, and
    returns a structured "degraded" result (instead of throwing) if no API
    key is configured or the call fails, so one flaky tool never crashes the
    whole graph run.
- **Structured decision:** the `decision` node uses
  `ChatGoogleGenerativeAI(...).withStructuredOutput(VerdictSchema)` where `VerdictSchema`
  is a Zod schema enumerating verdict, confidence, thesis, bull/bear
  case arrays, risks, catalysts, horizon, position note, and a reasoning
  chain. This is the single most important design choice in the project —
  see below.
- **API layer:** one route, `app/api/research/route.ts` (Next.js Route
  Handler, Node runtime), validates the request and calls
  `runInvestmentResearch()`.
- **Frontend:** `app/page.tsx`, a single client component. Plain Tailwind,
  no component library, deliberately styled like an analyst note (serif
  display type, paper background, mono labels) rather than a generic
  chat-bot UI, to fit the "investment research" domain.

---

## 4. Key decisions & trade-offs

- **Structured output over free-text generation.** I forced the model to
  return a typed object (verdict enum, numeric confidence, arrays for
  bull/bear/risks/catalysts, reasoning chain) via `withStructuredOutput`
  rather than asking for a markdown report and parsing/regexing it. This
  makes the output reliable to render, testable, and composable (e.g. you
  could batch-run this over 50 companies and get a clean CSV). Trade-off:
  the output is slightly more rigid/less "narrative" than a free-form
  analyst report.
- **Parallel fan-out research over a single tool-calling ReAct loop.**
  I considered giving the LLM raw search/quote tools and letting it decide
  when to call them (a classic ReAct agent). I chose a **fixed graph** with
  three parallel deterministic research nodes feeding one decision node
  instead, because: (a) it's faster (guaranteed parallelism vs. an LLM
  deciding to call tools one at a time), (b) it's cheaper and more
  predictable (fixed number of LLM/tool calls per run, no risk of the model
  looping or under-researching), and (c) it's easier to audit — the
  "activity log" the UI shows is a deterministic trace of exactly what ran,
  not a reconstruction of an agent's internal tool-call decisions. Trade-off:
  it's less adaptive — it always runs the same three lookups regardless of
  company type, so it won't, say, decide unprompted to also check a
  pending-litigation angle for one company. A `condition`-routed graph (or a
  true tool-calling loop as an alternate "deep research" mode) is the
  natural next step — see Section 6.
- **Yahoo Finance's unauthenticated quote endpoints for market data**, not a
  paid financial data API. This keeps the project runnable with **zero
  fixed cost / zero extra signup** beyond a Google key, which matters for a
  take-home a reviewer needs to actually run. Trade-off: this is an
  unofficial/undocumented endpoint — no SLA, can rate-limit or change
  without notice, and only returns a thin slice of fundamentals (no
  revenue-growth, margins, or debt/equity, which the schema has fields for
  but I leave `null` and disclose in the UI rather than fabricate). For
  production I'd swap this for a licensed provider (e.g. Financial Modeling
  Prep, Polygon.io, or a Bloomberg/Refinitiv feed depending on budget) behind
  the same `FinancialSnapshot` interface — the rest of the app wouldn't
  need to change.
- **Tavily for web search**, made optional rather than required. I wanted the
  app to still be runnable and honest with just a Google key (some
  reviewers may not want to sign up for a second service). When Tavily is
  absent, the agent explicitly labels which sections ran on "model
  knowledge only" instead of silently pretending it did live research —
  I considered this a hard requirement for an investment tool: a confident
  wrong answer is worse than a flagged uncertain one.
  What I did not do: I did not add a second/backup search provider (e.g.
  SerpAPI, Bing) as automatic failover — with more time this would remove
  the single point of failure on research quality.
  - **Watch a company** ties are broken conservatively — WATCHLIST is only
  used when the model genuinely can't reach a confident INVEST/PASS; I
  explicitly instruct the model not to hedge into "it depends" without
  committing to a verdict, because the assignment asks for a decision, not a
  survey.
- **Three verdicts (INVEST / PASS / WATCHLIST), not just two.** The brief
  says "decides whether to invest or pass." I added WATCHLIST as an explicit
  third state for genuinely mixed evidence, because forcing a binary INVEST/
  PASS on ambiguous cases (e.g., great business, obviously overvalued right
  now) produces a less honest and less useful answer than naming the
  ambiguity. This is a deliberate deviation from the literal two-option
  brief — noted here as instructed for ambiguous requirements.
- **No persistence / no auth / no history.** Each run is stateless — there's
  no database, no saved report history, no user accounts. For a 7-day
  take-home whose core ask is "build the agent," I judged that spending time
  on the agent quality and the structured-output contract mattered more than
  a Postgres schema for saved reports. Left explicitly for "what I'd improve"
  below.
- **No streaming of intermediate agent output.** The UI shows a short
  animated "what's happening" list while waiting, but it's cosmetic, not a
  live token/stage stream from the server. A true `astream_events` /
  Server-Sent-Events integration (LangGraph.js supports this) would make the
  three parallel research steps visibly resolve independently in the UI —
  noted in "what I'd improve."

---

## 5. Example runs

These are representative outputs from real runs of the agent (Google Gemini + Tavily
search enabled). Full JSON responses are abbreviated
here for readability; the UI renders the complete object.

### Tata Motors

```
Verdict: WATCHLIST          Confidence: 62/100
Thesis: Tata Motors has strong EV and JLR-driven volume momentum and a
recovering balance sheet, but the stock has already re-rated sharply and
near-term demand signals in the domestic CV/PV segments are mixed, so the
risk/reward at current levels is not clearly favorable enough for a fresh
buy.

Bull case:
 - JLR turnaround continues to drive consolidated margins higher
 - Strong position in India's fast-growing EV passenger segment
 - Deleveraging balance sheet reduces a long-standing overhang

Bear case:
 - Valuation has already re-rated well above historical averages
 - Domestic PV/CV volume growth has been decelerating quarter-over-quarter
 - Global auto demand and input-cost volatility remain a swing factor

Key risks: China EV competition intensifying in exports; JLR demand
concentrated in a few markets; capex-heavy EV transition pressuring
near-term free cash flow.

Catalysts: Upcoming quarterly earnings/JLR volume print; new EV model
launches; commentary on capex/debt trajectory.
```

### Nvidia

```
Verdict: INVEST              Confidence: 78/100
Thesis: Nvidia remains the clear infrastructure leader for AI compute with
dominant data-center share and a widening software/CUDA moat; near-term
valuation is rich but justified by growth visibility, making this a
conviction position sized for volatility rather than a value entry.

Bull case:
 - Dominant, defensible share of AI accelerator/data-center compute
 - CUDA software ecosystem creates high switching costs for customers
 - Multiple demand drivers beyond hyperscalers (sovereign AI, enterprise)

Bear case:
 - Priced for continued hyper-growth — any deceleration hits multiple hard
 - Customer concentration among a handful of hyperscaler buyers
 - Export-control and geopolitical risk to a meaningful revenue segment

Key risks: Custom silicon (in-house hyperscaler chips) eroding share over
time; regulatory/export restrictions; a cyclical AI-capex pause.

Catalysts: Hyperscaler capex guidance each earnings season; next-gen chip
launch cadence; any easing/tightening of export rules.
```

### Zomato

```
Verdict: PASS                Confidence: 58/100
Thesis: Zomato's food-delivery core is healthy but the quick-commerce
(Blinkit) investment cycle is heavy and margin-dilutive for longer than the
market may be pricing in, and current valuation already assumes a smooth,
fast path to group-level profitability — that combination skews the
near-term risk/reward unfavorably.

Bull case:
 - Category leader in Indian food delivery with improving unit economics
 - Blinkit gives genuine optionality in a large quick-commerce market
 - Asset-light delivery model scales profitability with volume

Bear case:
 - Quick-commerce capex/opex is heavy and compresses group margins now
 - Intense, well-funded competition in quick commerce keeps pricing tight
 - Valuation already prices in a smooth path to sustained group profits

Key risks: Blinkit dark-store expansion burning cash faster than planned;
new/aggressive entrants in quick commerce; regulatory scrutiny of gig-worker
economics.

Catalysts: Blinkit segment profitability trajectory each quarter;
competitor funding/pricing moves; any regulatory change on gig-work status.
```

> Note: numbers/specifics above reflect what the model produced during
> development runs and are illustrative of output *shape and quality*, not a
> live, timestamped market call — re-running the agent today will pull
> fresh data and may reasonably reach a different verdict.

---

## 6. What I would improve with more time

- **True adaptive tool-calling ("deep research") mode** — let the model
  decide to issue follow-up searches (e.g., dig into a specific lawsuit or
  a specific competitor mentioned in the first pass) instead of a fixed
  three-lookup graph, with a step cap so it can't run away.
- **Licensed financial data** (Financial Modeling Prep / Polygon / a proper
  fundamentals API) to fill in revenue growth, margins, and debt/equity,
  which the schema already has fields for but currently leaves null.
- **Streaming the graph** via LangGraph's `astream_events` over
  Server-Sent-Events so the UI's "activity log" reflects real-time node
  completion instead of a cosmetic fixed animation.
- **Report history + comparison** — persist past runs (e.g. in Postgres/
  Supabase) so a user can revisit a verdict later or diff how the thesis on
  a company changed over successive runs.
- **Automated evals** — a small fixed set of companies with known
  fundamentals, re-run periodically, to catch regressions in verdict quality
  when the prompt or model changes (this is what I'd build first if this
  became a real product feature rather than a demo).
- **Multi-source search failover** (Tavily → SerpAPI/Bing) so news/
  competitive research doesn't have a single point of failure.
- **PDF/shareable report export**, since a research agent's output is
  naturally something a user wants to save or send, not just view in-app.

---

## 7. Tech stack used

- **Frontend:** Next.js 14 (App Router), React 18, Tailwind CSS
- **Backend:** Next.js Route Handler (Node runtime)
- **Agent orchestration:** LangGraph.js (`@langchain/langgraph`)
- **LLM:** Google Gemini via LangChain.js (`@langchain/google-genai`), structured output
  via Zod
- **Search:** Tavily (`@langchain/community`)
- **Market data:** Yahoo Finance public endpoints (no key)

---

## 8. Repo structure

```
investment-research-agent/
├── app/
│   ├── api/research/route.ts   # POST endpoint that runs the agent
│   ├── layout.tsx
│   ├── page.tsx                 # UI
│   └── globals.css
├── lib/
│   ├── agent.ts                 # LangGraph.js StateGraph + decision node
│   ├── types.ts                 # shared types
│   └── tools/
│       ├── stockData.ts         # ticker resolution + quote snapshot
│       └── webSearch.ts         # Tavily wrapper w/ graceful fallback
├── .env.example
├── BUILD_LOG.md                  # development log / how AI was used to build this
├── package.json
└── README.md                     # this file
```

See **`BUILD_LOG.md`** for the running log of the actual build process and
the decisions made along the way (bonus section: how AI was used while
building).
