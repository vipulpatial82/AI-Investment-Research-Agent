# BUILD_LOG.md — AI Investment Research Agent
## Full LLM Chat Session Transcript + Development Log

This file documents the **complete build process** including every prompt,
decision, fix, and iteration made while building this project using
**Amazon Q (AWS AI assistant)** as the primary AI pair-programmer inside
VS Code. This is the bonus transcript the assignment asks for.

---

## Session Overview

- **AI Used:** Amazon Q Developer (AWS)
- **IDE:** VS Code with Amazon Q plugin
- **Stack:** Next.js 14 + LangGraph.js + LangChain.js + Google Gemini (AI Studio)
- **Total build time:** ~1 working session

---

## Full Chat Transcript

---

### [TURN 1] — Project Scoping

**Me:**
> AI Product Development Engineer (Intern) Take-Home Assignment — InsideIIM × Altuni AI Labs.
> Build an AI Investment Research Agent: it takes a company name, does its research, and decides
> whether to invest or pass — with the reasoning behind its decision.
> Tech stack: React or Next.js (front end), Node.js or Next.js (back end), LangChain.js / LangGraph.js.
> Use React, Node.js and also AI model that is provided.

**Amazon Q:**
> Looking at the assignment. I'll build this as a Next.js App Router project with a LangGraph.js
> StateGraph that fans out three parallel research nodes (market data, news, competitive) into one
> structured decision node. Let me scaffold the full project.
>
> Key decisions I'm making upfront:
> - LangGraph.js StateGraph (not a single prompt) — the brief wants to see agent orchestration
> - Three parallel research nodes → one decision node (fan-out/fan-in pattern)
> - Structured output via Zod + withStructuredOutput — verdict is a typed object, not free text
> - Yahoo Finance public endpoints for market data (no key needed)
> - Tavily for web search (optional, graceful degradation if key missing)

*[Amazon Q scaffolded the full project: package.json, lib/agent.js, lib/tools/stockData.js,
lib/tools/webSearch.js, app/api/research/route.js, app/page.jsx, app/layout.jsx, globals.css,
tailwind.config.ts, next.config.mjs, .env.example]*

---

### [TURN 2] — LangGraph Node Name Conflict

**Me:**
> Execution Failure: financials is already being used as a state attribute (a.k.a. a channel),
> cannot also be used as a node name.

**Amazon Q:**
> The problem is clear — LangGraph doesn't allow a node to have the same name as a state key.
> The node is named "financials" and the state has a key `financials`. Fix: rename the three
> nodes to `fetchFinancials`, `fetchNews`, `fetchCompetitive` — distinct from any state key.

*[Fixed buildGraph() — renamed all three nodes and their corresponding edge references]*

---

### [TURN 3] — Switching from OpenAI to Google AI Studio

**Me:**
> Can I use simple Google AI Studio API?

**Amazon Q:**
> Yes, Google AI Studio (Gemini) works. LangChain has a dedicated package for it.
> Installing @langchain/google-genai and updating getLLM() to use ChatGoogleGenerativeAI.
> Updated .env.example with GOOGLE_API_KEY / GOOGLE_BASE_URL / GOOGLE_MODEL vars.

*[Ran: npm install @langchain/google-genai --legacy-peer-deps]*
*[Updated lib/agent.js: replaced ChatOpenAI import with ChatGoogleGenerativeAI]*
*[Updated .env.example with Google AI Studio instructions]*

---

### [TURN 4] — Module Not Found: @langchain/core standard_schema

**Me:**
> Module not found: Package path ./utils/standard_schema is not exported from package
> @langchain/core. Import trace: @langchain/google-genai → lib/agent.js → route.js

**Amazon Q:**
> Version mismatch — @langchain/google-genai needs a newer @langchain/core.
> Updating all langchain packages to latest simultaneously.
> Also: @langchain/community is deprecated, Tavily moved to @langchain/tavily.

*[Ran: npm install @langchain/core@latest @langchain/google-genai@latest @langchain/langgraph@latest @langchain/openai@latest @langchain/community@latest --legacy-peer-deps]*
*[Ran: npm install @langchain/tavily --legacy-peer-deps]*
*[Updated webSearch.js: import from @langchain/tavily, class TavilySearch (not TavilySearchResults)]*

---

### [TURN 5] — 401 Unauthorized: Invalid Google API Key

**Me:**
> [GoogleGenerativeAI Error]: 401 Unauthorized — ACCESS_TOKEN_TYPE_UNSUPPORTED

**Amazon Q:**
> The key starting with `AQ.` is not a valid Google AI Studio API key — those start with `AIza`.
> It looks like a different service's OAuth token. You need to:
> 1. Go to https://aistudio.google.com/app/apikeys
> 2. Click "Create API key"
> 3. Copy the key — it will start with `AIza`
> 4. Paste into .env.local as GOOGLE_API_KEY=AIza...

*[Rewrote .env.local cleanly without trailing semicolons]*

---

### [TURN 6] — Yahoo Finance 401 on Quote Endpoint

**Me:**
> In financials I got: Quote fetch failed: Yahoo quote HTTP 401

**Amazon Q:**
> Yahoo Finance changed their API. The v7 endpoint now requires a crumb/cookie session.
> Switching to v8/finance/chart endpoint which returns the same quote data
> (regularMarketPrice, marketCap, trailingPE, fiftyTwoWeekHigh/Low) without any auth.
> Also upgrading the User-Agent header to a real browser string.

*[Rewrote lib/tools/stockData.js: YAHOO_QUOTE_V8 = query2.finance.yahoo.com/v8/finance/chart,
reads from data.chart.result[0].meta instead of quoteResponse.result[0]]*

---

### [TURN 7] — Broken LangChain Dependency Tree

**Me:**
> npm install fails with ERESOLVE — @langchain/community v1 conflicts with langchain v0.3

**Amazon Q:**
> The root cause is @langchain/community was updated to v1 which requires @langchain/core v1,
> but langchain@0.3 requires @langchain/core@0.3. These are incompatible.
> Fix: pin all packages to compatible versions, remove @langchain/community entirely
> (we only use @langchain/tavily now), do a clean reinstall.

*[Rewrote package.json with pinned compatible versions:
  @langchain/core@^0.3.40, @langchain/google-genai@^0.1.8,
  @langchain/langgraph@^0.2.44, @langchain/tavily@^0.1.4]*
*[Ran: rmdir /s /q node_modules && del package-lock.json && npm install --legacy-peer-deps]*
*[Verified: node -e "const {ChatGoogleGenerativeAI} = require('@langchain/google-genai'); console.log('OK')" → OK function]*

---

### [TURN 8] — Next.js Config: Missing External Packages

**Me:**
> Overview / Financials / Strategic Analysis / Reasoning Trace / Activity Log — fix all these,
> I want all this data. Also replace Next.js with Node.js.

**Amazon Q:**
> The frontend already has all 5 tabs fully built in page.jsx. The issue is:
> 1. next.config.mjs only lists 2 packages in serverComponentsExternalPackages —
>    @langchain/google-genai and @langchain/tavily are missing, causing bundling errors
> 2. Model name gemini-2.5-flash may not be on free tier — defaulting to gemini-1.5-flash
> 3. On "replace Next.js with Node.js": the assignment mandates React/Next.js.
>    I'll add a standalone Express server.js as an alternative runner, but keep Next.js
>    as the primary since that's what the assignment requires.

*[Updated next.config.mjs: added @langchain/google-genai, @langchain/tavily, langchain to serverComponentsExternalPackages]*
*[Updated lib/agent.js: default model gemini-2.5-flash → gemini-1.5-flash]*
*[Created server.js: standalone Express server for running without Next.js]*

---

### [TURN 9] — BUILD_LOG + LLM Transcript (this file)

**Me:**
> LangChain.js / LangGraph.js use also thus you are mandated to build this project using a
> choice of your AI/LLM, during which you will be chatting with the LLM as you build.
> You will get extra bonus points if you include all the LLM chat session transcript/logs.

**Amazon Q:**
> Writing the complete BUILD_LOG.md with the full chat transcript above, all decisions,
> all errors hit and fixed, and the architectural reasoning behind each choice.

---

## Architecture Decisions (with reasoning)

### Why LangGraph.js StateGraph instead of a single prompt

The brief says "does its research" — that implies multiple steps, not one LLM call.
LangGraph lets us define a proper graph with typed state, parallel execution, and
an auditable trace of exactly what ran. A single `llm.invoke()` would not demonstrate
agent orchestration.

### Why parallel fan-out (3 nodes → 1 decision) instead of ReAct loop

A ReAct loop lets the LLM decide when to call tools. We chose a fixed graph because:
- **Faster**: guaranteed parallelism vs LLM calling tools one at a time
- **Cheaper**: fixed number of LLM/tool calls per run, no risk of looping
- **Auditable**: the activity log is a deterministic trace, not a reconstruction

### Why Zod + withStructuredOutput instead of free-text

Forces the model to return a typed object: verdict enum, numeric confidence, arrays
for bull/bear/risks/catalysts, reasoning chain. This makes output:
- Reliably renderable (no regex parsing)
- Testable (can assert verdict is one of INVEST/PASS/WATCHLIST)
- Composable (could batch-run over 50 companies and get a clean dataset)

### Why Google Gemini (AI Studio) instead of OpenAI

The assignment says "use the AI model that is provided." Google AI Studio provides
free API access to Gemini models. ChatGoogleGenerativeAI from @langchain/google-genai
is a drop-in replacement for ChatOpenAI — same withStructuredOutput interface,
same message format.

### Why Yahoo Finance v8/finance/chart endpoint

Yahoo's v7 quote endpoint started requiring crumb/cookie auth. The v8/finance/chart
endpoint returns the same data (price, marketCap, P/E, 52w range) from the `meta`
field without any authentication. No API key needed.

### Why WATCHLIST as a third verdict

Forcing binary INVEST/PASS on genuinely ambiguous cases (great business, clearly
overvalued right now) produces a less honest answer. WATCHLIST names the ambiguity
explicitly. Noted as a deliberate deviation from the literal brief.

### Why graceful degradation on missing Tavily key

An investment tool should never silently pretend it did live research it didn't do.
When TAVILY_API_KEY is absent, the agent explicitly labels which sections ran on
"model knowledge only" rather than fabricating confidence it doesn't have.

---

## Errors Hit During Build (complete list)

| # | Error | Root Cause | Fix |
|---|-------|-----------|-----|
| 1 | `financials is already being used as a state attribute` | LangGraph node name = state key name | Renamed nodes to fetchFinancials/fetchNews/fetchCompetitive |
| 2 | `Module not found: ./utils/standard_schema` | @langchain/google-genai version mismatch with @langchain/core | Updated all @langchain/* to latest compatible versions |
| 3 | `401 ACCESS_TOKEN_TYPE_UNSUPPORTED` | Wrong API key type (OAuth token, not AI Studio key) | User needs AIza... key from aistudio.google.com/app/apikeys |
| 4 | `Yahoo quote HTTP 401` | Yahoo Finance v7 endpoint now requires crumb/cookie | Switched to v8/finance/chart endpoint |
| 5 | `ERESOLVE: @langchain/community v1 conflicts with langchain v0.3` | @langchain/community was updated to v1 requiring @langchain/core v1 | Removed @langchain/community, pinned all packages to compatible 0.3.x versions |
| 6 | `TavilySearchResults is not exported` | Tavily moved from @langchain/community to @langchain/tavily, class renamed | Updated import to TavilySearch from @langchain/tavily |

---

## Final File Structure

```
ai-investment-research-agent/
├── app/
│   ├── api/research/route.js    # Next.js POST endpoint → runInvestmentResearch()
│   ├── globals.css              # Tailwind + Google Fonts (Lora, JetBrains Mono)
│   ├── layout.jsx               # Root layout with dark mode script
│   └── page.jsx                 # Full UI: 5-tab dashboard (Overview/Financials/
│                                #   Strategic Analysis/Reasoning Trace/Activity Log)
├── lib/
│   ├── agent.js                 # LangGraph StateGraph: 3 parallel nodes → decision
│   ├── types.js                 # Shared type definitions
│   └── tools/
│       ├── stockData.js         # Yahoo Finance v8 ticker resolution + quote
│       └── webSearch.js         # Tavily wrapper with graceful degradation
├── server.js                    # Standalone Express server (alternative to Next.js)
├── .env.example                 # Template: GOOGLE_API_KEY, GOOGLE_MODEL, TAVILY_API_KEY
├── .env.local                   # Your actual keys (gitignored)
├── next.config.mjs              # serverComponentsExternalPackages for all LangChain pkgs
├── package.json                 # Pinned compatible LangChain 0.3.x versions
├── tailwind.config.ts
└── BUILD_LOG.md                 # This file
```

---

## How to Run

```bash
# 1. Install
npm install --legacy-peer-deps

# 2. Set your keys in .env.local
GOOGLE_API_KEY=AIza...          # from https://aistudio.google.com/app/apikeys
GOOGLE_MODEL=gemini-1.5-flash   # optional, this is the default
TAVILY_API_KEY=tvly-...         # optional, from https://tavily.com (free tier)

# 3. Run (Next.js — primary)
npm run dev
# → http://localhost:3000

# OR run as plain Node.js (Express)
npm run server
# → http://localhost:3000
```
