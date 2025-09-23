import OpenAI from 'openai';

/**
 * API Endpoint: /api/openai-chat
 * Handles chat requests using OpenAI's GPT models (replacement for deprecated Codex)
 * Supports GPT-4, GPT-4 Turbo, and GPT-3.5 Turbo
 */
export default async function handler(req, res) {
  const API_KEY = process.env.OPENAI_API_KEY;

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

  if (!API_KEY) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(500).json({ error: 'OpenAI API key not configured' });
  }

  try {
    const { prompt, model = 'gpt-3.5-turbo', maxTokens = 512, temperature = 0.7, isCodeGeneration = false } = req.body;
    
    if (!prompt) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.status(400).json({ error: 'Missing prompt' });
    }

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: API_KEY,
    });

    // Prepare system message based on use case
    const systemMessage = isCodeGeneration 
      ? "You are an expert programmer assistant. Provide clean, well-commented code with explanations."
      : "You are Bryneven Helper, a friendly assistant for primary school students (ages 6-13). Use simple language and be encouraging.";

    const completion = await openai.chat.completions.create({
      model: model,
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: prompt }
      ],
      max_tokens: maxTokens,
      temperature: temperature,
    });

    const reply = completion.choices[0]?.message?.content || "I'm sorry, I couldn't process that request.";
    
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json({ 
      reply,
      model: model,
      usage: completion.usage
    });

  } catch (error) {
    console.error('OpenAI API error:', error);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(500).json({ 
      error: 'OpenAI API error', 
      details: error.message 
    });
  }
}