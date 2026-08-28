import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { effectsOf } from "../../engine/effects/collect.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT4-017.js";

function mainEffectKey(s: ReturnType<typeof setupEngine>): string {
  const source = (s.engine as any).cardSourceOf(s.perm("rize").topCard!);
  return effectsOf(EffectTiming.OnDeclaration, source).find((effect) => effect.effectKey.startsWith("BT4-017/"))!
    .effectKey;
}

describe("BT4-017 RizeGreymon", () => {
  it("is also treated as yellow during its controller's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT4-017", as: "rize" }],
        hand: [{ card: "BT4-048", as: "yellowEvo" }],
        deck: ["BT1-001"],
      },
    });
    s.state.memory = 4;
    await s.engine.recomputeContinuousEffects();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("rize").permanentId,
        instanceId: s.inst("yellowEvo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("rize").topCard?.cardId === "BT4-048");

    expect(s.state.memory).toBe(1);
    expect(s.perm("rize").topCard?.cardId).toBe("BT4-048");
  });

  it("Digi-Bursts 2 to play a red or yellow 4-cost Tamer for free", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT4-017", as: "rize", under: ["BT1-001", "BT4-008"] }],
          hand: [{ card: "BT1-085", as: "tamer" }],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    await s.engine.recomputeContinuousEffects();

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("rize").topCard!.instanceId,
        effectKey: mainEffectKey(s),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT1-085"));

    expect(s.perm("rize").stack).toHaveLength(1);
    expect(s.perm("rize").topCard?.cardId).toBe("BT4-017");
    expect(s.state.players[0]!.trash).toHaveLength(2);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT1-085")).toBe(true);
  });

  it("gives an opposing Digimon -2000 DP when its host attacks while you have a Tamer", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT4-018", as: "host", under: ["BT4-017"] }, { card: "BT1-085" }] },
        1: { battleArea: [{ card: "BT1-019", as: "target" }], security: ["BT1-001"] },
      },
      { autoSelectCards: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === s.perm("target").baseDP - 2000);

    expect(s.perm("target").currentDP).toBe(s.perm("target").baseDP - 2000);
  });

  it("does not reduce DP from its inherited effect when you have no Tamer", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT4-018", as: "host", under: ["BT4-017"] }] },
      1: { battleArea: [{ card: "BT1-019", as: "target" }], security: ["BT1-001"] },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0, 5000);

    expect(s.perm("target").currentDP).toBe(s.perm("target").baseDP);
  });
});
