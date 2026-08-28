import { digiXrosRequirementFor, EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT11-071.js";
describe("BT11-071 MusouKnightmon", () => {
  it("maps catalog facts, name rule, and every printed effect to IR", () => {
    expect(getCardDefinition("BT11-071")).toMatchObject({
      cardId: "BT11-071",
      colors: ["Black", "Purple"],
      level: 5,
      playCost: 10,
      dp: 8000,
      types: ["Enhancement", "Bagra Army", "Twilight"],
    });
    expect(compiled.effects).toMatchObject([
      { trigger: "Rule", actions: [{ kind: "GrantStatic", tokens: ["DarkKnightmon", "Tuwarmon"] }] },
      { trigger: "OnPlay", actions: [{ kind: "PlaceUnder" }, { kind: "DeDigivolve" }] },
      { trigger: "WhenDigivolving", actions: [{ kind: "PlaceUnder" }, { kind: "DeDigivolve" }] },
      { trigger: "OnDeletion", actions: [{ kind: "Return", to: "hand" }] },
    ]);
  });

  it("publishes its two-slot DigiXros recipe and permanent rule names", async () => {
    expect(digiXrosRequirementFor("BT11-071")).toEqual([
      {
        materials: [{ names: ["DarkKnightmon"] }, { names: ["Tuwarmon"] }],
        count: 2,
      },
    ]);
    const s = setupEngine({ 0: { battleArea: [{ card: "BT11-071", as: "musou" }] } });
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).effectiveNames(s.perm("musou"))).toEqual(
      expect.arrayContaining(["musouknightmon", "darkknightmon", "tuwarmon"]),
    );
  });

  it("DigiXroses with DarkKnightmon and Tuwarmon for a total cost reduction of 4", async () => {
    const s = setupEngine({
      0: {
        hand: [
          { card: "BT11-071", as: "musou" },
          { card: "BT10-066", as: "darkKnightmon" },
          { card: "BT11-082", as: "tuwarmon" },
        ],
      },
    });
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("musou").instanceId,
        digiXros: { materialInstanceIds: [s.inst("darkKnightmon").instanceId, s.inst("tuwarmon").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard, stack }) => topCard?.cardId === "BT11-071" && stack.length === 2),
    );

    expect(s.state.memory).toBe(4);
    const played = s.state.players[0]!.battleArea.find(({ topCard }) => topCard?.cardId === "BT11-071")!;
    expect(played.stack.map(({ cardId }) => cardId)).toEqual(expect.arrayContaining(["BT10-066", "BT11-082"]));
  });

  it("places an eligible card from trash as its top source", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT11-071", as: "musou" }], trash: [{ card: "BT11-082", as: "tuwarmon" }] } },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("musou"));
    expect(s.perm("musou").stack.some((card) => card.cardId === "BT11-082")).toBe(true);
  });

  it("De-Digivolves 3 opposing Digimon when Tuwarmon is in its sources", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT11-071", as: "musou", under: ["BT11-082"] }] },
        1: {
          battleArea: [
            { card: "BT1-081", as: "first", under: ["BT1-075"] },
            { card: "BT1-081", as: "second", under: ["BT1-075"] },
            { card: "BT1-081", as: "third", under: ["BT1-075"] },
          ],
        },
      },
      { autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("musou"));

    expect(["first", "second", "third"].map((alias) => s.perm(alias).topCard.cardId)).toEqual([
      "BT1-075",
      "BT1-075",
      "BT1-075",
    ]);
  });

  it("returns up to 2 black or purple Digimon from trash on deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-071", as: "musou" }],
          trash: [
            { card: "BT11-061", as: "black" },
            { card: "BT11-082", as: "purple" },
            { card: "BT1-009", as: "red" },
          ],
        },
      },
      { autoSelectCards: true },
    );

    await advance(s.engine).verb.deletePermanent([s.perm("musou").permanentId]);
    await settle(() => s.state.players[0]!.hand.length === 2);

    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["BT11-061", "BT11-082"]),
    );
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("BT1-009");
  });
});
