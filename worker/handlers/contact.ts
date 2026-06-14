import { z } from 'zod';
import type { Env } from '../index';
import { verifyTurnstile } from '../lib/turnstile';

// Schema spiegelt die clientseitige Validierung (Handoff §6). Server-validiert die gleichen Regeln.
const ContactSchema = z.object({
  name: z.string().trim().min(1, 'Name fehlt').max(200),
  email: z.string().trim().email('E-Mail ungültig').max(254),
  subject: z.string().trim().max(200).default(''),
  message: z.string().trim().min(10, 'Nachricht zu kurz').max(5000),
  consent: z.literal(true, { errorMap: () => ({ message: 'Einwilligung fehlt' }) }),
  // Honeypot: Muss leer sein. Bots füllen versteckte Felder gern aus.
  honeypot: z.string().max(0).default(''),
  turnstileToken: z.string().min(1, 'Captcha-Token fehlt'),
});

const RATE_LIMIT_PER_HOUR = 5;
const RATE_LIMIT_TTL = 3600;

const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8' } as const;

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), { status, headers: JSON_HEADERS });
}

async function sha256Hex(input: string): Promise<string> {
  const enc = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function handleContact(
  request: Request,
  env: Env,
  _ctx: ExecutionContext,
): Promise<Response> {
  // 1. Method + Content-Type
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'method_not_allowed' }, 405);
  }
  const ct = request.headers.get('content-type') ?? '';
  if (!ct.includes('application/json')) {
    return jsonResponse({ error: 'invalid_content_type' }, 415);
  }

  // 2. Body parsen + Schema-Validierung
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: 'invalid_json' }, 400);
  }
  const parsed = ContactSchema.safeParse(payload);
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    return jsonResponse({ error: 'validation', fields: fieldErrors }, 400);
  }
  const { name, email, subject, message, turnstileToken } = parsed.data;

  // 3. Turnstile verifizieren
  const ip = request.headers.get('cf-connecting-ip') ?? '';
  const tsSecret = env.TURNSTILE_SECRET ?? '';
  const tsOk = await verifyTurnstile(turnstileToken, tsSecret, ip);
  if (!tsOk) {
    return jsonResponse({ error: 'turnstile_failed' }, 400);
  }

  // 4. Rate-Limit (KV optional — falls Binding fehlt, skip)
  if (env.RATE_LIMIT && ip) {
    const ipHash = await sha256Hex(ip);
    const key = `rl:${ipHash}`;
    const current = Number.parseInt((await env.RATE_LIMIT.get(key)) ?? '0', 10);
    if (current >= RATE_LIMIT_PER_HOUR) {
      return jsonResponse({ error: 'rate_limit_exceeded' }, 429);
    }
    await env.RATE_LIMIT.put(key, String(current + 1), { expirationTtl: RATE_LIMIT_TTL });
  }

  // 5. Mail via Resend (Production) ODER Console-Log (Dev ohne API-Key)
  const to = env.CONTACT_TO || 'info@mv-gamshurst.de';
  const from = env.CONTACT_FROM || 'onboarding@resend.dev';
  const safeSubject = subject || 'Nachricht von der Website';
  const textBody = [
    `Neue Nachricht über mv-gamshurst.de`,
    ``,
    `Von: ${name} <${email}>`,
    `Betreff: ${safeSubject}`,
    ``,
    `Nachricht:`,
    message,
  ].join('\n');

  if (env.RESEND_API_KEY) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: email,
        subject: `[Kontakt] ${safeSubject}`,
        text: textBody,
      }),
    });
    if (!res.ok) {
      // Nur Status loggen, NICHT response.text() — Resend echo'd Request-Body inkl. PII.
      console.error('[contact] Resend HTTP', res.status);
      return jsonResponse({ error: 'mail_send_failed' }, 502);
    }
  } else {
    // Dev: keine PII (Name, E-Mail, Body) loggen — Workers Observability speichert logs.
    console.warn('[contact] RESEND_API_KEY fehlt — Mail würde an', to, 'gehen');
  }

  // 6. DSGVO Art. 7(1): Einwilligung nachweisbar speichern (90 Tage TTL).
  if (env.RATE_LIMIT && ip) {
    const ipHash = await sha256Hex(ip);
    const emailHash = await sha256Hex(email);
    const ts = new Date().toISOString();
    await env.RATE_LIMIT.put(
      `consent:${ts}:${ipHash.slice(0, 12)}`,
      JSON.stringify({ ts, ipHash, emailHash }),
      { expirationTtl: 90 * 86400 },
    );
  }

  return jsonResponse({ ok: true });
}
