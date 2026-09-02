import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX10-042.js";
import "../index.js";

const CARD_ID = "EX10-042";

describe("EX10-042 GulusGammamon", () => {
  it("records the exact catalog", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      colors: ["Purple", "Red"],
      level: 4,
      playCost: 5,
      dp: 5000,
      evoCosts: [
        { color: "Purple", level: 3, memoryCost: 3 },
        { color: "Red", level: 3, memoryCost: 3 },
      ],
      forms: ["Champion"],
      attributes: ["Virus"],
      types: ["Dragonkin"],
    });
  });

  it("proves Gammamon digivolution, trash-to-stack placement, and event-bound Regulusmon digivolution", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toEqual([{ names: ["Gammamon"], cost: 2, isAlternate: true }]);
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects?.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          { kind: "TrashTopDeck", controller: "mine", amount: 2 },
          {
            kind: "PlaceUnder",
            target: { filter: { zone: "trash", controller: "mine", kind: ["Digimon"] }, count: 1, from: ["trash"] },
            position: "bottom",
            optional: true,
          },
        ],
      });
    }
    expect(compiled.effects?.find((effect) => effect.trigger === "YourTurn")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onAddDigivolutionCards",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "Digivolve",
              into: { nameOrTrait: [{ tokens: ["Regulusmon"], match: "name" }] },
              from: ["hand", "trash"],
              payCost: true,
              reduceCost: 1,
              optional: true,
            },
          ],
        },
      ],
    });
    expect(compiled.effects?.find((effect) => effect.isInherited)).toMatchObject({ keywords: [{ keyword: "Raid" }] });
  });

  it("mills 2, places only a Gammamon-name trash card at stack bottom, and triggers the reduced Regulusmon evolution", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "gulus", under: [{ card: "BT1-009", as: "existing" }] }],
          deck: [
            { card: "BT1-009", as: "mill1" },
            { card: "BT1-010", as: "mill2" },
          ],
          trash: [
            { card: "LM-016", as: "gammamon" },
            { card: "EX10-040", as: "near" },
          ],
          hand: [{ card: "EX10-053", as: "regulus" }],
        },
      },
      // EX10-053 Regulusmon is reachable from this Lv.4 [Gammamon]-name base by BOTH its printed
      // evoCost (Purple/Red Lv.4 cost 5) and its alternate "[Digivolve] Lv.4 w/[Gammamon] in name:
      // Cost 5". A paying effect-driven digivolve then opens the route `chooseOption` prompt
      // (interpreter/actions/digivolve.ts) that nothing here answered, so the suite hung on the
      // decision and never saw the evolution. Index 0 is the printed route; both cost 5, so the
      // reduced payment asserted below is the same either way.
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("gammamon").instanceId, s.inst("regulus").instanceId);
    s.state.memory = 4;
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("gulus"));
    await settle(() => s.perm("gulus").topCard?.cardId === "EX10-053");
    expect(s.perm("gulus").stack.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("gammamon").instanceId,
      s.inst("existing").instanceId,
      s.inst("gulus").instanceId,
    ]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("near").instanceId, s.inst("mill1").instanceId, s.inst("mill2").instanceId]),
    );
    expect(s.state.memory).toBe(0);
  });

  it("provides Raid only from a realistic inherited stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX10-053", as: "host", under: [{ card: CARD_ID, as: "gulus" }] },
          { card: CARD_ID, as: "standalone" },
        ],
      },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Raid")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("standalone"), "Raid")).toBe(false);
  });
});
