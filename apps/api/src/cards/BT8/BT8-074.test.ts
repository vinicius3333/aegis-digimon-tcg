import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT8-074.js";
import "./BT8-079.js";

describe("BT8-074 Soulmon", () => {
  it("gains 1 memory when an effect trashes cards from your deck", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT8-076", as: "base", under: ["BT8-074"] }],
        hand: [{ card: "BT8-079", as: "evolving" }],
        deck: ["BT8-033", "BT8-034"],
      },
    });
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.length === 2);
    expect(s.state.memory).toBe(3);
  });

  it("digivolves from a purple level-3 Digimon for 2 memory", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT8-073", as: "base" }], hand: [{ card: "BT8-074", as: "evolving" }] },
    });
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT8-074");

    expect(s.perm("base").topCard.cardId).toBe("BT8-074");
    expect(s.state.memory).toBe(1);
  });
});
