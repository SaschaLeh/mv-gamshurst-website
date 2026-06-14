import { useEffect, useId, useRef, useState } from 'react';

interface Props {
  /** Cloudflare Turnstile Public Site-Key. */
  turnstileSiteKey: string;
  /** Endpoint, das der Worker bedient. Default `/api/contact`. */
  endpoint?: string;
}

interface FieldErrors {
  name?: string;
  email?: string;
  message?: string;
  consent?: string;
  turnstile?: string;
}

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        opts: {
          sitekey: string;
          callback?: (token: string) => void;
          'expired-callback'?: () => void;
          'error-callback'?: () => void;
          theme?: 'light' | 'dark' | 'auto';
          appearance?: 'always' | 'execute' | 'interaction-only';
        },
      ) => string;
      reset: (widgetId?: string) => void;
    };
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TURNSTILE_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

export default function ContactForm({ turnstileSiteKey, endpoint = '/api/contact' }: Props) {
  const formId = useId();
  const turnstileContainerRef = useRef<HTMLDivElement | null>(null);
  const turnstileWidgetIdRef = useRef<string | null>(null);

  const [values, setValues] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    consent: false,
    honeypot: '',
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [turnstileToken, setTurnstileToken] = useState<string>('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Turnstile-Script laden + Widget rendern
  useEffect(() => {
    if (!turnstileSiteKey) {
      console.warn('[ContactForm] turnstileSiteKey fehlt — Captcha kann nicht laden.');
      return;
    }

    const renderWidget = () => {
      if (!window.turnstile || !turnstileContainerRef.current) return;
      // Wenn schon ein Widget existiert: nicht doppelt rendern.
      if (turnstileWidgetIdRef.current) return;
      turnstileWidgetIdRef.current = window.turnstile.render(turnstileContainerRef.current, {
        sitekey: turnstileSiteKey,
        callback: (token) => {
          setTurnstileToken(token);
          setErrors((e) => ({ ...e, turnstile: undefined }));
        },
        'expired-callback': () => setTurnstileToken(''),
        'error-callback': () => {
          setTurnstileToken('');
          setErrors((e) => ({ ...e, turnstile: 'Captcha-Fehler — neu laden.' }));
        },
      });
    };

    // Script nur einmal anhängen.
    const existing = document.querySelector<HTMLScriptElement>(`script[src^="${TURNSTILE_SRC.split('?')[0]}"]`);
    if (existing) {
      if (window.turnstile) {
        renderWidget();
      } else {
        existing.addEventListener('load', renderWidget, { once: true });
      }
    } else {
      const script = document.createElement('script');
      script.src = TURNSTILE_SRC;
      script.async = true;
      script.defer = true;
      script.addEventListener('load', renderWidget, { once: true });
      document.head.appendChild(script);
    }
  }, [turnstileSiteKey]);

  function validate(): FieldErrors {
    const e: FieldErrors = {};
    if (!values.name.trim()) e.name = 'Bitte Name angeben.';
    if (!values.email.trim()) e.email = 'Bitte E-Mail-Adresse angeben.';
    else if (!EMAIL_RE.test(values.email.trim())) e.email = 'E-Mail-Adresse ungültig.';
    if (!values.message.trim()) e.message = 'Bitte Nachricht schreiben.';
    else if (values.message.trim().length < 10)
      e.message = 'Nachricht zu kurz (mindestens 10 Zeichen).';
    if (!values.consent) e.consent = 'Bitte den Datenschutzhinweis bestätigen.';
    if (!turnstileToken) e.turnstile = 'Bitte das Captcha lösen.';
    return e;
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const v = validate();
    setErrors(v);
    if (Object.keys(v).length > 0) return;

    setStatus('submitting');
    setErrorMessage('');
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: values.name.trim(),
          email: values.email.trim(),
          subject: values.subject.trim(),
          message: values.message.trim(),
          consent: values.consent,
          honeypot: values.honeypot,
          turnstileToken,
        }),
      });
      if (res.ok) {
        setStatus('success');
        // Reset Captcha für nächste Eingabe
        if (window.turnstile && turnstileWidgetIdRef.current) {
          window.turnstile.reset(turnstileWidgetIdRef.current);
        }
        setTurnstileToken('');
        return;
      }
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      const errorMap: Record<string, string> = {
        validation: 'Eingabe ungültig. Bitte überprüfen.',
        turnstile_failed: 'Captcha-Validierung fehlgeschlagen — bitte erneut versuchen.',
        rate_limit_exceeded:
          'Du hast diese Stunde schon mehrere Nachrichten gesendet. Bitte später erneut.',
        mail_send_failed: 'Mail-Versand schlug fehl. Bitte später erneut.',
      };
      setStatus('error');
      setErrorMessage(errorMap[data.error ?? ''] ?? 'Fehler beim Senden — bitte später erneut.');
      if (window.turnstile && turnstileWidgetIdRef.current) {
        window.turnstile.reset(turnstileWidgetIdRef.current);
      }
      setTurnstileToken('');
    } catch (err) {
      console.error('[ContactForm] submit error', err);
      setStatus('error');
      setErrorMessage('Netzwerkfehler — bitte später erneut.');
    }
  }

  function reset() {
    setValues({ name: '', email: '', subject: '', message: '', consent: false, honeypot: '' });
    setErrors({});
    setStatus('idle');
    setErrorMessage('');
    if (window.turnstile && turnstileWidgetIdRef.current) {
      window.turnstile.reset(turnstileWidgetIdRef.current);
    }
    setTurnstileToken('');
  }

  if (status === 'success') {
    return (
      <div className="cf-success" role="status">
        <div className="cf-success-check" aria-hidden="true">✓</div>
        <h2>Vielen Dank!</h2>
        <p>Deine Nachricht ist angekommen. Wir melden uns zeitnah.</p>
        <button type="button" className="cf-btn cf-btn--primary" onClick={reset}>
          Neue Nachricht
        </button>
      </div>
    );
  }

  return (
    <form className="cf-form" noValidate onSubmit={onSubmit} aria-describedby={`${formId}-help`}>
      <div className="cf-row">
        <div className="cf-field">
          <label htmlFor={`${formId}-name`}>
            Name <span aria-hidden="true">*</span>
          </label>
          <input
            id={`${formId}-name`}
            name="name"
            type="text"
            autoComplete="name"
            required
            value={values.name}
            onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? `${formId}-name-err` : undefined}
          />
          {errors.name && <p id={`${formId}-name-err`} className="cf-err">{errors.name}</p>}
        </div>

        <div className="cf-field">
          <label htmlFor={`${formId}-email`}>
            E-Mail <span aria-hidden="true">*</span>
          </label>
          <input
            id={`${formId}-email`}
            name="email"
            type="email"
            autoComplete="email"
            required
            value={values.email}
            onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? `${formId}-email-err` : undefined}
          />
          {errors.email && <p id={`${formId}-email-err`} className="cf-err">{errors.email}</p>}
        </div>
      </div>

      <div className="cf-field">
        <label htmlFor={`${formId}-subject`}>Betreff</label>
        <input
          id={`${formId}-subject`}
          name="subject"
          type="text"
          value={values.subject}
          onChange={(e) => setValues((v) => ({ ...v, subject: e.target.value }))}
        />
      </div>

      <div className="cf-field">
        <label htmlFor={`${formId}-message`}>
          Nachricht <span aria-hidden="true">*</span>
        </label>
        <textarea
          id={`${formId}-message`}
          name="message"
          rows={6}
          required
          value={values.message}
          onChange={(e) => setValues((v) => ({ ...v, message: e.target.value }))}
          aria-invalid={!!errors.message}
          aria-describedby={errors.message ? `${formId}-message-err` : undefined}
        />
        {errors.message && (
          <p id={`${formId}-message-err`} className="cf-err">{errors.message}</p>
        )}
      </div>

      {/* Honeypot — versteckt vor Menschen, Bots füllen es aus */}
      <div className="cf-honeypot" aria-hidden="true">
        <label>
          Nicht ausfüllen
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={values.honeypot}
            onChange={(e) => setValues((v) => ({ ...v, honeypot: e.target.value }))}
          />
        </label>
      </div>

      <div className="cf-field cf-field--consent">
        <label className="cf-consent">
          <input
            type="checkbox"
            checked={values.consent}
            onChange={(e) => setValues((v) => ({ ...v, consent: e.target.checked }))}
            aria-invalid={!!errors.consent}
          />
          <span>
            Ich willige ein, dass meine Angaben zur Bearbeitung der Anfrage verarbeitet werden. Details
            in der <a href="/datenschutz">Datenschutzerklärung</a>. <span aria-hidden="true">*</span>
          </span>
        </label>
        {errors.consent && <p className="cf-err">{errors.consent}</p>}
      </div>

      <div className="cf-field">
        <div ref={turnstileContainerRef} />
        {errors.turnstile && <p className="cf-err">{errors.turnstile}</p>}
      </div>

      {status === 'error' && (
        <p className="cf-err cf-err--global" role="alert">{errorMessage}</p>
      )}

      <div className="cf-actions">
        <button
          type="submit"
          className="cf-btn cf-btn--primary"
          disabled={status === 'submitting'}
        >
          {status === 'submitting' ? 'Wird gesendet …' : 'Nachricht senden'}
        </button>
        <p id={`${formId}-help`} className="cf-hint">
          <span aria-hidden="true">*</span> Pflichtfelder
        </p>
      </div>

      <style>{`
        .cf-form {
          display: grid;
          gap: 1.25rem;
        }
        .cf-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.25rem;
        }
        @media (max-width: 640px) {
          .cf-row { grid-template-columns: 1fr; }
        }
        .cf-field {
          display: grid;
          gap: 0.4rem;
        }
        .cf-field label {
          font-weight: 600;
          color: var(--color-text-heading);
          font-size: var(--fs-body-sm);
        }
        .cf-field input,
        .cf-field textarea {
          width: 100%;
          padding: 0.75rem 0.85rem;
          border-radius: var(--radius-input);
          border: 1px solid var(--color-border-strong);
          background: #fff;
          color: var(--color-text-heading);
          font: inherit;
        }
        .cf-field textarea { resize: vertical; min-height: 140px; }
        .cf-field input:focus-visible,
        .cf-field textarea:focus-visible {
          outline: 0;
          border-color: var(--color-petrol-medium);
          box-shadow: 0 0 0 3px rgba(31, 101, 115, 0.15);
        }
        .cf-field input[aria-invalid="true"],
        .cf-field textarea[aria-invalid="true"] {
          border-color: var(--color-error);
        }
        .cf-honeypot {
          position: absolute;
          left: -9999px;
          width: 1px;
          height: 1px;
          overflow: hidden;
        }
        .cf-consent {
          display: grid;
          grid-template-columns: auto 1fr;
          gap: 0.6rem;
          align-items: start;
          cursor: pointer;
          font-size: var(--fs-body-sm);
          font-weight: 400;
          color: var(--color-text-body);
        }
        .cf-consent input { margin-top: 0.2rem; }
        .cf-consent a { color: var(--color-petrol-medium); text-decoration: underline; }
        .cf-err {
          color: var(--color-error);
          font-size: var(--fs-body-sm);
          margin: 0;
        }
        .cf-err--global {
          padding: 0.75rem 1rem;
          background: rgba(210, 59, 83, 0.08);
          border-radius: var(--radius-input);
        }
        .cf-actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 0.75rem;
          margin-top: 0.5rem;
        }
        .cf-btn {
          display: inline-block;
          padding: 0.85rem 1.6rem;
          border-radius: var(--radius-pill);
          font-weight: 700;
          font-size: var(--fs-body-sm);
          cursor: pointer;
          border: 0;
          transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease;
        }
        .cf-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .cf-btn--primary {
          background: var(--color-primary);
          color: #fff;
          box-shadow: var(--shadow-button);
        }
        .cf-btn--primary:hover:not(:disabled) { transform: translateY(-2px); }
        .cf-hint {
          color: var(--color-text-muted);
          font-size: var(--fs-eyebrow);
        }
        .cf-success {
          background: var(--color-success-bg);
          padding: 2rem;
          border-radius: var(--radius-card);
          text-align: center;
          display: grid;
          gap: 1rem;
          justify-items: center;
        }
        .cf-success-check {
          width: 64px;
          height: 64px;
          background: var(--color-success-text);
          color: #fff;
          border-radius: 50%;
          display: grid;
          place-items: center;
          font-size: 2rem;
          font-weight: 700;
        }
        .cf-success h2 { color: var(--color-success-text); }
      `}</style>
    </form>
  );
}
