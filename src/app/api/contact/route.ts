import { NextRequest } from "next/server";
import { z } from "zod";
import { getProvider } from "@/lib/ai";
import { CandidateSchema, ResearchReportSchema } from "@/lib/schemas";

export const runtime = "nodejs";
export const maxDuration = 180;

const Body = z.object({ candidate: CandidateSchema, research: ResearchReportSchema });

/** POST /api/contact — find a public contact email and decision-maker for one prospect. */
export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Missing prospect research." }, { status: 400 });
  try {
    const provider = await getProvider();
    const result = await provider.findContact(parsed.data.candidate, parsed.data.research);
    return Response.json({ result });
  } catch (err) {
    console.error("[contact] failed", err);
    const message = err instanceof Error && err.name === "ProviderError" ? err.message : "Contact lookup failed. Try again.";
    return Response.json({ error: message }, { status: 502 });
  }
}
