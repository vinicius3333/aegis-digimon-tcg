import { describe, expect, it } from "vitest";
import {
  EffectTiming,
  assemblyRequirementFor,
  dnaDigivolutionRequirementsFor,
  digivolutionRequirementsFor,
} from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "./EX12-035.js";

describe("EX12-035 MetalGarurumon", () => {
  it("maps evolution, DNA, Assembly, Decode, and both all-turns clauses", () => {
    const compiled = registeredCompiledCards.get("EX12-035")!;
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 5, names: ["Garurumon"], cost: 3, isAlternate: true },
      { level: 5, traits: ["ME", "VB"], cost: 3, isAlternate: true },
    ]);
    expect(digivolutionRequirementsFor("EX12-035")).toEqual(compiled.digivolutionRequirement);
    expect(dnaDigivolutionRequirementsFor("EX12-035")).toEqual([
      {
        cost: 0,
        materials: [
          { color: "Blue", level: 5 },
          { color: "Purple", level: 5 },
        ],
      },
      {
        cost: 0,
        materials: [
          { color: "Blue", level: 5 },
          { color: "Yellow", level: 5 },
        ],
      },
      {
        cost: 0,
        materials: [
          { color: "Black", level: 5 },
          { color: "Purple", level: 5 },
        ],
      },
      {
        cost: 0,
        materials: [
          { color: "Black", level: 5 },
          { color: "Yellow", level: 5 },
        ],
      },
    ]);
    expect(assemblyRequirementFor("EX12-035")).toEqual(compiled.assemblyRequirement);
    expect(
      compiled.effects.filter((effect) => effect.trigger === "Static").flatMap((effect) => effect.keywords ?? []),
    ).toEqual([
      { keyword: "Evade", raw: "＜Evade＞" },
      { keyword: "Decode", raw: "＜Decode (Lv.5 or lower w/[Gabumon]/[Garurumon] in name or w/[ME]/[VB] trait)＞" },
    ]);
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          { kind: "TrashDigivolution", amount: 4, scope: "acrossDigimon" },
          {
            kind: "Return",
            to: "deckBottom",
            target: { filter: { digivolutionCardsCompareToSource: "lte" }, count: 1 },
          },
        ],
      });
    }
    const allTurns = compiled.effects.find((effect) => effect.trigger === "AllTurns")!;
    expect(allTurns.frequency).toBe("OncePerTurn");
    expect(allTurns.actions).toMatchObject([
      { kind: "SubTrigger", event: "whenPlayed", sourceFilter: { controllerDefault: "any", kind: ["Digimon"] } },
      { kind: "SubTrigger", event: "whenAnyDigivolves", sourceFilter: { controllerDefault: "any", kind: ["Digimon"] } },
    ]);
  });

  it("trashes four opposing stack cards and returns a Digimon with no more cards than this source", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX12-035", as: "source" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "first", under: ["BT1-010", "BT1-011"] },
            { card: "BT1-014", as: "second", under: ["BT1-012", "BT1-013"] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("source"));
    await settle(() => s.state.players[1]!.trash.length === 4 && s.state.players[1]!.battleArea.length === 1);

    expect(s.state.players[1]!.trash).toHaveLength(4);
    expect(s.state.players[1]!.battleArea[0]!.stack).toHaveLength(0);
    expect(s.state.players[1]!.deck.some((card) => ["BT1-009", "BT1-014"].includes(card.cardId))).toBe(true);
  });

  it("restricts one opposing Digimon after one of your Digimon is played", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX12-035", as: "source" }], hand: [{ card: "BT1-009", as: "played" }] },
        1: { battleArea: [{ card: "BT1-014", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const targetId = s.perm("target").permanentId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId } as never)).toEqual({
      ok: true,
    });
    await settle(() =>
      (
        s.engine as unknown as { continuous: { hasRestriction(id: string, kind: string): boolean } }
      ).continuous.hasRestriction(targetId, "suspend"),
    );

    expect(
      (
        s.engine as unknown as { continuous: { hasRestriction(id: string, kind: string): boolean } }
      ).continuous.hasRestriction(targetId, "suspend"),
    ).toBe(true);
  });
});
