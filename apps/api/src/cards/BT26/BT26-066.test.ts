import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-066.js";
import "../index.js";

async function enterStartMain(s: ReturnType<typeof setupEngine>): Promise<void> {
  const loop = s.engine.startTurnLoop();
  await advance(s.engine).waitForMainPhase(0);
  expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
  await loop;
}

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
    const inherited = compiled.effects.find((effect) => effect.isInherited);
    expect(inherited?.actions?.[0]).toMatchObject({
      kind: "SubTrigger",
      actions: [
        {
          kind: "Digivolve",
          into: {
            nameOrTrait: expect.arrayContaining([{ tokens: ["Titamon"], match: "nameExact" }]),
          },
        },
      ],
    });
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
          hand: [{ card: "BT1-009", as: "handCard" }],
          deck: ["BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await enterStartMain(s);

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
          deck: ["BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await enterStartMain(s);

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
          hand: [{ card: "BT1-009", as: "handCard" }],
          deck: ["BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await enterStartMain(s);

    expect(s.perm("nonTitanHost").topCard.cardId).toBe("BT10-080");
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("BT26-059");
    expect(s.state.memory).toBe(5);
  });

  it("allows the inherited trash evolution only when its host has the Titan trait", async () => {
    const titan = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-074", as: "host", under: ["BT26-066", "BT26-021"] }],
          trash: [{ card: "P-209", as: "titamon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    titan.state.memory = 2;
    expect(compiled.effects.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "YourTurn",
      frequency: "OncePerTurn",
      actions: [{ kind: "SubTrigger", event: "whenHandTrashed" }],
    });

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
    expect(compiled.effects.find((effect) => effect.isInherited)?.actions?.[0]).toMatchObject({
      actions: [{ kind: "Digivolve", target: { filter: { isSelfRef: true } } }],
    });
  });

  it("reacts when an opponent's effect trashes its controller's hand", async () => {
    expect(compiled.effects.find((effect) => effect.isInherited)?.actions?.[0]).toMatchObject({
      actions: [{ kind: "Digivolve", from: ["trash"], costDelta: -1 }],
    });
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
    expect(compiled.effects.find((effect) => effect.isInherited)?.frequency).toBe("OncePerTurn");
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
        1: { security: ["BT1-009", "BT1-010", "BT1-011"] },
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
