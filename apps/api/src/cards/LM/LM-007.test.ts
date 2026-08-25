import { describe, expect, it } from "vitest";
import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./LM-007.js";

describe("LM-007 Publimon", () => {
  it("plays itself from security for free when it is checked, then returns on top of security", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-080", as: "attacker" }] },
        1: { security: [{ card: "LM-007", as: "publimon" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "effectResolved"), 3000);

    // Played for free out of security, then its own mandatory [End of Attack] puts it back
    // on top of the stack — so the checked card is never trashed and costs no memory.
    expect(s.events.map((event) => event.kind)).toContain("cardPlayed");
    expect(s.state.players[1]!.trash).toHaveLength(0);
    expect(s.state.players[1]!.security.map((card) => card.cardId)).toEqual(["LM-007"]);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("places itself on top of its owner's security stack at the end of an attack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "LM-007", as: "publimon" }], security: [{ card: "BT1-027" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnEndAttack, s.perm("publimon"));
    await settle(() => s.state.players[0]!.security.length === 2, 2000);

    expect(s.state.players[0]!.security.map((card) => card.cardId)).toEqual(["LM-007", "BT1-027"]);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
  });

  it("is mandatory at the end of an attack even when every prompt is declined, per Q3997", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "LM-007", as: "publimon" }], security: [{ card: "BT1-027" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnEndAttack, s.perm("publimon"));
    await settle(() => s.state.players[0]!.security.length === 2, 2000);

    expect(s.state.players[0]!.security.map((card) => card.cardId)).toEqual(["LM-007", "BT1-027"]);
  });

  it("matches committed metadata and publishes fully covered compiled IR", () => {
    const definition = getCardDefinition("LM-007");
    const compiled = runtimeCompiledCard("LM-007");
    expect(definition?.nameEn).toBe("Publimon");
    expect(definition?.dp).toBe(5000);
    expect(definition?.playCost).toBe(6);
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled?.effects.map((effect) => effect.trigger)).toEqual(["Security", "EndOfAttack"]);
  });
});
