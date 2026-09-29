import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { effectsOf } from "../../engine/effects/collect.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { internalsOf } from "../../engine/testkit/internals.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT3/BT3-041.js";
import "./BT4-008.js";
import "./BT4-017.js";
import "./BT4-018.js";
import "./BT4-048.js";

function mainEffectKey(s: ReturnType<typeof setupEngine>): string {
  const source = internalsOf(s.engine).cardSourceOf(s.perm("rize").topCard!);
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
    const agumonId = s.perm("rize").stack.find((card) => card.cardId === "BT4-008")!.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("rize").topCard!.instanceId,
        effectKey: mainEffectKey(s),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT1-085"));

    expect(s.perm("rize").stack).toHaveLength(0);
    expect(s.perm("rize").topCard?.cardId).toBe("BT4-017");
    expect(s.state.players[0]!.trash).toHaveLength(1);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === agumonId)).toBe(true);
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

async function cherubimonRecoversFromTrash(trashCardId: string): Promise<boolean> {
  const s = setupEngine(
    {
      0: {
        battleArea: [
          { card: "BT3-041", as: "cherubimon" },
          { card: "BT4-017", as: "rize" },
        ],
        security: ["BT1-011", "BT1-012", "BT1-013"],
        trash: [{ card: trashCardId, as: "candidate" }],
      },
      1: { security: ["BT1-011"] },
    },
    { autoSelectCards: true },
  );
  await s.engine.recomputeContinuousEffects();
  expect(observe(s.engine).effectiveColors(s.perm("rize"))).toContain("Yellow");
  const candidateId = s.inst("candidate").instanceId;

  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("cherubimon").permanentId,
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
  await settle(() => s.state.players[1]!.security.length === 0, 5000);

  return s.state.players[0]!.security.some((card) => card.instanceId === candidateId);
}

async function digivolveBreedingRizeGreymonInto(cardId: string) {
  const s = setupEngine({
    0: {
      breeding: { card: "BT4-017", as: "rize" },
      hand: [{ card: cardId, as: "evolution" }],
      deck: ["BT1-001"],
    },
  });
  s.state.memory = 4;
  await s.engine.recomputeContinuousEffects();
  const result = s.engine.applyIntent(0, {
    type: "digivolve",
    permanentId: s.perm("rize").permanentId,
    instanceId: s.inst("evolution").instanceId,
  });
  await settle();
  return { result, topCardId: s.state.players[0]!.breeding?.topCard?.cardId };
}

describe("BT4-017 RizeGreymon — KB Q&A rulings", () => {
  it("is only red outside the battle area, even on your turn while another copy is in play (Q1173)", async () => {
    expect(await cherubimonRecoversFromTrash("BT4-017")).toBe(false);
    expect(await cherubimonRecoversFromTrash("BT4-048")).toBe(true);
  });

  it("cannot be digivolved in the breeding area into a Digimon that requires a yellow source (Q1174)", async () => {
    const yellowOnly = await digivolveBreedingRizeGreymonInto("BT4-048");
    expect(yellowOnly.result.ok).toBe(false);
    expect(yellowOnly.topCardId).toBe("BT4-017");

    const redCost = await digivolveBreedingRizeGreymonInto("BT4-018");
    expect(redCost.result).toEqual({ ok: true });
    expect(redCost.topCardId).toBe("BT4-018");
  });

  it("Digi-Burst offers only red or yellow Tamers with play cost 4 or less from hand (Q1175)", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT4-017", as: "rize", under: ["BT1-001", "BT4-008"] }],
          hand: [
            { card: "BT1-086", as: "blueCostFour" },
            { card: "BT13-095", as: "redYellowCostFive" },
            { card: "BT1-085", as: "redCostFour" },
            { card: "BT1-087", as: "yellowCostFour" },
          ],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true, preferInstanceIds },
    );
    const blueCostFour = s.inst("blueCostFour").instanceId;
    const redYellowCostFive = s.inst("redYellowCostFive").instanceId;
    const redCostFour = s.inst("redCostFour").instanceId;
    const yellowCostFour = s.inst("yellowCostFour").instanceId;
    preferInstanceIds.push(blueCostFour, redYellowCostFive);
    await s.engine.recomputeContinuousEffects();

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("rize").topCard!.instanceId,
        effectKey: mainEffectKey(s),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 2);

    const tamerChoice = s.decisions.find(
      ({ req }) => req.kind === "selectCards" && req.options?.candidateInstanceIds?.includes(yellowCostFour),
    );
    const offeredTamers = tamerChoice?.req.options?.candidateInstanceIds ?? [];
    expect(offeredTamers).toHaveLength(2);
    expect(offeredTamers).toEqual(expect.arrayContaining([redCostFour, yellowCostFour]));
    const handIds = s.state.players[0]!.hand.map((card) => card.instanceId);
    expect(handIds).toContain(blueCostFour);
    expect(handIds).toContain(redYellowCostFive);
    const playedTamers = s.state.players[0]!.battleArea.filter((permanent) => permanent !== s.perm("rize"));
    expect(playedTamers.map((permanent) => permanent.topCard?.cardId)).toEqual([expect.stringMatching(/^BT1-08[57]$/)]);
  });
});
