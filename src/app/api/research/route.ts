import { NextRequest } from "next/server";
import { getProvider } from "@/lib/ai";
import { runPipeline } from "@/lib/pipeline";
import { BriefSchema, type PipelineEvent } from "@/lib/schemas";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * POST /api/research
 * Streams newline-delimited JSON PipelineEvents while the agent pipeline runs.
 */
export async function POST(req: NextRequest) {
  let brief;
  try {
    brief = BriefSchema.parse(await req.json());
  } catch {
    return Response.json({ error: "Please fill in what you sell and who you want to sell to." }, { status: 400 });
  }

  let provider;
  try {
    provider = await getProvider();
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "Research unavailable." }, { status: 503 });
  }
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const emit = (e: PipelineEvent) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(JSON.stringify(e) + "\n"));
        } catch {
          closed = true;
        }
      };
      try {
        await runPipeline(provider, brief, emit, req.signal);
      } catch (err) {
        console.error("[research] pipeline failed", err);
        emit({ type: "error", message: err instanceof Error && err.name === "ProviderError" ? err.message : "Research unavailable. Try again." });
      } finally {
        closed = true;
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
