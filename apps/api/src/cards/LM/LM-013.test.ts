import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./LM-013.js";

describe("LM-013 Diarbbitmon", () => {
  it("suspends the last opposing Digimon and gains 2 memory", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "LM-013", as: "diarbbitmon" }] },
        1: { battleArea: [{ card: "ST1-08", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 12;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("diarbbitmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.memory === 8, 2000);

    expect(s.perm("target").isSuspended).toBe(true);
    expect(s.state.memory).toBe(8);
  });

  it("gains nothing while an unsuspended opposing Digimon remains", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "LM-012", as: "base" }], hand: [{ card: "LM-013", as: "diarbbitmon" }] },
        1: {
          battleArea: [
            { card: "BT1-080", as: "victim" },
            { card: "BT2-064", as: "survivor" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("victim").permanentId);
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("diarbbitmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("victim").isSuspended, 2000);

    expect(s.perm("victim").isSuspended).toBe(true);
    expect(s.state.memory).toBe(0);
  });

  it("blast-digivolves from hand in the counter window without paying the cost", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "LM-013", as: "diarbbitmon" }], battleArea: [{ card: "LM-012", as: "base" }] },
        // A second unsuspended Digimon keeps the [When Digivolving] memory gain off, so memory
        // reflects the cost waiver alone.
        1: {
          battleArea: [
            { card: "BT1-080", as: "attacker" },
            { card: "BT2-064", as: "bystander" },
          ],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 2;
    await s.ready();
    s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    });
    await settle();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        instanceId: s.inst("diarbbitmon").instanceId,
        permanentId: s.perm("base").permanentId,
        useBlastDigivolve: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "LM-013");

    expect(s.perm("base").topCard?.cardId).toBe("LM-013");
    expect(s.state.memory).toBe(2);
  });

  it("plays an Angoramon-text Digimon from hand for free when attacking", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "LM-013", as: "diarbbitmon" }],
          hand: [
            { card: "LM-008", as: "angoramon" },
            { card: "LM-008", as: "symbare" },
          ],
        },
        1: { security: ["BT1-009", "BT1-010"], deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("diarbbitmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking(), 2000);
    await settle(
      () => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "LM-008"),
      2000,
    );

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "LM-008")).toBe(true);
    expect(s.state.memory).toBe(0);
  });

  it("leaves the optional Angoramon play in hand when declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "LM-013", as: "diarbbitmon" }],
          hand: [
            { card: "LM-008", as: "angoramon" },
            { card: "LM-011", as: "symbare" },
          ],
        },
        1: { security: ["BT1-009", "BT1-010"], deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("diarbbitmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking(), 2000);
    await settle(() => s.state.pendingDecision == null);

    expect(s.state.players[0]!.hand.some((card) => card.cardId === "LM-011")).toBe(true);
    expect(s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard?.cardId === "LM-011")).toHaveLength(
      0,
    );
  });

  it("returns the played Digimon to hand at the next end of the opponent's turn, trashing its stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "LM-013", as: "diarbbitmon" }],
          hand: [{ card: "LM-008", as: "angoramon" }, { card: "LM-011", as: "symbare" }, "BT1-009"],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"],
        },
        1: { security: ["BT1-009", "BT1-010"], deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("diarbbitmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking(), 2000);
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "LM-008"), 2000);

    // Q4001: the top card goes back to the hand and everything under it is trashed.
    const played = s.state.players[0]!.battleArea.find((p) => p.topCard?.cardId === "LM-008")!;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: played.permanentId,
        instanceId: s.inst("symbare").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => played.topCard?.cardId === "LM-011", 2000);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "LM-011"), 2000);

    expect(s.state.players[0]!.hand.some((card) => card.cardId === "LM-011")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "LM-011")).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "LM-008")).toBe(true);
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("matches committed metadata and publishes fully covered compiled IR", () => {
    const definition = getCardDefinition("LM-013");
    const compiled = runtimeCompiledCard("LM-013");
    expect(definition?.nameEn).toBe("Diarbbitmon");
    expect(definition?.dp).toBe(11000);
    expect(definition?.isAce).toBe(true);
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });
});
