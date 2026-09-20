// Vercel serverless function — proxies only the Anthropic Admin API reads
// required by this dashboard. The Admin key stays in Vercel environment variables.

const ALLOWED_ENDPOINTS = new Map([
  ['/v1/organizations/users', new Set(['limit', 'page'])],
  [
    '/v1/organizations/usage_report/messages',
    new Set(['starting_at', 'ending_at', 'bucket_width', 'group_by[]', 'page']),
  ],
]);

function appendQueryValue(target, key, value) {
  const values = Array.isArray(value) ? value : [value];
  for (const item of values) {
    if (typeof item !== 'string' || item.length > 500) {
      throw new Error(`Invalid value for ${key}`);
    }
    target.searchParams.append(key, item);
  }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  // Same-origin dashboard requests continue to work. Cross-site browser requests
  // are rejected and no permissive CORS header is emitted.
  const fetchSite = req.headers['sec-fetch-site'];
  if (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'none') {
    return res.status(403).json({ error: 'Cross-site requests are not allowed.' });
  }

  const adminKey = process.env.ANTHROPIC_ADMIN_KEY;
  if (!adminKey) {
    return res.status(500).json({ error: 'Dashboard credential is not configured.' });
  }

  const { _path: rawPath, ...rest } = req.query;
  if (typeof rawPath !== 'string' || !ALLOWED_ENDPOINTS.has(rawPath)) {
    return res.status(403).json({ error: 'Endpoint is not allowed.' });
  }

  const allowedQueryKeys = ALLOWED_ENDPOINTS.get(rawPath);
  const target = new URL(`https://api.anthropic.com${rawPath}`);

  try {
    for (const [key, value] of Object.entries(rest)) {
      if (!allowedQueryKeys.has(key)) {
        return res.status(400).json({ error: `Query parameter is not allowed: ${key}` });
      }
      appendQueryValue(target, key, value);
    }

    const upstream = await fetch(target.toString(), {
      headers: {
        'anthropic-version': '2023-06-01',
        'x-api-key': adminKey,
      },
    });

    const body = await upstream.json();
    return res.status(upstream.status).json(body);
  } catch (err) {
    return res.status(502).json({ error: 'Upstream request failed.' });
  }
}
