import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled as BT24_048 } from "./BT24-048.js";
import "../index.js";

describe("BT24-048 Deramon", () => {
  it("hatches and may free-digivolve a breeding-area Avian/Bird Digimon", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effect = BT24_048.effects?.find((entry) => entry.trigger === trigger);
      expect(effect?.actions?.[0]).toMatchObject({ kind: "Hatch", optional: true });
      expect(effect?.actions?.[1]).toMatchObject({
        kind: "Digivolve",
        payCost: false,
        from: ["hand"],
        optional: true,
        target: { filter: { zone: "breeding" } },
        into: {
          levelComparison: { op: "lte", value: 5 },
          nameOrTrait: [{ tokens: ["Avian", "Bird"], match: "traitContains" }],
        },
      });
    }
  });
  it("has the inherited once-per-turn battle deletion unsuspend", () => {
    expect(BT24_048.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
    });
  });

  it("has Blocker and hatches into an empty breeding area", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT24-048", as: "deramon" }],
          eggDeck: [{ card: "BT24-001", as: "egg" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 7;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("deramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard.instanceId === s.inst("egg").instanceId);

    const played = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === "BT24-048")!;
    expect(observe(s.engine).hasKeyword(played, "Blocker")).toBe(true);
    expect(s.state.players[0]!.breeding?.topCard.instanceId).toBe(s.inst("egg").instanceId);
    expect(s.state.memory).toBe(1);
  });

  it("uses Deramon's public Blocker in a real opponent attack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT24-048", as: "deramon", dp: 6000 }],
        security: [{ card: "BT1-009", as: "security" }],
        deck: ["BT1-010", "BT1-011"],
      },
      1: {
        battleArea: [{ card: "BT1-009", as: "attacker", dp: 2000 }],
        deck: ["BT1-010", "BT1-011"],
      },
    });
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await s.ready();
    const deramonId = s.perm("deramon").permanentId;
    const attackerId = s.perm("attacker").permanentId;
    const securityId = s.inst("security").instanceId;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: attackerId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: deramonId })).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved") && !observe(s.engine).isAttacking());

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === attackerId)).toBe(false);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("attacker").instanceId);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === deramonId)).toBe(true);
    expect(s.perm("deramon").isSuspended).toBe(true);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([securityId]);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
  });

  it("publicly free-digivolves a qualifying breeding Digimon while respecting requirements", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT16-008", as: "avian" },
          hand: [
            { card: "BT24-048", as: "deramon" },
            { card: "BT24-048", as: "evolution" },
          ],
          deck: [{ card: "BT1-009", as: "bonusDraw" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("deramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("avian").topCard.instanceId === s.inst("evolution").instanceId);

    expect(s.perm("avian").topCard.instanceId).toBe(s.inst("evolution").instanceId);
    expect(s.perm("avian").stack.map((card) => card.instanceId)).toEqual([s.inst("avian").instanceId]);
    expect(s.state.memory).toBe(4);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("bonusDraw").instanceId);
  });

  it("declines public hatching", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT24-048", as: "deramon" }],
          eggDeck: [{ card: "BT24-001", as: "egg" }],
        },
      },
      { autoAcceptOptional: false, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("deramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.decisions.some(({ req }) => req.kind === "optional" && req.sourceCardId === "BT24-048"));
    const prompt = s.decisions.find(({ req }) => req.kind === "optional" && req.sourceCardId === "BT24-048")!.req;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: prompt.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.breeding).toBeUndefined();
    expect(s.state.players[0]!.eggDeck.map((card) => card.instanceId)).toContain(s.inst("egg").instanceId);
    expect(s.state.memory).toBe(4);
  });

  it("does not free-digivolve a non-Avian/Bird breeding Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT1-071", as: "nonAvian" },
          hand: [
            { card: "BT24-048", as: "deramon" },
            { card: "BT24-048", as: "target" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const baseId = s.perm("nonAvian").topCard.instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("deramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT24-048"));
    expect(s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT24-048")).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("target").instanceId);
    expect(s.state.memory).toBe(4);
    expect(s.perm("nonAvian").topCard.instanceId).toBe(baseId);
    expect(s.perm("nonAvian").topCard.instanceId).toBe(s.inst("nonAvian").instanceId);
  });

  it("inherited effect unsuspends its host after that host wins a battle", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT24-049", as: "host", under: ["BT24-048"], dp: 9000 }] },
        1: { battleArea: [{ card: "BT1-009", as: "victim", suspended: true, dp: 3000 }] },
      },
      { autoAcceptOptional: true },
    );
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
    await settle(() => !s.perm("host").isSuspended);

    expect(s.perm("host").isSuspended).toBe(false);
  });

  it("suppresses a same-turn second battle trigger and resets on the next owner turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-049", as: "host", under: ["BT24-048"], dp: 9000 }],
          hand: [
            { card: "BT24-050", as: "firstUnsuspender" },
            { card: "BT24-050", as: "secondUnsuspender" },
          ],
          deck: ["BT1-010", "BT1-010", "BT1-010", "BT1-010", "BT1-010"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "firstVictim", suspended: true, dp: 3000 },
            { card: "BT1-009", as: "secondVictim", suspended: true, dp: 3000 },
            { card: "BT1-009", as: "thirdVictim", suspended: true, dp: 3000 },
          ],
          deck: ["BT1-010", "BT1-010", "BT1-010", "BT1-010", "BT1-010"],
          hand: [{ card: "BT24-047", as: "suspender" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    const hostId = s.perm("host").permanentId;
    const firstVictimId = s.perm("firstVictim").permanentId;
    const secondVictimId = s.perm("secondVictim").permanentId;
    const thirdVictimId = s.perm("thirdVictim").permanentId;
    s.state.turnSeat = 0;
    s.state.memory = 10;
    await s.ready();
    const firstTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: hostId,
        target: { kind: "permanent", permanentId: firstVictimId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === firstVictimId));
    expect(s.perm("host").isSuspended).toBe(false);

    preferred.push(hostId);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("firstUnsuspender").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("firstUnsuspender").instanceId),
    );
    expect(s.perm("host").isSuspended).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: hostId,
        target: { kind: "permanent", permanentId: secondVictimId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === secondVictimId));
    expect(s.perm("host").isSuspended).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
    advance(s.engine).endMainPhaseIfOpen(0);
    await firstTurn;

    s.state.turnSeat = 1;
    s.state.memory = 10;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    preferred.splice(0, preferred.length, thirdVictimId);
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("suspender").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("thirdVictim").isSuspended);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
    s.state.turnSeat = 0;
    s.state.memory = 10;
    const nextOwnerTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("secondUnsuspender").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("secondUnsuspender").instanceId),
    );
    expect(s.perm("host").isSuspended).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: hostId,
        target: { kind: "permanent", permanentId: thirdVictimId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === thirdVictimId));
    await settle(() => !s.perm("host").isSuspended);
    expect(s.perm("host").isSuspended).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextOwnerTurn;
  });

  it("inherited effect does not activate for a different battle winner", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT24-049", as: "host", under: ["BT24-048"], suspended: true },
          { card: "BT1-009", as: "winner" },
        ],
      },
    });
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenDeletesInBattle", {
      attackerPermanentId: s.perm("winner").permanentId,
    });

    expect(s.perm("host").isSuspended).toBe(true);
  });

  it("Q5638: a tied battle removes the host before its inherited effect can activate", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT24-049", as: "host", under: ["BT24-048"], dp: 9000 }] },
      1: { battleArea: [{ card: "BT1-009", as: "victim", suspended: true, dp: 9000 }] },
    });
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

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostId)).toBe(false);
  });

  it("uses the normal green level-4 evolution route for cost 3", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT24-047", as: "base" }], hand: [{ card: "BT24-048", as: "deramon" }] },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("deramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("deramon").instanceId);
    expect(s.state.memory).toBe(2);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([s.inst("base").instanceId]);
  });

  it("rejects evolution from a non-green level-4 source", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-015", as: "base" }], hand: [{ card: "BT24-048", as: "deramon" }] },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("deramon").instanceId,
      }),
    ).toMatchObject({ ok: false });
    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("deramon").instanceId);
  });
});
