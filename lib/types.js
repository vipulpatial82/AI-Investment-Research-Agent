/**
 * @typedef {Object} SourceRef
 * @property {string} title
 * @property {string} url
 * @property {string} [snippet]
 */

/**
 * @typedef {Object} StageLog
 * @property {string} stage
 * @property {string} label
 * @property {string} detail
 * @property {string} timestamp
 */

/**
 * @typedef {Object} FinancialSnapshot
 * @property {string} [ticker]
 * @property {string} [exchange]
 * @property {number | null} [price]
 * @property {string | null} [currency]
 * @property {number | null} [marketCap]
 * @property {number | null} [peRatio]
 * @property {number | null} [revenueGrowthYoY]
 * @property {number | null} [profitMargin]
 * @property {number | null} [debtToEquity]
 * @property {number | null} [fiftyTwoWeekHigh]
 * @property {number | null} [fiftyTwoWeekLow]
 * @property {Record<string, unknown>} [raw]
 * @property {string} [notes]
 */

/**
 * @typedef {"INVEST" | "PASS" | "WATCHLIST"} Verdict
 */

/**
 * @typedef {Object} InvestmentVerdict
 * @property {string} company
 * @property {string} [tickerGuess]
 * @property {Verdict} verdict
 * @property {number} confidence - 0-100
 * @property {string} thesisSummary
 * @property {string[]} bullCase
 * @property {string[]} bearCase
 * @property {string[]} keyRisks
 * @property {string[]} catalysts
 * @property {string} suggestedHorizon
 * @property {string} suggestedPositionNote
 * @property {string[]} reasoningChain
 */

/**
 * @typedef {Object} ResearchResult
 * @property {string} company
 * @property {string} generatedAt
 * @property {FinancialSnapshot} financials
 * @property {string} newsSummary
 * @property {string} competitiveSummary
 * @property {SourceRef[]} sources
 * @property {InvestmentVerdict} verdict
 * @property {StageLog[]} stages
 */

/**
 * @typedef {Object} AgentRunRequest
 * @property {string} company
 * @property {"conservative" | "balanced" | "aggressive"} [riskProfile]
 * @property {"short" | "medium" | "long"} [horizon]
 */

export {};
