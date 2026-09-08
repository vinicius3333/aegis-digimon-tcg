import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT24-044.js";
import "../index.js";

describe("BT24-044 Muchomon", () => {
  it("suspends either side, searches two distinct printed categories only after suspending your Digimon", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    const [suspend, reveal] = compiled.effects[0]!.actions;
    expect(compiled.effects[0]!.trigger).toBe("OnPlay");
    expect(suspend).toMatchObject({
      kind: "Suspend",
      optional: true,
      target: { filter: { controllerDefault: "any", levelComparison: { op: "lte", value: 6 } } },
    });
    expect(reveal).toMatchObject({
      kind: "RevealAdd",
      revealCount: 3,
      condition: { kind: "lastSuspendedIsMine" },
      rest: "deckBottom",
    });
    expect((reveal as any).add).toHaveLength(2);
    expect(compiled.effects[1]).toMatchObject({ trigger: "AllTurns", isInherited: true, frequency: "OncePerTurn" });
  });

  it("reveals Shoto and an Avian after suspending its own Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-044", as: "source" }],
          deck: ["P-133", { card: "BT1-022", as: "birdkin" }, { card: "BT1-009", as: "rest" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "P-133"));

    expect(s.perm("source").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(expect.arrayContaining(["P-133", "BT1-022"]));
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("rest").instanceId]);
  });

  it("resolves the suspend-gated search through a public play intent", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT24-044", as: "source" }],
          deck: [
            { card: "P-133", as: "shoto" },
            { card: "BT1-022", as: "birdkin" },
            { card: "BT1-009", as: "rest" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("shoto").instanceId));

    expect(s.state.memory).toBe(0);
    expect(s.perm("source").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([
      s.inst("shoto").instanceId,
      s.inst("birdkin").instanceId,
    ]);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("rest").instanceId]);
  });

  it("digivolves publicly from a legal green Digi-Egg for cost 0 with the source stack intact", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT1-007", as: "egg" },
          hand: [{ card: "BT24-044", as: "muchomon" }],
          deck: [
            { card: "P-133", as: "shoto" },
            { card: "BT1-022", as: "bird" },
            { card: "BT1-009", as: "rest" },
          ],
        },
        1: { battleArea: [{ card: "BT1-010", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("egg").permanentId,
        instanceId: s.inst("muchomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("egg").topCard.instanceId === s.inst("muchomon").instanceId);
    expect(s.state.memory).toBe(3);
    expect(s.perm("egg").topCard.instanceId).toBe(s.inst("muchomon").instanceId);
    expect(s.perm("egg").stack.map((card) => card.instanceId)).toEqual([s.inst("egg").instanceId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("shoto").instanceId);
  });

  it("does not reveal when a public play suspends an opponent Digimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT24-044", as: "source" }], deck: ["P-133", "ST1-02", "BT1-009"] },
        1: { battleArea: [{ card: "BT1-010", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("opponent").permanentId);

    s.state.memory = 3;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("opponent").isSuspended && !s.perm("source").isSuspended);

    expect(s.state.memory).toBe(0);
    expect(s.perm("source").isSuspended).toBe(false);
    expect(s.perm("opponent").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(3);
  });

  it("inherited effect gains memory when its host deletes an opponent in battle and survives", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT24-046", as: "host", under: ["BT24-044"], dp: 9000 }] },
      1: { battleArea: [{ card: "BT1-009", as: "victim", suspended: true, dp: 3000 }] },
    });
    s.state.memory = 3;
    await s.ready();
    const victimId = s.perm("victim").permanentId;

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

  it("publicly suppresses the inherited memory gain once per turn and resets next owner turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-071", as: "host", under: ["BT24-044"], dp: 9000 }],
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
            { card: "BT1-014", as: "victim3", dp: 3000 },
          ],
          security: ["BT1-013", "BT1-014", "BT1-015"],
          deck: ["BT1-016", "BT1-017", "BT1-018"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("victim1").permanentId);
    s.state.turnSeat = 0;
    s.state.memory = 9;
    await s.ready();
    const victim1Id = s.perm("victim1").permanentId;
    const victim2Id = s.perm("victim2").permanentId;
    const victim3Id = s.perm("victim3").permanentId;
    const firstTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    const beforeFirst = s.state.memory;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: victim1Id },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !s.state.players[1]!.battleArea.some((p) => p.permanentId === victim1Id) &&
        s.events.some((e) => e.kind === "combatResolved") &&
        !observe(s.engine).isAttacking(),
    );
    expect(s.state.memory).toBe(beforeFirst + 1);

    const beforeUnsuspendPlay = s.state.memory;
    preferred.splice(0, preferred.length, s.perm("host").permanentId);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("unsuspender").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.perm("host").isSuspended);
    expect(s.state.memory).toBe(beforeUnsuspendPlay - 7);
    preferred.splice(0, preferred.length, s.perm("victim2").permanentId);
    const beforeSecond = s.state.memory;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: victim2Id },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !s.state.players[1]!.battleArea.some((p) => p.permanentId === victim2Id) &&
        s.events.filter((e) => e.kind === "combatResolved").length >= 2 &&
        !observe(s.engine).isAttacking(),
    );
    expect(s.state.memory).toBe(beforeSecond);

    advance(s.engine).endMainPhaseIfOpen(0);
    await firstTurn;
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = 10;
    const ownerTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    const beforeSuspensionPlay = s.state.memory;
    expect(beforeSuspensionPlay).toBeGreaterThanOrEqual(3);
    preferred.splice(0, preferred.length, victim3Id);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("suspender").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("victim3").isSuspended);
    expect(s.state.memory).toBe(beforeSuspensionPlay - 3);
    const beforeThird = s.state.memory;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: victim3Id },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !s.state.players[1]!.battleArea.some((p) => p.permanentId === victim3Id) &&
        s.events.filter((e) => e.kind === "combatResolved").length >= 3 &&
        !observe(s.engine).isAttacking(),
    );
    expect(s.state.memory).toBe(beforeThird + 1);
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === s.perm("host").permanentId)).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownerTurn;
  });

  it("Q5633: inherited effect does not activate when its host is also deleted in battle", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT24-046", as: "host", under: ["BT24-044"], dp: 9000 }] },
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
