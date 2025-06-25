import fetch from 'node-fetch';

/**
 * API Endpoint: /api/qwen-evaluate
 * Evaluates user quiz answers using the Qwen model via OpenRouter.
 * See knowledge_knowledge.json for architecture and integration details.
 * Remember to update knowledge_knowledge.json if changing the evaluation model or integration pattern.
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
    const { question, options, userAnswer } = req.body;
    if (!question || !options || !userAnswer) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Compose prompt for Qwen
    const prompt = `You are a helpful quiz assistant for children.\n\nQuestion: ${question}\nOptions: ${options.join(', ')}\nUser's answer: ${userAnswer}\nIs this correct? If not, what is the correct answer and why? Respond in JSON: {\"correct\": true/false, \"correctAnswer\": \"A/B/C/D\", \"explanation\": \"...\"}`;

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
        max_tokens: 256,
        temperature: 0.7,
        top_p: 0.9
      })
    });

    const data = await response.json();
    let result;
    try {
      result = JSON.parse(data.choices[0].message.content);
    } catch (e) {
      result = { correct: false, correctAnswer: null, explanation: "Sorry, could not evaluate." };
    }
    result.scoreImpact = result.correct ? 1 : 0;
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json(result);
  } catch (error) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(500).json({ error: 'API error', details: error.message });
  }
}
