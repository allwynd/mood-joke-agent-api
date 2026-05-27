/**
 * JokeStore — abstract base class
 *
 * All store implementations must provide:
 *   getAll()              → string[]   every joke in the corpus
 *   search(query, topK)   → string[]   semantic / keyword search
 *
 * The store no longer organises jokes by category — the AI agent classifies
 * the user's mood itself and uses search() to retrieve relevant candidates.
 *
 * Swap implementations via the STORE env var without touching agent code.
 */
class JokeStore {
  /**
   * Return every joke in the corpus.
   * @returns {Promise<string[]>}
   */
  async getAll() {
    throw new Error(`${this.constructor.name} must implement getAll()`);
  }

  /**
   * Return the topK most relevant jokes for a free-text query.
   * @param {string} query
   * @param {number} topK
   * @returns {Promise<string[]>}
   */
  async search(query, topK = 5) {
    throw new Error(`${this.constructor.name} must implement search()`);
  }
}

module.exports = JokeStore;
