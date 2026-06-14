/**
 * Cloudflare Turnstile Server-side-Verify.
 * Docs: https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
 */

interface SiteverifyResponse {
  success: boolean;
  'error-codes'?: string[];
  hostname?: string;
  challenge_ts?: string;
}

export async function verifyTurnstile(
  token: string,
  secret: string,
  ip?: string,
): Promise<boolean> {
  if (!token || !secret) return false;

  const form = new FormData();
  form.set('secret', secret);
  form.set('response', token);
  if (ip) form.set('remoteip', ip);

  try {
    // Fail-closed bei Netzwerk-Stall: 5s Timeout statt Worker-CPU-Limit auszulasten.
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      console.error('[turnstile] siteverify HTTP', res.status);
      return false;
    }
    const data = (await res.json()) as SiteverifyResponse;
    return data.success === true;
  } catch (err) {
    console.error('[turnstile] siteverify failed:', (err as Error).name);
    return false;
  }
}
