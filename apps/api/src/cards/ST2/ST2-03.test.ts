import { getCardDefinition, getCompiledCard } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST2-03.js";

describe("ST2-03 Gabumon", () => {
  it("matches the inherited bottom-source removal contract", () => {
    const definition = getCardDefinition("ST2-03")!;
    const compiled = getCompiledCard("ST2-03")!;

    expect(definition.inheritedEffectText).toContain("level of 5 or less");
    expect(compiled.effects).toEqual([
      {
        trigger: "WhenAttacking",
        actions: [{
          kind: "TrashDigivolution",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              levelComparison: { op: "lte", value: 5 },
            },
            count: 1,
          },
          amount: 1,
          fromTop: false,
        }],
        isInherited: true,
      },
    ]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("trashes the bottom source of an opposing level 5 or lower Digimon when attacking", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST2-04", as: "attacker", under: ["ST2-03"] }] },
      1: { battleArea: [{ card: "ST1-08", as: "target", under: [{ card: "ST1-03", as: "bottom" }] }], security: ["BT1-001"] },
    }, { autoSelectCards: true });
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("attacker").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("bottom").instanceId));
    expect(s.perm("target").stack).toHaveLength(0);
  });

  it("does not target an opposing level 6 Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST2-04", as: "attacker", under: ["ST2-03"] }] },
      1: { battleArea: [{ card: "ST2-10", as: "target", under: [{ card: "ST1-03", as: "bottom" }] }], security: ["BT1-001"] },
    }, { autoSelectCards: true });
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("attacker").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.perm("target").stack.map((card) => card.instanceId)).toEqual([
      s.inst("bottom").instanceId,
    ]);
    expect(s.state.players[1]!.trash).toHaveLength(0);
  });
});
