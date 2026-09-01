import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor, EffectTiming, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-065.js";
import "../index.js";
describe("BT26-065 Falcomon", () => {
  it("matches the catalog and compiles both reveal slots with the purple restriction", () => {
    expect(getCardDefinition("BT26-065")).toMatchObject({
      nameEn: "Falcomon",
      colors: ["Purple"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 1000,
      types: ["Avian", "DATA SQUAD"],
    });
    expect(digivolutionRequirementsFor("BT26-065")).toContainEqual({
      level: 2,
      traits: ["DATA SQUAD"],
      cost: 0,
      isAlternate: true,
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]?.actions[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 3,
      add: [
        {
          count: 1,
          filter: {
            nameOrTrait: [
              { tokens: ["Keenan Crier"], match: "nameExact" },
              { tokens: ["DATA SQUAD"], match: "trait" },
            ],
          },
        },
        {
          count: 1,
          filter: {
            colors: ["Purple"],
            nameOrTrait: [
              { tokens: ["Ravemon"], match: "name" },
              { tokens: ["Avian"], match: "trait" },
              { tokens: ["Bird"], match: "trait" },
            ],
          },
        },
      ],
      rest: "deckBottom",
    });
  });
  it("keeps the inherited draw then hand-trash sequence", () => {
    expect(compiled.effects[1]).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [{ kind: "Draw" }, { kind: "Trash", optional: false }],
    });
  });

  it("publicly adds a Keenan and a purple Ravemon from the top three and bottoms the rest", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT26-065", as: "falcomon" }],
          deck: [
            { card: "BT26-094", as: "keenan" },
            { card: "BT13-089", as: "ravemon" },
            { card: "BT1-009", as: "rest" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("falcomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.deck.length === 1);

    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId).sort()).toEqual(["BT13-089", "BT26-094"]);
    expect(s.state.players[0]!.deck[0]?.cardId).toBe("BT1-009");
  });

  it("Q7088 applies the purple requirement to Ravemon, Avian, and Bird candidates", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-065", as: "falcomon" }],
          deck: [
            { card: "BT26-094", as: "keenan" },
            { card: "BT1-013", as: "offColorAvian" },
            { card: "BT10-072", as: "purpleAvian" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("falcomon"));

    const secondSlot = s.decisions.filter(({ req }) => req.kind === "selectCards").at(-1)?.req;
    expect(secondSlot?.options?.candidateInstanceIds).toContain(s.inst("purpleAvian").instanceId);
    expect(secondSlot?.options?.candidateInstanceIds).not.toContain(s.inst("offColorAvian").instanceId);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([s.inst("offColorAvian").instanceId]);
  });

  it("never adds one Falcomon twice when it qualifies for both reveal slots", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-065", as: "falcomon" }],
          deck: [
            { card: "BT26-065", as: "bothSlots" },
            { card: "BT1-009", as: "firstRest" },
            { card: "BT1-010", as: "secondRest" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("falcomon"));

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("bothSlots").instanceId]);
    expect(s.state.players[0]!.deck).toHaveLength(2);
  });

  it("adds an exact Keenan Crier name match even without the DATA SQUAD trait", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-065", as: "falcomon" }],
          deck: [
            { card: "EX4-064", as: "exactName" },
            { card: "BT1-009", as: "restOne" },
            { card: "BT1-010", as: "restTwo" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("falcomon"));
    await settle(() => s.state.players[0]!.deck.length === 2);

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("exactName").instanceId]);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("restOne").instanceId,
      s.inst("restTwo").instanceId,
    ]);
  });

  it("digivolves for 0 from a differently colored level 2 DATA SQUAD card", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT25-002", as: "base" }],
        hand: [{ card: "BT26-065", as: "falcomon" }],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("falcomon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT26-065");

    expect(s.state.memory).toBe(0);
  });

  it("draws before the mandatory inherited hand trash and only once per turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-072", as: "host", under: ["BT26-065"] }],
          deck: [
            { card: "AD1-001", as: "firstDraw" },
            { card: "AD1-002", as: "secondDraw" },
          ],
        },
        1: { security: ["BT1-009", "BT1-010"] },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    for (let attack = 0; attack < 2; attack += 1) {
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("host").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.events.filter((event) => event.kind === "combatResolved").length === attack + 1);
      if (attack === 0) await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    }

    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("firstDraw").instanceId);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([s.inst("secondDraw").instanceId]);
  });
});
