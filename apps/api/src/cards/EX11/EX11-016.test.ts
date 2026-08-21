import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./EX11-016.js";

describe("EX11-016 PolarBearmon", () => {
  it("trashes two opposing digivolution cards on play", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX11-016", as: "polar" }] },
        1: { battleArea: [{ card: "EX11-015", as: "victim", dp: 6000, under: ["EX11-014", "BT1-001"] }] },
      },
      { autoAcceptOptional: false, autoSelectCards: true },
    );
    s.state.memory = 7;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("polar").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.length >= 2, 600);
    expect(s.state.players[1]!.trash.length).toBeGreaterThanOrEqual(2);
  });

  it("encodes the Ice-Snow evolution, Iceclad, source trashing, and no-source security target", () => {
    const compiled = runtimeCompiledCard("EX11-016")!;
    expect(compiled.digivolutionRequirement).toEqual([{ level: 4, traits: ["Ice-Snow"], cost: 3, isAlternate: true }]);
    expect(compiled.effects[0]).toMatchObject({ trigger: "Static", keywords: [{ keyword: "IceClad", raw: "＜Ice Clad＞" }] });
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          { kind: "TrashDigivolution", amount: 2 },
          { kind: "SecurityManipulation", op: "addTopOrBottom", optional: true, source: { filter: { digivolutionCards: "none" } } },
        ],
      });
    }
    expect(compiled.effects).toContainEqual(expect.objectContaining({
      trigger: "YourTurn",
      isInherited: true,
      actions: expect.arrayContaining([
        expect.objectContaining({ effect: expect.objectContaining({ kind: "keyword", keyword: expect.objectContaining({ keyword: "Piercing" }) }) }),
        expect.objectContaining({ effect: expect.objectContaining({ kind: "keyword", keyword: expect.objectContaining({ keyword: "SecurityAttack", amount: 1 }) }) }),
      ]),
    }));
  });
});
