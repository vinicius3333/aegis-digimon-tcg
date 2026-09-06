import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT24-009.js";
import "../index.js";

describe("BT24-009 Shamanmon", () => {
  it("matches the catalog identity", () => {
    expect(getCardDefinition("BT24-009")).toMatchObject({
      cardId: "BT24-009",
      nameEn: "Shamanmon",
      colors: ["Red", "Purple"],
      kinds: ["Digimon"],
      level: 3,
      types: ["Demon", "Titan", "TS"],
    });
  });

  it("requires trashing the qualifying hand card before drawing two", () => {
    const action = compiled.effects.find((effect) => effect.trigger === "OnPlay")?.actions?.[0] as any;
    expect(action).toMatchObject({
      kind: "Draw",
      amount: 2,
      optional: true,
      abortOnDecline: true,
      cost: { kind: "trash" },
    });
  });

  it("scopes inherited trash-triggered digivolution to this Demon/Titan Digimon", () => {
    const inherited = compiled.effects.find((effect) => effect.isInherited) as any;
    const action = inherited.actions[0].actions[0];
    expect(action.target).toMatchObject({ filter: { isSelfRef: true }, isSelf: true });
    expect(action.condition).toMatchObject({ kind: "selfHasTrait" });
    expect(action).toMatchObject({
      kind: "Digivolve",
      from: ["trash"],
      payCost: true,
      useAlternateCost: true,
      reduceCost: 1,
      optional: true,
    });
  });

  it("resolves the On Play clause from a public play intent", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT24-009", as: "shamanmon" },
            { card: "BT24-009", as: "cost" },
          ],
          deck: ["BT1-001", "BT1-002"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("shamanmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("cost").instanceId));
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("cost").instanceId);
    expect(s.state.players[0]!.hand).toHaveLength(2);
  });

  it("records both zero-cost alternate evolution recipes", () => {
    expect(compiled.digivolutionRequirement).toEqual([
      { names: ["Tsunomon"], cost: 0, isAlternate: true },
      { level: 2, traits: ["TS"], cost: 0, isAlternate: true },
    ]);
  });

  it("may trash a Demon card to draw two on play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-009", as: "shamanmon" }],
          hand: [{ card: "BT24-009", as: "cost" }],
          deck: [
            { card: "BT1-001", as: "drawOne" },
            { card: "BT1-002", as: "drawTwo" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("shamanmon"));

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("cost").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("drawOne").instanceId, s.inst("drawTwo").instanceId]),
    );
  });

  it("may decline the On Play trash cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-009", as: "shamanmon" }],
          hand: [{ card: "BT24-009", as: "cost" }],
          deck: ["BT1-001", "BT1-002"],
        },
      },
      { autoDeclineOptional: true },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("shamanmon"));

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("cost").instanceId);
    expect(s.state.players[0]!.deck).toHaveLength(2);
  });

  it("digivolves its Titan host into Titamon from trash with cost reduced by one", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-072", as: "host", under: ["BT24-009"] }],
          hand: [{ card: "BT1-001", as: "discard" }],
          trash: [{ card: "P-209", as: "titamon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    await advance(s.engine).verb.trash([s.inst("discard").instanceId], 0);
    await settle(() => s.perm("host").topCard.instanceId === s.inst("titamon").instanceId);

    expect(s.perm("host").topCard.cardId).toBe("P-209");
    expect(s.state.memory).toBe(3);
  });

  it("inherits from a public play discard and evolves its Demon/Titan host", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-072", as: "host", under: ["BT24-009"] }],
          hand: [
            { card: "BT24-026", as: "discarder" },
            { card: "BT24-009", as: "discarded" },
          ],
          trash: [{ card: "P-209", as: "titamon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("discarder").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("host").topCard.cardId === "P-209");
    expect(s.state.memory).toBe(4);
  });

  it("does not inherited-evolve a host lacking Demon or Titan", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-046", as: "host", under: ["BT24-009"] }],
          hand: [
            { card: "BT24-026", as: "discarder" },
            { card: "BT24-009", as: "discarded" },
          ],
          trash: [{ card: "P-209", as: "titamon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("discarder").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("discarded").instanceId));
    expect(s.perm("host").topCard.cardId).toBe("BT24-046");
  });

  it("accepts the named Tsunomon route from a non-TS egg", async () => {
    const s = setupEngine({
      0: { breeding: { card: "ST2-01", as: "egg" }, hand: [{ card: "BT24-009", as: "shaman" }] },
    });
    s.state.memory = 5;
    await s.ready();
    const eggId = s.perm("egg").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: eggId,
        instanceId: s.inst("shaman").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("egg").topCard.cardId === "BT24-009");
    expect(s.perm("egg").stack.map((card) => card.cardId)).toEqual(["ST2-01"]);
  });

  it("also accepts the level-2 TS alternate recipe from the public evolution intent", async () => {
    const s = setupEngine({
      0: { breeding: { card: "BT24-004", as: "egg" }, hand: [{ card: "BT24-009", as: "shaman" }] },
    });
    s.state.memory = 5;
    await s.ready();
    const eggId = s.perm("egg").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: eggId,
        instanceId: s.inst("shaman").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 1,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("egg").topCard.cardId === "BT24-009");
  });
});
