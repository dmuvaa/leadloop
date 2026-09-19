import { NextRequest } from "next/server";
import { z } from "zod";
import { getProvider } from "@/lib/ai";
import { ProviderError } from "@/lib/ai/provider";
import { normalizeWebsite } from "@/lib/utils";

export const runtime = "nodejs";
export const maxDuration = 90;

const Body = z.object({
  website: z.string().min(3, "Enter your website."),
  offer: z.string().optional(),
  icp: z.string().optional(),
});

/** POST /api/website — read the seller's site and draft offer, ICP and outreach voice. */
export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "Enter your website." }, { status: 400 });
  }
  const website = normalizeWebsite(parsed.data.website);
  if (!website) {
    return Response.json({ error: "Enter a valid website, like https://yourcompany.com." }, { status: 400 });
  }
  try {
    const provider = await getProvider();
    const seller = await provider.analyzeSellerWebsite(website, {
      offer: parsed.data.offer?.trim() || undefined,
      icp: parsed.data.icp?.trim() || undefined,
    });
    return Response.json({ seller: { ...seller, website } });
  } catch (err) {
    const message =
      err instanceof ProviderError || (err instanceof Error && err.name === "ProviderError")
        ? (err as Error).message
        : "Could not read that website. Check the URL and try again.";
    console.error("[website] failed", err);
    return Response.json({ error: message }, { status: 502 });
  }
}
