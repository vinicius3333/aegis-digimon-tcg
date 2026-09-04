import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor, EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { compiled } from "./EX8-024.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";

describe("EX8-024", () => {
  it("unsuspends one of your Digimon on play and digivolving", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "Unsuspend",
      target: { count: 1 },
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({
      kind: "Unsuspend",
      target: { count: 1 },
    });
  });
  it("gates the attack restriction at the printed one-memory threshold", () =>
    expect(
      compiled.effects?.find((entry) => entry.trigger === "WhenAttacking" && !entry.isInherited)?.actions[0],
    ).toMatchObject({
      kind: "Restrict",
      restriction: "suspend",
      condition: { kind: "memoryAtLeast", value: 1 },
      duration: "untilOpponentTurnEnd",
    }));
  it("inherits the optional other-Digimon placement cost that unsuspends the host", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Unsuspend",
          optional: true,
          cost: { kind: "place", targetIsPermanent: true, destination: "digivolutionStack", position: "bottom" },
        },
      ],
    }));
  it("unsuspends an allied Digimon on play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX8-024", as: "source", suspended: true }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    expect(s.perm("source").isSuspended).toBe(false);
  });
  it("restricts one opposing Digimon from suspending while you have memory", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX8-024", as: "source" }] },
      1: { battleArea: [{ card: "EX8-021", as: "opponent" }] },
    });
    s.state.memory = 1;
    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("source"), {
      subjectPermanentId: s.perm("source").permanentId,
    });
    await settle(() => observe(s.engine).isRestricted(s.perm("opponent"), "suspend"));
    expect(observe(s.engine).isRestricted(s.perm("opponent"), "suspend")).toBe(true);
  });

  it("does not consume the attack effect at 0 memory, then applies it at 1 (Q3891)", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX8-024", as: "source" }] },
      1: { battleArea: [{ card: "EX8-021", as: "opponent" }], security: 2 },
    });
    await s.ready();
    s.state.memory = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("source").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);
    expect(observe(s.engine).isRestricted(s.perm("opponent"), "suspend")).toBe(false);

    await advance(s.engine).verb.unsuspend([s.perm("source").permanentId]);
    s.state.memory = 1;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("source").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("opponent"), "suspend"));
    expect(observe(s.engine).isRestricted(s.perm("opponent"), "suspend")).toBe(true);
  });

  it("pays the inherited placement cost, moves the other Digimon under, and unsuspends the host", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT8-030", as: "host", under: ["EX8-024"] },
            { card: "EX8-017", as: "other" },
          ],
        },
        1: { security: 1 },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const otherId = s.perm("other").topCard.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").stack.some((card) => card.instanceId === otherId));

    expect(s.perm("host").isSuspended).toBe(false);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.perm("host").stack[0]!.instanceId).toBe(otherId);
  });

  it("uses the level-4 DS route for 3 and unsuspends an ally when digivolving", async () => {
    expect(digivolutionRequirementsFor("EX8-024")).toContainEqual({
      level: 4,
      traits: ["DS"],
      cost: 3,
      isAlternate: true,
    });
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX8-020", as: "dolphmon" },
            { card: "EX8-017", as: "ally", suspended: true },
          ],
          hand: [{ card: "EX8-024", as: "megaSeadramon" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("dolphmon").permanentId,
        instanceId: s.inst("megaSeadramon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.perm("ally").isSuspended);
    expect(s.state.memory).toBe(0);
  });
});
