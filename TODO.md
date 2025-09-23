# Codex TODO

## DeepSeek Integration (Backend)
- [x] Swap `/api/chat` to DeepSeek via OpenRouter (`OPENROUTER_API_KEY`, `OPENAI_BASE_URL=https://openrouter.ai/api/v1`, `extra_body.thinking=false`).
- [x] Align request/response to Gemini-style contract for `docs/chat.js`.
- [x] Update missing-env error messaging to reference `OPENROUTER_API_KEY`.

## Verification & Diagnostics
- [x] Start server: `npm start` and confirm port `3000` in logs.  Owner: CLI  Status: done (listening on http://localhost:3000)
- [x] Health: GET `http://localhost:3000/api/health` should return `{ ok:true, hasKey, baseURL, model }`.  Owner: VS Code  Status: done
- [x] Chat smoke test: POST to `/api/chat` with a short prompt; expect non-empty `candidates[0].content.parts[0].text`.  Owner: VS Code  Status: done
  - Result (pass): "Hey there! I'm Bryneven Helper, your friendly school assistant. Ready to learn something fun today? 😊"
- [ ] If health/chat fails: capture server console error lines and HTTP response here; note next steps.  Owner: VS Code  Status: n/a

## Run/Checks (paste results below)
- Start:
  - `[START] Listening on http://localhost:3000`
  - `[START] model=deepseek/deepseek-chat-v3.1 baseURL=https://openrouter.ai/api/v1`
- Health (pass):
  ```json
  { "ok": true, "hasKey": true, "baseURL": "https://openrouter.ai/api/v1", "model": "deepseek/deepseek-chat-v3.1" }
  ```
- Chat (pass):
  ```json
  {
    "candidates": [
      {
        "content": {
          "parts": [
            {
              "text": "Hi there! I'm Bryneven Helper, your friendly school buddy! 😊 How can I help you today?"
            }
          ]
        }
      }
    ]
  }
  ```

## Notes / Links
- Backend: `server.js` (DeepSeek via OpenRouter, health route present).
- Frontend: `docs/chat.js` (Gemini-style request/response preserved).
- Guide: `Agents.md` (coordination via this TODO).

## Frontend & Ops Enhancements
- [x] Add preset demo prompts in `docs/index.html` + `docs/chat.js`.
- [x] Expose temperature/maxOutputTokens controls in UI and send through to `/api/chat`.
- [x] Enable SSE streaming (server + chat UI) for faster responses.
- [x] Tighten safety guardrails and trusted-adult handoffs (frontend + backend).
- [x] Add structured request/response logging for chat API timing diagnostics.
- [ ] Deploy backend to cloud (Vercel/Render) and set `window.CHATBOT_API_BASE` for prod.
