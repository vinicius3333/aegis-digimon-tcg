import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX2-061.js";
import "./EX2-061.js";

const inertDeck = ["BT1-009", "BT1-010", "BT1-011"];
const inertSecurity = ["BT1-012"];

describe("EX2-061 Henry Wong", () => {
  it("matches the catalog and typed IR for every printed clause", () => {
    expect(getCardDefinition("EX2-061")).toMatchObject({
      cardId: "EX2-061",
      nameEn: "Henry Wong",
      colors: ["Green"],
      kinds: ["Tamer"],
      playCost: 4,
      dp: 0,
      evoCosts: [],
      rarity: "R",
      maxCountInDeck: 4,
      effectText:
        "[Start of Your Turn] If you have 2 memory or less, set your memory to 3.[Your Turn] When you attack with a Digimon with [Gargomon] or [Rapidmon] in its name, you may suspend this Tamer to suspend 1 of your opponent's Digimon.",
      securityEffectText: "[Security] Play this card without paying its memory cost.",
    });
    expect(compiled.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "StartOfYourTurn",
          actions: [
            {
              kind: "SetMemory",
              value: 3,
              condition: { kind: "memoryAtMost", value: 2, controller: "mine" },
            },
          ],
        }),
        expect.objectContaining({
          trigger: "YourTurn",
          actions: [
            expect.objectContaining({
              kind: "SubTrigger",
              event: "whenAttacking",
              sourceFilter: {
                controllerDefault: "mine",
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["Gargomon", "Rapidmon"], match: "name" }],
              },
              cost: {
                kind: "suspend",
                target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
                raw: "by suspending this Tamer",
              },
              optional: true,
              actions: [
                expect.objectContaining({
                  kind: "Suspend",
                  target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
                }),
              ],
            }),
          ],
        }),
        expect.objectContaining({
          trigger: "Security",
          isSecurity: true,
          actions: [
            {
              kind: "PlayWithoutCost",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              payCost: false,
            },
          ],
        }),
      ]),
    );
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("may suspend to suspend an opponent when Gargomon or Rapidmon attacks", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-027", as: "attacker" },
            { card: "EX2-061", as: "henry" },
          ],
        },
        1: { battleArea: [{ card: "EX2-014", as: "target" }], security: inertSecurity },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("henry").isSuspended && s.perm("target").isSuspended);
    expect(s.perm("henry").isSuspended).toBe(true);
    expect(s.perm("target").isSuspended).toBe(true);
  });

  it("also reacts when the attacker is Gargomon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-026", as: "attacker" },
            { card: "EX2-061", as: "henry" },
          ],
          deck: inertDeck,
          security: inertSecurity,
        },
        1: { battleArea: [{ card: "EX2-014", as: "target" }], deck: inertDeck, security: inertSecurity },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("henry").isSuspended && s.perm("target").isSuspended);
    expect(s.perm("henry").isSuspended).toBe(true);
    expect(s.perm("target").isSuspended).toBe(true);
  });

  it("does not react to an attack from a nonmatching Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-050", as: "attacker" },
            { card: "EX2-061", as: "henry" },
          ],
          deck: inertDeck,
          security: inertSecurity,
        },
        1: { battleArea: [{ card: "EX2-014", as: "target" }], deck: inertDeck, security: inertSecurity },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.perm("henry").isSuspended).toBe(false);
    expect(s.perm("target").isSuspended).toBe(false);
  });

  it("sets memory at Start of Your Turn only at 2 or less", async () => {
    const eligible = setupEngine({
      0: { battleArea: [{ card: "EX2-061", as: "henry" }], deck: inertDeck, security: inertSecurity },
    });
    eligible.state.memory = 2;
    await eligible.ready();
    const eligibleTurn = eligible.engine.runOneTurn();
    await advance(eligible.engine).waitForMainPhase(0);
    expect(eligible.state.memory).toBe(3);
    advance(eligible.engine).endMainPhaseIfOpen(0);
    await eligibleTurn;

    const boundary = setupEngine({
      0: { battleArea: [{ card: "EX2-061", as: "henry" }], deck: inertDeck, security: inertSecurity },
    });
    boundary.state.memory = 3;
    await boundary.ready();
    const boundaryTurn = boundary.engine.runOneTurn();
    await advance(boundary.engine).waitForMainPhase(0);
    expect(boundary.state.memory).toBe(3);
    advance(boundary.engine).endMainPhaseIfOpen(0);
    await boundaryTurn;
  });

  it("keeps Henry and the target unchanged when the suspension is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-027", as: "attacker" },
            { card: "EX2-061", as: "henry" },
          ],
        },
        1: { battleArea: [{ card: "EX2-014", as: "target" }], security: inertSecurity },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.perm("henry").isSuspended).toBe(false);
    expect(s.perm("target").isSuspended).toBe(false);
  });

  it("plays EX2-061 from Security without paying its cost", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX2-050", as: "attacker" }], deck: inertDeck, security: inertSecurity },
      1: { deck: inertDeck, security: [{ card: "EX2-061", as: "securityHenry" }, ...inertSecurity] },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("securityHenry").instanceId),
    );
    expect(
      s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("securityHenry").instanceId),
    ).toBe(true);
    expect(s.state.memory).toBe(5);
  });
});
