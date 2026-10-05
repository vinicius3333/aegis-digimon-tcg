import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AccountStore } from "../accounts/AccountStore.js";
import { createMemoryPool } from "../db/memoryPool.fixture.js";
import {
  brevoProvider,
  createMailer,
  EmailQuotaExceededError,
  parseAddress,
  ProviderQuotaError,
  resendProvider,
  type EmailProvider,
} from "./mailer.js";

const MESSAGE = { to: "tamer@example.com", subject: "Sign in to Aegis", html: "<p>link</p>" };
const OCTOBER_5 = Date.UTC(2026, 9, 5, 12);
const OCTOBER_6 = Date.UTC(2026, 9, 6, 0, 1);

function provider(name: string, dailyLimit: number, send = vi.fn<EmailProvider["send"]>(async () => undefined)) {
  return { name, dailyLimit, send } satisfies EmailProvider;
}

let store: AccountStore;

beforeEach(() => {
  store = new AccountStore(createMemoryPool());
});

afterEach(async () => {
  await store.close();
});

describe("mailer", () => {
  it("uses the first provider until its daily limit, then the next one", async () => {
    const resend = provider("resend", 2);
    const brevo = provider("brevo", 1);
    const send = createMailer({ providers: [resend, brevo], quota: store, now: () => OCTOBER_5 });

    await send(MESSAGE);
    await send(MESSAGE);
    await send(MESSAGE);

    expect(resend.send).toHaveBeenCalledTimes(2);
    expect(brevo.send).toHaveBeenCalledTimes(1);
  });

  it("reports the daily limit once every provider is used up", async () => {
    const send = createMailer({ providers: [provider("resend", 1)], quota: store, now: () => OCTOBER_5 });

    await send(MESSAGE);

    await expect(send(MESSAGE)).rejects.toBeInstanceOf(EmailQuotaExceededError);
  });

  it("starts a new budget on the next UTC day", async () => {
    let now = OCTOBER_5;
    const resend = provider("resend", 1);
    const send = createMailer({ providers: [resend], quota: store, now: () => now });

    await send(MESSAGE);
    now = OCTOBER_6;
    await send(MESSAGE);

    expect(resend.send).toHaveBeenCalledTimes(2);
  });

  it("marks a provider exhausted when it reports its own quota is gone", async () => {
    const resend = provider(
      "resend",
      100,
      vi.fn<EmailProvider["send"]>(async () => {
        throw new ProviderQuotaError("quota");
      }),
    );
    const brevo = provider("brevo", 300);
    const send = createMailer({ providers: [resend, brevo], quota: store, now: () => OCTOBER_5 });

    await send(MESSAGE);
    await send(MESSAGE);

    expect(resend.send).toHaveBeenCalledTimes(1);
    expect(brevo.send).toHaveBeenCalledTimes(2);
  });

  it("falls back on a delivery failure and rethrows it when nothing else delivers", async () => {
    const failure = new Error("Resend responded 500");
    const resend = provider(
      "resend",
      100,
      vi.fn<EmailProvider["send"]>(async () => {
        throw failure;
      }),
    );
    const brevo = provider("brevo", 300);

    await createMailer({ providers: [resend, brevo], quota: store, now: () => OCTOBER_5 })(MESSAGE);
    expect(brevo.send).toHaveBeenCalledTimes(1);

    await expect(createMailer({ providers: [resend], quota: store, now: () => OCTOBER_5 })(MESSAGE)).rejects.toBe(
      failure,
    );
  });
});

describe("providers", () => {
  it("posts to Resend and maps 429 to a quota error", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () => new Response(null, { status: 429 }));
    const resend = resendProvider({ apiKey: "key", from: "Aegis <noreply@mail.example.com>", dailyLimit: 100, fetch });

    await expect(resend.send(MESSAGE)).rejects.toBeInstanceOf(ProviderQuotaError);
    const [url, init] = fetch.mock.calls[0]!;
    expect(url).toBe("https://api.resend.com/emails");
    expect(JSON.parse(String(init?.body))).toEqual({
      from: "Aegis <noreply@mail.example.com>",
      to: ["tamer@example.com"],
      subject: "Sign in to Aegis",
      html: "<p>link</p>",
    });
  });

  it("posts to Brevo with a sender object and maps 402 to a quota error", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () => new Response(null, { status: 402 }));
    const brevo = brevoProvider({ apiKey: "key", from: "Aegis <noreply@email.example.com>", dailyLimit: 300, fetch });

    await expect(brevo.send(MESSAGE)).rejects.toBeInstanceOf(ProviderQuotaError);
    const [url, init] = fetch.mock.calls[0]!;
    expect(url).toBe("https://api.brevo.com/v3/smtp/email");
    expect(new Headers(init?.headers).get("api-key")).toBe("key");
    expect(JSON.parse(String(init?.body))).toEqual({
      sender: { name: "Aegis", email: "noreply@email.example.com" },
      to: [{ email: "tamer@example.com" }],
      subject: "Sign in to Aegis",
      htmlContent: "<p>link</p>",
    });
  });

  it("parses bare and named sender addresses", () => {
    expect(parseAddress("noreply@example.com")).toEqual({ email: "noreply@example.com" });
    expect(parseAddress('"Aegis TCG" <noreply@example.com>')).toEqual({
      name: "Aegis TCG",
      email: "noreply@example.com",
    });
  });
});
