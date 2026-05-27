const JokeStore = require("./jokeStore");

/**
 * VectorStore
 *
 * Semantic joke retrieval using vector embeddings.
 * Activate with: STORE=vector in your .env
 *
 * ─── Setup steps ────────────────────────────────────────────────────────
 *
 * 1. Pick a vector DB:
 *      Pinecone  → npm install @pinecone-database/pinecone
 *      pgvector  → npm install pg pgvector
 *      Qdrant    → npm install @qdrant/js-client-rest
 *
 * 2. Pick an embedding provider:
 *      OpenAI    → npm install openai
 *      Cohere    → npm install cohere-ai
 *      (Anthropic does not currently expose an embeddings API)
 *
 * 3. Run the one-time indexing script to embed and upsert all jokes:
 *      node scripts/indexJokes.js
 *
 * 4. Set env vars (see .env.example) and set STORE=vector
 *
 * ─── How search works ───────────────────────────────────────────────────
 *
 * User types "wiped out after a red-eye flight"
 *   → embedText() converts it to a vector
 *   → vector DB returns the top-K nearest joke vectors
 *   → agent picks the single best one
 *
 * This beats keyword matching because "red-eye flight" has no keywords in
 * common with tired jokes, but embedding similarity bridges the gap.
 * ────────────────────────────────────────────────────────────────────────
 */
class VectorStore extends JokeStore {
  constructor() {
    super();
    this._client    = null;
    this._embedder  = null;
    this._indexName = process.env.VECTOR_INDEX_NAME || "mood-jokes";
    this._init();
  }

  _init() {
    /* ── Uncomment the provider block you choose ── */

    // ── Option A: Pinecone + OpenAI ─────────────
    // const { Pinecone } = require("@pinecone-database/pinecone");
    // const { OpenAI }   = require("openai");
    // this._client  = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
    // this._openai  = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // ── Option B: Qdrant + OpenAI ────────────────
    // const { QdrantClient } = require("@qdrant/js-client-rest");
    // const { OpenAI }       = require("openai");
    // this._client = new QdrantClient({ url: process.env.QDRANT_URL });
    // this._openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    console.warn("⚠️  [VectorStore] No provider initialised — set STORE=local or wire up a provider in vectorStore.js");
  }

  /* ── Embedding helper ──────────────────────── */

  async _embed(text) {
    // ── OpenAI example ───────────────────────────
    // const res = await this._openai.embeddings.create({
    //   model: "text-embedding-3-small",
    //   input: text,
    // });
    // return res.data[0].embedding;

    throw new Error("VectorStore._embed() not implemented — see comments in vectorStore.js");
  }

  /* ── JokeStore API ─────────────────────────── */

  async getAll() {
    // ── Pinecone example (dump everything) ──────
    // const index  = this._client.index(this._indexName);
    // const dummy  = new Array(1536).fill(0);
    // const result = await index.query({
    //   vector: dummy,
    //   topK: 10000,
    //   includeMetadata: true,
    // });
    // return result.matches.map(m => m.metadata.text);

    throw new Error("VectorStore.getAll() not implemented");
  }

  async search(query, topK = 5) {
    // ── Pinecone example ─────────────────────────
    // const vector = await this._embed(query);
    // const index  = this._client.index(this._indexName);
    // const result = await index.query({ vector, topK, includeMetadata: true });
    // return result.matches.map(m => m.metadata.text);

    // ── Qdrant example ───────────────────────────
    // const vector = await this._embed(query);
    // const result = await this._client.search(this._indexName, {
    //   vector,
    //   limit: topK,
    //   with_payload: true,
    // });
    // return result.map(r => r.payload.text);

    throw new Error("VectorStore.search() not implemented");
  }
}

module.exports = VectorStore;
