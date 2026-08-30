import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT8-044.js";

describe("BT8-044 Azulongmon", () => {
  it("may trash the top of its security to gain 2 memory when attacking", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT8-044", as: "azulongmon" }], security: ["BT8-034", "BT8-035"] },
        1: { security: ["BT8-034"] },
      },
      { autoAcceptOptional: true },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("azulongmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 5);
    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT8-034")).toBe(true);
  });

  it("may unsuspend the other Digimon that just digivolved", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT8-044", as: "azulongmon" },
            { card: "BT1-051", as: "other", suspended: true },
          ],
          hand: [{ card: "BT8-042", as: "evolving" }],
          deck: ["BT8-034"],
          security: ["BT8-035"],
        },
      },
      { autoAcceptOptional: true },
    );
    s.state.memory = 4;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("other").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.perm("other").isSuspended);

    expect(s.perm("other").isSuspended).toBe(false);
    expect(s.perm("azulongmon").isSuspended).toBe(false);
  });

  it("digivolves from a yellow level-5 Digimon for 3 memory", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-057", as: "base" }], hand: [{ card: "BT8-044", as: "evolving" }] },
    });
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT8-044");

    expect(s.perm("base").topCard.cardId).toBe("BT8-044");
    expect(s.state.memory).toBe(1);
  });
});
