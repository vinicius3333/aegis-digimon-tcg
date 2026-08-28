import { digiXrosRequirementFor, digivolutionRequirementsFor } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT19-102 Luminamon (Nene Version)", () => {
  it("publishes both special-evolution gates and both DigiXros material slots", () => {
    expect(digivolutionRequirementsFor("BT19-102")).toEqual([
      { namesExact: ["Luminamon"], cost: 2, isAlternate: true },
      {
        namesExact: ["Nene Amano"],
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

  it("keeps both By-playing Delete conditions optional and bound to the chosen host", () => {
    expect(runtimeCompiledCard("BT19-102")?.effects).toMatchObject([
      {
        trigger: "OnPlay",
        actions: [
          {
            kind: "Delete",
            sameTarget: true,
            optional: true,
            abortOnDecline: true,
            cost: { kind: "playFromDigivolutionCards", payCost: false },
          },
        ],
      },
      {
        trigger: "WhenDigivolving",
        actions: [
          {
            kind: "Delete",
            sameTarget: true,
            optional: true,
            abortOnDecline: true,
            cost: { kind: "playFromDigivolutionCards", payCost: false },
          },
        ],
      },
    ]);
  });

  it("digivolves on Nene for 3 only while Shademon is under her", async () => {
    const valid = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-087", as: "nene", under: ["BT19-068"] }],
          hand: [{ card: "BT19-102", as: "luminamon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    valid.state.memory = 3;
    expect(
      valid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: valid.perm("nene").permanentId,
        instanceId: valid.inst("luminamon").instanceId,
        alternateRequirementIndex: 1,
      }),
    ).toEqual({ ok: true });
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
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("nene").permanentId,
        instanceId: invalid.inst("luminamon").instanceId,
        alternateRequirementIndex: 1,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
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
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("luminamon").instanceId,
        digiXros: { materialInstanceIds: [s.inst("nene").instanceId, s.inst("shade").instanceId] },
      }),
    ).toEqual({ ok: true });
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
        0: { hand: [{ card: "BT19-102", as: "source" }] },
        1: { battleArea: [{ card: "BT1-012", as: "chosen", under: [{ card: "BT1-009", as: "material" }] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const chosenTop = s.perm("chosen").topCard.instanceId;
    s.state.memory = 6;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT19-102"));
    expect(
      s.state.players[1]!.battleArea.some(
        (permanent) => permanent.topCard.instanceId === s.inst("material").instanceId,
      ),
      JSON.stringify(
        s.state.players.map((player) => ({
          battle: player?.battleArea.map((permanent) => permanent.topCard.cardId),
          trash: player?.trash.map((card) => card.cardId),
        })),
      ),
    ).toBe(true);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === chosenTop)).toBe(true);
  });

  it("optionally plays only a cost-5-or-less card from under your Tamer after natural battle deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-102", as: "source", suspended: true },
            { card: "BT19-087", as: "tamer", under: [{ card: "BT1-009", as: "playable" }] },
          ],
        },
        1: { battleArea: [{ card: "BT1-024", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    const sourceId = s.perm("source").permanentId;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: sourceId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT19-102"));
    expect(
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard.instanceId === s.inst("playable").instanceId,
      ),
    ).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === sourceId)).toBe(false);
  });

  it("declining the By-playing condition leaves the chosen host and its source intact", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT19-102", as: "source" }] },
        1: { battleArea: [{ card: "BT1-012", as: "chosen", under: [{ card: "BT1-009", as: "material" }] }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT19-102"));

    expect(s.decisions.some(({ req }) => req.kind === "optional")).toBe(true);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT1-012")).toBe(true);
    expect(s.state.players[1]!.battleArea[0]!.stack.map((card) => card.cardId)).toEqual(["BT1-009"]);
  });

  it("aborts the By-playing condition when the chosen host has no eligible source card", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT19-102", as: "source" }] },
        1: { battleArea: [{ card: "BT1-012", as: "chosen" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT19-102"));

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT1-012")).toBe(true);
  });

  it("rejects near-name alternate-evolution and DigiXros materials", () => {
    const nearLuminamon = setupEngine({
      0: {
        battleArea: [{ card: "BT19-102", as: "nearLuminamon" }],
        hand: [{ card: "BT19-102", as: "evolving" }],
      },
    });
    nearLuminamon.state.memory = 2;
    expect(
      nearLuminamon.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: nearLuminamon.perm("nearLuminamon").permanentId,
        instanceId: nearLuminamon.inst("evolving").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });

    const nearNene = setupEngine({
      0: {
        battleArea: [{ card: "EX10-064", as: "nearNene", under: ["BT19-068"] }],
        hand: [{ card: "BT19-102", as: "evolving" }],
      },
    });
    nearNene.state.memory = 3;
    expect(
      nearNene.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: nearNene.perm("nearNene").permanentId,
        instanceId: nearNene.inst("evolving").instanceId,
        alternateRequirementIndex: 1,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });

    const nearNeneMaterial = setupEngine({
      0: {
        hand: [
          { card: "BT19-102", as: "source" },
          { card: "EX10-064", as: "nearNeneMaterial" },
          { card: "BT19-068", as: "shade" },
        ],
      },
    });
    nearNeneMaterial.state.memory = 4;
    expect(
      nearNeneMaterial.engine.applyIntent(0, {
        type: "playCard",
        instanceId: nearNeneMaterial.inst("source").instanceId,
        digiXros: {
          materialInstanceIds: [
            nearNeneMaterial.inst("nearNeneMaterial").instanceId,
            nearNeneMaterial.inst("shade").instanceId,
          ],
        },
      }),
    ).toEqual({ ok: false, reason: "invalid-material" });

    const nearLuminamonMaterial = setupEngine({
      0: {
        hand: [
          { card: "BT19-102", as: "source" },
          { card: "BT19-087", as: "nene" },
          { card: "BT19-102", as: "nearLuminamonMaterial" },
        ],
      },
    });
    nearLuminamonMaterial.state.memory = 4;
    expect(
      nearLuminamonMaterial.engine.applyIntent(0, {
        type: "playCard",
        instanceId: nearLuminamonMaterial.inst("source").instanceId,
        digiXros: {
          materialInstanceIds: [
            nearLuminamonMaterial.inst("nene").instanceId,
            nearLuminamonMaterial.inst("nearLuminamonMaterial").instanceId,
          ],
        },
      }),
    ).toEqual({ ok: false, reason: "invalid-material" });
  });
});
