const fs        = require("fs");
const path      = require("path");
const JokeStore = require("./jokeStore");

/**
 * LocalFileStore
 *
 * Reads jokes from a flat text file — one joke per line.
 * Blank lines and lines beginning with `#` are treated as comments.
 *
 * Hot-reload: call store.reload() or send SIGHUP to the process.
 *
 * Search strategy: keyword scoring — each joke is scored by how many
 * words from the query appear in it. Good enough for local use; replace
 * with VectorStore for semantic accuracy at scale.
 */
class LocalFileStore extends JokeStore {
  /**
   * @param {string} filePath  Absolute path to the jokes text file.
   *                           Defaults to JOKES_FILE env var or randomJokes.txt.
   */
  constructor(filePath) {
    super();
    this.filePath = filePath
      || (process.env.JOKES_FILE
          ? path.resolve(process.env.JOKES_FILE)
          : path.join(__dirname, "..", "input_files", "randomJokes.txt"));

    this._jokes = [];
    this.reload();
  }

  /* ── Internal helpers ──────────────────────── */

  reload() {
    try {
      const raw = fs.readFileSync(this.filePath, "utf8");
      this._jokes = raw
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line.length > 0 && !line.startsWith("#"));
      console.log(`✅  [LocalFileStore] Loaded ${this._jokes.length} jokes from: ${this.filePath}`);
    } catch (err) {
      console.error(`❌  [LocalFileStore] Failed to load ${this.filePath}:`, err.message);
      if (this._jokes.length === 0) throw err; // fatal on first load
    }
  }

  /* ── JokeStore API ─────────────────────────── */

  async getAll() {
    return [...this._jokes];
  }

  /**
   * Keyword-scored search over all jokes.
   * Returns the topK highest-scoring joke strings. Ties are shuffled for variety,
   * and if no jokes match the query we still return topK random jokes so the
   * agent always has something to pick from.
   */
  async search(query, topK = 5) {
    const terms = query.toLowerCase().split(/\W+/).filter(Boolean);

    const scored = this._jokes.map(text => {
      const lower = text.toLowerCase();
      const score = terms.reduce((s, t) => s + (lower.includes(t) ? 1 : 0), 0);
      return { text, score };
    });

    scored.sort((a, b) => b.score - a.score || Math.random() - 0.5);
    return scored.slice(0, topK).map(j => j.text);
  }
}

module.exports = LocalFileStore;
