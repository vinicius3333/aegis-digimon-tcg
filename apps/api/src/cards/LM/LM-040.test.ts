import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./LM-040.js";

describe("LM-040 Vikemon", () => {
  it("trashes any four opposing digivolution cards across the opponent's Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "LM-040", as: "vikemon" }] },
        1: {
          battleArea: [
            { card: "BT1-041", as: "first", under: ["BT1-009", "BT1-009"] },
            { card: "BT1-041", as: "second", under: ["BT1-009", "BT1-009"] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("vikemon"));
    await settle(() => s.state.players[1]!.trash.length === 4, 2000);

    expect(s.state.players[1]!.trash.filter((card) => card.cardId === "BT1-009")).toHaveLength(4);
    expect(s.perm("first").stack.length + s.perm("second").stack.length).toBe(0);
  });

  it("unsuspends itself when no opposing Digimon matches its stack depth", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "LM-040", as: "vikemon", suspended: true, under: ["BT1-009", "BT1-009"] }] },
        1: { battleArea: [{ card: "BT1-041", as: "shallow", under: ["BT1-009"] }], security: 2 },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("vikemon"));
    await settle(() => !s.perm("vikemon").isSuspended, 2000);

    expect(s.perm("vikemon").isSuspended).toBe(false);
  });

  it("stays suspended while the opponent matches its stack depth", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "LM-040", as: "vikemon", suspended: true, under: ["BT1-009"] }] },
        1: { battleArea: [{ card: "BT1-041", as: "deep", under: ["BT1-009", "BT1-009"] }], security: 2 },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("vikemon"));
    await settle(() => s.state.pendingDecision === null);

    expect(s.perm("vikemon").isSuspended).toBe(true);
  });

  it("still applies -6000 to the opponent's Security Digimon when the unsuspend condition fails, per Q4843", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "LM-040", as: "vikemon", suspended: true, under: ["BT1-009"] }] },
        1: { battleArea: [{ card: "BT1-041", as: "deep", under: ["BT1-009", "BT1-009"] }], security: 2 },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("vikemon"));
    await settle(() => observe(s.engine).securityDp(1) === -6000, 2000);

    expect(observe(s.engine).securityDp(1)).toBe(-6000);
  });

  it("spends the attacking clause only once per turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "LM-040", as: "vikemon", suspended: true, under: ["BT1-009"] }] },
        1: { battleArea: [{ card: "BT1-041", as: "deep", under: ["BT1-009", "BT1-009"] }], security: 2 },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("vikemon"));
    await settle(() => observe(s.engine).securityDp(1) === -6000, 2000);
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("vikemon"));
    await settle(() => s.state.pendingDecision === null);

    expect(observe(s.engine).securityDp(1)).toBe(-6000);
  });

  it("matches committed metadata and publishes fully covered compiled IR", () => {
    const definition = getCardDefinition("LM-040");
    const compiled = runtimeCompiledCard("LM-040");
    expect(definition?.nameEn).toBe("Vikemon");
    expect(definition?.colors).toEqual(["Blue", "Yellow"]);
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled?.effects[0]).toMatchObject({ keywords: [{ keyword: "IceClad" }] });
  });
});
