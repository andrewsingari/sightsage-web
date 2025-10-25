import type { Handler } from '@netlify/functions';

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ error: 'Method not allowed' }),
      };
    }

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    const payload = JSON.parse(event.body || '{}');
    const { profile, scores, day } = payload;

    if (!OPENAI_API_KEY) {
      return {
        statusCode: 500,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ error: 'Missing OPENAI_API_KEY' }),
      };
    }

    // Minimal placeholder: return a canned tip for now.
    // Later you’ll call OpenAI here using `fetch` with your key.
    const tip =
      'Based on your recent entries, try 10–15 minutes of outdoor daylight before noon and a consistent bedtime. Personalized tips will appear once the backend is connected.';

    return {
      statusCode: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tip }),
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ error: err?.message || 'Unknown error' }),
    };
  }
};