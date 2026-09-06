import { EffectDuration, EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { effectsOf } from "../../engine/effects/collect.js";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine, type EngineSetup } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT23-008.js";

function mainEffectKey(s: EngineSetup): string {
  const source = (s.engine as any).cardSourceOf(s.inst("greymon"));
  return effectsOf(EffectTiming.OnDeclaration, source).find((effect) => effect.effectKey.startsWith("BT23-008/"))!
    .effectKey;
}

describe("BT23-008 Greymon", () => {
  it("matches every catalog field and carries every printed clause in IR", () => {
    expect(getCardDefinition("BT23-008")).toMatchObject({
      cardId: "BT23-008",
      nameEn: "Greymon",
      colors: ["Red"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 6,
      dp: 5000,
      evoCosts: [
        { color: "Red", level: 3, memoryCost: 2 },
        { color: "Blue", level: 3, memoryCost: 2 },
      ],
      forms: ["Champion"],
      attributes: ["Vaccine"],
      types: ["Dinosaur", "CS"],
      effectText:
        "[Digivolve] Lv.3 w/[Agumon]\u00a0in name or w/[CS]\u00a0trait: Cost 2 \n\n＜Raid＞ \n[Main] [Once Per Turn] By placing this Digimon's top stacked card as its bottom digivolution card, you may play 1 [Gabumon] or [Nokia Shiramine] from your hand with the play cost reduced by 2.",
      inheritedEffectText: "[Your Turn] This Digimon gets +2000 DP.",
    });
    expect(compiled).toMatchObject({
      effects: [
        { trigger: "Static", keywords: [{ keyword: "Raid", raw: "＜Raid＞" }] },
        {
          trigger: "Main",
          frequency: "OncePerTurn",
          actions: [
            {
              kind: "PlayWithoutCost",
              target: {
                filter: {
                  controller: "mine",
                  nameOrTrait: [{ tokens: ["Gabumon", "Nokia Shiramine"], match: "nameExact" }],
                },
                count: 1,
                upTo: true,
              },
              from: ["hand"],
              payCost: true,
              reduceCostBy: 2,
              cost: {
                kind: "place",
                target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              },
              optional: false,
              abortOnDecline: true,
            },
          ],
        },
        {
          trigger: "YourTurn",
          isInherited: true,
          actions: [{ kind: "ModifyDP", amount: 2000, duration: "permanent" }],
        },
      ],
      digivolutionRequirement: [
        { level: 3, names: ["Agumon"], cost: 2, isAlternate: true },
        { level: 3, traits: ["CS"], cost: 2, isAlternate: true },
      ],
      coverage: "full",
      residual: [],
    });
  });

  it("pays the restack cost, then plays Gabumon for exactly 2 less, per Q5216", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-008", as: "greymon", under: ["BT23-001", "BT23-007"] }],
          hand: [{ card: "BT1-029", as: "gabumon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    const greymonId = s.inst("greymon").instanceId;
    const promotedId = s.perm("greymon").stack.at(-1)!.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: greymonId,
        effectKey: mainEffectKey(s),
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("gabumon").instanceId),
    );

    expect(s.state.memory).toBe(4);
    expect(s.perm("greymon").topCard.instanceId).toBe(promotedId);
    expect(s.perm("greymon").stack[0]!.instanceId).toBe(greymonId);
  });

  it("cannot declare the Main effect without a digivolution card, per Q5217", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT23-008", as: "greymon" }], hand: [{ card: "BT1-029", as: "gabumon" }] },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("greymon").instanceId,
        effectKey: mainEffectKey(s),
      }),
    ).toMatchObject({ ok: false });
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("gabumon").instanceId);
    expect(s.state.memory).toBe(5);
  });

  it("pays the cost with only a Digi-Egg underneath, then rule-checks the exposed egg, per Q5218", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-008", as: "greymon", under: [{ card: "BT23-001", as: "egg" }] }],
          hand: [{ card: "BT1-029", as: "gabumon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    const originalPermanentId = s.perm("greymon").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("greymon").instanceId,
        effectKey: mainEffectKey(s),
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("gabumon").instanceId),
    );
    await settle(() => s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("egg").instanceId));

    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === originalPermanentId)).toBe(false);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("greymon").instanceId, s.inst("egg").instanceId]),
    );
    expect(s.state.memory).toBe(4);
  });

  it("can pay with a 1000 DP source and rule-deletes it when its total DP reaches 0, per Q5219", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-008", as: "greymon", under: [{ card: "BT23-007", as: "muscle" }] }],
          hand: [{ card: "BT1-029", as: "gabumon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    const originalPermanentId = s.perm("greymon").permanentId;
    // Q5219 proves a pending DP reduction does not make the restack cost illegal. This
    // Greymon then contributes its printed inherited +2000, so -3000 is the exact aggregate
    // reduction needed for the exposed 1000-DP Musclemon to reach the ruling's 0-DP boundary.
    await advance(s.engine).verb.modifyDP(originalPermanentId, -3000, EffectDuration.UntilEachTurnEnd);

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("greymon").instanceId,
        effectKey: mainEffectKey(s),
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("gabumon").instanceId),
    );
    await settle(() => s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("muscle").instanceId));
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("greymon").instanceId, s.inst("muscle").instanceId]),
    );
    expect(s.state.memory).toBe(4);
  });

  it("still pays and restacks when the optional reduced play is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-008", as: "greymon", under: ["BT23-001", "BT23-007"] }],
          hand: [{ card: "BT22-084", as: "nokia" }],
        },
      },
      { autoSelectCards: false },
    );
    s.state.memory = 5;
    const before = [s.perm("greymon").topCard.instanceId, ...s.perm("greymon").stack.map((card) => card.instanceId)];

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("greymon").instanceId,
        effectKey: mainEffectKey(s),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.decisions.some(({ req }) => req.kind === "selectCards"));
    const playPrompt = s.decisions.find(({ req }) => req.kind === "selectCards")!.req;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: playPrompt.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }),
    ).toEqual({ ok: true });
    await settle();

    expect([
      s.perm("greymon").topCard.instanceId,
      ...s.perm("greymon").stack.map((card) => card.instanceId),
    ]).not.toEqual(before);
    expect(s.perm("greymon").stack[0]!.instanceId).toBe(s.inst("greymon").instanceId);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("nokia").instanceId);
    expect(s.state.memory).toBe(5);
  });

  it("plays exact Gabumon while retaining a Gabumon X Antibody near-name variant", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-008", as: "greymon", under: ["BT23-001"] }],
          hand: [
            { card: "BT1-029", as: "gabumon" },
            { card: "BT9-020", as: "xGabumon" },
          ],
        },
      },
      { autoSelectCards: false },
    );
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("greymon").instanceId,
        effectKey: mainEffectKey(s),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.decisions.some(({ req }) => req.kind === "selectCards"));
    const playDecision = s.decisions.find(({ req }) => req.kind === "selectCards")!;
    expect(playDecision?.req.options?.candidateInstanceIds).toContain(s.inst("gabumon").instanceId);
    expect(playDecision?.req.options?.candidateInstanceIds).not.toContain(s.inst("xGabumon").instanceId);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: playDecision.req.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("gabumon").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("gabumon").instanceId),
    );
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("gabumon").instanceId)).toBe(
      true,
    );
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("xGabumon").instanceId);
  });

  it("supports both alternate level-3 boundaries and rejects an off-color nonmatch", async () => {
    for (const base of ["BT11-046", "BT22-017"] as const) {
      const s = setupEngine({
        0: { battleArea: [{ card: base, as: "base" }], hand: [{ card: "BT23-008", as: "greymon" }], deck: ["BT1-009"] },
      });
      s.state.memory = 3;
      await s.ready();
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("greymon").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.instanceId === s.inst("greymon").instanceId);
      expect(s.state.memory).toBe(1);
    }

    const invalid = setupEngine({
      0: { battleArea: [{ card: "BT1-064", as: "base" }], hand: [{ card: "BT23-008", as: "greymon" }] },
    });
    await invalid.ready();
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("base").permanentId,
        instanceId: invalid.inst("greymon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("uses Raid to redirect a player attack to an unsuspended opposing Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT23-008", as: "greymon" }] },
        1: { battleArea: [{ card: "BT1-009", as: "raidTarget" }], security: 1 },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const raidTargetId = s.perm("raidTarget").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("greymon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === raidTargetId));

    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === raidTargetId)).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("gives the evolved host +2000 DP only during its controller's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT23-010", under: ["BT23-008"], as: "host" }] } });

    s.state.turnSeat = 0;
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(getCardDefinition("BT23-010")!.dp! + 2000);

    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(getCardDefinition("BT23-010")!.dp);
  });
});
