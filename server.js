// server.js
require('dotenv').config();
const express = require('express');
const path = require('path');
const { randomUUID } = require('crypto');
const OpenAI = require('openai');

const app = express();
const PORT = process.env.PORT || 3000;
const MODEL_ID = 'deepseek/deepseek-chat-v3.1';
const DEFAULT_BASE_URL = 'https://openrouter.ai/api/v1';

const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL || DEFAULT_BASE_URL,
});

const SAFETY_RULES = [
  { pattern: /(suicide|self-harm|hurt myself|kill myself)/i, message: 'This sounds really serious. Please talk to a trusted adult, teacher, or emergency service right away.' },
  { pattern: /(medicine|medical advice|diagnosis|prescription|injured|bleeding)/i, message: 'I am not a doctor. Please ask a trusted adult or school nurse for medical help.' },
  { pattern: /(address|phone number|email|password|location|contact)/i, message: 'For your safety, do not share personal contact details online. Ask a trusted adult for help.' },
  { pattern: /(bully|bullying|threat|violence|danger)/i, message: 'If someone is being unkind or threatening, tell a trusted adult or teacher right away so they can help.' },
];

function getSafetyResponse(message = '') {
  if (!message) return null;
  for (const rule of SAFETY_RULES) {
    if (rule.pattern.test(message)) {
      return rule.message;
    }
  }
  return null;
}

function logEvent(event, payload = {}) {
  const entry = { timestamp: new Date().toISOString(), event, ...payload };
  console.log(JSON.stringify(entry));
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'docs')));

app.get('/api/health', (req, res) => {
  const baseURL = process.env.OPENAI_BASE_URL || DEFAULT_BASE_URL;
  const hasKey = Boolean(process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY.trim());
  res.json({ ok: hasKey, hasKey, baseURL, model: MODEL_ID });
});

app.post('/api/chat', async (req, res) => {
  const requestId = typeof randomUUID === 'function'
    ? randomUUID()
    : `req_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
  const startedAt = Date.now();
  const accept = String(req.headers.accept || '');
  const wantsStream = req.query.stream === '1' || req.query.stream === 'true' || accept.includes('text/event-stream');

  if (!process.env.OPENROUTER_API_KEY) {
    const errorPayload = { error: 'Missing OPENROUTER_API_KEY' };
    if (wantsStream) {
      res.writeHead(500, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      });
      res.write(`event: error\ndata: ${JSON.stringify(errorPayload)}\n\n`);
      res.end();
    } else {
      res.status(500).json(errorPayload);
    }
    return;
  }

  const userText =
    req.body?.contents?.[0]?.parts?.[0]?.text ??
    req.body?.message ??
    '';

  if (!userText || !userText.trim()) {
    return res.status(400).json({ error: 'Empty prompt' });
  }

  const temperature = Number.isFinite(req.body?.generationConfig?.temperature)
    ? Math.min(Math.max(req.body.generationConfig.temperature, 0), 1)
    : 0.7;
  const maxTokens = Number.isFinite(req.body?.generationConfig?.maxOutputTokens)
    ? Math.max(150, Math.min(Math.round(req.body.generationConfig.maxOutputTokens), 1000))
    : 300;

  logEvent('chat.request', {
    requestId,
    preview: userText.slice(0, 160),
    temperature,
    maxTokens,
    streaming: wantsStream,
  });

  const safetyResponse = getSafetyResponse(userText);
  if (safetyResponse) {
    const payload = {
      candidates: [
        { content: { parts: [{ text: safetyResponse }] } },
      ],
      guardrail: true,
    };
    if (wantsStream) {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      });
      res.write(`event: token\ndata: ${JSON.stringify({ delta: safetyResponse })}\n\n`);
      res.write(`event: done\ndata: ${JSON.stringify({ reason: 'guardrail' })}\n\n`);
      res.end();
    } else {
      res.json(payload);
    }
    logEvent('chat.response', {
      requestId,
      status: 'guardrail',
      durationMs: Date.now() - startedAt,
    });
    return;
  }

  try {
    if (wantsStream) {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'Transfer-Encoding': 'chunked',
      });
      res.flushHeaders?.();

      let aggregated = '';
      const stream = await openai.chat.completions.create({
        model: MODEL_ID,
        extra_body: { thinking: false },
        stream: true,
        temperature,
        max_tokens: maxTokens,
        messages: [
          { role: 'system', content: 'You are a friendly, concise school helper for ages 6-13.' },
          { role: 'user', content: userText },
        ],
      });

      for await (const chunk of stream) {
        const delta = chunk?.choices?.[0]?.delta?.content || chunk?.choices?.[0]?.text || '';
        if (!delta) continue;
        aggregated += delta;
        res.write(`event: token\ndata: ${JSON.stringify({ delta })}\n\n`);
      }

      res.write(`event: done\ndata: ${JSON.stringify({ durationMs: Date.now() - startedAt })}\n\n`);
      res.end();

      logEvent('chat.response', {
        requestId,
        status: 'ok',
        streaming: true,
        durationMs: Date.now() - startedAt,
        chars: aggregated.length,
      });
      return;
    }

    const completion = await openai.chat.completions.create({
      model: MODEL_ID,
      extra_body: { thinking: false },
      temperature,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: 'You are a friendly, concise school helper for ages 6-13.' },
        { role: 'user', content: userText },
      ],
    });

    const text =
      completion?.choices?.[0]?.message?.content ??
      completion?.choices?.[0]?.text ??
      '';

    const jsonResponse = {
      candidates: [
        { content: { parts: [{ text: text || "I'm here to help. Could you rephrase that?" }] } },
      ],
    };

    res.json(jsonResponse);

    logEvent('chat.response', {
      requestId,
      status: 'ok',
      streaming: false,
      durationMs: Date.now() - startedAt,
      usage: completion?.usage || null,
    });
  } catch (err) {
    const duration = Date.now() - startedAt;
    logEvent('chat.response', {
      requestId,
      status: 'error',
      durationMs: duration,
      error: err?.response?.data || err.message,
    });

    const errorPayload = {
      error: 'DeepSeek API error',
      details: err.message,
    };

    if (wantsStream) {
      res.write(`event: error\ndata: ${JSON.stringify(errorPayload)}\n\n`);
      res.end();
    } else {
      res.status(500).json({
        ...errorPayload,
        candidates: [{ content: { parts: [{ text: '' }] } }],
      });
    }
  }
});

app.get('/:page.html', (req, res, next) => {
  const filePath = path.join(__dirname, 'docs', `${req.params.page}.html`);
  try {
    if (require('fs').existsSync(filePath)) {
      return res.sendFile(filePath);
    }
    next();
  } catch (err) {
    next();
  }
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'docs', 'index.html')));

app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'docs', '404.html'));
});

app.listen(PORT, () => {
  console.log(`[START] Listening on http://localhost:${PORT}`);
  console.log(`[START] model=${MODEL_ID} baseURL=${process.env.OPENAI_BASE_URL || DEFAULT_BASE_URL}`);
  console.log('Open your browser to see the ChatBot in action!');
});
