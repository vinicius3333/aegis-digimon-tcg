// 522/524: Colyseus 0.18 MATCHMAKE_INVALID_ROOM_ID/MATCHMAKE_EXPIRED; 4212/4214: the same
// on older servers; 410: the gateway refuses a retired deployment slot.
const SEAT_GONE_CODES = new Set([410, 522, 524, 4212, 4214]);

const MAX_RETRY_DELAY_MS = 5_000;

export class SeatLostError extends Error {
  constructor() {
    super("Connection lost. We could not resume the match.");
    this.name = "SeatLostError";
  }
}

export class ResumeCancelledError extends Error {
  constructor() {
    super("cancelled");
    this.name = "ResumeCancelledError";
  }
}

export function isSeatGone(error: unknown): boolean {
  const code = (error as { code?: unknown } | undefined)?.code;
  return typeof code === "number" && SEAT_GONE_CODES.has(code);
}

export interface ResumeSeatOptions<T> {
  resume: () => Promise<T>;
  /** Epoch ms when the server releases the seat. */
  deadline: number;
  isCancelled: () => boolean;
  now?: () => number;
  delay?: (ms: number) => Promise<void>;
  isHidden?: () => boolean;
  waitUntilVisible?: () => Promise<void>;
}

/**
 * A hidden tab waits until visible, then gets one attempt even past the deadline: the
 * server decides whether the seat survived.
 */
export async function resumeSeat<T>({
  resume,
  deadline,
  isCancelled,
  now = Date.now,
  delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  isHidden = () => typeof document !== "undefined" && document.hidden,
  waitUntilVisible = () => Promise.resolve(),
}: ResumeSeatOptions<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    if (isCancelled()) throw new ResumeCancelledError();
    if (isHidden()) {
      await waitUntilVisible();
      attempt = 0;
      if (isCancelled()) throw new ResumeCancelledError();
    }
    try {
      return await resume();
    } catch (error) {
      if (isCancelled()) throw new ResumeCancelledError();
      if (isSeatGone(error)) throw new SeatLostError();
      const remaining = deadline - now();
      if (remaining <= 0) throw new SeatLostError();
      await delay(Math.min(1_000 * 2 ** attempt, MAX_RETRY_DELAY_MS, remaining));
    }
  }
}
