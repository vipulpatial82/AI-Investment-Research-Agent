import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { runInvestmentResearch } from "./lib/agent.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

function toPublicErrorMessage(err) {
  if (err?.code === "MISSING_GOOGLE_API_KEY") {
    return "Server is not configured. Set GOOGLE_API_KEY and retry.";
  }
  return "Research request failed. Please retry in a moment.";
}

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.post("/api/research", async (req, res) => {
  const { company, riskProfile, horizon } = req.body ?? {};

  if (!company || typeof company !== "string" || !company.trim()) {
    return res.status(400).json({ error: "Field 'company' (string) is required." });
  }

  try {
    const result = await runInvestmentResearch({ company, riskProfile, horizon });
    res.json(result);
  } catch (err) {
    console.error("[research] agent run failed:", err);
    res.status(500).json({ error: toPublicErrorMessage(err) });
  }
});

app.listen(PORT, () => {
  console.log(`\n  ✓ Investment Research Agent running`);
  console.log(`  → http://localhost:${PORT}\n`);
});
