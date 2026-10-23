const allowedMethods = new Set(['GET', 'OPTIONS']);

function response(body, status, origin = '') {
  const headers = new Headers({
    'Content-Type': 'text/plain; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'no-store'
  });
  if (origin) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Accept, Content-Type');
    headers.set('Vary', 'Origin');
  }
  return new Response(status === 204 ? null : body, { status, headers });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    if (!env.ALLOWED_ORIGIN || origin !== env.ALLOWED_ORIGIN) return response('Forbidden', 403);
    if (!allowedMethods.has(request.method)) return response('Method not allowed', 405, origin);
    if (request.method === 'OPTIONS') return response('', 204, origin);
    if (!env.AMAP_SECURITY_CODE) return response('Proxy is not configured', 503, origin);

    const incoming = new URL(request.url);
    const prefix = '/_AMapService/';
    if (!incoming.pathname.startsWith(prefix)) return response('Not found', 404, origin);
    const path = incoming.pathname.slice(prefix.length);
    const isCustomStyle = path === 'v4/map/styles' || path.startsWith('v4/map/styles/');
    if (!isCustomStyle && !path.startsWith('v3/')) return response('Unsupported AMap endpoint', 404, origin);

    const key = incoming.searchParams.get('key');
    if (env.AMAP_JS_API_KEY && key && key !== env.AMAP_JS_API_KEY) return response('Invalid map key', 403, origin);

    const upstream = new URL(path, `https://${isCustomStyle ? 'webapi.amap.com' : 'restapi.amap.com'}/`);
    incoming.searchParams.forEach((value, name) => upstream.searchParams.set(name, value));
    upstream.searchParams.set('jscode', env.AMAP_SECURITY_CODE);

    try {
      const result = await fetch(upstream, {
        method: 'GET',
        headers: { Accept: request.headers.get('Accept') || '*/*' },
        redirect: 'manual'
      });
      const headers = new Headers(result.headers);
      headers.set('Access-Control-Allow-Origin', origin);
      headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
      headers.set('Access-Control-Allow-Headers', 'Accept, Content-Type');
      headers.set('Vary', 'Origin');
      headers.set('X-Content-Type-Options', 'nosniff');
      return new Response(result.body, { status: result.status, headers });
    } catch {
      return response('Upstream map service unavailable', 502, origin);
    }
  }
};
