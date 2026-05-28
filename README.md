# Mood Joke

Simple Node.js + Express project that contains APIs and Claude agent `/api/joke`.

Quick start

```bash
npm install
npm start
```

Development

```bash
npm install --save-dev nodemon
npm run dev
```

Endpoints

- `POST /api/joke` — Retrieve AI-curated jokes based on natural language mood input: 
`{ "mood": "describe your mood using natural language" }`
- `POST /api/rate-joke` — Records a 1–3 star rating for a previously returned joke: 
`{"mood": "happy","joke": "Why don't scientists trust atoms? Because they make up everything!", "rating": 3 }`
- `GET /api/stats` — Returns the total number of ratings submitted, the average rating score across all jokes, and the full log of individual rating entries

Packages
- [stores](stores) — Supported datastore for jokes serves as a resource to the LLM (i.e. local filestore or vector database - not supported right now).
- [input_files](input_files) — local file system containing mood jokes. Uses [randomJokes.txt](input_files/randomJokes.txt).
- [providers](providers) — project contains different LLM providers that allows agent to connect (i.e. anthrophic, openai or gemini).
- [agent](agent) — Provider-agnostic agentic loop. Works with any BaseProvider implementation (Anthropic, OpenAI, Gemini, ...)


Files
- [package.json](package.json) — project metadata and scripts
- [server.js](server.js) — express server and API

