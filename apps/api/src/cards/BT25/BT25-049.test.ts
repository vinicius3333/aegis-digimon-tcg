import { digivolutionRequirementsFor, EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT25-049.js";

describe("BT25-049 Armalizamon", () => {
  it("suspends one opponent Digimon on play", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT25-049", as: "source" }] },
        1: { battleArea: [{ card: "BT25-046", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle(() => s.perm("target").isSuspended);
    expect(s.perm("target").isSuspended).toBe(true);
  });

  it("suspends one opponent Digimon when digivolving", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT25-046", as: "source" }], hand: [{ card: "BT25-049", as: "evolver" }] },
        1: { battleArea: [{ card: "BT25-046", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("evolver").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard?.cardId === "BT25-049" && s.perm("target").isSuspended);
    expect(s.perm("target").isSuspended).toBe(true);
  });

  it("binds the Glowing Dawn option reduction to its once-per-turn cost", () => {
    expect(digivolutionRequirementsFor("BT25-049")).toContainEqual({
      level: 3,
      traits: ["Glowing Dawn"],
      cost: 2,
      isAlternate: true,
    });
    const effect = runtimeCompiledCard("BT25-049")?.effects.find((entry) => entry.trigger === "YourTurn");
    expect(effect).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldBePlayed",
          amount: 3,
          sourceFilter: { kind: ["Option"], nameOrTrait: [{ tokens: ["Glowing Dawn"], match: "trait" }] },
          cost: { kind: "trashBottomFaceDownUnderTamer" },
        },
      ],
    });
  });
});
