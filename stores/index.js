const LocalFileStore = require("./localFileStore");
const VectorStore    = require("./vectorStore");

/**
 * Factory function — returns the configured JokeStore implementation.
 *
 * Set STORE env var to switch:
 *   STORE=local   → LocalFileStore (default)
 *   STORE=vector  → VectorStore
 */
function createStore() {
  const type = (process.env.STORE || "local").toLowerCase();

  switch (type) {
    case "local":
      return new LocalFileStore();

    case "vector":
      return new VectorStore();

    default:
      console.warn(`⚠️  Unknown STORE="${type}", falling back to local`);
      return new LocalFileStore();
  }
}

module.exports = { createStore };
