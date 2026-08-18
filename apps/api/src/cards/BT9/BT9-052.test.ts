import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT9-052.js";
import "./BT9-109.js";
describe("BT9-052 Okuwamon (X Antibody)", () => {
  it("suspends an opposing Digimon when evolving over Okuwamon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-077", as: "base" }], hand: [{ card: "BT9-052", as: "evolving" }] }, 1: { battleArea: [{ card: "BT2-047", as: "target" }] } }, { autoSelectCards: true });
    s.state.memory = 0;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("evolving").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("target").isSuspended);
    expect(s.perm("target").isSuspended).toBe(true);
  });

  it("evolves during an attack, suspends a Digimon, and redirects the attack to it", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-077", as: "attacker", under: ["BT9-109"] }],
          hand: [{ card: "BT9-052", as: "evolving" }],
          deck: ["BT1-001"],
        },
        1: {
          battleArea: [{ card: "BT1-016", as: "redirectTarget", dp: 3000 }],
          security: [{ card: "BT1-001", as: "mustStayInSecurity" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("attacker").topCard.cardId === "BT9-052" &&
        s.state.players[1]!.battleArea.length === 0,
      3000,
    );
    expect(s.state.players[1]!.security.map((card) => card.instanceId)).toContain(
      s.inst("mustStayInSecurity").instanceId,
    );
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT1-016")).toBe(true);
  });
});
