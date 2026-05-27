/**
 * BaseProvider
 *
 * Abstract base class for all LLM provider implementations.
 *
 * Each provider is responsible for:
 *   1. Translating the normalised tool definition format into its own wire format
 *   2. Making the HTTP call to the LLM API
 *   3. Translating the response back into the normalised AgentResponse format
 *
 * The agent loop in jokeAgent.js only ever calls provider.call() and never
 * imports an SDK directly — swap providers by changing LLM_PROVIDER in .env.
 *
 * ── Normalised tool definition format (input to call()) ─────────────────────
 * {
 *   name:        string,
 *   description: string,
 *   parameters: {          // JSON Schema object
 *     type: "object",
 *     properties: { ... },
 *     required: string[]
 *   }
 * }
 *
 * ── Normalised message format (input to call()) ──────────────────────────────
 * { role: "user" | "assistant",  content: string }
 * { role: "tool_result", toolCallId: string, content: string }
 *
 * ── Normalised AgentResponse format (returned by call()) ────────────────────
 * { type: "text",     text: string }
 * { type: "tool_use", id: string, name: string, input: object }
 */
class BaseProvider {
  /**
   * @param {object} config
   * @param {string} config.model      Model ID string
   * @param {number} config.maxTokens  Max tokens for the response (default 1024)
   * @param {string} apiKey  API key for the provider (if required) — can also be set via environment variable
   */
  constructor(config = {}, apiKey) {
    if (new.target === BaseProvider) {
      throw new Error("BaseProvider is abstract — instantiate a concrete provider");
    }

    //console.log(`Initializing provider ${this.constructor.name} with model ${config.model} and API key ${apiKey ? "set" : "NOT SET"}`);

    // ✅ Fail fast — don't let a missing key produce a cryptic 401 later
    if (!apiKey) {
      throw new Error(
        `${new.target.name}: API key is not set. ` +
        "Add it to your .env file or export it as an environment variable."
      );
    }

    this.model     = config.model;
    this.maxTokens = config.maxTokens || 1024;
  }

  /**
   * Run one turn of the agentic loop.
   *
   * @param {object[]} messages   Conversation history in normalised format
   * @param {object[]} tools      Tool definitions in normalised format
   * @param {string}   system     System prompt string
   *
   * @returns {Promise<AgentResponse>}
   *   Either { type: "text", text }
   *   or     { type: "tool_use", id, name, input }
   */
  async call(messages, tools, system) {
    throw new Error(`${this.constructor.name} must implement call()`);
  }

  /**
   * Human-readable label used in logs and the /usage endpoint.
   * @returns {string}
   */
  get label() {
    return `${this.constructor.name} (${this.model})`;
  }
}

module.exports = BaseProvider;