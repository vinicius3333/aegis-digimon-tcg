import { describe, expect, it } from "vitest";
import { advance } from "./testkit/advance.js";
import { settle, setupEngine } from "./testkit/harness.js";
import { observe } from "./testkit/observe.js";
import "../cards/index.js";

describe("BT25-020 Marsmon Piercing controls", () => {
  it("does not Piercing-check when the direct battle deletes the original attack target before ordinary combat", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT25-020", as: "marsmon", linked: [{ card: "BT25-100", as: "piercingLink" }] }] },
        1: {
          battleArea: [{ card: "BT1-009", as: "victim", dp: 3000, suspended: true }],
          security: ["BT1-001", "BT1-002", "BT1-003"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("marsmon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("victim").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("victim").instanceId);
    expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(0);
    expect(s.state.players[1]!.security).toHaveLength(2); // Marsmon's separate battle-won security trash only.
  });

  it("does not carry Piercing eligibility into a second public attack after declining its direct battle", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT25-020", as: "marsmon", linked: [{ card: "BT25-100", as: "piercingLink" }] }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "firstDirect", dp: 3000, suspended: true },
            { card: "BT1-009", as: "firstOrdinary", dp: 3000, suspended: true },
            { card: "BT13-041", as: "secondOrdinary", dp: 16000, suspended: true },
          ],
          security: ["BT1-001", "BT1-002", "BT1-003", "BT1-004", "BT1-005"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("marsmon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("firstOrdinary").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const firstOptional = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: firstOptional.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined && s.state.players[1]!.battleArea.length === 1);
    expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(1);

    await advance(s.engine).verb.unsuspend([s.perm("marsmon").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("marsmon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("secondOrdinary").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const secondOptional = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: secondOptional.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "barrierPrompt"));
    expect(
      s.engine.applyIntent(1, {
        type: "respondBarrier",
        permanentId: s.perm("secondOrdinary").permanentId,
        accept: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(observe(s.engine).isAttacking()).toBe(false);
    expect(s.state.players[0]!.battleArea.map((p) => p.permanentId)).toContain(s.perm("marsmon").permanentId);

    expect(s.state.players[1]!.battleArea.map((p) => p.topCard?.instanceId)).toContain(
      s.inst("secondOrdinary").instanceId,
    );
    expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(1);
    expect(s.state.players[1]!.security).toHaveLength(2); // one Piercing check, one TS trash and the second battle's Barrier cost.
  });

  it("does not credit the actual Marsmon attacker when a different own Piercing Digimon conducts the direct battle", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT25-020", as: "marsmon" },
            { card: "BT24-017", as: "piercingDigimon", dp: 11000 },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "directVictim", dp: 3000, suspended: true },
            { card: "BT1-009", as: "ordinaryVictim", dp: 3000, suspended: true },
          ],
          security: ["BT1-001", "BT1-002", "BT1-003"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.turnSeat = 0;
    preferred.push(s.perm("piercingDigimon").permanentId, s.perm("directVictim").permanentId);
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("marsmon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("ordinaryVictim").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT1-009", "BT1-009"]),
    );
    expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(0);
    expect(s.state.players[1]!.security).toHaveLength(2); // Marsmon's separate battle-won security trash only.
  });
});
