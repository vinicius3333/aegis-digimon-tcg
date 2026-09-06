import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT20-020.js";
import "./BT20-071.js";
import "./BT20-080.js";
import "./BT20-086.js";
import "./BT20-048.js";
import "./BT20-051.js";
import "./index.js";

describe("BT20-020 Imperialdramon: Fighter Mode", () => {
  it("restricts opponent effect plays, conditionally trashes security, and deletes within source DP", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "WhenDigivolving")).toMatchObject({
      actions: [
        {
          kind: "RestrictPlay",
          seat: "opponent",
          filter: { kind: ["Digimon", "Tamer"] },
          mode: "play",
          byEffectOnly: true,
          duration: "untilOpponentTurnEnd",
        },
        {
          kind: "SecurityManipulation",
          op: "trashTop",
          controller: "opponent",
          amount: 1,
          condition: { kind: "selfDigivolutionStackHasTrait" },
        },
      ],
    });
    expect(compiled.effects.find((entry) => entry.trigger === "AllTurns")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSecurityRemoved",
          sourceFilter: { controller: "opponent" },
          actions: [
            {
              kind: "Delete",
              target: { filter: { controller: "opponent", dp: { op: "lte", relativeToSource: true } } },
            },
          ],
        },
      ],
    });
    expect(compiled.effects.filter((entry) => entry.keywords?.length)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ keywords: [expect.objectContaining({ keyword: "Raid" })] }),
        expect.objectContaining({ keywords: [expect.objectContaining({ keyword: "Piercing" })] }),
      ]),
    );
  });

  it("evolves from Dragon Mode for 2, trashes top security, and exposes Raid and Piercing", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT20-076", as: "dragonMode" }],
        hand: [{ card: "BT20-020", as: "fighterMode" }],
      },
      1: { security: ["BT1-010", "BT1-010"] },
    });
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("dragonMode").permanentId,
        instanceId: s.inst("fighterMode").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);
    expect(s.state.memory).toBe(0);
    expect(s.perm("dragonMode").stack.map((card) => card.cardId)).toContain("BT20-076");
    expect(observe(s.engine).hasKeyword(s.perm("dragonMode"), "Raid")).toBe(true);
    expect(observe(s.engine).hasPierce(s.perm("dragonMode"))).toBe(true);
  });

  it("prevents opponent effect plays while permitting ordinary Tamer play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-076", as: "dragonMode" }],
          hand: [{ card: "BT20-020", as: "fighterMode" }],
        },
        1: {
          battleArea: [{ card: "BT20-071", as: "soloogarmon" }],
          hand: [
            { card: "BT20-080", as: "fenriloogamon" },
            { card: "BT20-086", as: "ordinaryTamer" },
          ],
          trash: [{ card: "BT20-070", as: "blockedDigimon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("dragonMode").permanentId,
        instanceId: s.inst("fighterMode").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("dragonMode").topCard.cardId === "BT20-020");

    s.state.turnSeat = 1;
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("soloogarmon").permanentId,
        instanceId: s.inst("fenriloogamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("soloogarmon").topCard.cardId === "BT20-080");
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("blockedDigimon").instanceId);
    expect(
      s.state.players[1]!.battleArea.some(
        (permanent) => permanent.topCard.instanceId === s.inst("blockedDigimon").instanceId,
      ),
    ).toBe(false);

    // The restriction is by-effect only: an ordinary Tamer play remains legal.
    s.state.memory = 10;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("ordinaryTamer").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-086"));
  });

  it("expires the effect-play restriction after the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-076", as: "dragonMode" }],
          hand: [{ card: "BT20-020", as: "fighterMode" }],
          deck: ["BT1-010", "BT1-010"],
          security: ["BT1-010"],
        },
        1: {
          deck: ["BT1-010", "BT1-010"],
          security: [],
          battleArea: [{ card: "BT20-071", as: "soloogarmon" }],
          hand: [{ card: "BT20-080", as: "fenriloogamon" }],
          trash: [{ card: "BT20-070", as: "recoverable" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("dragonMode").permanentId,
        instanceId: s.inst("fighterMode").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("dragonMode").topCard.cardId === "BT20-020");

    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    const firstOpponent = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await firstOpponent;
    s.state.turnSeat = 0;
    s.state.memory = -s.state.memory;
    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;

    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    const secondOpponent = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("soloogarmon").permanentId,
        instanceId: s.inst("fenriloogamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("soloogarmon").topCard.cardId === "BT20-080");
    expect(
      s.state.players[1]!.battleArea.some(
        (permanent) => permanent.topCard.instanceId === s.inst("recoverable").instanceId,
      ),
    ).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(1);
    await secondOpponent;
  });

  it("blocks an opponent's Tamer-by-effect play during the lock, then permits it after real expiry", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-076", as: "dragonMode" }],
          hand: [{ card: "BT20-020", as: "fighterMode" }],
          deck: ["BT20-047", "BT20-047", "BT20-047"],
        },
        1: {
          battleArea: [
            { card: "BT20-048", as: "base1" },
            { card: "BT20-048", as: "base2" },
          ],
          hand: [
            { card: "BT20-051", as: "raptor1" },
            { card: "BT20-051", as: "raptor2" },
            { card: "BT7-090", as: "kota" },
          ],
          security: [],
          deck: ["BT20-047", "BT20-047", "BT20-047"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("dragonMode").permanentId,
        instanceId: s.inst("fighterMode").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("dragonMode").topCard.cardId === "BT20-020");

    s.state.turnSeat = 1;
    s.state.memory = 2;
    const lockedOpponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("base1").permanentId,
        instanceId: s.inst("raptor1").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base1").topCard.cardId === "BT20-051");
    expect(s.state.players[1]!.hand.some((card) => card.instanceId === s.inst("kota").instanceId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((perm) => perm.topCard.cardId === "BT7-090")).toBe(false);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await lockedOpponentTurn;

    s.state.turnSeat = 0;
    s.state.memory = -s.state.memory;
    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await ownTurn;
    s.state.turnSeat = 1;
    s.state.memory = 2;
    const expiredOpponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("base2").permanentId,
        instanceId: s.inst("raptor2").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((perm) => perm.topCard.cardId === "BT7-090"));
    expect(s.state.players[1]!.hand.some((card) => card.instanceId === s.inst("kota").instanceId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((perm) => perm.topCard.cardId === "BT7-090")).toBe(true);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await expiredOpponentTurn;
  });

  it("does not trash security when evolving from an ordinary level-5 source without Dragon Mode", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT20-014", as: "source" }], hand: [{ card: "BT20-020", as: "fighter" }] },
      1: { security: ["BT1-010", "BT1-010"] },
    });
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("fighter").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard.cardId === "BT20-020");
    expect(s.state.players[1]!.security).toHaveLength(2);
  });

  it("does not trigger when the opponent removes the turn player's security", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT20-020", as: "fighter" },
          { card: "BT20-014", as: "target" },
        ],
        security: ["BT1-010"],
      },
      1: { battleArea: [{ card: "BT20-047", as: "attacker" }], security: ["BT1-010"] },
    });
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 0);
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === s.perm("target").permanentId),
    ).toBe(true);
  });

  it("uses the security-removal deletion once per turn, then resets on the next turn", async () => {
    const s = setupEngine(
      {
        0: {
          deck: ["BT1-010", "BT1-010", "BT1-010"],
          security: ["BT1-010"],
          battleArea: [
            { card: "BT20-020", as: "fighter" },
            { card: "BT20-012", as: "attacker1" },
            { card: "BT20-012", as: "attacker2" },
          ],
        },
        1: {
          deck: ["BT1-010", "BT1-010", "BT1-010"],
          security: ["BT1-010", "BT1-010", "BT1-010"],
          battleArea: [
            { card: "BT20-014", dp: 5000, as: "target1" },
            { card: "BT20-014", dp: 5000, as: "target2" },
            { card: "BT20-014", dp: 5000, as: "target3" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const target1Id = s.perm("target1").permanentId;
    const target2Id = s.perm("target2").permanentId;
    const target3Id = s.perm("target3").permanentId;
    await s.ready();
    s.state.turnSeat = 0;
    s.state.memory = -s.state.memory;
    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker1").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 2);
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === target1Id));
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker2").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === target1Id)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === target2Id)).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;

    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
    s.state.turnSeat = 0;
    s.state.memory = -s.state.memory;
    const nextOwnTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker1").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === target2Id));
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === target2Id)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === target3Id)).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextOwnTurn;
  });

  it("once per turn deletes an opposing Digimon at the source-DP boundary after opponent security is removed", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT20-020", as: "fighterMode" }] },
        1: {
          battleArea: [
            { card: "BT20-014", dp: 13000, as: "boundary" },
            { card: "BT20-014", dp: 14000, as: "tooLarge" },
            { card: "BT20-014", dp: 7000, as: "secondEligible" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    const boundaryId = s.perm("boundary").permanentId;
    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 1 });
    await settle(() => !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === boundaryId));
    expect(s.perm("tooLarge")).toBeDefined();

    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 1 });
    await settle(() => false, 50);
    expect(s.perm("secondEligible")).toBeDefined();
  });
  it("naturally deletes an opposing Digimon after a security check within the source DP limit", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT20-020", as: "fighter" }] },
        1: {
          security: ["BT1-010"],
          battleArea: [
            { card: "BT20-014", dp: 10000, as: "eligible" },
            { card: "BT20-014", dp: 14000, as: "tooLarge" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("fighter").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !s.state.players[1]!.battleArea.some(
          (permanent) => permanent.topCard.cardId === "BT20-014" && permanent.baseDP === 10000,
        ),
    );
    expect(
      s.state.players[1]!.battleArea.some(
        (permanent) => permanent.topCard.cardId === "BT20-014" && permanent.baseDP === 14000,
      ),
    ).toBe(true);
  });
});
