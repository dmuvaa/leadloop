import type { AIProvider } from "./provider";
import { ProviderError } from "./provider";

/**
 * Resolves the active provider. Requires ANTHROPIC_API_KEY.
 * Constructed per request so .env.local changes are picked up without a restart.
 */
export async function getProvider(): Promise<AIProvider> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new ProviderError("Research is not configured. Set ANTHROPIC_API_KEY and restart the server.");
  }
  const { AnthropicProvider } = await import("./anthropic");
  return new AnthropicProvider();
}
