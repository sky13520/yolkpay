const RECIPIENT = "info@yolkpay.com";
const SENDER = "info@yolkpay.com";
const ALLOWED_ORIGINS = new Set([
  "https://yolkpay.com",
  "https://www.yolkpay.com",
  "https://yolkpay.condoqin.workers.dev",
]);

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function value(formData, key) {
  const entry = formData.get(key);
  return typeof entry === "string" ? entry.trim() : "";
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function handleContact(request, env) {
  const origin = request.headers.get("Origin");
  if (!origin || !ALLOWED_ORIGINS.has(origin)) {
    return json({ success: false, message: "Invalid request origin." }, 403);
  }

  const contentLength = Number(request.headers.get("Content-Length") || 0);
  if (contentLength > 20_000) {
    return json({ success: false, message: "Request is too large." }, 413);
  }

  let formData;
  try {
    formData = await request.formData();
  } catch {
    return json({ success: false, message: "Invalid form submission." }, 400);
  }

  if (value(formData, "_honey")) {
    return json({ success: true });
  }

  const name = value(formData, "name");
  const company = value(formData, "company");
  const email = value(formData, "email");
  const topic = value(formData, "topic");
  const message = value(formData, "message");

  if (
    !name ||
    !company ||
    !email ||
    !topic ||
    !message ||
    name.length > 100 ||
    company.length > 150 ||
    email.length > 254 ||
    topic.length > 100 ||
    message.length > 5_000 ||
    !isValidEmail(email)
  ) {
    return json(
      { success: false, message: "Please check the required fields." },
      400,
    );
  }

  const safe = {
    name: escapeHtml(name),
    company: escapeHtml(company),
    email: escapeHtml(email),
    topic: escapeHtml(topic),
    message: escapeHtml(message).replaceAll("\n", "<br>"),
  };

  try {
    await env.EMAIL.send({
      to: RECIPIENT,
      from: { email: SENDER, name: "YolkPay Website" },
      replyTo: { email, name },
      subject: `New YolkPay website inquiry: ${topic}`,
      text: [
        `Name: ${name}`,
        `Company: ${company}`,
        `Email: ${email}`,
        `Topic: ${topic}`,
        "",
        message,
      ].join("\n"),
      html: `<h2>New YolkPay website inquiry</h2>
        <p><strong>Name:</strong> ${safe.name}</p>
        <p><strong>Company:</strong> ${safe.company}</p>
        <p><strong>Email:</strong> ${safe.email}</p>
        <p><strong>Topic:</strong> ${safe.topic}</p>
        <p><strong>Message:</strong><br>${safe.message}</p>`,
    });
    return json({ success: true });
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "contact_email_failed",
        message: error instanceof Error ? error.message : String(error),
      }),
    );
    return json(
      {
        success: false,
        message: "We could not send your message. Please try again.",
      },
      500,
    );
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/contact") {
      if (request.method !== "POST") {
        return json({ success: false, message: "Method not allowed." }, 405);
      }
      return handleContact(request, env);
    }
    return env.ASSETS.fetch(request);
  },
};
