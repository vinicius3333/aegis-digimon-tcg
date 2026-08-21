import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./EX11-018.js";

describe("EX11-018 Ryugumon", () => {
  it("places an Aqua/Sea Animal card under itself and unsuspends one Digimon", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "EX11-018", as: "ryugumon" }, "EX11-018"], battleArea: [{ card: "EX11-018", as: "ally", suspended: true }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 11;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ryugumon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "EX11-018" && perm.stack.length === 1), 600);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "EX11-018" && perm.stack.length === 1)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "EX11-018" && !perm.isSuspended)).toBe(true);
  });

  it("triggers the bottom-deck return only when effects add cards under this Digimon", () => {
    const compiled = runtimeCompiledCard("EX11-018")!;
    for (const trigger of ["OnPlay", "WhenDigivolving", "WhenAttacking"]) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        frequency: "OncePerTurn",
        sharedUseKey: "ir-shared-0",
        actions: [{ kind: "Unsuspend", cost: { kind: "place", destination: "digivolutionStack", position: "bottom", host: "self" } }],
      });
    }
    expect(compiled.effects).toContainEqual(expect.objectContaining({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [{
        kind: "SubTrigger",
        event: "onAddDigivolutionCards",
        sourceFilter: { isSelfRef: true },
        actions: [{ kind: "Return", to: "deckBottom", target: expect.objectContaining({ filter: expect.objectContaining({ digivolutionCardsCompareToSource: "lte" }) }) }],
      }],
    }));
  });
});
