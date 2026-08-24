const ALLOWED_ORIGINS = new Set([
  'https://new.yolkpay.com',
  'https://yolkpay.condoqin.workers.dev',
]);

export async function onRequest({ request }) {
  if (request.method !== 'POST') {
    return Response.json({ success: false, message: 'Method not allowed.' }, { status: 405 });
  }
  const origin = request.headers.get('Origin');
  if (!origin || !ALLOWED_ORIGINS.has(origin)) {
    return Response.json({ success: false, message: 'Invalid request origin.' }, { status: 403 });
  }

  const headers = new Headers(request.headers);
  headers.set('Origin', 'https://yolkpay.com');
  headers.set('Accept', 'application/json');
  headers.delete('Host');

  try {
    const response = await fetch('https://yolkpay.condoqin.workers.dev/api/registration', {
      method: 'POST',
      headers,
      body: request.body,
      redirect: 'manual',
    });
    return new Response(response.body, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error(JSON.stringify({
      event: 'registration_proxy_failed',
      message: error instanceof Error ? error.message : String(error),
    }));
    return Response.json(
      { success: false, message: 'We could not submit the application. Please try again.' },
      { status: 502 },
    );
  }
}
