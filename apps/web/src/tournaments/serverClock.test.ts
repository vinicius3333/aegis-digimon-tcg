// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  isServerClockSynced,
  observeResponseDate,
  observeServerTime,
  resetServerClock,
  serverClockOffsetMs,
  serverClockOffsetSeconds,
  serverNow,
} from "./serverClock";

const LOCAL_NOW = Date.parse("2026-08-12T12:00:00.000Z");

beforeEach(() => {
  resetServerClock();
  vi.useFakeTimers();
  vi.setSystemTime(LOCAL_NOW);
});
afterEach(() => {
  vi.useRealTimers();
  resetServerClock();
});

describe("server clock", () => {
  it("is unsynced and neutral until the first observation", () => {
    expect(isServerClockSynced()).toBe(false);
    expect(serverClockOffsetMs()).toBe(0);
    expect(serverNow()).toBe(LOCAL_NOW);
  });

  it("anchors a sample at the round-trip midpoint, not at arrival", () => {
    // The server stamped the response somewhere inside a 400 ms round trip, and the clocks agree.
    // Reading the stamp at arrival would invent a 200 ms lag; the midpoint sees none.
    observeServerTime({ serverEpochMs: LOCAL_NOW + 200, sentAt: LOCAL_NOW, receivedAt: LOCAL_NOW + 400 });
    expect(serverClockOffsetMs()).toBe(0);
  });

  it("corrects for the whole-second truncation of a Date header", () => {
    // A header reading 12:00:00 means "somewhere in [12:00:00, 12:00:01)", whose midpoint is
    // +500 ms. Taking the header at face value would under-read the server clock by half a second.
    observeResponseDate(headers(new Date(LOCAL_NOW).toUTCString()), LOCAL_NOW, LOCAL_NOW);
    expect(serverClockOffsetMs()).toBe(500);
  });

  it("keeps the sharpest sample instead of letting a slow later response overwrite it", () => {
    // First sample: 20 ms round trip, server is exactly 60 s ahead.
    observeServerTime({ serverEpochMs: LOCAL_NOW + 60_000 + 10, sentAt: LOCAL_NOW, receivedAt: LOCAL_NOW + 20 });
    const sharp = serverClockOffsetMs();
    expect(Math.round(sharp / 1000)).toBe(60);

    // Second sample lands later over a 4 s round trip. Its own estimate is 2 s off, which would
    // drag a countdown backwards across a warning threshold; the worse RTT is rejected.
    vi.setSystemTime(LOCAL_NOW + 30_000);
    observeServerTime({ serverEpochMs: LOCAL_NOW + 30_000 + 60_000, sentAt: LOCAL_NOW + 30_000, receivedAt: LOCAL_NOW + 34_000 });
    expect(serverClockOffsetMs()).toBe(sharp);
  });

  it("accepts a worse sample once the best one has gone stale, so real drift is tracked", () => {
    observeServerTime({ serverEpochMs: LOCAL_NOW + 10, sentAt: LOCAL_NOW, receivedAt: LOCAL_NOW + 20 });
    const sixMinutesLater = LOCAL_NOW + 6 * 60_000;
    observeServerTime({ serverEpochMs: sixMinutesLater + 45_000, sentAt: sixMinutesLater, receivedAt: sixMinutesLater + 4_000 });
    expect(Math.round(serverClockOffsetMs() / 1000)).toBe(43);
  });

  it("rounds the subscribed offset to whole seconds so sub-second jitter does not tear a countdown", () => {
    observeServerTime({ serverEpochMs: LOCAL_NOW + 30_400, sentAt: LOCAL_NOW, receivedAt: LOCAL_NOW });
    expect(serverClockOffsetSeconds()).toBe(30);
    expect(serverClockOffsetMs()).toBe(30_400);
  });

  it("ignores a malformed or absent Date header", () => {
    observeResponseDate(headers(undefined), LOCAL_NOW, LOCAL_NOW);
    observeResponseDate(headers("not a date"), LOCAL_NOW, LOCAL_NOW);
    expect(isServerClockSynced()).toBe(false);
  });
});

function headers(date: string | undefined): Pick<Response, "headers"> {
  return { headers: { get: (name: string) => (name.toLowerCase() === "date" ? (date ?? null) : null) } as Headers };
}
