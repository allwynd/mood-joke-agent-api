const { GoogleGenerativeAI } = require("@google/generative-ai");
const BaseProvider           = require("./baseProvider");

const DEFAULT_MODEL = "gemini-1.5-pro";

/**
 * GeminiProvider
 *
 * Wraps the Google Generative AI SDK. Supports Gemini models with
 * function calling: gemini-1.5-pro, gemini-1.5-flash, gemini-2.0-flash, etc.
 *
 * ── Tool format translation ──────────────────────────────────────────────────
 * Normalised → Gemini:
 *   tools array → { functionDeclarations: [{ name, description, parameters }] }
 *   Note: Gemini uses a single `tools` object with a `functionDeclarations`
 *   array, not one object per tool.
 *
 * Gemini response → Normalised:
 *   text part present            → { type: "text", text }
 *   functionCall part present    → { type: "tool_use", id, name, input }
 *
 * ── Tool result format ───────────────────────────────────────────────────────
 * Normalised { role: "tool_result", toolCallId, content }
 *   → Gemini { role: "user", parts: [{ functionResponse: { name, response } }] }
 *
 * Gemini identifies function responses by name, not by ID — the provider
 * stores a map of { id → name } during tool_use turns for lookup.
 *
 * ── System prompt ────────────────────────────────────────────────────────────
 * Gemini accepts a top-level `systemInstruction` parameter rather than a
 * system message in the conversation history.
 */
class GeminiProvider extends BaseProvider {
  constructor() {
    super({
      model:     process.env.GEMINI_MODEL || DEFAULT_MODEL,
      maxTokens: parseInt(process.env.LLM_MAX_TOKENS, 10) || 1024,
    }, process.env.GEMINI_API_KEY);


    this._genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    // Map of toolCallId → toolName for resolving function responses
    this._toolCallNames = {};
    console.log(`🔵  [GeminiProvider] model=${this.model}`);
  }

  /* ── Format translators ────────────────────────────────────────────────── */

  /** Normalised tool definitions → Gemini functionDeclarations format */
  _formatTools(tools) {
    return [{
      functionDeclarations: tools.map(t => ({
        name:        t.name,
        description: t.description,
        parameters:  t.parameters,   // JSON Schema — compatible structure
      })),
    }];
  }

  /** Normalised messages → Gemini contents array */
  _formatMessages(messages) {
    const out = [];

    for (const msg of messages) {
      if (msg.role === "tool_result") {
        // Look up the function name by the stored id→name mapping
        const fnName = this._toolCallNames[msg.toolCallId] || "pick_jokes";
        out.push({
          role:  "user",
          parts: [{
            functionResponse: {
              name:     fnName,
              response: { content: msg.content },
            },
          }],
        });
      } else if (msg.role === "assistant" && msg._parts) {
        out.push({ role: "model", parts: msg._parts });
      } else {
        const role = msg.role === "assistant" ? "model" : "user";
        out.push({ role, parts: [{ text: msg.content }] });
      }
    }

    return out;
  }

  /** Gemini response → normalised AgentResponse */
  _parseResponse(response) {
    const candidate = response.candidates?.[0];
    if (!candidate) throw new Error("GeminiProvider: response contained no candidates");

    const parts = candidate.content?.parts || [];

    // Check for a function call part first
    const fnCallPart = parts.find(p => p.functionCall);
    if (fnCallPart) {
      const fn = fnCallPart.functionCall;
      // Generate a synthetic ID (Gemini doesn't provide one) and store the name
      const id = `gemini-tc-${Date.now()}`;
      this._toolCallNames[id] = fn.name;
      return {
        type:   "tool_use",
        id,
        name:   fn.name,
        input:  fn.args || {},
        _parts: parts,
      };
    }

    // Otherwise expect a text part
    const textPart = parts.find(p => typeof p.text === "string");
    if (textPart) {
      return { type: "text", text: textPart.text };
    }

    // Check finish reason for a clearer error
    const reason = candidate.finishReason;
    throw new Error(`GeminiProvider: no usable content in response (finishReason="${reason}")`);
  }

  /* ── Main call ─────────────────────────────────────────────────────────── */

  async call(messages, tools, system) {
    const geminiModel = this._genAI.getGenerativeModel({
      model:             this.model,
      systemInstruction: system,
      generationConfig:  { maxOutputTokens: this.maxTokens },
    });

    const response = await geminiModel.generateContent({
      tools:    this._formatTools(tools),
      contents: this._formatMessages(messages),
    });

    return this._parseResponse(response.response);
  }
}

module.exports = GeminiProvider;