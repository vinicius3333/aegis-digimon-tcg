import { describe, expect, it } from "vitest";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../../cards/index.js";

describe("AD1-020 Tommy, Takuya, & Zoe", () => {
  it("documents and encodes the four-Hybrid threshold for gaining 2 memory", () => {
    const compiled = registeredCompiledCards.get("AD1-020");
    expect(compiled).toBeDefined();
    for (const trigger of ["StartOfYourMainPhase", "OnPlay"]) {
      const effect = compiled!.effects.find((entry) => entry.trigger === trigger);
      const gain = effect?.actions.find((action) => action.kind === "GainMemory");
      expect(gain).toMatchObject({ amount: 2, condition: { kind: "selfDigivolutionStackCountAtLeast", count: 4 } });
      expect((gain as { condition?: { raw?: string } }).condition?.raw).toContain("4 or more");
    }
  });

  it("places two differently colored Hybrid cards under itself and draws", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "AD1-020", as: "tamer" }, { card: "AD1-002", as: "redHybrid" }, { card: "BT12-024", as: "blueHybrid" }], deck: ["BT1-010"] } }, { autoSelectCards: true, autoAcceptOptional: true });
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tamer").instanceId })).toEqual({ ok: true });
    const tamer = () => s.state.players[0]!.battleArea.find((perm) => perm.topCard.cardId === "AD1-020");
    await settle(() => (tamer()?.stack.length ?? 0) === 2);
    await settle(() => false, 60);
    expect(tamer()?.stack).toHaveLength(2);
    expect(s.state.players[0]!.hand).toHaveLength(1);
  });

});
