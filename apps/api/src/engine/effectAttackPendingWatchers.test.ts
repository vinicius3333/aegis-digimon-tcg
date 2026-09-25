import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "./testkit/harness.js";
import "../cards/index.js";

/**
 * CR 11-1-4 and KB Q819/Q3625: when a triggered effect makes a Digimon attack, the attack
 * pauses after its declaration. The attack's [When Attacking] effects and every other effect
 * still pending from the same event resolve before Counter Timing, so before the security
 * check. Discord bug 1552850309875765358 (match dc0bb1b7): BT21-018's "when this Digimon gets
 * linked, it may attack" finished the whole attack before BT21-084's pending link watcher.
 */
describe("effect-driven attack with other pending watchers from the same event", () => {
  it("resolves the sibling watcher before the security check", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-018", as: "attacker" },
            { card: "BT21-084", as: "tamer" },
          ],
          hand: [{ card: "BT21-047", as: "link" }],
          deck: ["BT1-001", "BT1-002", "BT1-003"],
        },
        1: { security: ["BT1-001", "BT1-002"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferTriggerKeys: ["BT21-018"] },
    );
    s.state.memory = 5;
    await s.ready();
    const tamerId = s.perm("tamer").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("link").instanceId,
        targetPermanentId: s.perm("attacker").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1 && s.perm("tamer").isSuspended);

    const attackIndex = s.events.findIndex((event) => event.kind === "attackDeclared");
    const tamerSuspendIndex = s.events.findIndex(
      (event) => event.kind === "cardsMoved" && event.to === "suspended" && event.instanceIds.includes(tamerId),
    );
    const securityIndex = s.events.findIndex((event) => event.kind === "securityRevealed");
    expect(attackIndex).toBeGreaterThanOrEqual(0);
    expect(tamerSuspendIndex).toBeGreaterThan(attackIndex);
    expect(securityIndex).toBeGreaterThan(tamerSuspendIndex);
  });

  it("resolves a pending printed [When Linking] effect from the same link before the attack advances", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-018", as: "attacker" }],
          hand: [{ card: "BT21-054", as: "link" }],
        },
        1: { battleArea: [{ card: "BT1-010", as: "victim" }], security: ["BT1-001", "BT1-002"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferTriggerKeys: ["subtrigger"] },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("link").instanceId,
        targetPermanentId: s.perm("attacker").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT21-018"));

    const attackIndex = s.events.findIndex((event) => event.kind === "attackDeclared");
    const linkingIndex = s.events.findIndex(
      (event) => event.kind === "effectResolved" && event.sourceCardId === "BT21-054",
    );
    const combatBeforeLinking = s.events
      .slice(0, linkingIndex)
      .some((event) => event.kind === "combatResolved" || event.kind === "securityRevealed");
    const attackEffectIndex = s.events.findIndex(
      (event) => event.kind === "effectResolved" && event.sourceCardId === "BT21-018",
    );
    expect(attackIndex).toBeGreaterThanOrEqual(0);
    expect(linkingIndex).toBeGreaterThan(attackIndex);
    expect(combatBeforeLinking).toBe(false);
    expect(attackEffectIndex).toBeGreaterThan(linkingIndex);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("resolves the played card's [On Play] effect before a whenPlayed watcher's attack checks security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX13-064", as: "attacker" }],
          hand: [{ card: "EX2-042", as: "played" }],
          deck: ["BT1-001", "BT1-002", "BT1-003"],
        },
        1: { security: ["BT1-001", "BT1-002"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferTriggerKeys: ["subtrigger"] },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.events.some((event) => event.kind === "alliancePrompt"));
    expect(s.engine.applyIntent(0, { type: "respondAlliance" })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);

    const attackIndex = s.events.findIndex((event) => event.kind === "attackDeclared");
    const onPlayIndex = s.events.findIndex(
      (event) => event.kind === "effectResolved" && event.sourceCardId === "EX2-042",
    );
    const securityIndex = s.events.findIndex((event) => event.kind === "securityRevealed");
    expect(attackIndex).toBeGreaterThanOrEqual(0);
    expect(onPlayIndex).toBeGreaterThan(attackIndex);
    expect(securityIndex).toBeGreaterThan(onPlayIndex);
  });
});
