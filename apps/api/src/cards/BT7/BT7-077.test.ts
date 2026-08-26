import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT7-077.js";

describe("BT7-077 Nidhoggmon", () => {
  it("trashes a hand card to delete an opposing level-4-or-lower Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-012", as: "base" }],
          hand: [
            { card: "BT7-077", as: "evolving" },
            { card: "BT1-009", as: "cost" },
          ],
        },
        1: { battleArea: [{ card: "BT1-014", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const costId = s.inst("cost").instanceId;
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === costId)).toBe(true);
  });

  it("does not delete a target when the optional hand-trash cost cannot be paid", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT10-012", as: "base" }], hand: [{ card: "BT7-077", as: "evolving" }] },
        1: { battleArea: [{ card: "BT1-014", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await s.ready();
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });
});
