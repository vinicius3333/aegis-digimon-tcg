import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX6-063.js";

describe("EX6-063 T.K. Takaishi & Kari Kamiya", () => {
  it("exposes complete IR for Barrier, Angel, and Security clauses", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toHaveLength(4);
    expect(compiled.effects.filter((effect) => effect.trigger === "OnPlay")).toHaveLength(1);
    expect(compiled.effects.filter((effect) => effect.trigger === "StartOfYourMainPhase")).toHaveLength(1);
    expect(compiled.effects.filter((effect) => effect.trigger === "YourTurn")).toHaveLength(1);
    expect(compiled.effects.filter((effect) => effect.trigger === "Security")).toHaveLength(1);
    expect(compiled.effects.find((effect) => effect.trigger === "YourTurn")?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      actions: [{ kind: "GainMemory", condition: { kind: "triggerSubjectMatchesFilter" } }],
    });
  });
  it("publicly grants Barrier to one of its controller's yellow Digimon on play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX6-063", as: "tamer" },
            { card: "BT1-053", as: "yellow" },
            { card: "BT1-009", as: "red" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("tamer"));
    expect(observe(s.engine).hasKeyword(s.perm("yellow"), "Barrier")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("red"), "Barrier")).toBe(false);
  });

  it("publicly grants Barrier at the start of its controller's main phase", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX6-063", as: "tamer" },
          { card: "BT1-053", as: "yellow" },
        ],
      },
    });
    await s.ready();
    await advance(s.engine).runTurn(0);
    expect(observe(s.engine).hasKeyword(s.perm("yellow"), "Barrier")).toBe(true);
  });

  it("suspends itself and gains memory when an Angel is played, but not for a near-miss Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX6-063", as: "tamer" }],
          hand: [{ card: "BT1-053", as: "angel" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("angel").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("tamer").isSuspended);
    expect(s.perm("tamer").isSuspended).toBe(true);
    expect(s.state.memory).toBe(2);

    const nearMiss = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX6-063", as: "tamer" }],
          hand: [{ card: "BT1-009", as: "nonAngel" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    nearMiss.state.memory = 5;
    await nearMiss.ready();
    expect(
      nearMiss.engine.applyIntent(0, { type: "playCard", instanceId: nearMiss.inst("nonAngel").instanceId }),
    ).toEqual({ ok: true });
    await settle(() => nearMiss.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT1-009"));
    expect(nearMiss.perm("tamer").isSuspended).toBe(false);
    expect(nearMiss.state.memory).toBe(3);
  });

  it("checks the post-digivolution subject for the Angel trait and spends exactly three evolution memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX6-063", as: "tamer" },
            { card: "BT1-053", as: "base" },
          ],
          hand: [{ card: "BT1-060", as: "angel" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("angel").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT1-060");

    expect(s.perm("base").topCard?.cardId).toBe("BT1-060");
    expect(s.perm("tamer").isSuspended).toBe(true);
    expect(s.state.memory).toBe(1);
  });
});
