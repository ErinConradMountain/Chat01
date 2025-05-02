import fs from 'fs';
import path from 'path';

/**
 * API Endpoint: /api/hint
 * Returns a progressive hint for a given question ID and hint level.
 * GET /api/hint?questionId=...&hintLevel=...
 */
export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { questionId, hintLevel } = req.query;
  if (!questionId) {
    return res.status(400).json({ error: 'Missing questionId' });
  }

  const hintsPath = path.join(process.cwd(), 'data', 'hints.json');
  let hintsData;
  try {
    hintsData = JSON.parse(fs.readFileSync(hintsPath, 'utf8'));
  } catch (e) {
    return res.status(500).json({ error: 'Could not load hints data.' });
  }

  const hints = hintsData[questionId];
  if (!hints || !Array.isArray(hints) || hints.length === 0) {
    return res.json({ hint: 'Hint unavailable for this question.' });
  }

  let idx = parseInt(hintLevel, 10);
  if (isNaN(idx) || idx < 0) idx = 0;
  if (idx >= hints.length) idx = hints.length - 1;

  return res.json({ hint: hints[idx] });
}
