import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT7-011.js";

describe("BT7-011 BurningGreymon", () => {
  it("deletes a 4000-DP-or-less Digimon when it has a Hybrid source", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT7-008", as: "base" }], hand: [{ card: "BT7-011", as: "evolving" }] },
        1: { battleArea: [{ card: "BT1-010", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT7-011"));
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT1-010")).toBe(true);
  });
});
