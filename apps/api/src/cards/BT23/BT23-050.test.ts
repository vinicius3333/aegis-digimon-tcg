import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT23-050.js";

describe("BT23-050 Ankylomon", () => {
  it("matches every catalog field and complete compiled clause", () => {
    expect(getCardDefinition("BT23-050")).toMatchObject({
      cardId: "BT23-050",
      nameEn: "Ankylomon",
      colors: ["Black", "Yellow"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 5,
      dp: 5000,
      evoCosts: [
        { color: "Yellow", level: 3, memoryCost: 3 },
        { color: "Blue", level: 3, memoryCost: 3 },
      ],
      forms: ["Champion"],
      attributes: ["Free"],
      types: ["Ankylosaur", "Hudie", "CS"],
    });
    expect(compiled.digivolutionRequirement).toEqual([
      { names: ["Armadillomon"], cost: 2, isAlternate: true },
      { level: 3, traits: ["CS"], cost: 2, isAlternate: true },
    ]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("finishes the DP reduction before optionally DNA digivolving into Shakkoumon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-050", as: "anky" },
            { card: "BT23-027", as: "yellowMaterial", suspended: true },
          ],
          hand: [{ card: "BT23-032", as: "shakkou" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "zeroDp", dp: 2000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const zeroId = s.perm("zeroDp").permanentId;

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("anky"));

    const shakkoumon = s.state.players[0]!.battleArea.find((p) => p.topCard?.cardId === "BT23-032");
    expect(shakkoumon).toBeDefined();
    expect(shakkoumon?.isSuspended).toBe(false);
    expect(shakkoumon?.stack.map((card) => card.cardId)).toEqual(expect.arrayContaining(["BT23-050", "BT23-027"]));
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === zeroId)).toBe(false);
  });

  it("exposes Blocker directly and from a realistic inherited stack", async () => {
    const direct = setupEngine({ 0: { battleArea: [{ card: "BT23-050", as: "anky" }] } });
    await direct.ready();
    expect(observe(direct.engine).hasKeyword(direct.perm("anky"), "Blocker")).toBe(true);
    const inherited = setupEngine({ 0: { battleArea: [{ card: "BT23-053", as: "host", under: ["BT23-050"] }] } });
    await inherited.ready();
    expect(observe(inherited.engine).hasKeyword(inherited.perm("host"), "Blocker")).toBe(true);
    expect(
      compiled.effects
        .filter((entry) => entry.trigger === "Static")
        .flatMap((entry) => entry.keywords?.map((keyword) => keyword.keyword) ?? []),
    ).toEqual(["Blocker", "Blocker"]);
  });

  it("gives one opposing Digimon -2000 DP until the opponent's turn ends on play and digivolving", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const actions = (compiled.effects.find((entry) => entry.trigger === trigger) as any).actions;
      expect(actions[0]).toMatchObject({
        kind: "ModifyDP",
        amount: -2000,
        duration: "untilOpponentTurnEnd",
        target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
      });
    }
  });

  it("then optionally DNA digivolves two of your Digimon into Shakkoumon only during your turn", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const action = (compiled.effects.find((entry) => entry.trigger === trigger) as any).actions[1];
      expect(action).toMatchObject({
        kind: "DnaDigivolve",
        materials: { filter: { controller: "mine", kind: ["Digimon"] }, count: 2 },
        into: { nameOrTrait: [{ tokens: ["Shakkoumon"], match: "name" }] },
        from: ["hand"],
        payCost: true,
        condition: { kind: "isYourTurn" },
        optional: true,
      });
    }
  });

  it.each(["BT1-027", "BT23-037"])("digivolves for 2 from an Armadillomon/level-3 CS base (%s)", (base) => {
    const s = setupEngine({
      0: { battleArea: [{ card: base, as: "base" }], hand: [{ card: "BT23-050", as: "anky" }] },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("anky").instanceId,
      }),
    ).toEqual({ ok: true });
  });
});
