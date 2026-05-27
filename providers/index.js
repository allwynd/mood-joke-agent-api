const AnthropicProvider = require("./anthropicProvider");
const OpenAIProvider    = require("./openaiProvider");
const GeminiProvider    = require("./geminiProvider");

/**
 * createProvider
 *
 * Factory that returns the configured LLM provider implementation.
 * Controlled entirely by environment variables — no code changes needed
 * to switch between providers.
 *
 * ── Environment variables ────────────────────────────────────────────────────
 * LLM_PROVIDER     Which provider to use (default: "anthropic")
 *                  Accepted values: anthropic | openai | gemini
 *
 * ANTHROPIC_MODEL  Model ID for Anthropic  (default: claude-sonnet-4-6)
 * OPENAI_MODEL     Model ID for OpenAI     (default: gpt-4o)
 * GEMINI_MODEL     Model ID for Gemini     (default: gemini-1.5-pro)
 *
 * LLM_MAX_TOKENS   Max output tokens, applies to all providers (default: 1024)
 *
 * ── Required API key per provider ────────────────────────────────────────────
 * anthropic → ANTHROPIC_API_KEY
 * openai    → OPENAI_API_KEY
 * gemini    → GEMINI_API_KEY
 *
 * @returns {BaseProvider}
 */
function createProvider() {
  const name = (process.env.LLM_PROVIDER || "anthropic").toLowerCase().trim();

  switch (name) {
    case "anthropic":
      return new AnthropicProvider();

    case "openai":
      return new OpenAIProvider();

    case "gemini":
      return new GeminiProvider();

    default:
      throw new Error(
        `Unknown LLM_PROVIDER="${name}". Valid values: anthropic | openai | gemini`
      );
  }
}

module.exports = { createProvider };