import { enforceBodyLimit } from './shared/request-body.js';
import { enforceRateLimit } from './shared/rate-limit.js';

import { ANALYZE_SYSTEM_PROMPT } from './shared/ai-config.js';

function ollamaHeaders(apiKey) {
  const h = { 'Content-Type': 'application/json' };
  if (apiKey) h['Authorization'] = `Bearer ${apiKey}`;
  return h;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if(!enforceBodyLimit(req,res))return;
  const { seriesId, seriesTitle, units, frequency, seasonalAdjustment, dataSummary } = req.body || {};

  const {OLLAMA_BASE_URL, OLLAMA_MODEL, OLLAMA_API_KEY}=process.env;
  if (!OLLAMA_BASE_URL || !OLLAMA_MODEL) {
    return res.status(500).json({ error: 'Ollama is not configured on the server' });
  }
  const bounds={seriesId:100,seriesTitle:500,units:200,frequency:100,seasonalAdjustment:200,dataSummary:12000};
  if(Object.entries(bounds).some(([field,max])=>req.body?.[field]!=null&&(typeof req.body[field]!=='string'||req.body[field].length>max)))return res.status(400).json({error:'Invalid analysis request.'});
  if (typeof dataSummary!=='string'||!dataSummary.trim()) {
    return res.status(400).json({ error: 'Data summary is required' });
  }

  if(!await enforceRateLimit(req,res,'ai'))return;

  const userMessage = `Analyze this FRED economic data series:

Series: ${seriesTitle} (${seriesId})
Units: ${units}
Frequency: ${frequency}
Seasonal Adjustment: ${seasonalAdjustment}

Statistical Summary:
${dataSummary}`;

  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: 'POST',
      signal: AbortSignal.timeout(25000),
      headers: ollamaHeaders(OLLAMA_API_KEY),
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: [
          { role: 'system', content: ANALYZE_SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ],
        stream: false,
        options: { num_predict: 800 },
      }),
    });

    if (!response.ok) {
      return res.status(502).json({ error: 'AI analysis is temporarily unavailable.' });
    }

    const data = await response.json();
    const narrative = data?.message?.content || 'No analysis generated.';
    return res.status(200).json({ narrative });
  } catch {
    return res.status(502).json({ error: 'AI analysis is temporarily unavailable.' });
  }
}
