import { describe, expect, it } from "vitest";
import { EffectTiming, getCardDefinition, Zone } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-066.js";
import "../index.js";

describe("BT26-066 Salamon", () => {
  it("matches the catalog and preserves both Titan trash-digivolve windows", () => {
    expect(getCardDefinition("BT26-066")).toMatchObject({
      nameEn: "Salamon",
      colors: ["Purple"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 2000,
      types: ["Mammal", "Titan", "TS"],
    });
    expect(compiled.digivolutionRequirement).toEqual([{ level: 2, traits: ["TS"], cost: 0, isAlternate: true }]);
    expect(compiled.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "StartOfYourMainPhase",
          actions: [
            expect.objectContaining({
              kind: "Digivolve",
              from: ["trash"],
              payCost: true,
              useAlternateCost: true,
              costDelta: -2,
              optional: true,
              condition: { kind: "zoneCount", seat: "mine", zone: "hand", op: "lte", value: 5 },
            }),
          ],
        }),
        expect.objectContaining({
          trigger: "YourTurn",
          isInherited: true,
          actions: [
            expect.objectContaining({
              kind: "SubTrigger",
              event: "whenHandTrashed",
              actions: [
                expect.objectContaining({
                  kind: "Digivolve",
                  from: ["trash"],
                  payCost: true,
                  useAlternateCost: true,
                  costDelta: -1,
                  optional: true,
                  target: expect.objectContaining({
                    filter: expect.objectContaining({ nameOrTrait: [{ tokens: ["Titan"], match: "trait" }] }),
                  }),
                }),
              ],
            }),
          ],
        }),
      ]),
    );
    expect(JSON.stringify(compiled)).not.toContain("ignoreRequirements");
  });

  it("publicly digivolves a Titan into a Titan from trash when the hand has five or fewer cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-042", as: "titanHost" },
            { card: "BT26-066", as: "salamon" },
          ],
          trash: [{ card: "BT26-059", as: "trashTitan" }],
          hand: [{ card: "BT1-001", as: "handCard" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("salamon"));

    expect(s.perm("titanHost").topCard.cardId).toBe("BT26-059");
    expect(s.state.memory).toBe(3);
  });

  it("does not offer the start-main evolution when the hand has 6 cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-042", as: "titanHost" },
            { card: "BT26-066", as: "salamon" },
          ],
          trash: [{ card: "BT26-059", as: "trashTitan" }],
          hand: Array.from({ length: 6 }, (_, index) => ({ card: "BT1-009", as: `hand${index}` })),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("salamon"));

    expect(s.perm("titanHost").topCard.cardId).toBe("BT26-042");
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("BT26-059");
    expect(s.state.memory).toBe(5);
  });

  it("does not target a non-Titan Digimon for the start-main evolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT10-080", as: "nonTitanHost" },
            { card: "BT26-066", as: "salamon" },
          ],
          trash: [{ card: "BT26-059", as: "trashTitan" }],
          hand: [{ card: "BT1-001", as: "handCard" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("salamon"));

    expect(s.perm("nonTitanHost").topCard.cardId).toBe("BT10-080");
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("BT26-059");
    expect(s.state.memory).toBe(5);
  });

  it("allows the inherited trash evolution only when its host has the Titan trait", async () => {
    const titan = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-074", as: "host", under: ["BT26-066", "BT26-068"] }],
          trash: [{ card: "P-209", as: "titamon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    titan.state.memory = 2;
    await titan.ready();
    await advance(titan.engine).fireSubTrigger("whenHandTrashed", { handTrashedSeat: 0, byEffectSeat: 0 });
    expect(titan.perm("host").topCard.cardId).toBe("P-209");
    expect(titan.state.memory).toBe(0);

    const nonTitan = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-067", as: "host", under: ["BT26-066"] }],
          trash: [{ card: "P-209", as: "titamon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    nonTitan.state.memory = 10;
    await nonTitan.ready();
    await advance(nonTitan.engine).fireSubTrigger("whenHandTrashed", { handTrashedSeat: 0, byEffectSeat: 0 });
    expect(nonTitan.perm("host").topCard.cardId).toBe("BT26-067");
    expect(nonTitan.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("P-209");
  });

  it("reacts when an opponent's effect trashes its controller's hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-074", as: "host", under: ["BT26-066", "BT26-068"] }],
          trash: [{ card: "P-209", as: "titamon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenHandTrashed", { handTrashedSeat: 0, byEffectSeat: 1 });

    expect(s.perm("host").topCard.cardId).toBe("P-209");
    expect(s.state.memory).toBe(0);
  });

  it("shares one inherited once-per-turn budget across repeated hand-trash events", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-021", as: "host", under: ["BT26-066"] }],
          trash: [{ card: "BT26-074", as: "firstEvolution" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenHandTrashed", { handTrashedSeat: 0, byEffectSeat: 0 });
    expect(s.perm("host").topCard.cardId).toBe("BT26-074");
    s.give(0, Zone.Trash, { card: "P-209", as: "secondEvolution" });
    await advance(s.engine).fireSubTrigger("whenHandTrashed", { handTrashedSeat: 0, byEffectSeat: 0 });

    expect(s.perm("host").topCard.cardId).toBe("BT26-074");
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(
      s.inst("secondEvolution").instanceId,
    );
    expect(s.state.memory).toBe(2);
  });

  it("Q7089 does not retroactively trigger Alliance after evolving during an attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT24-075",
              as: "attacker",
              under: ["BT26-066", "BT26-068"],
            },
            { card: "BT1-009", as: "alliancePartner" },
          ],
          trash: [{ card: "P-209", as: "titamon" }],
          deck: [{ card: "BT1-010", as: "drawnAndTrashed" }],
        },
        1: { security: 3 },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("attacker").topCard.cardId === "P-209" &&
        s.state.players[1]!.security.length < 3 &&
        s.state.pendingDecision === undefined,
    );

    expect(s.perm("alliancePartner").isSuspended).toBe(false);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(
      s.inst("drawnAndTrashed").instanceId,
    );
  });
});
