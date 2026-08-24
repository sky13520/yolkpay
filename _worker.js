const PUBLIC_ORIGIN = 'https://new.yolkpay.com';
const API_ORIGIN = 'https://yolkpay.condoqin.workers.dev';
const TRUSTED_API_ORIGIN = 'https://yolkpay.com';

function apiTarget(request, pathname) {
  const incoming = new URL(request.url);
  const target = new URL(pathname, API_ORIGIN);
  target.search = incoming.search;
  return target;
}

async function proxyApi(request, pathname) {
  const headers = new Headers(request.headers);
  if (headers.get('Origin') === PUBLIC_ORIGIN) headers.set('Origin', TRUSTED_API_ORIGIN);
  headers.set('Accept', 'application/json');
  headers.delete('Host');

  const init = {
    method: request.method,
    headers,
    redirect: 'manual',
  };
  if (request.method !== 'GET' && request.method !== 'HEAD') init.body = request.body;

  const response = await fetch(apiTarget(request, pathname), init);
  const responseHeaders = new Headers(response.headers);
  responseHeaders.set('Cache-Control', 'no-store');
  responseHeaders.set('X-Content-Type-Options', 'nosniff');
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/registration-submit') {
      if (request.method !== 'POST') {
        return Response.json({ success: false, message: 'Method not allowed.' }, { status: 405 });
      }
      if (request.headers.get('Origin') !== PUBLIC_ORIGIN) {
        return Response.json({ success: false, message: 'Invalid request origin.' }, { status: 403 });
      }
      return proxyApi(request, '/api/registration');
    }
    if (url.pathname.startsWith('/api/')) return proxyApi(request, url.pathname);
    return env.ASSETS.fetch(request);
  },
};
