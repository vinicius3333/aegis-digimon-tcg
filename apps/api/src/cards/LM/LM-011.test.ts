import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./LM-011.js";

describe("LM-011 SymbareAngoramon", () => {
  it("suspends the opponent's only Digimon and hands out Blocker", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "LM-011", as: "symbare" }] },
        1: { battleArea: [{ card: "BT1-080", as: "victim" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("symbare").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("victim").isSuspended, 2000);

    expect(s.perm("victim").isSuspended).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("symbare"), "Blocker")).toBe(true);
  });

  it("withholds Blocker while the opponent still has an unsuspended Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "LM-008", as: "base" }], hand: [{ card: "LM-011", as: "symbare" }] },
        1: {
          battleArea: [
            { card: "BT1-080", as: "victim" },
            { card: "BT2-064", as: "survivor" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        instanceId: s.inst("symbare").instanceId,
        permanentId: s.perm("base").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision == null);

    expect(s.state.players[1]!.battleArea.filter((permanent) => !permanent.isSuspended)).toHaveLength(1);
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Blocker")).toBe(false);
  });

  it("still grants Blocker when the opponent has no Digimon at all, per Q4000", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "LM-011", as: "symbare" }] },
        1: {},
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("symbare").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).hasKeyword(s.perm("symbare"), "Blocker"), 2000);

    expect(observe(s.engine).hasKeyword(s.perm("symbare"), "Blocker")).toBe(true);
  });

  it("can hand the Blocker grant to another of the controller's Digimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-024", as: "ally" }],
          hand: [{ card: "LM-011", as: "symbare" }],
        },
        1: {},
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("ally").permanentId);
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("symbare").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).hasKeyword(s.perm("ally"), "Blocker"), 2000);

    expect(observe(s.engine).hasKeyword(s.perm("ally"), "Blocker")).toBe(true);
  });

  it("grants its inherited +2000 DP on your turn to an Angoramon-text host", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "LM-013", as: "host", under: ["LM-011"] }] } },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    await s.ready();

    expect(s.perm("host").currentDP).toBe(getCardDefinition("LM-013")!.dp! + 2000);
  });

  it("matches committed metadata and publishes fully covered compiled IR", () => {
    const definition = getCardDefinition("LM-011");
    const compiled = runtimeCompiledCard("LM-011");
    expect(definition?.nameEn).toBe("SymbareAngoramon");
    expect(definition?.dp).toBe(5000);
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });
});
