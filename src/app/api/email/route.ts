import { NextRequest } from "next/server";
import { z } from "zod";
import { getProvider } from "@/lib/ai";
import { AngleSchema, BriefSchema, CandidateSchema, OpportunitySchema, ResearchReportSchema } from "@/lib/schemas";

export const runtime = "nodejs";
export const maxDuration = 120;

const Body = z.object({
  candidate: CandidateSchema,
  research: ResearchReportSchema,
  opportunity: OpportunitySchema,
  angle: AngleSchema,
  brief: BriefSchema,
  previousEmails: z.array(z.object({ subject: z.string(), body: z.string(), angleId: z.string() })).optional(),
});

/** POST /api/email — generate one outreach email for a prospect + angle. */
export async function POST(req: NextRequest) {
  let input;
  try {
    input = Body.parse(await req.json());
  } catch {
    return Response.json({ error: "Missing prospect research. Re-run the search." }, { status: 400 });
  }
  try {
    const provider = await getProvider();
    const email = await provider.generateEmail(input);
    return Response.json({ email: { ...email, createdAt: new Date().toISOString() } });
  } catch (err) {
    console.error("[email] failed", err);
    const message = err instanceof Error && err.name === "ProviderError" ? err.message : "Email generation failed. Retry.";
    return Response.json({ error: message }, { status: 502 });
  }
}
