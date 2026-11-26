import { enforceBodyLimit } from './shared/request-body.js';
import { enforceRateLimit } from './shared/rate-limit.js';



import { interpretQuestion } from './shared/search-interpretation.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if(!enforceBodyLimit(req,res))return;
  const query = req.body?.query;
  if (typeof query !== 'string' || !query.trim() || query.length > 1000) {
    return res.status(400).json({ error: 'Enter a question between 1 and 1,000 characters.' });
  }
  const { OLLAMA_BASE_URL: baseUrl, OLLAMA_MODEL: model, OLLAMA_API_KEY: apiKey } = process.env;
  if (!baseUrl || !model) return res.status(503).json({ error: 'AI search is currently unavailable.' });
  if(!await enforceRateLimit(req,res,'ai'))return;
  try {
    const interpretation = await interpretQuestion(query.trim(), { baseUrl, model, apiKey });
    return res.status(200).json(interpretation);
  } catch {
    return res.status(502).json({
      error: 'Your question could not be interpreted. Keyword search is still available.',
      code: 'AI_INTERPRETATION_FAILED',
    });
  }
}
