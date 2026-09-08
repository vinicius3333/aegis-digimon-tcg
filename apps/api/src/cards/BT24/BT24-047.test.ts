import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled as BT24_047 } from "./BT24-047.js";
import "../index.js";

describe("BT24-047 Kokatorimon", () => {
  it("matches the catalog identity", () => {
    expect(getCardDefinition("BT24-047")).toMatchObject({
      cardId: "BT24-047",
      nameEn: "Kokatorimon",
      colors: ["Green"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 4,
      dp: 4000,
      forms: ["Champion"],
      attributes: ["Data"],
      types: ["Giant Bird"],
    });
  });

  it("keeps the unsuspend and follow-up attack on the same qualifying Digimon", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const actions = BT24_047.effects?.find((entry) => entry.trigger === trigger)?.actions ?? [];
      expect(actions[1]).toMatchObject({ kind: "Unsuspend", condition: { kind: "lastSuspendedIsMine" } });
      expect(actions[2]).toMatchObject({
        kind: "Attack",
        condition: { kind: "ifThisEffectActed" },
        target: { sameTarget: true },
      });
    }
  });

  it("Q5636: suspending an opponent Digimon does not unlock the own-Digimon follow-up", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-047", as: "source" },
            { card: "ST1-02", as: "avian", suspended: true },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("opponent").permanentId);
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));

    expect(s.perm("opponent").isSuspended).toBe(true);
    expect(s.perm("avian").isSuspended).toBe(true);
  });

  it("publicly plays, suspends, unsuspends, and attacks with its own Giant Bird", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT24-047", as: "source" }],
          battleArea: [{ card: "BT1-022", as: "avian", suspended: false }],
        },
        1: { security: [{ card: "BT1-009", as: "security" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("avian").permanentId);
    s.state.memory = 10;
    await s.ready();
    const avianPermanentId = s.perm("avian").permanentId;
    const securityInstanceId = s.inst("security").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[1]!.security.length === 0 &&
        s.events.some((event) => event.kind === "securityChecked") &&
        !observe(s.engine).isAttacking(),
    );

    expect(s.state.memory).toBe(6);
    expect(s.perm("avian").isSuspended).toBe(true);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(securityInstanceId);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.permanentId)).toContain(avianPermanentId);
  });

  it("resolves opponent suspension from a public play intent", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT24-047", as: "kokatorimon" }],
          battleArea: [{ card: "BT24-044", as: "avian", suspended: true }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("target").permanentId);
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("kokatorimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").isSuspended);

    expect(s.perm("target").isSuspended).toBe(true);
    expect(s.perm("avian").isSuspended).toBe(true);
  });

  it("publicly declines the optional suspension without changing memory or zones", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "BT24-047", as: "kokatorimon" }], deck: ["BT1-009", "BT1-010", "BT1-011"] } },
      { autoDeclineOptional: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("kokatorimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("kokatorimon").instanceId),
    );
    expect(s.state.memory).toBe(6);
    expect(s.perm("kokatorimon").isSuspended).toBe(false);
    expect(s.state.players[0]!.deck.map((c) => c.cardId)).toEqual(["BT1-009", "BT1-010", "BT1-011"]);
  });

  it("digivolves publicly through the legal green level-3 route", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-064", as: "base" }],
          hand: [{ card: "BT24-047", as: "kokatorimon" }],
          deck: [{ card: "BT1-009", as: "bonusDraw" }, "BT1-010", "BT1-011"],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("kokatorimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("kokatorimon").instanceId);
    expect(s.state.memory).toBe(3);
    expect(s.perm("base").topCard.instanceId).toBe(s.inst("kokatorimon").instanceId);
    expect(s.perm("base").stack.map((c) => c.instanceId)).toEqual([s.inst("base").instanceId]);
    expect(s.state.players[0]!.hand.map((c) => c.instanceId)).toContain(s.inst("bonusDraw").instanceId);
  });

  it("inherited effect gains memory only when its own host wins and survives", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT24-048", as: "host", under: ["BT24-047"], dp: 9000 }] },
      1: { battleArea: [{ card: "BT1-009", as: "victim", suspended: true, dp: 3000 }] },
    });
    s.state.memory = 3;
    const victimId = s.perm("victim").permanentId;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: victimId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === victimId));
    await settle(() => s.state.memory === 4);

    expect(s.state.memory).toBe(4);
  });

  it("suppresses a same-turn second battle deletion and resets on the next owner turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-071", as: "host", under: ["BT24-047"], dp: 9000 }],
          hand: [
            { card: "BT24-050", as: "unsuspender" },
            { card: "BT24-044", as: "suspender" },
          ],
          deck: ["BT1-013", "BT1-014", "BT1-015"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "victim1", suspended: true, dp: 3000 },
            { card: "BT1-010", as: "victim2", suspended: true, dp: 3000 },
            { card: "BT1-014", as: "victim3", suspended: true, dp: 3000 },
          ],
          security: ["BT1-013", "BT1-014", "BT1-015"],
          deck: ["BT1-016", "BT1-017", "BT1-018"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.turnSeat = 0;
    s.state.memory = 9;
    await s.ready();
    const hostId = s.perm("host").permanentId;
    const victims = ["victim1", "victim2", "victim3"].map((alias) => s.perm(alias).permanentId);
    const attack = async (victimId: string): Promise<void> => {
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: hostId,
          target: { kind: "permanent", permanentId: victimId },
        }),
      ).toEqual({ ok: true });
      await settle(
        () =>
          !s.state.players[1]!.battleArea.some((p) => p.permanentId === victimId) && !observe(s.engine).isAttacking(),
      );
    };
    const beforeFirst = s.state.memory;
    await attack(victims[0]!);
    expect(s.state.memory).toBe(beforeFirst + 1);
    preferred.push(hostId);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("unsuspender").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.perm("host").isSuspended);
    const beforeSecond = s.state.memory;
    await attack(victims[1]!);
    expect(s.state.memory).toBe(beforeSecond);
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = 3;
    const nextOwnerTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;
    preferred.splice(0, preferred.length, victims[2]!);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("suspender").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("victim3").isSuspended);
    const beforeThird = s.state.memory;
    const memoryEventsBefore = s.events.filter((event) => event.kind === "memoryChanged").length;
    await attack(victims[2]!);
    expect(
      s.events
        .filter((event) => event.kind === "memoryChanged")
        .slice(memoryEventsBefore)
        .some((event) => event.to === beforeThird + 1),
    ).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextOwnerTurn;
  });

  it("Q5637: inherited effect does not activate when its host is deleted in the same battle", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT24-048", as: "host", under: ["BT24-047"], dp: 9000 }] },
      1: { battleArea: [{ card: "BT1-009", as: "victim", suspended: true, dp: 9000 }] },
    });
    s.state.memory = 3;
    const hostId = s.perm("host").permanentId;
    const victimId = s.perm("victim").permanentId;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: hostId,
        target: { kind: "permanent", permanentId: victimId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostId) &&
        !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === victimId),
    );

    expect(s.state.memory).toBe(3);
  });
});
