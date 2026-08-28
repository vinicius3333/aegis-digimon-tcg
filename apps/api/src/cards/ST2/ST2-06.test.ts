import { getCardDefinition, getCompiledCard } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST2-06.js";

describe("ST2-06 Garurumon", () => {
  it("matches the inherited bottom-source removal contract", () => {
    const definition = getCardDefinition("ST2-06")!;
    const compiled = getCompiledCard("ST2-06")!;

    expect(definition.inheritedEffectText).toContain("bottom of 1 of your opponent's Digimon");
    expect(compiled.effects).toEqual([
      {
        trigger: "WhenAttacking",
        actions: [
          {
            kind: "TrashDigivolution",
            target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
            fromTop: false,
            amount: 1,
          },
        ],
        isInherited: true,
      },
    ]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("trashes the bottom source of any opposing Digimon when attacking", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST2-08", as: "attacker", under: ["ST2-06"] }] },
        1: {
          battleArea: [
            {
              card: "ST1-10",
              as: "target",
              under: [
                { card: "ST1-03", as: "bottom" },
                { card: "ST1-07", as: "top" },
              ],
            },
          ],
          security: ["BT1-001"],
        },
      },
      { autoSelectCards: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("bottom").instanceId));
    expect(s.perm("target").stack.map((card) => card.instanceId)).toEqual([s.inst("top").instanceId]);
  });

  it("does nothing when the opponent has no digivolution card to trash", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST2-08", as: "attacker", under: ["ST2-06"] }] },
        1: { battleArea: [{ card: "ST1-03", as: "sourceLess" }], security: ["BT1-001"] },
      },
      { autoSelectCards: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("sourceLess").instanceId)).toBe(false);
    expect(s.perm("sourceLess").stack).toHaveLength(0);
  });
});
