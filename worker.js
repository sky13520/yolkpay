import { DurableObject } from "cloudflare:workers";

const RECIPIENT = "info@yolkpay.com";
const SENDER = "info@yolkpay.com";
const SESSION_COOKIE = "yp_admin";
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_TOTAL_FILE_SIZE = 12 * 1024 * 1024;
const FILE_CHUNK_SIZE = 1_500_000;
const ALLOWED_ORIGINS = new Set([
  "https://yolkpay.com",
  "https://www.yolkpay.com",
  "https://yolkpay.condoqin.workers.dev",
  "http://localhost:8787",
  "http://127.0.0.1:8787",
]);

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...headers,
    },
  });
}

function escapeHtml(value) {
  return String(value)
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

function isValidOrigin(request) {
  const origin = request.headers.get("Origin");
  return Boolean(origin && ALLOWED_ORIGINS.has(origin));
}

function isAllowedFile(file) {
  return (
    file instanceof File &&
    file.size > 0 &&
    file.size <= MAX_FILE_SIZE &&
    ["application/pdf", "image/png", "image/jpeg"].includes(file.type)
  );
}

function randomString(byteLength = 24) {
  const bytes = crypto.getRandomValues(new Uint8Array(byteLength));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function randomCode() {
  const values = crypto.getRandomValues(new Uint32Array(1));
  return String(100000 + (values[0] % 900000));
}

async function sha256(valueToHash) {
  const bytes = new TextEncoder().encode(valueToHash);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function cookieValue(request, name) {
  const cookie = request.headers.get("Cookie") || "";
  for (const part of cookie.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return "";
}

function adminStore(env) {
  return env.REGISTRATION_STORE.getByName("yolkpay-merchant-applications");
}

function fieldLimits(data) {
  return (
    data.country.length <= 30 &&
    data.business_type.length <= 60 &&
    data.legal_name.length <= 160 &&
    data.license_number.length <= 80 &&
    data.business_address.length <= 240 &&
    data.business_phone.length <= 40 &&
    data.business_email.length <= 254 &&
    data.website.length <= 240 &&
    data.established_date.length <= 10 &&
    data.annual_volume.length <= 60 &&
    data.average_transaction.length <= 30 &&
    data.business_description.length <= 1500 &&
    data.principal_name.length <= 140 &&
    data.principal_phone.length <= 40 &&
    data.principal_email.length <= 254 &&
    data.ownership_percent.length <= 10 &&
    data.principal_title.length <= 100 &&
    data.bank_type.length <= 30
  );
}

async function handleContact(request, env) {
  if (!isValidOrigin(request)) {
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

  if (value(formData, "_honey")) return json({ success: true });

  const name = value(formData, "name");
  const company = value(formData, "company");
  const email = value(formData, "email");
  const topic = value(formData, "topic");
  const message = value(formData, "message");

  if (
    !name || !company || !email || !topic || !message ||
    name.length > 100 || company.length > 150 || email.length > 254 ||
    topic.length > 100 || message.length > 5_000 || !isValidEmail(email)
  ) {
    return json({ success: false, message: "Please check the required fields." }, 400);
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
      text: [`Name: ${name}`, `Company: ${company}`, `Email: ${email}`, `Topic: ${topic}`, "", message].join("\n"),
      html: `<h2>New YolkPay website inquiry</h2>
        <p><strong>Name:</strong> ${safe.name}</p>
        <p><strong>Company:</strong> ${safe.company}</p>
        <p><strong>Email:</strong> ${safe.email}</p>
        <p><strong>Topic:</strong> ${safe.topic}</p>
        <p><strong>Message:</strong><br>${safe.message}</p>`,
    });
    return json({ success: true });
  } catch (error) {
    console.error(JSON.stringify({ event: "contact_email_failed", message: error instanceof Error ? error.message : String(error) }));
    return json({ success: false, message: "We could not send your message. Please try again." }, 500);
  }
}

async function fileRecord(file, fieldName, label) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  return {
    id: crypto.randomUUID(),
    field_name: fieldName,
    label,
    filename: file.name.slice(0, 180),
    content_type: file.type,
    size: file.size,
    bytes,
  };
}

async function handleRegistration(request, env, ctx) {
  if (!isValidOrigin(request)) {
    return json({ success: false, message: "Invalid request origin." }, 403);
  }

  const contentLength = Number(request.headers.get("Content-Length") || 0);
  if (contentLength > 15_000_000) {
    return json({ success: false, message: "The application is too large." }, 413);
  }

  let formData;
  try {
    formData = await request.formData();
  } catch {
    return json({ success: false, message: "The application could not be read." }, 400);
  }
  if (value(formData, "_honey")) return json({ success: true, reference: "YP-RECEIVED" });

  const data = {
    country: value(formData, "country"),
    business_type: value(formData, "business_type"),
    legal_name: value(formData, "legal_name"),
    license_number: value(formData, "license_number"),
    business_address: value(formData, "business_address"),
    business_phone: value(formData, "business_phone"),
    business_email: value(formData, "business_email"),
    website: value(formData, "website"),
    established_date: value(formData, "established_date"),
    annual_volume: value(formData, "annual_volume"),
    average_transaction: value(formData, "average_transaction"),
    business_description: value(formData, "business_description"),
    principal_name: value(formData, "principal_name"),
    principal_phone: value(formData, "principal_phone"),
    principal_email: value(formData, "principal_email"),
    ownership_percent: value(formData, "ownership_percent"),
    principal_title: value(formData, "principal_title"),
    bank_type: value(formData, "bank_type"),
  };

  const required = [
    "country", "business_type", "legal_name", "license_number", "business_address",
    "business_phone", "business_email", "established_date", "annual_volume",
    "average_transaction", "business_description", "principal_name",
    "principal_phone", "principal_email", "ownership_percent", "principal_title", "bank_type",
  ];
  const ownership = Number(data.ownership_percent);
  const averageTransaction = Number(data.average_transaction);
  const established = /^\d{4}-\d{2}-\d{2}$/.test(data.established_date);
  if (
    required.some((key) => !data[key]) ||
    !fieldLimits(data) ||
    !["Canada", "United States"].includes(data.country) ||
    !isValidEmail(data.business_email) ||
    !isValidEmail(data.principal_email) ||
    !Number.isFinite(ownership) || ownership < 0 || ownership > 100 ||
    !Number.isFinite(averageTransaction) || averageTransaction <= 0 ||
    !established ||
    value(formData, "consent") !== "yes"
  ) {
    return json({ success: false, message: "Please check all required application fields." }, 400);
  }

  const businessDocument = formData.get("business_document");
  const identityDocument = formData.get("identity_document");
  const voidCheque = formData.get("void_cheque");
  const files = [businessDocument, identityDocument, voidCheque];
  if (!files.every(isAllowedFile) || files.reduce((total, file) => total + file.size, 0) > MAX_TOTAL_FILE_SIZE) {
    return json({ success: false, message: "Documents must be PDF, PNG, or JPG files within the size limits." }, 400);
  }

  const now = new Date();
  const date = now.toISOString().slice(0, 10).replaceAll("-", "");
  const reference = `YP-${date}-${randomString(3).toUpperCase()}`;
  const documents = await Promise.all([
    fileRecord(businessDocument, "business_document", "Business registration"),
    fileRecord(identityDocument, "identity_document", "Government-issued ID"),
    fileRecord(voidCheque, "void_cheque", "Void cheque / bank letter"),
  ]);

  try {
    await adminStore(env).createApplication({
      id: reference,
      created_at: now.toISOString(),
      ...data,
    }, documents);
  } catch (error) {
    console.error(JSON.stringify({ event: "registration_store_failed", message: error instanceof Error ? error.message : String(error) }));
    return json({ success: false, message: "We could not save the application. Please try again." }, 500);
  }

  const safeName = escapeHtml(data.legal_name);
  const safePrincipal = escapeHtml(data.principal_name);
  const safeEmail = escapeHtml(data.principal_email);
  ctx.waitUntil(
    env.EMAIL.send({
      to: RECIPIENT,
      from: { email: SENDER, name: "YolkPay Merchant Registration" },
      replyTo: { email: data.principal_email, name: data.principal_name },
      subject: `New merchant application: ${reference} — ${data.legal_name}`,
      text: [
        `Reference: ${reference}`,
        `Business: ${data.legal_name}`,
        `Principal: ${data.principal_name}`,
        `Email: ${data.principal_email}`,
        `Country: ${data.country}`,
        "",
        "Sign in to the YolkPay application admin to review the full application and private documents.",
      ].join("\n"),
      html: `<h2>New YolkPay merchant application</h2>
        <p><strong>Reference:</strong> ${reference}</p>
        <p><strong>Business:</strong> ${safeName}</p>
        <p><strong>Principal:</strong> ${safePrincipal}</p>
        <p><strong>Email:</strong> ${safeEmail}</p>
        <p>Sign in to the YolkPay application admin to review the full application and private documents.</p>`,
    }).catch((error) => {
      console.error(JSON.stringify({ event: "registration_email_failed", reference, message: error instanceof Error ? error.message : String(error) }));
    }),
  );

  return json({ success: true, reference });
}

async function requireSession(request, env) {
  const token = cookieValue(request, SESSION_COOKIE);
  if (!token) return false;
  return adminStore(env).checkSession(await sha256(token));
}

async function handleAdminRequestCode(request, env) {
  if (!isValidOrigin(request)) return json({ success: false, message: "Invalid request origin." }, 403);
  const result = await adminStore(env).createAdminCode();
  if (!result.success) {
    return json({ success: false, message: `Please wait ${result.retry_after} seconds before requesting another code.` }, 429);
  }
  try {
    await env.EMAIL.send({
      to: RECIPIENT,
      from: { email: SENDER, name: "YolkPay Admin" },
      subject: "Your YolkPay admin verification code",
      text: `Your YolkPay merchant applications admin verification code is ${result.code}. It expires in 10 minutes.`,
      html: `<h2>YolkPay admin verification</h2><p>Your code is:</p><p style="font-size:32px;font-weight:800;letter-spacing:8px">${result.code}</p><p>This code expires in 10 minutes.</p>`,
    });
    return json({ success: true });
  } catch (error) {
    console.error(JSON.stringify({ event: "admin_code_email_failed", message: error instanceof Error ? error.message : String(error) }));
    return json({ success: false, message: "The verification code could not be sent." }, 500);
  }
}

async function handleAdminVerify(request, env) {
  if (!isValidOrigin(request)) return json({ success: false, message: "Invalid request origin." }, 403);
  const formData = await request.formData().catch(() => null);
  const code = formData ? value(formData, "code") : "";
  if (!/^\d{6}$/.test(code)) return json({ success: false, message: "Enter the six-digit code." }, 400);

  const token = randomString(32);
  const success = await adminStore(env).verifyAdminCode(await sha256(code), await sha256(token));
  if (!success) return json({ success: false, message: "The code is invalid or has expired." }, 401);

  return json(
    { success: true },
    200,
    { "Set-Cookie": `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=28800` },
  );
}

async function handleAdminApi(request, env, pathname, url) {
  if (request.method === "POST" && !isValidOrigin(request)) {
    return json({ success: false, message: "Invalid request origin." }, 403);
  }
  if (!(await requireSession(request, env))) {
    return json({ success: false, message: "Please sign in again." }, 401);
  }

  if (pathname === "/api/admin/session" && request.method === "GET") return json({ success: true });
  if (pathname === "/api/admin/logout" && request.method === "POST") {
    const token = cookieValue(request, SESSION_COOKIE);
    if (token) await adminStore(env).deleteSession(await sha256(token));
    return json({ success: true }, 200, { "Set-Cookie": `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0` });
  }
  if (pathname === "/api/admin/applications" && request.method === "GET") {
    const q = (url.searchParams.get("q") || "").slice(0, 80);
    const status = (url.searchParams.get("status") || "").slice(0, 30);
    return json(await adminStore(env).listApplications(q, status));
  }

  const detailMatch = pathname.match(/^\/api\/admin\/applications\/(YP-[A-Z0-9-]+)$/);
  if (detailMatch && request.method === "GET") {
    const result = await adminStore(env).getApplication(detailMatch[1]);
    return result ? json(result) : json({ success: false, message: "Application not found." }, 404);
  }

  const statusMatch = pathname.match(/^\/api\/admin\/applications\/(YP-[A-Z0-9-]+)\/status$/);
  if (statusMatch && request.method === "POST") {
    const formData = await request.formData().catch(() => null);
    const status = formData ? value(formData, "status") : "";
    if (!["new", "reviewing", "approved", "declined", "more_info"].includes(status)) {
      return json({ success: false, message: "Invalid application status." }, 400);
    }
    await adminStore(env).updateStatus(statusMatch[1], status);
    return json({ success: true });
  }

  const documentMatch = pathname.match(/^\/api\/admin\/documents\/([a-f0-9-]+)$/);
  if (documentMatch && request.method === "GET") {
    const document = await adminStore(env).getDocument(documentMatch[1]);
    if (!document) return json({ success: false, message: "Document not found." }, 404);
    return new Response(document.bytes, {
      headers: {
        "Content-Type": document.content_type,
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(document.filename)}`,
        "Content-Length": String(document.size),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
      },
    });
  }

  return json({ success: false, message: "Not found." }, 404);
}

export class RegistrationStore extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.sql = this.ctx.storage.sql;
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS applications (
        id TEXT PRIMARY KEY,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'new',
        country TEXT NOT NULL,
        business_type TEXT NOT NULL,
        legal_name TEXT NOT NULL,
        license_number TEXT NOT NULL,
        business_address TEXT NOT NULL,
        business_phone TEXT NOT NULL,
        business_email TEXT NOT NULL,
        website TEXT NOT NULL,
        established_date TEXT NOT NULL,
        annual_volume TEXT NOT NULL,
        average_transaction TEXT NOT NULL,
        business_description TEXT NOT NULL,
        principal_name TEXT NOT NULL,
        principal_phone TEXT NOT NULL,
        principal_email TEXT NOT NULL,
        ownership_percent TEXT NOT NULL,
        principal_title TEXT NOT NULL,
        bank_type TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_applications_created ON applications(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
      CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        application_id TEXT NOT NULL,
        field_name TEXT NOT NULL,
        label TEXT NOT NULL,
        filename TEXT NOT NULL,
        content_type TEXT NOT NULL,
        size INTEGER NOT NULL,
        chunk_count INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_documents_application ON documents(application_id);
      CREATE TABLE IF NOT EXISTS document_chunks (
        document_id TEXT NOT NULL,
        chunk_index INTEGER NOT NULL,
        data BLOB NOT NULL,
        PRIMARY KEY (document_id, chunk_index)
      );
      CREATE TABLE IF NOT EXISTS admin_codes (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        code_hash TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS admin_sessions (
        token_hash TEXT PRIMARY KEY,
        created_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL
      );
    `);
  }

  async createApplication(application, documents) {
    const columns = [
      "id", "created_at", "updated_at", "status", "country", "business_type", "legal_name",
      "license_number", "business_address", "business_phone", "business_email", "website",
      "established_date", "annual_volume", "average_transaction", "business_description",
      "principal_name", "principal_phone", "principal_email", "ownership_percent",
      "principal_title", "bank_type",
    ];
    const values = [
      application.id, application.created_at, application.created_at, "new", application.country,
      application.business_type, application.legal_name, application.license_number,
      application.business_address, application.business_phone, application.business_email,
      application.website, application.established_date, application.annual_volume,
      application.average_transaction, application.business_description, application.principal_name,
      application.principal_phone, application.principal_email, application.ownership_percent,
      application.principal_title, application.bank_type,
    ];

    this.ctx.storage.transactionSync(() => {
      this.sql.exec(`INSERT INTO applications (${columns.join(",")}) VALUES (${columns.map(() => "?").join(",")})`, ...values);
      for (const document of documents) {
        const chunkCount = Math.ceil(document.bytes.length / FILE_CHUNK_SIZE);
        this.sql.exec(
          "INSERT INTO documents (id, application_id, field_name, label, filename, content_type, size, chunk_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
          document.id, application.id, document.field_name, document.label, document.filename,
          document.content_type, document.size, chunkCount,
        );
        for (let index = 0; index < chunkCount; index += 1) {
          const start = index * FILE_CHUNK_SIZE;
          const chunk = document.bytes.slice(start, Math.min(start + FILE_CHUNK_SIZE, document.bytes.length));
          this.sql.exec("INSERT INTO document_chunks (document_id, chunk_index, data) VALUES (?, ?, ?)", document.id, index, chunk);
        }
      }
    });
    return true;
  }

  async createAdminCode() {
    const now = Date.now();
    const existing = [...this.sql.exec("SELECT created_at FROM admin_codes WHERE id = 1")][0];
    if (existing && now - Number(existing.created_at) < 60_000) {
      return { success: false, retry_after: Math.ceil((60_000 - (now - Number(existing.created_at))) / 1000) };
    }
    const code = randomCode();
    const codeHash = await sha256(code);
    this.sql.exec(
      "INSERT OR REPLACE INTO admin_codes (id, code_hash, created_at, expires_at, attempts) VALUES (1, ?, ?, ?, 0)",
      codeHash, now, now + 10 * 60_000,
    );
    return { success: true, code };
  }

  verifyAdminCode(codeHash, tokenHash) {
    const now = Date.now();
    const row = [...this.sql.exec(
      "SELECT code_hash, expires_at, attempts FROM admin_codes WHERE id = 1 AND code_hash = ?",
      codeHash,
    )][0];
    if (!row || Number(row.expires_at) < now || Number(row.attempts) >= 5) {
      this.sql.exec("UPDATE admin_codes SET attempts = attempts + 1 WHERE id = 1");
      return false;
    }
    this.ctx.storage.transactionSync(() => {
      this.sql.exec("DELETE FROM admin_codes WHERE id = 1");
      this.sql.exec("DELETE FROM admin_sessions WHERE expires_at < ?", now);
      this.sql.exec(
        "INSERT INTO admin_sessions (token_hash, created_at, expires_at) VALUES (?, ?, ?)",
        tokenHash, now, now + 8 * 60 * 60_000,
      );
    });
    return true;
  }

  checkSession(tokenHash) {
    const row = [...this.sql.exec(
      "SELECT token_hash FROM admin_sessions WHERE token_hash = ? AND expires_at > ?",
      tokenHash, Date.now(),
    )][0];
    return Boolean(row);
  }

  deleteSession(tokenHash) {
    this.sql.exec("DELETE FROM admin_sessions WHERE token_hash = ?", tokenHash);
    return true;
  }

  listApplications(q, status) {
    const terms = [];
    const params = [];
    if (status) {
      terms.push("status = ?");
      params.push(status);
    }
    if (q) {
      terms.push("(legal_name LIKE ? OR principal_name LIKE ? OR principal_email LIKE ? OR id LIKE ?)");
      const pattern = `%${q}%`;
      params.push(pattern, pattern, pattern, pattern);
    }
    const where = terms.length ? `WHERE ${terms.join(" AND ")}` : "";
    const applications = [...this.sql.exec(
      `SELECT id, created_at, updated_at, status, country, legal_name, principal_name, principal_email
       FROM applications ${where} ORDER BY created_at DESC LIMIT 100`,
      ...params,
    )];
    const count = [...this.sql.exec(`SELECT COUNT(*) AS total FROM applications ${where}`, ...params)][0];
    return { success: true, applications, total: Number(count?.total || 0) };
  }

  getApplication(id) {
    const application = [...this.sql.exec("SELECT * FROM applications WHERE id = ?", id)][0];
    if (!application) return null;
    const documents = [...this.sql.exec(
      "SELECT id, field_name, label, filename, content_type, size FROM documents WHERE application_id = ? ORDER BY field_name",
      id,
    )];
    return { success: true, application, documents };
  }

  updateStatus(id, status) {
    this.sql.exec("UPDATE applications SET status = ?, updated_at = ? WHERE id = ?", status, new Date().toISOString(), id);
    return true;
  }

  getDocument(id) {
    const document = [...this.sql.exec(
      "SELECT id, filename, content_type, size, chunk_count FROM documents WHERE id = ?",
      id,
    )][0];
    if (!document) return null;
    const chunks = [...this.sql.exec(
      "SELECT data FROM document_chunks WHERE document_id = ? ORDER BY chunk_index",
      id,
    )];
    const bytes = new Uint8Array(Number(document.size));
    let offset = 0;
    for (const row of chunks) {
      const chunk = row.data instanceof Uint8Array ? row.data : new Uint8Array(row.data);
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    return { filename: document.filename, content_type: document.content_type, size: Number(document.size), bytes };
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const { pathname } = url;

    if (pathname === "/api/contact") {
      if (request.method !== "POST") return json({ success: false, message: "Method not allowed." }, 405);
      return handleContact(request, env);
    }
    if (pathname === "/api/registration") {
      if (request.method !== "POST") return json({ success: false, message: "Method not allowed." }, 405);
      return handleRegistration(request, env, ctx);
    }
    if (pathname === "/api/admin/request-code") {
      if (request.method !== "POST") return json({ success: false, message: "Method not allowed." }, 405);
      return handleAdminRequestCode(request, env);
    }
    if (pathname === "/api/admin/verify-code") {
      if (request.method !== "POST") return json({ success: false, message: "Method not allowed." }, 405);
      return handleAdminVerify(request, env);
    }
    if (pathname.startsWith("/api/admin/")) return handleAdminApi(request, env, pathname, url);

    return env.ASSETS.fetch(request);
  },
};
