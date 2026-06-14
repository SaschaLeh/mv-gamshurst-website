/// <reference types="@cloudflare/workers-types" />

import { handleContact } from './handlers/contact';

export interface Env {
  /** Static-Assets-Binding (dist/). Vom wrangler.jsonc `assets`-Block geliefert. */
  ASSETS: Fetcher;
  /** KV-Namespace für Rate-Limiting (binding in wrangler.jsonc). */
  RATE_LIMIT?: KVNamespace;
  /** Resend-API-Key (per `wrangler secret put RESEND_API_KEY`). */
  RESEND_API_KEY?: string;
  /** Cloudflare Turnstile Server-Secret (per `wrangler secret put TURNSTILE_SECRET`). */
  TURNSTILE_SECRET?: string;
  /** Ziel-Adresse für eingehende Mails. Default: info@mv-gamshurst.de */
  CONTACT_TO?: string;
  /** Absender-Adresse (muss in Resend verifiziert sein). Default: onboarding@resend.dev (Resend-Sandbox). */
  CONTACT_FROM?: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/api/contact') {
      return handleContact(request, env, ctx);
    }

    // Alles andere: Static-Assets aus dist/ ausliefern.
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
