// server.js
const express = require('express');
const path = require('path');
require('dotenv').config();
const fetch = require('node-fetch');
const app = express();
const PORT = 3000;

const hintHandler = require('./api/hint.js').default;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Proxy /api/chat to Gemini API
app.post('/api/chat', async (req, res) => {
  const API_KEY = process.env.GEMINI_API_KEY;
  if (!API_KEY) {
    return res.status(500).json({ error: 'Missing GEMINI_API_KEY in environment.' });
  }
  try {
    const geminiResp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body),
      }
    );
    const data = await geminiResp.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'API error', details: err.message });
  }
});

app.get('/api/hint', (req, res) => {
  hintHandler(req, res);
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
