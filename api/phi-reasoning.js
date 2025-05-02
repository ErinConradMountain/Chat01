// api/phi-reasoning.js
import fetch from 'node-fetch';
import { logTurn } from '../logger.js';
import config from '../config.js';

/**
 * API Endpoint: /api/phi-reasoning
 * Forwards prompts to Hugging Face Phi-4 Reasoning model.
 * Reads token from process.env.HF_PHI_TOKEN (set in .env).
 * Logs request/response time and errors.
 */
export default async function handler(req, res) {
  const HF_TOKEN = process.env.HF_PHI_TOKEN;
  const endpoint = config.integrations?.phi4?.endpoint || 'https://api-inference.huggingface.co/models/microsoft/phi-4-reasoning-plus';

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
    const { prompt, context, user } = req.body;
    let phiPrompt = prompt;
    // Creative integration: build prompt from context if present
    if (context && typeof context === 'object') {
      // If userAnswer is not present, generate a tip for the question
      if (context.question && context.options && !context.userAnswer) {
        phiPrompt = `A primary school learner is about to answer a multiple-choice question. Give a creative, friendly tip or guiding message to help them think about the question, without giving away the answer.\n\nQuestion: ${context.question}\nOptions: ${context.options.join(', ')}`;
      }
      // If userAnswer is present, generate a reflection/explanation
      else if (context.question && context.options && context.userAnswer) {
        phiPrompt = `A primary school learner answered a multiple-choice question. Reflect on the question and the learner's answer. Give a short, clear explanation that helps the learner understand why their answer is correct or not, and what the key idea is for this question. Do not just repeat the answer.\n\nQuestion: ${context.question}\nOptions: ${context.options.join(', ')}\nLearner's answer: ${context.userAnswer} (${context.userAnswerText || ''})\nCorrect answer: ${context.correctAnswer} (${context.correctAnswerText || ''})\nPrevious feedback: ${context.feedback || ''}`;
      }
    }
    if (!phiPrompt) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.status(400).json({ error: 'Missing prompt' });
    }
    const start = Date.now();
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HF_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: phiPrompt,
        parameters: { max_new_tokens: 512, temperature: 0.7 }
      })
    });
    const elapsed = Date.now() - start;
    const data = await response.json();
    const reply = data?.generated_text || data?.[0]?.generated_text || "I'm sorry, I couldn't process that request.";
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json({ reply });
    // Log turn with timing
    logTurn({ user, retrieved_facts: context ? [context] : [], raw_reply: reply, final_reply: reply, negative_feedback: false, model: 'phi-4', elapsed });
  } catch (error) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(500).json({ error: 'API error', details: error.message });
  }
}
