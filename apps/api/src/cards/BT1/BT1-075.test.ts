import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT1-075.js";

describe("BT1-075 Digitamamon", () => {
  it("evolves from a green level 4 and preserves the source stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-074", as: "base" }],
        hand: [{ card: "BT1-075", as: "digitamamon" }],
        deck: ["BT1-001"],
      },
    });
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("digitamamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("digitamamon").instanceId);

    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT1-074"]);
    expect(s.perm("base")).toMatchObject({ baseDP: 7000, currentDP: 7000 });
    expect(s.state.memory).toBe(0);
  });

  it("gains 3 memory when attacking", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-075", as: "attacker" }] }, 1: { security: ["BT1-010"] } });
    s.state.memory = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 3);
    expect(s.state.memory).toBe(3);
  });

  it("pays the delayed 3 after Digitamamon is deleted, in addition to passing at 3 memory", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-075", as: "attacker" }] }, 1: { security: ["BT1-062"] } });
    const attackerId = s.perm("attacker").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.memory === 3 &&
        !s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === attackerId),
    );

    await advance(s.engine).runTurn(0);

    expect(s.state.memory).toBe(-6);
  });
});
