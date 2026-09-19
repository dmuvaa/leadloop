import type { AIProvider } from "./provider";
import { ProviderError } from "./provider";
import { isLowCreditError, openaiApiKey, resolveProviderId, type ProviderId } from "./resolve";

/**
 * Resolves the active provider. OpenAI is used when OPENAI_API_KEY is set
 * (or OPEN_API_KEY), even if LEADLOOP_PROVIDER=anthropic. Claude is the
 * fallback only when no OpenAI key is present.
 */
export async function getProvider(): Promise<AIProvider> {
  const id = resolveProviderId();
  const primary = await loadProvider(id);
  if (id === "anthropic" && openaiApiKey()) {
    return new CreditFallbackProvider(primary, await loadProvider("openai"));
  }
  return primary;
}

async function loadProvider(id: ProviderId | null): Promise<AIProvider> {
  if (id === "openai") {
    const { OpenAIProvider } = await import("./openai");
    return new OpenAIProvider();
  }
  if (id === "anthropic") {
    const { AnthropicProvider } = await import("./anthropic");
    return new AnthropicProvider();
  }
  throw new ProviderError("Research is not configured. Set OPENAI_API_KEY or ANTHROPIC_API_KEY and restart the server.");
}

/** If Claude is out of credit, finish the request on OpenAI. */
class CreditFallbackProvider implements AIProvider {
  private active: AIProvider;

  constructor(
    private readonly primary: AIProvider,
    private readonly secondary: AIProvider
  ) {
    this.active = primary;
  }

  get name() {
    return this.active.name;
  }

  private async run<T>(fn: (provider: AIProvider) => Promise<T>): Promise<T> {
    try {
      return await fn(this.active);
    } catch (err) {
      if (this.active === this.primary && isLowCreditError(err)) {
        this.active = this.secondary;
        return fn(this.active);
      }
      throw err;
    }
  }

  analyzeOffer(...args: Parameters<AIProvider["analyzeOffer"]>) {
    return this.run((p) => p.analyzeOffer(...args));
  }
  analyzeSellerWebsite(...args: Parameters<AIProvider["analyzeSellerWebsite"]>) {
    return this.run((p) => p.analyzeSellerWebsite(...args));
  }
  findCandidates(...args: Parameters<AIProvider["findCandidates"]>) {
    return this.run((p) => p.findCandidates(...args));
  }
  researchProspect(...args: Parameters<AIProvider["researchProspect"]>) {
    return this.run((p) => p.researchProspect(...args));
  }
  findContact(...args: Parameters<AIProvider["findContact"]>) {
    return this.run((p) => p.findContact(...args));
  }
  analyzeOpportunity(...args: Parameters<AIProvider["analyzeOpportunity"]>) {
    return this.run((p) => p.analyzeOpportunity(...args));
  }
  generateEmail(...args: Parameters<AIProvider["generateEmail"]>) {
    return this.run((p) => p.generateEmail(...args));
  }
}

export { resolveProviderId } from "./resolve";
