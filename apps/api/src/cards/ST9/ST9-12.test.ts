import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";

describe("ST9-12 JewelBeemon", () => {
  it("digivolves from a green level 4 with the catalog cost and no effect", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "ST9-10", as: "base" }],
        hand: [{ card: "ST9-12", as: "jewel" }],
      },
    });
    s.state.memory = 2;

    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("jewel").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "ST9-12");

    expect(s.state.memory).toBe(0);
    expect(s.perm("base")).toMatchObject({ baseDP: 7000, currentDP: 7000, topCard: { cardId: "ST9-12" } });
  });
});
