# AGENTS.md - DeepSeek V3.1 via OpenRouter

Purpose: Define how this project uses DeepSeek V3.1 (non-thinking) through OpenRouter for an educational chatbot serving ages 6-13.
Scope: Web chatbot (`docs/` frontend) + Node/Express backend (`server.js`).

## Model & Endpoint
Provider base URL: `https://openrouter.ai/api/v1`
Model (non-thinking): `deepseek/deepseek-chat-v3.1`
Reasoning mode: Disable thinking using `extra_body: { thinking: false }`
Auth: `OPENROUTER_API_KEY` in `.env` (never commit keys)

## Environment
`.env` keys:
  - `OPENROUTER_API_KEY` � required
  - `OPENAI_BASE_URL=https://openrouter.ai/api/v1`
  - `GEMINI_API_KEY` � legacy, unused after DeepSeek switch

## Backend Contract
Endpoint: `POST /api/chat`
Request body (Gemini-style for frontend compatibility):
  - `contents: [{ role: 'user', parts: [{ text: string }] }]`
  - `generationConfig?: { maxOutputTokens?: number; temperature?: number }`
Response body (Gemini-style):
  - `{ candidates: [{ content: { parts: [{ text: string }] } }] }`

## Prompting Guidelines
System prompt: Keep tone friendly, concise, age-appropriate; avoid jargon.
When answering:
  - Use short paragraphs or bullet points.
  - Explain with concrete examples for Grades 1-7.
  - Encourage, do not patronize.
  - If unknown, say what you can do next (e.g., ask a clarifying question).
Safety:
  - No personal data requests beyond login name.
  - Avoid sensitive or inappropriate topics.
  - Redirect to an adult/teacher for safety/medical emergencies.

## Coordination and Task Tracking
- Shared work queue lives in `TODO.md` at the repo root; both the Codex CLI agent and the GPT-5 VS Code agent review it at the start of each session.
- Record who is actively handling an item by adding text such as `Owner: CLI` or `Status: in progress (VS Code)` inline with the checklist entry so nobody duplicates work.
- Log interim findings, partial implementations, and blockers directly under the relevant task bullet so the next agent can continue without repeating investigations.
- When finishing a work block, update the checkbox state, note any test commands that ran (with pass/fail), and list remaining follow-ups before handing control back.
- Capture newly discovered issues or ideas in `TODO.md` immediately to keep both agents aligned on scope changes.

## Usage Patterns

General Q&A: pass user text directly as the user message.
Context injection (optional future): prepend retrieved school facts in the system or first user message; keep under 800 tokens.
Output control:
  - `max_tokens` ~ 200-600 typical
  - `temperature` 0.5-0.8 for conversational variety

## Frontend Notes
- Preset demo prompts in `docs/index.html` call `sendMessage()` directly for quick testing.
- Temperature and max token sliders feed into `docs/chat.js` and `/api/chat`; adjust defaults there when experimenting.
- `/api/chat` now supports Server-Sent Events; keep frontend and backend streaming logic in sync when iterating.
- For remote builds, set `window.CHATBOT_API_BASE` before loading `docs/chat.js` so the UI talks to the deployed API.

## Coding Rules (for agents)
Do: Keep `server.js` response shape stable for `docs/chat.js`.
Do: Handle missing env keys with 500 + helpful message.
Do: Log errors server-side; return safe client messages.
Do not: Expose API keys in client or logs.
Do not: Change public API without updating `docs/chat.js`.

## Quick API Example (Node, OpenRouter)
```js
import OpenAI from 'openai'
const client = new OpenAI({ apiKey: process.env.OPENROUTER_API_KEY, baseURL: 'https://openrouter.ai/api/v1' })
const resp = await client.chat.completions.create({
  model: 'deepseek/deepseek-chat-v3.1',
  extra_body: { thinking: false },
  messages: [
    { role: 'system', content: 'Friendly school helper for ages 6-13.' },
    { role: 'user', content: 'Explain fractions simply.' }
  ],
  max_tokens: 300,
  temperature: 0.7
})
console.log(resp.choices[0].message.content)
```

## Testing Checklist
Env: `OPENROUTER_API_KEY` set.
Start: `npm start`.
Open: `http://localhost:3000`.
Ask: "Tell me about school hours." Expect a helpful, concise reply.
Error path: Temporarily unset key; expect HTTP 500 with clear message.

SSE streaming toggle:
- Default UI uses SSE streaming. If replies look blank or stuck, open with `?nostream=1` to force JSON fallback:
  - `http://localhost:3000/?nostream=1`
- Keep frontend and backend in sync when iterating on streaming behavior.

## Future Extensions
Add retrieval for school knowledge with concise prepended context.
Add role agents (Researcher/Writer/Reviewer) if moving to a Python multi-agent stack.
Streaming responses via Server-Sent Events (SSE) for faster UX.

