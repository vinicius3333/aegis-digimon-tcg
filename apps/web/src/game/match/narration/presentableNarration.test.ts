import { afterEach, describe, expect, it } from "vitest";
import { NOTICE_LIFETIME_MS, type MatchNotice } from "../../notices";
import type { NarrationItem } from "../../narration";
import { TOUCH_NARRATION_LIFETIME_SCALE } from "../../narration";
import { setNoticeDuration } from "../../noticeDuration";
import { presentableNarration } from "./presentableNarration";

const item = {
  id: "moment-1",
  side: 0,
  batchId: "batch-1",
  createdAt: 0,
  notice: { id: "notice-1" } as MatchNotice,
} as unknown as NarrationItem;

describe("presentable narration", () => {
  afterEach(() => setNoticeDuration("normal"));

  it("keeps the default reading time at normal duration on a wide layout", () => {
    expect(presentableNarration(item, { collapseNarration: false }).lifetimeMs).toBeUndefined();
  });

  it("stretches the reading time by the chosen notice duration", () => {
    setNoticeDuration("longest");
    expect(presentableNarration(item, { collapseNarration: false }).lifetimeMs).toBe(NOTICE_LIFETIME_MS * 2);
  });

  it("combines the notice duration with the touch layout's longer clock", () => {
    setNoticeDuration("long");
    expect(presentableNarration(item, { collapseNarration: true }).lifetimeMs).toBe(
      Math.round(NOTICE_LIFETIME_MS * TOUCH_NARRATION_LIFETIME_SCALE * 1.5),
    );
  });
});
