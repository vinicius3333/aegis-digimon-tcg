import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-096.js";
import { observe } from "../../engine/testkit/observe.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import "../index.js";

describe("BT14-096", () => {
  it("suspends one opposing Digimon and independently restricts one opposing Digimon with Mimi", () => {
    expect(compiled.effects?.[0]?.actions[0]).toMatchObject({
      kind: "Suspend",
      target: { filter: { controller: "opponent" } },
    });
    expect(compiled.effects?.[0]?.actions[1]).toMatchObject({
      kind: "Restrict",
      restriction: "unsuspend",
      duration: "untilOpponentTurnEnd",
      condition: { kind: "youHave" },
    });
    expect(compiled.effects?.[0]?.actions[0]).not.toHaveProperty("target.sameTarget");
    expect(compiled.effects?.[0]?.actions[1]).not.toHaveProperty("target.sameTarget");
  });
  it("activates main and returns itself from security", () =>
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [{ kind: "ActivateMain" }, { kind: "AddToHandSelf" }],
    }));

  it("naturally suspends and restricts two distinct opposing Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-085", as: "mimi" }],
          hand: [{ card: "BT14-096", as: "option" }],
        },
        1: {
          battleArea: [
            { card: "BT14-058", as: "suspendTarget" },
            { card: "BT14-058", as: "restrictTarget" },
          ],
        },
      },
      { autoAcceptOptional: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const suspendDecision = s.state.pendingDecision;
    if (suspendDecision?.kind !== "chooseTargets") throw new Error("suspend target decision did not open");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: suspendDecision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("suspendTarget").permanentId] },
      }),
    ).toEqual({ ok: true });

    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const restrictDecision = s.state.pendingDecision;
    if (restrictDecision?.kind !== "chooseTargets") throw new Error("restriction target decision did not open");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: restrictDecision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("restrictTarget").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("restrictTarget"), "unsuspend"));

    expect(s.perm("suspendTarget").isSuspended).toBe(true);
    expect(s.perm("restrictTarget").isSuspended).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("suspendTarget"), "unsuspend")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("restrictTarget"), "unsuspend")).toBe(true);
  });

  it("naturally applies Main from a Security check and returns Blooming of Sincerity to hand", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT14-058", as: "attacker" }] },
        1: {
          battleArea: [{ card: "BT14-085", as: "mimi" }],
          security: [{ card: "BT14-096", as: "securityOption" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.hand.some((card) => card.cardId === "BT14-096"));

    expect(observe(s.engine).isRestricted(s.perm("attacker"), "unsuspend")).toBe(true);
    expect(s.state.players[1]!.hand.some((card) => card.cardId === "BT14-096")).toBe(true);
  });
});

describe("BT14-096 Blooming of Sincerity — KB Q&A rulings", () => {
  it("keeps the unsuspend lock after the Mimi Tachikawa Tamer leaves the battle area (Q2472)", async () => {
    const filler = ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013"];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-085", as: "mimi" }],
          hand: [{ card: "BT14-096", as: "option" }],
          deck: filler,
          security: 3,
        },
        1: {
          battleArea: [
            { card: "BT14-058", as: "suspendTarget" },
            { card: "BT14-058", as: "restrictTarget", suspended: true },
          ],
          deck: filler,
          security: 3,
        },
      },
      { autoAcceptOptional: true },
    );
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const suspendDecision = s.state.pendingDecision;
    if (suspendDecision?.kind !== "chooseTargets") throw new Error("suspend target decision did not open");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: suspendDecision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("suspendTarget").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const restrictDecision = s.state.pendingDecision;
    if (restrictDecision?.kind !== "chooseTargets") throw new Error("restriction target decision did not open");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: restrictDecision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("restrictTarget").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT14-096"));
    await settle();

    const mimiId = s.perm("mimi").permanentId;
    expect(await advance(s.engine).verb.deletePermanent([mimiId])).toBe(1);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT14-085")).toBe(false);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);

    expect(s.perm("suspendTarget").isSuspended).toBe(false);
    expect(s.perm("restrictTarget").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("restrictTarget"), "unsuspend")).toBe(true);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
