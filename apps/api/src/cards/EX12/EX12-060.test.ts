import { describe, expect, it } from "vitest";
import { assemblyRequirementFor, dnaDigivolutionRequirementsFor, EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "./EX12-060.js";

const CARD_ID = "EX12-060";

describe("EX12-060 Chaosdramon", () => {
  it("maps the printed keywords, DNA routes, Assembly recipe, and shared timing", () => {
    const compiled = registeredCompiledCards.get(CARD_ID)!;

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
              target: {
                count: 2,
                from: ["hand", "trash"],
                destination: "digivolutionStack",
                position: "bottom",
                host: "self",
              },
            },
          },
        ],
      });
    }
  });

  it("de-digivolves first, then pays exactly two materials and deletes two eligible Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "source" }],
          hand: [
            { card: "EX12-055", as: "materialOne" },
            { card: "EX12-055", as: "materialTwo" },
          ],
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
});
