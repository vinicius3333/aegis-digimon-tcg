export interface ErrorAlert {
  subject: string;
  body: string;
}

interface ErrorAlertOptions {
  deliver: (alert: ErrorAlert) => Promise<void>;
  now?: () => number;
  cooldownMs?: number;
  hourlyLimit?: number;
}

const HOUR_MS = 60 * 60 * 1000;
const MAX_BODY_LENGTH = 20_000;

// Errors are grouped by their first text argument (for example "[engine] playCard apply
// failed:"), so a failure repeating in a loop sends one email per cooldown instead of one per
// occurrence. The hourly limit caps the total across all groups. Both are per process.
export function createErrorAlerts({
  deliver,
  now = Date.now,
  cooldownMs = 10 * 60 * 1000,
  hourlyLimit = 20,
}: ErrorAlertOptions) {
  const lastSentByKey = new Map<string, number>();
  const suppressedByKey = new Map<string, number>();
  let sentTimes: number[] = [];
  const pending = new Set<Promise<void>>();

  function report(args: unknown[], line: string): void {
    const key = typeof args[0] === "string" ? args[0] : "error";
    const time = now();
    sentTimes = sentTimes.filter((sentAt) => time - sentAt < HOUR_MS);
    const lastSent = lastSentByKey.get(key);
    if ((lastSent !== undefined && time - lastSent < cooldownMs) || sentTimes.length >= hourlyLimit) {
      suppressedByKey.set(key, (suppressedByKey.get(key) ?? 0) + 1);
      return;
    }
    const suppressed = suppressedByKey.get(key) ?? 0;
    suppressedByKey.delete(key);
    lastSentByKey.set(key, time);
    sentTimes.push(time);

    const repeats = suppressed > 0 ? `\n\nRepeated ${suppressed} more time(s) since the last email.` : "";
    const delivery = deliver({
      subject: `[Aegis] ${key}`.slice(0, 200),
      body: line.slice(0, MAX_BODY_LENGTH) + repeats,
    })
      .catch((error: unknown) => {
        // Not logError: a failing alert would report itself and loop.
        process.stderr.write(`[errorAlerts] delivery failed: ${String(error)}\n`);
      })
      .finally(() => pending.delete(delivery));
    pending.add(delivery);
  }

  async function flush(): Promise<void> {
    await Promise.all(pending);
  }

  return { report, flush };
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function resendDelivery(apiKey: string, from: string, to: string) {
  return async ({ subject, body }: ErrorAlert): Promise<void> => {
    const revision = process.env.AEGIS_REVISION ?? "unknown";
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        html: `<p>Revision: ${escapeHtml(revision)}</p><pre>${escapeHtml(body)}</pre>`,
      }),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error(`Resend responded ${response.status}`);
  };
}
