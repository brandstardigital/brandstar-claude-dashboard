// Vercel serverless function — proxies Anthropic Admin API calls server-side.
// The Admin key lives in Vercel's environment variables, never exposed to the browser.

export default async function handler(req, res) {
  // CORS headers (for same-origin, not strictly needed but harmless)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();

  const adminKey = process.env.ANTHROPIC_ADMIN_KEY;
  if (!adminKey) {
    return res.status(500).json({ error: 'ANTHROPIC_ADMIN_KEY environment variable not set in Vercel.' });
  }

  // _path = the Anthropic API path, e.g. /v1/organizations/me
  const { _path, ...rest } = req.query;
  if (!_path || !_path.startsWith('/v1/')) {
    return res.status(400).json({ error: 'Missing or invalid _path parameter.' });
  }

  // Build target URL, forwarding all other query params
  const target = new URL(`https://api.anthropic.com${_path}`);
  Object.entries(rest).forEach(([k, v]) => {
    if (Array.isArray(v)) v.forEach(i => target.searchParams.append(k, i));
    else target.searchParams.set(k, v);
  });

  try {
    const upstream = await fetch(target.toString(), {
      headers: {
        'anthropic-version': '2023-06-01',
        'x-api-key': adminKey,
      },
    });

    const body = await upstream.json();
    return res.status(upstream.status).json(body);
  } catch (err) {
    return res.status(502).json({ error: 'Upstream error: ' + err.message });
  }
}
