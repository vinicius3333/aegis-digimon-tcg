import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./BT5-071.js";
import "../ST3/ST3-14.js";

describe("BT5-071 Guilmon", () => {
  it("has complete residual-free runtime coverage", () => {
    expect(runtimeCompiledCard("BT5-071")).toMatchObject({ coverage: "full", residual: [] });
  });

  it("gains 1 memory when deleted by an effect", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-071", as: "guilmon", under: ["BT5-006"] }] } });
    await advance(s.engine).verb.deletePermanent([s.perm("guilmon").permanentId], "byEffect");
    await settle(() => s.state.memory === 1);
    expect(s.state.memory).toBe(1);
  });

  it("doesn't gain memory when deleted by the 0-DP rule", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-071", as: "guilmon", dp: 0 }] } });
    await advance(s.engine).verb.deletePermanent([s.perm("guilmon").permanentId], "byRule");
    await settle();
    expect(s.state.memory).toBe(0);
  });
});

describe("BT5-071 Guilmon — KB Q&A rulings", () => {
  const setupOpponentCharm = (guilmonDp: number) =>
    setupEngine(
      {
        0: { battleArea: ["ST3-07"], hand: [{ card: "ST3-14", as: "charm" }] },
        1: { battleArea: [{ card: "BT5-071", as: "guilmon", dp: guilmonDp }] },
      },
      { autoSelectCards: true },
    );

  it("does not gain memory when an opponent's effect reduces it to 0 DP and the rules delete it (Q1348)", async () => {
    const s = setupOpponentCharm(2000);
    const guilmonId = s.perm("guilmon").topCard!.instanceId;
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("charm").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === guilmonId));
    await settle();
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.memory).toBe(1);

    const control = setupOpponentCharm(3000);
    control.state.memory = 3;
    expect(control.engine.applyIntent(0, { type: "playCard", instanceId: control.inst("charm").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => control.perm("guilmon").currentDP === 1000);
    await advance(control.engine).verb.deletePermanent([control.perm("guilmon").permanentId], "byEffect");
    await settle(() => control.state.memory === 0);
    expect(control.state.memory).toBe(0);
  });
});
