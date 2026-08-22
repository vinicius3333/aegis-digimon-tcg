import { describe, expect, it } from "vitest";
import { EffectTiming, dnaDigivolutionRequirementsFor } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "./EX12-044.js";

describe("EX12-044 Angewomon", () => {
  it("deals -4000 DP on play and restores all four DNA routes", async () => {
    const compiled = registeredCompiledCards.get("EX12-044")!;
    expect(dnaDigivolutionRequirementsFor("EX12-044")).toEqual([
      {
        cost: 0,
        materials: [
          { color: "Yellow", level: 4 },
          { color: "Green", level: 4 },
        ],
      },
      {
        cost: 0,
        materials: [
          { color: "Yellow", level: 4 },
          { color: "Black", level: 4 },
        ],
      },
      {
        cost: 0,
        materials: [
          { color: "Blue", level: 4 },
          { color: "Green", level: 4 },
        ],
      },
      {
        cost: 0,
        materials: [
          { color: "Blue", level: 4 },
          { color: "Black", level: 4 },
        ],
      },
    ]);
    expect(compiled.effects.find((effect) => effect.trigger === "OnPlay")).toMatchObject({
      actions: [{ kind: "ModifyDP", amount: -4000, duration: "forTheTurn" }],
    });

    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX12-044", as: "source" }] },
        1: { battleArea: [{ card: "BT1-011", as: "opponent", dp: 8000 }] },
      },
      { autoSelectCards: true },
    );
    await s.engine.recomputeContinuousEffects();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle(() => false, 60);
    expect(s.perm("opponent").currentDP).toBe(4000);
  });

  it("digivolves for two less when the stack has two same-level cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-044", as: "source", under: ["BT1-051", "BT1-052"] }],
          hand: [{ card: "BT1-063", as: "target" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("source").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard?.cardId === "BT1-063", 120);

    expect(s.perm("source").topCard?.cardId).toBe("BT1-063");
    expect(s.state.memory).toBe(0);
  });

  it("does not offer the attack digivolution without two same-level cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-044", as: "source", under: ["BT1-009", "BT1-051"] }],
          hand: [{ card: "BT1-063", as: "target" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("source").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => false, 100);

    expect(s.perm("source").topCard?.cardId).toBe("EX12-044");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("target").instanceId)).toBe(true);
  });

  it("keeps Decode inherited with the printed filter", () => {
    expect(registeredCompiledCards.get("EX12-044")!.effects.find((effect) => effect.isInherited)).toMatchObject({
      keywords: [{ keyword: "Decode", raw: "＜Decode (Lv.4 or lower w/[Holy Beast]/[NSp]/[VB] trait)＞" }],
    });
  });
});
