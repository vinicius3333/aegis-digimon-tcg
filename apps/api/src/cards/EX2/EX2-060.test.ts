import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX2-060.js";
import "./EX2-060.js";
import "./EX2-019.js";
import "../P/P-095.js";
import "./EX2-050.js";

const inertDeck = ["BT1-009", "BT1-013", "BT1-009", "BT1-013", "BT1-009"];
const inertSecurity = ["BT1-009", "BT1-013", "BT1-009"];

describe("EX2-060 Rika Nonaka", () => {
  it("matches the catalog and compiled Start, attack, and Security clauses", () => {
    expect(getCardDefinition("EX2-060")).toMatchObject({
      cardId: "EX2-060",
      nameEn: "Rika Nonaka",
      colors: ["Yellow"],
      kinds: ["Tamer"],
      playCost: 4,
      dp: 0,
      evoCosts: [],
      rarity: "R",
      maxCountInDeck: 4,
      effectText:
        "[Start of Your Turn] If you have 2 memory or less, set your memory to 3.[Your Turn] When you attack with a Digimon with [Renamon], [Kyubimon], [Taomon], or [Sakuyamon] in its name, you may suspend this Tamer to use 1 Option card with [Plug-In] in its name from your hand without paying its memory cost.",
      securityEffectText: "[Security] Play this card without paying its memory cost.",
    });
    expect(compiled.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "StartOfYourTurn",
          actions: expect.arrayContaining([
            expect.objectContaining({
              kind: "SetMemory",
              value: 3,
              condition: { kind: "memoryAtMost", value: 2 },
            }),
          ]),
        }),
        expect.objectContaining({
          trigger: "YourTurn",
          actions: expect.arrayContaining([
            expect.objectContaining({
              kind: "SubTrigger",
              event: "whenAttacking",
              sourceFilter: {
                controller: "mine",
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["Renamon", "Kyubimon", "Taomon", "Sakuyamon"], match: "name" }],
              },
              cost: {
                kind: "suspend",
                target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
                raw: "by suspending this Tamer",
              },
              optional: true,
              actions: expect.arrayContaining([
                expect.objectContaining({
                  kind: "UseOptionWithoutCost",
                  filter: {
                    controller: "mine",
                    kind: ["Option"],
                    nameOrTrait: [{ tokens: ["Plug-In"], match: "name" }],
                  },
                  from: ["hand"],
                  payCost: false,
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

  it("sets memory to 3 at Start of Your Turn only when memory is 2 or less", async () => {
    const eligible = setupEngine({
      0: {
        battleArea: [{ card: "EX2-060", as: "rika" }],
        deck: [{ card: "BT1-009", as: "drawn" }, ...inertDeck],
        security: inertSecurity,
      },
      1: { deck: inertDeck, security: inertSecurity },
    });
    eligible.state.memory = 2;
    await eligible.ready();
    const eligibleTurn = eligible.engine.runOneTurn();
    await advance(eligible.engine).waitForMainPhase(0);
    expect(eligible.state.memory).toBe(3);
    advance(eligible.engine).endMainPhaseIfOpen(0);
    await eligibleTurn;

    const boundary = setupEngine({
      0: { battleArea: [{ card: "EX2-060", as: "rika" }], deck: inertDeck, security: [...inertSecurity, "BT1-013"] },
      1: { deck: inertDeck, security: inertSecurity },
    });
    boundary.state.memory = 3;
    await boundary.ready();
    const boundaryTurn = boundary.engine.runOneTurn();
    await advance(boundary.engine).waitForMainPhase(0);
    expect(boundary.state.memory).toBe(3);
    advance(boundary.engine).endMainPhaseIfOpen(0);
    await boundaryTurn;
  });

  it("suspends Rika and uses a matching Plug-In Option when Renamon attacks", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-019", as: "renamon" },
            { card: "EX2-060", as: "rika" },
          ],
          hand: [{ card: "P-095", as: "plugIn" }],
          deck: inertDeck,
          security: inertSecurity,
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }], deck: inertDeck, security: inertSecurity },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    const plugInId = s.inst("plugIn").instanceId;
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("renamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.perm("rika").isSuspended && !s.state.players[0]!.hand.some((card) => card.instanceId === plugInId),
    );
    expect(s.perm("rika").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).not.toContain(plugInId);
  });

  it("does not use the Plug-In Option when Rika is already suspended", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-019", as: "renamon" },
            { card: "EX2-060", as: "rika", suspended: true },
          ],
          hand: [{ card: "P-095", as: "plugIn" }],
          deck: inertDeck,
          security: inertSecurity,
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }], deck: inertDeck, security: inertSecurity },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    const plugInId = s.inst("plugIn").instanceId;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("renamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(plugInId);
  });

  it("plays Rika from Security without paying its cost", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX2-050", as: "attacker" }], deck: inertDeck, security: inertSecurity },
      1: { deck: inertDeck, security: [{ card: "EX2-060", as: "securityRika" }, ...inertSecurity] },
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
      s.state.players[1]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("securityRika").instanceId),
    );
    expect(s.state.players[1]!.battleArea.map((perm) => perm.topCard?.instanceId)).toContain(
      s.inst("securityRika").instanceId,
    );
  });
});
