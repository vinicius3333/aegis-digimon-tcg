import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { effectsOf } from "../../engine/effects/collect.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import "./BT4-068.js";
import "./BT4-077.js";

const activateHostDigiBurst = (s: EngineSetup) => {
  const source = (s.engine as any).cardSourceOf(s.perm("host").topCard!);
  const effectKey = effectsOf(EffectTiming.OnDeclaration, source).find((effect) =>
    effect.effectKey.startsWith("BT4-068/"),
  )!.effectKey;
  return s.engine.applyIntent(0, {
    type: "activateEffect",
    sourceInstanceId: s.perm("host").topCard!.instanceId,
    effectKey,
  });
};

describe("BT4-077 Ghostmon", () => {
  it("returns to hand after being trashed for its host's Digi-Burst", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT4-068", as: "host", under: ["BT4-077", "BT1-009"] }] },
        1: { battleArea: [{ card: "BT4-066", as: "target", under: ["BT4-063"] }] },
      },
      { autoSelectCards: true },
    );
    await s.engine.recomputeContinuousEffects();
    expect(activateHostDigiBurst(s)).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT4-077"));

    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT4-077")).toBe(true);
  });
});

const cardIdsIn = (s: EngineSetup, zone: "hand" | "trash"): string[] =>
  s.state.players[0]![zone].map((card) => card.cardId);

describe("BT4-077 Ghostmon — KB Q&A rulings", () => {
  it.fails("returns to hand only after the Digi-Burst effect has resolved (Q1228)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT4-068", as: "host", under: ["BT4-077", "BT1-009"] }] },
        1: {
          battleArea: [
            { card: "BT4-066", as: "first", under: ["BT4-063"] },
            { card: "BT4-066", as: "second", under: ["BT4-063"] },
          ],
        },
      },
      { autoSelectCards: false },
    );
    await s.engine.recomputeContinuousEffects();
    expect(activateHostDigiBurst(s)).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");

    expect(s.perm("host").stack).toHaveLength(0);
    expect(cardIdsIn(s, "trash")).toContain("BT4-077");
    expect(cardIdsIn(s, "hand")).not.toContain("BT4-077");

    const targetChoice = s.decisions.at(-1)!;
    expect(targetChoice).toMatchObject({ seat: 0, req: { kind: "chooseTargets" } });
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: targetChoice.req.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("first").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => cardIdsIn(s, "hand").includes("BT4-077"));

    expect(s.perm("first").topCard!.cardId).toBe("BT4-063");
    expect(cardIdsIn(s, "hand")).toEqual(["BT4-077"]);
    expect(cardIdsIn(s, "trash")).toEqual(["BT1-009"]);
  });
});
