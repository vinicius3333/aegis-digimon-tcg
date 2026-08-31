import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT1-058.js";

describe("BT1-058 Chirinmon", () => {
  it("gains 3 memory when attacking", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-058", as: "attacker" }] },
      1: { security: ["BT1-010"] },
    });
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

  it("pays the delayed 3 after Chirinmon is deleted, in addition to passing at 3 memory (Q917/Q918)", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-058", as: "attacker" }] },
      1: { security: ["BT1-062"] },
    });
    const attackerId = s.perm("attacker").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attackerId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 3 && s.state.players[0]!.battleArea.length === 0);

    await advance(s.engine).runTurn(0);

    expect(s.state.memory).toBe(-6);
  });

  it("gains memory when the evolved Chirinmon attacks", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-056", as: "base" }],
        hand: [{ card: "BT1-058", as: "chirinmon" }],
        deck: [{ card: "BT1-010", as: "evolutionDraw" }],
      },
      1: { security: ["BT1-010"] },
    });
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("chirinmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("chirinmon").instanceId);

    expect(s.state.memory).toBe(0);
    expect(s.perm("base").stack.map((card) => card.cardId)).toContain("BT1-056");
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 3);

    expect(s.state.memory).toBe(3);
  });
});
