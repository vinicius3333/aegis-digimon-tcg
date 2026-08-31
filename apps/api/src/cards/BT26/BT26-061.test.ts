import { describe, expect, it } from "vitest";
import { EffectTiming, digivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-061.js";
import "../index.js";
describe("BT26-061 Chiropmon", () => {
  it("matches the catalog and compiles both reveal slots plus inherited draw/trash", () => {
    expect(getCardDefinition("BT26-061")).toMatchObject({
      nameEn: "Chiropmon",
      colors: ["Purple"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 2000,
      types: ["Mammal", "Glowing Dawn", "BEATBREAK"],
    });
    expect(digivolutionRequirementsFor("BT26-061")).toContainEqual({
      level: 2,
      traits: ["Glowing Dawn"],
      cost: 0,
      isAlternate: true,
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]?.actions[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 3,
      add: [
        { count: 1, filter: { nameOrTrait: [{ tokens: ["Glowing Dawn"], match: "trait" }] } },
        {
          count: 1,
          filter: { colors: ["Purple"], nameOrTrait: [{ tokens: ["BEATBREAK"], match: "trait" }] },
        },
      ],
      rest: "deckBottom",
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
    });
  });

  it("never adds the same revealed card twice when it qualifies for both slots", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT26-061", as: "played" }],
          deck: [
            { card: "BT26-061", as: "bothTraits" },
            { card: "BT1-009", as: "firstRest" },
            { card: "BT1-010", as: "secondRest" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.deck.length === 2);

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("bothTraits").instanceId]);
  });

  it("requires the BEATBREAK slot to be purple", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT26-061", as: "played" }],
          deck: [
            { card: "BT25-046", as: "selectedDawn" },
            { card: "BT25-035", as: "offColorBeatbreak" },
            { card: "BT25-079", as: "purpleBeatbreak" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.length === 2);

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("selectedDawn").instanceId, s.inst("purpleBeatbreak").instanceId]),
    );
    expect(
      s.decisions.filter(({ req }) => req.kind === "selectCards").at(-1)?.req.options?.candidateInstanceIds,
    ).not.toContain(s.inst("offColorBeatbreak").instanceId);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("offColorBeatbreak").instanceId,
    ]);
  });

  it("digivolves for 0 from a differently colored level 2 Glowing Dawn card", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT25-003", as: "base" }],
        hand: [{ card: "BT26-061", as: "chiropmon" }],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("chiropmon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT26-061");

    expect(s.state.memory).toBe(0);
    expect(s.perm("base").stack.at(-1)?.cardId).toBe("BT25-003");
  });
  it("adds Glowing Dawn and purple BEATBREAK cards, bottoming the rest", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT26-061", as: "chirop" }],
          deck: [
            { card: "BT25-035", as: "dawn" },
            { card: "BT25-079", as: "beatbreak" },
            { card: "BT1-009", as: "rest" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("chirop").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.deck.length === 1);
    expect(s.state.players[0]!.hand.map((c) => c.cardId).sort()).toEqual(["BT25-035", "BT25-079"]);
    expect(s.state.players[0]!.deck.map((c) => c.cardId)).toEqual(["BT1-009"]);
  });
  it("draws and then trashes for its inherited attack effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-074", as: "host", under: ["BT26-061"] }],
          deck: [{ card: "AD1-001", as: "drawn" }],
        },
        1: { security: ["AD1-002"] },
      },
      { autoSelectCards: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("drawn").instanceId));

    expect(s.state.players[0]!.hand).toHaveLength(0);
  });

  it("spends the inherited once-per-turn budget after the first attack trigger", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-074", as: "host", under: ["BT26-061"] }],
          deck: [
            { card: "AD1-001", as: "firstDraw" },
            { card: "AD1-002", as: "secondDraw" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));

    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([s.inst("secondDraw").instanceId]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("firstDraw").instanceId);
  });
});
