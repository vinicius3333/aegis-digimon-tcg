import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST1-09.js";
import "./ST1-06.js";

describe("ST1-09 MetalGreymon", () => {
  it("gains 3 memory when its host is blocked", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST1-10", as: "attacker", under: ["ST1-09"] }] },
        1: {
          battleArea: [{ card: "ST1-06", as: "blocker" }],
          security: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(
      s.engine.applyIntent(1, {
        type: "declareBlock",
        blockerPermanentId: s.perm("blocker").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 3);
    expect(s.state.memory).toBe(3);
  });

  it("does not gain memory when attacking an opponent's Digimon directly without a block (Q604)", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST1-10", as: "attacker", under: ["ST1-09"] }] },
      1: { battleArea: [{ card: "ST1-06", as: "defender", suspended: true }] },
    });
    s.state.memory = 0;
    const defenderId = s.perm("defender").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: defenderId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === defenderId));

    expect(s.state.memory).toBe(0);
  });
});
