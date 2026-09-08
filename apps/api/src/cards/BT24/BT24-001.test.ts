import { EffectTiming, Phase, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { internalsOf } from "../../engine/testkit/internals.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT24-001.js";
import "../index.js";

describe("BT24-001 Gigimon", () => {
  it("matches the catalog identity", () => {
    expect(getCardDefinition("BT24-001")).toMatchObject({
      cardId: "BT24-001",
      nameEn: "Gigimon",
      colors: ["Red"],
      kinds: ["DigiEgg"],
      level: 2,
      types: ["Lesser", "LIBERATOR"],
    });
  });

  it("may delete an opponent's 3000-DP-or-less Digimon when their security is removed", () => {
    const inherited = compiled.effects.find((effect) => effect.isInherited) as any;
    expect(inherited.frequency).toBe("OncePerTurn");
    expect(inherited.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenSecurityRemoved",
      sourceFilter: { controller: "opponent" },
      fireCondition: { kind: "triggerRemovedSecuritySeat", seat: "opponent" },
    });
    expect(inherited.actions[0].actions[0]).toMatchObject({
      kind: "Delete",
      optional: true,
      target: { filter: { controller: "opponent", dp: { op: "lte", value: 3000 } } },
    });
  });

  it("deletes an opposing 3000-DP Digimon from an evolution stack only once per turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-009", as: "host", under: ["BT24-001"] }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "boundary", dp: 3000 },
            { card: "BT1-009", as: "second", dp: 2000 },
            { card: "BT1-009", as: "tooLarge", dp: 4000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 10;
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("host"));

    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 0 });
    expect(s.state.players[1]!.battleArea).toHaveLength(3);

    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 1 });
    expect(s.state.players[1]!.battleArea).toHaveLength(2);
    expect(
      s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === s.perm("tooLarge").permanentId),
    ).toBe(true);

    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 1 });
    expect(s.state.players[1]!.battleArea).toHaveLength(2);
  });

  it("does nothing when the optional deletion is declined", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT24-014", as: "host", under: ["BT24-001"] }] },
        1: {
          security: [{ card: "BT1-009", as: "checked" }],
          battleArea: [{ card: "BT1-009", as: "target", dp: 3000 }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("checked").instanceId)).toBe(true);
  });

  it("handles opponent security removal through the production trash primitive", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-009", as: "host", under: ["BT24-001"] }] },
        1: {
          security: [{ card: "BT1-010", as: "removed" }],
          battleArea: [{ card: "BT1-009", as: "target", dp: 3000 }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.trashFromSecurity(1, 1);

    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("triggers from a public attack and security check", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-009", as: "attacker", under: ["BT24-001"] }] },
        1: { security: ["BT1-010"], battleArea: [{ card: "BT1-009", as: "target", dp: 3000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0 && s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("resolves a public Security deletion before the pending inherited trigger (Q5574)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "attacker", under: ["BT24-001"] }],
          security: [{ card: "BT1-014", as: "ownSecurity" }],
        },
        1: {
          // BT12-099's public Security effect deletes an opposing Digimon at 6000 DP or less.
          // If BT24-001's pending security-removal trigger ran first, this 3000-DP target
          // would also be deleted. Its survival proves the Security effect resolved first.
          security: [
            { card: "BT12-099", as: "securityOption" },
            { card: "BT1-014", as: "opponentSecurity" },
          ],
          battleArea: [{ card: "BT1-009", as: "target", dp: 3000 }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const attackerId = s.perm("attacker").permanentId;
    const targetId = s.perm("target").permanentId;
    const securityOptionId = s.inst("securityOption").instanceId;
    await s.ready();
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1 && !s.state.players[0]!.battleArea.length);

    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === securityOptionId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === attackerId)).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT1-009")).toBe(true);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === targetId)).toBe(true);
  });

  it("is reached through a legal two-step breeding stack before attacking", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT24-001", as: "egg" },
          hand: [
            { card: "BT24-009", as: "level3" },
            { card: "BT24-010", as: "level4" },
          ],
          deck: [{ card: "BT1-013", as: "draw1" }, { card: "BT1-014", as: "draw2" }, "BT1-009"],
        },
        1: { security: ["BT1-010", "BT1-013"], battleArea: [{ card: "BT1-009", as: "target", dp: 3000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("egg").permanentId,
        instanceId: s.inst("level3").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("egg").topCard.cardId === "BT24-009");
    // Gigimon -> Shamanmon uses the printed Red Lv.2 route for 1 memory.
    expect(s.state.memory).toBe(9);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("draw1").instanceId)).toBe(true);
    expect(s.perm("egg").topCard.instanceId).toBe(s.inst("level3").instanceId);
    expect(s.perm("egg").stack.map((card) => card.cardId)).toEqual(["BT24-001"]);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("egg").permanentId,
        instanceId: s.inst("level4").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 1,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("egg").topCard.cardId === "BT24-010");
    // Shamanmon -> Greymon uses the public TS alternate route for 2 memory.
    expect(s.state.memory).toBe(7);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("draw2").instanceId)).toBe(true);
    expect(s.perm("egg").topCard.instanceId).toBe(s.inst("level4").instanceId);
    expect(s.perm("egg").stack.map((card) => card.cardId)).toEqual(["BT24-001", "BT24-009"]);
    const breedingTurn = s.engine.runOneTurn();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.state.phase).toBe(Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("egg").permanentId })).toEqual({
      ok: true,
    });
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => !internalsOf(s.engine).mainEntryPending);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("egg").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length < 2);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.perm("egg").stack.map((card) => card.cardId)).toEqual(["BT24-001", "BT24-009"]);
    advance(s.engine).endMainPhaseIfOpen(0);
    await breedingTurn;
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === s.perm("egg").permanentId)).toBe(true);
  });

  it("does not trigger when the opponent removes their own security on their turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-009", as: "host", under: ["BT24-001"] }] },
        1: {
          battleArea: [
            { card: "BT1-045", as: "yellowSource" },
            { card: "BT1-009", as: "target", dp: 3000 },
          ],
          hand: [{ card: "BT24-093", as: "temple" }],
          security: [{ card: "BT1-010", as: "removed" }],
          deck: ["BT1-013", "BT1-045"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 5;
    await s.ready();
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("temple").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.hand.some((card) => card.cardId === "BT1-010"));
    expect(s.state.players[1]!.hand.map((card) => card.instanceId)).toContain(s.inst("removed").instanceId);
    expect(s.state.players[1]!.security.map((card) => card.cardId)).toEqual(["BT1-013"]);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === s.perm("target").permanentId)).toBe(true);
    expect(s.state.memory).toBe(3);
  });

  it("suppresses a same-turn second removal and resets on the next owner turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-014", as: "host", under: ["BT24-001", "BT1-009", "BT1-014"] }],
          hand: [{ card: "BT24-050", as: "unsuspender" }],
          deck: ["BT1-009", "BT1-010", "BT1-014", "BT1-009", "BT1-010", "BT1-014"],
        },
        1: {
          security: [
            { card: "BT1-009", as: "firstSecurity" },
            { card: "BT1-010", as: "secondSecurity" },
            "BT1-014",
            "BT1-013",
            "BT1-013",
          ],
          battleArea: [
            { card: "BT1-009", as: "first", dp: 3000 },
            { card: "BT1-009", as: "second", dp: 3000 },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-014", "BT1-009", "BT1-010", "BT1-014", "BT1-009", "BT1-010", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const firstId = s.perm("first").permanentId;
    const secondId = s.perm("second").permanentId;
    const firstSecurityId = s.inst("firstSecurity").instanceId;
    const secondSecurityId = s.inst("secondSecurity").instanceId;
    s.state.memory = 10;
    const firstTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === firstId));
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === firstId)).toBe(false);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === firstSecurityId)).toBe(true);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("unsuspender").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.perm("host").isSuspended);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === secondId)).toBe(true);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === secondSecurityId)).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(0);
    await firstTurn;
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = 3;
    const secondTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === secondId));
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === secondId)).toBe(false);
    advance(s.engine).endMainPhaseIfOpen(0);
    await secondTurn;
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
