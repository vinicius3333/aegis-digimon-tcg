import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "./testkit/advance.js";
import { assertNoLoudGap, setupEngine } from "./testkit/harness.js";
import "../cards/index.js";

describe("synthetic token identity allocation", () => {
  it("skips seeded permanent and instance ids instead of collecting another card's effects", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT14-018", as: "source" }] },
    });
    const sourcePermanentId = s.perm("source").permanentId;
    const sourceInstanceId = s.perm("source").topCard.instanceId;

    // The production On Play seam is used directly because the source is deliberately seeded.
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("source"));

    const permanents = s.state.players[0]!.battleArea;
    expect(new Set(permanents.map(({ permanentId }) => permanentId)).size).toBe(permanents.length);
    expect(new Set(permanents.map(({ topCard }) => topCard.instanceId)).size).toBe(permanents.length);
    expect(permanents.filter(({ topCard }) => topCard.cardId.startsWith("TOKEN-"))).toHaveLength(2);
    expect(permanents.slice(1).every(({ permanentId }) => permanentId !== sourcePermanentId)).toBe(true);
    expect(permanents.slice(1).every(({ topCard }) => topCard.instanceId !== sourceInstanceId)).toBe(true);
    assertNoLoudGap(s);
  });
});
