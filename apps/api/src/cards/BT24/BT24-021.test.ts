import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT24-021.js";
import "../index.js";

describe("BT24-021 SnowGoblimon", () => {
  it("matches the immutable catalog identity", () => {
    expect(getCardDefinition("BT24-021")).toMatchObject({
      cardId: "BT24-021",
      nameEn: "SnowGoblimon",
      colors: ["Blue", "Purple"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 1000,
      forms: ["Rookie"],
      attributes: ["Virus"],
      types: ["Demon", "Titan", "TS"],
      evoCosts: [
        { color: "Blue", level: 2, memoryCost: 1 },
        { color: "Purple", level: 2, memoryCost: 1 },
      ],
    });
  });

  it("reveals three cards for one Demon/Shaman Digimon and one Titan card", () => {
    const reveal = compiled.effects.find((effect) => effect.trigger === "OnPlay");
    expect(reveal).toMatchObject({
      actions: [{ kind: "RevealAdd", revealCount: 3, rest: "deckBottom", add: [{}, {}] }],
    });
  });

  it("digivolves this Demon/Titan Digimon from trash after the hand is trashed", () => {
    const inherited = compiled.effects.find((effect) => effect.isInherited);
    expect(inherited).toMatchObject({
      actions: [
        {
          actions: [
            {
              kind: "Digivolve",
              target: { filter: { isSelfRef: true }, isSelf: true },
              condition: { kind: "selfHasTrait" },
              into: { nameOrTrait: expect.arrayContaining([{ tokens: ["Titamon"], match: "nameExact" }]) },
              from: ["trash"],
              payCost: true,
              reduceCost: 1,
              optional: true,
            },
          ],
        },
      ],
    });
  });

  it("uses an exact Tsunomon alternate evolution requirement", () => {
    expect(compiled.digivolutionRequirement).toContainEqual({
      namesExact: ["Tsunomon"],
      cost: 0,
      isAlternate: true,
    });
  });

  it("adds one Shaman Digimon and one Titan card from the top three", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-021", as: "snowGoblimon" }],
          deck: [
            { card: "BT24-014", as: "shaman" },
            { card: "BT24-015", as: "titan" },
            { card: "BT1-009", as: "miss" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("snowGoblimon"));

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("shaman").instanceId, s.inst("titan").instanceId]),
    );
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("miss").instanceId]);
  });

  it("resolves the top-three search through a public play intent", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT24-021", as: "snowGoblimon" }],
          deck: [
            { card: "BT24-014", as: "shaman" },
            { card: "BT24-015", as: "titan" },
            { card: "BT1-009", as: "miss" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("snowGoblimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("shaman").instanceId));

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("shaman").instanceId, s.inst("titan").instanceId]),
    );
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("miss").instanceId]);
  });

  it("suppresses a second injected hand-trash evolution in the same turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-010", as: "host", under: ["BT24-021"] }],
          hand: [
            { card: "BT1-009", as: "firstDiscard" },
            { card: "BT1-010", as: "secondDiscard" },
          ],
          trash: [
            { card: "BT24-072", as: "firstTarget" },
            { card: "P-209", as: "secondTarget" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 5;
    await s.ready();

    await advance(s.engine).verb.trash([s.inst("firstDiscard").instanceId], 0);
    await settle(() => s.perm("host").topCard.instanceId === s.inst("firstTarget").instanceId);
    expect(s.perm("host").topCard.instanceId).toBe(s.inst("firstTarget").instanceId);
    await advance(s.engine).verb.trash([s.inst("secondDiscard").instanceId], 0);

    expect(s.perm("host").topCard.instanceId).toBe(s.inst("firstTarget").instanceId);
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("secondTarget").instanceId);
  });

  it("publicly discards a hand card and evolves the same Titan host from trash", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-072", as: "host", under: ["BT24-021"] }],
          hand: [
            { card: "BT24-026", as: "discarder" },
            { card: "BT1-009", as: "discarded" },
            { card: "BT1-010", as: "spare" },
          ],
          trash: [{ card: "P-209", as: "titamon" }],
          deck: [{ card: "BT1-014", as: "bonusDraw" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferInstanceIds: preferred },
    );
    const titamonId = s.inst("titamon").instanceId;
    const discardedId = s.inst("discarded").instanceId;
    preferred.push(discardedId, titamonId);
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("discarder").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("host").topCard.instanceId === titamonId);

    expect(s.state.memory).toBe(4);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("bonusDraw").instanceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(discardedId);
    expect(s.perm("host").topCard.instanceId).toBe(titamonId);
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["BT24-021", "BT24-072"]);
  });

  it("may refuse the public inherited evolution after the hand discard", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-072", as: "host", under: ["BT24-021"] }],
          hand: [
            { card: "BT24-026", as: "discarder" },
            { card: "BT1-009", as: "discarded" },
          ],
          trash: [{ card: "P-209", as: "titamon" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const discardedId = s.inst("discarded").instanceId;
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("discarder").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === discardedId));

    expect(s.state.memory).toBe(6);
    expect(s.perm("host").topCard.cardId).toBe("BT24-072");
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("titamon").instanceId);
  });

  it("suppresses a second public discard evolution and resets on the next owner turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-010", as: "host", under: ["BT24-021"] }],
          hand: [
            { card: "BT24-026", as: "discarder1" },
            { card: "BT24-026", as: "discarder2" },
            { card: "BT24-026", as: "discarder3" },
            { card: "BT1-009", as: "discarded1" },
            { card: "BT1-010", as: "discarded2" },
            { card: "BT1-011", as: "discarded3" },
          ],
          trash: [
            { card: "BT24-072", as: "firstTarget" },
            { card: "P-209", as: "secondTarget" },
          ],
          deck: ["BT1-012", "BT1-013", "BT1-014"],
        },
        1: { deck: ["BT1-012", "BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferInstanceIds: preferred },
    );
    preferred.push(
      s.inst("discarded1").instanceId,
      s.inst("discarded2").instanceId,
      s.inst("discarded3").instanceId,
      s.inst("firstTarget").instanceId,
      s.inst("secondTarget").instanceId,
    );
    s.state.memory = 20;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("discarder1").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("host").topCard.instanceId === s.inst("firstTarget").instanceId);
    expect(s.perm("host").topCard.instanceId).toBe(s.inst("firstTarget").instanceId);
    expect(s.state.memory).toBe(8);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("discarder2").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("discarded2").instanceId));
    expect(s.perm("host").topCard.instanceId).toBe(s.inst("firstTarget").instanceId);

    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = 20;
    const nextTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("discarder3").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("host").topCard.instanceId === s.inst("secondTarget").instanceId);
    expect(s.perm("host").topCard.instanceId).toBe(s.inst("secondTarget").instanceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("discarded3").instanceId);
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextTurn;
  });

  it.each([
    ["exact Tsunomon", "BT11-006", 0],
    ["level 2 TS Digi-Egg", "BT24-003", 1],
  ])("digivolves from %s for cost 0", async (_label, baseCard, alternateRequirementIndex) => {
    const s = setupEngine({
      0: {
        breeding: { card: baseCard, as: "base" },
        hand: [{ card: "BT24-021", as: "snowGoblimon" }],
        deck: [{ card: "BT1-014", as: "evolutionDraw" }],
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("snowGoblimon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("snowGoblimon").instanceId);

    expect(s.state.memory).toBe(5);
    expect(s.perm("base").topCard.instanceId).toBe(s.inst("snowGoblimon").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("evolutionDraw").instanceId);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([s.inst("base").instanceId]);
  });

  it("uses the normal blue level-2 evolution route for cost 1", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT1-003", as: "blueEgg" },
        hand: [{ card: "BT24-021", as: "snowGoblimon" }],
        deck: [{ card: "BT1-015", as: "evolutionDraw" }],
      },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("blueEgg").permanentId,
        instanceId: s.inst("snowGoblimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("blueEgg").topCard.instanceId === s.inst("snowGoblimon").instanceId);

    expect(s.perm("blueEgg").topCard.instanceId).toBe(s.inst("snowGoblimon").instanceId);
    expect(s.state.memory).toBe(4);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("evolutionDraw").instanceId);
    expect(s.perm("blueEgg").stack.map((card) => card.instanceId)).toEqual([s.inst("blueEgg").instanceId]);
  });
});
