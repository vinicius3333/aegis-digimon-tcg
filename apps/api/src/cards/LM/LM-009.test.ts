import { describe, expect, it } from "vitest";
import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./LM-009.js";
import "../index.js";

describe("LM-009 Airdramon", () => {
  it("suspends itself to reduce an Angoramon-text card's play cost by 2", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "LM-009", as: "airdramon" }], hand: [{ card: "LM-011", as: "symbare" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("symbare").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("airdramon").isSuspended, 2000);

    // SymbareAngoramon costs 5; the reduction charges 3 and suspends Airdramon.
    expect(s.perm("airdramon").isSuspended).toBe(true);
    expect(s.state.memory).toBe(2);
  });

  it("leaves a card with no Angoramon in its text at full price", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "LM-009", as: "airdramon" }], hand: [{ card: "LM-010", as: "chamblemon" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("chamblemon").instanceId });
    await settle(() => s.state.pendingDecision === null);

    expect(s.perm("airdramon").isSuspended).toBe(false);
    expect(s.state.memory).toBe(0);
  });

  it("reduces the digivolution cost only when the destination has Angoramon in its text", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "LM-009", as: "airdramon" },
            { card: "LM-008", as: "base" },
          ],
          hand: [{ card: "LM-011", as: "symbare" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        instanceId: s.inst("symbare").instanceId,
        permanentId: s.perm("base").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "LM-011", 2000);

    // The printed digivolution cost is 2, reduced to 0 by suspending Airdramon.
    expect(s.perm("airdramon").isSuspended).toBe(true);
    expect(s.state.memory).toBe(2);
  });

  it("does not reduce a digivolution into a card with no Angoramon in its text, per Q3998", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "LM-009", as: "airdramon" },
            { card: "LM-008", as: "base" },
          ],
          hand: [{ card: "LM-010", as: "chamblemon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        instanceId: s.inst("chamblemon").instanceId,
        permanentId: s.perm("base").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "LM-010", 2000);

    expect(s.perm("airdramon").isSuspended).toBe(false);
    expect(s.state.memory).toBe(0);
  });

  it("grants Rush to an Angoramon-text Digimon when it becomes suspended", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "LM-009", as: "airdramon" },
            { card: "LM-011", as: "symbare", enteredThisTurn: true },
          ],
        },
        1: { security: 2 },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("symbare").permanentId, s.perm("symbare").topCard!.instanceId);
    s.state.turnSeat = 0;
    await s.ready();

    // Declaring an attack suspends the attacker, which is the printed trigger.
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("airdramon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("symbare"), "Rush"), 3000);

    expect(s.perm("airdramon").isSuspended).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("symbare"), "Rush")).toBe(true);
  });

  it("cannot grant Rush from the suspension that paid for its own digivolution, per Q3999", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "LM-009", as: "airdramon" }],
          hand: [{ card: "LM-012", as: "lamortmon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const basePermanentId = s.perm("airdramon").permanentId;

    // Airdramon is both the reducer and the base: once the digivolution completes it is a
    // digivolution card, so its "when this Digimon becomes suspended" clause is gone.
    s.engine.applyIntent(0, {
      type: "digivolve",
      instanceId: s.inst("lamortmon").instanceId,
      permanentId: basePermanentId,
    });
    await settle(() => s.perm("airdramon").topCard?.cardId === "LM-012", 2000);

    expect(s.perm("airdramon").topCard?.cardId).toBe("LM-012");
    expect(observe(s.engine).hasKeyword(basePermanentId, "Rush")).toBe(false);
  });

  it("matches committed metadata and publishes fully covered compiled IR", () => {
    const definition = getCardDefinition("LM-009");
    const compiled = runtimeCompiledCard("LM-009");
    expect(definition?.nameEn).toBe("Airdramon");
    expect(definition?.dp).toBe(4000);
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    void EffectTiming;
  });
});
