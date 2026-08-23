import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT25-054.js";

describe("BT25-054 GreatGrizzlymon", () => {
  it("digivolves into Callismon after winning a battle", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT25-054", as: "source" }], hand: [{ card: "BT25-058", as: "evolver" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target", suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("source").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard?.cardId === "BT25-058");
    expect(s.perm("source").topCard?.cardId).toBe("BT25-058");
  });

  it("keeps Blocker, both entry grants, and the inherited battle-deletion watcher", () => {
    const card = runtimeCompiledCard("BT25-054");
    expect(
      card?.effects.filter((effect) => effect.trigger === "OnPlay" || effect.trigger === "WhenDigivolving"),
    ).toHaveLength(2);
    expect(card?.effects.filter((effect) => effect.isInherited)).toMatchObject([
      { trigger: "AllTurns", frequency: "OncePerTurn" },
    ]);
    expect(
      card?.effects.some((effect) =>
        effect.actions?.some(
          (action) => action.kind === "GrantStatic" && action.tokens?.includes("GRANTEFFECT23TOKEN"),
        ),
      ),
    ).toBe(true);
  });
});
