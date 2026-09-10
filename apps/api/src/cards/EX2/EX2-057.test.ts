import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX2-057.js";
import "./EX2-057.js";
import "./EX2-014.js";
import "./EX2-018.js";
import "./EX2-050.js";

const inertDeck = ["BT1-009", "BT1-013", "BT1-009", "BT1-013"];
const inertSecurity = ["BT1-009", "BT1-013", "BT1-009"];

describe("EX2-057 Kenta Kitagawa", () => {
  it("matches the catalog and compiled replacement, sub-triggers, and Security clause", () => {
    expect(getCardDefinition("EX2-057")).toMatchObject({
      cardId: "EX2-057",
      nameEn: "Kenta Kitagawa",
      colors: ["Blue"],
      kinds: ["Tamer"],
      playCost: 2,
      dp: 0,
      evoCosts: [],
      rarity: "U",
      maxCountInDeck: 4,
      effectText:
        "[Your Turn] When you would play a [MarineAngemon] from your hand, reduce its play cost by 1.[Your Turn] When you play a blue Digimon, you may suspend this Tamer to trash the bottom digivolution card of 1 of your opponent's Digimon. Then, if the Digimon played is [MarineAngemon], trash the bottom digivolution card of all of your opponent's Digimon.",
      securityEffectText: "[Security] Play this card without paying its memory cost.",
    });
    expect(compiled.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "YourTurn",
          actions: expect.arrayContaining([
            expect.objectContaining({
              kind: "Replacement",
              event: "wouldBePlayed",
              sourceFilter: {
                controllerDefault: "mine",
                nameOrTrait: [{ tokens: ["MarineAngemon"], match: "name" }],
              },
              actions: expect.arrayContaining([
                expect.objectContaining({
                  kind: "Replacement",
                  event: "wouldBePlayed",
                  mode: "reduceCost",
                  amount: 1,
                  raw: "reduce its play cost by 1",
                }),
              ]),
            }),
          ]),
        }),
        expect.objectContaining({
          trigger: "YourTurn",
          actions: expect.arrayContaining([
            expect.objectContaining({
              kind: "SubTrigger",
              event: "whenPlayed",
              sourceFilter: {
                controllerDefault: "mine",
                kind: ["Digimon"],
                colors: ["Blue"],
                nameOrTrait: [{ tokens: ["MarineAngemon"], match: "nameExact" }],
              },
              actions: expect.arrayContaining([
                expect.objectContaining({
                  kind: "TrashDigivolution",
                  target: {
                    filter: { controller: "opponent", kind: ["Digimon"], digivolutionCards: "hasAny" },
                    count: 1,
                  },
                  amount: 1,
                  fromTop: false,
                  cost: {
                    kind: "suspend",
                    target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
                    raw: "by suspending this Tamer",
                  },
                  optional: true,
                  abortOnDecline: false,
                }),
                expect.objectContaining({
                  kind: "TrashDigivolution",
                  target: {
                    filter: { controller: "opponent", kind: ["Digimon"], digivolutionCards: "hasAny" },
                    count: "all",
                  },
                  amount: 1,
                  fromTop: false,
                  condition: { kind: "ifThisEffectActed" },
                }),
              ]),
            }),
            expect.objectContaining({
              kind: "SubTrigger",
              event: "whenPlayed",
              sourceFilter: {
                controllerDefault: "mine",
                kind: ["Digimon"],
                colors: ["Blue"],
                nameOrTrait: [{ tokens: ["MarineAngemon"], match: "nameExact", negate: true }],
              },
              actions: expect.arrayContaining([
                expect.objectContaining({
                  kind: "TrashDigivolution",
                  target: {
                    filter: { controller: "opponent", kind: ["Digimon"], digivolutionCards: "hasAny" },
                    count: 1,
                  },
                  amount: 1,
                  fromTop: false,
                  cost: {
                    kind: "suspend",
                    target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
                    raw: "by suspending this Tamer",
                  },
                  optional: true,
                  abortOnDecline: true,
                }),
              ]),
            }),
          ]),
        }),
        expect.objectContaining({
          trigger: "Security",
          isSecurity: true,
          actions: expect.arrayContaining([
            expect.objectContaining({
              kind: "PlayWithoutCost",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              payCost: false,
            }),
          ]),
        }),
      ]),
    );
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("may suspend when a blue Digimon is played to trash an opposing bottom source", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-057", as: "kenta" }],
          hand: [{ card: "EX2-014", as: "blue" }],
          deck: inertDeck,
          security: inertSecurity,
        },
        1: {
          battleArea: [
            { card: "EX2-021", as: "target", under: ["EX2-003", "EX2-004"] },
            { card: "EX2-021", as: "untouched", under: ["EX2-003", "EX2-004"] },
          ],
          deck: inertDeck,
          security: inertSecurity,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("blue").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("kenta").isSuspended && s.perm("target").stack.length === 1);
    expect(s.perm("kenta").isSuspended).toBe(true);
    expect(s.perm("target").stack).toHaveLength(1);
    expect(s.perm("untouched").stack).toHaveLength(2);
  });

  it("also trashes the bottom source of every opposing Digimon when MarineAngemon is played", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-057", as: "kenta" }],
          hand: [{ card: "EX2-018", as: "marineAngemon" }],
          deck: inertDeck,
          security: inertSecurity,
        },
        1: {
          battleArea: [
            { card: "EX2-021", as: "first", under: ["EX2-003", "EX2-004", "EX2-005"] },
            { card: "EX2-021", as: "second", under: ["EX2-003", "EX2-004", "EX2-005"] },
          ],
          deck: inertDeck,
          security: inertSecurity,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 20;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("marineAngemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("kenta").isSuspended && s.perm("second").stack.length === 2);
    expect(s.perm("first").stack).toHaveLength(1);
    expect(s.perm("second").stack).toHaveLength(2);
  });

  it("reduces only a MarineAngemon played from hand by 1", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX2-057", as: "kenta" }],
        hand: [{ card: "EX2-018", as: "marine" }],
        deck: inertDeck,
        security: inertSecurity,
      },
      1: { deck: inertDeck, security: inertSecurity },
    });
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("marine").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("marine").instanceId),
    );
    expect(s.state.memory).toBe(0);
  });

  it("accumulates one passive reduction per matching Kenta watcher", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX2-057", as: "firstKenta" },
          { card: "EX2-057", as: "secondKenta" },
        ],
        hand: [{ card: "EX2-018", as: "marine" }],
        deck: inertDeck,
        security: inertSecurity,
      },
      1: { deck: inertDeck, security: inertSecurity },
    });
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("marine").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("marine").instanceId),
    );
    expect(s.state.memory).toBe(1);
  });

  it("does not reduce another blue Digimon and can decline the suspension cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-057", as: "kenta" }],
          hand: [{ card: "EX2-014", as: "blue" }],
          deck: inertDeck,
          security: inertSecurity,
        },
        1: {
          battleArea: [{ card: "EX2-021", as: "target", under: ["EX2-003", "EX2-004"] }],
          deck: inertDeck,
          security: inertSecurity,
        },
      },
      { autoDeclineOptional: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("blue").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("blue").instanceId));
    expect(s.state.memory).toBe(6);
    expect(s.perm("kenta").isSuspended).toBe(false);
    expect(s.perm("target").stack).toHaveLength(2);
  });

  it("plays from Security without paying its cost", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX2-050", as: "attacker" }], deck: inertDeck, security: inertSecurity },
      1: { deck: inertDeck, security: [{ card: "EX2-057", as: "securityKenta" }, ...inertSecurity] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("securityKenta").instanceId),
    );
    expect(
      s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("securityKenta").instanceId),
    ).toBe(true);
  });
});
