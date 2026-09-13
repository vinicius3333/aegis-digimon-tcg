import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./LM-004.js";
import "../BT1/BT1-039.js";
import "./LM-003.js";
import "./LM-005.js";

describe("LM-004 Thetismon", () => {
  it("trashes exactly two blue cards to unsuspend a Digimon and Kiyoshiro and gain Blocker", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-027", as: "digimon", suspended: true },
            { card: "BT9-086", as: "kiyoshiro", suspended: true },
          ],
          hand: [{ card: "LM-004", as: "thetismon" }, "BT1-027", "BT1-027", "BT1-029"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("thetismon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.perm("digimon").isSuspended && !s.perm("kiyoshiro").isSuspended);

    expect(s.state.players[0]!.trash.filter((card) => card.cardId === "BT1-027")).toHaveLength(2);
    expect(s.perm("digimon").isSuspended).toBe(false);
    expect(s.perm("kiyoshiro").isSuspended).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("thetismon"), "Blocker")).toBe(true);
  });

  it("does the same on the When Digivolving timing", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "LM-003", as: "base", suspended: true },
            { card: "BT9-086", as: "kiyoshiro", suspended: true },
          ],
          hand: [{ card: "LM-004", as: "thetismon" }, "BT1-027", "BT1-027", "BT1-029"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        instanceId: s.inst("thetismon").instanceId,
        permanentId: s.perm("base").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.perm("base").isSuspended);

    expect(s.perm("base").isSuspended).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Blocker")).toBe(true);
  });

  it("leaves the board untouched when the trash cost is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-027", as: "digimon", suspended: true },
            { card: "BT9-086", as: "kiyoshiro", suspended: true },
          ],
          hand: [{ card: "LM-004", as: "thetismon" }, "BT1-027", "BT1-027"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("thetismon").instanceId })).toEqual({
      ok: true,
    });

    await settle(() => s.state.pendingDecision == null);

    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.perm("digimon").isSuspended).toBe(true);
    expect(s.perm("kiyoshiro").isSuspended).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("thetismon"), "Blocker")).toBe(false);
  });

  it("cannot resolve the entrance effect with fewer than two blue cards to trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-027", as: "digimon", suspended: true },
            { card: "BT9-086", as: "kiyoshiro", suspended: true },
          ],
          hand: [{ card: "LM-004", as: "thetismon" }, "BT1-027", "BT1-020"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("thetismon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision == null);

    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.perm("digimon").isSuspended).toBe(true);
    expect(s.perm("kiyoshiro").isSuspended).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("thetismon"), "Blocker")).toBe(false);
  });

  it("unsuspends the host once per turn when a Jellymon-text card is trashed from hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "LM-005", as: "host", under: ["LM-004"], suspended: true },
            { card: "BT1-039", as: "attacker" },
          ],
          hand: [{ card: "LM-002", as: "jellymon" }, "BT1-029", "BT1-029"],
        },
        1: { security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.perm("host").isSuspended);
    expect(s.perm("host").isSuspended).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "LM-002")).toBe(true);
  });

  it("suppresses a second real hand-trash trigger in the same turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "LM-005", as: "host", under: ["LM-004"], suspended: true },
            { card: "LM-003", as: "first" },
            { card: "LM-003", as: "second" },
          ],
          hand: [
            { card: "LM-002", as: "firstJelly" },
            { card: "LM-002", as: "secondJelly" },
            { card: "LM-002", as: "thirdJelly" },
            "BT1-027",
            "BT1-027",
            "BT1-027",
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"],
        },
        1: {
          security: [
            "BT1-009",
            "BT1-010",
            "BT1-011",
            "BT1-012",
            "BT1-013",
            "BT1-014",
            "BT1-015",
            "BT1-016",
            "BT1-017",
            "BT1-018",
          ],
          deck: ["BT1-019"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("firstJelly").instanceId, s.inst("secondJelly").instanceId, s.inst("thirdJelly").instanceId);
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("host").isSuspended).toBe(true);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("first").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("host").isSuspended).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("host").isSuspended).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("second").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("host").isSuspended).toBe(true);

    // End the real turn, let the opponent take a real turn, then prove the once-per-turn
    // inherited watcher is available again on the controller's next turn.
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("host").isSuspended).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("second").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.perm("host").isSuspended);
    expect(s.perm("host").isSuspended).toBe(false);
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("ignores a hand-trashed card with no Jellymon in its text", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "LM-005", as: "host", under: ["LM-004"], suspended: true },
            { card: "BT1-039", as: "attacker" },
          ],
          hand: [{ card: "BT1-027", as: "unrelated" }, "BT1-027", "BT1-027"],
        },
        1: { security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    // The neutral blue card is not Jellymon-text, so an actual hand-trash event must not arm it.
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.perm("host").isSuspended).toBe(true);
  });

  it("matches committed metadata and publishes fully covered compiled IR", () => {
    const definition = getCardDefinition("LM-004");
    const compiled = runtimeCompiledCard("LM-004");
    expect(definition?.nameEn).toBe("Thetismon");
    expect(definition?.dp).toBe(7000);
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled?.effects.find((effect) => effect.isInherited)).toMatchObject({ frequency: "OncePerTurn" });
  });
});
