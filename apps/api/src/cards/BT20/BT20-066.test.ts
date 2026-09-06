import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT20-066.js";
import "./index.js";

describe("BT20-066 Stingmon", () => {
  it("deletes one opposing level 3 Digimon on play and digivolving", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)?.actions[0]).toMatchObject({
        kind: "Delete",
        target: { filter: { controller: "opponent", kind: ["Digimon"], levels: [3] }, count: 1 },
      });
    }
  });

  it("optionally DNA digivolves two own Digimon into a qualifying card from hand during its turn", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          { kind: "Delete" },
          {
            kind: "DnaDigivolve",
            materials: { filter: { controller: "mine", kind: ["Digimon"] }, count: 2 },
            into: {
              zone: "hand",
              nameOrTrait: [
                { tokens: ["Imperialdramon"], match: "name" },
                { tokens: ["Free"], match: "trait" },
              ],
            },
            payCost: true,
            condition: { kind: "isYourTurn" },
            optional: true,
          },
        ],
      });
    }
  });

  it("inherits Retaliation", () => {
    expect(compiled.effects.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "Static",
      keywords: [{ keyword: "Retaliation" }],
    });
  });

  it("publishes the printed stats and purple/red evolution routes", () => {
    expect(getCardDefinition("BT20-066")).toMatchObject({
      level: 4,
      playCost: 4,
      dp: 4000,
      evoCosts: [
        { color: "Purple", level: 3, memoryCost: 2 },
        { color: "Red", level: 3, memoryCost: 2 },
      ],
    });
  });

  it("on play deletes level 3, then DNA digivolves exact materials into Imperialdramon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT20-074", under: ["BT20-069"], as: "dinobeemon" },
            { card: "BT20-016", under: ["BT20-066"], as: "paildramon" },
          ],
          hand: [
            { card: "BT20-066", as: "stingmon" },
            { card: "BT20-076", as: "imperialdramon" },
          ],
          deck: ["BT20-047"],
        },
        1: {
          battleArea: [
            { card: "BT20-061", as: "level3" },
            { card: "BT20-059", as: "large" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("stingmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-076"));
    const imperialdramon = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === "BT20-076")!;
    expect(imperialdramon.stack.map((card) => card.cardId)).toEqual(expect.arrayContaining(["BT20-074", "BT20-016"]));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("imperialdramon").instanceId)).toBe(
      false,
    );
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["BT20-059"]);
  });

  it("deletes level 3 through public evolution and declines DNA when no qualifying hand card exists", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-065", as: "base" }],
          hand: [{ card: "BT20-066", as: "stingmon" }],
          deck: ["BT20-047"],
        },
        1: { battleArea: [{ card: "BT20-061", as: "level3" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("stingmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.perm("base").topCard.cardId).toBe("BT20-066");
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT20-065"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("grants inherited Retaliation only from underneath a host", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT20-074", under: ["BT20-066"], as: "host" },
          { card: "BT20-066", as: "standalone" },
        ],
      },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Retaliation")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("standalone"), "Retaliation")).toBe(false);
  });
});
