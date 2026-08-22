import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./LM-019.js";

describe("LM-019 Bokomon", () => {
  it("registers complete reveal and leave-prevention IR", () => {
    const compiled = runtimeCompiledCard("LM-019")!;
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects.find((effect) => effect.trigger === "AllTurns")?.actions[0]).toMatchObject({
      kind: "Replacement",
      event: "wouldLeavePlay",
      mode: "prevent",
      leaveCause: "otherThanYourEffect",
      cost: { kind: "deleteOwn", target: { isSelf: true } },
    });
  });

  it("reveals four cards and adds a Digimon with Gammamon in its text", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "LM-019", as: "bokomon" }], deck: ["AD1-007", "BT1-001", "BT1-002", "BT1-003"] },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 2;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("bokomon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "AD1-007"));
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "AD1-007")).toBe(true);
    expect(s.state.players[0]!.deck).toHaveLength(3);
  });

  it("deletes itself to prevent another Gammamon-text Digimon from leaving", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "LM-019", as: "bokomon" }, { card: "AD1-007", as: "gammamon" }] },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    const protectedId = s.perm("gammamon").permanentId;
    await s.engine.recomputeContinuousEffects();
    const fx = (s.engine as unknown as { primitives: { deletePermanent(ids: string[]): Promise<number> } }).primitives;
    await fx.deletePermanent([protectedId]);
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "LM-019"));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === protectedId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "LM-019")).toBe(true);
  });
});
