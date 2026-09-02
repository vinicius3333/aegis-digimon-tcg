import { describe, expect, it } from "vitest";
import { compiled } from "./EX12-050.js";
import { compiledEffects, digivolutionRequirementsFor, EffectTiming, getCardDefinition } from "@aegis/shared";
import { effectsOf } from "../../engine/effects/collect.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "../index.js";

function mainEffectKey(s: ReturnType<typeof setupEngine>, alias = "source"): string {
  const source = (s.engine as unknown as { cardSourceOf(instance: unknown): unknown }).cardSourceOf(
    s.perm(alias).topCard!,
  ) as never;
  const effect = effectsOf(EffectTiming.OnDeclaration, source).find((entry) => entry.effectKey.startsWith("EX12-050/"));
  if (effect === undefined) throw new Error("EX12-050 did not surface its Main effect");
  return effect.effectKey;
}

describe("EX12-050 SymbareAngoramon", () => {
  it("offers the once-per-turn reduced-cost play/use choice", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "Main");
    expect(effect?.frequency).toBe("OncePerTurn");
    expect(effect?.actions).toMatchObject([
      {
        kind: "Modal",
        choose: 1,
        options: [
          [
            {
              kind: "PlayWithoutCost",
              payCost: true,
              reduceCostBy: 2,
              optional: true,
              target: { filter: { kind: ["Digimon", "Tamer"] } },
            },
          ],
          [
            {
              kind: "UseOptionWithoutCost",
              payCost: true,
              reduceCostBy: 2,
              allowMultiColor: true,
              optional: true,
              filter: { kind: ["Option"], playCostLte: 99 },
            },
          ],
        ],
      },
    ]);
  });

  it("retains the Angoramon/NSp evolution routes and inherited DP", () => {
    expect(compiled.digivolutionRequirement).toEqual([
      { names: ["Angoramon"], cost: 2, isAlternate: true },
      { level: 3, traits: ["NSp"], cost: 2, isAlternate: true },
    ]);
    expect(compiled.effects.find((entry) => entry.isInherited)?.actions).toMatchObject([
      { kind: "ModifyDP", amount: 1000, duration: "permanent" },
    ]);
    expect(registeredCompiledCards.get("EX12-050")).toEqual(compiled);
    expect(compiledEffects["EX12-050"]).toEqual(compiled);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("plays one matching Digimon with the reduced paid cost and shares the Once Per Turn gate", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-050", as: "source" }],
          hand: ["EX12-051", "EX12-051"],
        },
      },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("source").topCard!.instanceId,
        effectKey: mainEffectKey(s),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX12-051"));

    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.hand.filter((card) => card.cardId === "EX12-051")).toHaveLength(1);

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("source").topCard!.instanceId,
        effectKey: mainEffectKey(s),
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });
    await settle(() => false, 300);
    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.hand.filter((card) => card.cardId === "EX12-051")).toHaveLength(1);
    expect(s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard?.cardId === "EX12-051")).toHaveLength(
      1,
    );
  });

  it("uses a matching NSp Option through the same reduced-cost choice", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-050", as: "source" }],
          hand: [{ card: "EX12-073", as: "option" }],
          deck: ["EX12-051", "BT1-009", "BT1-045"],
        },
      },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true, preferOptionIndex: 1 },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("source").topCard!.instanceId,
        effectKey: mainEffectKey(s),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX12-073"));

    expect(s.state.memory).toBe(9);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "EX12-051")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX12-073")).toBe(true);
  });

  it("uses a matching multicolor dual Option with the same reduction", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX12-050", as: "source" }], hand: [{ card: "EX12-052", as: "option" }] },
      },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true, preferOptionIndex: 1 },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("source").topCard.instanceId,
        effectKey: mainEffectKey(s),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.every(({ instanceId }) => instanceId !== s.inst("option").instanceId));

    expect(s.state.memory).toBe(0);
  });

  it("Q6825 uses a non-NSp Option that mentions Angoramon only in its effect text", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX12-050", as: "source" }], hand: [{ card: "BT10-102", as: "option" }] },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true, preferOptionIndex: 1 },
    );
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("source").topCard.instanceId,
        effectKey: mainEffectKey(s),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("opponent").isSuspended);

    expect(s.state.memory).toBe(0);
    expect(observe(s.engine).hasPierce(s.perm("source"))).toBe(true);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("option").instanceId);
  });

  it("Q6826 gives two copies independent reductions instead of combining them", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX12-050", as: "first" },
            { card: "EX12-050", as: "second" },
          ],
          hand: [
            { card: "EX12-051", as: "firstTarget" },
            { card: "EX12-051", as: "secondTarget" },
          ],
        },
      },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    for (const [alias, expectedMemory] of [
      ["first", 5],
      ["second", 0],
    ] as const) {
      expect(
        s.engine.applyIntent(0, {
          type: "activateEffect",
          sourceInstanceId: s.perm(alias).topCard.instanceId,
          effectKey: mainEffectKey(s, alias),
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.memory === expectedMemory);
    }

    expect(s.state.players[0]!.battleArea.filter(({ topCard }) => topCard.cardId === "EX12-051")).toHaveLength(2);
  });

  it("Q6827 plays for full printed cost while Solarmon forbids reductions", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX12-050", as: "source" }], hand: [{ card: "EX12-051", as: "target" }] },
        1: { battleArea: ["ST12-03"] },
      },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true },
    );
    s.state.memory = 7;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("source").topCard.instanceId,
        effectKey: mainEffectKey(s),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX12-051"));
    expect(s.state.memory).toBe(0);
  });

  it("Q6828 activates but cannot play through Pomumon's effect-play lock", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX12-050", as: "source" }], hand: [{ card: "EX12-051", as: "target" }] },
        1: { battleArea: ["BT9-047"] },
      },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true },
    );
    s.state.memory = 7;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("source").topCard.instanceId,
        effectKey: mainEffectKey(s),
      }),
    ).toEqual({ ok: true });
    await settle(() => false, 100);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("target").instanceId);
    expect(s.state.memory).toBe(7);
  });

  it("keeps inherited +1000 DP on its host on both turns without affecting top or bystanders", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-009", as: "host", under: ["EX12-050"] },
          { card: "EX12-050", as: "top" },
          { card: "BT1-009", as: "bystander" },
        ],
      },
    });
    await s.ready();
    expect([s.perm("host").currentDP, s.perm("top").currentDP, s.perm("bystander").currentDP]).toEqual([
      4000, 6000, 3000,
    ]);
    s.state.turnSeat = 1;
    await s.ready();
    expect(s.perm("host").currentDP).toBe(4000);
  });

  it("digivolves through both colors and both alternate routes, rejecting a nonmatch", async () => {
    expect(digivolutionRequirementsFor("EX12-050")).toEqual(compiled.digivolutionRequirement);
    for (const [baseCardId, useAlternateCost, expectedCost] of [
      ["EX12-049", false, 3],
      ["BT10-058", false, 3],
      ["EX12-049", true, 2],
      ["EX7-015", true, 2],
    ] as const) {
      const s = setupEngine({
        0: { battleArea: [{ card: baseCardId, as: "base" }], hand: [{ card: "EX12-050", as: "target" }] },
      });
      s.state.memory = 3;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("target").instanceId,
          useAlternateCost,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.cardId === "EX12-050");
      expect(s.state.memory).toBe(3 - expectedCost);
    }

    const invalid = setupEngine({
      0: { battleArea: [{ card: "BT1-010", as: "base" }], hand: [{ card: "EX12-050", as: "target" }] },
    });
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("base").permanentId,
        instanceId: invalid.inst("target").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });

  it("maps the complete printed catalog identity", () => {
    expect(getCardDefinition("EX12-050")).toMatchObject({
      nameEn: "SymbareAngoramon",
      colors: ["Green", "Black"],
      playCost: 5,
      dp: 6000,
      level: 4,
      forms: ["Champion"],
      attributes: ["Vaccine"],
      types: ["Beastkin", "NSp"],
      evoCosts: [
        { color: "Green", level: 3, memoryCost: 3 },
        { color: "Black", level: 3, memoryCost: 3 },
      ],
    });
  });
});
