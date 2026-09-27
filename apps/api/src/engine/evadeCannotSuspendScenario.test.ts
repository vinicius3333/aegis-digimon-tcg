import { EffectDuration } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { advance } from "./testkit/advance.js";
import { layDevScenario } from "./devScenario.js";
import { setupEngine, settle } from "./testkit/harness.js";
import { observe } from "./testkit/observe.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";

describe("Evade against a cannot-suspend restriction", () => {
  it("offers Evade when the same Wingdramon can pay the suspension cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "redSource" }],
          hand: [{ card: "BT11-097", as: "deletion" }],
          deck: Array(12).fill("BT1-009"),
        },
        1: { battleArea: [{ card: "EX3-020", as: "wingdramon" }], deck: Array(12).fill("BT1-009") },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const wingdramonId = s.perm("wingdramon").permanentId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("deletion").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.events.some(({ kind }) => kind === "evadePrompt"));
    expect(s.engine.applyIntent(1, { type: "respondEvade", permanentId: wingdramonId, accept: true })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("wingdramon").isSuspended && !s.state.pendingDecision);

    expect(s.state.players[1]!.trash.some(({ cardId }) => cardId === "EX3-020")).toBe(false);
  });

  it("does not offer Evade when Bishop Device prevents Wingdramon from suspending", async () => {
    const s = setupEngine({ autoAcceptOptional: true, autoSelectCards: true });
    layDevScenario("arena-ex3-wingdramon-evade-suspend-lock", s.state, [BLUE_DECK, RED_DECK]);
    await s.ready();
    const wingdramon = s.state.players[1]!.battleArea.find(({ topCard }) => topCard.cardId === "EX3-020")!;
    const wingdramonId = wingdramon.permanentId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: "dev-evade-bishop" })).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(wingdramon, "suspend") && !s.state.pendingDecision);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: "dev-evade-deletion" })).toEqual({ ok: true });
    await settle(
      () =>
        s.events.some(({ kind }) => kind === "evadePrompt") ||
        s.state.players[1]!.trash.some(({ instanceId }) => instanceId === wingdramon.topCard.instanceId),
    );

    expect(s.events.some(({ kind }) => kind === "evadePrompt")).toBe(false);
    expect(s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === wingdramonId)).toBe(false);
  });

  it("does not offer Evade to a restricted Wingdramon losing a Raid battle", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-017", as: "raider" }],
          hand: [{ card: "P-161", as: "bishop" }],
          deck: Array(12).fill("BT1-009"),
        },
        1: {
          battleArea: [{ card: "EX3-020", as: "wingdramon" }],
          deck: Array(12).fill("BT1-009"),
          security: ["BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("bishop").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).isRestricted(s.perm("wingdramon"), "suspend") && !s.state.pendingDecision);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("raider").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.events.some(({ kind }) => kind === "evadePrompt") ||
        s.state.players[1]!.trash.some(({ cardId }) => cardId === "EX3-020"),
    );

    expect(s.events.some(({ kind }) => kind === "evadePrompt")).toBe(false);
    expect(s.state.players[1]!.trash.some(({ cardId }) => cardId === "EX3-020")).toBe(true);
  });

  it("does not spend a restricted ally as an Alliance suspension cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT22-011", as: "allianceAttacker" },
            { card: "BT1-009", as: "restrictedAlly" },
          ],
          deck: Array(12).fill("BT1-009"),
        },
        1: { deck: Array(12).fill("BT1-009"), security: ["BT1-009", "BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    advance(s.engine).ledgers.continuous.addRestriction(
      s.perm("restrictedAlly").permanentId,
      "suspend",
      EffectDuration.UntilEachTurnEnd,
    );
    await advance(s.engine).recompute();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("allianceAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.events.some(({ kind }) => kind === "alliancePrompt") || s.state.players[1]!.security.length < 2,
    );

    expect(s.events.some(({ kind }) => kind === "alliancePrompt")).toBe(false);
    expect(s.perm("restrictedAlly").isSuspended).toBe(false);
  });

  it("allows Alliance to suspend an unrestricted ally", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT22-011", as: "allianceAttacker" },
            { card: "BT1-009", as: "ally" },
          ],
          deck: Array(12).fill("BT1-009"),
        },
        1: { deck: Array(12).fill("BT1-009"), security: ["BT1-009", "BT1-009"] },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("allianceAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some(({ kind }) => kind === "alliancePrompt"));
    expect(s.engine.applyIntent(0, { type: "respondAlliance", allyPermanentId: s.perm("ally").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("ally").isSuspended);

    expect(s.perm("ally").isSuspended).toBe(true);
  });
});
