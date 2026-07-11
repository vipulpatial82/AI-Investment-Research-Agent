"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Sun, 
  Moon, 
  Search, 
  History, 
  Trash2, 
  ArrowUpRight, 
  ShieldAlert, 
  Sparkles, 
  Clock, 
  ExternalLink, 
  Cpu, 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  CheckCircle2, 
  ChevronRight, 
  Activity, 
  Terminal,
  HelpCircle,
  AlertTriangle,
  Info,
  DollarSign
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const EXAMPLE_COMPANIES = ["Tata Motors", "Zomato", "Nvidia", "Infosys", "Paytm"];

const VERDICT_STYLES = {
  INVEST: {
    bg: "bg-emerald-500/10 dark:bg-emerald-500/20 border-emerald-500/30 dark:border-emerald-500/50",
    text: "text-emerald-800 dark:text-emerald-300",
    labelColor: "bg-emerald-500 text-white dark:bg-emerald-600",
    glow: "shadow-[0_0_20px_rgba(16,185,129,0.15)]",
    label: "INVEST"
  },
  PASS: {
    bg: "bg-rose-500/10 dark:bg-rose-500/20 border-rose-500/30 dark:border-rose-500/50",
    text: "text-rose-800 dark:text-rose-300",
    labelColor: "bg-rose-600 text-white dark:bg-rose-700",
    glow: "shadow-[0_0_20px_rgba(244,63,94,0.15)]",
    label: "PASS"
  },
  WATCHLIST: {
    bg: "bg-amber-500/10 dark:bg-amber-500/20 border-amber-500/30 dark:border-amber-500/50",
    text: "text-amber-800 dark:text-amber-300",
    labelColor: "bg-amber-500 text-white dark:bg-amber-600",
    glow: "shadow-[0_0_20px_rgba(245,158,11,0.15)]",
    label: "WATCHLIST"
  },
};

const RISK_OPTIONS = [
  { id: "conservative", label: "Conservative", desc: "Safety & Moats" },
  { id: "balanced", label: "Balanced", desc: "Growth & Value" },
  { id: "aggressive", label: "Aggressive", desc: "Disruptive Growth" }
];

const HORIZON_OPTIONS = [
  { id: "short", label: "Short", desc: "< 1 Yr" },
  { id: "medium", label: "Medium", desc: "1-3 Yrs" },
  { id: "long", label: "Long", desc: "3+ Yrs" }
];

function getSimulatedLogs(companyName) {
  return [
    `[SYS] Initializing investment research agent for "${companyName}"...`,
    `[SYS] Loading profile configuration and matching investment mandates...`,
    `[DATA] Connecting to market feed (Yahoo Finance symbol engine)...`,
    `[DATA] Ticker successfully resolved. Querying raw quotation details...`,
    `[DATA] Found market snapshot. Processing capitalization, P/E ratio, and price ranges...`,
    `[NEWS] Fetching recent earnings, news headlines, and macro sentiment feeds...`,
    `[NEWS] Parsing recent articles and regulatory filings. Extracting key narratives...`,
    `[COMP] Crawling industry databases for peer groups & competitive benchmarks...`,
    `[COMP] Analyzing market share, pricing power, and business moat metrics...`,
    `[LLM] Starting thesis evaluation: Weighing target metrics against risk mandates...`,
    `[LLM] Evaluating the Bull Case (growth drivers, execution success)...`,
    `[LLM] Evaluating the Bear Case (margin pressure, disruption risks)...`,
    `[LLM] Synthesizing structural risks & potential near-term price catalysts...`,
    `[LLM] Computing final consensus verdict and generating allocation advice...`,
    `[SYS] Structuring payload. Parsing execution graph logs. Launching dashboard...`
  ];
}

export default function Home() {
  const [company, setCompany] = useState("");
  const [riskProfile, setRiskProfile] = useState("balanced");
  const [horizon, setHorizon] = useState("medium");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  
  // Custom interactive state
  const [theme, setTheme] = useState("light");
  const [history, setHistory] = useState([]);
  const [loadingStep, setLoadingStep] = useState(0);
  const [simulatedLogs, setSimulatedLogs] = useState([]);
  
  const terminalEndRef = useRef(null);

  // Initialize theme from localStorage or preferences
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const isDark = savedTheme === "dark" || (!savedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches);
    setTheme(isDark ? "dark" : "light");
    document.documentElement.classList.toggle("dark", isDark);

    const savedHistory = localStorage.getItem("research_history");
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

  const deleteFromHistory = (index, e) => {
    e.stopPropagation();
    const updated = history.filter((_, i) => i !== index);
    setHistory(updated);
    localStorage.setItem("research_history", JSON.stringify(updated));
  };

  const handleSelectHistory = (item) => {
    setCompany(item.name);
    setRiskProfile(item.riskProfile);
    setHorizon(item.horizon);
  };

  // Simulating terminal logging during agent run
  useEffect(() => {
    if (!loading) {
      setSimulatedLogs([]);
      return;
    }

    const logs = getSimulatedLogs(company || "Target Company");
    let currentLogIndex = 0;
    
    setSimulatedLogs([logs[0]]);
    setLoadingStep(0);

    const interval = setInterval(() => {
      currentLogIndex++;
      if (currentLogIndex < logs.length) {
        setSimulatedLogs((prev) => [...prev, logs[currentLogIndex]]);
        const step = Math.min(Math.floor(currentLogIndex / 3), 4);
        setLoadingStep(step);
      } else {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [loading, company]);

  // Autoscroll terminal
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [simulatedLogs]);

  async function runAgent(e) {
    if (e) e.preventDefault();
    if (!company.trim() || loading) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company, riskProfile, horizon }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      
      setResult(data);

      // Save to search history
      const updatedHistory = [
        { name: company, riskProfile, horizon, timestamp: new Date().toISOString() },
        ...history.filter((h) => h.name.toLowerCase() !== company.toLowerCase()),
      ].slice(0, 5);
      setHistory(updatedHistory);
      localStorage.setItem("research_history", JSON.stringify(updatedHistory));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header Bar */}
      <header className="flex items-center justify-between border-b border-line dark:border-darkborder pb-6 mb-8">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-medium tracking-wider bg-accent/10 dark:bg-accent/20 text-accent dark:text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-accent dark:bg-emerald-400 mr-1 animate-pulse" />
              Intelligence Node
            </span>
          </div>
          <h1 className="font-serif-display text-3xl sm:text-4xl font-bold mt-1 text-ink dark:text-white tracking-tight">
            The Analyst
          </h1>
          <p className="text-xs sm:text-sm text-ink/60 dark:text-darktext/60 mt-0.5">
            AI Investment Research & Synthesis Engine
          </p>
        </div>

        <button
          onClick={toggleTheme}
          className="p-2.5 rounded-xl border border-line dark:border-darkborder bg-white dark:bg-darkcard text-ink dark:text-white shadow-sm hover:scale-105 transition-all"
          aria-label="Toggle Theme"
        >
          {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-amber-400" />}
        </button>
      </header>

      {/* Grid Dashboard Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-8 items-start">
        
        {/* Left Control Console */}
        <div className="space-y-6 lg:sticky lg:top-6">
          <form
            onSubmit={runAgent}
            className="rounded-2xl border border-line dark:border-darkborder bg-white/60 dark:bg-darkcard/40 backdrop-blur-md p-6 space-y-6 shadow-sm"
          >
            {/* Target input */}
            <div>
              <label className="mb-2 block font-mono text-[11px] uppercase tracking-wider text-ink/50 dark:text-white/50">
                Company Target
              </label>
              <div className="relative">
                <input
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="e.g. Nvidia, Tata Motors..."
                  className="w-full rounded-xl border border-line dark:border-darkborder bg-paper/50 dark:bg-darkbg/50 px-4 py-3 pl-11 text-sm text-ink dark:text-white outline-none focus:ring-2 focus:ring-accent dark:focus:ring-emerald-500 transition-all placeholder-ink/40 dark:placeholder-white/30"
                  required
                />
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/40 dark:text-white/40" />
              </div>

              {/* Sample badges */}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {EXAMPLE_COMPANIES.map((c) => (
                  <button
                    type="button"
                    key={c}
                    onClick={() => setCompany(c)}
                    className="rounded-full border border-line dark:border-darkborder bg-white dark:bg-darkcard/40 px-2.5 py-1 text-xs text-ink/60 dark:text-white/60 transition hover:border-accent hover:text-accent dark:hover:border-emerald-500 dark:hover:text-emerald-400"
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Risk profile cards */}
            <div>
              <label className="mb-2 block font-mono text-[11px] uppercase tracking-wider text-ink/50 dark:text-white/50">
                Risk Mandate
              </label>
              <div className="grid grid-cols-3 gap-2">
                {RISK_OPTIONS.map((opt) => {
                  const active = riskProfile === opt.id;
                  return (
                    <button
                      type="button"
                      key={opt.id}
                      onClick={() => setRiskProfile(opt.id)}
                      className={`flex flex-col items-center text-center p-2.5 rounded-xl border transition-all ${
                        active
                          ? "border-accent dark:border-emerald-500 bg-accent/5 dark:bg-emerald-500/10 text-accent dark:text-emerald-400 font-semibold ring-2 ring-accent/10 dark:ring-emerald-500/20"
                          : "border-line dark:border-darkborder bg-white dark:bg-darkcard/20 text-ink/60 dark:text-white/60 hover:bg-paper dark:hover:bg-darkbg/30"
                      }`}
                    >
                      <span className="text-xs">{opt.label}</span>
                      <span className="text-[9px] opacity-75 font-normal mt-0.5">{opt.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Horizon tab segment */}
            <div>
              <label className="mb-2 block font-mono text-[11px] uppercase tracking-wider text-ink/50 dark:text-white/50">
                Holding Horizon
              </label>
              <div className="grid grid-cols-3 gap-1.5 p-1.5 rounded-xl bg-paper dark:bg-darkbg/80 border border-line dark:border-darkborder">
                {HORIZON_OPTIONS.map((opt) => {
                  const active = horizon === opt.id;
                  return (
                    <button
                      type="button"
                      key={opt.id}
                      onClick={() => setHorizon(opt.id)}
                      className={`py-2 rounded-lg text-xs transition-all ${
                        active
                          ? "bg-white dark:bg-darkcard text-ink dark:text-white shadow-sm font-semibold"
                          : "text-ink/55 dark:text-white/50 hover:text-ink dark:hover:text-white"
                      }`}
                    >
                      <span className="block">{opt.label}</span>
                      <span className="block text-[8px] opacity-70 mt-0.5">{opt.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading || !company.trim()}
              className="w-full rounded-xl bg-ink dark:bg-emerald-600 hover:bg-ink/90 dark:hover:bg-emerald-500 text-white dark:text-white py-3 font-medium transition duration-200 shadow-sm flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? (
                <>
                  <Activity className="w-4 h-4 animate-spin" />
                  Analyzing target...
                </>
              ) : (
                <>
                  <Cpu className="w-4 h-4" />
                  Run Analysis Agent
                </>
              )}
            </button>
          </form>

          {/* History Panel */}
          {history.length > 0 && (
            <div className="rounded-2xl border border-line dark:border-darkborder bg-white/60 dark:bg-darkcard/40 backdrop-blur-md p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3 border-b border-line dark:border-darkborder/50 pb-2">
                <History className="w-3.5 h-3.5 text-ink/40 dark:text-white/40" />
                <h3 className="font-mono text-[10px] uppercase tracking-wider text-ink/60 dark:text-white/60">
                  Recent Investigations
                </h3>
              </div>
              <div className="space-y-1.5">
                {history.map((h, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleSelectHistory(h)}
                    className="group flex items-center justify-between p-2 rounded-xl bg-paper/30 dark:bg-darkbg/20 border border-transparent hover:border-line dark:hover:border-darkborder hover:bg-white dark:hover:bg-darkcard/40 cursor-pointer transition-all"
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <p className="text-xs font-semibold text-ink dark:text-white truncate">{h.name}</p>
                      <p className="text-[9px] text-ink/50 dark:text-white/40 font-mono uppercase mt-0.5">
                        {h.riskProfile} · {h.horizon}
                      </p>
                    </div>
                    <button
                      onClick={(e) => deleteFromHistory(idx, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-rose-500/10 text-ink/30 hover:text-rose-500 transition-all"
                      title="Clear from history"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Guidelines info */}
          <div className="p-4 rounded-xl border border-line/60 dark:border-darkborder/30 bg-paper/20 dark:bg-darkcard/10 text-[11px] text-ink/50 dark:text-white/40 space-y-1">
            <p className="font-semibold text-ink/75 dark:text-white/60">System Disclaimer:</p>
            <p>Analysis output is derived from public market feeds and automated news scans. This tool delivers a structured recommendation framework and does not constitute formal investment advisory services.</p>
          </div>
        </div>

        {/* Right Dashboard Area */}
        <div className="min-w-0">
          <AnimatePresence mode="wait">
            
            {/* State 1: Loading panel */}
            {loading && (
              <motion.div
                key="loading"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div className="rounded-2xl border border-line dark:border-darkborder bg-white dark:bg-darkcard p-6 shadow-sm">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-line dark:border-darkborder">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-accent/10 dark:bg-emerald-500/15 flex items-center justify-center text-accent dark:text-emerald-400">
                        <Activity className="w-5 h-5 animate-pulse" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-ink dark:text-white">Analyzing {company}...</h2>
                        <p className="text-xs text-ink/55 dark:text-white/50">Running recursive research & sentiment analysis</p>
                      </div>
                    </div>
                    {/* Progress tracking */}
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-32 bg-paper dark:bg-darkbg rounded-full overflow-hidden border border-line dark:border-darkborder/50">
                        <div 
                          className="h-full bg-accent dark:bg-emerald-500 transition-all duration-700" 
                          style={{ width: `${(loadingStep + 1) * 20}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono font-bold text-accent dark:text-emerald-400">
                        {Math.min((loadingStep + 1) * 20, 100)}%
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6">
                    {/* Execution checklist */}
                    <div className="space-y-4">
                      <h4 className="font-mono text-[10px] uppercase tracking-wider text-ink/40 dark:text-white/40">Checklist</h4>
                      <ul className="space-y-3.5">
                        {[
                          "Retrieve Financials",
                          "Scan Public News",
                          "Map Competitors",
                          "Compute Risk Profiles",
                          "Synthesize Verdict"
                        ].map((stepLabel, idx) => {
                          const done = loadingStep > idx;
                          const active = loadingStep === idx;
                          return (
                            <li key={idx} className="flex items-center gap-2.5 text-xs text-ink dark:text-white">
                              {done ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                              ) : active ? (
                                <div className="w-4 h-4 rounded-full border-2 border-accent dark:border-emerald-500 border-t-transparent animate-spin flex-shrink-0" />
                              ) : (
                                <div className="w-4 h-4 rounded-full border border-line dark:border-darkborder flex-shrink-0" />
                              )}
                              <span className={done ? "text-ink/40 dark:text-white/30 line-through" : active ? "font-bold text-accent dark:text-emerald-400" : "opacity-60"}>
                                {stepLabel}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>

                    {/* Developer Terminal logs */}
                    <div className="flex flex-col rounded-xl border border-line dark:border-darkborder bg-paper/60 dark:bg-black/40 overflow-hidden shadow-inner">
                      <div className="bg-paper dark:bg-darkcard px-4 py-2 border-b border-line dark:border-darkborder flex items-center justify-between">
                        <div className="flex gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                        </div>
                        <span className="text-[10px] font-mono text-ink/40 dark:text-white/40 flex items-center gap-1.5">
                          <Terminal className="w-3 h-3" />
                          AGENTS_LOG
                        </span>
                      </div>
                      
                      <div className="p-4 font-mono text-[10px] sm:text-xs text-emerald-700 dark:text-emerald-400 space-y-1.5 h-[200px] overflow-y-auto overflow-x-hidden scrollbar-thin">
                        {simulatedLogs.map((logStr, idx) => (
                          <div key={idx} className="leading-relaxed whitespace-pre-wrap break-all">
                            <span className="opacity-45 select-none">{`>`}</span> {logStr}
                          </div>
                        ))}
                        <div ref={terminalEndRef} />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* State 2: Error box */}
            {error && !loading && (
              <motion.div
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-2xl border border-rose-500/20 bg-rose-500/5 dark:bg-rose-500/10 p-5 text-sm text-rose-800 dark:text-rose-300 flex items-start gap-3"
              >
                <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                <div>
                  <strong className="font-semibold block text-base mb-1">Execution Failure</strong>
                  <p className="opacity-90">{error}</p>
                  <button 
                    onClick={() => runAgent()}
                    className="mt-3 text-xs underline font-semibold hover:opacity-85"
                  >
                    Retry investigation
                  </button>
                </div>
              </motion.div>
            )}

            {/* State 3: Normal result dashboard */}
            {result && !loading && !error && (
              <motion.div
                key="result"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <ResultDashboard result={result} />
              </motion.div>
            )}

            {/* State 4: Welcome Empty state */}
            {!loading && !result && !error && (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-2xl border border-line dark:border-darkborder bg-white/40 dark:bg-darkcard/20 backdrop-blur-md p-8 text-center space-y-6"
              >
                <div className="w-16 h-16 rounded-full bg-accent/5 dark:bg-emerald-500/10 border border-line dark:border-darkborder/50 flex items-center justify-center mx-auto">
                  <BarChart3 className="w-8 h-8 text-accent dark:text-emerald-400" />
                </div>
                
                <div className="max-w-md mx-auto space-y-2">
                  <h3 className="font-serif-display text-2xl font-bold text-ink dark:text-white">No Target Inspected</h3>
                  <p className="text-sm text-ink/60 dark:text-darktext/60">
                    Input a listed or private company above. The agent will run stock snapshots, crawl industry news, map comparative metrics, and deliver a definitive verdict.
                  </p>
                </div>

                <div className="max-w-xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 text-left">
                  {[
                    { title: "Market Feeds", desc: "Resolves tickers and pulls prices and P/E ratios." },
                    { title: "Public Scanning", desc: "Searches public news and crawls competitor snapshots." },
                    { title: "LLM Verdict", desc: "Constructs risk analyses, thesis logs, and positioning sizing notes." }
                  ].map((x, idx) => (
                    <div key={idx} className="p-3.5 rounded-xl border border-line dark:border-darkborder bg-white dark:bg-darkcard/40">
                      <p className="text-xs font-semibold font-mono text-accent dark:text-emerald-400 uppercase tracking-wider">{x.title}</p>
                      <p className="text-[11px] text-ink/60 dark:text-darktext/60 mt-1">{x.desc}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

      </div>

      <footer className="mt-16 border-t border-line dark:border-darkborder pt-6 text-center text-xs text-ink/40 dark:text-white/30 flex flex-col sm:flex-row justify-between items-center gap-4">
        <p>Built for the InsideIIM × Altuni AI Labs assignment.</p>
        <p className="font-mono text-[10px]">VER: 2.1.0 · LLM NODE ACCREDITED</p>
      </footer>
    </main>
  );
}

/* ------------------------------------------------------------------ */
/* Result Dashboard Sub-component                                     */
/* ------------------------------------------------------------------ */

function ResultDashboard({ result }) {
  const { verdict, financials, sources, stages } = result;
  const style = VERDICT_STYLES[verdict.verdict] ?? VERDICT_STYLES.WATCHLIST;
  
  const [activeTab, setActiveTab] = useState("overview");

  const tabList = [
    { id: "overview", label: "Overview" },
    { id: "financials", label: "Financials" },
    { id: "analysis", label: "Strategic Analysis" },
    { id: "reasoning", label: "Reasoning Trace" },
    { id: "activity", label: "Activity Log" }
  ];

  return (
    <div className="space-y-6">
      
      {/* 1. Verdict Banner */}
      <div className={`rounded-2xl border p-6 ${style.bg} ${style.glow} ${style.text} transition-all duration-500`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="font-mono text-[10px] uppercase tracking-widest opacity-75">
              Investment Investigation Verdict
            </span>
            <div className="flex items-baseline gap-2.5">
              <h2 className="font-serif-display text-4xl sm:text-5xl font-extrabold tracking-tight">
                {verdict.company}
              </h2>
              {verdict.tickerGuess && (
                <span className="font-mono text-sm opacity-60">({verdict.tickerGuess})</span>
              )}
            </div>
            <p className="text-xs mt-1.5 opacity-90 inline-flex items-center bg-white/10 dark:bg-black/20 px-2.5 py-1 rounded-md border border-white/10 font-mono">
              Suggested Horizon: <span className="font-bold ml-1">{verdict.suggestedHorizon}</span>
            </p>
          </div>

          <div className="flex items-center gap-4 self-stretch sm:self-auto justify-between sm:justify-end border-t sm:border-t-0 border-white/10 pt-4 sm:pt-0">
            <div className="text-right">
              <span className="font-mono text-[9px] uppercase tracking-widest block opacity-70">Verdict</span>
              <span className={`inline-block font-mono font-bold text-lg px-4 py-1.5 rounded-lg mt-1 ${style.labelColor}`}>
                {style.label}
              </span>
            </div>
            
            <ConfidenceGauge value={verdict.confidence} />
          </div>
        </div>

        {/* Thesis Callout */}
        <div className="mt-6 pt-5 border-t border-black/10 dark:border-white/10">
          <div className="relative">
            <span className="absolute -left-1 -top-4 font-serif text-5xl opacity-15 select-none">“</span>
            <p className="pl-4 text-sm sm:text-base font-medium leading-relaxed italic text-ink/90 dark:text-white/90">
              {verdict.thesisSummary}
            </p>
          </div>
        </div>
      </div>

      {/* 2. Horizontal Tabs */}
      <div className="flex overflow-x-auto pb-1.5 scrollbar-thin border-b border-line dark:border-darkborder gap-1">
        {tabList.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-t-xl transition-all whitespace-nowrap -mb-[1px] border-b-2 ${
                active
                  ? "border-accent dark:border-emerald-500 text-accent dark:text-emerald-400 bg-white/40 dark:bg-darkcard/30"
                  : "border-transparent text-ink/60 dark:text-white/60 hover:text-ink dark:hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 3. Tab contents */}
      <div className="transition-all duration-300">
        
        {/* TAB A: OVERVIEW */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            
            {/* Position Note Card */}
            <div className="rounded-xl border border-line dark:border-darkborder bg-white dark:bg-darkcard p-5 flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-accent/5 dark:bg-emerald-500/10 border border-line dark:border-darkborder/50 flex items-center justify-center text-accent dark:text-emerald-400 flex-shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-mono uppercase tracking-wider text-ink/50 dark:text-white/45">Portfolio Sizing & Positioning Guidance</h4>
                <p className="text-sm font-medium text-ink/80 dark:text-white/80 leading-relaxed">
                  {verdict.suggestedPositionNote}
                </p>
              </div>
            </div>

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Financial Snapshot summary */}
              <div className="rounded-xl border border-line dark:border-darkborder bg-white dark:bg-darkcard p-5 space-y-4">
                <h3 className="font-mono text-xs uppercase tracking-wider text-ink/50 dark:text-white/40 pb-2 border-b border-line dark:border-darkborder/50">
                  Market Snapshot
                </h3>
                {financials.ticker ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      <StatMini label="Symbol" value={financials.ticker} />
                      <StatMini label="Exchange" value={financials.exchange || "n/a"} />
                      <StatMini label="Price" value={financials.price ? `${financials.currency ?? ""} ${financials.price.toLocaleString()}` : "n/a"} />
                    </div>
                    {/* Range indicator mini preview */}
                    {financials.price && financials.fiftyTwoWeekLow && financials.fiftyTwoWeekHigh && (
                      <PriceRangeSlider 
                        price={financials.price}
                        low={financials.fiftyTwoWeekLow}
                        high={financials.fiftyTwoWeekHigh}
                        currency={financials.currency}
                      />
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-ink/65 dark:text-white/60 italic">{financials.notes ?? "Market quotation was not resolved."}</p>
                )}
              </div>

              {/* Source count widget */}
              <div className="rounded-xl border border-line dark:border-darkborder bg-white dark:bg-darkcard p-5 space-y-3.5">
                <h3 className="font-mono text-xs uppercase tracking-wider text-ink/50 dark:text-white/40 pb-2 border-b border-line dark:border-darkborder/50">
                  Crawled Sources
                </h3>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="text-3xl font-extrabold font-mono text-ink dark:text-white">
                      {sources.length}
                    </p>
                    <p className="text-[10px] font-mono text-ink/40 dark:text-white/40 uppercase">References Found</p>
                  </div>
                  <button 
                    onClick={() => setActiveTab("activity")}
                    className="text-xs text-accent dark:text-emerald-400 hover:underline inline-flex items-center gap-1 font-semibold"
                  >
                    View crawls <ChevronRight className="w-3 h-3" />
                  </button>
                </div>

                <div className="space-y-1.5">
                  {sources.slice(0, 2).map((s, idx) => (
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      key={idx}
                      className="block p-2 rounded bg-paper/30 dark:bg-darkbg/35 border border-line/40 dark:border-darkborder/30 hover:border-accent dark:hover:border-emerald-500 text-xs text-ink/75 dark:text-white/70 truncate transition-all"
                    >
                      {s.title}
                    </a>
                  ))}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* TAB B: FINANCIALS */}
        {activeTab === "financials" && (
          <div className="rounded-xl border border-line dark:border-darkborder bg-white dark:bg-darkcard p-6 space-y-6">
            <div>
              <h3 className="text-lg font-bold text-ink dark:text-white">Fundamentals Snapshot</h3>
              <p className="text-xs text-ink/50 dark:text-white/50 mt-0.5">Retrieved from Yahoo Finance API feeds</p>
            </div>

            {financials.ticker ? (
              <div className="space-y-8">
                
                {/* 52-week visual track */}
                {financials.price && financials.fiftyTwoWeekLow && financials.fiftyTwoWeekHigh && (
                  <div className="p-5 rounded-xl bg-paper/40 dark:bg-darkbg/40 border border-line/60 dark:border-darkborder/40">
                    <h4 className="font-mono text-xs uppercase tracking-wider text-ink/50 dark:text-white/50 mb-6">
                      52-Week Valuation Position
                    </h4>
                    <PriceRangeSlider 
                      price={financials.price}
                      low={financials.fiftyTwoWeekLow}
                      high={financials.fiftyTwoWeekHigh}
                      currency={financials.currency}
                      showDetail={true}
                    />
                  </div>
                )}

                {/* Big numbers cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatBigCard 
                    label="Current Price" 
                    value={financials.price != null ? `${financials.currency ?? ""} ${financials.price.toLocaleString()}` : "n/a"} 
                    sub="Realtime Quote"
                  />
                  <StatBigCard 
                    label="Market Capitalization" 
                    value={financials.marketCap ? formatLargeNumber(financials.marketCap) : "n/a"} 
                    sub="Enterprise Size"
                  />
                  <StatBigCard 
                    label="Trailing P/E Ratio" 
                    value={financials.peRatio?.toFixed(2) ?? "n/a"} 
                    sub="Valuation Multiple"
                  />
                  <StatBigCard 
                    label="Listed Exchange" 
                    value={financials.exchange ?? "n/a"} 
                    sub={financials.ticker ?? ""}
                  />
                </div>

                {financials.notes && (
                  <div className="flex gap-2.5 p-4 rounded-lg bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-350">
                    <Info className="w-4 h-4 flex-shrink-0" />
                    <p className="leading-normal">{financials.notes}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 text-center border border-dashed border-line dark:border-darkborder rounded-xl space-y-2">
                <p className="text-sm font-semibold text-ink/70 dark:text-white/60">No financial details available.</p>
                <p className="text-xs text-ink/45 dark:text-white/40 max-w-sm mx-auto">
                  Ticker lookup returned zero listings. The target might be private, unlisted, or restricted. Qualitative metrics remain active.
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB C: STRATEGIC ANALYSIS */}
        {activeTab === "analysis" && (
          <div className="space-y-6">
            
            {/* Bull & Bear Split Screen */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Bull Case */}
              <div className="rounded-xl border border-emerald-500/10 dark:border-emerald-500/20 bg-white dark:bg-darkcard overflow-hidden shadow-sm">
                <div className="bg-emerald-500/5 dark:bg-emerald-500/10 px-5 py-4 border-b border-emerald-500/15 flex items-center gap-2 text-emerald-800 dark:text-emerald-400">
                  <TrendingUp className="w-4.5 h-4.5" />
                  <h3 className="font-semibold text-sm font-mono uppercase tracking-wider">Bull Case Thesis</h3>
                </div>
                <div className="p-5">
                  <BulletList items={verdict.bullCase} variant="bull" />
                </div>
              </div>

              {/* Bear Case */}
              <div className="rounded-xl border border-rose-500/10 dark:border-rose-500/20 bg-white dark:bg-darkcard overflow-hidden shadow-sm">
                <div className="bg-rose-500/5 dark:bg-rose-500/10 px-5 py-4 border-b border-rose-500/15 flex items-center gap-2 text-rose-800 dark:text-rose-450">
                  <TrendingDown className="w-4.5 h-4.5" />
                  <h3 className="font-semibold text-sm font-mono uppercase tracking-wider">Bear Case Thesis</h3>
                </div>
                <div className="p-5">
                  <BulletList items={verdict.bearCase} variant="bear" />
                </div>
              </div>

            </div>

            {/* Key Risks & Catalysts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Risks */}
              <div className="rounded-xl border border-line dark:border-darkborder bg-white dark:bg-darkcard p-5 space-y-4">
                <div className="flex items-center gap-2 pb-2.5 border-b border-line dark:border-darkborder/50 text-ink/75 dark:text-white/70">
                  <ShieldAlert className="w-4 h-4 text-rose-500" />
                  <h3 className="font-mono text-xs uppercase tracking-wider">Structural Moat Risks</h3>
                </div>
                <BulletList items={verdict.keyRisks} variant="risk" />
              </div>

              {/* Catalysts */}
              <div className="rounded-xl border border-line dark:border-darkborder bg-white dark:bg-darkcard p-5 space-y-4">
                <div className="flex items-center gap-2 pb-2.5 border-b border-line dark:border-darkborder/50 text-ink/75 dark:text-white/70">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <h3 className="font-mono text-xs uppercase tracking-wider">Triggers & Catalysts</h3>
                </div>
                <BulletList items={verdict.catalysts} variant="catalyst" />
              </div>

            </div>

          </div>
        )}

        {/* TAB D: REASONING TIMELINE */}
        {activeTab === "reasoning" && (
          <div className="rounded-xl border border-line dark:border-darkborder bg-white dark:bg-darkcard p-6">
            <div className="mb-6">
              <h3 className="text-lg font-bold text-ink dark:text-white">Reasoning Trace</h3>
              <p className="text-xs text-ink/50 dark:text-white/50 mt-0.5">Chronological step-by-step logic path computed by the agent</p>
            </div>

            <div className="relative pl-6 space-y-6 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-line dark:before:bg-darkborder">
              {verdict.reasoningChain.map((step, idx) => (
                <div key={idx} className="relative group">
                  
                  {/* Timeline bubble */}
                  <span className="absolute -left-[27px] top-1 flex items-center justify-center w-5 h-5 rounded-full border border-line dark:border-darkborder bg-white dark:bg-darkcard text-[9px] font-mono font-bold text-accent dark:text-emerald-400 group-hover:scale-110 transition-transform shadow-sm">
                    {idx + 1}
                  </span>
                  
                  <div className="p-4 rounded-xl border border-line dark:border-darkborder bg-paper/20 dark:bg-darkbg/30 hover:bg-paper/40 dark:hover:bg-darkbg/50 transition-all">
                    <p className="text-sm text-ink/80 dark:text-white/80 leading-relaxed font-medium">
                      {step}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB E: ACTIVITY LOG */}
        {activeTab === "activity" && (
          <div className="space-y-6">
            
            {/* Raw Stage activity */}
            <div className="rounded-xl border border-line dark:border-darkborder bg-white dark:bg-darkcard p-6">
              <div className="mb-4">
                <h3 className="text-lg font-bold text-ink dark:text-white">Agent Activity Log</h3>
                <p className="text-xs text-ink/50 dark:text-white/50 mt-0.5">Recursive tool runs and subgraph state transitions</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-line dark:border-darkborder/80 text-[10px] font-mono text-ink/40 dark:text-white/40 uppercase tracking-wider">
                      <th className="py-2.5 px-3">Stage Node</th>
                      <th className="py-2.5 px-3">Resolution Details</th>
                      <th className="py-2.5 px-3 text-right">Elapsed Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/60 dark:divide-darkborder/50">
                    {stages.map((stg, idx) => (
                      <tr key={idx} className="text-xs text-ink/80 dark:text-white/80 hover:bg-paper/30 dark:hover:bg-darkbg/25">
                        <td className="py-3 px-3 font-mono font-bold text-accent dark:text-emerald-400">
                          {stg.stage}
                        </td>
                        <td className="py-3 px-3">
                          <p className="font-semibold">{stg.label || "Completed"}</p>
                          {stg.detail && <p className="text-[10px] text-ink/50 dark:text-white/45 mt-0.5 leading-relaxed">{stg.detail}</p>}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-[10px] text-ink/40 dark:text-white/45">
                          {new Date(stg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Sources Grid */}
            {sources.length > 0 && (
              <div className="rounded-xl border border-line dark:border-darkborder bg-white dark:bg-darkcard p-6 space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-ink dark:text-white">Sources & References</h3>
                  <p className="text-xs text-ink/50 dark:text-white/50 mt-0.5">Scanned digital index locations for data integrity checks</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {sources.map((src, idx) => {
                    let hostname = "Resource link";
                    try {
                      hostname = new URL(src.url).hostname;
                    } catch (_) {}
                    
                    return (
                      <a
                        href={src.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        key={idx}
                        className="group flex flex-col justify-between p-4 rounded-xl border border-line dark:border-darkborder bg-paper/20 dark:bg-darkbg/30 hover:border-accent dark:hover:border-emerald-500 transition-all"
                      >
                        <div className="space-y-1">
                          <span className="font-mono text-[9px] text-accent dark:text-emerald-400 bg-accent/5 dark:bg-emerald-500/10 px-2 py-0.5 rounded border border-accent/15 dark:border-emerald-500/20">
                            {hostname}
                          </span>
                          <h4 className="text-xs font-bold text-ink dark:text-white leading-normal group-hover:text-accent dark:group-hover:text-emerald-400 transition-colors line-clamp-2">
                            {src.title}
                          </h4>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-ink/45 dark:text-white/40 mt-3 pt-2 border-t border-line/50 dark:border-darkborder/50">
                          <span>View article</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </div>
                      </a>
                    );
                  })}
                </div>
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Visual Helper Components                                           */
/* ------------------------------------------------------------------ */

function ConfidenceGauge({ value }) {
  const radius = 28;
  const strokeWidth = 5;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  let strokeColor = "stroke-amber-500 dark:stroke-amber-400";
  if (value >= 70) strokeColor = "stroke-emerald-500 dark:stroke-emerald-400";
  else if (value < 45) strokeColor = "stroke-rose-500 dark:stroke-rose-450";

  return (
    <div className="flex items-center gap-3 bg-white/20 dark:bg-black/25 px-4 py-2.5 rounded-xl border border-white/15">
      <div className="relative w-14 h-14 flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="28"
            cy="28"
            r={radius}
            className="stroke-ink/10 dark:stroke-white/10"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          <circle
            cx="28"
            cy="28"
            r={radius}
            className={`${strokeColor} transition-all duration-1000`}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            fill="transparent"
          />
        </svg>
        <span className="absolute font-mono text-sm font-bold text-ink dark:text-white">
          {value}
        </span>
      </div>
      <div>
        <span className="font-mono text-[9px] uppercase tracking-widest block opacity-60">Confidence</span>
        <span className="text-xs font-bold font-mono">Rating</span>
      </div>
    </div>
  );
}

function StatMini({ label, value }) {
  return (
    <div>
      <span className="text-[10px] font-mono uppercase tracking-wider text-ink/40 dark:text-white/40 block">
        {label}
      </span>
      <span className="text-sm font-bold font-mono text-ink/80 dark:text-white/80">
        {value}
      </span>
    </div>
  );
}

function StatBigCard({ label, value, sub }) {
  return (
    <div className="p-4 rounded-xl border border-line dark:border-darkborder bg-paper/30 dark:bg-darkbg/40">
      <span className="text-[9px] font-mono uppercase tracking-widest text-ink/40 dark:text-white/40 block">
        {label}
      </span>
      <p className="text-base font-extrabold font-mono text-ink dark:text-white mt-1">
        {value}
      </p>
      <span className="text-[9px] text-ink/40 dark:text-white/30 block mt-0.5">
        {sub}
      </span>
    </div>
  );
}

function BulletList({ items, variant }) {
  let icon = <span className="w-1.5 h-1.5 rounded-full bg-ink/30 mt-2 flex-shrink-0" />;

  if (variant === "bull") {
    icon = <TrendingUp className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />;
  } else if (variant === "bear") {
    icon = <TrendingDown className="w-4 h-4 text-rose-500 mt-0.5 flex-shrink-0" />;
  } else if (variant === "risk") {
    icon = <AlertTriangle className="w-4 h-4 text-rose-500 mt-0.5 flex-shrink-0" />;
  } else if (variant === "catalyst") {
    icon = <Sparkles className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />;
  }

  return (
    <ul className="space-y-3.5">
      {items.map((item, idx) => (
        <li key={idx} className="flex gap-2.5 text-xs sm:text-sm leading-relaxed text-ink/80 dark:text-white/80 items-start">
          {icon}
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function PriceRangeSlider({ price, low, high, currency, showDetail = false }) {
  // Compute price position percentage
  const percentage = Math.min(Math.max(((price - low) / (high - low)) * 100, 0), 100);

  return (
    <div className="space-y-2.5">
      <div className="flex justify-between text-[10px] font-mono text-ink/40 dark:text-white/40">
        <span>52W Low: {currency ?? ""} {low.toLocaleString()}</span>
        <span>52W High: {currency ?? ""} {high.toLocaleString()}</span>
      </div>
      
      {/* Slider bar */}
      <div className="relative h-2 rounded-full bg-paper dark:bg-darkbg border border-line dark:border-darkborder/50">
        {/* Progress bar */}
        <div 
          className="absolute top-0 bottom-0 left-0 bg-accent/30 dark:bg-emerald-500/20 rounded-full"
          style={{ width: `${percentage}%` }}
        />
        {/* Slider indicator node */}
        <div 
          className="absolute -top-[5px] w-4 h-4 rounded-full bg-accent dark:bg-emerald-500 border-2 border-white dark:border-darkcard shadow-sm cursor-help hover:scale-110 transition-transform"
          style={{ left: `calc(${percentage}% - 8px)` }}
          title={`Price Position: ${percentage.toFixed(0)}% of 52-week range`}
        />
      </div>

      {showDetail && (
        <div className="flex justify-between items-center text-[10px] font-mono text-ink/50 dark:text-white/50 pt-1.5">
          <span>Current Price: <strong>{currency ?? ""} {price.toLocaleString()}</strong></span>
          <span>Position: <strong>{percentage.toFixed(0)}%</strong> from low</span>
        </div>
      )}
    </div>
  );
}

function formatLargeNumber(n) {
  if (n >= 1e12) return `${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  return n.toLocaleString();
}
