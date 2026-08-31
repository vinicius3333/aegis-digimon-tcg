import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./LM-041.js";

describe("LM-041 Regalecusmon", () => {
  it("unsuspends a DS Digimon, returns security, and restricts an opposing permanent at 1 memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX12-030", as: "ds", suspended: true },
            { card: "LM-041", as: "regalecusmon" },
          ],
        },
        1: { security: [{ card: "BT1-009" }], battleArea: [{ card: "BT1-085", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 1;

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("regalecusmon"));
    await settle(
      () =>
        s.state.players[1]!.hand.length === 1 &&
        !s.state.players[0]!.battleArea.find((p) => p.topCard?.cardId === "EX12-030")!.isSuspended,
    );

    expect(s.perm("ds").isSuspended).toBe(false);
    expect(s.state.players[1]!.hand).toHaveLength(1);
    const opponent = s.state.players[1]!.battleArea[0];
    expect(opponent).toBeDefined();
    expect(observe(s.engine).isRestricted(opponent!, "beSuspended")).toBe(true);
  });

  it("skips security return at zero memory but still applies the Then suspend lock", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "LM-041", as: "regalecusmon" }] },
        1: { security: [{ card: "BT1-009" }], battleArea: [{ card: "BT1-085", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("regalecusmon"));
    await settle(() => s.state.pendingDecision === null);

    expect(s.state.players[1]!.hand).toHaveLength(0);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(observe(s.engine).isRestricted(s.perm("opponent"), "beSuspended")).toBe(true);
  });

  it("skips the suspend lock above one memory", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "LM-041", as: "regalecusmon" }] },
        1: { security: [{ card: "BT1-009" }], battleArea: [{ card: "BT1-085", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("regalecusmon"));
    await settle(() => s.state.players[1]!.hand.length === 1, 2000);

    expect(s.state.players[1]!.hand).toHaveLength(1);
    expect(observe(s.engine).isRestricted(s.perm("opponent"), "beSuspended")).toBe(false);
  });

  it("unsuspends a DS Digimon when played", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX12-030", as: "ds", suspended: true },
            { card: "LM-041", as: "regalecusmon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("regalecusmon"));
    await settle(() => !s.perm("ds").isSuspended, 2000);

    expect(s.perm("ds").isSuspended).toBe(false);
  });

  it("matches committed metadata and publishes fully covered compiled IR", () => {
    const definition = getCardDefinition("LM-041");
    const compiled = runtimeCompiledCard("LM-041");
    expect(definition?.nameEn).toBe("Regalecusmon");
    expect(definition?.colors).toEqual(["Blue", "Black"]);
    expect(definition?.types).toEqual(["Aquatic", "DS"]);
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });
});
