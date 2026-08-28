import { describe, expect, it } from "vitest";
import {
  assemblyRequirementFor,
  compiledEffects,
  dnaDigivolutionRequirementsFor,
  EffectTiming,
  getCardDefinition,
} from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import { compiled } from "./EX12-060.js";

const CARD_ID = "EX12-060";

describe("EX12-060 Chaosdramon", () => {
  it("maps the printed keywords, DNA routes, Assembly recipe, and shared timing", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(dnaDigivolutionRequirementsFor(CARD_ID)).toEqual([
      {
        cost: 0,
        materials: [
          { color: "Red", level: 6 },
          { color: "Purple", level: 6 },
        ],
      },
      {
        cost: 0,
        materials: [
          { color: "Red", level: 6 },
          { color: "Yellow", level: 6 },
        ],
      },
      {
        cost: 0,
        materials: [
          { color: "Black", level: 6 },
          { color: "Purple", level: 6 },
        ],
      },
      {
        cost: 0,
        materials: [
          { color: "Black", level: 6 },
          { color: "Yellow", level: 6 },
        ],
      },
    ]);
    expect(assemblyRequirementFor(CARD_ID)).toEqual([
      {
        reduceCost: 8,
        materials: [{ count: 6, traits: ["Machine", "Cyborg", "ME"], levelMax: 6, differentNames: true }],
      },
    ]);
    expect(compiled.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ trigger: "Static", keywords: [{ keyword: "Piercing", raw: "＜Piercing＞" }] }),
        expect.objectContaining({
          trigger: "Static",
          keywords: [{ keyword: "SecurityAttack", amount: 1, raw: "＜Security Attack +1＞" }],
        }),
        expect.objectContaining({
          trigger: "Static",
          keywords: [{ keyword: "Fragment", amount: 2, raw: "＜Fragment (2)＞" }],
        }),
        expect.objectContaining({ trigger: "Static", keywords: [{ keyword: "Engage", raw: "＜Engage＞" }] }),
        expect.objectContaining({
          trigger: "EndOfYourTurn",
          actions: [expect.objectContaining({ kind: "Attack", optional: true })],
        }),
      ]),
    );
    for (const trigger of ["OnPlay", "WhenDigivolving", "WhenAttacking"] as const) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        frequency: "OncePerTurn",
        sharedUseKey: "ir-shared-0",
        actions: [
          { kind: "DeDigivolve", amount: 2, target: { count: "all" } },
          {
            kind: "Delete",
            target: {
              count: 2,
              filter: { playCostLte: 0, playCostLteScaling: { per: 1, unit: "digivolutionCards" } },
            },
            cost: {
              kind: "place",
              destination: "digivolutionStack",
              position: "bottom",
              host: "self",
              target: {
                count: 2,
                from: ["hand", "trash"],
              },
            },
            optional: true,
          },
        ],
      });
    }
    expect(registeredCompiledCards.get(CARD_ID)).toEqual(compiled);
    expect(compiledEffects[CARD_ID]).toEqual(compiled);
  });

  it("de-digivolves first, then pays exactly two materials and deletes two eligible Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "source" }],
          hand: [{ card: "EX12-055", as: "materialOne" }],
          trash: [{ card: "EX12-054", as: "materialTwo" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "lowOne" },
            { card: "BT1-009", as: "lowTwo" },
            { card: "EX12-058", as: "stacked", under: ["EX12-055", "EX12-055", "EX12-055"] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const lowOneId = s.perm("lowOne").permanentId;
    const lowTwoId = s.perm("lowTwo").permanentId;

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle(() => s.perm("source").stack.length === 2);

    expect(s.perm("source").stack).toHaveLength(2);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === lowOneId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === lowTwoId)).toBe(false);
    expect(s.perm("stacked").stack.length).toBe(1);
  });

  it("may decline the exact payment after De-Digivolve resolves", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "source" }],
          hand: [
            { card: "EX12-055", as: "materialOne" },
            { card: "EX12-054", as: "materialTwo" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "low" },
            { card: "EX12-058", as: "stacked", under: ["EX12-055", "EX12-055", "EX12-055"] },
          ],
        },
      },
      { autoAcceptOptional: false, autoSelectCards: true },
    );
    const lowId = s.perm("low").permanentId;

    const resolution = advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle(() => s.state.pendingDecision?.kind === "optional");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await resolution;

    expect(s.perm("stacked").stack).toHaveLength(1);
    expect(s.perm("source").stack).toHaveLength(0);
    expect(s.state.players[0]!.hand).toHaveLength(2);
    expect(s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === lowId)).toBe(true);
  });

  it("still performs De-Digivolve when the exact two-card payment cannot be made", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: CARD_ID, as: "source" }] },
        1: { battleArea: [{ card: "EX12-058", as: "stacked", under: ["EX12-055", "EX12-055", "EX12-055"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle();

    expect(s.perm("source").stack).toHaveLength(0);
    expect(s.perm("stacked").stack.length).toBe(1);
  });

  it("Q6860 rejects a partial one-card payment without moving that card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "source" }],
          hand: [{ card: "EX12-055", as: "onlyMaterial" }],
        },
        1: { battleArea: [{ card: "EX12-058", as: "stacked", under: ["EX12-055"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle();

    expect(s.perm("source").stack).toHaveLength(0);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("onlyMaterial").instanceId);
  });

  it("shares one effect budget across On Play, When Digivolving, and When Attacking", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: CARD_ID, as: "source" }] },
        1: {
          battleArea: [
            {
              card: "EX12-058",
              as: "stacked",
              under: ["EX12-055", "EX12-055", "EX12-055", "EX12-055", "EX12-055", "EX12-055"],
            },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));
    expect(s.perm("stacked").stack).toHaveLength(4);
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("source"));
    expect(s.perm("stacked").stack).toHaveLength(4);
  });

  it("Engage attacks at end of turn and Security Attack +1 performs two checks", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: CARD_ID, as: "source" }] },
        1: { security: ["BT1-009", "BT1-010", "BT1-011"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireForPermanent(EffectTiming.OnEndTurn, s.perm("source"));
    await settle(() => s.state.players[1]!.security.length === 1);

    expect(s.perm("source").isSuspended).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("Fragment (2) trashes two sources and prevents deletion", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: CARD_ID, as: "source", under: ["EX12-055", "EX12-054"] }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const sourceId = s.perm("source").permanentId;

    expect(await advance(s.engine).verb.deletePermanent([sourceId], "byEffect")).toBe(0);
    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === sourceId)).toBe(true);
    expect(s.perm("source").stack).toHaveLength(0);
  });

  it("plays by Assembly with six distinct eligible names and rejects a duplicate name", async () => {
    const materialCards = ["BT1-021", "BT1-024", "BT1-042", "BT1-044", "BT1-068", "BT10-014"] as const;
    const s = setupEngine({
      0: {
        hand: [{ card: CARD_ID, as: "target" }],
        trash: materialCards.map((card, index) => ({ card, as: `material${index}` })),
      },
    });
    s.state.memory = 15;
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("target").instanceId,
        assembly: { materialInstanceIds: materialCards.map((_card, index) => s.inst(`material${index}`).instanceId) },
      } as never),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === CARD_ID));
    const played = s.state.players[0]!.battleArea.find(({ topCard }) => topCard?.cardId === CARD_ID)!;
    expect(new Set(played.stack.map(({ cardId }) => cardId))).toEqual(new Set(materialCards));
    expect(s.state.memory).toBe(8);

    const duplicate = setupEngine({
      0: {
        hand: [{ card: CARD_ID, as: "target" }],
        trash: ["BT1-021", "BT1-114", "BT1-042", "BT1-044", "BT1-068", "BT10-014"].map((card, index) => ({
          card,
          as: `material${index}`,
        })),
      },
    });
    duplicate.state.memory = 15;
    expect(
      duplicate.engine.applyIntent(0, {
        type: "playCard",
        instanceId: duplicate.inst("target").instanceId,
        assembly: {
          materialInstanceIds: Array.from(
            { length: 6 },
            (_unused, index) => duplicate.inst(`material${index}`).instanceId,
          ),
        },
      } as never),
    ).toEqual({ ok: false, reason: "invalid-material" });
  });

  it("accepts all four DNA color pairs and rejects two first-group materials", async () => {
    for (const [first, second] of [
      ["BT1-025", "BT10-082"],
      ["BT1-025", "BT1-062"],
      ["BT11-072", "BT10-082"],
      ["BT11-072", "BT1-062"],
    ] as const) {
      const s = setupEngine({
        0: {
          battleArea: [
            { card: first, as: "first" },
            { card: second, as: "second" },
          ],
          hand: [{ card: CARD_ID, as: "target" }],
        },
      });
      expect(
        s.engine.applyIntent(0, {
          type: "dnaDigivolve",
          materialPermanentIds: [s.perm("first").permanentId, s.perm("second").permanentId],
          instanceId: s.inst("target").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === CARD_ID));
    }

    const invalid = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-025", as: "red" },
          { card: "BT11-072", as: "black" },
        ],
        hand: [{ card: CARD_ID, as: "target" }],
      },
    });
    expect(
      invalid.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [invalid.perm("red").permanentId, invalid.perm("black").permanentId],
        instanceId: invalid.inst("target").instanceId,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });

  it("uses all normal evolution colors, rejects yellow, and matches the catalog", async () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      nameEn: "Chaosdramon",
      colors: ["Black", "Purple", "Red"],
      kinds: ["Digimon"],
      playCost: 15,
      dp: 15000,
      level: 7,
      forms: ["Mega"],
      attributes: ["Virus"],
      types: ["Machine", "ME"],
      evoCosts: [
        { color: "Black", level: 6, memoryCost: 5 },
        { color: "Purple", level: 6, memoryCost: 5 },
        { color: "Red", level: 6, memoryCost: 5 },
      ],
    });
    for (const baseCardId of ["BT11-072", "BT10-082", "BT1-025"] as const) {
      const s = setupEngine({
        0: { battleArea: [{ card: baseCardId, as: "base" }], hand: [{ card: CARD_ID, as: "target" }] },
      });
      s.state.memory = 5;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("target").instanceId,
          useAlternateCost: false,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.cardId === CARD_ID);
      expect(s.state.memory).toBe(0);
    }
    const invalid = setupEngine({
      0: { battleArea: [{ card: "BT1-062", as: "base" }], hand: [{ card: CARD_ID, as: "target" }] },
    });
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("base").permanentId,
        instanceId: invalid.inst("target").instanceId,
        useAlternateCost: false,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });
});
