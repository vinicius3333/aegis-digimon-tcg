import { EffectTiming, digiXrosRequirementFor, digivolutionRequirementsFor } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT19-102 Luminamon (Nene Version)", () => {
  it("publishes both special-evolution gates and both DigiXros material slots", () => {
    expect(digivolutionRequirementsFor("BT19-102")).toEqual([
      { names: ["Luminamon"], cost: 2, isAlternate: true },
      {
        names: ["Nene Amano"],
        minNameStackNames: ["Shademon"],
        minNameStackCount: 1,
        cost: 3,
        isAlternate: true,
      },
    ]);
    expect(digiXrosRequirementFor("BT19-102")).toEqual([
      {
        materials: [{ names: ["Nene Amano"] }, { names: ["Luminamon", "Shademon"] }],
        count: 1,
      },
    ]);
  });

  it("digivolves on Nene for 3 only while Shademon is under her", async () => {
    const valid = setupEngine({
      0: {
        battleArea: [{ card: "BT19-087", as: "nene", under: ["BT19-068"] }],
        hand: [{ card: "BT19-102", as: "luminamon" }],
      },
    });
    valid.state.memory = 3;
    expect(valid.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: valid.perm("nene").permanentId,
      instanceId: valid.inst("luminamon").instanceId,
      alternateRequirementIndex: 1,
    })).toEqual({ ok: true });
    await settle(() => valid.perm("nene").topCard.cardId === "BT19-102");
    expect(valid.perm("nene").topCard.cardId).toBe("BT19-102");
    expect(valid.state.memory).toBe(0);

    const invalid = setupEngine({
      0: {
        battleArea: [{ card: "BT19-087", as: "nene" }],
        hand: [{ card: "BT19-102", as: "luminamon" }],
      },
    });
    invalid.state.memory = 3;
    expect(invalid.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: invalid.perm("nene").permanentId,
      instanceId: invalid.inst("luminamon").instanceId,
      alternateRequirementIndex: 1,
    })).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("DigiXroses with Nene and either named Digimon, including the Tamer material", async () => {
    const s = setupEngine({
      0: {
        hand: [
          { card: "BT19-102", as: "luminamon" },
          { card: "BT19-087", as: "nene" },
          { card: "BT19-068", as: "shade" },
        ],
      },
    });
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("luminamon").instanceId,
      digiXros: { materialInstanceIds: [s.inst("nene").instanceId, s.inst("shade").instanceId] },
    })).toEqual({ ok: true });
    await settle(() => {
      const permanent = s.state.players[0]!.battleArea.find((candidate) => candidate.topCard.cardId === "BT19-102");
      return permanent?.stack.length === 2;
    });
    const played = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === "BT19-102");
    expect(played?.stack.map((card) => card.cardId)).toEqual(expect.arrayContaining(["BT19-087", "BT19-068"]));
    expect(s.state.memory).toBe(0);
  });

  it("plays a level-4 source and deletes that same chosen Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT19-102", as: "source" }, { card: "BT1-009", as: "empty" }] },
        1: { battleArea: [{ card: "BT1-012", as: "chosen", under: [{ card: "BT1-009", as: "material" }] }] },
      },
      { autoSelectCards: true },
    );
    const chosenTop = s.perm("chosen").topCard.instanceId;
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === chosenTop));
    expect(
      s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("material").instanceId),
      JSON.stringify(s.state.players.map((player) => ({
        battle: player?.battleArea.map((permanent) => permanent.topCard.cardId),
        trash: player?.trash.map((card) => card.cardId),
      }))),
    ).toBe(true);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === chosenTop)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === s.perm("empty").permanentId)).toBe(true);
  });

  it("optionally plays only a cost-5-or-less card from under your Tamer on deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-102", as: "source" },
            { card: "BT19-087", as: "tamer", under: [{ card: "BT19-068", as: "playable" }] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).verb.deletePermanent([s.perm("source").permanentId]);
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("playable").instanceId));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("playable").instanceId)).toBe(true);
  });
});
