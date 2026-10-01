import { describe, expect, it } from "vitest";
import type { Permanent } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./ST3-05.js";
import "./ST3-07.js";
import "./ST3-08.js";

describe("ST3-08 MagnaAngemon", () => {
  it("gives an opposing Digimon -1000 DP when its host attacks", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST3-09", under: ["ST3-08"], as: "host" }] },
        1: { battleArea: [{ card: "ST3-03", as: "target" }], security: ["ST3-02"] },
      },
      { autoSelectCards: true },
    );
    const before = s.perm("target").currentDP;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === before - 1000);
    expect(s.perm("target").currentDP).toBe(before - 1000);
  });

  it("deletes a 1000 DP attack target before battle and ends that attack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST3-09", under: ["ST3-08"], as: "host" }] },
        1: { battleArea: [{ card: "ST3-03", as: "target", dp: 1000, suspended: true }] },
      },
      { autoSelectCards: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
  });
});

describe("ST3-08 MagnaAngemon — KB Q&A rulings", () => {
  it("inherited effect can pick an opponent's 1000 DP Digimon and delete it (Q634)", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST3-09", under: ["ST3-08"], as: "host" }] },
        1: {
          battleArea: [
            { card: "ST3-03", as: "weak", dp: 1000 },
            { card: "ST3-02", as: "control", dp: 2000 },
          ],
          security: ["ST3-02"],
        },
      },
      { autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("weak").topCard!.instanceId);
    const control = s.perm("control");

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([control.permanentId]);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toContain("ST3-03");
    expect(control.currentDP).toBe(2000);
  });

  it("deleting the attacked Digimon ends the attack with no battle after other [When Attacking] effects resolve (Q635)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST3-09", under: ["ST3-05", "ST3-08"], as: "host" }],
          security: ["ST3-02", "ST3-02", "ST3-02", "ST3-02"],
        },
        1: { battleArea: [{ card: "ST3-03", as: "target", dp: 1000, suspended: true }], security: ["ST3-02"] },
      },
      { autoSelectCards: true, autoOrderTriggers: false },
    );
    s.state.memory = 0;
    const host = s.perm("host");

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: host.permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });

    const resolveNextTrigger = async (): Promise<void> => {
      await settle(() => s.state.pendingDecision?.kind === "orderTriggers" || !observe(s.engine).isAttacking());
      const pending = s.state.pendingDecision;
      if (pending?.kind !== "orderTriggers") return;
      const request = s.decisions.at(-1)!.req;
      const keys = request.options!.triggerKeys!;
      const magnaAngemonIndex = request.options!.triggerCardIds!.indexOf("ST3-08");
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: pending.decisionId,
          response: { kind: "orderTriggers", order: [keys[magnaAngemonIndex === -1 ? 0 : magnaAngemonIndex]!] },
        }),
      ).toEqual({ ok: true });
    };
    await resolveNextTrigger();
    await resolveNextTrigger();
    await settle(() => !observe(s.engine).isAttacking() && s.state.memory === 1);

    const targetTrashedAt = s.events.findIndex(
      (event) => event.kind === "cardsMoved" && event.from === "battleArea" && event.to === "trash",
    );
    const angemonResolvedAt = s.events.findIndex(
      (event) => event.kind === "effectResolved" && event.sourceCardId === "ST3-05",
    );
    expect(targetTrashedAt).toBeGreaterThanOrEqual(0);
    expect(angemonResolvedAt).toBeGreaterThan(targetTrashedAt);
    expect(observe(s.engine).isAttacking()).toBe(false);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([host.permanentId]);
    expect(host.isSuspended).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.events.some((event) => event.kind === "blockWindowOpened")).toBe(false);
    expect(s.events.some((event) => event.kind === "combatResolved" && event.deletedPermanentIds.length > 0)).toBe(
      false,
    );
  });

  it("cannot use the inherited effect on a Digimon that blocks after [When Attacking] resolved (Q636)", async () => {
    const preferInstanceIds: string[] = [];
    let blockerDpAtBattle: number | undefined;
    let blocker: Permanent | undefined;
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST3-09", under: ["ST3-08"], as: "host" }] },
        1: {
          battleArea: [
            { card: "ST3-07", as: "blocker", dp: 2000 },
            { card: "ST3-02", as: "bystander" },
          ],
          security: ["ST3-02"],
        },
      },
      {
        autoSelectCards: true,
        preferInstanceIds,
        onEvent: (event) => {
          if (event.kind === "combatResolved") blockerDpAtBattle = blocker?.currentDP;
        },
      },
    );
    preferInstanceIds.push(s.perm("bystander").topCard!.instanceId);
    blocker = s.perm("blocker");
    const bystander = s.perm("bystander");

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).blockingSeat() === 1);

    expect(bystander.currentDP).toBe(2000);
    expect(blocker.currentDP).toBe(2000);
    // Aim any late -1000 DP at the blocker, so a re-triggered effect would show on its DP.
    preferInstanceIds.splice(0, preferInstanceIds.length, blocker.topCard!.instanceId);
    const decisionsBeforeBlock = s.decisions.length;

    expect(s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: blocker.permanentId })).toEqual({
      ok: true,
    });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.decisions.slice(decisionsBeforeBlock).filter((decision) => decision.seat === 0)).toEqual([]);
    expect(blockerDpAtBattle).toBe(2000);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.events.some((event) => event.kind === "combatResolved")).toBe(true);
  });
});
