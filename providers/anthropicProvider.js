const Anthropic      = require("@anthropic-ai/sdk");
const BaseProvider   = require("./baseProvider");

const DEFAULT_MODEL = "claude-sonnet-4-6";

/**
 * AnthropicProvider
 *
 * Wraps the Anthropic SDK. Translates the normalised tool/message format
 * used by the agent loop into Anthropic's wire format and back.
 *
 * ── Tool format translation ──────────────────────────────────────────────────
 * Normalised → Anthropic: `parameters` key becomes `input_schema`
 * Anthropic response → Normalised: tool_use blocks mapped to { type, id, name, input }
 *
 * ── Tool result format ───────────────────────────────────────────────────────
 * Normalised { role: "tool_result", toolCallId, content }
 *   → Anthropic { role: "user", content: [{ type: "tool_result", tool_use_id, content }] }
 */
class AnthropicProvider extends BaseProvider {
  constructor() {
    super({
      model:     process.env.ANTHROPIC_MODEL || DEFAULT_MODEL,
      maxTokens: parseInt(process.env.LLM_MAX_TOKENS, 10) || 1024,
    });
    this._client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    console.log(`🟢 Provider=[AnthropicProvider] -> Model=${this.model}`);
  }

  /* ── Format translators ────────────────────────────────────────────────── */

  /** Normalised tool definition → Anthropic format */
  _formatTools(tools) {
    return tools.map(t => ({
      name:         t.name,
      description:  t.description,
      input_schema: t.parameters,   // key rename only
    }));
  }

  /** Normalised messages → Anthropic messages */
  _formatMessages(messages) {
    const out = [];

    for (const msg of messages) {
      if (msg.role === "tool_result") {
        out.push({
          role:    "user",
          content: [{
            type:        "tool_result",
            tool_use_id: msg.toolCallId,
            content:     msg.content,
          }],
        });
      } else if (msg.role === "assistant" && msg._raw) {
        out.push({ role: "assistant", content: msg._raw });
      } else {
        out.push({ role: msg.role, content: msg.content });
      }
    }

    return out;
  }

  /** Anthropic response → normalised AgentResponse */
  _parseResponse(response) {
    if (response.stop_reason === "end_turn") {
      const block = response.content.find(b => b.type === "text");
      if (!block) throw new Error("AnthropicProvider: end_turn response contained no text block");
      return { type: "text", text: block.text };
    }

    if (response.stop_reason === "tool_use") {
      const block = response.content.find(b => b.type === "tool_use");
      if (!block) throw new Error("AnthropicProvider: tool_use response contained no tool_use block");
      return {
        type:        "tool_use",
        id:          block.id,
        name:        block.name,
        input:       block.input,
        _rawContent: response.content,
      };
    }

    throw new Error(`AnthropicProvider: unexpected stop_reason "${response.stop_reason}"`);
  }

  /* ── Main call ─────────────────────────────────────────────────────────── */

  async call(messages, tools, system) {
    /* .withResponse() gives us both the parsed body and the raw HTTP response
       so we can capture rate-limit headers alongside token usage counts. */
    const { data: response, response: httpResponse } = await this._client.messages
      .create({
        model:      this.model,
        max_tokens: this.maxTokens,
        system,
        tools:    this._formatTools(tools),
        messages: this._formatMessages(messages),
      })
      .withResponse();

    /*usageTracker.record({ model: response.model || this.model, usage: response.usage });
    usageTracker.recordRateLimit(httpResponse.headers);*/

    return this._parseResponse(response);
  }
}

module.exports = AnthropicProvider;