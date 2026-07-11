import { NextResponse } from "next/server";
import { runInvestmentResearch } from "@/lib/agent.js";

export const runtime = "nodejs";
// Default agent budget ~= 138s (45s timeout * 3 attempts + linear backoff).
// Keep route cap above that to prevent premature platform timeouts.
export const maxDuration = 180;

function toPublicErrorMessage(err) {
  const msg = err?.message ?? "";
  if (err?.code === "MISSING_GOOGLE_API_KEY" || msg.includes("GOOGLE_API_KEY")) {
    return "Server is not configured: GOOGLE_API_KEY is missing. Add it to .env.local and restart.";
  }
  if (msg.includes("429") || msg.includes("quota") || msg.includes("Quota") || msg.includes("Too Many Requests")) {
    return "All Gemini models hit their quota limit. Wait a minute and retry, or get a new API key at https://aistudio.google.com/app/apikeys";
  }
  if (msg.includes("API_KEY_INVALID") || msg.includes("invalid api key") || msg.includes("API key not valid")) {
    return "Your GOOGLE_API_KEY is invalid. Get a fresh key at https://aistudio.google.com/app/apikeys (keys start with AIza...)";
  }
  if (msg.includes("timeout")) {
    return "The AI model timed out. Please try again — it usually succeeds on retry.";
  }
  return `Research request failed: ${msg || "Please retry in a moment."}`;
}

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body?.company || typeof body.company !== "string" || !body.company.trim()) {
    return NextResponse.json({ error: "Field 'company' (string) is required." }, { status: 400 });
  }

  try {
    const result = await runInvestmentResearch(body);
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("[research] agent run failed:", err);
    return NextResponse.json({ error: toPublicErrorMessage(err) }, { status: 500 });
  }
}
