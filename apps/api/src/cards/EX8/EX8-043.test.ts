import { describe, expect, it } from "vitest";
import { EffectTiming, PlayerState } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "./index.js";
import "../ST2/ST2-16.js";
import { compiled } from "./EX8-043.js";

describe("EX8-043", () => {
  it("matches the exact entry, protection, Dinosaur, and inherited battle contract", () => {
    expect(compiled.digivolutionRequirement).toEqual([{ level: 4, traits: ["Dinosaur"], cost: 3, isAlternate: true }]);
    const onPlay = compiled.effects?.find((entry) => entry.trigger === "OnPlay");
    expect(onPlay?.actions).toEqual([
      {
        kind: "Suspend",
        optional: true,
        target: { filter: { controllerDefault: "any", kind: ["Digimon"] }, count: 1 },
        effectTextPart: "[On Play] [When Digivolving] You may suspend 1 Digimon.",
      },
      {
        kind: "DeDigivolve",
        amount: 1,
        condition: { kind: "selfIsSuspended", raw: "this Digimon is suspended" },
        target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
        effectTextPart:
          "Then, if this Digimon is suspended, ＜De-Digivolve1＞ 1 of your opponent's Digimon , and this Digimon isn't returned to hand or deck by an opponent's effect, and isn't affected by ＜De-Digivolve＞ effects until the end of your opponent's turn.",
      },
      {
        kind: "Restrict",
        restriction: "beReturned",
        byOpponentEffectsOnly: true,
        duration: "untilOpponentTurnEnd",
        condition: { kind: "selfIsSuspended", raw: "this Digimon is suspended" },
        target: { count: 1, isSelf: true, filter: { isSelfRef: true } },
      },
      {
        kind: "Restrict",
        restriction: "cantBeDeDigivolved",
        duration: "untilOpponentTurnEnd",
        condition: { kind: "selfIsSuspended", raw: "this Digimon is suspended" },
        target: { count: 1, isSelf: true, filter: { isSelfRef: true } },
      },
    ]);
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions).toEqual(onPlay?.actions);
    expect(compiled.effects?.find((entry) => entry.trigger === "Rule")?.actions[0]).toMatchObject({
      kind: "GrantStatic",
      grant: "trait",
      tokens: ["Dinosaur"],
      target: { count: 1, isSelf: true, filter: { isSelfRef: true } },
    });
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenDeletesInBattle",
          sourceFilter: { isSelfRef: true },
          actions: [{ kind: "SecurityManipulation", op: "trashTop", controller: "opponent", amount: 1 }],
        },
      ],
    });
  });

  it("suspends a legal Digimon through On Play and resolves the optional effect", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX8-043", as: "metal" }] },
        1: { battleArea: [{ card: "AD1-001", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("opponent").permanentId);
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("metal").instanceId })).toEqual({ ok: true });
    await settle(
      () =>
        player.battleArea.some((p) => p.topCard?.cardId === "EX8-043") &&
        s.state.players[1]!.battleArea[0]?.isSuspended === true,
    );

    expect(s.state.players[1]!.battleArea[0]?.isSuspended).toBe(true);
  });

  it("does not de-digivolve or protect itself when the optional suspension is declined", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX8-043", as: "metal" }] },
        1: { battleArea: [{ card: "AD1-001", as: "opponent", under: ["BT1-009"] }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("metal").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "EX8-043"));
    expect(s.perm("opponent").topCard?.cardId).toBe("AD1-001");
    expect(observe(s.engine).isRestricted(s.perm("metal"), "beReturned")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("metal"), "cantBeDeDigivolved")).toBe(false);
  });
  it("trashes the opponent's top security when its host deletes in battle", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-080", as: "attacker", dp: 10000, under: ["EX8-043"] }],
        deck: ["BT1-009", "BT1-009"],
      },
      1: {
        battleArea: [{ card: "BT1-016", as: "defender", dp: 1000, suspended: true }],
        security: [{ card: "BT1-010", as: "top" }],
      },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && s.state.players[1]!.security.length === 0);

    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("top").instanceId)).toBe(true);
  });

  it("trashes security only once across two real battles in one turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-080", as: "attacker", dp: 10000, under: ["EX8-043"] }],
        deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
      },
      1: {
        battleArea: [
          { card: "BT1-016", as: "first", dp: 1000, suspended: true },
          { card: "BT1-016", as: "second", dp: 1000, suspended: true },
          { card: "BT1-016", as: "third", dp: 1000, suspended: true },
        ],
        security: [
          { card: "BT1-010", as: "firstSecurity" },
          { card: "BT1-010", as: "secondSecurity" },
          { card: "BT1-010", as: "thirdSecurity" },
        ],
        deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
      },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("first").permanentId },
      }),
    ).toEqual({ ok: true });
    const firstId = s.perm("first").permanentId;
    await settle(() => s.state.players[1]!.battleArea.every((p) => p.permanentId !== firstId));
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === firstId)).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("firstSecurity").instanceId)).toBe(true);

    await advance(s.engine).verb.unsuspend([s.perm("attacker").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("second").permanentId },
      }),
    ).toEqual({ ok: true });
    const secondId = s.perm("second").permanentId;
    await settle(() => s.state.players[1]!.battleArea.every((p) => p.permanentId !== secondId));
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === secondId)).toBe(false);

    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("secondSecurity").instanceId)).toBe(
      false,
    );

    s.state.turnSeat = 1;
    s.state.memory = 3;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
    s.state.turnSeat = 0;
    s.state.memory = 3;
    const nextTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await advance(s.engine).verb.suspend([s.perm("third").permanentId]);
    await advance(s.engine).verb.unsuspend([s.perm("attacker").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("third").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[1]!.battleArea.every((p) => p.topCard?.instanceId !== s.inst("third").instanceId),
    );
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("secondSecurity").instanceId)).toBe(
      true,
    );
    expect(s.state.players[1]!.security.some((card) => card.instanceId === s.inst("thirdSecurity").instanceId)).toBe(
      true,
    );
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextTurn;
  });

  it("de-digivolves and protects itself when already suspended at entry resolution", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX8-043", as: "metal", suspended: true }] },
        1: { battleArea: [{ card: "AD1-001", as: "target", under: ["BT1-009"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("target").permanentId);
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("metal"));
    expect(s.perm("target").topCard.cardId).toBe("BT1-009");
    expect(observe(s.engine).isRestricted(s.perm("metal"), "beReturned")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("metal"), "cantBeDeDigivolved")).toBe(true);
  });

  it("blocks an opponent's real return and de-digivolution but allows its controller's return", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX8-043", as: "metal", suspended: true, under: ["BT1-071"] }],
        },
        1: {
          battleArea: [{ card: "BT1-028", as: "blueSource" }],
          hand: [
            { card: "EX8-049", as: "devolver" },
            { card: "ST2-16", as: "returnOption" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("metal"));
    expect(observe(s.engine).isRestricted(s.perm("metal"), "beReturned")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("metal"), "cantBeDeDigivolved")).toBe(true);

    s.state.turnSeat = 1;
    s.state.memory = 10;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("devolver").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.some((p) => p.topCard?.cardId === "EX8-049"));
    expect(s.perm("metal").topCard?.cardId).toBe("EX8-043");
    expect(s.perm("metal").stack).toHaveLength(1);

    s.state.memory = 10;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("returnOption").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("returnOption").instanceId));
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("returnOption").instanceId)).toBe(true);
    expect(s.perm("metal").topCard.cardId).toBe("EX8-043");
    expect(s.perm("metal").stack.map((card) => card.cardId)).toEqual(["BT1-071"]);
    expect(s.state.players[0]!.hand).toHaveLength(0);

    s.state.turnSeat = 0;
    await advance(s.engine).verb.returnToHand([s.perm("metal").topCard!.instanceId]);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "EX8-043")).toBe(true);
  });

  it("evolves from an off-color Dinosaur and continues after declining suspension when already suspended", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "AD1-001", as: "base", suspended: true }],
          hand: [{ card: "EX8-043", as: "metal" }],
          deck: ["BT1-045"],
        },
        1: { battleArea: [{ card: "AD1-001", as: "target", under: ["BT1-009"] }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("metal").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").topCard.cardId === "BT1-009");
    expect(s.perm("base").topCard.cardId).toBe("EX8-043");
    expect(s.perm("base").stack.map((card) => card.cardId)).toContain("AD1-001");
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-045"]);
    expect(s.perm("target").topCard.cardId).toBe("BT1-009");
    expect(s.perm("target").isSuspended).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("base"), "beReturned")).toBe(true);

    const invalid = setupEngine({
      0: { battleArea: [{ card: "BT1-037", as: "base" }], hand: [{ card: "EX8-043", as: "metal" }] },
    });
    await invalid.ready();
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("base").permanentId,
        instanceId: invalid.inst("metal").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("does not trash security when both battlers are deleted (Q3929)", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-080", as: "attacker", dp: 3000, under: ["EX8-043"] }] },
      1: {
        battleArea: [{ card: "BT1-016", as: "defender", dp: 3000, suspended: true }],
        security: [{ card: "BT1-010", as: "top" }],
      },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0 && s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("keeps suspension protections through its turn and expires them at the opponent turn end", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX8-043", as: "metal", suspended: true }], deck: ["BT1-045"] },
        1: { battleArea: [{ card: "AD1-001", as: "target", under: ["BT1-009"] }], deck: ["BT1-045"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("metal"));
    expect(observe(s.engine).isRestricted(s.perm("metal"), "beReturned")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("metal"), "cantBeDeDigivolved")).toBe(true);

    await advance(s.engine).runTurn(0);
    expect(observe(s.engine).isRestricted(s.perm("metal"), "beReturned")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("metal"), "cantBeDeDigivolved")).toBe(true);

    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    await advance(s.engine).runTurn(1);
    expect(observe(s.engine).isRestricted(s.perm("metal"), "beReturned")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("metal"), "cantBeDeDigivolved")).toBe(false);
  });
});
