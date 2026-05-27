const OpenAI       = require("openai");
const BaseProvider = require("./baseProvider");

const DEFAULT_MODEL = "gpt-4o";

/**
 * OpenAIProvider
 *
 * Wraps the OpenAI SDK. Supports any model with tool/function calling:
 * gpt-4o, gpt-4o-mini, gpt-4-turbo, gpt-3.5-turbo, etc.
 *
 * ── Tool format translation ──────────────────────────────────────────────────
 * Normalised → OpenAI:
 *   { name, description, parameters } → { type: "function", function: { name, description, parameters } }
 *
 * OpenAI response → Normalised:
 *   finish_reason "stop"           → { type: "text", text }
 *   finish_reason "tool_calls"     → { type: "tool_use", id, name, input }
 *
 * ── Tool result format ───────────────────────────────────────────────────────
 * Normalised { role: "tool_result", toolCallId, content }
 *   → OpenAI { role: "tool", tool_call_id: toolCallId, content }
 *
 * OpenAI does not use a separate system message field — the system prompt is
 * prepended as a { role: "system" } message instead.
 */
class OpenAIProvider extends BaseProvider {
  constructor() {
    super({
      model:     process.env.OPENAI_MODEL || DEFAULT_MODEL,
      maxTokens: parseInt(process.env.LLM_MAX_TOKENS, 10) || 1024,
    });
    this._client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    console.log(`🟢 Provider=[OpenAIProvider] -> Model=${this.model}`);
  }

  /* ── Format translators ────────────────────────────────────────────────── */

  /** Normalised tool definition → OpenAI function tool format */
  _formatTools(tools) {
    return tools.map(t => ({
      type: "function",
      function: {
        name:        t.name,
        description: t.description,
        parameters:  t.parameters,   // JSON Schema — same structure
      },
    }));
  }

  /**
   * Normalised messages → OpenAI messages.
   * System prompt is injected as the first message.
   */
  _formatMessages(messages, system) {
    const out = [];

    if (system) {
      out.push({ role: "system", content: system });
    }

    for (const msg of messages) {
      if (msg.role === "tool_result") {
        out.push({
          role:         "tool",
          tool_call_id: msg.toolCallId,
          content:      msg.content,
        });
      } else if (msg.role === "assistant" && msg._toolCalls) {
        // Re-attach tool_calls array so OpenAI sees a valid assistant turn
        out.push({
          role:       "assistant",
          content:    msg.content || null,
          tool_calls: msg._toolCalls,
        });
      } else {
        out.push({ role: msg.role, content: msg.content });
      }
    }

    return out;
  }

  /** OpenAI response → normalised AgentResponse */
  _parseResponse(response) {
    const choice = response.choices[0];

    if (!choice) throw new Error("OpenAIProvider: response contained no choices");

    if (choice.finish_reason === "stop") {
      return { type: "text", text: choice.message.content || "" };
    }

    if (choice.finish_reason === "tool_calls") {
      const toolCall = choice.message.tool_calls[0];
      let input;
      try {
        input = JSON.parse(toolCall.function.arguments);
      } catch {
        throw new Error(`OpenAIProvider: could not parse tool arguments: ${toolCall.function.arguments}`);
      }
      return {
        type:       "tool_use",
        id:         toolCall.id,
        name:       toolCall.function.name,
        input,
        // Carry the full tool_calls array for re-attachment on next turn
        _toolCalls: choice.message.tool_calls,
      };
    }

    throw new Error(`OpenAIProvider: unexpected finish_reason "${choice.finish_reason}"`);
  }

  /* ── Main call ─────────────────────────────────────────────────────────── */

  async call(messages, tools, system) {
    const response = await this._client.chat.completions.create({
      model:      this.model,
      max_tokens: this.maxTokens,
      tools:      this._formatTools(tools),
      messages:   this._formatMessages(messages, system),
    });

    return this._parseResponse(response);
  }
}

module.exports = OpenAIProvider;