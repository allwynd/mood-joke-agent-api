/**
 * jokeAgent.js
 *
 * Provider-agnostic agentic loop. Works with any BaseProvider implementation
 * (Anthropic, OpenAI, Gemini, ...) — no SDK imports here.
 *
 * Key behaviours preserved from the original implementation:
 *   - Free-form categories: the agent invents its own mood label rather than
 *     picking from a fixed enum (e.g. "heartbroken", "post-deadline-relief")
 *   - Combined search: category + query are merged into one search string so
 *     both signals inform the keyword/semantic lookup
 *   - Usage tracking: delegated to the provider (each provider knows its own
 *     response shape and rate-limit header format)
 *
 * Loop:
 *   1. Send raw mood + tool definition to the provider
 *   2. Provider returns { type: "tool_use", name, input } → execute against store
 *   3. Feed tool results back; provider returns { type: "text", text } → done
 */

const MAX_ITERATIONS = 5;

/**
 * @param {string}       rawMood   Free-text mood from the UI
 * @param {JokeStore}    store     Any JokeStore implementation
 * @param {BaseProvider} provider  Any BaseProvider implementation
 * @returns {Promise<string>}      The selected joke text
 */
async function runJokeAgent(rawMood, store, provider) {

  /* ── Tool definition (normalised format) ───────────────────────────────── */
  const tools = [
    {
      name: "pick_jokes",
      description:
        "Retrieve candidate jokes from the datastore that best match the user's mood. " +
        "Call this once with your own interpretation of the mood, then choose the single " +
        "most appropriate joke to return to the user.",
      parameters: {
        type: "object",
        properties: {
          category: {
            type: "string",
            description:
              "A short label you choose to classify the user's mood — e.g. 'tired', " +
              "'heartbroken', 'pumped-up', 'anxious'. There is no fixed list; pick " +
              "whatever single word or hyphenated phrase best captures the emotion.",
          },
          query: {
            type: "string",
            description:
              "A short semantic search query derived from the user's mood, used to " +
              "find thematically relevant jokes (e.g. 'exhausted sleepy long flight').",
          },
          topK: {
            type: "number",
            description: "How many candidate jokes to retrieve. Defaults to 5.",
          },
        },
        required: ["category", "query"],
      },
    },
  ];

  /* ── System prompt ─────────────────────────────────────────────────────── */
  const system =
    "You are a joke curator. Your job is to understand the user's mood — however they " +
    "describe it — and find the joke from our datastore that will make them laugh the most. " +
    "First decide on your own short category label for the mood, then call the pick_jokes " +
    "tool to fetch candidates. " +
    "Finally, respond with ONLY the joke text — no preamble, no explanation, just the joke.";

  /* ── Normalised message history ────────────────────────────────────────── */
  const messages = [
    { role: "user", content: `The user's current mood: "${rawMood}"` },
  ];

  /* ── Agentic loop ──────────────────────────────────────────────────────── */
  let iterations = 0;

  while (iterations < MAX_ITERATIONS) {
    iterations++;

    const response = await provider.call(messages, tools, system);

    console.log(`🤖  [Agent] provider=${provider.label} iteration=${iterations} type=${response.type}`);

    /* ── Done — return the joke ── */
    if (response.type === "text") {
      return response.text.trim();
    }

    /* ── Tool call — execute against the store ── */
    if (response.type === "tool_use") {
      const { id, name, input } = response;

      console.log(`🔧  [Agent] tool_call=${name}`, input);

      // Append assistant turn; carry provider-specific metadata for re-serialisation
      messages.push({
        role:       "assistant",
        content:    null,
        _raw:       response._rawContent,   // Anthropic: original content blocks
        _toolCalls: response._toolCalls,    // OpenAI:    tool_calls array
        _parts:     response._parts,        // Gemini:    parts array
      });

      let toolResultContent;

      if (name === "pick_jokes") {
        const { category, query, topK = 5 } = input;

        // Combine the agent's free-form category and query so both inform
        // the search — preserves the original single-search strategy
        const searchTerms = [category, query].filter(Boolean).join(" ");
        const candidates  = await store.search(searchTerms, topK);

        console.log(`📦  [Agent] candidates found: ${candidates.length} (category="${category}")`);

        toolResultContent = JSON.stringify({ candidates, category, query });
      } else {
        console.warn(`⚠️   [Agent] unknown tool requested: ${name}`);
        toolResultContent = JSON.stringify({ error: `Unknown tool: ${name}` });
      }

      // Normalised tool result — each provider translates this to its own wire format
      messages.push({
        role:       "tool_result",
        toolCallId: id,
        toolName:   name,    // Gemini needs the name for functionResponse
        content:    toolResultContent,
      });

      continue;
    }

    throw new Error(`[Agent] Unexpected response type: "${response.type}"`);
  }

  throw new Error(`Agent did not resolve within ${MAX_ITERATIONS} iterations`);
}

module.exports = { runJokeAgent };