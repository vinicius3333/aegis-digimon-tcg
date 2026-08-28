import { describe, expect, it } from "vitest";
import { EffectTiming, Zone, getCardDefinition } from "@aegis/shared";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
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
        0: { battleArea: [{ card: "LM-013", as: "diarbbitmon" }] },
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
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("diarbbitmon"));
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
          hand: [{ card: "LM-011", as: "symbare" }],
        },
        1: { security: 2 },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("diarbbitmon"));
    await settle(
      () => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "LM-011"),
      2000,
    );

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "LM-011")).toBe(true);
    expect(s.state.memory).toBe(0);
  });

  it("returns the played Digimon to hand at the next end of the opponent's turn, trashing its stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "LM-013", as: "diarbbitmon" }],
          hand: [{ card: "LM-011", as: "symbare" }],
        },
        1: { security: 2 },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("diarbbitmon"));
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "LM-011"), 2000);

    // Q4001: the top card goes back to the hand and everything under it is trashed.
    const played = s.state.players[0]!.battleArea.find((p) => p.topCard?.cardId === "LM-011")!;
    played.stack.push(s.give(0, Zone.Trash, { card: "LM-008", as: "beneath" }));

    s.state.turnSeat = 1;
    // The DelayedEffect is a one-shot `endOfTurn` watcher; firing it raw keeps the armed
    // subscription intact, which is what production does between an event and its bodies.
    await advance(s.engine).fireArmedSubTriggers("endOfTurn", {});
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "LM-011"), 2000);

    expect(s.state.players[0]!.hand.some((card) => card.cardId === "LM-011")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "LM-011")).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "LM-008")).toBe(true);
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
