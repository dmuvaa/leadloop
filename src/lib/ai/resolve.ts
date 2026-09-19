export type ProviderId = "openai" | "anthropic";

export function openaiApiKey() {
  return process.env.OPENAI_API_KEY?.trim() || process.env.OPEN_API_KEY?.trim() || "";
}

export function anthropicApiKey() {
  return process.env.ANTHROPIC_API_KEY?.trim() || "";
}

export function isLowCreditError(err: unknown) {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  return /credit balance is too low|too low to access the anthropic|insufficient.?quota|billing/i.test(msg);
}

/**
 * Prefer OpenAI whenever that key exists. Claude is only used if there is no
 * OpenAI key, or if LEADLOOP_PROVIDER=anthropic and OpenAI is unset.
 */
export function resolveProviderId(): ProviderId | null {
  const forced = process.env.LEADLOOP_PROVIDER?.trim().toLowerCase();
  if (openaiApiKey()) return "openai";
  if (forced === "anthropic" && anthropicApiKey()) return "anthropic";
  if (anthropicApiKey()) return "anthropic";
  if (forced === "openai") return null;
  return null;
}
