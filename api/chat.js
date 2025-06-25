import fetch from 'node-fetch';

/**
 * API Endpoint: /api/chat
 * Handles chat requests, forwarding them to an external LLM (Qwen or Phi-4 Reasoning).
 * Routes Knowledge and Investigations to Phi-4, others to Qwen.
 */
export default async function handler(req, res) {
  const API_KEY = process.env.GEMMA_API_KEY || process.env.OPEN_ROUTER_API_KEY;

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt, section, context, user } = req.body;
    if (!prompt) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.status(400).json({ error: 'Missing prompt' });
    }

    // Route Knowledge/Investigations to Phi-4
    if (section === 'Knowledge' || section === 'Investigations') {
      let phiPrompt;
      if (section === 'Knowledge' && context) {
        phiPrompt = `Using the following topic summary, answer the learner's question:\n${context}\n\nQuestion: ${prompt}`;
      } else if (section === 'Investigations') {
        phiPrompt = `Reflect deeply and explain your reasoning.\nQuestion: ${prompt}`;
      } else {
        phiPrompt = prompt;
      }

      // Forward to /api/phi-reasoning
      const phiRes = await fetch(`${req.headers.origin || ''}/api/phi-reasoning`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: phiPrompt, context, user })
      });

      if (!phiRes.ok) {
        res.setHeader('Access-Control-Allow-Origin', '*');
        return res.status(502).json({ error: 'Phi-4 model unavailable. Try again shortly.' });
      }

      const phiData = await phiRes.json();
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.status(200).json({ reply: phiData.reply });
    }

    // Qwen logic for other sections
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'qwen/qwen3-30b-a3b:free',
        messages: [
          { role: 'user', content: prompt }
        ],
        max_tokens: 512,
        temperature: 0.7,
        top_p: 0.9
      })
    });

    const data = await response.json();
    const reply = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content
      ? data.choices[0].message.content
      : "I'm sorry, I couldn't process that request.";
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json({ reply });
  } catch (error) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(500).json({ error: 'API error', details: error.message });
  }
}