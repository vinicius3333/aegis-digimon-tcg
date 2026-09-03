import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT13-088.js";
import "./BT13-091.js";

describe("BT13-088 Belphemon: Sleep Mode", () => {
  it("requires placing Belphemon: Rage Mode from trash before restricting attacks and granting immunity", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const actions = compiled.effects?.find((entry) => entry.trigger === trigger)?.actions ?? [];
      expect(actions[0]).toMatchObject({
        kind: "Restrict",
        restriction: "attack",
        duration: "untilOpponentTurnEnd",
        abortOnDecline: true,
        cost: {
          kind: "place",
          destination: "digivolutionStack",
          position: "top",
          host: "self",
          target: {
            filter: {
              zone: "trash",
              controller: "mine",
              nameOrTrait: [{ match: "nameExact", tokens: ["Belphemon: Rage Mode"] }],
            },
            count: 1,
          },
          optional: true,
        },
      });
      expect(actions[1]).toMatchObject({
        kind: "GrantImmunity",
        immuneFrom: "opponentEffects",
        duration: "untilOpponentTurnEnd",
        condition: { kind: "ifThisEffectActed" },
      });
    }
  });

  it("ends an opponent's attack by trashing two cards from hand once per opponent turn", () => {
    const effect = compiled.effects?.find((entry) => entry.trigger === "OpponentsTurn");
    expect(effect).toMatchObject({ frequency: "OncePerTurn" });
    const watcher = effect?.actions?.[0];
    expect(watcher?.kind).toBe("SubTrigger");
    if (watcher?.kind !== "SubTrigger") throw new Error("Expected SubTrigger action");
    expect(watcher.actions?.[0]).toMatchObject({
      kind: "EndAttack",
      optional: true,
      abortOnDecline: true,
      cost: { kind: "trash", target: { filter: { zone: "hand", controller: "mine" }, count: 2 } },
    });
  });

  it("uses the exact Rage Mode from trash before granting the play restrictions", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT13-088", as: "sleep" }], trash: [{ card: "BT13-091", as: "rage" }] } },
      { autoAcceptOptional: true },
    );
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("sleep"));
    await settle(() => s.perm("sleep").stack.some((card) => card.cardId === "BT13-091"));
    expect(s.perm("sleep").stack.at(-1)?.cardId).toBe("BT13-091");
  });

  it("accepts the optional processing cost on a real play and then grants both restrictions", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "BT13-088", as: "sleep" }], trash: [{ card: "BT13-091", as: "rage" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 11;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sleep").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("sleep").stack.some((card) => card.cardId === "BT13-091"));
    expect(s.perm("sleep").stack.at(-1)?.cardId).toBe("BT13-091");
    expect(observe(s.engine).hasRestriction(s.perm("sleep"), "attack")).toBe(true);
    expect(observe(s.engine).hasRestriction(s.perm("sleep"), "beAffected")).toBe(true);
  });

  it("declines the optional processing cost without placing Rage Mode or granting restrictions", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "BT13-088", as: "sleep" }], trash: [{ card: "BT13-091", as: "rage" }] } },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 11;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sleep").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined && s.perm("sleep").stack.length === 0);
    expect(s.perm("sleep").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT13-091");
    expect(observe(s.engine).hasRestriction(s.perm("sleep"), "attack")).toBe(false);
    expect(observe(s.engine).hasRestriction(s.perm("sleep"), "beAffected")).toBe(false);
  });

  it("ends one real opponent attack for two hand cards and does not repeat the watcher that turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-088", as: "sleep" }],
          hand: ["BT1-001", "BT1-002", "BT1-003", "BT1-004"],
        },
        1: {
          battleArea: [
            { card: "BT13-081", as: "attackerOne" },
            { card: "BT13-082", as: "attackerTwo" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attackerOne").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 2);
    expect(s.state.players[0]!.hand).toHaveLength(2);
    expect(s.state.players[0]!.trash).toHaveLength(2);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attackerTwo").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("attackerTwo").isSuspended);
    expect(s.state.players[0]!.hand).toHaveLength(2);
    expect(s.state.players[0]!.trash).toHaveLength(2);
  });

  it("uses an exact alternate digivolution name", () => {
    expect(compiled.digivolutionRequirement).toEqual([
      { namesExact: ["Belphemon: Rage Mode"], cost: 1, isAlternate: true },
    ]);
  });
});
