import { describe, expect, it, vi } from "vitest";
import { ResumeCancelledError, SeatLostError, isSeatGone, resumeSeat } from "./resumeSeat";

function clock() {
  let time = 0;
  return {
    now: () => time,
    delay: vi.fn(async (ms: number) => {
      time += ms;
    }),
  };
}

const unreachable = Object.assign(new Error("Failed to fetch"), { code: undefined });
const seatGone = Object.assign(new Error("room not found"), { code: 522 });

describe("resumeSeat", () => {
  it("keeps retrying through an outage longer than the old fixed budget", async () => {
    const { now, delay } = clock();
    const outageEndsAt = 60_000;
    const resume = vi.fn(async () => {
      if (now() < outageEndsAt) throw unreachable;
      return "room";
    });

    await expect(resumeSeat({ resume, deadline: 180_000, isCancelled: () => false, now, delay })).resolves.toBe(
      "room",
    );
    expect(resume.mock.calls.length).toBeGreaterThan(8);
    expect(Math.max(...delay.mock.calls.map(([ms]) => ms))).toBe(5_000);
  });

  it("gives up once the server's grace window has closed", async () => {
    const { now, delay } = clock();
    const resume = vi.fn(async () => {
      throw unreachable;
    });

    await expect(resumeSeat({ resume, deadline: 180_000, isCancelled: () => false, now, delay })).rejects.toBeInstanceOf(
      SeatLostError,
    );
    expect(now()).toBe(180_000);
  });

  it("stops at once when the server says the seat is gone", async () => {
    const { now, delay } = clock();
    const resume = vi.fn(async () => {
      throw seatGone;
    });

    await expect(resumeSeat({ resume, deadline: 180_000, isCancelled: () => false, now, delay })).rejects.toBeInstanceOf(
      SeatLostError,
    );
    expect(resume).toHaveBeenCalledOnce();
    expect(delay).not.toHaveBeenCalled();
  });

  it("waits for a hidden tab and still asks the server once after the deadline", async () => {
    const { now, delay } = clock();
    let hidden = true;
    const resume = vi.fn(async () => "room");
    const waitUntilVisible = vi.fn(async () => {
      await delay(300_000);
      hidden = false;
    });

    await expect(
      resumeSeat({ resume, deadline: 180_000, isCancelled: () => false, now, delay, isHidden: () => hidden, waitUntilVisible }),
    ).resolves.toBe("room");
    expect(resume).toHaveBeenCalledOnce();
  });

  it("stops without an error state when the caller cancels", async () => {
    let cancelled = false;
    const resume = vi.fn(async () => {
      cancelled = true;
      throw unreachable;
    });

    await expect(
      resumeSeat({ resume, deadline: 180_000, isCancelled: () => cancelled, delay: async () => {} }),
    ).rejects.toBeInstanceOf(ResumeCancelledError);
  });

  it("treats only definitive server answers as a lost seat", () => {
    for (const code of [410, 522, 524, 4212, 4214]) expect(isSeatGone({ code })).toBe(true);
    for (const code of [0, 502, 503, 504, undefined]) expect(isSeatGone({ code })).toBe(false);
    expect(isSeatGone(undefined)).toBe(false);
  });
});
