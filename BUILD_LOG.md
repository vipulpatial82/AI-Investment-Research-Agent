# BUILD_LOG.md — AI Investment Research Agent
## Full Development Log + AI Chat Transcript

Complete build process including every prompt, decision, fix, and iteration made
while building this project using **Amazon Q Developer (AWS)** as the primary
AI pair-programmer inside VS Code.

---

## Session Overview

- **AI Used:** Amazon Q Developer (AWS)
- **IDE:** VS Code with Amazon Q plugin
- **Stack:** Next.js 14 + LangGraph.js + LangChain.js + Google Gemini
- **Search:** DuckDuckGo (free, no key) — replaced Tavily during build
- **Market data:** Yahoo Finance v8/finance/chart (no key)

---

## Full Chat Transcript

---

### [TURN 1] — Project Scoping

**Me:**
> AI Product Development Engineer (Intern) Take-Home Assignment — InsideIIM × Altuni AI Labs.
> Build an AI Investment Research Agent: takes a company name, does research, decides
> whether to invest or pass with reasoning. Stack: React/Next.js, Node.js, LangChain.js/LangGraph.js.

**Amazon Q:**
> Building as a Next.js App Router project with a LangGraph.js StateGraph that fans out
> three parallel research nodes (market data, news, competitive) into one structured
> decision node.
>
> Key decisions upfront:
> - LangGraph.js StateGraph — the brief wants agent orchestration, not a single prompt
> - Three parallel research nodes → one decision node (fan-out/fan-in)
> - Raw JSON structured output — verdict is a typed object, not free text
> - Yahoo Finance public endpoints for market data (no key needed)
> - Tavily for web search (optional, graceful degradation if key missing)

*[Scaffolded full project: package.json, lib/agent.js, lib/tools/stockData.js,
lib/tools/webSearch.js, app/api/research/route.js, app/page.jsx, app/layout.jsx,
globals.css, tailwind.config.ts, next.config.mjs, .env.example]*

---

### [TURN 2] — LangGraph Node Name Conflict

**Me:**
> Execution Failure: financials is already being used as a state attribute, cannot also be used as a node name.

**Amazon Q:**
> LangGraph doesn't allow a node to have the same name as a state key.
> Fix: rename nodes to fetchFinancials, fetchNews, fetchCompetitive.

*[Fixed buildGraph() — renamed all three nodes and edge references]*

---

### [TURN 3] — Switching to Google AI Studio

**Me:**
> Can I use Google AI Studio API?

**Amazon Q:**
> Yes. Installing @langchain/google-genai, updating getLLM() to use ChatGoogleGenerativeAI.

*[npm install @langchain/google-genai --legacy-peer-deps]*
*[Updated lib/agent.js: replaced ChatOpenAI with ChatGoogleGenerativeAI]*

---

### [TURN 4] — Module Not Found: @langchain/core standard_schema

**Me:**
> Module not found: Package path ./utils/standard_schema is not exported from @langchain/core

**Amazon Q:**
> Version mismatch — @langchain/google-genai needs a newer @langchain/core.
> Also: @langchain/community is deprecated, Tavily moved to @langchain/tavily.

*[Updated all @langchain/* to latest compatible versions]*
*[npm install @langchain/tavily --legacy-peer-deps]*
*[Updated webSearch.js: import TavilySearch from @langchain/tavily]*

---

### [TURN 5] — Invalid Google API Key (401)

**Me:**
> [GoogleGenerativeAI Error]: 401 Unauthorized — ACCESS_TOKEN_TYPE_UNSUPPORTED

**Amazon Q:**
> The key starting with `AQ.` is not a valid Google AI Studio key — those start with `AIza`.
> Go to https://aistudio.google.com/app/apikeys, create a key, paste it into .env.local.

*[Rewrote .env.local cleanly]*

---

### [TURN 6] — Yahoo Finance 401 on Quote Endpoint

**Me:**
> Quote fetch failed: Yahoo quote HTTP 401

**Amazon Q:**
> Yahoo Finance v7 now requires crumb/cookie auth. Switching to v8/finance/chart
> which returns the same data (price, marketCap, P/E, 52w range) from the meta
> field without any authentication.

*[Rewrote stockData.js: YAHOO_QUOTE_V8 = query2.finance.yahoo.com/v8/finance/chart,
reads from data.chart.result[0].meta]*

---

### [TURN 7] — Broken LangChain Dependency Tree

**Me:**
> npm install fails with ERESOLVE — @langchain/community v1 conflicts with langchain v0.3

**Amazon Q:**
> @langchain/community v1 requires @langchain/core v1, but langchain@0.3 requires
> @langchain/core@0.3. Fix: pin all packages to compatible versions, remove
> @langchain/community entirely (we only use @langchain/tavily now).

*[Rewrote package.json with pinned compatible versions]*
*[Clean reinstall: rmdir node_modules && del package-lock.json && npm install --legacy-peer-deps]*

---

### [TURN 8] — Next.js Config: Missing External Packages

**Me:**
> Fix all tabs — Overview / Financials / Strategic Analysis / Reasoning Trace / Activity Log.
> Also replace Next.js with Node.js.

**Amazon Q:**
> All 5 tabs are already built in page.jsx. The issue is next.config.mjs missing
> @langchain/google-genai and @langchain/tavily in serverComponentsExternalPackages.
> On "replace Next.js": the assignment mandates React/Next.js. Adding a standalone
> Express server.js as an alternative runner but keeping Next.js as primary.

*[Updated next.config.mjs: added all LangChain packages to serverComponentsExternalPackages]*
*[Created server.js: standalone Express server]*

---

### [TURN 9] — Yahoo Finance Blocked (403/429 from server-side)

**Me:**
> Fix this project, I did not get results from this website.

**Amazon Q:**
> Three issues found:
> 1. Google API key `AQ.Ab8R...` is invalid format (not AIza...)
> 2. Tavily key was placeholder `tvly-...`
> 3. Yahoo Finance blocking server-side requests — missing browser headers
>
> Fixed stockData.js: added proper Referer/Origin/Accept-Language headers,
> switched primary to query1.finance.yahoo.com with query2 as fallback,
> increased timeout to 8s.

*[Updated stockData.js: full browser-like headers, dual-host fallback, fetchYahoo() helper]*
*[Updated .env.local with clear instructions]*

---

### [TURN 10] — Gemini 429 Quota Exhausted

**Me:**
> [429 Too Many Requests] You exceeded your current quota — limit: 0, model: gemini-2.0-flash

**Amazon Q:**
> The free tier quota for gemini-2.0-flash is exhausted (resets daily).
> Fix: add a model fallback chain — try gemini-2.0-flash-lite first, then
> gemini-2.5-flash-preview, then gemini-2.5-pro-preview, then OpenRouter as
> last resort. Also switch default to gemini-2.0-flash-lite (separate quota pool).

*[Added GEMINI_FALLBACK_MODELS array to agent.js]*
*[Rewrote nodeDecision() to loop through models on 429/404, delay 1s between attempts]*
*[Added OpenRouter fallback after all Gemini models fail]*
*[Updated .env.local: GOOGLE_MODEL=gemini-2.0-flash-lite]*

---

### [TURN 11] — Syntax Error in route.js

**Me:**
> Return statement is not allowed here — route.js line 17

**Amazon Q:**
> Previous edit left a dangling `return` and orphaned `}` after the quota check block.
> The `if (msg.includes("API_KEY_INVALID"))` block was accidentally converted into
> a bare return statement. Fixed the full toPublicErrorMessage() function.

*[Fixed route.js: restored proper if/else structure in toPublicErrorMessage()]*

---

### [TURN 12] — Gemini 1.5 Flash 404 (Deprecated Model)

**Me:**
> [404 Not Found] models/gemini-1.5-flash is not found for API version v1beta

**Amazon Q:**
> gemini-1.5-flash is deprecated on v1beta. Updated fallback list to only use
> currently available models: gemini-2.0-flash-lite, gemini-2.5-flash-preview-05-20,
> gemini-2.5-pro-preview-05-06. Also updated fallback logic to skip on 404 (not
> just 429) and enabled OpenRouter in .env.local as final fallback.

*[Updated GEMINI_FALLBACK_MODELS in agent.js]*
*[Updated fallback condition: is429 || is404]*
*[Uncommented OPENROUTER_API_KEY in .env.local]*

---

### [TURN 13] — Replaced Tavily with DuckDuckGo

**Me:**
> Use DuckDuckGo (Tavily not working / no key)

**Amazon Q:**
> Rewrote webSearch.js to use DuckDuckGo — completely free, no API key needed.
> Two-layer approach:
> 1. DuckDuckGo Instant Answer API (structured JSON, fast)
> 2. HTML scraper fallback on html.duckduckgo.com/html/ if Instant Answer returns nothing
> Both layers return the same WebSearchOutcome shape so the rest of the agent is unchanged.

*[Rewrote lib/tools/webSearch.js: removed Tavily, added DDG Instant Answer + HTML scraper]*
*[Updated .env.local: marked TAVILY_API_KEY as no longer needed]*

---

### [TURN 14] — GitHub Push Blocked (Secret Detected)

**Me:**
> [remote rejected] main → main (push declined due to repository rule violations)

**Amazon Q:**
> GitHub's secret scanner detected a real API key in .env.example.
> The file had `GOOGLE_API_KEY=AQ.Ab8RN6Lt...` — a real (invalid) key committed
> to the example file. Fixed by replacing with placeholder, amending the commit
> to rewrite history, then force-pushing.

*[Fixed .env.example: replaced real key with `your-google-api-key-here`]*
*[git add .env.example && git commit --amend --no-edit]*
*[git push -u origin main --force]*

---

## Architecture Decisions

### Why LangGraph.js StateGraph instead of a single prompt
The brief says "does its research" — that implies multiple steps. LangGraph gives
us typed state, parallel execution, and an auditable trace. A single `llm.invoke()`
would not demonstrate agent orchestration.

### Why parallel fan-out (3 nodes → 1 decision) instead of ReAct loop
- **Faster**: guaranteed parallelism vs LLM calling tools one at a time
- **Cheaper**: fixed number of LLM/tool calls per run, no looping risk
- **Auditable**: deterministic trace, not a reconstruction of LLM decisions

### Why DuckDuckGo instead of Tavily
Tavily requires an API key with a free-tier quota. DuckDuckGo is completely free
with no signup. The Instant Answer API + HTML scraper fallback gives reasonable
news/competitive coverage for a take-home demo without any external dependency.

### Why model fallback chain
Free Gemini tiers have per-minute and per-day quotas. Rather than failing hard on
a 429, the agent tries the next available model automatically. One exhausted model
never kills the run.

### Why raw JSON prompt instead of withStructuredOutput + Zod
`withStructuredOutput` requires function-calling support which not all free Gemini
models have. A raw JSON prompt with `extractJSON()` (direct parse → markdown block
→ first `{...}` blob) works reliably across all models including free tiers.

### Why Yahoo Finance v8/finance/chart with dual-host fallback
Yahoo's v7 endpoint requires crumb/cookie auth. v8/finance/chart returns the same
data from the `meta` field without auth. Proper browser headers (Referer, Origin)
prevent most blocks. query1 → query2 fallback handles rate-limiting.

### Why WATCHLIST as a third verdict
Forcing binary INVEST/PASS on ambiguous cases produces a less honest answer.
WATCHLIST names the ambiguity explicitly. Noted as a deliberate deviation from
the literal brief.

---

## All Errors Hit During Build

| # | Error | Root Cause | Fix |
|---|-------|-----------|-----|
| 1 | `financials is already being used as a state attribute` | LangGraph node name = state key name | Renamed nodes to fetchFinancials/fetchNews/fetchCompetitive |
| 2 | `Module not found: ./utils/standard_schema` | @langchain/google-genai version mismatch | Updated all @langchain/* to latest compatible versions |
| 3 | `401 ACCESS_TOKEN_TYPE_UNSUPPORTED` | Wrong API key type (AQ. prefix, not AIza) | User needs AIza... key from aistudio.google.com |
| 4 | `Yahoo quote HTTP 401` | Yahoo Finance v7 requires crumb/cookie auth | Switched to v8/finance/chart endpoint |
| 5 | `ERESOLVE: @langchain/community v1 conflicts` | @langchain/community v1 requires @langchain/core v1 | Removed @langchain/community, pinned 0.3.x versions |
| 6 | `TavilySearchResults is not exported` | Tavily moved to @langchain/tavily, class renamed | Updated import to TavilySearch from @langchain/tavily |
| 7 | Yahoo Finance 403/429 from server-side | Missing browser headers (Referer, Origin) | Added full browser-like headers + query1/query2 fallback |
| 8 | `429 Too Many Requests` on gemini-2.0-flash | Free tier daily quota exhausted | Added model fallback chain + OpenRouter last resort |
| 9 | `Return statement is not allowed here` in route.js | Malformed if/else block from previous edit | Fixed toPublicErrorMessage() structure |
| 10 | `404 Not Found` on gemini-1.5-flash | Model deprecated on v1beta | Updated fallback list to current v1beta models only |
| 11 | GitHub push rejected (secret detected) | Real API key committed in .env.example | Replaced with placeholder, amended commit, force-pushed |

---

## Final File Structure

```
AI-Investment-Research-Agent/
├── app/
│   ├── api/research/route.js   # POST endpoint — validates request, runs agent, clear error messages
│   ├── globals.css             # Tailwind + Google Fonts (Lora, JetBrains Mono)
│   ├── layout.jsx              # Root layout with dark mode
│   └── page.jsx                # 5-tab analyst dashboard (Overview/Financials/
│                               #   Strategic Analysis/Reasoning Trace/Activity Log)
├── lib/
│   ├── agent.js                # LangGraph StateGraph: 3 parallel nodes → decision
│   │                           # Model fallback: flash-lite → 2.5-flash → 2.5-pro → OpenRouter
│   ├── types.js                # Shared type definitions
│   └── tools/
│       ├── stockData.js        # Yahoo Finance v8 — dual-host fallback, browser headers
│       └── webSearch.js        # DuckDuckGo — Instant Answer API + HTML scraper fallback
├── server.js                   # Standalone Express server (alternative to Next.js)
├── .env.example                # Key template (no real keys)
├── .env.local                  # Actual keys (gitignored)
├── next.config.mjs             # serverComponentsExternalPackages for all LangChain pkgs
├── package.json                # Pinned compatible LangChain 0.3.x versions
├── tailwind.config.ts
├── BUILD_LOG.md                # This file
└── README.md
```

---

## How to Run

```bash
# 1. Install
npm install --legacy-peer-deps

# 2. Set keys in .env.local
GOOGLE_API_KEY=AIzaSy...   # from https://aistudio.google.com/app/apikeys (required)
GOOGLE_MODEL=gemini-2.0-flash-lite   # optional

# 3. Run
npm run dev   # → http://localhost:3000
```
