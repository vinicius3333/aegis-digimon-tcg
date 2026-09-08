import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { drainMicrotasks, settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import "../EX11/EX11-024.js";
import { compiled } from "./BT23-051.js";

const SECURITY = ["BT1-009", "BT1-010", "BT1-011"];

/** Golemon carries ＜Alliance＞, so any attack it declares with an untapped ally opens a prompt. */
async function declineAllianceIfPrompted(s: ReturnType<typeof setupEngine>, seat: 0 | 1) {
  const before = s.events.filter((event) => event.kind === "alliancePrompt").length;
  // Not every attack has an eligible ally, so the prompt may legitimately never appear;
  // drain instead of asserting a milestone that is sometimes false by design.
  await drainMicrotasks(100);
  const prompted = s.events.filter((event) => event.kind === "alliancePrompt").length > before;
  const declined = prompted ? s.engine.applyIntent(seat, { type: "respondAlliance" }) : { ok: true };
  expect(declined).toEqual({ ok: true });
}

describe("BT23-051 Golemon", () => {
  it("matches every catalog field and complete compiled clause", () => {
    expect(getCardDefinition("BT23-051")).toMatchObject({
      cardId: "BT23-051",
      nameEn: "Golemon",
      colors: ["Black", "Red"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 5,
      dp: 5000,
      evoCosts: [
        { color: "Black", level: 3, memoryCost: 3 },
        { color: "Red", level: 3, memoryCost: 3 },
      ],
      forms: ["Champion"],
      attributes: ["Virus"],
      types: ["Mineral", "Hudie", "CS"],
    });
    expect(compiled.digivolutionRequirement).toEqual([{ level: 3, traits: ["CS"], cost: 2, isAlternate: true }]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("suspends on a public player attack and deletes exactly one opponent Digimon at 4000 DP or less", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-051", as: "gole" },
            { card: "BT1-009", as: "ownLow", dp: 3000 },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "low", dp: 4000 },
            { card: "BT1-010", as: "otherLow", dp: 2000 },
            { card: "BT1-019", as: "high", dp: 4001 },
          ],
          security: SECURITY,
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    const goleId = s.perm("gole").permanentId;
    const lowId = s.perm("low").permanentId;
    const otherLowId = s.perm("otherLow").permanentId;
    const highId = s.perm("high").permanentId;
    const ownLowId = s.perm("ownLow").permanentId;
    const lowInstanceId = s.perm("low").topCard.instanceId;
    preferred.push(lowInstanceId);

    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: goleId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await declineAllianceIfPrompted(s, 0);
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === lowId));
    await settle(() => s.state.pendingDecision === undefined && !observe(s.engine).isAttacking());

    const opponentIds = s.state.players[1]!.battleArea.map((p) => p.permanentId);
    expect(opponentIds).not.toContain(lowId);
    expect(opponentIds).toEqual(expect.arrayContaining([otherLowId, highId]));
    expect(opponentIds).toHaveLength(2);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === lowInstanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea.map((p) => p.permanentId)).toEqual(
      expect.arrayContaining([goleId, ownLowId]),
    );
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
    expect(s.perm("gole").isSuspended).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("does nothing when every opponent Digimon is above 4000 DP and never touches its own board", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-051", as: "gole" },
            { card: "BT1-009", as: "ownLow", dp: 1000 },
          ],
        },
        1: {
          battleArea: [{ card: "BT1-019", as: "high", dp: 4001 }],
          security: SECURITY,
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    const goleId = s.perm("gole").permanentId;
    const highId = s.perm("high").permanentId;
    const ownLowId = s.perm("ownLow").permanentId;
    const highInstanceId = s.perm("high").topCard.instanceId;

    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: goleId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await declineAllianceIfPrompted(s, 0);
    await settle(() => s.state.players[1]!.security.length === 2);
    await settle(() => s.state.pendingDecision === undefined && !observe(s.engine).isAttacking());

    expect(s.state.players[1]!.battleArea.map((p) => p.permanentId)).toEqual([highId]);
    // Only the checked security card reached the trash; no battle-area Digimon was deleted.
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === highInstanceId)).toBe(false);
    expect(s.state.players[1]!.trash).toHaveLength(1);
    expect(s.state.players[0]!.battleArea.map((p) => p.permanentId)).toEqual(
      expect.arrayContaining([goleId, ownLowId]),
    );
    expect(s.perm("gole").isSuspended).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("refuses a second suspension's delete in the same turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT23-051", as: "gole" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "first", dp: 3000 },
            { card: "BT1-010", as: "second", dp: 3000 },
          ],
          security: SECURITY,
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    const goleId = s.perm("gole").permanentId;
    const firstId = s.perm("first").permanentId;
    const secondId = s.perm("second").permanentId;
    preferred.push(s.perm("first").topCard.instanceId);

    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: goleId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await declineAllianceIfPrompted(s, 0);
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === firstId));
    await settle(() => s.state.pendingDecision === undefined && !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.battleArea.map((p) => p.permanentId)).toEqual([secondId]);
    expect(s.perm("gole").isSuspended).toBe(true);

    // No public intent unsuspends Golemon mid-turn on this board, so the board is arranged
    // through the effect verb; the suspension under test is still produced by a public attack.
    await advance(s.engine).verb.unsuspend([goleId]);
    expect(s.perm("gole").isSuspended).toBe(false);
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: goleId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await declineAllianceIfPrompted(s, 0);
    await settle(() => s.perm("gole").isSuspended);
    await settle(() => s.state.pendingDecision === undefined && !observe(s.engine).isAttacking());

    expect(s.perm("gole").isSuspended).toBe(true);
    expect(s.state.players[1]!.battleArea.map((p) => p.permanentId)).toEqual([secondId]);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("deletes again on the next own turn through the real turn loop", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT23-051", as: "gole" }], deck: Array(10).fill("BT1-010") },
        1: {
          battleArea: [
            { card: "BT1-009", as: "first", dp: 3000 },
            { card: "BT1-010", as: "second", dp: 3000 },
          ],
          security: SECURITY,
          deck: Array(10).fill("BT1-011"),
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    const goleId = s.perm("gole").permanentId;
    const firstId = s.perm("first").permanentId;
    const secondId = s.perm("second").permanentId;
    preferred.push(s.perm("first").topCard.instanceId);

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: goleId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await declineAllianceIfPrompted(s, 0);
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === firstId));
    await advance(s.engine).waitForMainPhase(1);
    expect(s.state.players[1]!.battleArea.map((p) => p.permanentId)).toEqual([secondId]);
    expect(s.perm("gole").isSuspended).toBe(true);

    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("gole").isSuspended).toBe(false);
    expect(s.state.players[1]!.battleArea.map((p) => p.permanentId)).toEqual([secondId]);

    preferred.length = 0;
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: goleId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await declineAllianceIfPrompted(s, 0);
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    await settle(() => s.state.pendingDecision === undefined && !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.perm("gole").isSuspended).toBe(true);

    expect(s.engine.applyIntent(s.state.turnSeat, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("blocks on the opponent's turn, suspends, and deletes there under its own per-turn allowance", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT23-051", as: "gole" }], security: SECURITY },
        1: {
          battleArea: [
            { card: "BT1-019", as: "attacker", dp: 3000 },
            { card: "BT1-010", as: "bystander", dp: 4000 },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    s.state.turnSeat = 1;
    const goleId = s.perm("gole").permanentId;
    const attackerId = s.perm("attacker").permanentId;
    const bystanderId = s.perm("bystander").permanentId;
    preferred.push(s.perm("bystander").topCard.instanceId);

    expect(
      s.engine.applyIntent(1, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"), 3000);
    expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: goleId })).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === bystanderId), 3000);
    await settle(() => s.state.pendingDecision === undefined && !observe(s.engine).isAttacking(), 3000);

    expect(s.state.players[1]!.battleArea.map((p) => p.permanentId)).not.toContain(bystanderId);
    expect(s.perm("gole").isSuspended).toBe(true);
    expect(s.state.players[0]!.battleArea.map((p) => p.permanentId)).toEqual([goleId]);
    // Golemon's 5000 DP beat the 3000 attacker, and the block kept security intact.
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === attackerId)).toBe(false);
    expect(s.state.players[0]!.security).toHaveLength(3);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("deletes when an ally's Alliance suspends it rather than only when it attacks", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-024", as: "ally", dp: 9000 },
            { card: "BT23-051", as: "gole" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "low", dp: 4000 }], security: SECURITY },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    const goleId = s.perm("gole").permanentId;
    const lowId = s.perm("low").permanentId;
    const lowInstanceId = s.perm("low").topCard.instanceId;
    preferred.push(lowInstanceId);
    expect(observe(s.engine).hasKeyword(s.perm("ally"), "Alliance")).toBe(true);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("ally").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "alliancePrompt"), 3000);
    expect(s.engine.applyIntent(0, { type: "respondAlliance", allyPermanentId: goleId })).toEqual({ ok: true });
    await settle(() => s.perm("gole").isSuspended, 3000);
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === lowId), 3000);

    expect(s.perm("gole").isSuspended).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === lowInstanceId)).toBe(true);
  });

  it("resolves its own Alliance by suspending another Digimon, not itself", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-051", as: "gole" },
            { card: "BT1-009", as: "ally", dp: 3000 },
          ],
        },
        1: { battleArea: [{ card: "ST18-07", as: "wall", dp: 9000 }], security: SECURITY },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    const goleId = s.perm("gole").permanentId;
    const allyId = s.perm("ally").permanentId;
    expect(observe(s.engine).hasKeyword(s.perm("gole"), "Alliance")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("gole"), "Blocker")).toBe(true);

    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: goleId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "alliancePrompt"), 3000);
    const prompt = s.events.find((event) => event.kind === "alliancePrompt") as { eligibleAllyIds: string[] };
    expect(prompt.eligibleAllyIds).toContain(allyId);
    expect(prompt.eligibleAllyIds).not.toContain(goleId);
    expect(s.engine.applyIntent(0, { type: "respondAlliance", allyPermanentId: allyId })).toEqual({ ok: true });
    // The ＜Blocker＞ wall keeps the block window open, so the Alliance bonus is still live.
    await settle(
      () => s.perm("ally").isSuspended && s.events.some((event) => event.kind === "blockWindowOpened"),
      3000,
    );
    expect(s.perm("ally").isSuspended).toBe(true);
    expect(s.perm("gole").currentDP).toBe(8000);
    expect(s.perm("gole").securityAttack).toBe(2);
    expect(s.engine.applyIntent(1, { type: "declineBlock" })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1, 3000);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("can attack the opponent player but not an opposing Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT23-051", as: "gole" }] },
      1: { battleArea: [{ card: "BT1-009", as: "target", suspended: true }], security: SECURITY },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("gole").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }).ok,
    ).toBe(false);
    expect(s.perm("gole").isSuspended).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("gole"), "cantAttackDigimon")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("gole").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
  });

  it("exposes Alliance and Blocker through the live keyword seam", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT23-051", as: "gole" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("gole"), "Alliance")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("gole"), "Blocker")).toBe(true);
    expect(
      compiled.effects
        .filter((entry) => entry.trigger === "Static")
        .flatMap((entry) => entry.keywords?.map((keyword) => keyword.keyword) ?? []),
    ).toEqual(["Alliance", "Blocker"]);
  });

  it("once per turn deletes one opposing Digimon at 4000 DP or less when this Golemon suspends", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "AllTurns") as any;
    expect(effect).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "Delete",
              target: { filter: { controller: "opponent", dp: { op: "lte", value: 4000 } }, count: 1 },
            },
          ],
        },
      ],
    });
  });

  it("cannot attack opponent Digimon during your turn", () => {
    const action = (compiled.effects.find((entry) => entry.trigger === "YourTurn") as any).actions[0];
    expect(action).toMatchObject({
      kind: "Restrict",
      restriction: "cantAttackDigimon",
      duration: "permanent",
      target: { filter: { isSelfRef: true }, isSelf: true },
    });
  });

  it("digivolves from a Lv.3 CS source for exactly 2 memory and draws", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT23-062", as: "base" }],
        hand: [{ card: "BT23-051", as: "gole" }],
        deck: [{ card: "BT1-009", as: "drawn" }, "BT1-010"],
      },
    });
    await s.ready();
    s.state.memory = 2;
    const baseId = s.inst("base").instanceId;
    const goleId = s.inst("gole").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: goleId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === goleId);

    expect(s.perm("base").topCard.instanceId).toBe(goleId);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([baseId]);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("drawn").instanceId]);
  });

  it("pays the printed 3 on the normal route from a red Lv.3", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "base" }],
        hand: [{ card: "BT23-051", as: "gole" }],
        deck: [{ card: "BT1-010", as: "drawn" }, "BT1-011"],
      },
    });
    await s.ready();
    s.state.memory = 3;
    const goleId = s.inst("gole").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: goleId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === goleId);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("drawn").instanceId]);
  });

  it("rejects a non-CS off-color Lv.3 source on either route", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-029", as: "base" }], hand: [{ card: "BT23-051", as: "gole" }] },
    });
    await s.ready();
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("gole").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("gole").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT23-051"]);
  });

  it("rejects a Lv.4 CS source on the alternate route", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT23-041", as: "base" }], hand: [{ card: "BT23-051", as: "gole" }] },
    });
    await s.ready();
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("gole").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.state.memory).toBe(5);
  });
});
