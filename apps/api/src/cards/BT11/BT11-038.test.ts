import { compiledEffects, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT11-038.js";

describe("BT11-038 Angemon", () => {
  it("matches the catalog and publishes the complete direct/shared deletion contract", () => {
    expect(getCardDefinition("BT11-038")).toEqual({
      cardId: "BT11-038",
      set: "BT11",
      nameEn: "Angemon",
      colors: ["Yellow"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 5,
      dp: 5000,
      evoCosts: [
        { color: "Yellow", level: 3, memoryCost: 2 },
        { color: "Purple", level: 3, memoryCost: 2 },
      ],
      forms: ["Champion"],
      attributes: ["Vaccine"],
      types: ["Angel"],
      effectText:
        "[On Deletion] If you have a purple Digimon or purple Tamer in play, you may play 1 [Devimon] from your trash without paying the cost.",
      rarity: "U",
      maxCountInDeck: 4,
      imageId: "BT11-038",
      nameJp: "エンジェモン",
    });
    expect(compiled).toEqual({
      effects: [
        {
          trigger: "OnDeletion",
          actions: [
            {
              kind: "PlayWithoutCost",
              target: {
                filter: { controller: "mine", nameOrTrait: [{ tokens: ["Devimon"], match: "nameExact" }] },
                count: 1,
              },
              from: ["trash"],
              payCost: false,
              optional: true,
              condition: {
                kind: "youHave",
                filter: {
                  zone: "battleArea",
                  controllerDefault: "mine",
                  kind: ["Digimon", "Tamer"],
                  colors: ["Purple"],
                },
                raw: "you have a purple Digimon or purple Tamer in play",
              },
            },
          ],
        },
      ],
      coverage: "full",
      residual: [],
    });
    expect(compiledEffects["BT11-038"]).toEqual(compiled);
  });

  it("evolves from both printed level-3 colors for exactly 2", async () => {
    for (const base of ["BT11-037", "BT11-075"] as const) {
      const s = setupEngine({
        0: {
          battleArea: [{ card: base, as: "base" }],
          hand: [{ card: "BT11-038", as: "angemon" }],
          deck: ["BT1-001"],
        },
      });
      s.state.memory = 4;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("angemon").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.cardId === "BT11-038");
      expect(s.state.memory).toBe(2);
      expect(s.perm("base").currentDP).toBe(5000);
    }
  });

  it("plays for the printed cost 5 and exposes 5000 DP", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT11-038", as: "angemon" }] } });
    s.state.memory = 7;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("angemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 1);

    expect(s.state.memory).toBe(2);
    expect(s.perm("angemon").currentDP).toBe(5000);
  });

  it("plays Devimon from trash on deletion while a purple Tamer remains in play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-038", as: "angemon" }, "BT11-094"],
          trash: [{ card: "BT11-080", as: "devimon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(await advance(s.engine).verb.deletePermanent([s.perm("angemon").permanentId], "byEffect")).toBe(1);
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === s.inst("devimon").instanceId),
    );

    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).not.toContain(s.inst("devimon").instanceId);
    expect(s.state.memory).toBe(3);
  });

  it("Q2072: doesn't activate when the last purple card is deleted simultaneously", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT11-038", as: "angemon" },
            { card: "BT11-080", as: "purple" },
          ],
          trash: [{ card: "BT11-080", as: "devimon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const devimonInstanceId = s.inst("devimon").instanceId;

    expect(
      await advance(s.engine).verb.deletePermanent(
        [s.perm("angemon").permanentId, s.perm("purple").permanentId],
        "byEffect",
      ),
    ).toBe(2);
    await settle();

    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(devimonInstanceId);
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === devimonInstanceId)).toBe(false);
  });

  it("accepts a surviving purple Digimon but only plays exact Devimon from a mixed trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT11-038", as: "angemon" },
            { card: "BT11-080", as: "purple" },
          ],
          trash: [
            { card: "BT2-074", as: "devimon" },
            { card: "BT3-088", as: "ladyDevimon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    expect(await advance(s.engine).verb.deletePermanent([s.perm("angemon").permanentId], "byEffect")).toBe(1);
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === s.inst("devimon").instanceId),
    );

    expect(
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === s.inst("devimon").instanceId),
    ).toBe(true);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("ladyDevimon").instanceId);
  });

  it("allows the Devimon play to be declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-038", as: "angemon" }, "BT11-094"],
          trash: [{ card: "BT11-080", as: "devimon" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );

    expect(await advance(s.engine).verb.deletePermanent([s.perm("angemon").permanentId], "byEffect")).toBe(1);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("devimon").instanceId);
  });
});
