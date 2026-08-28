import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT8/BT8-084.js";
import "./P-076.js";

describe("P-076 Deltamon", () => {
  it("reduces a two-color digivolution by 2 and deletes once for each host color", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "P-076", as: "deltamon" }],
          hand: [{ card: "BT8-067", as: "metalGreymon" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "first", dp: 3000 },
            { card: "BT1-014", as: "second", dp: 3000 },
          ],
          security: ["BT1-001"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();
    await s.engine.recomputeContinuousEffects();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("deltamon").permanentId,
        instanceId: s.inst("metalGreymon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("deltamon").topCard.cardId === "BT8-067" &&
        s.state.players[1]!.battleArea.length === 0 &&
        s.state.pendingDecision === undefined,
      5000,
    );
    expect(s.state.memory).toBe(2);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("deltamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0, 5000);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("reduces a mono-color Composite evolution by 2", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "P-076", as: "deltamon" }],
          hand: [{ card: "BT8-084", as: "kimeramon" }],
          deck: ["BT1-001"],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("deltamon").permanentId,
        instanceId: s.inst("kimeramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("deltamon").topCard.cardId === "BT8-084");

    expect(s.state.memory).toBe(0);
  });
});
